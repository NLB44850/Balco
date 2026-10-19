/**
 * La politique de confidentialité de Balco (19/10), en un seul endroit : affichée dans l'app (app/privacy.tsx) et en
 * page web sur le serveur (/confidentialite, l'adresse demandée par le Play Store, server/privacy-page.ts).
 * Elle décrit ce que fait vraiment le code : à mettre à jour avec lui (nouvelle donnée, nouveau prestataire).
 */
import { FEEDBACK_EMAIL } from "../lib/feedback";

export const PRIVACY_UPDATED = "19 octobre 2026";
export const PRIVACY_CONTACT = FEEDBACK_EMAIL;
export const PRIVACY_PATH = "/confidentialite";

export type PrivacySection = { title: string; paragraphs?: string[]; bullets?: string[] };

export const PRIVACY_INTRO =
  "Balco t’aide à soigner les plantes de ton balcon. Cette page dit, simplement, quelles données l’app utilise, pourquoi, où elles vont et comment les effacer.";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: "En bref",
    bullets: [
      "Pas de publicité, pas de revente de données, pas de traceur publicitaire.",
      "Sans compte, ton balcon reste sur ton téléphone.",
      "Tes photos de plantes restent sur ton téléphone. Une photo que tu fais analyser est envoyée pour la réponse, puis n’est pas gardée par Balco.",
      "Tu peux supprimer ton compte et toute ta sauvegarde depuis l’app, à tout moment.",
    ],
  },
  {
    title: "Qui est responsable de tes données",
    paragraphs: [
      `Balco est édité par un particulier. Pour toute question sur tes données, écris à ${PRIVACY_CONTACT}.`,
    ],
  },
  {
    title: "Ce que Balco utilise, et pourquoi",
    bullets: [
      "Sans compte : tes plantes, tes gestes, tes réglages et tes photos sont gardés sur ton téléphone seulement.",
      "Ta ville, ou ta position approximative si tu l’autorises : pour la météo de ton balcon et les conseils de saison. Elle passe par le serveur de Balco, arrondie à environ un kilomètre, pour demander la météo.",
      "Avec un compte (facultatif) : ton adresse e-mail, ou l’identifiant et le nom que Google ou Apple nous transmettent si tu te connectes avec eux, pour te connecter. Ta sauvegarde : plantes, gestes notés, prénom, réglages des rappels, ville et position approximative, dates de vacances, réponses aux questions d’accueil et badges, pour les retrouver sur un autre téléphone.",
      "Nora et Observer : ta question, ou la photo que tu fais analyser, et le nom de tes plantes sont envoyés au service d’intelligence artificielle d’Anthropic pour obtenir la réponse. La conversation reste sur ton téléphone. Balco garde ce que Nora a retenu de toi (visible et effaçable dans Nora) et un simple décompte des demandes (date, type, taille), pas leur contenu.",
      "Sans compte, pour l’analyse de photo offerte : une empreinte de ton téléphone, qui ne permet pas de remonter jusqu’à toi, gardée un an.",
      "Notifications : les rappels sont programmés sur ton téléphone. Avec Balco+, l’identifiant de notification de ton téléphone est gardé pour t’envoyer les rappels depuis le serveur.",
      "« Me prévenir à l’ouverture » de Balco+ : ton adresse e-mail, jusqu’à l’envoi de l’annonce.",
      "Sécurité : ton adresse IP est transformée en empreinte non réversible, gardée 24 heures, pour limiter les abus (trop de codes de connexion, par exemple).",
    ],
  },
  {
    title: "Les autorisations du téléphone",
    bullets: [
      "Position approximative : facultative. Sans elle, tu choisis ta ville. La position précise n’est jamais demandée.",
      "Appareil photo et photos : seulement quand tu prends ou choisis une photo de plante.",
      "Notifications : pour tes rappels et les alertes météo.",
    ],
  },
  {
    title: "Les services qui aident Balco",
    paragraphs: ["Ils ne reçoivent que ce qu’il faut pour leur rôle :"],
    bullets: [
      "Railway : héberge le serveur et la base de données de Balco.",
      "Anthropic : répond aux questions posées à Nora et analyse les photos. Anthropic n’utilise pas ces échanges pour entraîner ses modèles.",
      "Open-Meteo : donne la météo, à partir de coordonnées arrondies, sans rien savoir de toi.",
      "Brevo : envoie les codes de connexion par e-mail.",
      "Expo : distribue les mises à jour de l’app et transmet les notifications envoyées par le serveur (Balco+).",
      "Google et Apple : seulement si tu choisis de te connecter avec eux.",
    ],
  },
  {
    title: "Hors de l’Union européenne",
    paragraphs: [
      "Certains de ces services sont situés aux États-Unis. Ces transferts s’appuient sur les garanties prévues par le RGPD, comme les clauses contractuelles types de la Commission européenne.",
    ],
  },
  {
    title: "Combien de temps",
    bullets: [
      "Ton compte et ta sauvegarde : tant que ton compte existe.",
      "Codes de connexion : 24 heures au plus.",
      "Décompte des demandes à Nora et Observer : 13 mois.",
      "Rappels préparés par le serveur : effacés 30 jours après leur date.",
    ],
  },
  {
    title: "Supprimer tes données",
    paragraphs: [
      "Dans l’app : Réglages, puis « Supprimer mon compte ». Ton compte, ta sauvegarde et ce que Nora a retenu sont effacés aussitôt. Ton balcon reste sur ton téléphone ; désinstaller l’app l’efface aussi.",
      `Tu peux aussi le demander par e-mail à ${PRIVACY_CONTACT}.`,
    ],
  },
  {
    title: "Tes droits",
    paragraphs: [
      `Tu peux demander à voir tes données, les corriger, les effacer, les recevoir dans un fichier, ou t’opposer à leur utilisation, en écrivant à ${PRIVACY_CONTACT}. Réponse sous un mois au plus. Si tu n’es pas satisfait, tu peux saisir la CNIL (cnil.fr).`,
    ],
  },
  {
    title: "Enfants",
    paragraphs: ["Balco s’adresse aux personnes de 15 ans et plus. En dessous, avec l’accord d’un parent."],
  },
  {
    title: "Changements",
    paragraphs: ["La date de mise à jour est en haut de cette page. Un changement important sera annoncé dans l’app."],
  },
];
