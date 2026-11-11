"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, setApiUid } from "@/lib/api";
import { firebaseConfigured, firebaseSignOut, mirrorProfile, signInWithGoogle, watchAuth } from "@/lib/firebase";
import type { Track } from "@/lib/types";
import { randomId } from "@/lib/utils";

/* ───────────── Theme ───────────── */
type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeCtx);

/* ───────────── Settings ───────────── */
export type Quality = "96kbps" | "160kbps" | "320kbps";
type Settings = { language: string; quality: Quality; ready: boolean };
const SettingsCtx = createContext<{
  settings: Settings;
  setLanguage: (l: string) => void;
  setQuality: (q: Quality) => void;
}>({
  settings: { language: "malayalam", quality: "160kbps", ready: false },
  setLanguage: () => {},
  setQuality: () => {},
});
export const useSettings = () => useContext(SettingsCtx);

/* ───────────── Identity ───────────── */
export type Me = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  accent: string;
  bio?: string;
  showActivity: boolean;
};
type IdentityValue = {
  me: Me | null;
  ready: boolean;
  isGuest: boolean;
  firebaseEnabled: boolean;
  setMe: (m: Me) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};
const IdentityCtx = createContext<IdentityValue>({
  me: null,
  ready: false,
  isGuest: true,
  firebaseEnabled: false,
  setMe: () => {},
  signIn: async () => {},
  signOut: async () => {},
});
export const useMe = () => useContext(IdentityCtx);

/* ───────────── UI ───────────── */
export type ShareData = {
  kind: "song" | "room" | "playlist" | "profile" | "app";
  title: string;
  subtitle?: string;
  image?: string;
  url: string;
  text?: string;
};
export type Panel = "none" | "now" | "queue" | "friends" | "lyrics" | "together";
export type FullTab = "player" | "lyrics" | "queue" | "together";
type Toast = { id: number; msg: string };
type UIValue = {
  toast: (msg: string) => void;
  toasts: Toast[];
  fullOpen: boolean;
  setFullOpen: (v: boolean) => void;
  fullTab: FullTab;
  setFullTab: (t: FullTab) => void;
  openFull: (tab?: FullTab) => void;
  panel: Panel;
  togglePanel: (p: Panel) => void;
  setPanel: (p: Panel) => void;
  share: ShareData | null;
  openShare: (d: ShareData | null) => void;
  pickerTrack: Track | null;
  openPicker: (t: Track | null) => void;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
};
const UICtx = createContext<UIValue | null>(null);
export function useUI(): UIValue {
  const v = useContext(UICtx);
  if (!v) throw new Error("UI provider missing");
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // theme
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    const saved = localStorage.getItem("swaram:theme");
    const initial: Theme = saved === "light" ? "light" : "dark";
    setThemeState(initial);
    document.documentElement.dataset.theme = initial;
  }, []);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("swaram:theme", t);
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#000000" : "#e9ebee");
  }, []);
  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  const themeValue = useMemo(() => ({ theme, setTheme, toggle: toggleTheme }), [theme, setTheme, toggleTheme]);

  // settings
  const [settings, setSettings] = useState<Settings>({ language: "malayalam", quality: "160kbps", ready: false });
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("swaram:settings") ?? "{}") as Partial<Settings>;
      setSettings({
        language: typeof raw.language === "string" ? raw.language : "malayalam",
        quality: raw.quality === "96kbps" || raw.quality === "320kbps" ? raw.quality : "160kbps",
        ready: true,
      });
    } catch {
      setSettings((s) => ({ ...s, ready: true }));
    }
  }, []);
  const persist = (s: Settings) => {
    try {
      localStorage.setItem("swaram:settings", JSON.stringify({ language: s.language, quality: s.quality }));
    } catch {
      /* ignore */
    }
  };
  const setLanguage = useCallback((language: string) => {
    setSettings((s) => {
      const n = { ...s, language };
      persist(n);
      return n;
    });
  }, []);
  const setQuality = useCallback((quality: Quality) => {
    setSettings((s) => {
      const n = { ...s, quality };
      persist(n);
      return n;
    });
  }, []);
  const settingsValue = useMemo(() => ({ settings, setLanguage, setQuality }), [settings, setLanguage, setQuality]);

  // identity (guest profile by default, Google via Firebase when configured)
  const [me, setMeState] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const guestRef = useRef<string>("");
  useEffect(() => {
    let guest = "";
    try {
      guest = localStorage.getItem("swaram:guest") ?? "";
      if (!guest) {
        guest = `g_${randomId(22)}`;
        localStorage.setItem("swaram:guest", guest);
      }
    } catch {
      guest = `g_${randomId(22)}`;
    }
    guestRef.current = guest;
    let cancelled = false;
    const unsub = watchAuth(async (fu) => {
      const id = fu ? fu.uid : guest;
      setApiUid(id);
      setIsGuest(!fu);
      try {
        const res = await api<{ user: Me }>("/api/users", {
          method: "POST",
          body: {
            id,
            username: fu ? (fu.email?.split("@")[0] ?? fu.displayName ?? undefined) : `listener_${randomId(5)}`,
            displayName: fu?.displayName ?? "Swaram Listener",
            avatarUrl: fu?.photoURL ?? null,
            sync: !!fu,
          },
        });
        if (cancelled) return;
        setMeState(res.user);
        if (fu) void mirrorProfile(fu.uid, { username: res.user.username, displayName: res.user.displayName, photoURL: fu.photoURL ?? null });
      } catch {
        /* offline or API unavailable: app still works without social features */
      } finally {
        if (!cancelled) setReady(true);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const setMe = useCallback((m: Me) => setMeState(m), []);
  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);
  const signOut = useCallback(async () => {
    await firebaseSignOut();
  }, []);
  const identityValue = useMemo<IdentityValue>(
    () => ({ me, ready, isGuest, firebaseEnabled: firebaseConfigured, setMe, signIn, signOut }),
    [me, ready, isGuest, setMe, signIn, signOut],
  );

  // UI
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const toast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const [fullOpen, setFullOpen] = useState(false);
  const [fullTab, setFullTab] = useState<FullTab>("player");
  const openFull = useCallback((tab?: FullTab) => {
    if (tab) setFullTab(tab);
    setFullOpen(true);
  }, []);
  const [panel, setPanel] = useState<Panel>("none");
  const togglePanel = useCallback((p: Panel) => setPanel((cur) => (cur === p ? "none" : p)), []);
  const [share, openShare] = useState<ShareData | null>(null);
  const [pickerTrack, openPicker] = useState<Track | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const uiValue = useMemo<UIValue>(
    () => ({
      toast,
      toasts,
      fullOpen,
      setFullOpen,
      fullTab,
      setFullTab,
      openFull,
      panel,
      togglePanel,
      setPanel,
      share,
      openShare,
      pickerTrack,
      openPicker,
      createOpen,
      setCreateOpen,
    }),
    [toast, toasts, fullOpen, fullTab, openFull, panel, togglePanel, share, pickerTrack, createOpen],
  );

  return (
    <ThemeCtx.Provider value={themeValue}>
      <SettingsCtx.Provider value={settingsValue}>
        <IdentityCtx.Provider value={identityValue}>
          <UICtx.Provider value={uiValue}>{children}</UICtx.Provider>
        </IdentityCtx.Provider>
      </SettingsCtx.Provider>
    </ThemeCtx.Provider>
  );
}
