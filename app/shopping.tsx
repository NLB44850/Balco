/**
 * La liste de courses pour la jardinerie (chantier « Pots et balcon », étape 5) : pots, terreau, godets et engrais des
 * 6 semaines qui viennent (lib/garden/shopping.ts). On coche en magasin (coches gardées sur le téléphone) ; « Partager »
 * envoie la liste par le partage du téléphone (SMS, WhatsApp). Ouverte depuis « À anticiper » et l'onglet Balcon.
 */
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LightScreen } from "@/components/light-screen";
import { FadeIn } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { TodayRow } from "@/components/today/today-row";
import { glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { useColors } from "@/hooks/use-colors";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useGarden } from "@/lib/garden/garden-context";
import { skippedRepots } from "@/lib/garden/repot-skip";
import { SECTION_TITLES, shoppingList, shoppingShareText, type ShoppingItem, type ShoppingSection } from "@/lib/garden/shopping";
import { activeChecks, loadShoppingChecks, saveShoppingChecks } from "@/lib/garden/shopping-checks";

const SECTIONS: ShoppingSection[] = ["pots", "soil", "seeds", "feed"];

export default function ShoppingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resolvedPlants, events, onboarding } = useGarden();
  const { now, climate, snoozes, plan } = useDayPlan();
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    void loadShoppingChecks().then(setChecks);
  }, []);

  const freePots = useMemo(() => new Set(plan.filter((day) => day.first?.source.type === "harvest-end" && day.first.source.stage === "free").map((day) => day.resolved.plant.id)), [plan]);
  const items = useMemo(
    () => shoppingList({ plants: resolvedPlants, events, springWishes: onboarding?.springWishes, now, climate, repotSkips: skippedRepots(snoozes, now), freePots }),
    [climate, events, freePots, now, onboarding?.springWishes, resolvedPlants, snoozes],
  );
  const checked = useMemo(() => activeChecks(checks, now), [checks, now]);
  const left = items.filter((item) => !checked.has(item.id)).length;

  const toggle = (item: ShoppingItem) => {
    const next = { ...checks };
    if (checked.has(item.id)) delete next[item.id];
    else next[item.id] = now.toISOString();
    setChecks(next);
    void saveShoppingChecks(next);
  };
  const uncheckAll = () => {
    const next = Object.fromEntries(Object.entries(checks).filter(([id]) => !items.some((item) => item.id === id)));
    setChecks(next);
    void saveShoppingChecks(next);
  };
  const share = async () => {
    try {
      await Share.share({ message: shoppingShareText(items, checked) });
    } catch {
      // Pas de partage possible (certains navigateurs) : la liste s'affiche pour être copiée.
      setShowText(true);
    }
  };

  const subtitle = items.length === 0 ? "Rien à acheter pour l’instant" : left === 0 ? "Tout est dans le panier" : `Pour les 6 semaines qui viennent · ${left} à prendre`;

  return (
    <LightScreen bottom>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]}>
        <ScreenHeader back title="Liste de courses" subtitle={subtitle} />

        {items.length === 0 && (
          <FadeIn style={[glass.card, styles.empty]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ta liste est vide</Text>
            <Text style={[styles.small, { color: colors.muted }]}>Balco y ajoute les pots, le terreau, les godets et l’engrais dès qu’un semis, une plantation ou un rempotage approche, ou quand l’engrais d’une plante reprend.</Text>
          </FadeIn>
        )}

        {SECTIONS.map((section, index) => {
          const inSection = items.filter((item) => item.section === section);
          if (inSection.length === 0) return null;
          return (
            <FadeIn key={section} delay={index * 40} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{SECTION_TITLES[section]}</Text>
              <View style={[glass.card, styles.list]}>
                {inSection.map((item) => (
                  <TodayRow
                    key={item.id}
                    icon={item.icon}
                    tone={section === "feed" || section === "seeds" ? "season" : "care"}
                    title={item.title}
                    subtitle={item.chooseSizeOf ? `Touche pour choisir la taille du pot · ${item.detail}` : item.detail}
                    done={checked.has(item.id)}
                    checkLabel={checked.has(item.id) ? "Retirer du panier" : "Dans le panier"}
                    onToggle={() => toggle(item)}
                    onOpen={() => (item.chooseSizeOf ? router.push({ pathname: "/garden/[id]", params: { id: item.chooseSizeOf, pot: "1" } }) : toggle(item))}
                  />
                ))}
              </View>
            </FadeIn>
          );
        })}

        {items.length > 0 && (
          <>
            <Text style={[styles.small, { color: colors.muted }]}>Aucune marque : prends ce que propose ta jardinerie, en version organique.</Text>
            <Button label="Partager ma liste" onPress={() => void share()} style={styles.cta} />
            {showText && <Text selectable style={[glass.card, styles.shareText, { color: colors.foreground }]}>{shoppingShareText(items, checked)}</Text>}
            {checked.size > 0 && left < items.length && (
              <Pressable accessibilityRole="button" onPress={uncheckAll} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
                <Text style={[styles.linkText, { color: colors.primary }]}>Tout décocher</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  empty: { padding: 20, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  small: { fontSize: 13, lineHeight: 19 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  list: { paddingHorizontal: 16 },
  cta: { marginTop: 4 },
  shareText: { padding: 16, fontSize: 14, lineHeight: 21 },
  link: { alignSelf: "center", paddingVertical: 10 },
  linkText: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
