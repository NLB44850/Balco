/**
 * La photo d'une plante : ta dernière photo, ou, tant que tu n'en as pas pris, l'ombre peinte
 * de sa famille sur un fond vert pâle (plus d'emoji). Le cadre (taille, arrondi) vient de `style`.
 */
import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { PLANT_SHADOWS } from "@/components/plant-shadows";
import { useColors } from "@/hooks/use-colors";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import type { PlantPhoto } from "@/lib/garden/photos";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { potShapeFor } from "@/lib/garden/sky";

type Props = {
  resolved: ResolvedPlant;
  /** Une photo précise ; par défaut la plus récente de la plante. */
  photo?: PlantPhoto | null;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function PlantPicture({ resolved, photo, style, children }: Props) {
  const colors = useColors();
  const { covers, uriOf } = usePlantPhotos();
  const shown = photo === undefined ? covers.get(resolved.plant.id) : photo;
  return (
    <View style={[styles.frame, { backgroundColor: colors.leaf }, style]}>
      {shown ? (
        <Image source={{ uri: uriOf(shown) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} accessibilityIgnoresInvertColors />
      ) : (
        <Image source={PLANT_SHADOWS[potShapeFor(resolved.entry.category)]} style={styles.shadow} contentFit="contain" tintColor={colors.primary} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  shadow: { position: "absolute", left: "4%", right: "4%", top: "6%", bottom: "-2%", opacity: 0.28 },
});
