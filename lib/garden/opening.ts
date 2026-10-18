/**
 * Le message d'accueil à l'ouverture de l'app (components/opening-screen.tsx) : « Bonsoir, Léa »,
 * la date, puis ce qui l'attend aujourd'hui (une alerte météo d'abord, sinon le nombre de gestes).
 */
import type { BalconyStatus } from "./today";

/** « Bonjour » de 5 h à 18 h, « Bonsoir » ensuite. */
export function openingGreeting(firstName: string | null | undefined, now: Date) {
  const hour = now.getHours();
  const hello = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const name = firstName?.trim();
  return name ? `${hello}, ${name}` : hello;
}

/** « Samedi 18 octobre ». */
export function openingDate(now: Date) {
  const label = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type LineInput = {
  plantCount: number;
  /** Le titre de la première alerte météo du jour, s'il y en a une (« Gel cette nuit : protège le basilic »). */
  alert?: string;
  status: Pick<BalconyStatus, "remaining" | "doneToday">;
  /** En vacances : Aujourd'hui ne montre plus les gestes. */
  away?: boolean;
  now: Date;
};

export function openingLine({ plantCount, alert, status, away, now }: LineInput) {
  if (plantCount === 0) return "Ton balcon t’attend : ajoute ta première plante.";
  if (away) return "Bonnes vacances : Balco veille sur ton balcon.";
  if (alert) return alert;
  const evening = now.getHours() >= 15;
  if (status.remaining > 0) {
    const when = evening ? "avant ce soir" : "aujourd’hui";
    return status.remaining === 1 ? `Un geste t’attend ${when}.` : `${status.remaining} gestes t’attendent ${when}.`;
  }
  if (status.doneToday > 0) return now.getHours() >= 17 ? "Ton balcon est prêt pour la nuit." : "Ton balcon est à jour pour aujourd’hui.";
  return "Rien à faire aujourd’hui : profite de ton balcon.";
}
