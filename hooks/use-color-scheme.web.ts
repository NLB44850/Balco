import { useThemeContext } from "@/lib/theme-provider";

/** Même source que sur mobile : le thème choisi par l'app, pas celui du navigateur. */
export function useColorScheme() {
  return useThemeContext().colorScheme;
}
