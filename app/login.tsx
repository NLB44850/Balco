import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
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
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.overline, { color: colors.terracotta }]}>MON COMPTE BALCO</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.closeText, { color: colors.foreground }]}>×</Text>
            </Pressable>
          </View>

          {step === "email" ? (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Retrouve ton balcon partout.</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Pas de mot de passe : on t’envoie un code par e-mail. Tes plantes et ton historique te suivront sur tous tes téléphones.</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => emailValid && void sendCode()}
                placeholder="ton@adresse.fr"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                accessibilityLabel="Adresse e-mail"
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              />
              <Pressable disabled={!emailValid || busy} onPress={() => void sendCode()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: emailValid ? colors.terracotta : colors.border }, pressed && styles.pressed]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Recevoir un code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Vérifie tes e-mails.</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Un code à 6 chiffres vient de partir vers {email.trim()}. Il est valable 10 minutes.</Text>
              <TextInput
                value={code}
                onChangeText={onCodeChange}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                accessibilityLabel="Code reçu par e-mail"
                style={[styles.input, styles.codeInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              />
              <Pressable disabled={code.length !== 6 || busy} onPress={() => verifyCode(code)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: code.length === 6 ? colors.terracotta : colors.border }, pressed && styles.pressed]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Me connecter</Text>}
              </Pressable>
              <View style={styles.linksRow}>
                <Pressable disabled={resendIn > 0 || busy} onPress={() => void sendCode()}><Text style={[styles.link, { color: resendIn > 0 ? colors.muted : colors.primary }]}>{resendIn > 0 ? `Renvoyer le code (${resendIn} s)` : "Renvoyer le code"}</Text></Pressable>
                <Pressable onPress={() => { setStep("email"); setError(null); }}><Text style={[styles.link, { color: colors.primary }]}>Changer d’adresse</Text></Pressable>
              </View>
            </>
          )}

          {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text>}

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

          <Text style={[styles.legal, { color: colors.muted }]}>En continuant, tu acceptes que Balco conserve ton adresse e-mail et les données de ton balcon pour les synchroniser. Tu peux supprimer ton compte à tout moment depuis ton profil.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
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
    <Pressable disabled={!request || disabled} onPress={() => void promptAsync()} style={({ pressed }) => [styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}>
      <Text style={styles.googleG}>G</Text>
      <Text style={[styles.googleText, { color: colors.foreground }]}>Continuer avec Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  overline: { fontSize: 9, letterSpacing: 1.1, fontWeight: "800" },
  closeButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, marginTop: -2 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, marginTop: 6 },
  codeInput: { fontSize: 26, letterSpacing: 8, textAlign: "center", fontWeight: "800" },
  primaryButton: { borderRadius: 16, paddingVertical: 15, alignItems: "center", minHeight: 50, justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  linksRow: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontSize: 13, fontWeight: "800" },
  error: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: "700" },
  appleButton: { height: 50, width: "100%" },
  googleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 16, height: 50 },
  googleG: { fontSize: 18, fontWeight: "900", color: "#4285F4" },
  googleText: { fontSize: 15, fontWeight: "700" },
  legal: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
