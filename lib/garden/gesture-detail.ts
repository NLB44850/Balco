/**
 * Le détail d'un geste dans la feuille du bas d'Aujourd'hui, au même format pour tous (retour du 13/10 : « uniformiser
 * le nouveau design » de l'arrosage) : un repère en grand (la quantité d'eau, la largeur du pot, la profondeur du semis,
 * le rythme de l'engrais…), puis deux à quatre gestes courts avec une icône chacun, et au besoin un encadré à part
 * (l'engrais après l'arrosage) ou un bandeau (balcon couvert, geste fait). Logique pure : l'écran ne fait que dessiner.
 */
import { formatMonthRange, MONTH_LONG, sowsIndoors, type CatalogPlant } from "../plants/catalog";
import { ACTIVITY_KIND_LABELS, type CalendarActivity } from "../plants/calendar";
import { feedingFor } from "../plants/fertilizing";
import { capitalize } from "../plants/grammar";
import { delayText, plantingOf } from "../plants/guide";
import { nextPotFor, potNeedFor, potNeedShort, soilPhrase } from "../plants/pot-sheet";
import { wateringLiters, litersText } from "../plants/watering";
import type { TodayItem } from "./today";
import { potHistory, type ResolvedPlant } from "./garden-logic";
import type { MaintenanceEvent } from "../reminders/reminder-engine";

export type DetailHero =
  /** La quantité d'eau, dessinée en grandes bouteilles. */
  | { art: "bottles"; liters: number }
  /** Un chiffre en grand (« 25 cm », « 14 j », « 18 à 22 °C ») avec sa légende et une grande icône. */
  | { art: "emoji"; emoji: string; value: string; caption: string };

export type GestureDetail = {
  banner?: { text: string; tone: "water" | "done" };
  hero?: DetailHero;
  steps: { icon: string; text: string }[];
  /** Une phrase propre à la plante (« Le thym craint l'excès d'eau… »), en plus petit. */
  note?: string;
  /** Un encadré à part : l'engrais à donner après l'arrosage. */
  box?: { title: string; text: string; small: string };
};

/** Les phrases d'un texte, sans le point final : chacune devient un geste. */
export function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«])/u)
    .map((part) => part.trim().replace(/\.$/u, ""))
    .filter(Boolean);
}

const cm = (value: number) => `${String(value).replace(".", ",")} cm`;

/** « Du terreau neuf mêlé de sable » : le terreau de sa fiche, en tête de phrase. */
const soilStep = (entry: CatalogPlant) => capitalize(soilPhrase(entry));

/** Les gestes d'un texte libre, avec la même icône (soins, gestes de suite, alertes météo). */
const fromText = (text: string, icon: string) => sentences(text).map((part) => ({ icon, text: part }));

type DetailContext = {
  /** La plante du balcon concernée (taille du pot, rempotages). */
  resolved?: ResolvedPlant;
  events: MaintenanceEvent[];
  now: Date;
  /** « Fait à 14 h 33 » quand le geste est coché. */
  doneText?: string;
};

