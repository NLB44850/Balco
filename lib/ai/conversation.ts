/**
 * La conversation avec Nora au fil des jours : un séparateur par journée à l'écran (« Aujourd'hui »,
 * « Hier », « Lundi 28 septembre »), et seuls les messages des deux derniers jours renvoyés à Nora.
 * Ce qui est plus ancien reste visible ; Nora s'en souvient par ce qu'elle a retenu. Logique pure.
 */
import { MONTH_LONG } from "../plants/catalog";

/** Ce dont la logique a besoin d'un message de l'écran Nora. */
export type DatedMessage = { id: string; from: "bot" | "user" | "notice" | "memory"; text: string; at?: string };

/** Messages renvoyés à Nora : ceux des 2 derniers jours (avant, elle s'appuie sur ce qu'elle a retenu). */
export const CONVERSATION_MEMORY_DAYS = 2;

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** « Aujourd'hui », « Hier », « Lundi 28 septembre », « 3 mai 2025 ». */
export function conversationDayLabel(at: string, now = new Date()) {
  const date = new Date(at);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  if (date.getFullYear() !== now.getFullYear()) return `${date.getDate()} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`;
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_LONG[date.getMonth()]}`;
}

export type ConversationItem<M extends DatedMessage> = M | { id: string; from: "day"; text: string };

/** Insère un séparateur avant le premier message de chaque journée (les anciens messages sans date n'en ont pas). */
export function withDaySeparators<M extends DatedMessage>(messages: M[], now = new Date()): ConversationItem<M>[] {
  const items: ConversationItem<M>[] = [];
  let lastDay: number | null = null;
  for (const message of messages) {
    if (message.at && Number.isFinite(new Date(message.at).getTime())) {
      const day = startOfDay(new Date(message.at));
      if (day !== lastDay) items.push({ id: `day-${day}`, from: "day", text: conversationDayLabel(message.at, now) });
      lastDay = day;
    }
    items.push(message);
  }
  return items;
}

/** Les échanges renvoyés à Nora : questions et réponses récentes seulement, ni notices ni souvenirs. */
export function conversationForNora(messages: DatedMessage[], now = new Date()) {
  const since = startOfDay(now) - (CONVERSATION_MEMORY_DAYS - 1) * 86_400_000;
  return messages
    .filter((message) => (message.from === "user" || message.from === "bot") && message.at !== undefined && new Date(message.at).getTime() >= since)
    .map((message) => ({ role: message.from === "user" ? ("user" as const) : ("assistant" as const), content: message.text.slice(0, 2000) }));
}
