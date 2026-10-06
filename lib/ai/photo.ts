import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { clearCameraOpening, markCameraOpening } from "./camera-interrupt";

/** Côté le plus long envoyé à l'IA : assez pour voir taches et insectes, sans payer une photo de 12 Mpx. */
const MAX_SIDE = 1024;

export type PreparedPhoto = { uri: string; base64: string };
/** Taille et qualité de la photo gardée ; `base64: false` quand on n'a besoin que du fichier. */
export type PhotoFormat = { maxSide: number; compress: number; base64: boolean };

const FOR_AI: PhotoFormat = { maxSide: MAX_SIDE, compress: 0.7, base64: true };
export type PickResult = { status: "ok"; photo: PreparedPhoto } | { status: "canceled" } | { status: "denied" };

export async function pickPlantPhoto(source: "camera" | "library", format: PhotoFormat = FOR_AI): Promise<PickResult> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  // Dans un navigateur, la page peut se recharger pendant la prise de vue : on le note pour l'expliquer.
  if (source === "camera") markCameraOpening();
  let result: ImagePicker.ImagePickerResult;
  try {
    result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  } finally {
    if (source === "camera") clearCameraOpening();
  }
  if (result.canceled || !result.assets?.[0]) return { status: "canceled" };

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > format.maxSide) context.resize(asset.width >= asset.height ? { width: format.maxSide } : { height: format.maxSide });
  const image = await context.renderAsync();
  // JPEG réencodé : retire aussi les métadonnées (position GPS de la photo, modèle du téléphone…).
  const saved = await image.saveAsync({ compress: format.compress, format: SaveFormat.JPEG, base64: format.base64 });
  if (format.base64 && !saved.base64) throw new Error("photo could not be encoded");
  return { status: "ok", photo: { uri: saved.uri, base64: saved.base64 ?? "" } };
}
