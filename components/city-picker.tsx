/**
 * Choisir la ville du balcon (feuille du bas) : position du téléphone ou recherche par nom (Open-Meteo). Le même écran
 * pour Saisons (« ⌖ Paris »), le bandeau « Météo de Paris par défaut » d'Aujourd'hui et Réglages.
 * Les actions viennent de l'écran qui l'ouvre (`useLocalWeather`), pour ne pas lancer une 2ᵉ météo.
 */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { SheetHeading } from "@/components/settings/rows";
import { BottomSheet } from "@/components/today/bottom-sheet";
import { Text, TextInput } from "@/components/ui/typography";
import type { CityResult } from "@/hooks/use-local-weather";
import { useColors } from "@/hooks/use-colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  searchCities: (query: string) => Promise<CityResult[]>;
  selectCity: (city: CityResult) => Promise<void>;
  requestDeviceLocation: () => Promise<unknown>;
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
    <BottomSheet visible={visible} onClose={close}>
      <SheetHeading title="Où est ton balcon ?" intro="Pour te prévenir du gel, de la pluie et de la chaleur chez toi." />
      <Pressable accessibilityRole="button" onPress={() => { close(); void requestDeviceLocation(); }} style={({ pressed }) => [styles.deviceButton, { borderColor: colors.primary }, pressed && styles.pressed]}>
        <Text style={[styles.deviceButtonText, { color: colors.primary }]}>⌖  Utiliser ma position</Text>
      </Pressable>
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Cherche ta ville" placeholderTextColor={colors.muted} returnKeyType="search" style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} />
        <Pressable accessibilityRole="button" onPress={() => void search()} style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <Text style={styles.searchButtonText}>{loading ? "Recherche…" : "Rechercher"}</Text>
        </Pressable>
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      <View style={styles.results}>
        {results.map((city) => (
          <Pressable key={`${city.id}-${city.latitude}`} accessibilityRole="button" onPress={() => void choose(city)} style={({ pressed }) => [styles.resultRow, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.resultName, { color: colors.foreground }]}>{city.name}</Text>
            <Text style={[styles.resultMeta, { color: colors.muted }]}>{[city.admin1, city.country].filter(Boolean).join(" · ")}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  deviceButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 8 },
  deviceButtonText: { fontSize: 15, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  searchButton: { borderRadius: 14, paddingHorizontal: 15, justifyContent: "center" },
  searchButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  error: { fontSize: 13, marginTop: 9 },
  results: { marginTop: 6 },
  resultRow: { borderBottomWidth: 1, paddingVertical: 12 },
  resultName: { fontSize: 15, fontWeight: "700" },
  resultMeta: { fontSize: 12, marginTop: 3 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
