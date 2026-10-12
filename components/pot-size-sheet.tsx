/**
 * La taille du pot d'une plante (chantier « Pots et balcon », étape 1) : un petit dessin de pot de taille croissante
 * par choix, et la feuille du bas « Dans quel pot ? », ouverte depuis la fiche de la plante ou juste après son ajout
 * (facultative : « Passer »). Dessins en react-native-svg, déjà dans l'app : rien à réinstaller.
 */
import { Pressable, StyleSheet } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

import { ChoiceList } from "@/components/settings/choice-list";
import { SheetHeading } from "@/components/settings/rows";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { POT_SIZE_CHOICES, potSizeLabel, type PotSize } from "@/lib/plants/pot-size";

const GREEN = "#1F7A4D";
const LEAF = "#E3F1E8";

/** Un pot vu de face : rebord de `left` à `right` à la hauteur `top`, posé sur le bas du dessin. */
function potPath(left: number, right: number, top: number) {
  const inset = (right - left) * 0.08;
  return `M${left + 1} ${top + 3} L${right - 1} ${top + 3} L${right - 1 - inset} 36 L${left + 1 + inset} 36 Z`;
}

const SHAPES: Record<Exclude<PotSize, "unknown" | "planter">, [number, number, number]> = {
  small: [17, 31, 24],
  medium: [13, 35, 17],
  large: [8, 40, 9],
};

/** Le dessin d'une taille de pot : petit, moyen, grand, une jardinière basse et longue, ou un pot en pointillés « ? ». */
export function PotSizeArt({ size }: { size: PotSize }) {
  const stroke = { stroke: GREEN, strokeWidth: 2, strokeLinejoin: "round" as const };
  return (
    <Svg width={40} height={34} viewBox="0 0 48 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {size === "planter" && (
        <>
          <Path d="M4 25 L44 25 L42 36 L6 36 Z" fill={LEAF} {...stroke} />
          <Rect x={2} y={21} width={44} height={4} rx={1.5} fill="#FFFFFF" {...stroke} />
        </>
      )}
      {size === "unknown" && (
        <>
          <Path d={potPath(13, 35, 17)} fill="none" {...stroke} strokeDasharray="3 3" />
          <SvgText x={24} y={32} fontSize={13} fontWeight="700" fill={GREEN} textAnchor="middle">?</SvgText>
        </>
      )}
      {size in SHAPES && (() => {
        const [left, right, top] = SHAPES[size as keyof typeof SHAPES];
        return (
          <>
            <Path d={potPath(left, right, top)} fill={LEAF} {...stroke} />
            <Rect x={left - 1} y={top} width={right - left + 2} height={4} rx={1.5} fill="#FFFFFF" {...stroke} />
          </>
        );
      })()}
    </Svg>
  );
}

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  value: PotSize;
  onPick: (size: PotSize) => void;
  /** Juste après l'ajout d'une plante : la question se passe (« Passer »). */
  onSkip?: () => void;
  overlay?: React.ReactNode;
};

/** « Dans quel pot ? » : les 5 tailles, chacune avec son dessin. Choisir referme la feuille. */
export function PotSizeSheet({ visible, onClose, value, onPick, onSkip, overlay }: SheetProps) {
  const colors = useColors();
  return (
    <BottomSheet visible={visible} onClose={onClose} overlay={overlay}>
      <SheetHeading title="Dans quel pot ?" intro="Mesure le haut du pot, d’un bord à l’autre." />
      <ChoiceList
        choices={POT_SIZE_CHOICES.map((choice) => ({ id: choice.id, title: potSizeLabel(choice.id), art: <PotSizeArt size={choice.id} /> }))}
        selected={(id) => id === value}
        onPick={(id) => onPick(id as PotSize)}
      />
      {onSkip && (
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
          <Text style={[styles.skipText, { color: colors.muted }]}>Passer</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  skip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
  skipText: { fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
