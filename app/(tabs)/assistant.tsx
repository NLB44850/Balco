import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { quotaLabel } from "@/lib/ai/quota-text";
import { useGarden } from "@/lib/garden/garden-context";
import { trpc } from "@/lib/trpc";

/** « notice » : message de l'app (erreur, quota), affiché mais jamais envoyé à Nora. */
type Message = { id: string; from: "bot" | "user" | "notice"; text: string; time: string };

const HISTORY_STORAGE_KEY = "balco.assistant.history.v1";
const MAX_STORED_MESSAGES = 40;

const quickQuestions = [
  "Quoi planter en avril sur mon balcon ?",
  "Pourquoi les feuilles jaunissent ?",
  "Comment économiser l'eau ?",
];

function clock(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const { account, profile } = useGarden();
  const utils = trpc.useUtils();
  const status = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const ask = trpc.ai.ask.useMutation({ onSuccess: () => void utils.ai.status.invalidate() });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_STORAGE_KEY)
      .then((stored) => setMessages(stored ? (JSON.parse(stored) as Message[]) : []))
      .catch(() => setMessages([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))).catch(() => undefined);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [loaded, messages]);

  const chat = status.data?.chat;
  const unavailable = status.data?.available === false;
  const noQuestionsLeft = chat ? chat.remaining <= 0 : false;
  const canAsk = account.signedIn && !unavailable && !noQuestionsLeft && !ask.isPending;
  const firstName = profile.firstName?.trim();

  const welcome: Message[] = [
    { id: "welcome", from: "bot", text: `Bonjour${firstName ? ` ${firstName}` : ""} ! Je suis Nora, ta coach pour un balcon vivant et facile à entretenir.`, time: "" },
    { id: "prompt", from: "bot", text: account.signedIn ? "Pose-moi une question sur tes plantes, ton exposition ou la saison : je connais ton balcon 🌿" : "Connecte-toi pour me poser tes questions : je réponds en tenant compte de tes plantes et de ta ville 🌿", time: "" },
  ];

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (!account.signedIn) {
      router.push("/login");
      return;
    }
    if (!canAsk) return;
    const userMessage: Message = { id: `${Date.now()}-user`, from: "user", text: clean, time: clock() };
    const next = [...messages, userMessage];
    setMessages(next);
    setDraft("");
    // Seuls les vrais échanges partent (pas les notices), en commençant par une question.
    const history = next.filter((message) => message.from !== "notice").map((message) => ({ role: message.from === "user" ? ("user" as const) : ("assistant" as const), content: message.text.slice(0, 2000) }));
    ask.mutate({ messages: history }, {
      onSuccess: (result) => setMessages((current) => [...current, { id: `${Date.now()}-bot`, from: "bot", text: result.answer, time: clock() }]),
      onError: (error) => setMessages((current) => [...current, { id: `${Date.now()}-notice`, from: "notice", text: error.message, time: clock() }]),
    });
  };

  const clearConversation = () => {
    setMessages([]);
    ask.reset();
  };

  const header = (
    <>
      <View style={styles.chatHeader}>
        <View style={[styles.noraAvatar, { backgroundColor: colors.leaf }]}><Text style={styles.noraEmoji}>✦</Text></View>
        <View style={styles.chatHeaderCopy}>
          <Text style={[styles.chatTitle, { color: colors.foreground }]}>Nora</Text>
          <View style={styles.onlineRow}><View style={[styles.onlineDot, { backgroundColor: unavailable ? colors.muted : colors.success }]} /><Text style={[styles.onlineText, { color: colors.muted }]}>{unavailable ? "Coach balcon · bientôt disponible" : "Coach balcon · IA"}</Text></View>
        </View>
        {messages.length > 0 && <Pressable accessibilityLabel="Effacer la conversation" style={({ pressed }) => [styles.moreButton, { borderColor: colors.border }, pressed && styles.pressed]} onPress={clearConversation}><Text style={[styles.clearText, { color: colors.muted }]}>Effacer</Text></Pressable>}
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
          <Pressable disabled={account.signedIn && !canAsk} onPress={() => send(item)} style={({ pressed }) => [styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.quickChipText, { color: colors.primary }]}>{item}</Text>
          </Pressable>
        )}
      />
    </>
  );

  const footer = ask.isPending ? (
    <View style={styles.messageRow}>
      <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>N</Text></View>
      <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.messageText, { color: colors.muted }]}>Nora réfléchit…</Text></View>
    </View>
  ) : null;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={[...welcome, ...messages]}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => item.from === "notice" ? (
            <Text accessibilityRole="alert" style={[styles.notice, { color: colors.terracotta, backgroundColor: colors.cream }]}>{item.text}</Text>
          ) : (
            <View style={[styles.messageRow, item.from === "user" && styles.messageRowUser]}>
              {item.from === "bot" && <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>N</Text></View>}
              <View style={[styles.bubble, item.from === "bot" ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.primary }, item.from === "user" && styles.userBubble]}>
                <Text selectable style={[styles.messageText, { color: item.from === "bot" ? colors.foreground : "#FFFFFF" }]}>{item.text}</Text>
                {!!item.time && <Text style={[styles.messageTime, { color: item.from === "bot" ? colors.muted : "rgba(255,255,255,0.7)" }]}>{item.time}</Text>}
              </View>
            </View>
          )}
        />
        {account.signedIn ? (
          <>
            {chat && <Text style={[styles.quota, { color: noQuestionsLeft ? colors.terracotta : colors.muted }]}>{unavailable ? "Nora arrive bientôt dans une mise à jour." : quotaLabel(chat)}</Text>}
            <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                editable={!unavailable && !noQuestionsLeft}
                placeholder={noQuestionsLeft ? "Plus de question ce mois-ci" : "Écris à Nora…"}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.foreground }]}
                maxLength={2000}
                returnKeyType="send"
                onSubmitEditing={() => send(draft)}
              />
              <Pressable disabled={!canAsk || !draft.trim()} onPress={() => send(draft)} accessibilityLabel="Envoyer" style={({ pressed }) => [styles.sendButton, { backgroundColor: draft.trim() && canAsk ? colors.terracotta : colors.leaf }, pressed && styles.pressed]}>
                <Text style={[styles.sendText, { color: draft.trim() && canAsk ? "#FFFFFF" : colors.primary }]}>↑</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => router.push("/login")} style={({ pressed }) => [styles.loginBar, { backgroundColor: colors.terracotta }, pressed && styles.pressed]}>
            <Text style={styles.loginBarText}>Se connecter pour discuter avec Nora</Text>
          </Pressable>
        )}
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
  moreButton: { height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  clearText: { fontSize: 10, fontWeight: "800" },
  notice: { fontSize: 12, lineHeight: 18, fontWeight: "700", borderRadius: 14, padding: 12, overflow: "hidden" },
  quota: { fontSize: 10, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  loginBar: { borderRadius: 19, paddingVertical: 16, alignItems: "center", marginBottom: 9 },
  loginBarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
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
