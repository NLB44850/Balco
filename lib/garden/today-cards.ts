/**
 * Les cartes « en plus » d'Aujourd'hui, sous la liste du jour (jamais des lignes en plus) : au plus deux à la fois,
 * par priorité événement en cours > à anticiper > astuce > Idée du mois. La carte « C'est le moment » des envies du
 * printemps compte comme « à anticiper » et passe avant l'annonce calculée. Logique pure.
 */
export type TodayCard = "event" | "spring" | "anticipate" | "tip" | "idea";

export const MAX_TODAY_CARDS = 2;
const PRIORITY: TodayCard[] = ["event", "spring", "anticipate", "tip", "idea"];

/** Les cartes à montrer, dans l'ordre de priorité, parmi celles qui ont quelque chose à dire. */
export function pickTodayCards(available: Partial<Record<TodayCard, boolean>>): TodayCard[] {
  const picked: TodayCard[] = [];
  for (const card of PRIORITY) {
    if (!available[card]) continue;
    // Une seule carte « à anticiper » : les envies du printemps, sinon l'annonce.
    if (card === "anticipate" && picked.includes("spring")) continue;
    picked.push(card);
    if (picked.length === MAX_TODAY_CARDS) break;
  }
  return picked;
}

/** « Ton balcon se repose » : des plantes, rien à faire aujourd'hui, rien de fait non plus. */
export const RESTING_TITLE = "Ton balcon se repose";
export const RESTING_TEXT = "Rien à faire aujourd’hui. Profites-en pour préparer la suite.";
