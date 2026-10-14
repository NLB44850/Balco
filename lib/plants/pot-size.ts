/**
 * La taille du pot de chaque plante (chantier « Pots et balcon », étape 1) : 5 choix simples, mesurés au bord du pot.
 * « Je ne sais pas » est la valeur par défaut, y compris pour les plantes ajoutées avant ce réglage.
 * Logique pure, sans React Native : partagée par l'app, le serveur (sauvegarde) et les tests.
 */

export const POT_SIZE_IDS = ["small", "medium", "large", "planter", "unknown"] as const;
export type PotSize = (typeof POT_SIZE_IDS)[number];
export type KnownPotSize = Exclude<PotSize, "unknown">;

/**
 * Volume indicatif de terreau par taille, en litres, pour l'arrosage selon le pot (étape 6) et le calculateur de poids
 * (étape 9). Ordres de grandeur d'un pot rond (ou d'une jardinière courante), pas des mesures exactes.
 */
export const POT_LITERS: Record<KnownPotSize, number> = {
  /** Petit, moins de 20 cm au bord : pot de 15 à 18 cm, environ 2 à 5 L. */
  small: 4,
  /** Moyen, 20 à 30 cm : pot de 25 cm, environ 8 à 12 L. */
  medium: 10,
  /** Grand, 30 à 40 cm : pot de 35 cm, environ 18 à 28 L. */
  large: 22,
  /** Jardinière ou bac : jardinière de 60 à 80 cm, environ 15 à 25 L. */
  planter: 20,
};

export const POT_SIZE_CHOICES: readonly { id: PotSize; title: string; detail?: string }[] = [
  { id: "small", title: "Petit", detail: "moins de 20 cm" },
  { id: "medium", title: "Moyen", detail: "20 à 30 cm" },
  { id: "large", title: "Grand", detail: "30 à 40 cm" },
  { id: "planter", title: "Jardinière ou bac" },
  { id: "unknown", title: "Je ne sais pas" },
];

export function isPotSize(value: unknown): value is PotSize {
  return typeof value === "string" && (POT_SIZE_IDS as readonly string[]).includes(value);
}

/** La taille notée pour une plante ; absente ou inconnue : « Je ne sais pas ». */
export function potSizeOf(plant: { potSize?: string | null }): PotSize {
  return isPotSize(plant.potSize) ? plant.potSize : "unknown";
}

/** « Moyen (20 à 30 cm) », « Jardinière ou bac », « Je ne sais pas ». */
export function potSizeLabel(size: PotSize) {
  const choice = POT_SIZE_CHOICES.find((item) => item.id === size) ?? POT_SIZE_CHOICES[POT_SIZE_CHOICES.length - 1];
  return choice.detail ? `${choice.title} (${choice.detail})` : choice.title;
}

/** Le volume indicatif du pot, ou null quand la taille n'est pas connue. */
export function potLitersOf(size: PotSize): number | null {
  return size === "unknown" ? null : POT_LITERS[size];
}
