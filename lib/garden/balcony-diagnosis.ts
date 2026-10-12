/**
 * « Diagnostic de ton balcon » (chantier « Pots et balcon », étape 3b) : ce que ses réponses disent de son balcon,
 * calculé par nos règles (aucun appel à l'IA). Soleil (simulateur de l'étape 3a), chaleur, pluie sous un balcon
 * couvert, vis-à-vis, place, climat de la ville, plantes déjà là qui manquent de soleil, plantes qui y pousseront bien.
 * Logique pure, sans React Native. Phrases au tutoiement, verbe en tête quand c'est un conseil.
 */
import { recommendPlants, type CatalogPlant, type OnboardingAnswers, type Sunlight } from "../plants/catalog";
import { frostNote, type ClimateInfo } from "../plants/climate";
import { capitalize, verb } from "../plants/grammar";
import { seasonSunHours, SUN_CLASS_LABELS, type Orientation, type SunClass } from "./sun";

export type DiagnosisItem = {
  key: string;
  icon: string;
  title: string;
  text: string;
  /** good : un atout ; watch : à surveiller (orange) ; info : un repère. */
  tone: "good" | "watch" | "info";
};

export type BalconyDiagnosis = {
  /** « Plein sud, couvert » ; null si l'orientation n'est pas connue. */
  headline: string;
  /** Heures de soleil par jour d'avril à septembre (simulateur), null sans orientation. */
  sunHours: number | null;
  sunClass: SunClass;
  items: DiagnosisItem[];
  /** Trois plantes qui y pousseront bien, de saison d'abord. */
  bestPlants: CatalogPlant[];
};

/** « préfère le plein soleil ou la mi-ombre ». */
const LIGHT_WORDS: Record<Sunlight, string> = { sunny: "le plein soleil", partial: "la mi-ombre", shade: "l’ombre" };

const ORIENTATION_TEXT: Record<Orientation, string> = { S: "Plein sud", E: "À l’est", W: "À l’ouest", N: "Au nord" };

type Input = {
  answers: OnboardingAnswers | null;
  latitude: number;
  climate?: ClimateInfo | null;
  /** Les plantes déjà sur le balcon (installées). */
  plants?: CatalogPlant[];
  now: Date;
};

/** « 7 h 30 », « 5 h ». */
export function hoursText(hours: number) {
  return Number.isInteger(hours) ? `${hours} h` : `${Math.floor(hours)} h 30`;
}

export function diagnoseBalcony({ answers, latitude, climate, plants = [], now }: Input): BalconyDiagnosis {
  const orientation = answers?.sunlightUnknown ? undefined : answers?.orientation;
  const sunHours = orientation ? seasonSunHours({ orientation, latitude, covered: answers?.covered, facing: answers?.facing }) : null;
  const sun: SunClass = (answers?.sunlight as SunClass | undefined) ?? "partial";
  const month = now.getMonth() + 1;
  const items: DiagnosisItem[] = [];

  // 1. Le soleil, et ce qu'il permet.
  const sunUses: Record<SunClass, string> = {
    sunny: "Idéal pour les tomates, les piments et les aromatiques du Midi.",
    partial: "Parfait pour les salades, les fraisiers, la menthe et le persil.",
    shade: "Mise sur la menthe, la ciboulette, l’oseille et les salades.",
  };
  items.push({
    key: "sun",
    icon: sun === "sunny" ? "☀️" : sun === "partial" ? "⛅" : "☁️",
    title: sunHours !== null ? `${capitalize(SUN_CLASS_LABELS[sun])} : ${hoursText(sunHours)} de soleil par jour` : answers?.sunlightUnknown ? "Mi-ombre, par prudence" : capitalize(SUN_CLASS_LABELS[sun]),
    text: answers?.sunlightUnknown ? "Choisis ton orientation dans Réglages : tes conseils seront plus justes." : sunUses[sun],
    tone: sun === "shade" ? "watch" : "good",
  });

  // 2. La chaleur des balcons au sud ou à l'ouest, sans toit.
  if (sun === "sunny" && (orientation === "S" || orientation === "W") && !answers?.covered) {
    items.push({ key: "heat", icon: "🌡️", title: "Chaud l’été", text: "Arrose le soir, paille tes pots et évite les pots noirs.", tone: "watch" });
  }
  // 3. Un balcon couvert : la pluie n'arrive pas jusqu'aux pots.
  if (answers?.covered) {
    items.push({ key: "rain", icon: "☂️", title: "La pluie passe à côté", text: "Vérifie la terre même quand il pleut : le toit l’arrête.", tone: "watch" });
  }
  // 4. Un vis-à-vis : le soleil bas (matin, soir, hiver) est caché.
  if (answers?.facing) {
    items.push({ key: "facing", icon: "🏢", title: "Le soleil bas est caché", text: "L’hiver, ton balcon reste presque à l’ombre.", tone: "info" });
  }
  // 5. Peu de soleil : les légumes-fruits donneront peu.
  if (sun === "shade") {
    items.push({ key: "shade", icon: "🍅", title: "Peu pour les légumes-fruits", text: "Tomates et piments y donneront peu : garde-les pour plus tard.", tone: "watch" });
  }
  // 6. La place.
  const spaceTexts: Record<string, Omit<DiagnosisItem, "key" | "tone">> = {
    windowsill: { icon: "🪟", title: "Un rebord de fenêtre", text: "Choisis des pots compacts : aromatiques, radis, fraisiers." },
    planter: { icon: "🪴", title: "Une ou deux jardinières", text: "Mise sur les salades, les radis et les aromatiques." },
    balcony: { icon: "🏡", title: "Un petit balcon", text: "Assez de place pour quelques grands pots de légumes." },
    terrace: { icon: "🌳", title: "Une terrasse", text: "De quoi installer de grands bacs, même des petits fruits." },
  };
  const space = answers?.space ? spaceTexts[answers.space] : undefined;
  if (space) items.push({ key: "space", ...space, tone: "info" });
  // 7. Le climat de la ville : le repère de gel du moment.
  if (climate) items.push({ key: "climate", icon: "❄️", title: capitalize(climate.label), text: `${capitalize(frostNote(climate, month))}.`, tone: "info" });
  // 8. Les plantes déjà là qui voudraient plus de soleil (deux au plus).
  for (const entry of plants.filter((plant) => !plant.sunlight.includes(sun as Sunlight)).slice(0, 2)) {
    const wanted = entry.sunlight.map((value) => LIGHT_WORDS[value]).join(" ou ");
    items.push({ key: `plant-${entry.id}`, icon: entry.emoji, title: `${entry.name} : place au plus lumineux`, text: `${capitalize(entry.label)} ${verb(entry, "préfère", "préfèrent")} ${wanted}.`, tone: "watch" });
  }

  const owned = new Set(plants.map((entry) => entry.id));
  const bestPlants = recommendPlants(answers, { month, exclude: [...owned] }).slice(0, 3);
  const parts = [orientation ? ORIENTATION_TEXT[orientation] : capitalize(SUN_CLASS_LABELS[sun]), answers?.covered ? "couvert" : null, answers?.facing ? "avec vis-à-vis" : null].filter(Boolean);
  return { headline: parts.join(", "), sunHours, sunClass: sun, items, bestPlants };
}
