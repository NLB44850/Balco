/**
 * Carte « À semer ou planter en octobre » : quelques plantes de saison qui conviennent à ton balcon.
 * Le « + » ajoute tout de suite (l'écran affiche « Annuler ») ; toucher la ligne ouvre la fiche du
 * catalogue ; le lien du bas ouvre tout ce qui se sème ou se plante ce mois-là dans le catalogue.
 */
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { CatalogPicture } from "@/components/plant-picture";
import { glass } from "@/components/ui/glass";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { MONTH_LONG } from "@/lib/plants/catalog";
import { suggestionsHeading, type SeasonalSuggestion } from "@/lib/plants/suggestions";

type Props = {
  /** Mois du lien vers le catalogue (et du titre, sauf `heading`). */
  month: number;
  /** Titre à la place de « À semer ou planter en octobre » (vue par saison). */
  heading?: string;
  /** « en automne » : la période, pour la phrase des mois calmes (vue par saison). */
  periodName?: string;
  /** Une saison compte plusieurs mois : chaque ligne dit le sien (« En novembre · … »). */
  showMonth?: boolean;
  suggestions: SeasonalSuggestion[];
  /** Prochain mois avec des semis ou plantations, quand celui-ci est calme. */
  nextMonth?: number | null;
  /** Le mois affiché est-il le mois en cours ? Sinon, on prépare. */
  current: boolean;
  onAdd: (suggestion: SeasonalSuggestion) => void;
  onOpen: (suggestion: SeasonalSuggestion) => void;
};

export function SeasonalSuggestions({ month, heading, periodName, showMonth, suggestions, nextMonth, current, onAdd, onOpen }: Props) {
  const colors = useColors();
  const router = useRouter();
  const intro = suggestions.length === 0
    ? `Rien de nouveau à lancer ${periodName ?? (current ? "ce mois-ci" : `en ${MONTH_LONG[month - 1]}`)} pour ton balcon.${nextMonth ? ` Les prochains semis reprennent en ${MONTH_LONG[nextMonth - 1]}.` : ""}`
    : current ? "Choisies pour ton balcon et ton climat." : "Pour t’organiser : achète graines et plants à l’avance.";
  // Le lien mène au mois où il y a quelque chose à faire ; « d’octobre », « de mars ».
  const linkMonth = suggestions.length === 0 && nextMonth ? nextMonth : month;
  const linkName = MONTH_LONG[linkMonth - 1];
  const linkLabel = `Voir toutes les plantes ${/^[aeiou]/u.test(linkName) ? "d’" : "de "}${linkName}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.foreground }]}>{heading ?? suggestionsHeading(month)}</Text>
        <Text style={[styles.intro, { color: colors.muted }]}>{intro}</Text>
      </View>
      {suggestions.length > 0 && (
        <View style={[glass.card, styles.list]}>
          {suggestions.map((suggestion, index) => (
            <View key={suggestion.entry.id} style={[styles.row, index < suggestions.length - 1 && glass.line]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${suggestion.title}, voir le détail`} onPress={() => onOpen(suggestion)} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                <CatalogPicture entry={suggestion.entry} style={styles.picture} />
                <View style={styles.flex}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{suggestion.title}</Text>
                  <Text style={[styles.reason, { color: colors.muted }]} numberOfLines={2}>{showMonth ? `En ${MONTH_LONG[suggestion.month - 1]} · ${suggestion.reason.charAt(0).toLowerCase()}${suggestion.reason.slice(1)}` : suggestion.reason}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${suggestion.entry.name} à mon balcon`} hitSlop={8} onPress={() => onAdd(suggestion)} style={({ pressed }) => [styles.add, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.addText}>+</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/garden/add", params: { month: String(linkMonth) } })} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primary }]}>{linkLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { gap: 4 },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  intro: { fontSize: 14, lineHeight: 20 },
  flex: { flex: 1 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  picture: { width: 44, height: 44, borderRadius: 22 },
  name: { fontSize: 16, fontWeight: "700" },
  reason: { fontSize: 13, marginTop: 1 },
  add: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  addText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginTop: -2 },
  link: { alignSelf: "center", paddingVertical: 4 },
  linkText: { fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});
