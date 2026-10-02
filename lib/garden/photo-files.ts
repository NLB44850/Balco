/**
 * Les fichiers des photos de plantes sur le téléphone : copiés dans le dossier de l'app
 * (le cache peut être vidé par le système), et retrouvés par leur nom.
 * Version web : photo-files.web.ts.
 */
import { Directory, File, Paths } from "expo-file-system";

import type { PhotoFormat, PreparedPhoto } from "../ai/photo";

const FOLDER = "plant-photos";

/** Assez net pour une photo plein écran, sans remplir le téléphone. */
export const JOURNAL_PHOTO_FORMAT: PhotoFormat = { maxSide: 1440, compress: 0.75, base64: false };

/** Garde la photo et renvoie ce qu'il faut enregistrer pour la retrouver (le nom du fichier). */
export async function keepPhotoFile(photo: PreparedPhoto, id: string): Promise<string> {
  const folder = new Directory(Paths.document, FOLDER);
  folder.create({ idempotent: true, intermediates: true });
  const name = `${id}.jpg`;
  new File(photo.uri).copy(new File(folder, name));
  return name;
}

export function photoFileUri(source: string) {
  return new File(Paths.document, FOLDER, source).uri;
}

export function deletePhotoFile(source: string) {
  try {
    const file = new File(Paths.document, FOLDER, source);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("[photos] could not delete", source, error);
  }
}