function startDetail(activity: CalendarActivity, ctx: DetailContext): GestureDetail {
  const { entry } = activity;
  const planting = plantingOf(entry);
  const month = ctx.now.getMonth() + 1;
  const sprouting = planting.germinationDays ? [{ icon: "⏳", text: `Les pousses sortent en ${delayText(planting.germinationDays, "days")}` }] : [];
  const seeds = planting.seedsPerHole ? `${planting.seedsPerHole} graine${planting.seedsPerHole > 1 ? "s" : ""} par trou${planting.spacingCm ? `, tous les ${planting.spacingCm} cm` : ""}` : "Sème en ligne fine, pas trop serré";
  const later = /Meilleure période : (.+)\.$/u.exec(activity.description)?.[1];
  const note = later ? `Meilleure période : ${later}.` : undefined;
  // Sur le rebord intérieur l'hiver : le texte du calendrier suffit.
  if (/à l’intérieur$/u.test(activity.title)) return { hero: { art: "emoji", emoji: "🏠", value: "Dedans", caption: "sur un rebord lumineux, l’hiver" }, steps: fromText(activity.description, "🌱") };
  if (activity.kind === "sow" && sowsIndoors(entry, month)) {
    return {
      hero: { art: "emoji", emoji: "🌡️", value: "18 à 22 °C", caption: "au chaud, près d’une fenêtre lumineuse" },
      steps: [
        { icon: "🥤", text: "Des godets de terreau de semis" },
        { icon: "🌰", text: planting.sowDepthCm ? `${seeds}, à ${cm(planting.sowDepthCm)} de profondeur` : seeds },
        { icon: "💦", text: "Garde la terre humide, sans la détremper" },
        ...sprouting,
      ],
      ...(entry.plantMonths.length > 0 ? { note: `Les plants sortent au balcon en ${formatMonthRange(entry.plantMonths)}.` } : {}),
    };
  }
  if (activity.kind === "sow") {
    const surface = planting.sowDepthCm === 0;
    return {
      hero: { art: "emoji", emoji: "🌰", value: surface ? "En surface" : cm(planting.sowDepthCm ?? 1), caption: surface ? "graines posées, à peine couvertes" : "de profondeur" },
      steps: [
        { icon: "🪴", text: `${capitalize(potNeedShort(entry))}, ${soilPhrase(entry)}` },
        { icon: "🌰", text: seeds },
        { icon: "🌦️", text: "Arrose en pluie fine" },
        ...sprouting,
      ],
      ...(note ? { note } : {}),
    };
  }
  const need = potNeedFor(entry);
  const liters = wateringLiters(entry, ctx.resolved?.plant.potSize);
  return {
    hero: { art: "emoji", emoji: "🪴", value: need.planter ? "60 cm" : cm(need.widthCm), caption: need.planter ? `jardinière percée · ${need.depthCm} cm de terre` : `de large, pot percé · ${need.depthCm} cm de terre` },
    steps: [
      { icon: "🟫", text: soilStep(entry) },
      { icon: "🌱", text: "Place la motte au même niveau que dans son godet" },
      { icon: "👐", text: "Tasse doucement la terre autour" },
      { icon: "💧", text: `Arrose bien, environ ${litersText(liters)}` },
    ],
    ...(note ? { note } : {}),
  };
}

function activityDetail(activity: CalendarActivity, ctx: DetailContext): GestureDetail {
  const { entry } = activity;
  if (activity.start || activity.kind === "plant" || activity.kind === "sow") return startDetail(activity, ctx);
  if (activity.kind === "repot" && activity.topdress) {
    return {
      hero: { art: "emoji", emoji: "🥄", value: "5 cm", caption: "de terre du dessus à changer" },
      steps: [
        { icon: "🥄", text: "Gratte les 5 cm de terre du dessus, sans abîmer les racines" },
        { icon: "🟫", text: `Remets ${soilPhrase(entry)}` },
        { icon: "💧", text: "Arrose doucement" },
      ],
    };
  }
  if (activity.kind === "repot") {
    const plant = ctx.resolved?.plant;
    const next = nextPotFor(entry, plant?.potSize, plant ? potHistory(plant, ctx.events).repots : 0);
    return {
      hero: { art: "emoji", emoji: "🪴", value: cm(next.widthCm), caption: "de large, un pot plus grand et percé" },
      steps: [
        { icon: "🔎", text: sentences(activity.description)[0] ?? "Des racines sortent par les trous ? Rempote" },
        { icon: "👐", text: "Démêle un peu les racines, garde le même niveau" },
        { icon: "🟫", text: soilStep(entry) },
        { icon: "💧", text: "Arrose bien" },
      ],
    };
  }
  const icon = activity.followUp === "outdoors" ? "🌤️" : activity.followUp ? "✂️" : activity.kind === "harvest" ? "🧺" : "🌿";
  return { steps: fromText(activity.description, icon) };
}

/** « Jusqu'en septembre » : la fin de la période de récolte en cours. */
function harvestUntil(entry: CatalogPlant, now: Date) {
  let month = now.getMonth() + 1;
  if (!entry.harvestMonths.includes(month as never)) return null;
  for (let step = 0; step < 11; step += 1) {
    const next = month === 12 ? 1 : month + 1;
    if (!entry.harvestMonths.includes(next as never)) break;
    month = next;
  }
  return MONTH_LONG[month - 1];
}

const TASK_ICONS: Record<string, string> = { observation: "🔎", pruning: "✂️", protection: "🛡️", repotting: "🪴", harvest: "✂️" };

