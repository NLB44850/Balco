/**
 * La politique de confidentialité en page web (/confidentialite) : l'adresse à donner au Play Store. Même texte que
 * dans l'app (shared/privacy.ts), page autonome sans JavaScript, lisible sur téléphone.
 */
import { PRIVACY_CONTACT, PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from "../shared/privacy";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// L'adresse de contact devient un lien e-mail (le texte est échappé avant).
const withMailLink = (text: string) => escape(text).replaceAll(PRIVACY_CONTACT, `<a href="mailto:${PRIVACY_CONTACT}">${PRIVACY_CONTACT}</a>`);

export function privacyPageHtml() {
  const sections = PRIVACY_SECTIONS.map((section) => [
    `<h2>${escape(section.title)}</h2>`,
    ...(section.paragraphs ?? []).map((paragraph) => `<p>${withMailLink(paragraph)}</p>`),
    section.bullets ? `<ul>${section.bullets.map((bullet) => `<li>${withMailLink(bullet)}</li>`).join("")}</ul>` : "",
  ].join("")).join("\n");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Balco · Confidentialité</title>
<style>
  body { margin: 0; background: #F5F3EE; color: #1D2A22; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 18px 56px; }
  h1 { font-size: 30px; line-height: 1.15; margin: 0 0 6px; letter-spacing: -0.5px; }
  .updated { color: #5D6B62; margin: 0 0 18px; font-size: 14px; }
  h2 { font-size: 19px; margin: 28px 0 8px; color: #1F7A4D; }
  p, li { margin: 0 0 10px; }
  ul { padding-left: 20px; margin: 0; }
  a { color: #1F7A4D; }
</style>
</head>
<body>
<main>
<h1>Confidentialité</h1>
<p class="updated">Balco · mise à jour le ${escape(PRIVACY_UPDATED)}</p>
<p>${escape(PRIVACY_INTRO)}</p>
${sections}
</main>
</body>
</html>`;
}
