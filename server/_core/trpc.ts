import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

/** Ce que voit l'app quand le serveur rencontre une erreur imprévue (base, réseau…). */
export const INTERNAL_ERROR_MESSAGE = "Un souci est survenu sur le serveur. Réessaie dans un instant.";

/**
 * Une erreur imprévue enveloppée par tRPC (pas une TRPCError lancée exprès avec un message pour la personne) :
 * son message brut (requête SQL, adresse e-mail…) ne part jamais vers l'app.
 */
export function isUnexpectedError(error: TRPCError) {
  return error.code === "INTERNAL_SERVER_ERROR" && error.cause !== undefined && !(error.cause instanceof TRPCError) && error.message === error.cause.message;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // La pile d'appels ne part jamais vers l'app.
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, message: isUnexpectedError(error) ? INTERNAL_ERROR_MESSAGE : shape.message, data };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
