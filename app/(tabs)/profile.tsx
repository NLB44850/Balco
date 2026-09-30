import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PopIn } from "@/components/motion";
import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { useColors } from "@/hooks/use-colors";
import { useGarden } from "@/lib/garden/garden-context";
import { computeBadges, computeProgress, computeStats } from "@/lib/garden/garden-logic";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { weekSummary } from "@/lib/garden/week";
import { SPACE_LABELS, SUNLIGHT_LABELS, type SpaceSize, type Sunlight } from "@/lib/plants/catalog";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { resolvedPlants, events, profile, onboarding } = useGarden();
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const { photos } = usePlantPhotos();
  const week = useMemo(() => weekSummary(resolvedPlants, events, photos, new Date()), [events, photos, resolvedPlants]);

  const stats = useMemo(() => computeStats(resolvedPlants, events, new Date()), [events, resolvedPlants]);
  const badges = useMemo(() => computeBadges(stats), [stats]);
  const progress = useMemo(() => computeProgress(stats, badges), [badges, stats]);
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const balconyMeta = [
    onboarding?.space && !onboarding.skipped ? capitalize(SPACE_LABELS[onboarding.space as SpaceSize]) : null,
    onboarding?.sunlight && !onboarding.skipped ? SUNLIGHT_LABELS[onboarding.sunlight as Sunlight].toLowerCase() : null,
    `${stats.plants} plante${stats.plants > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");

  const header = (
    <>
      <ScreenHeader
        back
        title={profile.firstName?.trim() || "Moi"}
        subtitle={balconyMeta}
        right={
          <View style={styles.headerRight}>
            <Pressable accessibilityRole="button" accessibilityLabel="Réglages" onPress={() => router.push("/settings")} style={({ pressed }) => [glass.soft, styles.settingsButton, pressed && styles.pressed]}><Text style={[styles.settingsText, { color: colors.foreground }]}>⚙</Text></Pressable>
          </View>
        }
        style={styles.header}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Ma semaine : ${week.title}`} onPress={() => router.push("/week")} style={({ pressed }) => [glass.card, styles.weekCard, pressed && styles.pressed]}>
        <View style={styles.weekTop}>
          <View style={styles.flex}>
            <Text style={[styles.impactHeroEyebrow, { color: colors.muted }]}>Ma semaine</Text>
            <Text style={[styles.weekTitle, { color: colors.foreground }]}>{week.title}</Text>
          </View>
          <Text style={[styles.weekLink, { color: colors.primary }]}>Voir ›</Text>
        </View>
        <View style={styles.weekDays}>
          {week.days.map((day) => (
            <View key={day.key} style={styles.weekDay}>
              <View style={[styles.weekDot, { backgroundColor: day.gestures > 0 ? colors.primary : "rgba(18,22,20,0.07)", borderColor: day.today ? colors.primary : "transparent", opacity: day.future ? 0.45 : 1 }]} />
              <Text style={[styles.weekLetter, { color: day.today ? colors.primary : colors.muted }]}>{day.letter}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={[glass.card, styles.impactHero]}>
        <View style={styles.impactHeroTop}><View style={styles.flex}><Text style={[styles.impactHeroEyebrow, { color: colors.muted }]}>Niveau {progress.level}</Text><Text style={[styles.impactHeroTitle, { color: colors.foreground }]}>{progress.levelTitle}</Text></View><Text style={[styles.impactHeroScore, { color: colors.primary }]}>{progress.points}<Text style={[styles.impactHeroUnit, { color: colors.muted }]}> pts</Text></Text></View>
        <View style={[styles.heroProgressTrack, { backgroundColor: "rgba(18,22,20,0.08)" }]}><View style={[styles.heroProgressFill, { width: `${Math.max(progress.pointsInLevel, 2)}%`, backgroundColor: colors.primary }]} /></View>
        <Text style={[styles.impactHeroCaption, { color: colors.muted }]}>{progress.pointsToNext} points avant le niveau suivant</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.gestures}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>geste{stats.gestures > 1 ? "s" : ""} fait{stats.gestures > 1 ? "s" : ""}</Text></View>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stats.streakDays}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>jour{stats.streakDays > 1 ? "s" : ""} de suite</Text></View>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedCount}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>badge{unlockedCount > 1 ? "s" : ""}</Text></View>
      </View>
      <View style={styles.badgeHeading}><View><Text style={[styles.sectionEyebrow, { color: colors.muted }]}>Petites victoires</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes badges éco</Text></View><Text style={[styles.badgeCount, { color: colors.primary }]}>{unlockedCount}/{badges.length}</Text></View>
    </>
  );

  return (
    <LightScreen>
      <FlatList
        data={badges}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.badgeRow}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setOpenBadge(openBadge === item.id ? null : item.id)} style={({ pressed }) => [glass.card, styles.badgeCard, !item.unlocked && styles.badgeLocked, pressed && styles.pressed]}>
            <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? item.tone : "#E4E1D9" }]}><Text style={[styles.badgeIconText, { color: item.unlocked ? colors.foreground : "#A8AAA4" }]}>{item.unlocked ? item.icon : "·"}</Text></View>
            <Text style={[styles.badgeTitle, { color: item.unlocked ? colors.foreground : colors.muted }]}>{item.title}</Text>
            <Text style={[styles.badgeDetail, { color: item.unlocked ? colors.muted : "#A8AAA4" }]}>{item.detail}</Text>
            {!item.unlocked && <Text style={[styles.badgeProgress, { color: colors.muted }]}>{item.current} / {item.target}</Text>}
            {openBadge === item.id && <Text style={[styles.badgeDetail, { color: colors.primary }]}>{item.unlocked ? "Débloqué, bravo !" : `Encore ${item.target - item.current} pour le débloquer.`}</Text>}
            {item.unlocked && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
          </Pressable>
        )}
        ListFooterComponent={
          <>
            <Pressable accessibilityRole="button" onPress={() => router.push("/settings")} style={({ pressed }) => [glass.card, styles.settingsRow, pressed && styles.pressed]}>
              <Text style={styles.settingsRowIcon}>⚙</Text>
              <View style={styles.flex}>
                <Text style={[styles.footerTitle, { color: colors.foreground }]}>Réglages</Text>
                <Text style={[styles.footerText, { color: colors.muted }]}>Prénom, balcon, rappels, sauvegarde</Text>
              </View>
              <Text style={[styles.footerArrow, { color: colors.muted }]}>›</Text>
            </Pressable>
            <View style={[glass.soft, styles.footerCard]}><Text style={[styles.footerIcon, { color: colors.primary }]}>♧</Text><View style={styles.footerCopy}><Text style={[styles.footerTitle, { color: colors.foreground }]}>Chaque geste compte.</Text><Text style={[styles.footerText, { color: colors.muted }]}>Invite un proche à faire pousser quelque chose.</Text></View><Text style={[styles.footerArrow, { color: colors.muted }]}>›</Text></View>
          </>
        }
      />
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  flex: { flex: 1 },
  header: { marginBottom: 18 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  settingsText: { fontSize: 17 },
  weekCard: { padding: 16, gap: 12, marginBottom: 14 },
  weekTop: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  weekTitle: { fontSize: 18, fontWeight: "800", marginTop: 2, letterSpacing: -0.3 },
  weekLink: { fontSize: 14, fontWeight: "700" },
  weekDays: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: 5 },
  weekDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  weekLetter: { fontSize: 11, fontWeight: "600" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, marginTop: 8 },
  settingsRowIcon: { fontSize: 22 },
  impactHero: { padding: 16, gap: 10 },
  impactHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  impactHeroEyebrow: { fontSize: 13, fontWeight: "600" },
  impactHeroTitle: { fontSize: 20, fontWeight: "800", marginTop: 2, letterSpacing: -0.3 },
  impactHeroScore: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  impactHeroUnit: { fontSize: 14, fontWeight: "600", letterSpacing: 0 },
  heroProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  heroProgressFill: { height: 6, borderRadius: 3 },
  impactHeroCaption: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 27 },
  statCard: { flex: 1, paddingVertical: 13, alignItems: "center" },
  statValue: { fontSize: 21, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 3 },
  badgeHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13 },
  sectionEyebrow: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 21, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  badgeCount: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  badgeRow: { gap: 12, marginBottom: 12 },
  badgeCard: { flex: 1, minHeight: 164, padding: 14, position: "relative" },
  badgeLocked: { backgroundColor: "rgba(255,255,255,0.45)" },
  badgeIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badgeIconText: { fontSize: 25, fontWeight: "700" },
  badgeTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", marginTop: 12 },
  badgeDetail: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  badgeProgress: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  unlockedMark: { width: 19, height: 19, borderRadius: 10, position: "absolute", right: 11, top: 11, alignItems: "center", justifyContent: "center" },
  unlockedMarkText: { fontSize: 12, fontWeight: "800" },
  footerCard: { borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", marginTop: 8 },
  footerIcon: { fontSize: 28 },
  footerCopy: { flex: 1, marginLeft: 12 },
  footerTitle: { fontSize: 14, fontWeight: "700" },
  footerText: { fontSize: 13, marginTop: 3 },
  footerArrow: { fontSize: 28, fontWeight: "300" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
