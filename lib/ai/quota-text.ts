export type QuotaInfo = { kind: "scan" | "chat"; used: number; limit: number; remaining: number; resetsAt: string };

const WORDS = { scan: ["analyse", "analyses"], chat: ["question", "questions"] } as const;

/** « 2 analyses restantes ce mois-ci » / « Plus d'analyse ce mois-ci · retour le 1er octobre ». */
export function quotaLabel(quota: QuotaInfo | undefined) {
  if (!quota) return "";
  const [one, many] = WORDS[quota.kind];
  if (quota.remaining <= 0) {
    const reset = new Date(quota.resetsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
    const of = /^[aeiouéh]/i.test(one) ? "d’" : "de ";
    return `Plus ${of}${one} ce mois-ci · retour le ${reset.replace(/^1 /, "1er ")}`;
  }
  const word = quota.remaining > 1 ? many : one;
  return `${quota.remaining} ${word} restante${quota.remaining > 1 ? "s" : ""} ce mois-ci`;
}
