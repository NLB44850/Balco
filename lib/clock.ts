/**
 * L'horloge commune de l'app. Dans la version de test, « Faire comme si on était le… » (Réglages → Version de
 * test) avance ou recule le jour, en gardant l'heure réelle : calendrier, Saisons, badges, astuces, « À anticiper »
 * et événements lisent tous `now()`. Sans simulation (et toujours dans l'app publiée), `now()` est l'heure réelle.
 * Les notifications restent programmées à l'heure réelle du téléphone.
 */

/** Jour simulé, « AAAA-MM-JJ », ou null. */
let simulatedDay: string | null = null;
const listeners = new Set<(day: string | null) => void>();

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Le jour `day` à l'heure de `real` (null ou jour illisible : `real` tel quel). */
export function shiftedDate(real: Date, day: string | null): Date {
  const match = day ? DAY_PATTERN.exec(day) : null;
  if (!match) return real;
  const date = new Date(real);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date;
}

/** Maintenant, selon l'horloge de l'app. */
export function now(): Date {
  return shiftedDate(new Date(), simulatedDay);
}

export function simulatedClockDay(): string | null {
  return simulatedDay;
}

/** Change le jour simulé (null : retour au vrai jour) et prévient les écrans ouverts. */
export function setSimulatedClockDay(day: string | null) {
  const next = day && DAY_PATTERN.test(day) ? day : null;
  if (next === simulatedDay) return;
  simulatedDay = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeClock(listener: (day: string | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `day` décalé de `days` jours (« AAAA-MM-JJ »). */
export function addDays(day: string, days: number): string {
  const match = DAY_PATTERN.exec(day);
  if (!match) return day;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** « jeudi 20 novembre 2026 » (« 1er » pour le premier du mois). */
export function longDayText(day: string): string {
  const match = DAY_PATTERN.exec(day);
  if (!match) return day;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const dayOfMonth = date.getUTCDate();
  return `${WEEKDAYS[date.getUTCDay()]} ${dayOfMonth === 1 ? "1er" : dayOfMonth} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Les jours à essayer en un geste, pour l'année du jour réel (`today`, « AAAA-MM-JJ ») ou la suivante s'ils sont passés. */
export function clockPresets(today: string): Array<{ day: string; label: string }> {
  const year = Number(today.slice(0, 4));
  const next = (monthDay: string) => {
    const day = `${year}-${monthDay}`;
    return day >= today ? day : `${year + 1}-${monthDay}`;
  };
  return [
    { day: next("11-18"), label: "18 nov." },
    { day: next("11-25"), label: "25 nov." },
    { day: next("12-01"), label: "1er déc." },
    { day: next("01-15"), label: "15 janv." },
    { day: next("03-01"), label: "1er mars" },
    { day: next("05-12"), label: "12 mai" },
    { day: next("07-15"), label: "15 juil." },
    { day: next("09-15"), label: "15 sept." },
  ].sort((a, b) => a.day.localeCompare(b.day));
}
