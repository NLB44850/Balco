import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { noraMemories } from "../../drizzle/schema";
import { cleanPreferences, mergeNotes, parseNotes, type NoraNote } from "../../lib/ai/memory";
import { getDb } from "../db";
import { loadMemory } from "./context";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

async function saveRow(userId: number, set: Partial<typeof noraMemories.$inferInsert>) {
  const db = await requireDb();
  await db.insert(noraMemories).values({ userId, ...set }).onDuplicateKeyUpdate({ set: Object.keys(set).length > 0 ? set : { userId } });
}

async function storedNotes(userId: number) {
  const db = await requireDb();
  const [row] = await db.select({ notesJson: noraMemories.notesJson }).from(noraMemories).where(eq(noraMemories.userId, userId)).limit(1);
  return parseNotes(row?.notesJson);
}

/** Préférences choisies par la personne dans l'écran Nora. */
export async function updatePreferences(userId: number, preferences: string[]) {
  await saveRow(userId, { preferencesJson: JSON.stringify(cleanPreferences(preferences)) });
  return loadMemory(userId);
}

/** Enregistre ce que Nora vient d'apprendre ; renvoie ce qui a vraiment changé, pour l'afficher. */
export async function learnFromAnswer(userId: number, remember: string[], forget: string[], now = new Date()): Promise<{ added: NoraNote[]; forgotten: NoraNote[] }> {
  if (remember.length === 0 && forget.length === 0) return { added: [], forgotten: [] };
  const existing = await storedNotes(userId);
  const forgotten = existing.filter((note) => forget.includes(note.id));
  const { notes, added } = mergeNotes(existing, remember, forget, now, () => `n${randomBytes(4).toString("hex")}`);
  if (added.length > 0 || forgotten.length > 0) await saveRow(userId, { notesJson: JSON.stringify(notes) });
  return { added, forgotten };
}

/** « Oublier » un fait, ou tout ce que Nora a retenu (sans toucher au niveau ni aux préférences). */
export async function forgetNotes(userId: number, noteId?: string) {
  const notes = noteId ? (await storedNotes(userId)).filter((note) => note.id !== noteId) : [];
  await saveRow(userId, { notesJson: JSON.stringify(notes) });
  return loadMemory(userId);
}
