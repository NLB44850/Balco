import { describe, expect, it } from "vitest";

import { hasNewBadge, isBadgeAward, latestBadgeAt } from "@/lib/garden/badge-dot";

describe("point vert de l'onglet Moi", () => {
  const awards = {
    "badge:first-pot:1": "2026-10-01T10:00:00.000Z",
    "season:autumn-harvest:2026": "2026-10-20T10:00:00.000Z",
    "herbier:basil": "2026-10-23T10:00:00.000Z",
    "event:saints-de-glace:2026:protect:p1": "2026-10-24T10:00:00.000Z",
  };

  it("ne compte que les badges, pas l'herbier ni les gestes d'un événement", () => {
    expect(isBadgeAward("badge:first-pot:2")).toBe(true);
    expect(isBadgeAward("season:frost-guard:2027")).toBe(true);
    expect(isBadgeAward("event:sainte-catherine:2026")).toBe(true);
    expect(isBadgeAward("herbier:basil")).toBe(false);
    expect(isBadgeAward("event:saints-de-glace:2026:protect:p1")).toBe(false);
    expect(latestBadgeAt(awards)).toBe("2026-10-20T10:00:00.000Z");
    expect(latestBadgeAt({})).toBe("");
  });

  it("s'allume pour un badge plus récent que le dernier vu, jamais avant d'avoir lu la date gardée", () => {
    expect(hasNewBadge(awards, "2026-10-01T10:00:00.000Z")).toBe(true);
    expect(hasNewBadge(awards, "2026-10-20T10:00:00.000Z")).toBe(false);
    expect(hasNewBadge(awards, "")).toBe(true);
    expect(hasNewBadge({}, "")).toBe(false);
    expect(hasNewBadge(awards, null)).toBe(false);
  });
});
