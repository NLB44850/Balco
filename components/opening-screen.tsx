/**
 * L'accueil à l'ouverture de l'app (maquette validée le 18/10) : le vert de l'écran de démarrage s'efface sur
 * la lumière de ton balcon (heure et météo), puis la météo en pastille, « Bonjour / Nicolas », tes plantes qui
 * arrivent une à une avec ce dont chacune a besoin, et une carte « ce qui t'attend » avec une raison d'y aller.
 * Des feuilles tombent doucement (des flocons quand il gèle). Il s'efface tout seul après 6 secondes, d'une
 * touche ou par son bouton. Une fois par lancement, et seulement quand le balcon est créé (sinon c'est l'accueil
 * des premières questions, app/welcome.tsx). Textes : lib/garden/opening.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeIn, PopIn } from "@/components/motion";
import { PlantPicture } from "@/components/plant-picture";
import { Text } from "@/components/ui/typography";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useGarden } from "@/lib/garden/garden-context";
import { followedDays } from "@/lib/garden/garden-logic";
import { MARK_EMOJI, openingCard, openingDate, openingGreeting, openingPlants, openingPlantsLabel, openingWeather, type OpeningCard } from "@/lib/garden/opening";
import { defaultSkyScene, skyScene, type SkyScene } from "@/lib/garden/sky";
import { balconyStatus, buildTodayList, splitTodayList } from "@/lib/garden/today";
import { vacationState } from "@/lib/garden/vacation";

/** Le vert de l'écran de démarrage (app.config.ts) : l'accueil part de lui, sans saut. */
const BRAND_GREEN = "#1F7A4D";
const FROST_BLUE = "#2F6FB3";
const RAILING = require("@/assets/images/balcony/railing.png");
const LOGO = require("@/assets/images/splash-icon.png");
/** Les tests de bout en bout le sautent (e2e/helpers.ts), sauf celui qui le regarde. */
export const OPENING_SKIP_KEY = "balco.test.no-opening.v1";
/** Le plan du jour attend la météo : au-delà, l'accueil se contente du bonjour, de la date et des plantes. */
const MAX_WAIT_MS = 2500;
/** Les entrées durent un peu plus de 2,5 s : il reste environ 3,5 s pour lire avant que l'accueil s'efface. */
const SHOWN_MS = 6000;

let openedThisLaunch = false;

type Mark = { id: string; emoji: string; ok: boolean; resolved: Parameters<typeof PlantPicture>[0]["resolved"] };
type Message = {
  hello: string;
  name?: string;
  date: string;
  weather?: string;
  plants: Mark[];
  plantsLabel?: string;
  card: OpeningCard;
  scene: SkyScene;
  flakes: boolean;
};

