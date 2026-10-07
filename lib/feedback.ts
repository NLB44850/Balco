/**
 * « Donner mon avis » (Réglages → À propos) : un e-mail prérempli. L'adresse est ici seulement : elle changera
 * pour une adresse sur le nom de domaine avant la publication (docs/avant-publication.md § 5).
 */
export const FEEDBACK_EMAIL = "contact_balco@gmail.com";

/** « Version 1.0.0 · test » dans Réglages ; sans « · test » dans l'app publiée. */
export const versionText = (version: string, testBuild: boolean) => `Version ${version}${testBuild ? " · test" : ""}`;

/** Le lien mailto, avec la version et le téléphone en bas du message pour comprendre un souci. */
export function feedbackMailto(version: string, platform: string) {
  const subject = "Mon avis sur Balco";
  const body = `\n\n\n—\nBalco ${version} · ${platform}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
