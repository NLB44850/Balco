/**
 * Semis au chaud et sources du calendrier de culture.
 *
 * `indoor` : les mois où le semis se fait seulement à l'intérieur, au chaud (18–22 °C) près d'une fenêtre
 * lumineuse, jamais directement sur le balcon (pas de serre, un pot gèle plus vite que la pleine terre).
 * Les autres mois de `sowMonths` se sèment dehors, en pot.
 *
 * `sources` : les pages consultées pour vérifier les mois de semis, de plantation et de récolte de
 * chaque plante (calendriers de semenciers et de sites de jardinage reconnus), repère Paris, culture en pot.
 * Vérification du 02/10/2026 ; une plante absente d'ici n'a pas encore été vérifiée.
 */
import type { Month } from "./catalog";

export type SowingInfo = { indoor?: Month[]; sources?: string[] };

export const SOWING: Record<string, SowingInfo> = {};
