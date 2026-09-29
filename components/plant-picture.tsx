/**
 * La photo d'une plante : ta dernière photo, ou, tant que tu n'en as pas pris, son emoji sur un
 * fond vert pâle, à la taille du cadre. Le cadre (taille, arrondi) vient de `style`.
 */
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import type { PlantPhoto } from "@/lib/garden/photos";
import { usePlantPhotos } from "@/lib/garden/photos-context";

type Props = {
  resolved: ResolvedPlant;
  /** Une photo précise ; par défaut la plus récente de la plante. */
  photo?: PlantPhoto | null;
  style?: StyleProp<ViewStyle>;
  /** Sans photo, l'écran place lui-même l'emoji (la fiche le met au-dessus de « Ajoute ta photo »). */
  hideEmoji?: boolean;
  children?: React.ReactNode;
};

export function PlantPicture({ resolved, photo, style, hideEmoji, children }: Props) {
  const colors = useColors();
  const [side, setSide] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = Math.min(width, height);
    if (next !== side) setSide(next);
  };
  const { covers, uriOf } = usePlantPhotos();
  const shown = photo === undefined ? covers.get(resolved.plant.id) : photo;
  return (
    <View style={[styles.frame, { backgroundColor: colors.leaf }, style]} onLayout={shown ? undefined : onLayout}>
      {shown ? (
        <Image source={{ uri: uriOf(shown) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} accessibilityIgnoresInvertColors />
      ) : (
        !hideEmoji && side > 0 && (
          <View style={styles.center} pointerEvents="none">
            <Text style={{ fontSize: Math.round(side * 0.42), lineHeight: Math.round(side * 0.56) }} accessibilityElementsHidden importantForAccessibility="no">{resolved.entry.emoji}</Text>
          </View>
        )
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
