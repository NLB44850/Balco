import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PopIn } from "@/components/motion";
import { LightScreen } from "@/components/light-screen";
import { ScreenHeader } from "@/components/screen-header";
import { glass } from "@/components/ui/glass";
import { useColors } from "@/hooks/use-colors";
import { useVacation } from "@/hooks/use-vacation";
import { useGarden } from "@/lib/garden/garden-context";
import { computeBadges, computeProgress, computeStats, TIER_NAMES } from "@/lib/garden/garden-logic";
import { usePlantPhotos } from "@/lib/garden/photos-context";
import { vacationRange, vacationState } from "@/lib/garden/vacation";
import { weekSummary } from "@/lib/garden/week";
import { SPACE_LABELS, SUNLIGHT_LABELS, type SpaceSize, type Sunlight } from "@/lib/plants/catalog";
import { useNow } from "@/hooks/use-date-simulation";
import { CatalogPicture, PlantPicture } from "@/components/plant-picture";
import { almostThere, pastSeasonBadges } from "@/lib/garden/collection";
import { herbariumCards, herbariumTotal } from "@/lib/garden/herbarium";
import { SEASON_LABELS, seasonBadges, seasonOf } from "@/lib/garden/season-badges";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { resolvedPlants, pastPlants, events, awards, profile, onboarding } = useGarden();
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const { photos } = usePlantPhotos();
  const now = useNow();
  const week = useMemo(() => weekSummary(resolvedPlants, events, photos, now, pastPlants), [events, now, pastPlants, photos, resolvedPlants]);
  const { vacation } = useVacation();
  const trip = vacationState(vacation);
  const vacationLine = trip.phase === "none" || !vacation ? "Tu pars ? Balco prépare ton balcon et se tait pendant ton absence." : trip.phase === "back" ? "Bon retour ! Ta liste de retour t’attend." : `Absence ${vacationRange(vacation)}`;

  const stats = useMemo(() => computeStats(resolvedPlants, events, now, pastPlants), [events, now, pastPlants, resolvedPlants]);
  const badges = useMemo(() => computeBadges(stats, awards), [awards, stats]);
  const progress = useMemo(() => computeProgress(stats, badges), [badges, stats]);
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  // La saison en cours, « Presque là », l'herbier et les badges passés (lib/garden/collection.ts).
  const seasonNow = seasonOf(now);
  const seasonList = useMemo(() => seasonBadges({ plants: resolvedPlants, past: pastPlants, events, springWishes: onboarding?.springWishes, now, awards }), [awards, events, now, onboarding?.springWishes, pastPlants, resolvedPlants]);
  const almost = useMemo(() => almostThere(badges, seasonList), [badges, seasonList]);
  const herbarium = useMemo(() => herbariumCards(awards), [awards]);
  const past = useMemo(() => pastSeasonBadges(awards, now), [awards, now]);
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
      <Pressable accessibilityRole="button" onPress={() => router.push("/vacation")} style={({ pressed }) => [glass.card, styles.vacationCard, pressed && styles.pressed]}>
        <Text style={styles.vacationIcon}>✈️</Text>
        <View style={styles.flexOne}>
          <Text style={[styles.vacationTitle, { color: colors.foreground }]}>Mode vacances</Text>
          <Text style={[styles.vacationText, { color: colors.muted }]}>{vacationLine}</Text>
        </View>
        <Text style={[styles.vacationArrow, { color: colors.muted }]}>›</Text>
      </Pressable>
      <View style={[glass.card, styles.impactHero]}>
        <View style={styles.impactHeroTop}><View style={styles.flex}><Text style={[styles.impactHeroEyebrow, { color: colors.muted }]}>Niveau {progress.level}</Text><Text style={[styles.impactHeroTitle, { color: colors.foreground }]}>{progress.levelTitle}</Text></View><Text style={[styles.impactHeroScore, { color: colors.primary }]}>{progress.points}<Text style={[styles.impactHeroUnit, { color: colors.muted }]}> pts</Text></Text></View>
        <View style={[styles.heroProgressTrack, { backgroundColor: "rgba(18,22,20,0.08)" }]}><View style={[styles.heroProgressFill, { width: `${Math.max(progress.pointsInLevel, 2)}%`, backgroundColor: colors.primary }]} /></View>
        <Text style={[styles.impactHeroCaption, { color: colors.muted }]}>{progress.pointsToNext} points avant le niveau suivant</Text>
      </View>
      <View style={styles.statsRow}>
        {/* Les chiffres de la semaine, du même calcul que Ma semaine (lib/garden/week.ts). */}
        <View style={[glass.card, styles.statCard]} accessibilityLabel={`${week.gestures} geste${week.gestures > 1 ? "s" : ""} cette semaine`}><Text style={[styles.statValue, { color: colors.foreground }]}>{week.gestures}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>geste{week.gestures > 1 ? "s" : ""} cette semaine</Text></View>
        <View style={[glass.card, styles.statCard]} accessibilityLabel={`${week.streak} jour${week.streak > 1 ? "s" : ""} de suite`}><Text style={[styles.statValue, { color: colors.foreground }]}>{week.streak}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>jour{week.streak > 1 ? "s" : ""} de suite</Text></View>
        <View style={[glass.card, styles.statCard]}><Text style={[styles.statValue, { color: colors.foreground }]}>{unlockedCount}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>badge{unlockedCount > 1 ? "s" : ""}</Text></View>
      </View>
    </>
  );

  return (
    <LightScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        {header}

        {/* 1. Presque là : les badges les plus proches, avec leur barre. */}
        {almost.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Presque là</Text>
            {almost.map((item) => (
              <View key={item.key} style={[glass.card, styles.almostCard]} accessibilityLabel={`${item.title}. ${item.phrase}.`}>
                <Text style={styles.almostIcon}>{item.icon}</Text>
                <View style={styles.flex}>
                  <Text style={[styles.badgeTitle, styles.noTop, { color: colors.foreground }]}>{item.title}</Text>
                  <View style={[styles.heroProgressTrack, styles.almostTrack, { backgroundColor: "rgba(18,22,20,0.08)" }]}><View style={[styles.heroProgressFill, { width: `${Math.max(4, Math.round((item.current / item.target) * 100))}%`, backgroundColor: colors.primary }]} /></View>
                  <Text style={[styles.badgeDetail, { color: colors.muted }]}>{item.phrase}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 2. La collection de la saison en cours. */}
        <View style={styles.section}>
          <View style={styles.badgeHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{capitalize(SEASON_LABELS[seasonNow.season])} {seasonNow.year}</Text>
            <Text style={[styles.badgeCount, { color: colors.primary }]}>{seasonList.filter((badge) => badge.obtained).length}/{seasonList.length}</Text>
          </View>
          <View style={styles.grid}>
            {seasonList.map((badge) => (
              <View key={badge.key} style={[glass.card, styles.badgeCard, !badge.obtained && styles.badgeLocked]} accessibilityLabel={`${badge.title}, ${badge.obtained ? "obtenu" : `${badge.current} sur ${badge.target}`}`}>
                <Text style={[styles.seasonIcon, !badge.obtained && styles.dimmed]}>{badge.emoji}</Text>
                <Text style={[styles.badgeTitle, { color: badge.obtained ? colors.foreground : colors.muted }]}>{badge.title}</Text>
                <Text style={[styles.badgeDetail, { color: colors.muted }]}>{capitalize(badge.unit(badge.target))}</Text>
                {!badge.obtained && <Text style={[styles.badgeProgress, { color: colors.muted }]}>{badge.current} / {badge.target}</Text>}
                {badge.obtained && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
              </View>
            ))}
          </View>
        </View>

        {/* 3. L'herbier : une carte par plante récoltée ou fleurie pour la première fois. */}
        <View style={styles.section}>
          <View style={styles.badgeHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ton herbier</Text>
            <Text style={[styles.badgeCount, { color: colors.primary }]}>{herbarium.length} plante{herbarium.length > 1 ? "s" : ""} sur {herbariumTotal}</Text>
          </View>
          {herbarium.length === 0 ? (
            <Text style={[styles.badgeDetail, { color: colors.muted }]}>Ta première récolte, ou ta première fleur, y ajoutera sa carte.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.herbRow}>
              {herbarium.map((card) => {
                const own = [...resolvedPlants, ...pastPlants].find(({ entry }) => entry.id === card.entry.id);
                return (
                  <View key={card.entry.id} style={[glass.card, styles.herbCard]} accessibilityLabel={`${card.entry.name}, ${card.kind === "bloom" ? "fleuri" : "récolté"} le ${shortDay(card.at)}`}>
                    {own ? <PlantPicture resolved={own} style={styles.herbPicture} /> : <CatalogPicture entry={card.entry} style={styles.herbPicture} />}
                    <Text style={[styles.herbName, { color: colors.foreground }]} numberOfLines={1}>{card.entry.name}</Text>
                    <Text style={[styles.badgeDetail, { color: colors.muted }]}>{card.kind === "bloom" ? "Fleuri" : "Récolté"} le {shortDay(card.at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 4. Tous les badges : les permanents avec leurs paliers, puis ceux des saisons passées et des événements. */}
        <View style={styles.section}>
          <View style={styles.badgeHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes badges éco</Text>
            <Text style={[styles.badgeCount, { color: colors.primary }]}>{unlockedCount}/{badges.length}</Text>
          </View>
          <View style={styles.grid}>
            {badges.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => setOpenBadge(openBadge === item.id ? null : item.id)} style={({ pressed }) => [glass.card, styles.badgeCard, !item.unlocked && styles.badgeLocked, pressed && styles.pressed]}>
                <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? item.tone : "#E4E1D9" }]}><Text style={[styles.badgeIconText, { color: item.unlocked ? colors.foreground : "#A8AAA4" }]}>{item.unlocked ? item.icon : "·"}</Text></View>
                <Text style={[styles.badgeTitle, { color: item.unlocked ? colors.foreground : colors.muted }]}>{item.title}</Text>
                <View style={styles.tiers} accessibilityLabel={item.tier === 0 ? "Pas encore de palier" : `Palier ${TIER_NAMES[item.tier - 1]}`}>
                  {TIER_NAMES.map((tierName, index) => <View key={tierName} style={[styles.tierDot, { backgroundColor: index < item.tier ? colors.primary : "rgba(18,22,20,0.1)" }]} />)}
                  <Text style={[styles.tierText, { color: item.tier > 0 ? colors.primary : colors.muted }]}>{item.tier > 0 ? TIER_NAMES[item.tier - 1] : ""}</Text>
                </View>
                <Text style={[styles.badgeDetail, { color: colors.muted }]}>{item.tier === 3 ? "Tous les paliers, bravo !" : `Prochain : ${item.detail}`}</Text>
                {item.tier < 3 && <Text style={[styles.badgeProgress, { color: colors.muted }]}>{item.current} / {item.target}</Text>}
                {openBadge === item.id && <Text style={[styles.badgeDetail, { color: colors.primary }]}>{item.tier === 3 ? "Débloqué, bravo !" : `Encore ${item.unit(item.target - item.current)}.`}</Text>}
                {item.unlocked && <PopIn delay={180} style={[styles.unlockedMark, { backgroundColor: colors.leaf }]}><Text style={[styles.unlockedMarkText, { color: colors.primary }]}>✓</Text></PopIn>}
              </Pressable>
            ))}
          </View>
          {past.length > 0 && (
            <View style={[glass.card, styles.pastCard]}>
              <Text style={[styles.footerTitle, { color: colors.foreground }]}>Saisons et temps forts</Text>
              {past.map((badge) => <Text key={badge.key} style={[styles.footerText, { color: colors.muted }]}>{badge.icon} {badge.title}</Text>)}
            </View>
          )}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push("/settings")} style={({ pressed }) => [glass.card, styles.settingsRow, pressed && styles.pressed]}>
          <Text style={styles.settingsRowIcon}>⚙</Text>
          <View style={styles.flex}>
            <Text style={[styles.footerTitle, { color: colors.foreground }]}>Réglages</Text>
            <Text style={[styles.footerText, { color: colors.muted }]}>Prénom, balcon, rappels, sauvegarde</Text>
          </View>
          <Text style={[styles.footerArrow, { color: colors.muted }]}>›</Text>
        </Pressable>
        <View style={[glass.soft, styles.footerCard]}><Text style={[styles.footerIcon, { color: colors.primary }]}>♧</Text><View style={styles.footerCopy}><Text style={[styles.footerTitle, { color: colors.foreground }]}>Chaque geste compte.</Text><Text style={[styles.footerText, { color: colors.muted }]}>Invite un proche à faire pousser quelque chose.</Text></View><Text style={[styles.footerArrow, { color: colors.muted }]}>›</Text></View>
      </ScrollView>
    </LightScreen>
  );
}

function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  flex: { flex: 1 },
  header: { marginBottom: 18 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingsButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  settingsText: { fontSize: 17 },
  weekCard: { padding: 16, gap: 12, marginBottom: 14 },
  vacationCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 14 },
  vacationIcon: { fontSize: 24 },
  flexOne: { flex: 1 },
  vacationTitle: { fontSize: 16, fontWeight: "700" },
  vacationText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  vacationArrow: { fontSize: 24, fontWeight: "300" },
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
  statCard: { flex: 1, paddingVertical: 13, alignItems: "center", paddingHorizontal: 6 },
  statValue: { fontSize: 21, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 3, textAlign: "center" },
  badgeHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 13 },
  sectionEyebrow: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 21, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  badgeCount: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  section: { marginBottom: 22, gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeCard: { width: "47%", flexGrow: 1, minHeight: 150, padding: 14, position: "relative" },
  almostCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  almostIcon: { fontSize: 26, width: 34, textAlign: "center" },
  almostTrack: { marginTop: 8, marginBottom: 2 },
  noTop: { marginTop: 0 },
  seasonIcon: { fontSize: 32 },
  dimmed: { opacity: 0.35 },
  tiers: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  tierDot: { width: 9, height: 9, borderRadius: 5 },
  tierText: { fontSize: 12, fontWeight: "700", marginLeft: 4 },
  herbRow: { gap: 10, paddingRight: 8 },
  herbCard: { width: 128, padding: 10, gap: 4 },
  herbPicture: { width: 108, height: 108, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  herbName: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  pastCard: { padding: 15, gap: 4 },
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
