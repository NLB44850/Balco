import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../_core/trpc";
import { AiBadResponseError, AiRefusedError, AiUnavailableError, aiAvailable, askNora, diagnosePlant, type ChatTurn, type ImageMediaType } from "./claude";
import { describeGarden, loadGardenFacts } from "./context";
import { planOf, QuotaExceededError, quotaStatus, reserve, settle, type AiKind } from "./quotas";

/** Limite de l'API pour une image ; l'app envoie des photos réduites bien plus légères. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_HISTORY_TURNS = 12;

/** Type réel de l'image, lu dans ses premiers octets : on ne se fie pas à ce que le client annonce. */
export function detectImageType(bytes: Buffer): ImageMediaType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

const KIND_WORDS: Record<AiKind, [string, string]> = { scan: ["analyse", "analyses"], chat: ["question", "questions"] };

function quotaMessage(kind: AiKind, limit: number, resetsAt: string, plan: "free" | "plus") {
  const [one, many] = KIND_WORDS[kind];
  const date = new Date(resetsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
  const offered = plan === "free" ? " offertes" : "";
  return `Tu as utilisé tes ${limit} ${limit > 1 ? many : one}${offered} ce mois-ci. Le compteur repart le ${date}.`;
}

/** Réserve une place, appelle le modèle, puis solde la réservation selon l'issue. Refus et pannes ne sont pas décomptés. */
async function withQuota<T>(user: { id: number; plan: string }, kind: AiKind, call: () => Promise<T & { usage: Parameters<typeof settle>[2] }>) {
  if (!aiAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: kind === "scan" ? "Le scanner n’est pas encore disponible." : "Nora n’est pas encore disponible." });
  const plan = planOf(user.plan);
  let requestId: number;
  try {
    requestId = await reserve(user.id, plan, kind);
  } catch (error) {
    if (error instanceof QuotaExceededError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: quotaMessage(kind, error.status.limit, error.status.resetsAt, plan) });
    throw error;
  }
  try {
    const result = await call();
    await settle(requestId, "ok", result.usage);
    const { usage: _usage, ...rest } = result;
    return { ...rest, quota: await quotaStatus(user.id, plan, kind) };
  } catch (error) {
    if (error instanceof AiRefusedError) {
      await settle(requestId, "refused");
      throw new TRPCError({ code: "BAD_REQUEST", message: kind === "scan" ? "Je ne peux pas analyser cette photo. Essaie avec une photo de la plante seule." : "Je ne peux pas répondre à cette demande. Parlons plutôt de ton balcon !" });
    }
    await settle(requestId, "error");
    if (error instanceof AiUnavailableError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le service n’est pas encore disponible." });
    if (!(error instanceof AiBadResponseError) && !(error instanceof Anthropic.APIError)) console.error(`[ai] ${kind} failed`, error);
    else console.warn(`[ai] ${kind} failed`, error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le service est momentanément indisponible. Réessaie dans un instant : cette tentative n’est pas décomptée." });
  }
}

const chatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) })).min(1).max(40),
});

/** Garde les derniers échanges, en commençant par une question et en finissant par la nouvelle question. */
export function trimHistory(messages: ChatTurn[]): ChatTurn[] {
  const recent = messages.slice(-MAX_HISTORY_TURNS);
  const firstUser = recent.findIndex((turn) => turn.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

export const aiRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const plan = planOf(ctx.user.plan);
    return { available: aiAvailable(), plan, scan: await quotaStatus(ctx.user.id, plan, "scan"), chat: await quotaStatus(ctx.user.id, plan, "chat") };
  }),

  diagnose: protectedProcedure
    .input(z.object({ imageBase64: z.string().min(100).max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16) }))
    .mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.imageBase64, "base64");
      const mediaType = detectImageType(bytes);
      if (!mediaType) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce fichier n’est pas une photo lisible (JPEG, PNG ou WebP)." });
      if (bytes.length > MAX_IMAGE_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette photo est trop lourde." });
      const garden = describeGarden(await loadGardenFacts(ctx.user.id));
      return withQuota(ctx.user, "scan", () => diagnosePlant({ data: bytes.toString("base64"), mediaType }, garden));
    }),

  ask: protectedProcedure.input(chatInput).mutation(async ({ ctx, input }) => {
    const history = trimHistory(input.messages);
    if (history.length === 0 || history[history.length - 1].role !== "user") throw new TRPCError({ code: "BAD_REQUEST", message: "La conversation doit se terminer par une question." });
    const garden = describeGarden(await loadGardenFacts(ctx.user.id));
    return withQuota(ctx.user, "chat", () => askNora(history, garden));
  }),
});
