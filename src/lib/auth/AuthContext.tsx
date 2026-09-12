"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as cognito from "./cognitoClient";

interface AuthState {
  idToken: string | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "ripple.idToken";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the stored token can only be
    // read after mount — this one-time read-on-mount is the standard
    // exception to "don't setState in an effect".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdToken(localStorage.getItem(STORAGE_KEY));
    setIsReady(true);
  }, []);

  function persist(token: string | null) {
    setIdToken(token);
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  }

  const value: AuthState = {
    idToken,
    isReady,
    async signIn(email, password) {
      const tokens = await cognito.signIn(email, password);
      persist(tokens.idToken);
    },
    signOut() {
      persist(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
