import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { MemorySheet, memorySummary } from "@/components/nora/memory-sheet";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { useColors } from "@/hooks/use-colors";
import { isNoraLevel, type NoraMemoryView } from "@/lib/ai/memory";
import { quickQuestions } from "@/lib/ai/quick-questions";
import { quotaLabel } from "@/lib/ai/quota-text";
import { useGarden } from "@/lib/garden/garden-context";
import { trpc } from "@/lib/trpc";

/**
 * « notice » : message de l'app (erreur, quota) ; « memory » : ce que Nora vient de retenir ou
 * d'oublier. Affichés, mais jamais renvoyés à Nora.
 */
type Message = { id: string; from: "bot" | "user" | "notice" | "memory"; text: string; time: string; noteId?: string };

const HISTORY_STORAGE_KEY = "balco.assistant.history.v1";
const MAX_STORED_MESSAGES = 40;

function clock(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account, profile, resolvedPlants, onboarding, updateOnboarding, syncNow } = useGarden();
  // Des questions prêtes, tirées de tes plantes et de la saison : rien à écrire.
  const questions = useMemo(() => quickQuestions(resolvedPlants), [resolvedPlants]);
  const utils = trpc.useUtils();
  const status = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const memory = trpc.ai.memory.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const ask = trpc.ai.ask.useMutation({ onSuccess: () => void utils.ai.status.invalidate() });
  const setMemory = (view: NoraMemoryView) => utils.ai.memory.setData(undefined, view);
  const updateMemory = trpc.ai.updateMemory.useMutation({ onSuccess: setMemory, onError: () => void utils.ai.memory.invalidate() });
  const forget = trpc.ai.forget.useMutation({ onSuccess: setMemory, onError: () => void utils.ai.memory.invalidate() });
  const [memoryOpen, setMemoryOpen] = useState(false);
  // Envoi des derniers gestes au serveur, juste avant la question.
  const [syncing, setSyncing] = useState(false);
  // Le niveau est l'expérience choisie à l'accueil (modifiable aussi dans Réglages) : une seule source.
  const memoryView = memory.data ? { ...memory.data, level: isNoraLevel(onboarding?.experience) ? onboarding.experience : memory.data.level } : undefined;
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
  const canAsk = account.signedIn && !unavailable && !noQuestionsLeft && !ask.isPending && !syncing;
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
    // Seuls les vrais échanges partent (ni notices ni souvenirs), en commençant par une question.
    const history = next.filter((message) => message.from === "user" || message.from === "bot").map((message) => ({ role: message.from === "user" ? ("user" as const) : ("assistant" as const), content: message.text.slice(0, 2000) }));
    // Les derniers gestes et la ville partent d'abord : Nora répond sur un balcon à jour.
    setSyncing(true);
    void syncNow().catch(() => undefined).finally(() => ask.mutate({ messages: history }, {
      onSuccess: (result) => {
        const now = Date.now();
        setMessages((current) => [
          ...current,
          { id: `${now}-bot`, from: "bot", text: result.answer, time: clock() },
          ...result.remembered.map((note): Message => ({ id: `${now}-memory-${note.id}`, from: "memory", text: `Nora a retenu : ${note.text}`, time: "", noteId: note.id })),
          ...result.forgotten.map((note): Message => ({ id: `${now}-forgot-${note.id}`, from: "memory", text: `Nora a oublié : ${note.text}`, time: "" })),
        ]);
        if (result.remembered.length > 0 || result.forgotten.length > 0) void utils.ai.memory.invalidate();
      },
      onError: (error) => setMessages((current) => [...current, { id: `${Date.now()}-notice`, from: "notice", text: error.message, time: clock() }]),
      onSettled: () => setSyncing(false),
    }));
  };

  const changePreferences = (preferences: string[]) => {
    // Retour immédiat : l'écran change tout de suite, le serveur suit.
    if (memory.data) setMemory({ ...memory.data, preferences });
    updateMemory.mutate({ preferences });
  };

  const forgetNote = (noteId?: string) => {
    if (memory.data) setMemory({ ...memory.data, notes: noteId ? memory.data.notes.filter((note) => note.id !== noteId) : [] });
    forget.mutate({ noteId });
    if (noteId) setMessages((current) => current.map((message) => (message.noteId === noteId ? { ...message, text: message.text.replace("Nora a retenu", "Oublié"), noteId: undefined } : message)));
  };

  const clearConversation = () => {
    setMessages([]);
    ask.reset();
  };

  const header = (
    <>
      <ScreenHeader
        title="Nora"
        subtitle={unavailable ? "Ta coach balcon · bientôt disponible" : resolvedPlants.length > 0 ? `Ta coach, qui connaît tes ${resolvedPlants.length > 1 ? `${resolvedPlants.length} plantes` : "plante"}` : "Ta coach balcon"}
        right={messages.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Effacer la conversation" hitSlop={8} onPress={clearConversation} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}><Text style={[styles.clearText, { color: colors.muted }]}>Effacer</Text></Pressable> : undefined}
        style={styles.header}
      />
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/scanner")} style={({ pressed }) => [glass.card, styles.observe, pressed && styles.pressed]}>
        <View style={[styles.observeIcon, { backgroundColor: colors.leaf }]}><Text style={styles.observeEmoji}>📷</Text></View>
        <View style={styles.flex}>
          <Text style={[styles.observeTitle, { color: colors.foreground }]}>Observer une plante</Text>
          <Text style={[styles.observeText, { color: colors.muted }]}>Une photo pour reconnaître une pousse ou soigner une feuille abîmée.</Text>
        </View>
        <Text style={[styles.observeArrow, { color: colors.muted }]}>›</Text>
      </Pressable>
      {account.signedIn && !unavailable && (
        <Pressable accessibilityRole="button" onPress={() => setMemoryOpen(true)} style={({ pressed }) => [glass.card, styles.observe, pressed && styles.pressed]}>
          <View style={[styles.observeIcon, { backgroundColor: colors.leaf }]}><Text style={styles.observeEmoji}>💭</Text></View>
          <View style={styles.flex}>
            <Text style={[styles.observeTitle, { color: colors.foreground }]}>Nora se souvient de toi</Text>
            <Text style={[styles.observeText, { color: colors.muted }]}>{memorySummary(memoryView)}</Text>
          </View>
          <Text style={[styles.observeArrow, { color: colors.muted }]}>›</Text>
        </Pressable>
      )}
      <Text style={[styles.quickLabel, { color: colors.muted }]}>{resolvedPlants.length > 0 ? "Pour ton balcon, en ce moment" : "Pour commencer"}</Text>
      <FlatList
        data={questions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.quickList}
        renderItem={({ item }) => (
          <Pressable disabled={account.signedIn && !canAsk} onPress={() => send(item)} style={({ pressed }) => [glass.soft, styles.quickChip, pressed && styles.pressed]}>
            <Text style={[styles.quickChipText, { color: colors.primary }]}>{item}</Text>
          </Pressable>
        )}
      />
    </>
  );

  const footer = ask.isPending || syncing ? (
    <View style={styles.messageRow}>
      <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>N</Text></View>
      <View style={[glass.card, styles.bubble]}><Text style={[styles.messageText, { color: colors.muted }]}>Nora réfléchit…</Text></View>
    </View>
  ) : null;

  return (
    <LightScreen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={[...welcome, ...messages]}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
          renderItem={({ item }) => item.from === "memory" ? (
            <View style={[glass.soft, styles.memoryRow]}>
              <Text style={[styles.memoryText, { color: colors.muted }]}>💭 {item.text}</Text>
              {item.noteId && (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => forgetNote(item.noteId)}>
                  <Text style={[styles.memoryForget, { color: colors.primary }]}>Oublier</Text>
                </Pressable>
              )}
            </View>
          ) : item.from === "notice" ? (
            <Text accessibilityRole="alert" style={[styles.notice, { color: colors.warning, backgroundColor: "rgba(255,255,255,0.8)" }]}>{item.text}</Text>
          ) : (
            <View style={[styles.messageRow, item.from === "user" && styles.messageRowUser]}>
              {item.from === "bot" && <View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>N</Text></View>}
              <View style={[item.from === "bot" ? glass.card : { backgroundColor: colors.primary, borderRadius: 18 }, styles.bubble, item.from === "user" && styles.userBubble]}>
                <Text selectable style={[styles.messageText, { color: item.from === "bot" ? colors.foreground : "#FFFFFF" }]}>{item.text}</Text>
                {!!item.time && <Text style={[styles.messageTime, { color: item.from === "bot" ? colors.muted : "rgba(255,255,255,0.7)" }]}>{item.time}</Text>}
              </View>
            </View>
          )}
        />
        {account.signedIn ? (
          <>
            {chat && <Text style={[styles.quota, { color: noQuestionsLeft ? colors.warning : colors.muted }]}>{unavailable ? "Nora arrive bientôt dans une mise à jour." : quotaLabel(chat)}</Text>}
            <View style={[glass.card, styles.composer]}>
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
              <Pressable disabled={!canAsk || !draft.trim()} onPress={() => send(draft)} accessibilityLabel="Envoyer" style={({ pressed }) => [styles.sendButton, { backgroundColor: draft.trim() && canAsk ? colors.primary : colors.leaf }, pressed && styles.pressed]}>
                <Text style={[styles.sendText, { color: draft.trim() && canAsk ? "#FFFFFF" : colors.primary }]}>↑</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => router.push("/login")} style={({ pressed }) => [styles.loginBar, { backgroundColor: colors.foreground }, pressed && styles.pressed]}>
            <Text style={styles.loginBarText}>Se connecter pour discuter avec Nora</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
      <MemorySheet visible={memoryOpen} onClose={() => setMemoryOpen(false)} memory={memoryView} onLevel={(level) => void updateOnboarding({ experience: level })} onPreferences={changePreferences} onForget={forgetNote} />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { marginBottom: 14 },
  clearButton: { paddingHorizontal: 6, paddingVertical: 8 },
  observe: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 12 },
  memoryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, alignSelf: "flex-start", maxWidth: "92%", marginLeft: 32 },
  memoryText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  memoryForget: { fontSize: 13, fontWeight: "700" },
  observeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  observeEmoji: { fontSize: 20 },
  observeTitle: { fontSize: 16, fontWeight: "700" },
  observeText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  observeArrow: { fontSize: 26, fontWeight: "300" },
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  clearText: { fontSize: 14, fontWeight: "600" },
  notice: { fontSize: 13, lineHeight: 18, fontWeight: "600", borderRadius: 14, padding: 12, overflow: "hidden" },
  quota: { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 6, marginHorizontal: 20 },
  loginBar: { borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12, marginHorizontal: 20 },
  loginBarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  quickLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2, marginTop: 6 },
  quickList: { gap: 8, paddingBottom: 8 },
  quickChip: { paddingHorizontal: 13, paddingVertical: 10, maxWidth: 230 },
  quickChipText: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 2 },
  messageRowUser: { justifyContent: "flex-end" },
  smallAvatar: { width: 24, height: 24, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  smallAvatarText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  bubble: { padding: 13, maxWidth: "82%", borderBottomLeftRadius: 5 },
  userBubble: { borderBottomLeftRadius: 18, borderBottomRightRadius: 5 },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageTime: { fontSize: 11, marginTop: 6, textAlign: "right" },
  composer: { minHeight: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 7, marginBottom: 12, marginHorizontal: 20 },
  input: { flex: 1, fontSize: 15, paddingVertical: 11 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sendText: { fontSize: 25, fontWeight: "800", marginTop: -4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
