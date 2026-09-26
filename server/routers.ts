import { authRouter } from "./auth/router";
import { systemRouter } from "./_core/systemRouter";
import { remindersRouter } from "./reminders-router";
import { router } from "./_core/trpc";

export const appRouter = router({
  // Toutes les routes HTTP de l'API commencent par /api/.
  system: systemRouter,
  auth: authRouter,
  reminders: remindersRouter,
});

export type AppRouter = typeof appRouter;
