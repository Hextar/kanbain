"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { logout as logoutRequest } from "../api/session";
import type { AuthSession } from "../types";

type AuthContextValue = {
  session: AuthSession;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: AuthSession;
}) {
  const [session, setSession] = useState(initial);

  const signOut = useCallback(async () => {
    await logoutRequest();
    setSession(initial);
    window.location.assign("/login");
  }, [initial]);

  return (
    <AuthContext.Provider value={{ session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
