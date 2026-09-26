import { z } from "zod";

import { protectedProcedure, router } from "./_core/trpc";
import { recalculateUserReminders, registerPushToken, syncReminderSnapshot } from "./reminders";

const taskType = z.enum(["watering", "observation", "pruning", "protection", "harvest"]);
const hour = z.number().int().min(0).max(23);

const plantProfile = z.object({
  plantId: z.string().min(1).max(128),
  displayName: z.string().min(1).max(128),
  wateringIntervalHours: z.number().positive().max(24 * 30),
  rainSkipMm: z.number().min(0).max(100),
  heatThresholdC: z.number().min(-20).max(60),
  frostThresholdC: z.number().min(-30).max(30),
  windThresholdKmh: z.number().min(0).max(250),
  frostSensitive: z.boolean().optional(),
  preferredWateringWindows: z.array(z.enum(["morning", "evening"])).optional(),
  allowedTaskTypes: z.array(taskType).optional(),
});

const syncInput = z.object({
  settings: z.object({
    enabled: z.boolean(),
    preferredHour: hour,
    preferredMinute: z.number().int().min(0).max(59),
    quietStartHour: hour,
    quietEndHour: hour,
    skipWateringWhenRainExpected: z.boolean(),
    maxNormalRemindersPerDay: z.number().int().min(1).max(5),
    enabledPlantIds: z.array(z.string().max(128)).max(200),
  }),
  location: z.object({
    city: z.string().min(1).max(128),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(1).max(64),
  }),
  plants: z.array(z.object({ plantId: z.string().min(1).max(128), displayName: z.string().min(1).max(128), profile: plantProfile, active: z.boolean().optional() })).max(200),
  events: z.array(z.object({
    id: z.string().min(1).max(128),
    plantId: z.string().min(1).max(128),
    type: taskType,
    completedAt: z.iso.datetime(),
    source: z.enum(["daily_task", "reminder", "manual"]),
    note: z.string().max(500).optional(),
  })).max(1000),
});

export const remindersRouter = router({
  /** Pousse réglages, plantes et historique locaux vers le serveur, puis recalcule les décisions. */
  sync: protectedProcedure.input(syncInput).mutation(async ({ ctx, input }) => {
    const synced = await syncReminderSnapshot(ctx.user.id, input);
    const recalculated = await recalculateUserReminders(ctx.user.id);
    return { ...synced, recalculated };
  }),
  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(255), platform: z.enum(["ios", "android", "web"]) }))
    .mutation(({ ctx, input }) => registerPushToken(ctx.user.id, input.token, input.platform)),
  recalculate: protectedProcedure.mutation(({ ctx }) => recalculateUserReminders(ctx.user.id)),
});
