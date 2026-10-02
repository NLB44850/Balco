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
