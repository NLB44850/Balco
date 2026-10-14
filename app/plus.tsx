/**
 * L'écran Balco+ (chantier « Pots et balcon », étape 10) : ce que l'offre ajoute, l'annuel mis en avant, l'essai, la
 * pause et le prix fondateur. Ouvert depuis Réglages et par les déclencheurs (`from`) : 2ᵉ photo du mois, 6ᵉ question à
 * Nora, premier soir de gel, coach d'arrosage. Le paiement n'est pas branché : « Me prévenir à l'ouverture ».
 */
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { Button, PRESSED } from "@/components/ui/button";
import { Check } from "@/components/ui/check";
import { glass } from "@/components/ui/glass";
import { Text, TextInput } from "@/components/ui/typography";
import { useBalcoPlus } from "@/hooks/use-balco-plus";
import { useColors } from "@/hooks/use-colors";
import { usePlusInterest } from "@/hooks/use-plus-interest";
import { useGarden } from "@/lib/garden/garden-context";
import { euros, freeForAllText, isPlusTrigger, PLUS_NOT_YET, PLUS_PRICES, plusPromises, plusScreenBenefits, plusTriggerText, yearlyPerMonthText, yearlySavingText } from "@/lib/plans";

type Period = "yearly" | "monthly";

export default function PlusScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { account } = useGarden();
  const { isPlus } = useBalcoPlus();
  const interest = usePlusInterest();
  const [period, setPeriod] = useState<Period>("yearly");
  const trigger = plusTriggerText(isPlusTrigger(from) ? from : undefined);
  const hasPlus = account.signedIn && account.plan === "plus";

  const planCard = (id: Period, title: string, price: string, detail: string, badge?: string) => {
    const active = period === id;
    return (
      <Pressable
        key={id}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        aria-checked={active}
        accessibilityLabel={`${title} : ${price}, ${detail}`}
        onPress={() => setPeriod(id)}
        style={({ pressed }) => [glass.card, styles.plan, active && { borderColor: colors.primary, borderWidth: 2, backgroundColor: "rgba(227,241,232,0.92)" }, pressed && PRESSED]}
      >
        <Check checked={active} shape="radio" />
        <View style={styles.flex}>
          <Text style={[styles.planTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.small, { color: colors.muted }]}>{detail}</Text>
        </View>
        <View style={styles.priceBox}>
          {badge && <Text style={[styles.badge, { backgroundColor: colors.primary }]}>{badge}</Text>}
          <Text style={[styles.price, { color: colors.foreground }]}>{price}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <LightScreen>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 }]}>
          <ScreenHeader back title="Balco+" subtitle="Pour ne rien laisser au hasard" />

          {trigger && (
            <View style={[styles.trigger, { backgroundColor: colors.leaf }]}>
              <Text style={[styles.text, { color: colors.primary, fontWeight: "700" }]}>{trigger}</Text>
            </View>
          )}

          <View style={[glass.card, styles.card]}>
            {plusScreenBenefits().map((benefit) => (
              <View key={benefit.title} style={styles.benefit}>
                <Text style={styles.icon}>{benefit.icon}</Text>
                <View style={styles.flex}>
                  <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{benefit.title}</Text>
                  <Text style={[styles.small, { color: colors.muted }]}>{benefit.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {hasPlus || isPlus ? (
            <View style={[styles.trigger, { backgroundColor: colors.leaf }]}>
              <Text style={[styles.text, { color: colors.primary, fontWeight: "700" }]}>{hasPlus && account.founder ? "Tu as Balco+ au prix fondateur : merci d’être là depuis le début." : hasPlus ? "Tu as Balco+ : merci !" : "Balco+ est simulé sur ce téléphone (version de test)."}</Text>
            </View>
          ) : (
            <>
              <View style={styles.plans} accessibilityRole="radiogroup">
                {planCard("yearly", "À l’année", `${euros(PLUS_PRICES.yearlyEuros)} / an`, `${yearlyPerMonthText()} · ${yearlySavingText()}`, "Le plus avantageux")}
                {planCard("monthly", "Au mois", `${euros(PLUS_PRICES.monthlyEuros)} / mois`, "Sans engagement")}
              </View>
              <View style={styles.promises}>
                {plusPromises().map((line) => (
                  <View key={line} style={styles.promise}>
                    <Text style={[styles.promiseMark, { color: colors.primary }]}>✓</Text>
                    <Text style={[styles.text, styles.flex, { color: colors.foreground }]}>{line}</Text>
                  </View>
                ))}
              </View>
              {interest.notified ? (
                <View style={[styles.notified, { backgroundColor: colors.leaf }]}>
                  <Text style={[styles.notifiedText, { color: colors.primary }]}>C’est noté, on te prévient</Text>
                </View>
              ) : (
                <>
                  {!account.signedIn && (
                    <>
                      <TextInput value={interest.email} onChangeText={interest.setEmail} accessibilityLabel="Ton adresse e-mail" placeholder="Ton adresse e-mail" placeholderTextColor={colors.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="send" onSubmitEditing={() => void interest.notifyMe()} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
                      <Text style={[styles.small, { color: colors.muted }]}>On t’écrira une seule fois, à l’ouverture de Balco+.</Text>
                    </>
                  )}
                  <Button label={interest.sending ? "Envoi…" : "Me prévenir à l’ouverture"} accessibilityLabel="Me prévenir à l’ouverture" disabled={interest.sending} onPress={() => void interest.notifyMe()} />
                  {interest.error && <Text style={[styles.small, { color: colors.error }]}>{interest.error}</Text>}
                </>
              )}
              <Text style={[styles.small, styles.center, { color: colors.muted }]}>{PLUS_NOT_YET}</Text>
            </>
          )}

          <Text style={[styles.small, { color: colors.muted }]}>{freeForAllText()}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  trigger: { borderRadius: 14, padding: 14 },
  card: { padding: 16, gap: 14 },
  benefit: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { fontSize: 22, width: 28, textAlign: "center" },
  benefitTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  text: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  center: { textAlign: "center" },
  plans: { gap: 10 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  planTitle: { fontSize: 16, fontWeight: "700" },
  priceBox: { alignItems: "flex-end", gap: 4 },
  badge: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  price: { fontSize: 16, fontWeight: "800" },
  promises: { gap: 6 },
  promise: { flexDirection: "row", gap: 10 },
  promiseMark: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  notified: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  notifiedText: { fontSize: 15, fontWeight: "700" },
});
