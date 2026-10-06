import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { budgetState, costReport, formatCostReport, pauseMessage } from "./budget";
import { AiBadResponseError, AiRefusedError, AiUnavailableError, aiAvailable, askNora, diagnosePlant, type ChatTurn, type ImageMediaType } from "./claude";
import { NORA_PREFERENCES } from "../../lib/ai/memory";
import { describeGarden, loadGardenFacts, loadMemory } from "./context";
import { forgetNotes, learnFromAnswer, updatePreferences } from "./memory-store";
import { DEVICE_ID_PATTERN, GuestLimitError, guestScanLeft, takeGuestScan } from "./guest";
import { planOf, QuotaExceededError, quotaStatus, reserve, reserveGuest, settle, type AiKind, type Plan } from "./quotas";
import { PLANS, plusQuotaHint } from "../../lib/plans";

/** Limite de l'API pour une image ; l'app envoie des photos réduites bien plus légères. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Les derniers messages de la conversation envoyés à Nora (questions et réponses). */
const MAX_HISTORY_TURNS = 8;

/** Type réel de l'image, lu dans ses premiers octets : on ne se fie pas à ce que le client annonce. */
export function detectImageType(bytes: Buffer): ImageMediaType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

const KIND_WORDS: Record<AiKind, [string, string]> = { scan: ["analyse", "analyses"], chat: ["question", "questions"] };

export function quotaMessage(kind: AiKind, limit: number, resetsAt: string, plan: Plan) {
  const [one, many] = KIND_WORDS[kind];
  const date = new Date(resetsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).replace(/^1 /, "1er ");
  const offered = plan === "free" ? (limit > 1 ? " offertes" : " offerte") : "";
  // « ton analyse offerte » pour une seule, « tes 5 questions offertes » au-delà.
  const used = limit > 1 ? `tes ${limit} ${many}${offered}` : `ton ${one}${offered}`;
  // Compte gratuit : on dit aussi ce que Balco+ apporterait, sans insister.
  return `Tu as utilisé ${used} ce mois-ci. Le compteur repart le ${date}.${plan === "free" ? ` ${plusQuotaHint(kind)}` : ""}`;
}

/** Réserve une place, appelle le modèle, puis solde la réservation selon l'issue. Refus et pannes ne sont pas décomptés. */
async function withQuota<T>(user: { id: number; plan: string }, kind: AiKind, call: () => Promise<T & { usage: Parameters<typeof settle>[2] }>) {
  if (!aiAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: kind === "scan" ? "Le scanner n’est pas encore disponible." : "Nora n’est pas encore disponible." });
  const plan = planOf(user.plan);
  // Budget du mois : à 80 % les comptes gratuits font une pause, à 100 % tout le monde.
  const paused = pauseMessage((await budgetState()).level, plan);
  if (paused) throw new TRPCError({ code: "PRECONDITION_FAILED", message: paused });
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
    // Une réponse coupée ou illisible a quand même été facturée : ses jetons comptent dans le budget.
    await settle(requestId, "error", error instanceof AiBadResponseError ? error.usage : undefined);
    if (error instanceof AiUnavailableError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le service n’est pas encore disponible." });
    if (!(error instanceof AiBadResponseError) && !(error instanceof Anthropic.APIError)) console.error(`[ai] ${kind} failed`, error);
    else console.warn(`[ai] ${kind} failed`, error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le service est momentanément indisponible. Réessaie dans un instant : cette tentative n’est pas décomptée." });
  }
}

/** Ce qu'une analyse sans compte sait du balcon : rien, la personne n'a pas de compte. */
const GUEST_GARDEN = "Personne sans compte Balco : aucun balcon enregistré. Réponds pour un balcon en ville, en France.";

export function guestLimitMessage(reason: "device" | "network") {
  const monthly = PLANS.free.aiQuota.scan > 1 ? `${PLANS.free.aiQuota.scan} analyses offertes chaque mois` : "une analyse offerte chaque mois";
  return reason === "device"
    ? `Ton analyse sans compte est déjà utilisée sur ce téléphone. Crée ton compte gratuit : ${monthly}, et le suivi de tes plantes.`
    : "Trop d’analyses sans compte depuis ce réseau aujourd’hui. Crée ton compte gratuit, ou réessaie demain.";
}

const imageInput = z.string().min(100).max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16);

