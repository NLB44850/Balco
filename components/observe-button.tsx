/**
 * Le bouton appareil photo en haut d'Aujourd'hui et de Balcon (retour du 24/10 : « juste garder l'appareil photo en
 * haut », le profil passe en 5ᵉ onglet). La photo se prend tout de suite, puis Observer l'affiche prête à analyser
 * (avec ou sans compte). Sans analyse restante ou si le service manque, on ouvre simplement Observer, qui explique
 * pourquoi.
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { glass } from "@/components/ui/glass";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { cameraWasInterrupted } from "@/lib/ai/camera-interrupt";
import { setPendingPhoto, setPendingPhotoFailed } from "@/lib/ai/pending-photo";
import { pickPlantPhoto } from "@/lib/ai/photo";
import { useGarden } from "@/lib/garden/garden-context";
import { deviceId as loadDeviceId } from "@/lib/sync/device-id";
import { trpc } from "@/lib/trpc";

export function ObserveButton({ watchInterrupt = false }: { watchInterrupt?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { account } = useGarden();
  const aiStatus = trpc.ai.status.useQuery(undefined, { enabled: account.signedIn, retry: false });
  // Sans compte : l'analyse offerte de cet appareil (Observer sans compte).
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => {
    if (!account.signedIn) void loadDeviceId().then(setDevice);
  }, [account.signedIn]);
  const guestStatus = trpc.ai.guestStatus.useQuery({ deviceId: device ?? "" }, { enabled: !account.signedIn && !!device, retry: false });

  // Revenue rechargée pendant la photo (navigateur) : Observer s'ouvre et explique quoi faire. Un seul bouton s'en
  // charge (celui d'Aujourd'hui), pour ne pas ouvrir Observer deux fois.
  useEffect(() => {
    if (watchInterrupt && cameraWasInterrupted()) router.push("/(tabs)/scanner");
  }, [router, watchInterrupt]);

  const observe = async () => {
    const status = aiStatus.data;
    const guest = guestStatus.data;
    const canScan = account.signedIn
      ? status?.available !== false && !status?.paused && (status?.scan.remaining ?? 1) > 0
      : guest?.available === true && !guest.paused && guest.scanLeft;
    if (canScan) {
      try {
        const result = await pickPlantPhoto("camera");
        if (result.status === "canceled") return;
        if (result.status === "ok") setPendingPhoto(result.photo);
      } catch (error) {
        // Photo illisible : Observer s'ouvre quand même, le dit, et propose d'en reprendre une.
        console.warn("[observe] photo not prepared", error);
        setPendingPhotoFailed();
      }
    }
    router.push("/(tabs)/scanner");
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Observer une plante : prendre une photo" hitSlop={6} onPress={() => void observe()} style={({ pressed }) => [glass.card, styles.button, pressed && styles.pressed]}>
      <IconSymbol name="camera.fill" size={19} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
});
