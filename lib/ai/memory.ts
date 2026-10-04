/**
 * La mémoire de Nora : niveau, préférences et faits retenus en discutant. Logique pure, partagée par
 * l'écran Nora et le serveur (qui seul enregistre, et seul construit le texte envoyé au modèle).
 */
import { MONTH_LONG } from "../plants/catalog";

export type NoraLevel = "beginner" | "curious" | "experienced";

export const NORA_LEVELS: Array<{ id: NoraLevel; title: string; text: string; prompt: string }> = [
  { id: "beginner", title: "Je débute", text: "Explique-moi pas à pas.", prompt: "débute : explique chaque geste simplement, un seul conseil à la fois, sans jargon" },
  { id: "curious", title: "Je me lance", text: "J'ai déjà quelques plantes.", prompt: "a déjà quelques plantes : conseils concrets, tu peux employer les mots courants du jardinage" },
  { id: "experienced", title: "J'ai déjà un potager", text: "Va droit au but.", prompt: "a déjà de l'expérience : va droit au but, donne les précisions utiles (variétés, doses de terreau, calendrier)" },
];

export function isNoraLevel(value: unknown): value is NoraLevel {
  return NORA_LEVELS.some((level) => level.id === value);
}

export type NoraPreference = {
  id: string;
  label: string;
  prompt: string;
  /** Préférence contraire : choisir l'une retire l'autre. */
  excludes?: string;
};

export const NORA_PREFERENCES: NoraPreference[] = [
  { id: "short", label: "Réponses très courtes", prompt: "veut des réponses très courtes (deux phrases au plus)", excludes: "explain" },
  { id: "explain", label: "Explique-moi le pourquoi", prompt: "aime comprendre le pourquoi des gestes", excludes: "short" },
  { id: "little-time", label: "J'ai peu de temps", prompt: "a peu de temps : privilégie les gestes rapides et les plantes faciles" },
  { id: "save-water", label: "Économiser l'eau", prompt: "veut économiser l'eau (paillage, récupération, arrosage ciblé)" },
  { id: "pets", label: "J'ai un animal", prompt: "a un animal de compagnie : signale toujours les plantes toxiques pour lui" },
  { id: "kids", label: "J'ai des enfants", prompt: "a des enfants : signale les plantes toxiques et propose des gestes à faire avec eux" },
  { id: "cooking", label: "Cuisiner mes récoltes", prompt: "aime cuisiner ses récoltes : idées de recettes et de conservation bienvenues" },
  { id: "wildlife", label: "Accueillir abeilles et oiseaux", prompt: "veut accueillir les pollinisateurs et les oiseaux" },
  { id: "small-budget", label: "Petit budget", prompt: "a un petit budget : récupération, boutures et semis plutôt qu'achats" },
];

const PREFERENCE_IDS = new Set(NORA_PREFERENCES.map((preference) => preference.id));

/** Garde les préférences connues, sans doublon ni contradiction (la dernière choisie gagne). */
export function cleanPreferences(ids: readonly string[]): string[] {
  const kept: string[] = [];
  for (const id of ids) {
    if (!PREFERENCE_IDS.has(id) || kept.includes(id)) continue;
    const excluded = NORA_PREFERENCES.find((preference) => preference.id === id)?.excludes;
    const index = excluded ? kept.indexOf(excluded) : -1;
    if (index !== -1) kept.splice(index, 1);
    kept.push(id);
  }
  return kept;
}

export function togglePreference(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : cleanPreferences([...ids, id]);
}

export type NoraNote = { id: string; text: string; createdAt: string };

export const MAX_NOTES = 30;
export const MAX_NOTE_LENGTH = 160;

/** Un fait tient sur une ligne : espaces resserrés, point final retiré, longueur bornée. */
export function cleanNote(text: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim().replace(/[.;,\s]+$/, "");
  if (clean.length < 3) return null;
  return clean.length > MAX_NOTE_LENGTH ? `${clean.slice(0, MAX_NOTE_LENGTH - 1).trimEnd()}…` : clean;
}

const comparable = (text: string) => text.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Applique ce que Nora vient d'apprendre : retire les faits devenus faux, ajoute les nouveaux (sans
 * doublon), et garde les plus récents quand la mémoire est pleine.
 */
export function mergeNotes(existing: readonly NoraNote[], add: readonly string[], forgetIds: readonly string[], now: Date, makeId: () => string): { notes: NoraNote[]; added: NoraNote[] } {
  const notes = existing.filter((note) => !forgetIds.includes(note.id));
  const added: NoraNote[] = [];
  for (const raw of add) {
    const text = cleanNote(raw);
    if (!text) continue;
    const key = comparable(text);
    if (notes.some((note) => comparable(note.text) === key)) continue;
    const note = { id: makeId(), text, createdAt: now.toISOString() };
    notes.push(note);
    added.push(note);
  }
  const kept = notes.slice(-MAX_NOTES);
  return { notes: kept, added: added.filter((note) => kept.includes(note)) };
}

export function parseNotes(json: string | null | undefined): NoraNote[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((note): note is NoraNote => typeof note?.id === "string" && typeof note?.text === "string" && typeof note?.createdAt === "string");
  } catch {
    return [];
  }
}

export function parsePreferences(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? cleanPreferences(value.filter((id): id is string => typeof id === "string")) : [];
  } catch {
    return [];
  }
}

export type NoraMemoryView = {
  /** Niveau choisi dans Nora, sinon celui de l'accueil, sinon nul. */
  level: NoraLevel | null;
  preferences: string[];
  notes: NoraNote[];
};

/** « le 12 septembre », « le 3 mai 2025 » : quand Nora a retenu un fait. */
export function noteDate(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  return `le ${date.getDate()} ${MONTH_LONG[date.getMonth()]}${date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`}`;
}

/**
 * Lignes ajoutées au contexte de Nora (sans rien si la mémoire est vide). Chaque fait porte sa date :
 * Nora peut ainsi voir qu'un « part en vacances en août » noté en juillet est sans doute passé.
 */
export function describeMemory(memory: NoraMemoryView, now = new Date()): string[] {
  const level = NORA_LEVELS.find((item) => item.id === memory.level);
  const preferences = memory.preferences.flatMap((id) => NORA_PREFERENCES.find((preference) => preference.id === id)?.prompt ?? []);
  return [
    level ? `Niveau de la personne : ${level.prompt}.` : "Niveau de la personne : non précisé, considère qu'elle débute.",
    preferences.length > 0 ? `Préférences choisies par la personne : ${preferences.join(" ; ")}.` : null,
    memory.notes.length > 0 ? `Ce que tu as retenu de vos échanges (identifiant entre crochets) :\n${memory.notes.map((note) => `- [${note.id}] ${note.text}${noteDate(note.createdAt, now) ? ` (retenu ${noteDate(note.createdAt, now)})` : ""}`).join("\n")}` : "Tu n'as encore rien retenu de vos échanges.",
  ].filter((line): line is string => line !== null);
}
