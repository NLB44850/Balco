/**
 * L'accueil à l'ouverture de l'app : le pot de Balco sur le vert de l'écran de démarrage, puis
 * « Bonsoir, Léa », la date et ce qui l'attend aujourd'hui (lib/garden/opening.ts). Il s'efface tout
 * seul après deux secondes, ou d'une touche. Une fois par lancement, et seulement quand le balcon est
 * créé (sinon c'est l'accueil des premières questions, app/welcome.tsx).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet } from "react-native";

import { Text } from "@/components/ui/typography";
import { useDayPlan } from "@/hooks/use-day-plan";
import { useGarden } from "@/lib/garden/garden-context";
import { openingDate, openingGreeting, openingLine } from "@/lib/garden/opening";
import { balconyStatus, buildTodayList, splitTodayList } from "@/lib/garden/today";
import { vacationState } from "@/lib/garden/vacation";

/** Le vert de l'écran de démarrage (app.config.ts) : l'accueil le prolonge sans saut. */
const BRAND_GREEN = "#1F7A4D";
/** Les tests de bout en bout le sautent (e2e/helpers.ts), sauf celui qui le regarde. */
export const OPENING_SKIP_KEY = "balco.test.no-opening.v1";
/** Le plan du jour attend la météo : au-delà, l'accueil se contente du bonjour et de la date. */
const MAX_WAIT_MS = 2500;
const SHOWN_MS = 2200;

let openedThisLaunch = false;

type Message = { greeting: string; date: string; line?: string };

export function OpeningScreen() {
  const { loaded, onboarding, profile, events, resolvedPlants } = useGarden();
  const { ready, plan, visibleGroups, now, reminderSettings } = useDayPlan();
  const [phase, setPhase] = useState<"wait" | "show" | "done">(openedThisLaunch ? "done" : "wait");
  const [skip, setSkip] = useState<boolean | null>(null);
  const [waitedEnough, setWaitedEnough] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
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

  // Le message est figé au moment où il s'affiche : il ne bouge plus pendant les deux secondes.
  useEffect(() => {
    if (phase !== "wait" || skip === null || !loaded) return;
    if (skip || !onboarding) {
      leave(200);
      return;
    }
    if (!ready && !waitedEnough) return;
    const items = ready ? buildTodayList({ groups: visibleGroups, plan }) : [];
    const alert = splitTodayList(items).banners[0]?.title;
    const away = vacationState(reminderSettings.vacation, now).phase === "away";
    setMessage({
      greeting: openingGreeting(profile.firstName, now),
      date: openingDate(now),
      line: ready ? openingLine({ plantCount: resolvedPlants.length, alert, status: balconyStatus(items, events, now), away, now }) : undefined,
    });
    setPhase("show");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, skip, loaded, onboarding, ready, waitedEnough]);

  useEffect(() => {
    if (phase !== "show") return;
    Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const timer = setTimeout(() => leave(), SHOWN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "done") return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screenOpacity }]}>
      <StatusBar style="light" />
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir Balco" onPress={() => leave(250)} style={styles.press}>
        <Image source={require("@/assets/images/splash-icon.png")} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Animated.View style={[styles.texts, { opacity: textOpacity }]}>
          {message && (
            <>
              <Text style={styles.greeting}>{message.greeting}</Text>
              <Text style={styles.date}>{message.date}</Text>
              {!!message.line && <Text style={styles.line}>{message.line}</Text>}
            </>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: BRAND_GREEN, zIndex: 1000, elevation: 1000 },
  press: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  logo: { width: 200, height: 200 },
  // Les textes sous le pot, sans le faire remonter : le pot reste où l'écran de démarrage l'a posé.
  texts: { position: "absolute", top: "50%", marginTop: 112, left: 32, right: 32, alignItems: "center", gap: 6 },
  greeting: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  date: { color: "rgba(255,255,255,0.75)", fontSize: 15, textAlign: "center" },
  line: { marginTop: 14, color: "#FFFFFF", fontSize: 17, lineHeight: 23, fontWeight: "500", textAlign: "center" },
});
