/**
 * Choisir la ville du balcon : recherche par nom (Open-Meteo) ou position du téléphone. Le même écran
 * pour Saisons (« ⌖ Paris »), le bandeau « Météo de Paris par défaut » d'Aujourd'hui et Réglages.
 * Les actions viennent de l'écran qui l'ouvre (`useLocalWeather`), pour ne pas lancer une 2ᵉ météo.
 */
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text, TextInput } from "@/components/ui/typography";
import type { CityResult } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  searchCities: (query: string) => Promise<CityResult[]>;
  selectCity: (city: CityResult) => Promise<void>;
  requestDeviceLocation: () => Promise<void>;
};

export function CityPicker({ visible, onClose, searchCities, selectCity, requestDeviceLocation }: Props) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setQuery("");
    setResults([]);
    setError(null);
    onClose();
  };

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await searchCities(query);
      setResults(found);
      if (found.length === 0 && query.trim().length >= 2) setError("Aucune ville trouvée : vérifie l’orthographe.");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Recherche indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const choose = async (city: CityResult) => {
    await selectCity(city);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.overline, { color: colors.muted }]}>Ta ville</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Où pousse ton jardin ?</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.muted }]}>×</Text>
            </Pressable>
          </View>
          <Text style={[styles.intro, { color: colors.muted }]}>Choisis une ville pour adapter la météo et les conseils de culture.</Text>
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Rechercher une ville…" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} />
          <Pressable accessibilityRole="button" onPress={() => void search()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
            <Text style={styles.searchButtonText}>{loading ? "Recherche…" : "Rechercher"}</Text>
          </Pressable>
          {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <View style={styles.results}>
            {results.map((city) => (
              <Pressable key={`${city.id}-${city.latitude}`} accessibilityRole="button" onPress={() => void choose(city)} style={({ pressed }) => [styles.resultRow, { borderColor: colors.border }, pressed && styles.pressed]}>
                <Text style={[styles.resultName, { color: colors.foreground }]}>{city.name}</Text>
                <Text style={[styles.resultMeta, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => { close(); void requestDeviceLocation(); }} style={({ pressed }) => [styles.deviceLink, pressed && styles.pressed]}>
            <Text style={[styles.deviceLinkText, { color: colors.primary }]}>⌖ Utiliser ma position actuelle</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18,22,20,0.35)" },
  card: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32, minHeight: 390 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  overline: { fontSize: 13, fontWeight: "600" },
  title: { fontSize: 23, fontWeight: "800", marginTop: 4 },
  closeButton: { padding: 2 },
  closeText: { fontSize: 28, lineHeight: 28, fontWeight: "300" },
  intro: { fontSize: 12, lineHeight: 18, marginTop: 9, maxWidth: 310 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginTop: 18 },
  searchButton: { alignSelf: "flex-start", borderRadius: 13, paddingHorizontal: 15, paddingVertical: 11, marginTop: 10 },
  searchButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  error: { fontSize: 11, marginTop: 9 },
  results: { marginTop: 10 },
  resultRow: { borderBottomWidth: 1, paddingVertical: 10 },
  resultName: { fontSize: 14, fontWeight: "800" },
  resultMeta: { fontSize: 10, marginTop: 3 },
  deviceLink: { alignSelf: "flex-start", marginTop: 16 },
  deviceLinkText: { fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
