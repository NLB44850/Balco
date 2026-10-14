/**
 * Les photos de tes plantes, gardées sur cet appareil (elles ne partent pas encore sur le serveur).
 * Quand une plante quitte le balcon, ses photos sont effacées avec elle.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { PreparedPhoto } from "../ai/photo";
import { useGarden } from "./garden-context";
import { deletePhotoFile, keepPhotoFile, photoFileUri } from "./photo-files";
import { addPhoto as addPhotoTo, coverPhotos, orphanPhotos, photoId, type PlantPhoto } from "./photos";

export const PLANT_PHOTOS_STORAGE_KEY = "balco.garden.photos.v1";

/** Le stockage est plein (surtout dans le navigateur) : la photo n'a pas pu être gardée. */
export class PhotoStorageFullError extends Error {}

/** Une plante retirée garde ses photos le temps de « Annuler ». */
const ORPHAN_GRACE_MS = 15_000;

type PlantPhotosValue = {
  photos: PlantPhoto[];
  covers: Map<string, PlantPhoto>;
  addPhoto: (plantId: string, photo: PreparedPhoto, origin?: PlantPhoto["origin"]) => Promise<PlantPhoto>;
  /** `keepFile` : la photo quitte la liste mais son fichier reste, pour « Annuler » (`restorePhoto`). */
  removePhoto: (id: string, options?: { keepFile?: boolean }) => Promise<void>;
  restorePhoto: (photo: PlantPhoto) => Promise<void>;
  /** Efface le fichier d'une photo retirée avec `keepFile`, une fois « Annuler » passé. */
  forgetPhotoFile: (photo: PlantPhoto) => void;
  uriOf: (photo: PlantPhoto) => string;
};

const PlantPhotosContext = createContext<PlantPhotosValue | null>(null);

export function PlantPhotosProvider({ children }: { children: ReactNode }) {
  const { loaded: gardenLoaded, plants } = useGarden();
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const photosRef = useRef(photos);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PLANT_PHOTOS_STORAGE_KEY)
      .then((stored) => (stored ? (JSON.parse(stored) as PlantPhoto[]) : []))
      .catch(() => [] as PlantPhoto[])
      .then((stored) => {
        if (!active) return;
        photosRef.current = Array.isArray(stored) ? stored : [];
        setPhotos(photosRef.current);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Enregistre la liste ; lève PhotoStorageFullError si le stockage refuse (rien n'est changé alors). */
  const save = useCallback(async (next: PlantPhoto[]) => {
    try {
      await AsyncStorage.setItem(PLANT_PHOTOS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("[photos] could not persist", error);
      throw new PhotoStorageFullError("photo storage full");
    }
    photosRef.current = next;
    setPhotos(next);
  }, []);

  // Plante retirée ou compte effacé : ses photos partent aussi, après le temps de « Annuler » (la plante peut revenir).
  const plantIdsRef = useRef<string[]>([]);
  plantIdsRef.current = plants.map((plant) => plant.id);
  useEffect(() => {
    if (!loaded || !gardenLoaded) return;
    if (orphanPhotos(photosRef.current, plantIdsRef.current).length === 0) return;
    const timer = setTimeout(() => {
      const orphans = orphanPhotos(photosRef.current, plantIdsRef.current);
      if (orphans.length === 0) return;
      const ids = new Set(orphans.map((photo) => photo.id));
      orphans.forEach((photo) => deletePhotoFile(photo.source));
      void save(photosRef.current.filter((photo) => !ids.has(photo.id))).catch(() => undefined);
    }, ORPHAN_GRACE_MS);
    return () => clearTimeout(timer);
  }, [gardenLoaded, loaded, plants, save]);

  const addPhoto = useCallback(async (plantId: string, prepared: PreparedPhoto, origin: PlantPhoto["origin"] = "journal") => {
    const now = new Date();
    const id = photoId(plantId, now);
    const source = await keepPhotoFile(prepared, id);
    const photo: PlantPhoto = { id, plantId, takenAt: now.toISOString(), source, origin };
    const { photos: next, dropped } = addPhotoTo(photosRef.current, photo);
    try {
      await save(next);
    } catch (error) {
      deletePhotoFile(source);
      throw error;
    }
    dropped.forEach((item) => deletePhotoFile(item.source));
    return photo;
  }, [save]);

  const removePhoto = useCallback(async (id: string, options: { keepFile?: boolean } = {}) => {
    const photo = photosRef.current.find((item) => item.id === id);
    if (!photo) return;
    await save(photosRef.current.filter((item) => item.id !== id));
    if (!options.keepFile) deletePhotoFile(photo.source);
  }, [save]);

  const restorePhoto = useCallback(async (photo: PlantPhoto) => {
    if (photosRef.current.some((item) => item.id === photo.id)) return;
    await save([...photosRef.current, photo].sort((a, b) => b.takenAt.localeCompare(a.takenAt)));
  }, [save]);

  const forgetPhotoFile = useCallback((photo: PlantPhoto) => {
    if (!photosRef.current.some((item) => item.id === photo.id)) deletePhotoFile(photo.source);
  }, []);

  const uriOf = useCallback((photo: PlantPhoto) => photoFileUri(photo.source), []);
  const covers = useMemo(() => coverPhotos(photos), [photos]);
  const value = useMemo(() => ({ photos, covers, addPhoto, removePhoto, restorePhoto, forgetPhotoFile, uriOf }), [addPhoto, covers, forgetPhotoFile, photos, removePhoto, restorePhoto, uriOf]);

  return <PlantPhotosContext.Provider value={value}>{children}</PlantPhotosContext.Provider>;
}

export function usePlantPhotos() {
  const context = useContext(PlantPhotosContext);
  if (!context) throw new Error("usePlantPhotos must be used inside <PlantPhotosProvider>");
  return context;
}
