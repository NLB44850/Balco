import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { can, planOf } from "../lib/plans";
import { protectedProcedure, router } from "./_core/trpc";
import { checkSyncDevice, OtherDeviceError, recalculateUserReminders, registerPushToken, syncGarden, unregisterPushToken } from "./reminders";

const taskType = z.enum(["watering", "observation", "pruning", "protection", "harvest", "repotting", "fertilizing"]);
const hour = z.number().int().min(0).max(23);
const id = z.string().min(1).max(128);

const syncInput = z.object({
  profile: z.object({
    firstName: z.string().max(64).nullable().optional(),
    balcony: z.object({
      experience: z.string().max(32).optional(),
      sunlight: z.string().max(32).optional(),
      sunlightUnknown: z.boolean().optional(),
      space: z.string().max(32).optional(),
      goals: z.array(z.string().max(32)).max(10).optional(),
      skipped: z.boolean().optional(),
      hasPlants: z.boolean().optional(),
      springWishes: z.array(z.string().max(64)).max(30).optional(),
      completedAt: z.iso.datetime().optional(),
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
    vacation: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      helper: z.boolean(),
      done: z.array(z.string().max(32)).max(20),
    }).refine((value) => value.end >= value.start, "La date de retour doit suivre le départ.").nullable().optional(),
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
    toPlant: z.boolean().optional(),
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
  /** Badges obtenus { clé: date ISO } (lib/garden/awards.ts). */
  awards: z.record(z.string().min(1).max(96), z.iso.datetime()).refine((value) => Object.keys(value).length <= 2000, "Trop de badges.").optional(),
  /** Identifiant de l'appareil (tiré au hasard à l'installation) : un seul appareil pour un compte gratuit. */
  deviceId: z.string().min(8).max(64).optional(),
  /** L'appareil prend la sauvegarde du jardin (connexion sur ce téléphone, ou demande de la personne). */
  claimDevice: z.boolean().optional(),
});

export const remindersRouter = router({
  /**
   * Envoie les changements locaux et renvoie l'état complet du jardin, qui fait foi.
   * Appelé à vide, il sert aussi à récupérer le jardin sur un nouvel appareil.
   */
  sync: protectedProcedure.input(syncInput).mutation(async ({ ctx, input }) => {
    const plan = planOf(ctx.user.plan);
    const { deviceId, claimDevice, ...push } = input;
    try {
      await checkSyncDevice(ctx.user.id, plan, deviceId, claimDevice ?? false);
    } catch (error) {
      if (error instanceof OtherDeviceError) {
        throw new TRPCError({ code: "CONFLICT", message: "Ton jardin est sauvegardé depuis un autre téléphone. Avec Balco+, il l’est sur tous tes appareils." });
      }
      throw error;
    }
    const snapshot = await syncGarden(ctx.user.id, push);
    // La météo peut être indisponible : la synchro des données ne doit pas échouer pour autant.
    const recalculated = await recalculateUserReminders(ctx.user.id).catch((error: unknown) => {
      console.error("[reminders] recalculation after sync failed", error);
      return { userId: ctx.user.id, status: "skipped", reason: "weather_unavailable" } as const;
    });
    // Ce que le forfait permet : l'app en déduit si le serveur envoie les rappels ou si elle les programme.
    // `founder` : le compte a le prix fondateur (gardé même s'il repasse en gratuit).
    const access = { plan, serverReminders: can(plan, "serverReminders"), multiDeviceSync: can(plan, "multiDeviceSync"), founder: Boolean(ctx.user.founderSince) };
    return { ...snapshot, recalculated, access };
  }),
  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(255), platform: z.enum(["ios", "android", "web"]) }))
    .mutation(({ ctx, input }) => registerPushToken(ctx.user.id, input.token, input.platform)),
  unregisterPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1).max(255) }))
    .mutation(({ ctx, input }) => unregisterPushToken(ctx.user.id, input.token)),
});
