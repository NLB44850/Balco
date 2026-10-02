/**
 * Les photos de plantes dans l'app web : pas de dossier de fichiers, l'image est gardée
 * telle quelle (data:) dans le stockage du navigateur. Plus petite que sur le téléphone,
 * car le navigateur ne garde que quelques mégaoctets.
 */
import type { PhotoFormat, PreparedPhoto } from "../ai/photo";

export const JOURNAL_PHOTO_FORMAT: PhotoFormat = { maxSide: 720, compress: 0.6, base64: true };

export async function keepPhotoFile(photo: PreparedPhoto, _id: string): Promise<string> {
  if (!photo.base64) throw new Error("photo without data");
  return `data:image/jpeg;base64,${photo.base64}`;
}

export function photoFileUri(source: string) {
  return source;
}

export function deletePhotoFile(_source: string) {}
