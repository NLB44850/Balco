import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/today/bottom-sheet";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { NORA_LEVELS, NORA_PREFERENCES, togglePreference, type NoraLevel, type NoraMemoryView } from "@/lib/ai/memory";

type MemorySheetProps = {
  visible: boolean;
  onClose: () => void;
  memory: NoraMemoryView | undefined;
  onLevel: (level: NoraLevel) => void;
  onPreferences: (preferences: string[]) => void;
  onForget: (noteId?: string) => void;
};

/** Résumé en une ligne pour la carte de l'écran Nora. */
export function memorySummary(memory: NoraMemoryView | undefined) {
  if (!memory) return "Ton niveau, tes préférences et ce qu'elle retient de vous.";
  const level = NORA_LEVELS.find((item) => item.id === memory.level)?.title ?? "Niveau à choisir";
  const count = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  return [level, memory.preferences.length > 0 ? count(memory.preferences.length, "préférence", "préférences") : null, memory.notes.length > 0 ? count(memory.notes.length, "souvenir", "souvenirs") : null].filter(Boolean).join(" · ");
}

/** Ce que Nora sait de toi : tout se règle d'un toucher, et tout s'oublie. */
export function MemorySheet({ visible, onClose, memory, onLevel, onPreferences, onForget }: MemorySheetProps) {
  const colors = useColors();
  const preferences = memory?.preferences ?? [];
  const notes = memory?.notes ?? [];
  // « Tout oublier » se confirme d'un second toucher : rien ne s'efface par mégarde.
  const [confirmAll, setConfirmAll] = useState(false);
  useEffect(() => {
    if (!visible) setConfirmAll(false);
  }, [visible]);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Ce que Nora sait de toi</Text>
        <Text style={[styles.intro, { color: colors.muted }]}>Elle connaît aussi tes plantes et tout l’historique de tes gestes, pour te dire ce qui a été oublié.</Text>

        <Text style={[styles.section, { color: colors.foreground }]}>Ton niveau</Text>
        <View style={styles.levels}>
          {NORA_LEVELS.map((level) => {
            const selected = memory?.level === level.id;
            return (
              <Pressable key={level.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onLevel(level.id)} style={({ pressed }) => [styles.level, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.leaf : "transparent" }, pressed && styles.pressed]}>
                <Text style={[styles.levelTitle, { color: selected ? colors.primary : colors.foreground }]}>{level.title}</Text>
                <Text style={[styles.levelText, { color: colors.muted }]}>{level.text}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Tes préférences</Text>
        <View style={styles.chips}>
          {NORA_PREFERENCES.map((preference) => {
            const selected = preferences.includes(preference.id);
            return (
              <Pressable key={preference.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => onPreferences(togglePreference(preferences, preference.id))} style={({ pressed }) => [styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }, pressed && styles.pressed]}>
                <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : colors.foreground }]}>{selected ? "✓ " : ""}{preference.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Ce qu’elle a retenu</Text>
        {notes.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>Rien pour l’instant. Parle-lui de toi (un chat, des vacances en août, tes goûts) : elle s’en souviendra.</Text>
        ) : (
          <>
            {[...notes].reverse().map((note) => (
              <View key={note.id} style={[styles.note, { borderBottomColor: colors.border }]}>
                <Text style={[styles.noteText, { color: colors.foreground }]}>{note.text}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Oublier : ${note.text}`} hitSlop={8} onPress={() => onForget(note.id)}>
                  <Text style={[styles.forget, { color: colors.muted }]}>Oublier</Text>
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => { if (confirmAll) { setConfirmAll(false); onForget(); } else setConfirmAll(true); }} style={({ pressed }) => [styles.forgetAll, pressed && styles.pressed]}>
              <Text style={[styles.forgetAllText, { color: colors.warning }]}>{confirmAll ? "Touche encore pour tout effacer" : "Tout oublier"}</Text>
            </Pressable>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { fontSize: 14, lineHeight: 20 },
  section: { fontSize: 16, fontWeight: "700", marginTop: 10 },
  levels: { gap: 8 },
  level: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  levelTitle: { fontSize: 15, fontWeight: "700" },
  levelText: { fontSize: 13, marginTop: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: "600" },
  empty: { fontSize: 14, lineHeight: 20 },
  note: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  noteText: { flex: 1, fontSize: 15, lineHeight: 20 },
  forget: { fontSize: 14, fontWeight: "600" },
  forgetAll: { alignSelf: "flex-start", paddingVertical: 8 },
  forgetAllText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
