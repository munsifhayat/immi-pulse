"use client";

/**
 * Client-portal auth context — separate from the consultant `auth.tsx`.
 * Org-scoped: a provider is mounted per `/portal/{orgSlug}` and persists the
 * account session JWT in localStorage so the client stays signed in.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { PortalMe, portalApi, portalToken } from "@/lib/api/portal";

interface PortalAuthState {
  account: PortalMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustReset: boolean;
  orgSlug: string;
  login: (email: string, password: string) => Promise<PortalMe>;
  logout: () => void;
  setPassword: (newPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthState | undefined>(undefined);

export function PortalAuthProvider({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  const [account, setAccount] = useState<PortalMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = portalToken.get();
    if (!token) {
      setAccount(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await portalApi.me();
      // A token issued for a different firm's portal must not leak across slugs.
      if (me.org_slug !== orgSlug) {
        portalToken.clear();
        setAccount(null);
      } else {
        setAccount(me);
      }
    } catch {
      portalToken.clear();
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await portalApi.login(orgSlug, email, password);
      portalToken.set(res.access_token);
      setAccount(res.account);
      return res.account;
    },
    [orgSlug]
  );

  const logout = useCallback(() => {
    portalToken.clear();
    setAccount(null);
  }, []);

  const setPassword = useCallback(async (newPassword: string) => {
    await portalApi.setPassword(newPassword);
    const me = await portalApi.me();
    setAccount(me);
  }, []);

  return (
    <PortalAuthContext.Provider
      value={{
        account,
        isAuthenticated: !!account,
        isLoading,
        mustReset: !!account?.must_reset,
        orgSlug,
        login,
        logout,
        setPassword,
        refresh: loadMe,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within a PortalAuthProvider");
  return ctx;
}
