import { describe, expect, it } from "vitest";

import { CAMERA_OPENING_KEY, cameraWasInterrupted, clearCameraOpening, markCameraOpening, takeCameraInterrupted } from "../lib/ai/camera-interrupt";

function memoryStore() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key), values };
}

describe("page rechargée pendant la photo (navigateur)", () => {
  const now = Date.UTC(2026, 9, 6, 10);

  it("repère un rechargement juste après l'ouverture de l'appareil photo, une seule fois", () => {
    const store = memoryStore();
    markCameraOpening(now, store);
    expect(cameraWasInterrupted(now + 30_000, store)).toBe(true);
    expect(takeCameraInterrupted(now + 30_000, store)).toBe(true);
    expect(takeCameraInterrupted(now + 31_000, store)).toBe(false);
  });

  it("ne dit rien quand la photo est revenue normalement, ou quand la note est trop vieille", () => {
    const store = memoryStore();
    markCameraOpening(now, store);
    clearCameraOpening(store);
    expect(cameraWasInterrupted(now + 1000, store)).toBe(false);
    store.setItem(CAMERA_OPENING_KEY, String(now));
    expect(cameraWasInterrupted(now + 11 * 60_000, store)).toBe(false);
    expect(cameraWasInterrupted(now, null)).toBe(false);
  });
});
