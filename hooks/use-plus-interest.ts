/**
 * « Me prévenir à l'ouverture » de Balco+ : le compte, ou sans compte une adresse e-mail (gardée sur le serveur
 * seulement). Partagé par l'écran Balco+ (étape 10).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRPCClientError } from "@trpc/client";
import { useEffect, useState } from "react";

import { useGarden } from "@/lib/garden/garden-context";
import { trpc } from "@/lib/trpc";

/** Déjà demandé depuis ce téléphone. */
const PLUS_NOTIFY_STORAGE_KEY = "balco.plus.notify.v1";

export function usePlusInterest() {
  const { account } = useGarden();
  const interest = trpc.plus.interest.useQuery(undefined, { enabled: account.signedIn, retry: false });
  const [notifiedHere, setNotifiedHere] = useState(false);
  useEffect(() => {
    void AsyncStorage.getItem(PLUS_NOTIFY_STORAGE_KEY).then((value) => setNotifiedHere(value === "1")).catch(() => undefined);
  }, []);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.plus.notifyMe.useMutation();
  const notifyMe = async () => {
    if (!account.signedIn && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Vérifie ton adresse e-mail.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await mutation.mutateAsync(account.signedIn ? {} : { email: email.trim() });
      setNotifiedHere(true);
      await AsyncStorage.setItem(PLUS_NOTIFY_STORAGE_KEY, "1").catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof TRPCClientError && caught.data?.code === "TOO_MANY_REQUESTS" ? caught.message : "Pas de connexion pour l’instant : réessaie plus tard.");
    } finally {
      setSending(false);
    }
  };
  return { notified: notifiedHere || (account.signedIn && interest.data?.interested === true), email, setEmail, sending, error, notifyMe };
}
