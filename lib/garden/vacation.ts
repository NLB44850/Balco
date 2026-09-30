/**
 * Le mode vacances : les dates d'absence, le plan de préparation avant le départ (adapté aux plantes
 * du balcon et à la saison), la liste à transmettre à la personne qui arrose, et le retour.
 * Pendant l'absence, Balco se tait ; les rappels reprennent seuls le lendemain du retour.
 * Logique pure.
 */
import { MONTH_LONG, type Month } from "../plants/catalog";
import { dayKey, plantDisplayName, type ResolvedPlant } from "./garden-logic";

export type Vacation = {
  /** Premier jour d'absence, « AAAA-MM-JJ » (heure locale). */
  start: string;
  /** Dernier jour d'absence, « AAAA-MM-JJ ». */
  end: string;
  /** Quelqu'un passe arroser. */
  helper: boolean;
  /** Préparatifs cochés (identifiants de `preparationSteps`). */
  done: string[];
};

export type VacationState =
  | { phase: "none" }
  | { phase: "upcoming"; daysLeft: number }
  | { phase: "away"; daysLeft: number }
  | { phase: "back"; daysSince: number };

/** Combien de jours après le retour la carte « Bon retour » reste affichée. */
const BACK_DAYS = 2;
const DAY_MS = 86_400_000;

