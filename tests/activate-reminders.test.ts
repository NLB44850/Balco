import { describe, expect, it, vi } from "vitest";

import { activateReminders, NOTIFICATIONS_DENIED, remindersEnabledText } from "../lib/reminders/activate";
import type { LocalReminderSettings } from "../lib/reminders/local-notifications";

const OFF: LocalReminderSettings = {
  enabled: false,
  preferredHour: 18,
  preferredMinute: 30,
  quietStartHour: 21,
  quietEndHour: 8,
  maxNormalRemindersPerDay: 1,
  skipWateringWhenRainExpected: true,
  enabledPlantIds: ["old"],
  vacation: null,
};

describe("activer les rappels : l'autorisation du téléphone d'abord", () => {
  it("accord : les rappels sont enregistrés comme actifs, pour toutes les plantes, puis le prochain conseil est programmé", async () => {
    const order: string[] = [];
    const save = vi.fn(async () => void order.push("save"));
    const scheduleNext = vi.fn(async () => void order.push("schedule"));
    const requestPermission = vi.fn(async () => (order.push("permission"), true));
    const result = await activateReminders(OFF, { requestPermission, save, scheduleNext });
    expect(order).toEqual(["permission", "save", "schedule"]);
    expect(result).toEqual({ status: "enabled", settings: { ...OFF, enabled: true, enabledPlantIds: [] } });
    expect(save).toHaveBeenCalledWith({ ...OFF, enabled: true, enabledPlantIds: [] });
    expect(remindersEnabledText(OFF)).toBe("Rappels activés : Balco te préviendra vers 18 h 30");
  });

  it("refus : rien n'est enregistré ni programmé, et le message de Réglages s'affiche", async () => {
    const save = vi.fn(async () => undefined);
    const scheduleNext = vi.fn(async () => undefined);
    expect(await activateReminders(OFF, { requestPermission: async () => false, save, scheduleNext })).toEqual({ status: "denied" });
    // Une demande qui plante (navigateur, module absent) vaut un refus.
    expect(await activateReminders(OFF, { requestPermission: () => Promise.reject(new Error("indisponible")), save, scheduleNext })).toEqual({ status: "denied" });
    expect(save).not.toHaveBeenCalled();
    expect(scheduleNext).not.toHaveBeenCalled();
    expect(NOTIFICATIONS_DENIED.title).toBe("Notifications désactivées");
    expect(NOTIFICATIONS_DENIED.message).toBe("Autorise les notifications dans les réglages de ton téléphone pour recevoir les conseils Balco.");
  });

  it("aucun conseil à programmer : l'autorisation est quand même demandée et les rappels activés", async () => {
    const requestPermission = vi.fn(async () => true);
    const save = vi.fn(async () => undefined);
    const result = await activateReminders(OFF, { requestPermission, save, scheduleNext: async () => undefined });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("enabled");
    // Sans fonction de programmation (Réglages), même chose.
    expect((await activateReminders(OFF, { requestPermission, save })).status).toBe("enabled");
  });
});
