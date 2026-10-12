/**
 * Le cadre des onglets : la lumière du balcon en fond (plus discrète que sur l'accueil),
 * avec la même météo et la même heure. Le contenu gère lui-même la marge du haut.
 */
import type { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { BalconySky } from "@/components/today/balcony-sky";
import { useSharedSky } from "@/lib/garden/sky-store";

/** `still` : décor immobile, pour les longues listes (voir BalconySky). */
export function LightScreen({ children, scrollY, bottom = false, still = false }: { children: React.ReactNode; scrollY?: Animated.Value; bottom?: boolean; still?: boolean }) {
  const insets = useSafeAreaInsets();
  const sky = useSharedSky();
  return (
    <ScreenContainer edges={bottom ? ["left", "right", "bottom"] : ["left", "right"]}>
      <BalconySky quiet still={still} scene={sky} topInset={insets.top} scrollY={scrollY} />
      {children}
    </ScreenContainer>
  );
}
