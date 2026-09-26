import { useCallback, useEffect, useState } from "react";

import { clearCachedUser, getCachedUser, removeSessionToken, setCachedUser, setSessionToken, type AuthUser } from "@/lib/auth/storage";
import { trpc } from "@/lib/trpc";

export type SignInResult = { token: string; user: AuthUser };

export function useAuth() {
  const utils = trpc.useUtils();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearLocalSession = useCallback(async () => {
    await removeSessionToken();
    await clearCachedUser();
    setUser(null);
  }, []);

  /** Demande au serveur qui est connecté. Hors ligne, on garde l'utilisateur connu : ce n'est pas une déconnexion. */
  const refresh = useCallback(async () => {
    try {
      const me = await utils.client.auth.me.query();
      if (me) {
        await setCachedUser(me);
        setUser(me);
      } else {
        await clearLocalSession();
      }
    } catch (error) {
      console.warn("[auth] could not reach the server, keeping the cached session", error);
    } finally {
      setLoading(false);
    }
  }, [clearLocalSession, utils]);

  useEffect(() => {
    let active = true;
    getCachedUser().then((cached) => {
      if (!active) return;
      if (cached) {
        setUser(cached);
        setLoading(false);
      }
      void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const completeSignIn = useCallback(async ({ token, user: signedIn }: SignInResult) => {
    await setSessionToken(token);
    await setCachedUser(signedIn);
    setUser(signedIn);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await utils.client.auth.logout.mutate().catch(() => undefined);
    await clearLocalSession();
  }, [clearLocalSession, utils]);

  const deleteAccount = useCallback(async () => {
    await utils.client.auth.deleteAccount.mutate();
    await clearLocalSession();
  }, [clearLocalSession, utils]);

  return { user, loading, isAuthenticated: Boolean(user), refresh, completeSignIn, logout, deleteAccount };
}
