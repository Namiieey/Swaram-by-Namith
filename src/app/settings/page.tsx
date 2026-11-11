"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Cloud, LogIn, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { Avatar, Credits, Logo } from "@/components/ui";
import { useMe, useSettings, useTheme, useUI, type Quality } from "@/context/app";
import { useDownloads } from "@/context/library";
import { LANGUAGES } from "@/lib/saavn";
import { cn, fmtBytes } from "@/lib/utils";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="glass mb-5 rounded-3xl p-5 md:p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-sub">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { settings, setLanguage, setQuality } = useSettings();
  const { theme, setTheme } = useTheme();
  const { me, isGuest, firebaseEnabled, signIn, signOut } = useMe();
  const dl = useDownloads();
  const ui = useUI();
  const [clearing, setClearing] = useState(false);

  const qualities: { id: Quality; label: string; hint: string }[] = [
    { id: "96kbps", label: "Data saver", hint: "96 kbps" },
    { id: "160kbps", label: "Normal", hint: "160 kbps" },
    { id: "320kbps", label: "High", hint: "320 kbps" },
  ];

  return (
    <div className="max-w-3xl pt-2">
      <h1 className="mb-5 text-3xl font-extrabold tracking-tight">Settings</h1>

      <Section title="Song language" desc="Home and recommendations follow your language. Malayalam is the default.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => {
            const active = l.id === settings.language;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setLanguage(l.id);
                  ui.toast(`Language set to ${l.label}`);
                }}
                className={cn("press flex items-center justify-between rounded-xl border px-4 py-3 text-left transition", active ? "border-brand bg-brand/15" : "border-line bg-fg/5 hover:bg-fg/10")}
              >
                <span>
                  <span className="block font-bold">{l.label}</span>
                  <span className="block text-sm text-sub">{l.native}</span>
                </span>
                {active && <Check size={18} className="text-brand" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-2 gap-3">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn("press flex items-center gap-3 rounded-xl border px-4 py-4 transition", theme === t ? "border-brand bg-brand/15" : "border-line bg-fg/5 hover:bg-fg/10")}
            >
              {t === "dark" ? <Moon size={22} /> : <Sun size={22} />}
              <span className="font-bold capitalize">{t} mode</span>
              {theme === t && <Check size={18} className="ml-auto text-brand" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Audio quality" desc="Used for streaming and downloads.">
        <div className="grid grid-cols-3 gap-2">
          {qualities.map((q) => (
            <button
              key={q.id}
              onClick={() => setQuality(q.id)}
              className={cn("press rounded-xl border px-3 py-3 text-center transition", settings.quality === q.id ? "border-brand bg-brand/15" : "border-line bg-fg/5 hover:bg-fg/10")}
            >
              <span className="block font-bold">{q.label}</span>
              <span className="block text-xs text-sub">{q.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Offline storage" desc="Downloaded songs are stored privately on this device and play without internet.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-2xl font-extrabold">{dl.items.length}</span> songs · {fmtBytes(dl.totalSize)}
          </p>
          <div className="flex gap-2">
            <Link href="/downloads" className="press rounded-full border border-line px-4 py-2 text-sm font-bold hover:bg-fg/10">
              Open Downloads
            </Link>
            {dl.items.length > 0 && (
              <button
                disabled={clearing}
                onClick={async () => {
                  if (!confirm("Remove all downloaded songs?")) return;
                  setClearing(true);
                  for (const i of dl.items) await dl.remove(i.id);
                  setClearing(false);
                }}
                className="press flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={15} /> Clear
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Account & cloud sync" desc="Your music profile powers friend activity, collaborative playlists and listening together.">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={me?.displayName ?? "Swaram"} src={me?.avatarUrl} color={me?.accent} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{me?.displayName ?? "Connecting…"}</p>
            <p className="text-sm text-sub">{me ? `@${me.username} · ${isGuest ? "Guest profile on this device" : "Signed in with Google"}` : "Profile loading"}</p>
          </div>
          {me && (
            <Link href={`/user/${me.username}`} className="press rounded-full border border-line px-4 py-2 text-sm font-bold hover:bg-fg/10">
              View profile
            </Link>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-fg/5 p-3 text-sm">
          <Cloud size={20} className={firebaseEnabled ? "text-brand" : "text-sub"} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Firebase Cloud {firebaseEnabled ? "connected" : "not configured"}</p>
            <p className="text-xs text-sub">
              {firebaseEnabled
                ? "Google sign-in and Firestore profile sync are active."
                : "Add NEXT_PUBLIC_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID and _APP_ID environment variables to enable Google sign-in & Firestore sync."}
            </p>
          </div>
          {firebaseEnabled &&
            (isGuest ? (
              <button onClick={() => void signIn().catch(() => ui.toast("Sign-in was cancelled"))} className="press flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-bold text-bg">
                <LogIn size={15} /> Sign in
              </button>
            ) : (
              <button onClick={() => void signOut()} className="press flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold">
                <LogOut size={15} /> Sign out
              </button>
            ))}
        </div>
      </Section>

      <Section title="About">
        <Logo size={40} />
        <p className="mt-3 text-sm text-sub">
          Swaram (സ്വരം) means “voice” — a liquid-glass music experience with synced lyrics, offline downloads, listening together and collaborative playlists. Music from the open-source unofficial JioSaavn API, lyrics from LRCLIB.
        </p>
        <Credits className="mt-3 text-sm" />
      </Section>
    </div>
  );
}
