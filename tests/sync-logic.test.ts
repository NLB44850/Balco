import { describe, expect, it } from "vitest";

import type { GardenPlant } from "../lib/garden/garden-logic";
import type { MaintenanceEvent } from "../lib/reminders/reminder-engine";
import {
  applySnapshot,
  buildPush,
  emptyOutbox,
  isOutboxEmpty,
  locationChanged,
  markProfileDirty,
  markSettingsDirty,
  mergeOutbox,
  recordEvent,
  recordEventDeletion,
  recordPlant,
  seedOutbox,
  type LocalGardenState,
  type SyncSettings,
  type SyncSnapshotPayload,
} from "../lib/sync/sync-logic";

const DEFAULT_SETTINGS: SyncSettings = { enabled: false, preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9, maxNormalRemindersPerDay: 1, skipWateringWhenRainExpected: true, enabledPlantIds: [] };

const plant = (id: string, updatedAt = "2026-09-20T10:00:00.000Z", extra: Partial<GardenPlant> = {}): GardenPlant => ({ id, catalogId: "basil", addedAt: "2026-09-01T10:00:00.000Z", updatedAt, ...extra });
const event = (id: string, completedAt = "2026-09-25T10:00:00.000Z"): MaintenanceEvent => ({ id, plantId: "p1", type: "watering", completedAt, source: "daily_task" });

const local = (overrides: Partial<LocalGardenState> = {}): LocalGardenState => ({ plants: [], events: [], onboarding: null, settings: DEFAULT_SETTINGS, ...overrides });
const snapshot = (overrides: Partial<SyncSnapshotPayload> = {}): SyncSnapshotPayload => ({ profile: { firstName: null, balcony: null }, settings: null, plants: [], events: [], serverTime: "2026-09-26T12:00:00.000Z", ...overrides });

describe("outbox", () => {
  it("starts empty and tracks every kind of change", () => {
    expect(isOutboxEmpty(emptyOutbox())).toBe(true);
    expect(isOutboxEmpty(recordPlant(emptyOutbox(), plant("p1")))).toBe(false);
    expect(isOutboxEmpty(markSettingsDirty(emptyOutbox()))).toBe(false);
    expect(isOutboxEmpty(recordEventDeletion(emptyOutbox(), "e1"))).toBe(false);
  });

  it("turns an add-then-delete of the same event into a deletion only", () => {
    let outbox = recordEvent(emptyOutbox(), event("e1"));
    outbox = recordEventDeletion(outbox, "e1");
    expect(outbox.events).toEqual({});
    expect(outbox.deletedEventIds).toEqual(["e1"]);
    // … et une nouvelle validation annule la suppression.
    outbox = recordEvent(outbox, event("e1"));
    expect(outbox.deletedEventIds).toEqual([]);
    expect(Object.keys(outbox.events)).toEqual(["e1"]);
  });

  it("keeps the newest changes when a failed send is merged back", () => {
    const failed = markProfileDirty(recordEvent(recordPlant(emptyOutbox(), plant("p1", "2026-09-20T10:00:00.000Z")), event("e1")));
    const meanwhile = recordEventDeletion(recordPlant(emptyOutbox(), plant("p1", "2026-09-21T10:00:00.000Z", { nickname: "Nouveau" })), "e1");
    const merged = mergeOutbox(failed, meanwhile);
    expect(merged.plants.p1.nickname).toBe("Nouveau");
    expect(merged.events).toEqual({});
    expect(merged.deletedEventIds).toEqual(["e1"]);
    expect(merged.profileDirty).toBe(true);
  });
});

