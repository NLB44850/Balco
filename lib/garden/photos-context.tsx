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

type PlantPhotosValue = {
  photos: PlantPhoto[];
  covers: Map<string, PlantPhoto>;
  addPhoto: (plantId: string, photo: PreparedPhoto, origin?: PlantPhoto["origin"]) => Promise<PlantPhoto>;
  removePhoto: (id: string) => Promise<void>;
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

  // Plante retirée ou compte effacé : ses photos partent aussi.
  useEffect(() => {
    if (!loaded || !gardenLoaded) return;
    const orphans = orphanPhotos(photosRef.current, plants.map((plant) => plant.id));
    if (orphans.length === 0) return;
    const ids = new Set(orphans.map((photo) => photo.id));
    orphans.forEach((photo) => deletePhotoFile(photo.source));
    void save(photosRef.current.filter((photo) => !ids.has(photo.id))).catch(() => undefined);
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

  const removePhoto = useCallback(async (id: string) => {
    const photo = photosRef.current.find((item) => item.id === id);
    if (!photo) return;
    await save(photosRef.current.filter((item) => item.id !== id));
    deletePhotoFile(photo.source);
  }, [save]);

  const uriOf = useCallback((photo: PlantPhoto) => photoFileUri(photo.source), []);
  const covers = useMemo(() => coverPhotos(photos), [photos]);
  const value = useMemo(() => ({ photos, covers, addPhoto, removePhoto, uriOf }), [addPhoto, covers, photos, removePhoto, uriOf]);

  return <PlantPhotosContext.Provider value={value}>{children}</PlantPhotosContext.Provider>;
}

export function usePlantPhotos() {
  const context = useContext(PlantPhotosContext);
  if (!context) throw new Error("usePlantPhotos must be used inside <PlantPhotosProvider>");
  return context;
}