export function gestureDetail(item: TodayItem, ctx: DetailContext): GestureDetail {
  const banner = ctx.doneText ? { banner: { text: `✓ ${ctx.doneText}`, tone: "done" as const } } : {};
  // L'arrosage (étape 6a) : la quantité en bouteilles, les trois gestes, l'engrais à part.
  if (item.gesture === "watering" && item.liters !== undefined) {
    const plantNote = item.kind === "task" ? item.task.task.instruction.replace(/ Arrose environ .*$/u, "") : "";
    const feeding = item.feed ? feedingFor(item.feed.resolved.entry.id) : null;
    return {
      ...(item.coached ? { banner: { text: "✨  Coach Balco+ : selon la chaleur du jour et le soleil de ton balcon", tone: "water" as const } } : {}),
      ...(item.sheltered ? { banner: { text: "☂️  Balcon couvert : la pluie n’arrive pas à tes pots", tone: "water" as const } } : {}),
      ...banner,
      hero: { art: "bottles", liters: item.liters },
      steps: [
        { icon: "👆", text: `Enfonce ton doigt : sèche sur ${item.checkCm ?? 2} cm ?` },
        { icon: "💧", text: "Arrose au pied, jusqu’à ce que ça coule" },
        { icon: "🍽️", text: "Vide la soucoupe après 30 min" },
      ],
      ...(plantNote && !plantNote.startsWith("Enfonce un doigt") ? { note: plantNote } : {}),
      ...(item.feed
        ? { box: { title: "🌿  Puis l’engrais", text: feeding ? capitalize(feeding.kind) : "Engrais organique", small: item.feed.task.everyDays ? `Sur la terre humide · à refaire dans ${item.feed.task.everyDays} jours` : "Sur la terre humide · une fois cette saison" } }
        : {}),
    };
  }
  if (item.kind === "season") return { ...activityDetail(item.activity, ctx), ...banner };
  if (item.kind === "task") {
    const { task, resolved } = item.task;
    if (task.type === "fertilizing") {
      const feeding = feedingFor(resolved.entry.id);
      return {
        ...banner,
        hero: task.everyDays ? { art: "emoji", emoji: "🌿", value: `${task.everyDays} jours`, caption: "entre deux engrais" } : { art: "emoji", emoji: "🌿", value: "1 fois", caption: "cette saison" },
        steps: [
          { icon: "💧", text: "Terre sèche ? Arrose un peu d’abord" },
          { icon: "🧴", text: feeding ? capitalize(feeding.kind) : "Engrais organique" },
          { icon: "🌱", text: "Verse au pied, pas sur les feuilles" },
        ],
      };
    }
    if (task.type === "harvest") {
      const until = harvestUntil(resolved.entry, ctx.now);
      return {
        ...banner,
        ...(until ? { hero: { art: "emoji" as const, emoji: "🧺", value: `Jusqu’en ${until}`, caption: "la récolte bat son plein" } } : {}),
        steps: [...fromText(task.instruction, "✂️"), { icon: "🔁", text: "Récolte souvent : la plante produit davantage" }],
      };
    }
    return { ...banner, steps: fromText(task.instruction, TASK_ICONS[task.type] ?? item.icon) };
  }
  if (item.kind === "alert") return { ...banner, steps: fromText(item.group.body, item.icon) };
  return { ...banner, steps: fromText(item.subtitle, item.icon) };
}

/** La petite ligne au-dessus du titre : le type de geste (« Arrosage et engrais », « Plantation · ce mois-ci »…). */
export function gestureKindLabel(item: TodayItem) {
  if (item.gesture === "watering") return item.feed ? "Arrosage et engrais" : "Arrosage";
  if (item.kind === "season") {
    const { activity } = item;
    const kind = activity.followUp ? "Geste de suite" : activity.topdress ? "Terre du dessus" : ACTIVITY_KIND_LABELS[activity.kind];
    return activity.kind === "sow" || activity.kind === "plant" || activity.kind === "repot" ? `${kind} · ce mois-ci` : kind;
  }
  if (item.kind === "task") return item.task.task.type === "fertilizing" ? "Engrais" : item.task.task.type === "harvest" ? "Récolte" : "Entretien";
  return item.subtitle;
}
