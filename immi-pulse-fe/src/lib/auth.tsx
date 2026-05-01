"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

const TOKEN_KEY = "ip_token";
const USER_KEY = "ip_user";
const ORG_KEY = "ip_org";

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface Org {
  id: string;
  name: string;
  niche?: string | null;
  omara_number?: string | null;
  country: string;
}

export interface Seat {
  id: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  org: Org | null;
  seat: Seat | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export interface SignupPayload {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  firm_name: string;
  promo_code?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    const savedOrg = localStorage.getItem(ORG_KEY);
    if (savedToken && savedUser && savedOrg) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      const parsedOrg = JSON.parse(savedOrg);
      setOrg(parsedOrg.org);
      setSeat(parsedOrg.seat);
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((token: string, user: User, org: Org, seat: Seat) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ORG_KEY, JSON.stringify({ org, seat }));
    setToken(token);
    setUser(user);
    setOrg(org);
    setSeat(seat);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.post("/auth/login", { email, password });
      persist(res.data.token, res.data.user, res.data.org, res.data.seat);
      router.push("/dashboard");
    },
    [persist, router]
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const res = await apiClient.post("/auth/signup", payload);
      persist(res.data.token, res.data.user, res.data.org, res.data.seat);
      router.push("/onboarding");
    },
    [persist, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
    setToken(null);
    setUser(null);
    setOrg(null);
    setSeat(null);
    router.push("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      const me = res.data;
      setUser(me.user);
      setOrg(me.org);
      setSeat(me.seat);
      localStorage.setItem(USER_KEY, JSON.stringify(me.user));
      localStorage.setItem(ORG_KEY, JSON.stringify({ org: me.org, seat: me.seat }));
    } catch {
      // Silent — caller decides
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        seat,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
