/**
 * La lumière du balcon partagée entre les écrans : l'accueil la calcule avec la vraie météo,
 * les autres onglets l'utilisent pour leur fond, sans refaire d'appel météo.
 */
import { useSyncExternalStore } from "react";

import { defaultSkyScene, type SkyScene } from "./sky";

let current: SkyScene = defaultSkyScene(new Date());
const listeners = new Set<() => void>();

export function publishSky(scene: SkyScene) {
  if (JSON.stringify(scene) === JSON.stringify(current)) return;
  current = scene;
  listeners.forEach((listener) => listener());
}

export function useSharedSky() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current,
  );
}
