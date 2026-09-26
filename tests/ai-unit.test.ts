import { describe, expect, it } from "vitest";

import { quotaLabel } from "../lib/ai/quota-text";
import { detectImageType, trimHistory } from "../server/ai/router";
import { monthStart, planOf, toQuotaStatus } from "../server/ai/quotas";

describe("image detection", () => {
  it("trusts the file bytes, not the claimed type", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]))).toBe("image/jpeg");
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    expect(detectImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]))).toBe("image/webp");
    expect(detectImageType(Buffer.from("%PDF-1.7 hello"))).toBeNull();
    expect(detectImageType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("chat history", () => {
  it("keeps the last turns and always starts with a question", () => {
    const turns = Array.from({ length: 20 }, (_, index) => ({ role: index % 2 === 0 ? ("user" as const) : ("assistant" as const), content: String(index) }));
    const trimmed = trimHistory(turns);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed.length).toBeLessThanOrEqual(12);
    expect(trimmed.at(-1)?.content).toBe("19");
    expect(trimHistory([{ role: "assistant", content: "Bonjour" }])).toEqual([]);
  });
});

describe("quotas", () => {
  const now = new Date("2026-09-26T12:00:00Z");

  it("counts per calendar month and resets on the 1st", () => {
    expect(monthStart(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(toQuotaStatus("scan", 2, 3, now)).toEqual({ kind: "scan", used: 2, limit: 3, remaining: 1, resetsAt: "2026-10-01T00:00:00.000Z" });
    expect(toQuotaStatus("scan", 5, 3, now).remaining).toBe(0);
    expect(toQuotaStatus("chat", 0, 15, new Date("2026-12-31T23:00:00Z")).resetsAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("treats anything but « plus » as the free plan", () => {
    expect(planOf("plus")).toBe("plus");
    expect(planOf("admin")).toBe("free");
    expect(planOf(null)).toBe("free");
  });

  it("explains the remaining allowance in French", () => {
    expect(quotaLabel(toQuotaStatus("scan", 1, 3, now))).toBe("2 analyses restantes ce mois-ci");
    expect(quotaLabel(toQuotaStatus("chat", 14, 15, now))).toBe("1 question restante ce mois-ci");
    expect(quotaLabel(toQuotaStatus("scan", 3, 3, now))).toBe("Plus d’analyse ce mois-ci · retour le 1er octobre");
    expect(quotaLabel(toQuotaStatus("chat", 15, 15, now))).toBe("Plus de question ce mois-ci · retour le 1er octobre");
  });
});
