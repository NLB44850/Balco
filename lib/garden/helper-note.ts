/**
 * Les consignes pour la personne qui arrose pendant les vacances (chantier « Pots et balcon », étape 7) : plante par
 * plante, la quantité et le rythme d'arrosage selon les règles de l'étape 6a (taille du pot, saison), avec la chaleur
 * du moment, le balcon couvert et les dates des vacances. Le texte se modifie avant l'envoi (app/helper-note.tsx) ; la
 * ligne « Préparé avec Balco » est à part, pour pouvoir la retirer. Logique pure.
 */
import { MONTH_LONG, type Month } from "../plants/catalog";
import { afterColon } from "../plants/grammar";
import { litersText } from "../plants/watering";
import { potSizeOf, type PotSize } from "../plants/pot-size";
import { dayKey, plantDisplayName, wateringIntervalOf, wateringLitersOf, type ResolvedPlant } from "./garden-logic";
import { addDays, dayLabel, parseDay, vacationRange, type Vacation } from "./vacation";

/** Au-delà, on parle de forte chaleur : les pots sèchent deux fois plus vite. */
export const HEAT_C = 30;

export const HELPER_NOTE_SIGNATURE = "Préparé avec Balco";

const POT_SHORT: Record<PotSize, string | null> = { small: "petit pot", medium: "pot moyen", large: "grand pot", xlarge: "très grand pot", planter: "jardinière", unknown: null };

/** Le rythme d'arrosage se rallonge hors de l'été (les pots sèchent moins vite). */
function seasonFactor(month: Month) {
  return month >= 6 && month <= 8 ? 1 : month === 5 || month === 9 ? 1.5 : month === 4 || month === 10 ? 2 : 3;
}

const warmMonth = (month: Month) => month >= 5 && month <= 9;

/** Tous les combien de jours arroser cette plante pendant les vacances, ou null si elle ne demande presque rien ce mois-ci. */
export function helperWateringDays(resolved: ResolvedPlant, month: Month) {
  const watering = resolved.entry.tasks.find((task) => task.type === "watering");
  if (watering?.months && !watering.months.includes(month)) return null;
  return Math.max(1, Math.round((wateringIntervalOf(resolved) / 24) * seasonFactor(month)));
}

export function everyDaysText(days: number) {
  return days === 1 ? "chaque jour" : `tous les ${days} jours`;
}

export type HelperPlant = {
  resolved: ResolvedPlant;
  /** « pot moyen », ou null si la taille n'est pas notée. */
  pot: string | null;
  liters: number;
  /** Null : presque rien à arroser à cette saison. */
  everyDays: number | null;
  /** Le rythme par forte chaleur, quand il change (saison chaude seulement). */
  heatEveryDays: number | null;
  harvest: string | null;
};

/** Les plantes dont s'occupe la personne qui arrose (pas celles qui attendent d'être plantées). */
export function helperPlants(plants: ResolvedPlant[], vacation: Pick<Vacation, "start" | "end">): HelperPlant[] {
  const month = (parseDay(vacation.start).getMonth() + 1) as Month;
  return plants
    .filter(({ plant }) => !plant.toPlant)
    .map((resolved) => {
      const everyDays = helperWateringDays(resolved, month);
      const heat = everyDays && warmMonth(month) ? Math.max(1, Math.floor(everyDays / 2)) : null;
      return {
        resolved,
        pot: POT_SHORT[potSizeOf(resolved.plant)],
        liters: wateringLitersOf(resolved),
        everyDays,
        heatEveryDays: heat && heat < everyDays! ? heat : null,
        harvest: resolved.entry.harvestMonths.includes(month) ? resolved.entry.harvestTip : null,
      };
    });
}

const EVERY_OTHER: Record<number, string> = { 2: "un passage sur deux", 3: "un passage sur trois", 4: "un passage sur quatre" };

/**
 * Ce que demande la plante, au rythme des passages (`visitEvery`, null s'il n'y en a pas avant le retour) :
 * « environ 4 L à chaque passage, si la terre est sèche », « environ 2 L un passage sur deux, si la terre est sèche ».
 * Par forte chaleur, une plante qui a besoin d'eau plus souvent que les passages le dit clairement.
 */
export function helperPlantWatering(item: HelperPlant, visitEvery: number | null) {
  if (item.everyDays === null) return "presque rien, un peu d’eau chaque semaine si la terre est sèche";
  const liters = `environ ${litersText(item.liters)}`;
  if (visitEvery === null) return `${liters} si tu passes et que la terre est sèche`;
  const ratio = Math.max(1, Math.round(item.everyDays / visitEvery));
  const rhythm = ratio === 1 ? "à chaque passage" : (EVERY_OTHER[ratio] ?? "de temps en temps");
  const base = `${liters} ${rhythm}, ${ratio > 4 ? "seulement " : ""}si la terre est sèche`;
  if (!item.heatEveryDays) return base;
  if (item.heatEveryDays < visitEvery) {
    return `${base} ; s’il fait plus de ${HEAT_C} °C, passe plus souvent pour ${item.resolved.entry.label} si tu peux (${everyDaysText(item.heatEveryDays)})`;
  }
  return ratio > 1 ? `${base}, et à chaque passage s’il fait plus de ${HEAT_C} °C` : base;
}

