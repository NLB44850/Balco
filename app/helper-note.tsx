/**
 * Les consignes pour la personne qui arrose (chantier « Pots et balcon », étape 7) : Balco écrit le texte plante par
 * plante (lib/garden/helper-note.ts), on le relit et on le modifie, puis on l'envoie par le partage du téléphone (SMS,
 * WhatsApp, e-mail). Le brouillon modifié reste sur le téléphone pour ces vacances-là. Ouvert depuis le mode vacances.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Check } from "@/components/ui/check";
import { Text, TextInput } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { useVacation } from "@/hooks/use-vacation";
import { now as clockNow } from "@/lib/clock";
import { useGarden } from "@/lib/garden/garden-context";
import { HELPER_NOTE_SIGNATURE, helperNoteKey, helperNoteMessage, helperNoteText } from "@/lib/garden/helper-note";
import { vacationRange } from "@/lib/garden/vacation";

const DRAFT_KEY = "balco.vacation.helper-note.v1";
type Draft = { key: string; text: string | null; signature: boolean };

export default function HelperNoteScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resolvedPlants, profile, onboarding } = useGarden();
  const { vacation, loaded } = useVacation();
  const { weather } = useLocalWeather();
  const now = useMemo(() => clockNow(), []);

  const generated = useMemo(
    () => (vacation ? helperNoteText({ plants: resolvedPlants, vacation, firstName: profile.firstName, covered: !onboarding?.skipped && onboarding?.covered, todayMaxC: weather.isFallback ? null : weather.snapshot.today.temperatureMaxC, now }) : ""),
    [now, onboarding?.covered, onboarding?.skipped, profile.firstName, resolvedPlants, vacation, weather.isFallback, weather.snapshot.today.temperatureMaxC],
  );
  const key = vacation ? helperNoteKey(vacation) : "";

  // Le texte modifié à la main (null : celui de Balco, qui suit la météo et les plantes).
  const [edited, setEdited] = useState<string | null>(null);
  const [signature, setSignature] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showText, setShowText] = useState(false);
  // La zone grandit avec le texte (la page défile, pas la zone).
  const [inputHeight, setInputHeight] = useState(240);

  useEffect(() => {
    if (!key) return;
    void AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        const draft = raw ? (JSON.parse(raw) as Draft) : null;
        if (draft?.key === key) {
          setEdited(draft.text);
          setSignature(draft.signature);
        }
      })
      .catch(() => undefined)
      .finally(() => setDraftLoaded(true));
  }, [key]);

  const saveDraft = (next: Partial<Draft>) => {
    const draft: Draft = { key, text: edited, signature, ...next };
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => undefined);
  };

  const text = edited ?? generated;
  const message = helperNoteMessage(text, signature);

  const change = (value: string) => {
    setEdited(value);
    saveDraft({ text: value });
  };
  const reset = () => {
    setEdited(null);
    saveDraft({ text: null });
  };
  const toggleSignature = () => {
    setSignature(!signature);
    saveDraft({ signature: !signature });
  };

  const send = async () => {
    try {
      await Share.share({ message });
    } catch {
      // Pas de partage possible (certains navigateurs) : le message s'affiche pour être copié.
      setShowText(true);
    }
  };

  if (loaded && !vacation) {
    return (
      <LightScreen bottom>
        <View style={[styles.content, { paddingTop: insets.top + 14 }]}>
          <ScreenHeader back title="Consignes d’arrosage" subtitle="Indique d’abord les dates de tes vacances" />
          <Button label="Ouvrir le mode vacances" onPress={() => router.replace("/vacation")} />
        </View>
      </LightScreen>
    );
  }

  return (
    <LightScreen bottom>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
          <ScreenHeader back title="Consignes d’arrosage" subtitle={vacation ? `Pour qui arrose ${vacationRange(vacation)}` : ""} />
          {vacation && draftLoaded && (
            <>
              <Text style={[styles.text, { color: colors.muted }]}>Balco a tout écrit, plante par plante. Relis, change ce que tu veux, puis envoie.</Text>
              <View style={[glass.card, styles.editor]}>
                <TextInput
                  accessibilityLabel="Texte des consignes"
                  multiline
                  value={text}
                  onChangeText={change}
                  textAlignVertical="top"
                  scrollEnabled={false}
                  onContentSizeChange={(event) => setInputHeight(Math.max(240, Math.ceil(event.nativeEvent.contentSize.height)))}
                  style={[styles.input, { color: colors.foreground, height: inputHeight }]}
                />
                {signature && <Text style={[styles.signature, { color: colors.muted }]}>{HELPER_NOTE_SIGNATURE}</Text>}
              </View>
              {edited !== null && edited !== generated && (
                <Button variant="secondary" label="Revenir au texte de Balco" onPress={reset} />
              )}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: signature }} accessibilityLabel={`Ajouter « ${HELPER_NOTE_SIGNATURE} » à la fin`} onPress={toggleSignature} style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}>
                <Check checked={signature} />
                <Text style={[styles.text, styles.flex, { color: colors.foreground }]}>Ajouter « {HELPER_NOTE_SIGNATURE} » à la fin</Text>
              </Pressable>
              <Button label="Envoyer les consignes" onPress={() => void send()} />
              {showText && (
                <View style={[glass.card, styles.card]}>
                  <Text style={[styles.small, { color: colors.muted }]}>Copie ce message et envoie-le par SMS ou messagerie :</Text>
                  <Text selectable style={[styles.text, { color: colors.foreground }]}>{message}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: { padding: 16, gap: 10 },
  editor: { padding: 14, gap: 10 },
  input: { fontSize: 15, lineHeight: 21, minHeight: 240, padding: 0 },
  signature: { fontSize: 14 },
  text: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  pressed: { opacity: 0.78 },
});
