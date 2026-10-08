/**
 * Réglages : une liste simple où chaque ligne montre sa valeur actuelle ; la toucher ouvre une feuille du bas.
 * `SettingsGroup` pose les lignes dans une carte en verre, séparées d'un trait fin.
 */
import { Children, Fragment, isValidElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const colors = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title && <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>}
      <View style={[glass.card, styles.card]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type RowProps = {
  label: string;
  /** La valeur courte, à droite (« Lyon », « Toute la journée »). */
  value?: string;
  /** Une ligne grise sous le libellé. */
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Rouge (« Supprimer mon compte »). */
  danger?: boolean;
  /** À droite, à la place de la valeur et de la flèche (interrupteur). */
  accessory?: React.ReactNode;
};

/** Une ligne de Réglages : « Soleil   Toute la journée › ». Sans `onPress`, elle se lit seulement. */
export function SettingRow({ label, value, subtitle, onPress, disabled, danger, accessory }: RowProps) {
  const colors = useColors();
  const content = (
    <>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: danger ? colors.error : colors.foreground }]}>{label}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {accessory ?? (
        <>
          {value ? <Text numberOfLines={2} style={[styles.value, { color: colors.muted }]}>{value}</Text> : null}
          {onPress && !danger ? <Text style={[styles.arrow, { color: colors.muted }]}>›</Text> : null}
        </>
      )}
    </>
  );
  if (!onPress) return <View style={[styles.row, disabled && styles.disabled]}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label} : ${value}` : label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

/** Le haut d'une feuille de Réglages : titre et phrase d'explication. */
export function SheetHeading({ title, intro }: { title: string; intro?: string }) {
  const colors = useColors();
  return (
    <View style={styles.heading}>
      <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
      {intro ? <Text style={[styles.intro, { color: colors.muted }]}>{intro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 18 },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginBottom: 10 },
  card: { paddingHorizontal: 15 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(18,22,20,0.12)" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 12 },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "600" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  value: { fontSize: 15, maxWidth: "62%", textAlign: "right" },
  arrow: { fontSize: 22, fontWeight: "300", marginTop: -2 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  heading: { gap: 6, marginBottom: 6 },
  sheetTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, lineHeight: 27 },
  intro: { fontSize: 15, lineHeight: 21 },
});