describe("push payload", () => {
  it("only sends settings and profile when they changed", () => {
    const state = local({ firstName: "Léa", settings: { ...DEFAULT_SETTINGS, enabled: true } });
    expect(buildPush(emptyOutbox(), state)).toEqual({ plants: [], events: [], deletedEventIds: [] });
    const push = buildPush(markSettingsDirty(markProfileDirty(emptyOutbox())), state);
    expect(push.profile).toEqual({ firstName: "Léa", balcony: null });
    expect(push.settings?.enabled).toBe(true);
  });

  it("always stamps plants with an update time", () => {
    const push = buildPush(recordPlant(emptyOutbox(), { id: "old", catalogId: "mint", addedAt: "2026-09-01T00:00:00.000Z" }), local());
    expect(push.plants[0].updatedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("seeds a first sync with local data but not with untouched default settings", () => {
    const seeded = seedOutbox(local({ plants: [plant("p1")], events: [event("e1")], onboarding: { skipped: true } }), DEFAULT_SETTINGS);
    expect(Object.keys(seeded.plants)).toEqual(["p1"]);
    expect(Object.keys(seeded.events)).toEqual(["e1"]);
    expect(seeded.settingsDirty).toBe(false);
    expect(seeded.profileDirty).toBe(false);

    const customized = seedOutbox(local({ firstName: "Léa", settings: { ...DEFAULT_SETTINGS, enabled: true } }), DEFAULT_SETTINGS);
    expect(customized.settingsDirty).toBe(true);
    expect(customized.profileDirty).toBe(true);
  });
});

describe("applying the server snapshot", () => {
  it("adopts the server state on a fresh device", () => {
    const applied = applySnapshot(
      snapshot({ profile: { firstName: "Nicolas", balcony: { sunlight: "sunny" } }, settings: { ...DEFAULT_SETTINGS, enabled: true }, plants: [plant("p1") as GardenPlant & { updatedAt: string }], events: [event("e1")] }),
      emptyOutbox(),
      local(),
    );
    expect(applied).toMatchObject({ firstName: "Nicolas", onboarding: { sunlight: "sunny" }, settings: { enabled: true } });
    expect(applied.plants.map((item) => item.id)).toEqual(["p1"]);
    expect(applied.events.map((item) => item.id)).toEqual(["e1"]);
  });

  it("drops what another device deleted", () => {
    const applied = applySnapshot(snapshot({ events: [event("kept")] }), emptyOutbox(), local({ events: [event("kept"), event("deleted-elsewhere")] }));
    expect(applied.events.map((item) => item.id)).toEqual(["kept"]);
  });

  it("re-applies changes made while the request was in flight", () => {
    let pending = recordEvent(emptyOutbox(), event("new-during-request", "2026-09-26T11:00:00.000Z"));
    pending = recordEventDeletion(pending, "server-event");
    pending = recordPlant(pending, plant("p1", "2026-09-26T11:00:00.000Z", { nickname: "Renommé" }));
    pending = markSettingsDirty(pending);
    const state = local({ settings: { ...DEFAULT_SETTINGS, preferredHour: 17 } });

    const applied = applySnapshot(
      snapshot({ plants: [plant("p1", "2026-09-26T10:00:00.000Z") as GardenPlant & { updatedAt: string }], events: [event("server-event")], settings: DEFAULT_SETTINGS }),
      pending,
      state,
    );
    expect(applied.events.map((item) => item.id)).toEqual(["new-during-request"]);
    expect(applied.plants[0].nickname).toBe("Renommé");
    expect(applied.settings.preferredHour).toBe(17);
  });

  it("keeps a newer server version over an older pending one", () => {
    const pending = recordPlant(emptyOutbox(), plant("p1", "2026-09-20T00:00:00.000Z", { nickname: "Ancien" }));
    const applied = applySnapshot(snapshot({ plants: [plant("p1", "2026-09-26T00:00:00.000Z", { removedAt: "2026-09-26T00:00:00.000Z" }) as GardenPlant & { updatedAt: string }] }), pending, local());
    expect(applied.plants[0].removedAt).toBeDefined();
  });

  it("does not lose a local questionnaire when the account has none", () => {
    const applied = applySnapshot(snapshot(), emptyOutbox(), local({ onboarding: { sunlight: "shade" } }));
    expect(applied.onboarding).toEqual({ sunlight: "shade" });
  });
});

describe("location changes", () => {
  const paris = { city: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" };
  it("ignores GPS jitter but notices a real move", () => {
    expect(locationChanged(null, paris)).toBe(true);
    expect(locationChanged(paris, { ...paris, latitude: 48.857 })).toBe(false);
    expect(locationChanged(paris, { city: "Lyon", latitude: 45.76, longitude: 4.84, timezone: "Europe/Paris" })).toBe(true);
    expect(locationChanged(paris, null)).toBe(false);
  });
});
