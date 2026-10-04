import { describe, expect, it } from "vitest";

import { conversationDayLabel, conversationForNora, withDaySeparators, type DatedMessage } from "../lib/ai/conversation";
import { cleanNote, cleanPreferences, describeMemory, mergeNotes, noteDate, parseNotes, togglePreference } from "../lib/ai/memory";
import { describeGarden, summarizeHistory, type GardenFacts } from "../server/ai/context";

const NOW = new Date("2026-09-29T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
let counter = 0;
const makeId = () => `n${++counter}`;

describe("Nora's memory", () => {
  it("keeps known preferences only, without contradictions", () => {
    expect(cleanPreferences(["pets", "nope", "pets", "short", "explain"])).toEqual(["pets", "explain"]);
    expect(togglePreference(["explain", "pets"], "short")).toEqual(["pets", "short"]);
    expect(togglePreference(["pets"], "pets")).toEqual([]);
  });

  it("cleans facts and skips the ones already known, whatever the accents or case", () => {
    expect(cleanNote("  A un   chat.  ")).toBe("A un chat");
    expect(cleanNote("ok")).toBeNull();
    expect(cleanNote("x".repeat(400))!.length).toBe(160);
    const first = mergeNotes([], ["A un chat", "Part en vacances en août"], [], NOW, makeId);
    expect(first.added.map((note) => note.text)).toEqual(["A un chat", "Part en vacances en août"]);
    const again = mergeNotes(first.notes, ["a un CHAT !", "Part en vacances en aout"], [], NOW, makeId);
    expect(again.added).toEqual([]);
    expect(again.notes).toHaveLength(2);
  });

  it("forgets contradicted facts and keeps the most recent ones when full", () => {
    const { notes } = mergeNotes([], Array.from({ length: 30 }, (_, index) => `Fait numéro ${index}`), [], NOW, makeId);
    const next = mergeNotes(notes, ["N'a plus de chat"], [notes[5].id], NOW, makeId);
    expect(next.notes).toHaveLength(30);
    expect(next.notes.some((note) => note.text === "Fait numéro 5")).toBe(false);
    expect(next.notes.at(-1)?.text).toBe("N'a plus de chat");
    expect(next.added).toHaveLength(1);
  });

  it("reads stored JSON defensively", () => {
    expect(parseNotes("{broken")).toEqual([]);
    expect(parseNotes(JSON.stringify([{ id: "a", text: "ok", createdAt: "x" }, { id: 3 }]))).toHaveLength(1);
  });

  it("tells Nora the level, preferences and remembered facts with their ids", () => {
    const text = describeMemory({ level: "beginner", preferences: ["pets"], notes: [{ id: "n9", text: "A un chat", createdAt: NOW.toISOString() }] }).join("\n");
    expect(text).toContain("débute");
    expect(text).toContain("animal de compagnie");
    expect(text).toContain("[n9] A un chat");
    expect(describeMemory({ level: null, preferences: [], notes: [] }).join("\n")).toContain("non précisé");
  });

  it("dates each remembered fact, so Nora can tell an old one from a fresh one", () => {
    const notes = [
      { id: "n1", text: "Part en vacances en août", createdAt: "2026-07-03T09:00:00Z" },
      { id: "n2", text: "A un chat", createdAt: "2025-05-12T09:00:00Z" },
    ];
    const text = describeMemory({ level: null, preferences: [], notes }, NOW).join("\n");
    expect(text).toContain("[n1] Part en vacances en août (retenu le 3 juillet)");
    expect(text).toContain("[n2] A un chat (retenu le 12 mai 2025)");
    expect(noteDate("pas une date", NOW)).toBeNull();
  });
});

describe("conversation over several days", () => {
  const now = new Date(2026, 9, 4, 10);
  const at = (daysAgo: number, hour = 9) => new Date(2026, 9, 4 - daysAgo, hour).toISOString();
  const messages: DatedMessage[] = [
    { id: "old", from: "user", text: "Question sans date" },
    { id: "a", from: "user", text: "Mes tomates ?", at: at(6) },
    { id: "b", from: "bot", text: "Arrose-les.", at: at(6) },
    { id: "m", from: "memory", text: "Nora a retenu : A un chat", at: at(6) },
    { id: "c", from: "user", text: "Et le basilic ?", at: at(1, 20) },
    { id: "d", from: "bot", text: "Pince ses fleurs.", at: at(1, 20) },
    { id: "n", from: "notice", text: "Quota", at: at(0) },
    { id: "e", from: "user", text: "Merci !", at: at(0) },
  ];

  it("labels each day of the conversation", () => {
    expect(conversationDayLabel(at(0), now)).toBe("Aujourd’hui");
    expect(conversationDayLabel(at(1, 23), now)).toBe("Hier");
    expect(conversationDayLabel(at(6), now)).toBe("Lundi 28 septembre");
    expect(conversationDayLabel(new Date(2025, 4, 3).toISOString(), now)).toBe("3 mai 2025");
    const items = withDaySeparators(messages, now);
    expect(items.filter((item) => item.from === "day").map((item) => item.text)).toEqual(["Lundi 28 septembre", "Hier", "Aujourd’hui"]);
    expect(items[0].id).toBe("old");
  });

  it("only sends Nora the last two days of questions and answers", () => {
    expect(conversationForNora(messages, now)).toEqual([
      { role: "user", content: "Et le basilic ?" },
      { role: "assistant", content: "Pince ses fleurs." },
      { role: "user", content: "Merci !" },
    ]);
  });
});

describe("history for Nora (last 90 days, aggregated)", () => {
  const plants = [
    { plantId: "basil-1", catalogId: "basil", nickname: "Basilic cuisine", displayName: "Basilic", varietyId: null, active: 1, addedAt: daysAgo(90), removedAt: null },
    { plantId: "mint-1", catalogId: "mint", nickname: null, displayName: "Menthe", varietyId: null, active: 1, addedAt: daysAgo(10), removedAt: null },
    { plantId: "radish-1", catalogId: "radish", nickname: null, displayName: "Radis", varietyId: null, active: 0, addedAt: daysAgo(120), removedAt: daysAgo(60) },
  ];
  const events = [
    ...Array.from({ length: 20 }, (_, index) => ({ plantId: "basil-1", type: "watering", completedAt: daysAgo(2 + index * 4), note: "Arrose le basilic" })),
    { plantId: "basil-1", type: "pruning", completedAt: daysAgo(25), note: "Pince les fleurs du basilic" },
    { plantId: "radish-1", type: "harvest", completedAt: daysAgo(61), note: null },
    { plantId: "ghost", type: "watering", completedAt: daysAgo(1), note: null },
    // Plus vieux que 90 jours : ignoré, pour un contexte court.
    { plantId: "basil-1", type: "harvest", completedAt: daysAgo(120), note: "Récolte le basilic" },
  ];

  it("summarizes the last 90 days per plant and per type of gesture", () => {
    const { history, removedPlants, totals } = summarizeHistory(plants, events, NOW);
    const basil = history.find((plant) => plant.name === "Basilic cuisine")!;
    expect(basil.byType[0]).toEqual({ type: "arrosage", count: 20, lastDaysAgo: 2 });
    expect(basil.byType[1]).toEqual({ type: "taille", count: 1, lastDaysAgo: 25 });
    // Une seule note en clair : le dernier geste ; le reste est agrégé.
    expect(basil.recentNotes.map((note) => note.text)).toEqual(["Arrose le basilic"]);
    expect(basil.neverDone).toContain("récolte");
    expect(history.find((plant) => plant.name === "Menthe")!.byType).toEqual([]);
    expect(removedPlants).toEqual([{ name: "Radis", grownDays: 60, removedDaysAgo: 60 }]);
    expect(totals).toEqual({ events: 22, last30Days: 9, firstDaysAgo: 78 });
  });

  it("writes it in plain French for Nora", () => {
    const summary = summarizeHistory(plants, events, NOW);
    const facts: GardenFacts = {
      firstName: "Léa", city: "Lyon", sunlight: "Soleil", space: null, goals: ["des aromatiques pour la cuisine"],
      plants: [], ...summary, memory: { level: "curious", preferences: [], notes: [] },
    };
    const text = describeGarden(facts, NOW);
    expect(text).toContain("Basilic cuisine (sur le balcon depuis 3 mois) : arrosage 20 fois, dernière fois il y a 2 j ; taille 1 fois, dernière fois il y a 25 j");
    expect(text).toContain("pas noté depuis 90 j : ");
    expect(text).toContain("dernier geste : « Arrose le basilic » il y a 2 j");
    expect(text).not.toContain("Récolte le basilic");
    expect(text).toContain("Historique des 90 derniers jours, plante par plante");
    expect(text).toContain("Gestes notés dans Balco ces 90 derniers jours : 22, dont 9 ces 30 derniers jours.");
    expect(text).toContain("Radis (60 j sur le balcon, retrait il y a 2 mois)");
    expect(text).toContain("Envies choisies à l'inscription : des aromatiques pour la cuisine.");
    expect(text).toContain("quelques plantes");
  });

  it("gives Nora the balcony position, even when the city has no name", () => {
    const summary = summarizeHistory([], [], NOW);
    const base: GardenFacts = { firstName: null, city: null, sunlight: null, space: null, goals: [], plants: [], ...summary, memory: { level: null, preferences: [], notes: [] } };
    const text = describeGarden({ ...base, position: { latitude: 47.22, longitude: -1.55 } }, NOW);
    expect(text).toContain("Position du balcon : 47.22° N, 1.55° O (déduis-en la ville ou la région).");
    expect(text).not.toContain("Ville :");
    expect(describeGarden({ ...base, city: "Nantes", position: { latitude: 47.22, longitude: -1.55 } }, NOW)).toContain("Ville : Nantes.\nPosition du balcon : 47.22° N, 1.55° O.");
  });
});
