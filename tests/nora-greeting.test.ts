import { describe, expect, it } from "vitest";

import { noraGreeting } from "../lib/ai/greeting";
import { recommendPlants } from "../lib/plants/catalog";

describe("Nora demande le prénom, sans IA ni compte", () => {
  it("sans prénom : « Comment je t'appelle ? », une seule fois", () => {
    const first = noraGreeting({ firstName: null, nameAsked: false, signedIn: false });
    expect(first.askName).toBe(true);
    expect(first.lines.map((line) => line.text)).toContain("Comment je t’appelle ?");
    expect(first.lines[0].text).toBe("Bonjour ! Je suis Nora, ta coach pour un balcon vivant et facile à entretenir.");
    // « Plus tard » : elle ne redemande pas.
    expect(noraGreeting({ firstName: "", nameAsked: true, signedIn: false }).askName).toBe(false);
  });

  it("avec un prénom : elle le dit, et le confirme juste après l'avoir appris", () => {
    const named = noraGreeting({ firstName: "Camille", nameAsked: false, signedIn: true, justNamed: true });
    expect(named.askName).toBe(false);
    expect(named.lines.map((line) => line.text)).toEqual([
      "Bonjour Camille ! Je suis Nora, ta coach pour un balcon vivant et facile à entretenir.",
      "Enchantée, Camille ! Tu pourras changer ton prénom dans Réglages.",
      "Pose-moi une question sur tes plantes, ton exposition ou la saison : je connais ton balcon 🌿",
    ]);
    expect(noraGreeting({ firstName: "Camille", nameAsked: false, signedIn: true }).lines).toHaveLength(2);
  });

  it("l'expérience ne change plus les plantes proposées", () => {
    const base = { sunlight: "sunny", space: "balcony", goals: ["tomatoes"] };
    const ids = (experience?: string) => recommendPlants({ ...base, experience }).slice(0, 10).map((entry) => entry.id);
    expect(ids("beginner")).toEqual(ids("experienced"));
    expect(ids("beginner")).toEqual(ids(undefined));
  });
});
