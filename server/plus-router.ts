import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "./_core/trpc";
import { addPlusInterest, hasPlusInterest } from "./plus-interest";
import { fingerprint, hitRateLimit } from "./rate-limit";

/** Sans compte, 10 adresses par heure et par réseau au plus. */
const INTEREST_IP_BUCKET = "plus-interest-ip:";
const MAX_INTEREST_PER_IP = 10;
const HOUR_MS = 60 * 60 * 1000;

export const plusRouter = router({
  /** Réglages → Balco+ : « C'est noté, on te prévient » si le compte est déjà inscrit. */
  interest: publicProcedure.query(async ({ ctx }) => ({ interested: ctx.user ? await hasPlusInterest(ctx.user.id) : false })),

  /** « Me prévenir à l'ouverture » : le compte connecté, sinon l'adresse donnée. */
  notifyMe: publicProcedure
    .input(z.object({ email: z.email().max(254).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user) {
        await addPlusInterest({ userId: ctx.user.id });
        return { interested: true } as const;
      }
      if (!input.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Donne ton adresse e-mail pour être prévenu." });
      const allowed = await hitRateLimit(`${INTEREST_IP_BUCKET}${fingerprint(ctx.req.ip ?? "unknown")}`, MAX_INTEREST_PER_IP, HOUR_MS);
      if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de demandes depuis ce réseau. Réessaie plus tard." });
      await addPlusInterest({ email: input.email });
      return { interested: true } as const;
    }),
});
