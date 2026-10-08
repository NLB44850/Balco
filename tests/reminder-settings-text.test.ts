import { describe, expect, it } from "vitest";

import { coversReminder, followedText, quietText, reminderHourChoice, toggleFollowed, vacationText, withReminderHour } from "../lib/reminders/settings-text";

const timing = { preferredHour: 18, preferredMinute: 30, quietStartHour: 21, quietEndHour: 9 };

describe("Réglages → Rappels", () => {
  it("heures et plage calme en clair", () => {
    expect(reminderHourChoice(8)).toBe("Le matin · 8 h 30");
    expect(reminderHourChoice(18)).toBe("18 h 30");
    expect(quietText({ quietStartHour: 21, quietEndHour: 8 })).toBe("21 h → 8 h");
  });

  it("le conseil du matin ne tombe pas dans la plage calme : la plage s'ajuste et le dit", () => {
    expect(withReminderHour(timing, 8)).toEqual({ patch: { preferredHour: 8, quietEndHour: 8 }, notice: "Ta plage calme finit maintenant à 8 h, pour que ton conseil arrive à 8 h 30." });
    expect(withReminderHour({ ...timing, quietEndHour: 7 }, 8)).toEqual({ patch: { preferredHour: 8 }, notice: null });
    expect(withReminderHour(timing, 19)).toEqual({ patch: { preferredHour: 19 }, notice: null });
    expect(withReminderHour({ ...timing, quietStartHour: 19 }, 19).patch).toEqual({ preferredHour: 19, quietStartHour: 20 });
  });

  it("une plage calme qui couvrirait le conseil n'est pas proposée", () => {
    const morning = { ...timing, preferredHour: 8, quietEndHour: 8 };
    expect(coversReminder(morning, { quietEndHour: 9 })).toBe(true);
    expect(coversReminder(morning, { quietEndHour: 7 })).toBe(false);
    expect(coversReminder(timing, { quietStartHour: 20 })).toBe(false);
  });

  it("plantes suivies : « Toutes (5) », « 4 sur 5 », et la liste vide veut dire toutes", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(followedText(ids, [])).toBe("Toutes (5)");
    expect(followedText(ids, ["a", "b", "c", "d"])).toBe("4 sur 5");
    expect(followedText([], [])).toBe("Aucune plante");
    expect(toggleFollowed(ids, [], "e")).toEqual(["a", "b", "c", "d"]);
    expect(toggleFollowed(ids, ["a", "b", "c", "d"], "e")).toEqual([]);
  });

  it("vacances : dates courtes, « Non » une fois rentré", () => {
    expect(vacationText({ start: "2026-10-07", end: "2026-10-13" }, "2026-10-05")).toBe("Du 7 au 13 oct.");
    expect(vacationText({ start: "2026-09-28", end: "2026-10-03" }, "2026-09-20")).toBe("Du 28 sept. au 3 oct.");
    expect(vacationText({ start: "2026-08-01", end: "2026-08-15" }, "2026-08-02")).toBe("Du 1er au 15 août");
    expect(vacationText({ start: "2026-08-01", end: "2026-08-15" }, "2026-08-16")).toBe("Non");
    expect(vacationText(null, "2026-08-16")).toBe("Non");
  });
});