export function parseDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, days: number) {
  const date = parseDay(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

function daysFrom(fromKey: string, toKey: string) {
  return Math.round((parseDay(toKey).getTime() - parseDay(fromKey).getTime()) / DAY_MS);
}

export function vacationDays(vacation: Pick<Vacation, "start" | "end">) {
  return daysFrom(vacation.start, vacation.end) + 1;
}

export function isValidVacation(value: unknown): value is Vacation {
  const v = value as Partial<Vacation> | null;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  return !!v && typeof v.start === "string" && day.test(v.start) && typeof v.end === "string" && day.test(v.end) && v.end >= v.start && typeof v.helper === "boolean" && Array.isArray(v.done);
}

/** Absent ce jour-là (clé « AAAA-MM-JJ ») : aucun rappel ne part. */
export function awayOn(vacation: Vacation | null | undefined, key: string) {
  return !!vacation && key >= vacation.start && key <= vacation.end;
}

export function vacationState(vacation: Vacation | null | undefined, now = new Date()): VacationState {
  if (!vacation) return { phase: "none" };
  const today = dayKey(now);
  if (today < vacation.start) return { phase: "upcoming", daysLeft: daysFrom(today, vacation.start) };
  if (today <= vacation.end) return { phase: "away", daysLeft: daysFrom(today, vacation.end) };
  const daysSince = daysFrom(vacation.end, today);
  return daysSince <= BACK_DAYS ? { phase: "back", daysSince } : { phase: "none" };
}

/** « du 4 au 11 octobre », « du 28 septembre au 5 octobre » */
export function vacationRange(vacation: Pick<Vacation, "start" | "end">) {
  const start = parseDay(vacation.start);
  const end = parseDay(vacation.end);
  const startLabel = start.getMonth() === end.getMonth() ? `${start.getDate()}` : `${start.getDate()} ${MONTH_LONG[start.getMonth()]}`;
  return `du ${startLabel} au ${end.getDate()} ${MONTH_LONG[end.getMonth()]}`;
}

export function dayLabel(key: string) {
  const date = parseDay(key);
  const label = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// --- Avant de partir ----------------------------------------------------------------

export type PreparationStep = { id: string; when: string; title: string; detail: string };

const names = (plants: ResolvedPlant[]) => plants.map((resolved) => plantDisplayName(resolved)).join(", ");

/** Les préparatifs, du plus tôt au dernier moment, selon les plantes, la saison et la durée. */
export function preparationSteps(plants: ResolvedPlant[], vacation: Vacation, now = new Date()): PreparationStep[] {
  const month = (parseDay(vacation.start).getMonth() + 1) as Month;
  const days = vacationDays(vacation);
  const long = days > 4;
  const warm = month >= 5 && month <= 9;
  const steps: PreparationStep[] = [];

  const ripe = plants.filter(({ entry }) => entry.harvestMonths.includes(month));
  if (ripe.length > 0) {
    steps.push({ id: "harvest", when: "Quelques jours avant", title: "Récolte ce qui est prêt", detail: `${names(ripe)} : récolte avant de partir, sinon ce sera perdu ou trop mûr au retour.` });
  }
  steps.push({ id: "tidy", when: "Quelques jours avant", title: "Retire fleurs fanées et feuilles abîmées", detail: "Moins de feuilles à nourrir, c’est moins d’eau qui s’évapore. Profites-en pour vérifier qu’aucun insecte ne s’installe." });
  if (warm || long) {
    steps.push({ id: "group", when: "La veille", title: "Rapproche tes pots, à l’abri du soleil de l’après-midi", detail: "Serrés les uns contre les autres, ils gardent mieux la fraîcheur. Contre un mur, loin du vent et du plein soleil." });
    steps.push({ id: "mulch", when: "La veille", title: "Paille la terre", detail: "2 à 3 cm de paillis (chanvre, lin, feuilles mortes, tontes sèches) : l’eau s’évapore deux fois moins vite." });
  }
  if (long && !vacation.helper) {
    steps.push({ id: "reserve", when: "La veille", title: "Installe une réserve d’eau", detail: "Une bouteille d’eau retournée et plantée dans la terre, une oya, ou une mèche en coton qui relie le pot à une bassine d’eau : de quoi tenir une à deux semaines." });
    const thirsty = plants.filter(({ entry }) => entry.care.wateringIntervalHours <= 36);
    if (thirsty.length > 0 && warm) {
      steps.push({ id: "saucer", when: "Le jour du départ", title: "Une soucoupe d’eau pour les plus assoiffées", detail: `${names(thirsty)} : une soucoupe pleine sous le pot, seulement pendant ton absence (d’habitude, on la vide).` });
    }
  }
  const frail = plants.filter(({ entry }) => entry.care.frostSensitive);
  if (frail.length > 0 && (month >= 10 || month <= 4)) {
    steps.push({ id: "frost", when: "La veille", title: "Protège les plantes frileuses", detail: `${names(frail)} : un voile d’hivernage, ou rentre-les près d’une fenêtre si une nuit froide arrive.` });
  }
  steps.push({ id: "water", when: "Le jour du départ", title: "Arrose copieusement", detail: "Jusqu’à ce que l’eau coule sous le pot, puis laisse égoutter. Le matin du départ si possible." });
  if (vacation.helper) {
    steps.push({ id: "share", when: "Avant de partir", title: "Envoie la liste à la personne qui arrose", detail: "Plante par plante : quand arroser, et quoi récolter. Tout est prêt plus bas." });
  }
  return steps;
}

export const MOISTURE_TIPS = [
  "Paillis de 2 à 3 cm : la terre reste humide bien plus longtemps.",
  "Pots serrés et à l’ombre : ils se protègent les uns les autres.",
  "Bouteille retournée, oya ou mèche en coton : l’eau arrive petit à petit.",
  "Pas d’engrais juste avant de partir : il pousse la plante à boire davantage.",
];

// --- Pour la personne qui arrose ------------------------------------------------------

/** « chaque jour », « tous les 2 jours » : le rythme d'arrosage à donner à un proche, selon la saison. */
export function wateringRhythm(resolved: ResolvedPlant, month: Month) {
  const watering = resolved.entry.tasks.find((task) => task.type === "watering");
  if (watering?.months && !watering.months.includes(month)) return "presque rien : un peu d’eau par semaine si la terre est sèche";
  const factor = month >= 6 && month <= 8 ? 1 : month === 5 || month === 9 ? 1.5 : month === 4 || month === 10 ? 2 : 3;
  const days = Math.max(1, Math.round((resolved.entry.care.wateringIntervalHours / 24) * factor));
  return days === 1 ? "chaque jour" : `tous les ${days} jours`;
}

export type HelperTask = { resolved: ResolvedPlant; rhythm: string; harvest: string | null };

export function helperTasks(plants: ResolvedPlant[], vacation: Vacation): HelperTask[] {
  const month = (parseDay(vacation.start).getMonth() + 1) as Month;
  return plants.map((resolved) => ({
    resolved,
    rhythm: wateringRhythm(resolved, month),
    harvest: resolved.entry.harvestMonths.includes(month) ? resolved.entry.harvestTip : null,
  }));
}

/** Le message prêt à envoyer (SMS, WhatsApp, e-mail) à la personne qui arrose. */
export function helperMessage(plants: ResolvedPlant[], vacation: Vacation, firstName?: string) {
  const lines = helperTasks(plants, vacation).map(({ resolved, rhythm, harvest }) => `• ${plantDisplayName(resolved)} : arroser ${rhythm}, au pied, le matin ou le soir.${harvest ? ` Récolte : ${harvest}` : ""}`);
  return [
    `Bonjour ! Merci de t’occuper de mon balcon ${vacationRange(vacation)} 🌿`,
    "",
    ...lines,
    "",
    "Astuce : enfonce un doigt dans la terre. Si elle est sèche sur 2 cm, arrose ; sinon, attends. Mieux vaut un peu moins d’eau que trop.",
    "",
    `Merci !${firstName?.trim() ? ` ${firstName.trim()}` : ""}`,
  ].join("\n");
}

// --- Au retour --------------------------------------------------------------------

export const RETURN_STEPS = [
  "Touche la terre de chaque pot et arrose ce qui est sec",
  "Vide les soucoupes et retire les réserves d’eau",
  "Coupe feuilles abîmées et fleurs fanées",
  "Récolte ce qui a mûri pendant ton absence",
];
