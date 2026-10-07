/**
 * Les gestes de suite d'une plante semée ou plantée dans l'app (premier geste `<id>:start`), datés depuis ce
 * jour-là, comme l'engrais : éclaircir après la levée, sortir sur le balcon les plants semés au chaud,
 * pincer quand c'est utile. Chacun ne se fait qu'une fois (`<id>:thin`, `<id>:outdoors`, `<id>:pinch`). Logique pure.
 */
import type { CalendarActivity } from "../plants/calendar";
import { adaptToClimate, type ClimateInfo } from "../plants/climate";
import { agree, capitalize, subjectPronoun, verb } from "../plants/grammar";
import { ofName } from "../plants/guide";
import { PLANTING } from "../plants/planting";
import type { MaintenanceEvent } from "../reminders/reminder-engine";
import { startEventId, type ResolvedPlant } from "./garden-logic";

export type FollowUp = "thin" | "outdoors" | "pinch";

const DAY_MS = 86_400_000;
/** Un geste de suite oublié s'efface après trois semaines : il n'a plus de sens. */
const WINDOW_DAYS = 21;
/** Éclaircir une semaine après la levée la plus lente ; pincer quand la plante a pris (semis : 4 semaines de plus). */
const THIN_AFTER_GERMINATION_DAYS = 7;
const PINCH_AFTER_PLANTING_DAYS = 14;
const PINCH_AFTER_GERMINATION_DAYS = 28;
/** Un semis au chaud ne sort pas avant d'avoir quelques vraies feuilles. */
const OUTDOORS_MIN_DAYS = 28;

export const followUpEventId = (plantId: string, kind: FollowUp) => `${plantId}:${kind}`;

const startedIndoors = (note: string | undefined) => Boolean(note && (note.includes("au chaud") || note.includes("à l’intérieur")));
const sown = (note: string | undefined) => Boolean(note?.startsWith("Sème"));

export function followUpsFor(resolved: ResolvedPlant, events: MaintenanceEvent[], now: Date, climate?: ClimateInfo | null): CalendarActivity[] {
  const { plant, entry: catalogEntry } = resolved;
  if (plant.toPlant) return [];
  const start = events.find((event) => event.id === startEventId(plant.id));
  if (!start) return [];
  const data = PLANTING[catalogEntry.id];
  if (!data) return [];
  const entry = adaptToClimate(catalogEntry, climate);
  const days = Math.floor((now.getTime() - new Date(start.completedAt).getTime()) / DAY_MS);
  const base = { subjectId: plant.id, entry, tag: (plant.nickname?.trim() || entry.name).toUpperCase(), tone: "lime" as const };
  const done = (kind: FollowUp) => events.some((event) => event.id === followUpEventId(plant.id, kind));
  const due = (from: number) => days >= from && days < from + WINDOW_DAYS;
  const activities: CalendarActivity[] = [];
  const germinationMax = data.germinationDays?.[1] ?? 14;

  // Éclaircir : seulement après un semis, si la plante le demande (radis et betteraves ont déjà leur geste du catalogue).
  const catalogThins = catalogEntry.tasks.some((task) => task.id === "thin");
  if (sown(start.note) && data.thinning && !catalogThins && !done("thin") && due(germinationMax + THIN_AFTER_GERMINATION_DAYS)) {
    const how = data.seedsPerHole && data.seedsPerHole > 1
      ? "Dans chaque trou, garde la plus belle pousse : coupe les autres aux ciseaux, au ras de la terre."
      : `Garde une pousse tous les ${data.spacingCm} cm : coupe les autres aux ciseaux, au ras de la terre.`;
    activities.push({ ...base, key: `${plant.id}:thin`, kind: "care", typeLabel: "ÉCLAIRCIR", title: `Éclaircis ${entry.label}`, description: `${how} Celles qui restent auront la place de grandir.`, eventType: "pruning", followUp: "thin" });
  }

  // Sortir les plants semés au chaud, au mois où l'on plante dehors.
  const month = (now.getMonth() + 1) as (typeof entry.plantMonths)[number];
  if (startedIndoors(start.note) && entry.plantMonths.includes(month) && days >= OUTDOORS_MIN_DAYS && !done("outdoors")) {
    activities.push({
      ...base,
      key: `${plant.id}:outdoors`,
      kind: "plant",
      typeLabel: "PLANTATION",
      title: `Sors tes plants ${ofName(entry.name)} sur le balcon`,
      description: `Installe chaque plant dans un pot d’au moins ${entry.potLiters} L, avec du terreau frais, puis arrose bien. Les premiers jours, mets-les à l’abri du plein soleil de midi.`,
      eventType: "observation",
      followUp: "outdoors",
    });
  }

  // Pincer, une fois la plante bien partie.
  if (data.pinching && !done("pinch") && due(sown(start.note) ? germinationMax + PINCH_AFTER_GERMINATION_DAYS : PINCH_AFTER_PLANTING_DAYS)) {
    activities.push({ ...base, key: `${plant.id}:pinch`, kind: "care", typeLabel: "PINCER", title: `Pince ${entry.label}`, description: `${data.pinching} ${capitalize(subjectPronoun(entry))} ${verb(entry, "devient", "deviennent")} plus ${agree(entry, "touffu")} et ${verb(entry, "produit", "produisent")} plus.`, eventType: "pruning", followUp: "pinch" });
  }
  return activities;
}
