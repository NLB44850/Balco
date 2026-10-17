/**
 * « C'est rentré » et « C'est ressorti » : les mêmes gestes depuis Aujourd'hui et la fiche plante, écrits une seule
 * fois (Tour de l'appli, étape 4 ; ils étaient en double et pouvaient diverger).
 */
import * as Haptics from "expo-haptics";
import { useCallback } from "react";

import { now as clockNow } from "@/lib/clock";
import { useGarden } from "@/lib/garden/garden-context";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import { broughtIn, broughtInToast } from "@/lib/garden/indoors";
import { broughtOutToast } from "@/lib/garden/spring-out";

type ShowToast = (text: string, onUndo?: () => void) => void;

export function useWinterMoves(showToast: ShowToast) {
  const { setPlantWinter } = useGarden();

  /** La plante passe « À l'intérieur » (le pas-à-pas reste facultatif), avec « Annuler ». */
  const bringIn = useCallback(async ({ plant, entry }: ResolvedPlant) => {
    const previous = plant.winter;
    if (!previous) return;
    await setPlantWinter(plant.id, broughtIn(previous, clockNow()));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    showToast(broughtInToast(entry), () => void setPlantWinter(plant.id, previous));
  }, [setPlantWinter, showToast]);

  /** Son choix pour l'hiver s'efface : ses rappels normaux reprennent, avec « Annuler ». */
  const bringOut = useCallback(async ({ plant, entry }: ResolvedPlant) => {
    const previous = plant.winter;
    await setPlantWinter(plant.id, undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    showToast(broughtOutToast(entry), () => void setPlantWinter(plant.id, previous));
  }, [setPlantWinter, showToast]);

  return { bringIn, bringOut };
}
