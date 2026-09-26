import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type Message = { id: string; from: "bot" | "user"; text: string; time: string };

const quickQuestions = [
  "Quoi planter en avril sur mon balcon ?",
  "Pourquoi les feuilles jaunissent ?",
  "Comment économiser l'eau ?",
];

const answers: Record<string, string> = {
  "Quoi planter en avril sur mon balcon ?": "En avril, mise sur les radis, la menthe et les tomates cerises. Pour ton balcon sud-est, plante aussi du basilic quand les nuits seront plus douces.",
  "Pourquoi les feuilles jaunissent ?": "Souvent, c'est un excès d'eau ou un manque de lumière. Touche la terre : elle doit être sèche sur 2 cm avant le prochain arrosage.",
  "Comment économiser l'eau ?": "Arrose tôt le matin, directement au pied. Un petit paillage avec des écorces ou des feuilles séchées garde l'humidité plus longtemps.",
};

export default function AssistantScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", from: "bot", text: "Bonjour Camille ! Je suis Nora, ton coach pour un balcon vivant et facile à entretenir.", time: "09:41" },
    { id: "prompt", from: "bot", text: "Une question sur tes tomates, ton basilic ou ta menthe ? Je suis là 🌿", time: "09:41" },
  ]);
  const [draft, setDraft] = useState("");

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, from: "user", text: clean, time },
      { id: `${Date.now()}-bot`, from: "bot", text: answers[clean] ?? "Bonne question ! Observe ta plante pendant une journée et dis-moi ce que tu remarques : lumière, terre, feuilles ou petits visiteurs.", time },
    ]);
    setDraft("");
  };

  const header = useMemo(() => (
    <>
      <View style={styles.chatHeader}>
        <View style={[styles.noraAvatar, { backgroundColor: colors.leaf }]}><Text style={styles.noraEmoji}>✦</Text></View>
        <View style={styles.chatHeaderCopy}>
          <Text style={[styles.chatTitle, { color: colors.foreground }]}>Nora</Text>
          <View style={styles.onlineRow}><View style={[styles.onlineDot, { backgroundColor: colors.success }]} /><Text style={[styles.onlineText, { color: colors.muted }]}>Coach balcon · en ligne</Text></View>
        </View>
        <Pressable style={({ pressed }) => [styles.moreButton, { borderColor: colors.border }, pressed && styles.pressed]} onPress={() => {}}><Text style={[styles.moreText, { color: colors.muted }]}>•••</Text></Pressable>
      </View>
      <LinearGradient colors={[colors.cream, "#FFE2CE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.introCard}>
        <Text style={[styles.introLabel, { color: colors.terracotta }]}>COACH JARDINAGE URBAIN</Text>
        <Text style={[styles.introText, { color: colors.foreground }]}>Des réponses simples, naturelles et adaptées à ton petit espace.</Text>
      </LinearGradient>
      <Text style={[styles.quickLabel, { color: colors.muted }]}>QUESTIONS RAPIDES</Text>
      <FlatList
        data={quickQuestions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.quickList}
        renderItem={({ item }) => (
          <Pressable onPress={() => sendMessage(item)} style={({ pressed }) => [styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.quickChipText, { color: colors.primary }]}>{item}</Text>
          </Pressable>
        )}
      />
    </>
  ), [colors]);

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.from === "user" && styles.messageRowUser]}>
              {item.from === "bot" && <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>N</Text></View>}
              <View style={[styles.bubble, item.from === "bot" ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.primary }, item.from === "user" && styles.userBubble]}>
                <Text style={[styles.messageText, { color: item.from === "bot" ? colors.foreground : "#FFFFFF" }]}>{item.text}</Text>
                <Text style={[styles.messageTime, { color: item.from === "bot" ? colors.muted : "rgba(255,255,255,0.7)" }]}>{item.time}</Text>
              </View>
            </View>
          )}
        />
        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écris à Nora…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.foreground }]}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(draft)}
          />
          <Pressable onPress={() => sendMessage(draft)} accessibilityLabel="Envoyer" style={({ pressed }) => [styles.sendButton, { backgroundColor: draft.trim() ? colors.terracotta : colors.leaf }, pressed && styles.pressed]}>
            <Text style={[styles.sendText, { color: draft.trim() ? "#FFFFFF" : colors.primary }]}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 15, paddingBottom: 16, gap: 12 },
  chatHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  noraAvatar: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  noraEmoji: { fontSize: 25, color: "#2E6B4D" },
  chatHeaderCopy: { marginLeft: 12, flex: 1 },
  chatTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  onlineRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11 },
  moreButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 15, letterSpacing: 2, marginBottom: 7 },
  introCard: { padding: 16, borderRadius: 20, marginBottom: 16, shadowColor: "#C56D52", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  introLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  introText: { fontSize: 14, lineHeight: 20, fontWeight: "700", marginTop: 5, maxWidth: 285 },
  quickLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1, marginBottom: 1 },
  quickList: { gap: 8, paddingBottom: 8 },
  quickChip: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, maxWidth: 215 },
  quickChipText: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 2 },
  messageRowUser: { justifyContent: "flex-end" },
  smallAvatar: { width: 24, height: 24, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  bubble: { borderRadius: 18, borderWidth: 1, padding: 13, maxWidth: "82%", borderBottomLeftRadius: 5, shadowColor: "#9B7D67", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  userBubble: { borderBottomLeftRadius: 18, borderBottomRightRadius: 5 },
  messageText: { fontSize: 13, lineHeight: 19, fontWeight: "500" },
  messageTime: { fontSize: 9, marginTop: 6, textAlign: "right" },
  composer: { minHeight: 54, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingLeft: 15, paddingRight: 6, marginBottom: 9 },
  input: { flex: 1, fontSize: 13, paddingVertical: 11 },
  sendButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sendText: { fontSize: 25, fontWeight: "800", marginTop: -4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
