/**
 * L'accueil à l'ouverture de l'app (components/opening-screen.tsx), maquette validée le 18/10 : la météo du
 * moment en pastille, « Bonjour / Nicolas », la date, tes plantes avec ce dont chacune a besoin, puis une carte
 * « ce qui t'attend » et une raison d'y aller (série de jours, gel à parer…). Logique pure.
 */
import type { WeatherSnapshot } from "../reminders/reminder-engine";
import type { GestureKind, PlantDay } from "./day-plan";
import { skyMood, skyWeather } from "./sky";
import type { TodayAlert, TodayItem } from "./today";

/** « Bonjour » de 5 h à 18 h, « Bonsoir » ensuite ; le prénom à part, sur sa ligne. */
export function openingGreeting(firstName: string | null | undefined, now: Date) {
  const hour = now.getHours();
  return { hello: hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir", name: firstName?.trim() || undefined };
}

/** « Samedi 18 octobre ». */
export function openingDate(now: Date) {
  const label = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** La pastille météo : « ☀️ 14° · Grand soleil », « ❄️ -2° cette nuit ». */
export function openingWeather(snapshot: WeatherSnapshot, now: Date) {
  const weather = skyWeather(snapshot);
  const night = skyMood(now) === "night";
  const t = `${Math.round(snapshot.current.temperatureC)}°`;
  switch (weather) {
    case "frost":
      return `❄️ ${Math.round(snapshot.today.temperatureMinC)}° cette nuit`;
    case "snow":
      return `🌨️ ${t} · Neige`;
    case "storm":
      return `⛈️ ${t} · Orage`;
    case "rain":
      return `🌧️ ${t} · Pluie`;
    case "heat":
      return `🔥 ${t} · Chaleur`;
    case "cloudy":
      return `☁️ ${t} · Nuageux`;
    case "partly":
      return night ? `☁️ ${t} · Quelques nuages` : `⛅ ${t} · Éclaircies`;
    default:
      return night ? `🌙 ${t} · Nuit claire` : `☀️ ${t} · Grand soleil`;
  }
}

/** Le petit signe sur la photo de chaque plante. */
export type PlantMark = "water" | "harvest" | "feed" | "care" | "season" | "frost" | "alert" | "ok";
export const MARK_EMOJI: Record<PlantMark, string> = { water: "💧", harvest: "🧺", feed: "🌱", care: "✂️", season: "🍂", frost: "❄️", alert: "⚠️", ok: "✓" };
const MARK_OF: Record<GestureKind, PlantMark> = { alert: "alert", watering: "water", harvest: "harvest", fertilizing: "feed", care: "care", season: "season" };

export const MAX_OPENING_PLANTS = 5;

/** Les plantes de l'accueil : celles qui ont besoin de toi d'abord, puis les autres (5 au plus). */
export function openingPlants(plan: PlantDay[], banners: TodayAlert[]) {
  const frost = new Set(banners.filter((banner) => banner.group.cause === "frost").flatMap((banner) => banner.group.decisions.map((decision) => decision.plantId)));
  const marked = plan.map((day) => {
    const id = day.resolved.plant.id;
    const next = day.gestures.find((gesture) => !gesture.done);
    const mark: PlantMark = frost.has(id) ? "frost" : next ? MARK_OF[next.kind] : "ok";
    return { id, resolved: day.resolved, mark };
  });
  const needing = marked.filter((plant) => plant.mark !== "ok");
  return { shown: [...needing, ...marked.filter((plant) => plant.mark === "ok")].slice(0, MAX_OPENING_PLANTS), total: marked.length, needing: needing.length, frost: frost.size };
}

/** « 5 plantes · 2 ont besoin de toi », « 3 plantes · tout va bien », « 2 plantes craignent le froid ». */
export function openingPlantsLabel({ total, needing, frost }: { total: number; needing: number; frost: number }) {
  if (frost > 0) return frost === 1 ? "1 plante craint le froid" : `${frost} plantes craignent le froid`;
  const plants = total === 1 ? "1 plante" : `${total} plantes`;
  if (needing === 0) return `${plants} · tout va bien`;
  return `${plants} · ${needing === 1 ? "1 a besoin de toi" : `${needing} ont besoin de toi`}`;
}

export type OpeningCard = {
  tone: "alert" | "todo" | "done" | "rest" | "away" | "empty";
  title: string;
  sub: string;
  tasks: { title: string; done: boolean }[];
  /** La raison d'y aller, sous la liste (« 🔥 6 jours de suite : continue ! »). */
  cheer?: string;
  action: string;
};

type CardInput = {
  plantCount: number;
  banners: TodayAlert[];
  /** La liste du jour d'Aujourd'hui, sans les bandeaux météo. */
  rest: TodayItem[];
  /** Les minutes des gestes qui restent (`minutes` du plan du jour). */
  minutes: number;
  /** Les gestes qui restent, comptés comme le bandeau « Ton balcon » d'Aujourd'hui (`balconyStatus`). */
  remaining: number;
  doneToday: number;
  streak: number;
  away?: boolean;
  now: Date;
};

const MAX_TASKS = 3;
const MAX_SHOWN_MINUTES = 15;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const gestures = (count: number) => (count === 1 ? "1 geste" : `${count} gestes`);

export function openingCard({ plantCount, banners, rest, minutes, remaining, doneToday, streak, away, now }: CardInput): OpeningCard {
  if (plantCount === 0) return { tone: "empty", title: "Ton balcon t’attend", sub: "Ajoute ta première plante : Balco s’occupe du reste.", tasks: [], action: "C’est parti" };
  if (away) return { tone: "away", title: "Bonnes vacances", sub: "Balco veille sur ton balcon pendant ton absence.", tasks: [], action: "Voir mon balcon" };
  const todo = rest.filter((item) => !item.done && !item.quiet);
  const tasks = todo.slice(0, MAX_TASKS).map((item) => ({ title: item.title, done: false }));
  const streakCheer = streak >= 2 ? `🔥 ${streak} jours de suite : continue !` : undefined;
  const urgent = banners.find((banner) => banner.group.action !== "skip");
  if (urgent) {
    const [head, ...tail] = urgent.title.split(" : ");
    // Une ligne par plante à protéger (« Protège le basilic »), plutôt que les gestes ordinaires du jour.
    const perPlant = urgent.group.decisions.map((decision) => decision.title.split(" : ").slice(1).join(" : ")).filter(Boolean);
    const alertTasks = perPlant.length > 0 ? perPlant.slice(0, MAX_TASKS).map((title) => ({ title: capitalize(title), done: false })) : tasks;
    return { tone: "alert", title: head, sub: tail.length > 0 ? `${capitalize(tail.join(" : "))} avant ce soir.` : "À faire avant ce soir.", tasks: alertTasks, cheer: "⏱️ Quelques minutes suffisent, Balco t’explique comment.", action: "Je m’en occupe" };
  }
  const rain = banners.some((banner) => banner.group.cause === "rain") ? "🌧️ La pluie arrose pour toi aujourd’hui." : undefined;
  if (todo.length > 0) {
    // La durée seulement quand elle donne envie (« environ 5 minutes ») : au-delà d'un quart d'heure, le nombre suffit.
    const rounded = Math.max(1, Math.round(minutes));
    const time = minutes > 0 && rounded <= MAX_SHOWN_MINUTES ? ` · environ ${rounded} minute${rounded > 1 ? "s" : ""}` : "";
    return { tone: "todo", title: "Aujourd’hui sur ton balcon", sub: `${gestures(Math.max(remaining, todo.length > 0 ? 1 : 0))}${time}`, tasks, cheer: rain ?? streakCheer, action: "C’est parti" };
  }
  const evening = now.getHours() >= 17;
  if (doneToday > 0) {
    const done = rest.filter((item) => item.done).slice(0, MAX_TASKS).map((item) => ({ title: item.title, done: true }));
    return { tone: "done", title: evening ? "Ton balcon est prêt pour la nuit" : "Ton balcon est à jour", sub: `${gestures(doneToday)} ${doneToday === 1 ? "fait" : "faits"} aujourd’hui, bravo.`, tasks: done, cheer: streakCheer ?? "🌱 Tes plantes te disent merci.", action: "Voir mon balcon" };
  }
  return { tone: "rest", title: "Rien à faire aujourd’hui", sub: "Profite de ton balcon.", tasks: [], cheer: rain ?? streakCheer, action: "Voir mon balcon" };
}
