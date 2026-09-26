import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/** Côté le plus long envoyé à l'IA : assez pour voir taches et insectes, sans payer une photo de 12 Mpx. */
const MAX_SIDE = 1024;

export type PreparedPhoto = { uri: string; base64: string };
export type PickResult = { status: "ok"; photo: PreparedPhoto } | { status: "canceled" } | { status: "denied" };

export async function pickPlantPhoto(source: "camera" | "library"): Promise<PickResult> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return { status: "canceled" };

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  // JPEG réencodé : retire aussi les métadonnées (position GPS de la photo, modèle du téléphone…).
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error("photo could not be encoded");
  return { status: "ok", photo: { uri: saved.uri, base64: saved.base64 } };
}