export function OpeningScreen() {
  const { loaded, onboarding, profile, events, resolvedPlants } = useGarden();
  const { ready, plan, visibleGroups, now, reminderSettings, weather, weatherSnapshot } = useDayPlan();
  const [phase, setPhase] = useState<"wait" | "show" | "done">(openedThisLaunch ? "done" : "wait");
  const [skip, setSkip] = useState<boolean | null>(null);
  const [waitedEnough, setWaitedEnough] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const leaving = useRef(false);

  useEffect(() => {
    if (phase === "done") return;
    void AsyncStorage.getItem(OPENING_SKIP_KEY).then((value) => setSkip(value === "1"), () => setSkip(false));
    const timer = setTimeout(() => setWaitedEnough(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
    // Une seule fois, au lancement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = (duration = 400) => {
    if (leaving.current) return;
    leaving.current = true;
    openedThisLaunch = true;
    Animated.timing(screenOpacity, { toValue: 0, duration, useNativeDriver: true }).start(() => setPhase("done"));
  };

  // Le message est figé au moment où il s'affiche : il ne bouge plus pendant qu'on le lit.
  useEffect(() => {
    if (phase !== "wait" || skip === null || !loaded) return;
    if (skip || !onboarding) {
      leave(200);
      return;
    }
    if (!ready && !waitedEnough) return;
    const items = ready ? buildTodayList({ groups: visibleGroups, plan }) : [];
    const { banners, rest } = splitTodayList(items);
    const plants = openingPlants(ready ? plan : [], banners);
    const status = balconyStatus(items, events, now);
    const minutes = plan.flatMap((day) => day.gestures).filter((gesture) => !gesture.done && gesture.kind !== "alert").reduce((sum, gesture) => sum + gesture.minutes, 0);
    const scene = weather.usable ? skyScene(weatherSnapshot, now) : defaultSkyScene(now);
    const greeting = openingGreeting(profile.firstName, now);
    setMessage({
      ...greeting,
      date: openingDate(now),
      weather: weather.usable ? openingWeather(weatherSnapshot, now) : undefined,
      plants: plants.shown.map((plant) => ({ id: plant.id, resolved: plant.resolved, emoji: MARK_EMOJI[plant.mark], ok: plant.mark === "ok" })),
      plantsLabel: ready && plants.total > 0 ? openingPlantsLabel(plants) : undefined,
      card: openingCard({ plantCount: resolvedPlants.length, banners: ready ? banners : [], rest, minutes, remaining: status.remaining, doneToday: status.doneToday, streak: followedDays(resolvedPlants, events, now), away: vacationState(reminderSettings.vacation, now).phase === "away", now }),
      scene,
      flakes: scene.weather === "frost" || scene.weather === "snow",
    });
    setPhase("show");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, skip, loaded, onboarding, ready, waitedEnough]);

  useEffect(() => {
    if (phase !== "show") return;
    Animated.timing(splashOpacity, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const timer = setTimeout(() => leave(), SHOWN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "done") return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
      <StatusBar style={message ? "dark" : "light"} />
      <Pressable accessible={false} onPress={() => leave(250)} style={StyleSheet.absoluteFill}>
        {message && <Scene message={message} onGo={() => leave(250)} />}
      </Pressable>
      {/* Le vert de l'écran de démarrage, qui s'efface sur la lumière du balcon. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.splash, { opacity: splashOpacity }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </Animated.View>
  );
}

function Scene({ message, onGo }: { message: Message; onGo: () => void }) {
  const insets = useSafeAreaInsets();
  const { scene, card } = message;
  const alert = card.tone === "alert";
  const accent = alert ? FROST_BLUE : BRAND_GREEN;
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={scene.background} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Glow night={scene.mood === "night"} />
      <Railing tint={scene.shadowTint} strength={scene.shadow} />
      <Falling flakes={message.flakes} />
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        {!!message.weather && (
          <FadeIn delay={350} style={message.flakes ? [styles.chip, styles.chipCold] : styles.chip}>
            <Text style={[styles.chipText, message.flakes && styles.chipTextCold]}>{message.weather}</Text>
          </FadeIn>
        )}
        <FadeIn delay={450}>
          <Text style={styles.hello}>{message.hello}</Text>
          {!!message.name && <Text style={styles.hello}>{message.name}</Text>}
        </FadeIn>
        <FadeIn delay={550}>
          <Text style={styles.date}>{message.date}</Text>
        </FadeIn>
        {message.plants.length > 0 && (
          <View style={styles.pots}>
            {message.plants.map((plant, index) => (
              <PopIn key={plant.id} delay={750 + index * 100} style={index > 0 ? [styles.potWrap, styles.potOverlap] : styles.potWrap}>
                <PlantPicture resolved={plant.resolved} style={styles.pot} />
                <View style={[styles.mark, plant.ok && styles.markOk]}>
                  <Text style={[styles.markText, plant.ok && styles.markTextOk]}>{plant.emoji}</Text>
                </View>
              </PopIn>
            ))}
          </View>
        )}
        {!!message.plantsLabel && (
          <FadeIn delay={1250}>
            <Text style={styles.potsLabel}>{message.plantsLabel}</Text>
          </FadeIn>
        )}
        <View style={styles.spacer} />
        <FadeIn delay={1350} style={alert ? [styles.card, styles.cardAlert] : styles.card}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSub}>{card.sub}</Text>
          {card.tasks.map((task, index) => (
            <FadeIn key={task.title} delay={1600 + index * 120} style={styles.task}>
              <View style={[styles.dot, task.done && { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN }]}>{task.done && <Text style={styles.dotCheck}>✓</Text>}</View>
              <Text style={styles.taskText} numberOfLines={1}>{task.title}</Text>
            </FadeIn>
          ))}
          {!!card.cheer && (
            <FadeIn delay={2100} style={alert ? [styles.cheer, styles.cheerCold] : styles.cheer}>
              <Text style={[styles.cheerText, alert && styles.cheerTextCold]}>{card.cheer}</Text>
            </FadeIn>
          )}
          <FadeIn delay={2300}>
            <Pressable accessibilityRole="button" accessibilityLabel={card.action} onPress={onGo} style={({ pressed }) => [styles.go, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.goText}>{card.action}</Text>
            </Pressable>
            <Text style={styles.tapHint}>ou touche n’importe où</Text>
          </FadeIn>
        </FadeIn>
      </View>
    </View>
  );
}

const HALO = [320, 240, 170, 110];

/** Un halo de soleil (de lune la nuit) qui se lève en haut à droite : des cercles pâles empilés, bord adouci. */
function Glow({ night }: { night: boolean }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);
  const color = night ? "#FFFFFF" : "#FFD7A1";
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}
    >
      {HALO.map((size) => (
        <View key={size} style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.16 }} />
      ))}
    </Animated.View>
  );
}

/** L'ombre de la rambarde, qui glisse en place comme au lever du soleil. */
function Railing({ tint, strength }: { tint: string; strength: number }) {
  const { width, height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 1200, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  return (
    <Animated.Image
      source={RAILING}
      resizeMode="cover"
      style={{ position: "absolute", left: 0, bottom: 0, width, height, tintColor: tint, opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.03 + 0.06 * Math.min(1, strength)] }), transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }] }}
    />
  );
}

