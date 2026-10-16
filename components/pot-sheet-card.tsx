/**
 * La carte « Spécial pot » de la fiche d'une plante (chantier « Pots et balcon », étapes 1 et 2). En haut, un dessin
 * compare son pot à celui qu'il lui faut, à la même échelle (orange quand il est trop petit), avec un titre clair et
 * « Changer la taille ». Puis le terreau et l'engrais de sa fiche vérifiée. Tout en centimètres : jamais de litres à
 * l'écran (retour du porteur, 12/10).
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { SettingRow, SettingsGroup } from "@/components/settings/rows";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import type { CatalogPlant } from "@/lib/plants/catalog";
import { ESTIMATE_TEXT, POT_SHAPES, SOIL_LABELS, feedingDetail, feedingValue, potFit, potNeedFor, potSheetFor, type PotNeed } from "@/lib/plants/pot-sheet";
import { potSizeLabel, type PotSize } from "@/lib/plants/pot-size";

const GREEN = "#1F7A4D";
const LEAF = "#E3F1E8";
const ORANGE = "#D2642A";
const PEACH = "#FBE9DF";
const MUTED = "#8A918D";

/** Échelle du dessin : 2 px par cm, les deux pots posés sur la même ligne de sol. */
const SCALE = 2;

/** Un pot vu de face, légèrement évasé, de `width` × `depth` cm, centré en `cx`, posé en `ground`. */
function potPath(cx: number, width: number, depth: number, ground: number) {
  const top = width * SCALE;
  const bottom = top * 0.82;
  const height = depth * SCALE;
  return `M${cx - top / 2} ${ground - height} L${cx + top / 2} ${ground - height} L${cx + bottom / 2} ${ground} L${cx - bottom / 2} ${ground} Z`;
}

/** Son pot (plein) à gauche, celui qu'il lui faut (en pointillés) à droite, à la même échelle. */
function PotCompare({ size, need, tone }: { size: PotSize; need: PotNeed; tone: "ok" | "small" | "unknown" }) {
  const mine = size === "unknown" ? null : POT_SHAPES[size];
  const wanted = need.planter ? { widthCm: 60, depthCm: need.depthCm } : { widthCm: need.widthCm, depthCm: need.depthCm };
  const leftWidth = (mine?.widthCm ?? 27) * SCALE;
  const rightWidth = wanted.widthCm * SCALE;
  const width = leftWidth + rightWidth + 56;
  const leftX = 16 + leftWidth / 2;
  const rightX = leftWidth + 40 + rightWidth / 2;
  const GROUND = Math.max(mine?.depthCm ?? 27, wanted.depthCm) * SCALE + 8;
  const stroke = tone === "small" ? ORANGE : GREEN;
  const fill = tone === "small" ? PEACH : LEAF;
  return (
    <Svg width={width} height={GROUND + 22} viewBox={`0 0 ${width} ${GROUND + 22}`} style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Line x1={4} y1={GROUND} x2={width - 4} y2={GROUND} stroke="#D9DED9" strokeWidth={2} />
      {mine ? (
        <>
          <Path d={potPath(leftX, mine.widthCm, mine.depthCm, GROUND)} fill={fill} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
          <Rect x={leftX - (mine.widthCm * SCALE) / 2 - 2} y={GROUND - mine.depthCm * SCALE - 4} width={mine.widthCm * SCALE + 4} height={5} rx={2} fill="#FFFFFF" stroke={stroke} strokeWidth={2} />
        </>
      ) : (
        <>
          <Path d={potPath(leftX, 27, 27, GROUND)} fill="none" stroke={MUTED} strokeWidth={2} strokeDasharray="4 4" />
          <SvgText x={leftX} y={GROUND - 14} fontSize={22} fontWeight="700" fill={MUTED} textAnchor="middle">?</SvgText>
        </>
      )}
      <Path d={potPath(rightX, wanted.widthCm, wanted.depthCm, GROUND)} fill="none" stroke={GREEN} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
      <SvgText x={leftX} y={GROUND + 17} fontSize={12} fontWeight="600" fill={MUTED} textAnchor="middle">Ton pot</SvgText>
      <SvgText x={rightX} y={GROUND + 17} fontSize={12} fontWeight="600" fill={GREEN} textAnchor="middle">Il lui faut</SvgText>
    </Svg>
  );
}

/**
 * `extraRows` : des lignes de la fiche rangées sous Terreau et Engrais (la variété). Toucher la carte du pot ouvre le
 * choix de la taille, comme la pastille du haut (plus de ligne « Ton pot » en double, 16/10).
 */
export function PotSheetCard({ entry, potSize, onChoosePot, extraRows }: { entry: CatalogPlant; potSize: PotSize; onChoosePot: () => void; extraRows?: ReactNode }) {
  const colors = useColors();
  const sheet = potSheetFor(entry.id);
  const need = potNeedFor(entry);
  const fit = potFit(entry, potSize);
  const toneColor = fit.tone === "small" ? colors.warning : fit.tone === "ok" ? colors.primary : colors.foreground;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.foreground }]}>Spécial pot</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ton pot : ${potSizeLabel(potSize)}`} onPress={onChoosePot} style={({ pressed }) => [glass.card, styles.potCard, fit.tone === "small" && { borderColor: ORANGE, borderWidth: 1.5 }, pressed && styles.pressed]}>
        <PotCompare size={potSize} need={need} tone={fit.tone} />
        <Text style={[styles.fitTitle, { color: toneColor }]}>{fit.tone === "ok" ? "✓ " : fit.tone === "small" ? "⚠︎ " : ""}{fit.title}</Text>
        <Text style={[styles.fitDetail, { color: colors.muted }]}>{fit.detail}</Text>
      </Pressable>
      {(sheet || extraRows) && (
        <SettingsGroup>
          {sheet && <SettingRow key="soil" label="Terreau" value={SOIL_LABELS[sheet.soil]} subtitle={sheet.soilTip ?? undefined} />}
          {sheet && <SettingRow key="feeding" label="Engrais" value={feedingValue(sheet.feeding)} subtitle={feedingDetail(entry, sheet.feeding)} />}
          {extraRows}
        </SettingsGroup>
      )}
      {sheet?.confidence === "low" && <Text style={[styles.estimate, { color: colors.muted }]}>{ESTIMATE_TEXT}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  art: { alignSelf: "center", maxWidth: "100%" },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginBottom: 10 },
  potCard: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 6 },
  fitTitle: { fontSize: 17, fontWeight: "800", marginTop: 6 },
  fitDetail: { fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  estimate: { fontSize: 13, lineHeight: 18, marginTop: 8, paddingHorizontal: 4 },
});