/** « 20 juillet » */
function shortDay(key: string) {
  const date = parseDay(key);
  return `${date.getDate()} ${MONTH_LONG[date.getMonth()]}`;
}

/**
 * Quand passer : l'arrosage copieux du départ tient jusqu'au premier passage, puis au rythme de la plante la plus
 * assoiffée. Null si aucun passage n'est utile avant le retour.
 */
export function helperVisits(items: HelperPlant[], vacation: Pick<Vacation, "start" | "end">) {
  const rhythms = items.map((item) => item.everyDays).filter((days): days is number => days !== null);
  if (rhythms.length === 0) return null;
  const every = Math.min(...rhythms);
  const first = addDays(vacation.start, every);
  if (first > vacation.end) return null;
  const until = shortDay(vacation.end);
  if (addDays(first, every) > vacation.end) return { every, first, text: `Un passage suffit : ${dayLabel(first).toLowerCase()}.` };
  return { every, first, text: `Premier passage ${dayLabel(first).toLowerCase()}, puis ${everyDaysText(every)} jusqu’au ${until}.` };
}

export type HelperNoteInput = {
  plants: ResolvedPlant[];
  vacation: Vacation;
  firstName?: string;
  /** Balcon couvert (accueil) : la pluie n'arrive pas aux pots. */
  covered?: boolean;
  /** Température maximale du jour, quand la météo est connue. */
  todayMaxC?: number | null;
  now?: Date;
};

/** La chaleur du moment, si le départ est aujourd'hui ou demain (au-delà, la prévision ne dit rien). */
export function heatNow({ vacation, todayMaxC, now = new Date() }: Pick<HelperNoteInput, "vacation" | "todayMaxC" | "now">) {
  if (todayMaxC === null || todayMaxC === undefined || todayMaxC < HEAT_C) return null;
  const today = dayKey(now);
  return vacation.start <= addDays(today, 1) && vacation.end >= today ? Math.round(todayMaxC) : null;
}

/** Le texte des consignes, sans la ligne « Préparé avec Balco » (ajoutée à l'envoi si elle est gardée). */
export function helperNoteText(input: HelperNoteInput) {
  const { vacation, firstName } = input;
  const items = helperPlants(input.plants, vacation);
  const visits = helperVisits(items, vacation);
  const heat = heatNow(input);
  const lines = [`Bonjour ! Merci de t’occuper de mon balcon ${vacationRange(vacation)} 🌿`, "", "Quand passer", visits?.text ?? "Pas besoin de passer avant mon retour, sauf forte chaleur : jette alors un œil à la terre."];
  if (heat) lines.push(`Il fait chaud en ce moment (${heat} °C) : arrose le soir, et regarde chaque jour les petits pots.`);
  lines.push("", "Plante par plante");
  for (const item of items) {
    lines.push(`• ${plantDisplayName(item.resolved)}${item.pot ? ` (${item.pot})` : ""} : ${helperPlantWatering(item, visits?.every ?? null)}.`);
    if (item.harvest) lines.push(`  À récolter : ${afterColon(item.harvest)}`);
  }
  lines.push(
    "",
    "Comment arroser",
    "• Enfonce un doigt dans la terre : sèche sur 2 cm, arrose ; encore humide, attends le passage suivant.",
    "• Arrose au pied, le matin ou le soir, jusqu’à ce que l’eau coule sous le pot. 1,5 L, c’est une grande bouteille.",
    input.covered ? "• Le balcon est couvert : la pluie n’arrive pas aux pots, arrose même s’il pleut." : "• S’il a bien plu, tu peux sauter un arrosage.",
    "",
    `Merci !${firstName?.trim() ? ` ${firstName.trim()}` : ""}`,
  );
  return lines.join("\n");
}

/** Le message envoyé : le texte (modifié ou non), puis la signature si elle est gardée. */
export function helperNoteMessage(text: string, signature: boolean) {
  const body = text.trim();
  return signature ? `${body}\n\n${HELPER_NOTE_SIGNATURE}` : body;
}

/** Le brouillon gardé correspond à ces vacances-là (sinon on repart du texte de Balco). */
export function helperNoteKey(vacation: Pick<Vacation, "start" | "end">) {
  return `${vacation.start}:${vacation.end}`;
}
