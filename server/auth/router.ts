import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import type { TrpcContext } from "../_core/context";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import type { User } from "../../drizzle/schema";
import { AuthError, availableProviders, deleteAccount, requestLoginCode, signInWithApple, signInWithGoogle, verifyLoginCode } from "./accounts";
import { MailNotConfiguredError } from "./mailer";
import { SESSION_TTL_SECONDS, signSession } from "./session";
import { fingerprint, hitRateLimit, resetRateLimits } from "../rate-limit";

const TRPC_CODES = {
  invalid_email: "BAD_REQUEST",
  too_many_requests: "TOO_MANY_REQUESTS",
  invalid_code: "BAD_REQUEST",
  invalid_token: "UNAUTHORIZED",
  not_configured: "PRECONDITION_FAILED",
} as const;

async function mapErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AuthError) throw new TRPCError({ code: TRPC_CODES[error.code], message: error.message });
    if (error instanceof MailNotConfiguredError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "L’envoi d’e-mails n’est pas encore configuré." });
    throw error;
  }
}

/** Limite par adresse IP, en plus de la limite par e-mail : freine l'envoi massif de codes. Comptée en base. */
const IP_WINDOW_MS = 60 * 60 * 1000;
const MAX_CODE_REQUESTS_PER_IP = 20;
const CODE_IP_BUCKET = "code-ip:";

async function checkIpRate(ip: string) {
  const allowed = await hitRateLimit(`${CODE_IP_BUCKET}${fingerprint(ip)}`, MAX_CODE_REQUESTS_PER_IP, IP_WINDOW_MS);
  if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de demandes depuis ce réseau. Réessaie plus tard." });
}

export function resetAuthRateLimits() {
  return resetRateLimits(CODE_IP_BUCKET);
}

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, loginMethod: user.loginMethod };
}

/** Ouvre la session : jeton pour les apps (stocké dans le trousseau), cookie pour le web. */
async function startSession(ctx: TrpcContext, user: User) {
  const token = await signSession(user);
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SESSION_TTL_SECONDS * 1000 });
  return { token, user: publicUser(user) };
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),
  providers: publicProcedure.query(() => availableProviders()),

  requestEmailCode: publicProcedure
    .input(z.object({ email: z.string().min(3).max(254) }))
    .mutation(({ ctx, input }) => mapErrors(async () => {
      await checkIpRate(ctx.req.ip ?? "unknown");
      const { expiresInSeconds } = await requestLoginCode(input.email);
      return { sent: true, expiresInSeconds };
    })),

  verifyEmailCode: publicProcedure
    .input(z.object({ email: z.string().min(3).max(254), code: z.string().min(4).max(12) }))
    .mutation(({ ctx, input }) => mapErrors(async () => startSession(ctx, await verifyLoginCode(input.email, input.code)))),

  signInWithApple: publicProcedure
    .input(z.object({ identityToken: z.string().min(10).max(5000), nonce: z.string().max(200).optional(), fullName: z.string().max(128).nullable().optional() }))
    .mutation(({ ctx, input }) => mapErrors(async () => startSession(ctx, await signInWithApple(input.identityToken, { nonce: input.nonce, fullName: input.fullName })))),

  signInWithGoogle: publicProcedure
    .input(z.object({ idToken: z.string().min(10).max(5000) }))
    .mutation(({ ctx, input }) => mapErrors(async () => startSession(ctx, await signInWithGoogle(input.idToken)))),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
    return { success: true } as const;
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAccount(ctx.user.id);
    ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
    return { deleted: true } as const;
  }),
});
