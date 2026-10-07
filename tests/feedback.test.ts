import { describe, expect, it } from "vitest";

import { FEEDBACK_EMAIL, feedbackMailto, versionText } from "../lib/feedback";

describe("Donner mon avis", () => {
  it("un e-mail prérempli vers l'adresse de contact, avec la version", () => {
    const link = feedbackMailto("1.0.0", "android");
    expect(link.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=Mon%20avis%20sur%20Balco&body=`)).toBe(true);
    expect(decodeURIComponent(link.split("body=")[1])).toContain("Balco 1.0.0 · android");
  });

  it("la version, avec « · test » seulement dans la version de test", () => {
    expect(versionText("1.0.0", true)).toBe("Version 1.0.0 · test");
    expect(versionText("1.0.0", false)).toBe("Version 1.0.0");
  });
});
