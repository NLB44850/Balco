import { z } from "zod";

import { protectedProcedure, router } from "./_core/trpc";
import { recalculateUserReminders, registerPushToken, syncGarden, unregisterPushToken } from "./reminders";

const taskType = z.enum(["watering", "observation", "pruning", "protection", "harvest", "repotting", "fertilizing"]);
const hour = z.number().int().min(0).max(23);
const id = z.string().min(1).max(128);

const syncInput = z.object({
  profile: z.object({
    firstName: z.string().max(64).nullable().optional(),
    balcony: z.object({
      experience: z.string().max(32).optional(),
      sunlight: z.string().max(32).optional(),
      space: z.string().max(32).optional(),
      goals: z.array(z.string().max(32)).max(10).optional(),
      skipped: z.boolean().optional(),
    }).nullable().optional(),
  }).optional(),
  settings: z.object({
    enabled: z.boolean(),
    preferredHour: hour,
    preferredMinute: z.number().int().min(0).max(59),
    quietStartHour: hour,
    quietEndHour: hour,
    skipWateringWhenRainExpected: z.boolean(),
    maxNormalRemindersPerDay: z.number().int().min(1).max(5),
    enabledPlantIds: z.array(id).max(200),
  }).optional(),
  location: z.object({
    city: z.string().min(1).max(128),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(1).max(64),
  }).optional(),
  plants: z.array(z.object({
    id,
    catalogId: z.string().min(1).max(64),
    nickname: z.string().max(128).optional(),
    varietyId: z.string().max(64).optional(),
    addedAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    removedAt: z.iso.datetime().optional(),
  })).max(200),
  events: z.array(z.object({
    id,
    plantId: id,
    type: taskType,
    completedAt: z.iso.datetime(),
    source: z.enum(["daily_task", "reminder", "manual"]),
    note: z.string().max(500).optional(),
  })).max(1000),
  deletedEventIds: z.array(id).max(1000),
});

export const remindersRouter = router({
  /**
   * Envoie les changements locaux et renvoie l'état complet du jardin, qui fait foi.
   * Appelé à vide, il sert aussi à récupérer le jardin sur un nouvel appareil.
   */
  sync: protectedProcedure.input(syncInput).mutation(async ({ ctx, input }) => {
    const snapshot = await syncGarden(ctx.user.id, input);
    // La météo peut être indisponible : la synchro des données ne doit pas échouer pour autant.
    const recalculated = await recalculateUserReminders(ctx.user.id).catch((error: unknown) => {
      console.error("[reminders] recalculation after sync failed", error);
      return { userId: ctx.user.id, status: "skipped", reason: "weather_unavailable" } as const;
    });
    return { ...snapshot, recalculated };
  }),
  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(255), platform: z.enum(["ios", "android", "web"]) }))
    .mutation(({ ctx, input }) => registerPushToken(ctx.user.id, input.token, input.platform)),
  unregisterPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(255) }))
    .mutation(({ ctx, input }) => unregisterPushToken(ctx.user.id, input.token)),
});
