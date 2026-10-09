/**
 * « Donner mon avis » (Réglages → À propos) : un e-mail prérempli. L'adresse est ici seulement : elle changera
 * pour une adresse sur le nom de domaine avant la publication (docs/avant-publication.md § 5).
 */
export const FEEDBACK_EMAIL = "contact_balco@gmail.com";

/**
 * « Version 1.0.0 · test » dans Réglages ; sans « · test » dans l'app publiée. Avec la date de la mise à jour reçue
 * sans réinstaller l'app (expo-updates) : « Version 1.0.0 · test · mise à jour du 10 octobre à 14 h 32 ».
 */
export function versionText(version: string, testBuild: boolean, updatedAt?: Date | null) {
  const update = updatedAt ? ` · mise à jour du ${updateDateText(updatedAt)}` : "";
  return `Version ${version}${testBuild ? " · test" : ""}${update}`;
}

/** « 10 octobre à 14 h 32 » */
export function updateDateText(date: Date) {
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${day} à ${date.getHours()} h ${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Le lien mailto, avec la version et le téléphone en bas du message pour comprendre un souci. */
export function feedbackMailto(version: string, platform: string) {
  const subject = "Mon avis sur Balco";
  const body = `\n\n\n—\nBalco ${version} · ${platform}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
