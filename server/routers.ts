import { aiRouter } from "./ai/router";
import { authRouter } from "./auth/router";
import { systemRouter } from "./_core/systemRouter";
import { plusRouter } from "./plus-router";
import { remindersRouter } from "./reminders-router";
import { router } from "./_core/trpc";

export const appRouter = router({
  // Toutes les routes HTTP de l'API commencent par /api/.
  system: systemRouter,
  auth: authRouter,
  reminders: remindersRouter,
  ai: aiRouter,
  plus: plusRouter,
});

export type AppRouter = typeof appRouter;