/** La photo envoyée, vérifiée (vraie image, pas trop lourde). */
function readImage(imageBase64: string) {
  const bytes = Buffer.from(imageBase64, "base64");
  const mediaType = detectImageType(bytes);
  if (!mediaType) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce fichier n’est pas une photo lisible (JPEG, PNG ou WebP)." });
  if (bytes.length > MAX_IMAGE_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Cette photo est trop lourde." });
  return { data: bytes.toString("base64"), mediaType };
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
    // `paused` : message à afficher quand le budget du mois met l'IA en pause pour ce compte.
    return { available: aiAvailable(), plan, paused: pauseMessage((await budgetState()).level, plan), scan: await quotaStatus(ctx.user.id, plan, "scan"), chat: await quotaStatus(ctx.user.id, plan, "chat") };
  }),

  /** Coût réel de l'IA (réservé aux comptes `role = admin`) : par usage, par modèle, par compte. */
  costReport: adminProcedure
    .input(z.object({ from: z.string().datetime().optional() }).optional())
    .query(async ({ input }) => {
      const report = await costReport(input?.from ? new Date(input.from) : undefined);
      return { ...report, text: formatCostReport(report) };
    }),

  diagnose: protectedProcedure
    .input(z.object({ imageBase64: imageInput }))
    .mutation(async ({ ctx, input }) => {
      const image = readImage(input.imageBase64);
      const garden = describeGarden(await loadGardenFacts(ctx.user.id));
      return withQuota(ctx.user, "scan", () => diagnosePlant(image, garden));
    }),

  /** Observer sans compte : l'analyse offerte reste-t-elle à cet appareil ? */
  guestStatus: publicProcedure
    .input(z.object({ deviceId: z.string().regex(DEVICE_ID_PATTERN) }))
    .query(async ({ input }) => ({ available: aiAvailable(), paused: pauseMessage((await budgetState()).level, "free"), scanLeft: await guestScanLeft(input.deviceId) })),

  /**
   * Une analyse sans compte : 1 par appareil, 3 par réseau et par jour, comptées côté serveur et dans le
   * budget du mois (pause dès 80 %, comme les comptes gratuits). Une analyse refusée ou en panne est rendue.
   */
  diagnoseGuest: publicProcedure
    .input(z.object({ imageBase64: imageInput, deviceId: z.string().regex(DEVICE_ID_PATTERN) }))
    .mutation(async ({ ctx, input }) => {
      if (!aiAvailable()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le scanner n’est pas encore disponible." });
      const paused = pauseMessage((await budgetState()).level, "free");
      if (paused) throw new TRPCError({ code: "PRECONDITION_FAILED", message: paused });
      const image = readImage(input.imageBase64);
      let release: () => Promise<void>;
      try {
        release = await takeGuestScan(input.deviceId, ctx.req.ip ?? "unknown");
      } catch (error) {
        if (error instanceof GuestLimitError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: guestLimitMessage(error.reason) });
        throw error;
      }
      const requestId = await reserveGuest("scan");
      try {
        const { diagnosis, usage } = await diagnosePlant(image, GUEST_GARDEN);
        await settle(requestId, "ok", usage);
        return { diagnosis };
      } catch (error) {
        await release();
        if (error instanceof AiRefusedError) {
          await settle(requestId, "refused");
          throw new TRPCError({ code: "BAD_REQUEST", message: "Je ne peux pas analyser cette photo. Essaie avec une photo de la plante seule." });
        }
        await settle(requestId, "error", error instanceof AiBadResponseError ? error.usage : undefined);
        console.warn("[ai] guest scan failed", error instanceof Error ? error.message : error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le service est momentanément indisponible. Réessaie dans un instant : cette tentative n’est pas décomptée." });
      }
    }),

  ask: protectedProcedure.input(chatInput).mutation(async ({ ctx, input }) => {
    const history = trimHistory(input.messages);
    if (history.length === 0 || history[history.length - 1].role !== "user") throw new TRPCError({ code: "BAD_REQUEST", message: "La conversation doit se terminer par une question." });
    const garden = describeGarden(await loadGardenFacts(ctx.user.id));
    const { remember, forget, ...result } = await withQuota(ctx.user, "chat", () => askNora(history, garden));
    // La réponse compte plus que la mémoire : un souci d'enregistrement ne la fait pas perdre.
    const learned = await learnFromAnswer(ctx.user.id, remember, forget).catch((error: unknown) => {
      console.warn("[ai] memory not saved", error instanceof Error ? error.message : error);
      return { added: [], forgotten: [] };
    });
    return { ...result, remembered: learned.added, forgotten: learned.forgotten };
  }),

  /** Ce que Nora sait de la personne : affiché, modifiable et effaçable dans l'écran Nora. */
  memory: protectedProcedure.query(({ ctx }) => loadMemory(ctx.user.id)),

  updateMemory: protectedProcedure
    .input(z.object({ preferences: z.array(z.enum(NORA_PREFERENCES.map((preference) => preference.id) as [string, ...string[]])).max(NORA_PREFERENCES.length) }))
    .mutation(({ ctx, input }) => updatePreferences(ctx.user.id, input.preferences)),

  forget: protectedProcedure
    .input(z.object({ noteId: z.string().min(1).max(32).optional() }))
    .mutation(({ ctx, input }) => forgetNotes(ctx.user.id, input.noteId)),
});
