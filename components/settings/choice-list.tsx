/**
 * Les choix d'une feuille de Réglages, les mêmes que l'accueil : un rond pour un seul choix, une case pour
 * plusieurs. `hints` ajoute une ligne grise sous un choix (« Astuce : regarde ton balcon à 10 h… »).
 */
import { Pressable, StyleSheet, View } from "react-native";

import { Check } from "@/components/ui/check";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";

/** `art` : un petit dessin à la place de l'emoji (la taille du pot). */
export type Choice = { id: string; title: string; icon?: string; art?: React.ReactNode; /** Une courte mention verte dans la ligne (« ✓ Conseillé »). */ badge?: string };

type Props = {
  choices: Choice[];
  selected: (id: string) => boolean;
  onPick: (id: string) => void;
  multiple?: boolean;
  hints?: Record<string, string>;
};

export function ChoiceList({ choices, selected, onPick, multiple = false, hints }: Props) {
  const colors = useColors();
  return (
    <View style={styles.list}>
      {choices.map((choice) => {
        const active = selected(choice.id);
        return (
          <View key={choice.id} style={styles.item}>
            <Pressable
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked: active }}
              aria-checked={active}
              accessibilityLabel={choice.title}
              onPress={() => onPick(choice.id)}
              style={({ pressed }) => [styles.choice, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? "rgba(31,122,77,0.08)" : "transparent" }, pressed && styles.pressed]}
            >
              {choice.art ?? (choice.icon ? <Text style={styles.icon}>{choice.icon}</Text> : null)}
              <Text style={[styles.text, { color: colors.foreground }]}>{choice.title}</Text>
              {choice.badge ? <Text style={[styles.badge, { color: colors.primary }]}>{choice.badge}</Text> : null}
              <Check checked={active} shape={multiple ? "square" : "radio"} />
            </Pressable>
            {hints?.[choice.id] ? <Text style={[styles.hint, { color: colors.muted }]}>{hints[choice.id]}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 6 },
  item: { gap: 6 },
  choice: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  icon: { fontSize: 18 },
  text: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  hint: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  badge: { fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
