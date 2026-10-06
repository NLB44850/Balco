/**
 * Observer sans compte (server/ai/guest.ts) : 1 analyse par appareil, 3 par réseau et par jour,
 * comptées dans MySQL ; une analyse qui échoue est rendue. Ignorés sans TEST_DATABASE_URL.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { guestLimitMessage } from "../server/ai/router";
import { DEVICE_ID_PATTERN, GuestLimitError, guestScanLeft, takeGuestScan } from "../server/ai/guest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe("messages et identifiants", () => {
  it("explique la limite et propose le compte gratuit", () => {
    expect(guestLimitMessage("device")).toMatch(/déjà utilisée sur ce téléphone\. Crée ton compte gratuit/u);
    expect(guestLimitMessage("network")).toMatch(/depuis ce réseau aujourd’hui/u);
  });

  it("n'accepte qu'un identifiant d'appareil plausible", () => {
    expect(DEVICE_ID_PATTERN.test("8a3f2c1e-1111-4abc-9def-0123456789ab")).toBe(true);
    expect(DEVICE_ID_PATTERN.test("x")).toBe(false);
    expect(DEVICE_ID_PATTERN.test("abc def ghi")).toBe(false);
  });
});

describe.skipIf(!TEST_DATABASE_URL)("analyses sans compte (MySQL)", () => {
  const run = Math.floor(Math.random() * 1e9);
  const device = (n: number) => `device-${run}-${n}`;
  const ip = (n: number) => `198.51.${run % 200}.${n}`;
  // Une date fixe, propre à ce passage, pour ne pas gêner les autres tests.
  const now = Date.UTC(2026, 2, 10, 12) + (run % 1000) * 86_400_000;

  beforeAll(() => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  it("une seule analyse par appareil", async () => {
    expect(await guestScanLeft(device(1), now)).toBe(true);
    await takeGuestScan(device(1), ip(1), now);
    expect(await guestScanLeft(device(1), now)).toBe(false);
    await expect(takeGuestScan(device(1), ip(1), now)).rejects.toMatchObject({ reason: "device" });
  });

  it("trois par réseau et par jour, puis refus, sans consommer l'appareil refusé", async () => {
    for (const n of [10, 11, 12]) await takeGuestScan(device(n), ip(2), now);
    const refused = await takeGuestScan(device(13), ip(2), now).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(GuestLimitError);
    expect((refused as GuestLimitError).reason).toBe("network");
    // L'appareil refusé pour cause de réseau garde son analyse.
    expect(await guestScanLeft(device(13), now)).toBe(true);
    // Le lendemain, le réseau a de nouveau droit à 3 analyses.
    await takeGuestScan(device(13), ip(2), now + 86_400_000);
  });

  it("rend l'analyse quand elle échoue", async () => {
    const release = await takeGuestScan(device(20), ip(3), now);
    expect(await guestScanLeft(device(20), now)).toBe(false);
    await release();
    expect(await guestScanLeft(device(20), now)).toBe(true);
  });
});
