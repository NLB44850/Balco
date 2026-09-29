import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput as RNTextInput } from "react-native";
import { Text, TextInput } from "@/components/ui/typography";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { SignInResult } from "@/hooks/use-auth";
import { useGarden } from "@/lib/garden/garden-context";
import { trpc } from "@/lib/trpc";

// Termine la fenêtre de connexion Google sur le web.
WebBrowser.maybeCompleteAuthSession();

const RESEND_DELAY_S = 30;
const GOOGLE_CLIENT_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
const googleConfiguredHere = Boolean(Platform.select({ ios: GOOGLE_CLIENT_IDS.iosClientId, android: GOOGLE_CLIENT_IDS.androidClientId, default: GOOGLE_CLIENT_IDS.webClientId }));

function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message || /fetch|network|Network request failed/i.test(message)) return "Impossible de joindre Balco. Vérifie ta connexion et réessaie.";
  return message;
}

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { completeSignIn } = useGarden();
  const utils = trpc.useUtils();
  const providers = trpc.auth.providers.useQuery(undefined, { retry: false });
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const submittedCode = useRef<string | null>(null);
  const codeInput = useRef<RNTextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

  const finish = async (result: SignInResult) => {
    await completeSignIn(result);
    close();
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () => run(async () => {
    await utils.client.auth.requestEmailCode.mutate({ email: email.trim() });
    setStep("code");
    setCode("");
    submittedCode.current = null;
    setResendIn(RESEND_DELAY_S);
  });

  const verifyCode = (value: string) => {
    if (submittedCode.current === value) return;
    submittedCode.current = value;
    void run(async () => {
      try {
        await finish(await utils.client.auth.verifyEmailCode.mutate({ email: email.trim(), code: value }));
      } catch (caught) {
        submittedCode.current = null;
        throw caught;
      }
    });
  };

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verifyCode(digits);
  };

  const signInWithApple = () => run(async () => {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error("Apple n’a pas renvoyé d’identité.");
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ") || null;
      await finish(await utils.client.auth.signInWithApple.mutate({ identityToken: credential.identityToken, nonce: rawNonce, fullName }));
    } catch (caught) {
      // Fermer la fenêtre Apple n'est pas une erreur.
      if ((caught as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      throw caught;
    }
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showApple = appleAvailable && providers.data?.apple;
  const showGoogle = googleConfiguredHere && providers.data?.google;

  return (
    <LightScreen bottom>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
          <View style={styles.header}>
            {step === "code" ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Changer d’adresse" hitSlop={8} onPress={() => { setStep("email"); setError(null); }} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
                <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
              </Pressable>
            ) : <View />}
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8} onPress={close} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
              <Text style={[styles.closeText, { color: colors.foreground }]}>×</Text>
            </Pressable>
          </View>

          <View style={[styles.badge, { backgroundColor: colors.leaf }]}><Text style={styles.badgeEmoji}>{step === "email" ? "🪴" : "✉️"}</Text></View>

          {step === "email" ? (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Retrouve ton balcon partout.</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Pas de mot de passe : on t’envoie un code par e-mail. Tes plantes et ton historique te suivront sur tous tes téléphones.</Text>
              <View style={[glass.card, styles.field]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Ton adresse e-mail</Text>
                <TextInput
                  value={email}
                  onChangeText={(value) => { setEmail(value); setError(null); }}
                  onSubmitEditing={() => emailValid && void sendCode()}
                  placeholder="ton@adresse.fr"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  autoFocus
                  accessibilityLabel="Adresse e-mail"
                  style={[styles.input, { borderColor: emailValid ? colors.primary : colors.border, color: colors.foreground }]}
                />
              </View>
              <Pressable accessibilityRole="button" disabled={!emailValid || busy} onPress={() => void sendCode()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: emailValid ? colors.primary : "rgba(18,22,20,0.12)" }, pressed && styles.pressed]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.primaryText, !emailValid && { color: colors.muted }]}>Recevoir mon code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Regarde tes e-mails.</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Un code à 6 chiffres vient de partir vers <Text style={{ color: colors.foreground, fontWeight: "700" }}>{email.trim()}</Text>. Il est valable 10 minutes. Pense aux indésirables s’il n’arrive pas.</Text>
              {/* Six cases qui se remplissent au fur et à mesure ; le vrai champ est dessous, invisible. */}
              <Pressable accessibilityRole="none" onPress={() => codeInput.current?.focus()} style={styles.codeRow}>
                {Array.from({ length: 6 }, (_, index) => {
                  const digit = code[index];
                  const current = index === code.length && !busy;
                  return (
                    <View key={index} style={[glass.card, styles.codeBox, { borderColor: current ? colors.primary : digit ? "rgba(31,122,77,0.35)" : "rgba(18,22,20,0.12)", borderWidth: current ? 2 : 1 }]}>
                      <Text style={[styles.codeDigit, { color: colors.foreground }]}>{digit ?? ""}</Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={codeInput}
                  value={code}
                  onChangeText={onCodeChange}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                  caretHidden
                  accessibilityLabel="Code reçu par e-mail"
                  style={styles.hiddenInput}
                />
              </Pressable>
              {busy ? (
                <View style={styles.checking}><ActivityIndicator color={colors.primary} /><Text style={[styles.subtitle, { color: colors.muted }]}>Vérification…</Text></View>
              ) : (
                <Text style={[styles.hint, { color: colors.muted }]}>La connexion se fait dès le 6ᵉ chiffre.</Text>
              )}
              <View style={styles.linksRow}>
                <Pressable accessibilityRole="button" disabled={resendIn > 0 || busy} onPress={() => void sendCode()} hitSlop={6}><Text style={[styles.link, { color: resendIn > 0 ? colors.muted : colors.primary }]}>{resendIn > 0 ? `Renvoyer le code (${resendIn} s)` : "Renvoyer le code"}</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => { setStep("email"); setError(null); }} hitSlop={6}><Text style={[styles.link, { color: colors.primary }]}>Changer d’adresse</Text></Pressable>
              </View>
            </>
          )}

          {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error, backgroundColor: "rgba(255,255,255,0.85)" }]}>{error}</Text>}

          {step === "email" && (showApple || showGoogle) && (
            <>
              <View style={styles.dividerRow}><View style={[styles.divider, { backgroundColor: colors.border }]} /><Text style={[styles.dividerText, { color: colors.muted }]}>ou</Text><View style={[styles.divider, { backgroundColor: colors.border }]} /></View>
              {showApple && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={16}
                  style={styles.appleButton}
                  onPress={() => void signInWithApple()}
                />
              )}
              {showGoogle && <GoogleButton disabled={busy} onToken={(idToken) => run(async () => finish(await utils.client.auth.signInWithGoogle.mutate({ idToken })))} />}
            </>
          )}

          <Text style={[styles.legal, { color: colors.muted }]}>En continuant, tu acceptes que Balco conserve ton adresse e-mail et les données de ton balcon pour les synchroniser. Tu peux supprimer ton compte à tout moment depuis Réglages.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LightScreen>
  );
}