/** Des feuilles qui tombent doucement, ou des flocons quand il gèle. Rien si le téléphone demande moins d'animations. */
function Falling({ flakes }: { flakes: boolean }) {
  const { width, height } = useWindowDimensions();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => undefined);
  }, []);
  if (reduce) return null;
  const count = flakes ? 12 : 6;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, index) => (
        <Drop key={index} index={index} flake={flakes} width={width} height={height} />
      ))}
    </View>
  );
}

function Drop({ index, flake, width, height }: { index: number; flake: boolean; width: number; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;
  const duration = flake ? 4000 + (index % 3) * 600 : 5200 + (index % 3) * 700;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const start = setTimeout(() => loop.start(), (index * (flake ? 330 : 800)) % 4000);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [duration, fall, flake, index]);
  const left = ((index * 0.19 + 0.08) % 1) * width;
  const drift = flake ? 20 : -110;
  return (
    <Animated.Text
      style={{
        position: "absolute",
        top: -30,
        left,
        fontSize: flake ? 10 + (index % 3) * 4 : 18,
        color: "#FFFFFF",
        textShadowColor: "#9CC3E8",
        textShadowRadius: flake ? 4 : 0,
        opacity: fall.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, flake ? 1 : 0.8, flake ? 0.9 : 0.6, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.8] }) },
          { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", flake ? "90deg" : "320deg"] }) },
        ],
      }}
    >
      {flake ? "❄" : index % 2 ? "🍃" : "🌿"}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  screen: { zIndex: 1000, elevation: 1000, backgroundColor: "#F5F3EE" },
  splash: { backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" },
  logo: { width: 200, height: 200 },
  glow: { position: "absolute", width: 320, height: 320, right: -100, top: -90, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 22 },
  chip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.75)" },
  chipCold: { backgroundColor: FROST_BLUE },
  chipText: { fontSize: 14, fontWeight: "600", color: "#1D2A22" },
  chipTextCold: { color: "#FFFFFF" },
  hello: { fontSize: 36, lineHeight: 39, fontWeight: "800", letterSpacing: -1, color: "#1D2A22", marginTop: 4 },
  date: { fontSize: 15, color: "#5D6B62", marginTop: 6 },
  pots: { flexDirection: "row", marginTop: 22, paddingLeft: 2 },
  potWrap: { width: 60, height: 60 },
  potOverlap: { marginLeft: -10 },
  pot: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: "#FFFFFF", overflow: "hidden" },
  mark: { position: "absolute", right: -5, bottom: -3, width: 25, height: 25, borderRadius: 13, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  markOk: { backgroundColor: BRAND_GREEN },
  markText: { fontSize: 12 },
  markTextOk: { color: "#FFFFFF", fontWeight: "800" },
  potsLabel: { marginTop: 10, fontSize: 14, color: "#5D6B62" },
  spacer: { flex: 1, minHeight: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, shadowColor: "#1F3C28", shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  cardAlert: { borderColor: FROST_BLUE, borderWidth: 2 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#1D2A22" },
  cardSub: { fontSize: 14, color: "#5D6B62", marginTop: 3, marginBottom: 8 },
  task: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E3E7E2" },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#C9D3CC", alignItems: "center", justifyContent: "center" },
  dotCheck: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  taskText: { flex: 1, fontSize: 15, color: "#1D2A22" },
  cheer: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#FFF1E6" },
  cheerCold: { backgroundColor: "#EAF2FB" },
  cheerText: { fontSize: 14, fontWeight: "600", color: "#9A4A1C" },
  cheerTextCold: { color: "#24507F" },
  go: { marginTop: 12, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  goText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  tapHint: { textAlign: "center", color: "#5D6B62", fontSize: 12, marginTop: 8 },
});
