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

/** Sous les avantages de Balco+ : ce qui reste gratuit pour tous (sans limite de plantes, choix du 11/10). */
export function freeForAllText() {
  const { scan, chat } = PLANS.free.aiQuota;
  return `Gratuit pour tous, sans limite de plantes : tes rappels, le calendrier, la sauvegarde, ${scan > 1 ? `${scan} photos` : "1 photo"} et ${chat} questions par mois.`;
}

// --- Écran Balco+ (chantier « Pots et balcon », étape 10) ------------------------------------------------------------

/**
 * Les prix prévus (choix du 11/10) : l'annuel mis en avant, 7 jours d'essai, pause possible. Le paiement n'est pas encore
 * branché : l'écran propose « Me prévenir à l'ouverture » et dit que rien n'est prélevé.
 */
export const PLUS_PRICES = { yearlyEuros: 29, monthlyEuros: 4.99, trialDays: 7 } as const;

/** « 4,99 € », « 29 € », « 2,42 € » : à la française. */
export function euros(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(".", ",")} €`;
}

/** « soit 2,42 € par mois » pour l'annuel. */
export function yearlyPerMonthText() {
  return `soit ${euros(PLUS_PRICES.yearlyEuros / 12)} par mois`;
}

/** « 51 % de moins qu'au mois » : l'économie de l'annuel, arrondie vers le bas. */
export function yearlySavingText() {
  const saving = Math.floor((1 - PLUS_PRICES.yearlyEuros / (PLUS_PRICES.monthlyEuros * 12)) * 100);
  return `${saving} % de moins qu’au mois`;
}

/** L'écran Balco+ : ce que l'offre ajoute, avec un emoji par ligne. */
export function plusScreenBenefits(): { icon: string; title: string; text: string }[] {
  const { scan, chat } = PLANS.plus.aiQuota;
  return [
    { icon: "❄️", title: "Le gel et l’orage, même app fermée", text: "Une notification le soir où il faut rentrer ou couvrir tes plantes." },
    { icon: "💧", title: "Le coach d’arrosage", text: "La quantité juste pour chaque plante, selon la chaleur, le vent et le soleil." },
    { icon: "📷", title: `${scan} photos et ${chat} questions à Nora`, text: "Chaque mois, pour comprendre ce qui arrive à tes plantes." },
    { icon: "📱", title: "Ton balcon sur plusieurs téléphones", text: "Toujours à jour, chez toi comme chez la personne qui arrose." },
  ];
}

/** Ce qui ne change pas : l'essai, la pause et le prix fondateur. */
export function plusPromises(): string[] {
  return [
    `${PLUS_PRICES.trialDays} jours d’essai gratuit`,
    "Pause ou arrêt à tout moment : ton balcon reste",
    `Prix fondateur pour les ${FOUNDER_OFFER.seats} premiers, gardé même après une pause`,
  ];
}

/** Rien n'est prélevé tant que le paiement n'est pas branché. */
export const PLUS_NOT_YET = "Le paiement arrive bientôt : rien n’est prélevé aujourd’hui.";

/** D'où l'on arrive sur l'écran Balco+ (les déclencheurs du 11/10). */
export type PlusTrigger = "photo" | "nora" | "frost" | "coach";

/** La phrase d'accueil selon le déclencheur : ce qui vient d'arriver, puis ce que Balco+ change. */
export function plusTriggerText(trigger: PlusTrigger | undefined): string | null {
  const { scan, chat } = PLANS.plus.aiQuota;
  switch (trigger) {
    case "photo":
      return `${PLANS.free.aiQuota.scan > 1 ? "Tes photos du mois sont analysées" : "Ta photo du mois est analysée"}. Avec Balco+, ${scan} photos chaque mois.`;
    case "nora":
      return `Tes ${PLANS.free.aiQuota.chat} questions du mois sont posées. Avec Balco+, ${chat} questions à Nora chaque mois.`;
    case "frost":
      return "Gel annoncé ce soir. Avec Balco+, l’alerte arrive même si tu n’ouvres pas l’app.";
    case "coach":
      return "Le coach d’arrosage dit combien verser à chaque plante, chaque jour.";
    default:
      return null;
  }
}

export function isPlusTrigger(value: unknown): value is PlusTrigger {
  return value === "photo" || value === "nora" || value === "frost" || value === "coach";
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
