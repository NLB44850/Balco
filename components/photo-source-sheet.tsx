/** La feuille « Prendre une photo / Choisir dans la galerie », pour la photo d'une plante. */
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/today/bottom-sheet";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { pickPlantPhoto } from "@/lib/ai/photo";
import { JOURNAL_PHOTO_FORMAT } from "@/lib/garden/photo-files";
import { PhotoStorageFullError, usePlantPhotos } from "@/lib/garden/photos-context";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onPick: (source: "camera" | "library") => void;
};

export function PhotoSourceSheet({ visible, title, onClose, onPick }: Props) {
  const colors = useColors();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheet}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.text, { color: colors.muted }]}>Une photo de temps en temps, et tu verras ta plante grandir. Elle reste sur ton téléphone.</Text>
        <Pressable accessibilityRole="button" onPress={() => onPick("camera")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>Prendre une photo</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onPick("library")} style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>Choisir dans la galerie</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

/**
 * Ajouter une photo à une plante en deux touchers : `ask(plant)` ouvre la feuille, la photo est
 * gardée, puis `notify` confirme (avec « Annuler ») ou explique ce qui n'a pas marché.
 */
export function usePlantPhotoCapture(notify: (text: string, onUndo?: () => void) => void) {
  const { addPhoto, removePhoto } = usePlantPhotos();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  const pick = async (source: "camera" | "library") => {
    const plant = target;
    setTarget(null);
    if (!plant) return;
    // iOS refuse d'ouvrir l'appareil photo pendant que la feuille se referme.
    if (Platform.OS === "ios") await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      const result = await pickPlantPhoto(source, JOURNAL_PHOTO_FORMAT);
      if (result.status === "denied") return notify("Autorise l’appareil photo dans les réglages du téléphone, ou choisis une photo dans ta galerie.");
      if (result.status !== "ok") return;
      const photo = await addPhoto(plant.id, result.photo);
      notify(`Photo de ${plant.name} ajoutée`, () => void removePhoto(photo.id));
    } catch (error) {
      notify(error instanceof PhotoStorageFullError ? "Plus de place pour les photos ici : retire d’anciennes photos de tes plantes." : "Impossible de garder cette photo. Essaie avec une autre.");
    }
  };

  const sheet = <PhotoSourceSheet visible={target !== null} title={target ? `Une photo de ${target.name}` : ""} onClose={() => setTarget(null)} onPick={(source) => void pick(source)} />;
  return { ask: (id: string, name: string) => setTarget({ id, name }), sheet };
}

const styles = StyleSheet.create({
  sheet: { gap: 12 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  text: { fontSize: 15, lineHeight: 22 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: { borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
