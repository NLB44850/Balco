/**
 * Le choix pour l'hiver d'une plante frileuse en fin de saison (chantier « Plante hors saison », étape 3) : tout
 * récolter, la rentrer à l'intérieur ou la laisser dehors. Gardé sur la plante, donc dans la sauvegarde du compte
 * (colonne `winterJson`). Logique pure.
 */
export const WINTER_CHOICES = ["harvest", "indoors", "outside"] as const;
export type WinterChoice = (typeof WINTER_CHOICES)[number];

/** `decidedAt` : le jour du choix ; `indoorsAt` : rentrée à l'intérieur (étape 4). */
export type WinterPlan = { choice: WinterChoice; decidedAt: string; indoorsAt?: string };

export function isWinterPlan(value: unknown): value is WinterPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<WinterPlan>;
  return WINTER_CHOICES.includes(plan.choice as WinterChoice) && typeof plan.decidedAt === "string" && !Number.isNaN(Date.parse(plan.decidedAt)) && (plan.indoorsAt === undefined || (typeof plan.indoorsAt === "string" && !Number.isNaN(Date.parse(plan.indoorsAt))));
}

/** Lu depuis la base : un texte JSON, ou rien. Un contenu illisible est ignoré. */
export function parseWinterPlan(json: string | null | undefined): WinterPlan | undefined {
  if (!json) return undefined;
  try {
    const value: unknown = JSON.parse(json);
    return isWinterPlan(value) ? { choice: value.choice, decidedAt: value.decidedAt, ...(value.indoorsAt ? { indoorsAt: value.indoorsAt } : {}) } : undefined;
  } catch {
    return undefined;
  }
}
