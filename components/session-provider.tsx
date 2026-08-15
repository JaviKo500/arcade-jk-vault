"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearSession,
  getSession,
  setSession as persistSession,
  type Session,
} from "@/lib/session";

type SessionContextValue = {
  session: Session;
  signIn: (name: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type Listener = () => void;
let listeners: Listener[] = [];
let cachedSession: Session | undefined;

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Session {
  if (cachedSession === undefined) {
    cachedSession = getSession();
  }
  return cachedSession;
}

function getServerSnapshot(): Session {
  return null;
}

function writeSession(next: Session) {
  cachedSession = next;
  if (next) {
    persistSession(next);
  } else {
    clearSession();
  }
  listeners.forEach((listener) => listener());
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const signIn = (name: string) => {
    writeSession({ name });
  };

  const signOut = () => {
    writeSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
