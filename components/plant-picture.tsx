/**
 * La photo d'une plante : ta dernière photo ; tant que tu n'en as pas pris, une photo d'exemple
 * libre de droits (assets/plants, crédits dans app/credits.tsx) ; à défaut, son emoji sur un fond
 * vert pâle, à la taille du cadre. Le cadre (taille, arrondi) vient de `style`.
 */
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { ResolvedPlant } from "@/lib/garden/garden-logic";
import type { CatalogPlant } from "@/lib/plants/catalog";
import type { PlantPhoto } from "@/lib/garden/photos";
import { usePlantPhotos } from "@/lib/garden/photos-context";

import { STOCK_PHOTOS, STOCK_THUMBS } from "./plant-stock-photos";

/** La photo d'exemple d'une plante du catalogue, s'il y en a une ; `thumb` : sa vignette de 200 px. */
export function stockPhoto(catalogId: string, thumb = false): number | undefined {
  return (thumb ? STOCK_THUMBS[catalogId] : undefined) ?? STOCK_PHOTOS[catalogId];
}

type Props = {
  resolved: ResolvedPlant;
  /** Une photo précise ; par défaut la plus récente de la plante. */
  photo?: PlantPhoto | null;
  style?: StyleProp<ViewStyle>;
  /** Sans aucune photo (ni la tienne ni d'exemple), l'écran place lui-même l'emoji. */
  hideEmoji?: boolean;
  children?: React.ReactNode;
};

export function PlantPicture({ resolved, photo, style, hideEmoji, children }: Props) {
  const { covers, uriOf } = usePlantPhotos();
  const shown = photo === undefined ? covers.get(resolved.plant.id) : photo;
  return (
    <Picture entry={resolved.entry} uri={shown ? uriOf(shown) : undefined} style={style} hideEmoji={hideEmoji}>
      {children}
    </Picture>
  );
}

/** Une plante du catalogue (pas encore sur ton balcon) : sa photo d'exemple, ou son emoji. */
/**
 * La photo d'exemple d'une plante du catalogue. Par défaut sa vignette (les petits ronds : catalogue, accueil,
 * suggestions), plus légère à charger ; `full` pour une grande image.
 */
export function CatalogPicture({ entry, style, full }: { entry: CatalogPlant; style?: StyleProp<ViewStyle>; full?: boolean }) {
  return <Picture entry={entry} style={style} thumb={!full} />;
}

function Picture({ entry, uri, style, hideEmoji, thumb, children }: { entry: CatalogPlant; uri?: string; style?: StyleProp<ViewStyle>; hideEmoji?: boolean; thumb?: boolean; children?: React.ReactNode }) {
  const colors = useColors();
  const [side, setSide] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = Math.min(width, height);
    if (next !== side) setSide(next);
  };
  // Ta photo introuvable (fichier effacé par le téléphone) : la photo d'exemple plutôt qu'un rond vide (retour du 14/10).
  const [brokenUri, setBrokenUri] = useState<string | null>(null);
  const ownUri = uri && uri !== brokenUri ? uri : undefined;
  const source = ownUri ? { uri: ownUri } : stockPhoto(entry.id, thumb);
  return (
    <View style={[styles.frame, { backgroundColor: colors.leaf }, style]} onLayout={source ? undefined : onLayout}>
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} accessibilityIgnoresInvertColors onError={() => ownUri && setBrokenUri(ownUri)} />
      ) : (
        !hideEmoji && side > 0 && (
          <View style={styles.center} pointerEvents="none">
            <Text style={{ fontSize: Math.round(side * 0.5), lineHeight: Math.round(side * 0.64) }} accessibilityElementsHidden importantForAccessibility="no">{entry.emoji}</Text>
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
