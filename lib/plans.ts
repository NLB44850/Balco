/**
 * L'offre Balco en un seul endroit : ce que chaque forfait (gratuit, Balco+) permet et ses quotas d'IA
 * par mois. L'app et le serveur lisent ce module ; pour changer l'offre, on ne modifie que ce fichier
 * (les quotas restent réglables par les variables AI_*_PER_MONTH du serveur). Logique pure.
 */

export type Plan = "free" | "plus";
export type AiKind = "scan" | "chat";

/** Ce qu'un forfait permet, au-delà du catalogue, du calendrier, des rappels locaux et du journal (toujours gratuits). */
export type Feature =
  /** Rappels calculés par le serveur et envoyés en notification push, même app fermée. */
  | "serverReminders"
  /** Alertes météo urgentes en push (gel, orage) envoyées par le serveur. */
  | "weatherPushAlerts"
  /** Sauvegarde du jardin sur le serveur, pour le retrouver après un changement de téléphone. */
  | "cloudBackup"
  /** Le même jardin sur plusieurs appareils en même temps. */
  | "multiDeviceSync";

export type PlanDefinition = {
  name: string;
  /** Diagnostics photo (scan) et questions à Nora (chat) par mois. */
  aiQuota: Record<AiKind, number>;
  features: Record<Feature, boolean>;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    name: "Gratuit",
    aiQuota: { scan: 1, chat: 5 },
    features: { serverReminders: false, weatherPushAlerts: false, cloudBackup: true, multiDeviceSync: false },
  },
  plus: {
    name: "Balco+",
    aiQuota: { scan: 20, chat: 100 },
    features: { serverReminders: true, weatherPushAlerts: true, cloudBackup: true, multiDeviceSync: true },
  },
};

/**
 * Ce que Balco+ apporte, dit comme un bénéfice pour la personne (et non comme une liste de fonctions).
 * Une seule source pour Réglages → Compte et les messages de quota.
 */
export function plusBenefits(): string[] {
  const { scan, chat } = PLANS.plus.aiQuota;
  return [
    "Prévenu du gel et de l’orage, même application fermée",
    "Ton balcon sur ton téléphone et ta tablette, toujours à jour",
    `${scan} photos analysées et ${chat} questions à Nora chaque mois`,
  ];
}

/** Réglages → feuille « Balco+ » : ce que l'offre ajoute, en quatre lignes. */
export function plusSheetBenefits(): string[] {
  const { scan, chat } = PLANS.plus.aiQuota;
  return [
    "Les alertes gel et orage, même si tu n’ouvres pas l’app",
    "Ton balcon sur plusieurs téléphones",
    `${scan} photos analysées et ${chat} questions à Nora par mois`,
    `Prix fondateur pour les ${FOUNDER_OFFER.seats} premiers`,
  ];
}

/** Sous les avantages de Balco+ : ce qui reste gratuit pour tous. */
export function freeForAllText() {
  const { scan, chat } = PLANS.free.aiQuota;
  return `Gratuit pour tous : tes rappels, le calendrier, la sauvegarde, ${scan > 1 ? `${scan} photos` : "1 photo"} et ${chat} questions par mois.`;
}

/** Ce que le compte gratuit garde, sans contrepartie : rassurant avant de parler de Balco+. */
export function freeBenefits(): string[] {
  const { scan, chat } = PLANS.free.aiQuota;
  return [
    "Ton balcon sauvegardé, retrouvé si tu changes de téléphone",
    "Les rappels du jour et le calendrier de tes plantes",
    `${scan > 1 ? `${scan} photos analysées` : "1 photo analysée"} et ${chat} questions à Nora chaque mois`,
  ];
}

/** « Avec Balco+, 20 photos analysées chaque mois » : la phrase à ajouter quand le quota gratuit est épuisé. */
export function plusQuotaHint(kind: AiKind) {
  const limit = PLANS.plus.aiQuota[kind];
  return kind === "scan" ? `Avec Balco+, ${limit} photos analysées chaque mois.` : `Avec Balco+, ${limit} questions à Nora chaque mois.`;
}

/** Toute valeur inconnue (ancien compte, faute de frappe) est traitée comme le forfait gratuit. */
export function planOf(value: string | null | undefined): Plan {
  return value === "plus" ? "plus" : "free";
}

export function can(plan: Plan | string | null | undefined, feature: Feature) {
  return PLANS[planOf(plan)].features[feature];
}

export function defaultAiQuota(plan: Plan, kind: AiKind) {
  return PLANS[plan].aiQuota[kind];
}

/**
 * Prix fondateur : les premiers abonnés à Balco+ gardent un prix réduit. Le prix lui-même se règle dans
 * les stores (produit à part) ; Balco retient seulement qui y a droit (`users.founderSince`), et ce droit
 * reste acquis même si l'abonnement s'arrête puis reprend. Le paiement n'est pas encore branché : les
 * achats intégrés appelleront `grantFounderPrice` (server/founder.ts) au premier abonnement.
 */
export const FOUNDER_OFFER = {
  /** Nombre de places au prix fondateur (BALCO_FOUNDER_SEATS sur le serveur pour le changer). */
  seats: 500,
  /** Identifiant du produit dans les stores et RevenueCat. */
  productId: "balco_plus_fondateur",
} as const;

/** Places encore libres, jamais négatif (si on baisse le nombre de places après coup). */
export function founderSeatsLeft(taken: number, seats: number = FOUNDER_OFFER.seats) {
  return Math.max(0, seats - taken);
}
