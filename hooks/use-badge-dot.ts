/**
 * Le point vert de l'onglet « Moi » (lib/garden/badge-dot.ts) : partagé entre l'icône de l'onglet et l'écran Moi, qui
 * l'éteint en s'ouvrant. La date du dernier badge vu est gardée sur le téléphone ; au tout premier lancement de cette
 * version, les badges déjà obtenus comptent comme vus.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

import { hasNewBadge, latestBadgeAt } from "@/lib/garden/badge-dot";
import { useGarden } from "@/lib/garden/garden-context";

const STORAGE_KEY = "balco.profile.badges-seen.v1";

/** undefined : pas encore lu ; null : rien de gardé (premier lancement) ; sinon la date du dernier badge vu. */
let seenAt: string | null | undefined;
let reading = false;
const listeners = new Set<() => void>();

function publish(value: string) {
  seenAt = value;
  listeners.forEach((listener) => listener());
  void AsyncStorage.setItem(STORAGE_KEY, value).catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (seenAt === undefined && !reading) {
    reading = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then((value) => {
        if (seenAt !== undefined) return;
        seenAt = value;
        listeners.forEach((item) => item());
      });
  }
  return () => listeners.delete(listener);
}

/** `true` quand un badge est arrivé depuis la dernière ouverture de Moi. */
export function useBadgeDot() {
  const { loaded, awards } = useGarden();
  const stored = useSyncExternalStore(subscribe, () => seenAt, () => seenAt);
  // Premier lancement : ce qui est déjà acquis ne fait pas briller le point.
  useEffect(() => {
    if (loaded && stored === null) publish(latestBadgeAt(awards));
  }, [awards, loaded, stored]);
  return loaded && stored !== undefined && hasNewBadge(awards, stored);
}

/** Moi ouvert : tous les badges du moment sont vus. */
export function useMarkBadgesSeen(active: boolean) {
  const { loaded, awards } = useGarden();
  const stored = useSyncExternalStore(subscribe, () => seenAt, () => seenAt);
  useEffect(() => {
    if (!active || !loaded || stored === undefined) return;
    const latest = latestBadgeAt(awards);
    if (latest !== stored) publish(latest);
  }, [active, awards, loaded, stored]);
}