/** Monté seulement si un client Google existe pour cette plateforme : le hook l'exige. */
function GoogleButton({ disabled, onToken }: { disabled: boolean; onToken: (idToken: string) => void }) {
  const colors = useColors();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(GOOGLE_CLIENT_IDS);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    // Une réponse Google ne doit ouvrir la session qu'une fois, même si l'écran se redessine.
    if (response?.type !== "success" || handled.current === response) return;
    handled.current = response;
    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (idToken) onToken(idToken);
  }, [onToken, response]);

  return (
    <Pressable accessibilityRole="button" disabled={!request || disabled} onPress={() => void promptAsync()} style={({ pressed }) => [glass.card, styles.googleButton, { borderColor: colors.border }, pressed && styles.pressed]}>
      <Text style={styles.googleG}>G</Text>
      <Text style={[styles.googleText, { color: colors.foreground }]}>Continuer avec Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)" },
  closeText: { fontSize: 24, marginTop: -2 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 12 },
  badgeEmoji: { fontSize: 26 },
  title: { fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  field: { padding: 15, gap: 8, marginTop: 4 },
  label: { fontSize: 14, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 17, backgroundColor: "#FFFFFF" },
  codeRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 6 },
  codeBox: { flex: 1, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  codeDigit: { fontSize: 26, fontWeight: "800" },
  hiddenInput: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.02, color: "transparent" },
  checking: { flexDirection: "row", alignItems: "center", gap: 10 },
  hint: { fontSize: 13 },
  primaryButton: { borderRadius: 16, paddingVertical: 15, alignItems: "center", minHeight: 52, justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  linksRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  link: { fontSize: 14, fontWeight: "700" },
  error: { fontSize: 14, fontWeight: "600", lineHeight: 20, borderRadius: 12, padding: 12, overflow: "hidden" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: "600" },
  appleButton: { height: 52, width: "100%" },
  googleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 16 },
  googleG: { fontSize: 18, fontWeight: "900", color: "#4285F4" },
  googleText: { fontSize: 15, fontWeight: "700" },
  legal: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
