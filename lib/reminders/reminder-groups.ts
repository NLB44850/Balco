/**
 * Regroupement des conseils : une même cause météo (pluie, gel, orage, vent, chaleur) donne UNE alerte
 * pour toutes les plantes concernées, au lieu d'une par plante. Utilisé par l'app et par le serveur.
 * Logique pure.
 */
import type { ReminderDecision, ReminderPriority } from "./reminder-engine";

/** Une alerte telle qu'on la montre : les champs d'une décision, plus toutes les décisions regroupées. */
export type ReminderGroup = ReminderDecision & { key: string; decisions: ReminderDecision[] };

const PRIORITY_RANK: Record<ReminderPriority, number> = { urgent: 0, important: 1, normal: 2 };
const MAX_BODY_LENGTH = 120;
/** Au-delà, la liste des plantes est abrégée : « le basilic, la menthe et 3 autres plantes ». */
const MAX_LISTED_PLANTS = 3;

function groupKey(decision: ReminderDecision) {
  // La soif dépend du dernier arrosage de chaque plante : elle reste propre à chaque plante.
  if (!decision.cause || decision.cause === "thirst") return `plant:${decision.plantId}:${decision.taskType}`;
  return `weather:${decision.cause}:${decision.action}`;
}

/** « le basilic », « le basilic et la menthe », « le basilic, la menthe et les fraisiers », « …et 2 autres plantes ». */
export function listPlants(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length > MAX_LISTED_PLANTS) {
    const others = labels.length - (MAX_LISTED_PLANTS - 1);
    return `${labels.slice(0, MAX_LISTED_PLANTS - 1).join(", ")} et ${others} autres plantes`;
  }
  return `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
}

function clamp(body: string) {
  return body.length <= MAX_BODY_LENGTH ? body : `${body.slice(0, MAX_BODY_LENGTH - 1).trimEnd()}…`;
}

/** Pourquoi : la raison d'une seule plante cite son propre seuil, on la reformule pour le groupe. */
function groupedReason(first: ReminderDecision) {
  const value = first.value;
  if (value === undefined) return first.reason;
  switch (first.cause) {
    case "rain":
      return `${value} mm de pluie prévus d’ici 12 h, assez pour chacune de ces plantes.`;
    case "frost":
      return `Minimum prévu ${value} °C, sous ce que ces plantes supportent.`;
    case "wind":
      return `Rafales prévues ${value} km/h, au-delà de ce que ces plantes supportent.`;
    case "heat":
      return `Maximum prévu ${value} °C, au-dessus du seuil de chaleur de ces plantes.`;
    default:
      return first.reason;
  }
}

/** Titre et texte d'une alerte qui concerne plusieurs plantes. */
function groupedText(decisions: ReminderDecision[], priority: ReminderPriority): Pick<ReminderDecision, "title" | "body"> {
  const first = decisions[0];
  const count = decisions.length;
  const names = listPlants(decisions.map((decision) => decision.plantLabel ?? decision.plantId));
  const value = first.value;
  switch (first.cause) {
    case "rain":
      return {
        title: "N’arrose pas tes plantes aujourd’hui",
        body: `${value ?? "De la"}${value === undefined ? " pluie est prévue" : " mm de pluie sont prévus"} dans les 12 prochaines heures pour ${names}.`,
      };
    case "frost":
      // Annuelles frileuses en automne : le gel finit leur saison, on récolte tout avant la nuit.
      if (first.action === "do") {
        return {
          title: `${priority === "urgent" ? "Gel cette nuit" : "Nuit fraîche"} : récolte tout avant ce soir`,
          body: `${value === undefined ? "Froid prévu cette nuit" : `Jusqu’à ${value} °C cette nuit`} : leur saison se termine. Cueille tout ce qui peut l’être sur ${names}.`,
        };
      }
      return {
        title: `${priority === "urgent" ? "Gel cette nuit" : "Nuit fraîche"} : protège ${count} plantes`,
        body: `${value === undefined ? "Froid prévu cette nuit" : `Jusqu’à ${value} °C cette nuit`}. Rapproche du mur ou couvre d’un voile ${names}.`,
      };
    case "storm":
      return { title: "Orage : mets tes plantes à l’abri", body: `Depuis l’intérieur, sans sortir sur le balcon, rentre ${names}.` };
    case "wind":
      return priority === "urgent"
        ? { title: `Vent fort : mets ${count} plantes à l’abri`, body: `Rafales jusqu’à ${value ?? "?"} km/h. Rentre ou cale contre le mur ${names}.` }
        : { title: `Coup de vent : vérifie ${count} plantes`, body: `Rafales jusqu’à ${value ?? "?"} km/h. Vérifie que pots et tuteurs tiennent bien : ${names}.` };
    case "heat":
      return { title: `${value ?? "Forte chaleur"}${value === undefined ? "" : " °C"} aujourd’hui : pense à tes plantes`, body: `Touche la terre ce soir ou demain tôt, et arrose au pied si elle est sèche : ${names}.` };
    default:
      return { title: first.title, body: first.body };
  }
}

/** Regroupe les conseils par cause météo, du plus urgent au moins urgent. L'ordre des plantes est conservé. */
export function groupReminders(decisions: ReminderDecision[]): ReminderGroup[] {
  const buckets = new Map<string, ReminderDecision[]>();
  for (const decision of decisions) {
    const key = groupKey(decision);
    buckets.set(key, [...(buckets.get(key) ?? []), decision]);
  }
  const groups = [...buckets.entries()].map(([key, members]): ReminderGroup => {
    const priority = members.reduce<ReminderPriority>((best, decision) => (PRIORITY_RANK[decision.priority] < PRIORITY_RANK[best] ? decision.priority : best), "normal");
    const first = members.find((decision) => decision.priority === priority) ?? members[0];
    const validUntil = members.map((decision) => decision.validUntil).sort()[0];
    const text = members.length > 1 ? { ...groupedText(members, priority), reason: groupedReason(first) } : { title: first.title, body: first.body, reason: first.reason };
    return { ...first, ...text, body: clamp(text.body), priority, validUntil, key, decisions: members };
  });
  return groups.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** Toutes les alertes importantes ou urgentes, puis au plus `maxNormal` conseils ordinaires (spec §6). */
export function selectGroups(groups: ReminderGroup[], maxNormal: number) {
  return [...groups.filter((group) => group.priority !== "normal"), ...groups.filter((group) => group.priority === "normal").slice(0, Math.max(0, maxNormal))];
}
