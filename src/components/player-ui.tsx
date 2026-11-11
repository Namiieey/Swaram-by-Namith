"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Download,
  ListMusic,
  Maximize2,
  Mic2,
  Pause,
  PanelRight,
  Play,
  Radio,
  Share2,
  Users,
  Loader2,
  ArrowDownCircle,
} from "lucide-react";
import { useUI } from "@/context/app";
import { useDownloads } from "@/context/library";
import { usePlayer, usePlayerTime } from "@/context/player";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LikeButton, Seekbar, Transport, VolumeSlider } from "./controls";
import { LyricsView, QueueView, TogetherView } from "./panels";
import { DownloadBadge, TrackMenu } from "./tracks";
import { Cover, EqBars, IconBtn } from "./ui";

export function useShareTrack() {
  const ui = useUI();
  return (t: Track) =>
    ui.openShare({
      kind: "song",
      title: t.name,
      subtitle: t.artists,
      image: t.image,
      url: `${location.origin}/track/${t.id}`,
      text: `I'm listening to “${t.name}” by ${t.artists} on Swaram 🎧`,
    });
}

export function DownloadButton({ track, size = 20, className }: { track: Track; size?: number; className?: string }) {
  const dl = useDownloads();
  const downloaded = dl.isDownloaded(track.id);
  const busy = dl.progress[track.id] !== undefined;
  return (
    <IconBtn
      label={downloaded ? "Remove download" : busy ? "Downloading…" : "Download for offline"}
      onClick={(e) => {
        e.stopPropagation();
        if (downloaded) void dl.remove(track.id);
        else if (!busy) void dl.download(track);
      }}
      active={downloaded}
      className={cn("h-9 w-9", className)}
    >
      {busy ? <DownloadBadge id={track.id} size={size} /> : downloaded ? <ArrowDownCircle size={size} fill="currentColor" className="text-brand [&>path]:stroke-black" /> : <Download size={size} />}
    </IconBtn>
  );
}

/* ───────────── Desktop bottom bar ───────────── */
export function PlayerBar() {
  const p = usePlayer();
  const ui = useUI();
  const share = useShareTrack();
  const cur = p.current;
  return (
    <div className="glass mx-2 mb-2 hidden h-[84px] shrink-0 grid-cols-[1fr_minmax(320px,640px)_1fr] items-center gap-4 rounded-2xl px-4 md:grid">
      <div className="flex min-w-0 items-center gap-3">
        {cur ? (
          <>
            <button onClick={() => ui.openFull()} className="group relative" aria-label="Open full screen player">
              <Cover src={cur.image} alt={cur.name} className="h-14 w-14 shadow-lg" iconSize={22} />
              <span className="absolute inset-0 grid place-items-center rounded-[6px] bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Maximize2 size={18} className="text-white" />
              </span>
            </button>
            <div className="min-w-0">
              <Link href={cur.albumId ? `/album/${cur.albumId}` : "#"} className="block truncate text-sm font-semibold hover:underline">
                {cur.name}
              </Link>
              <Link href={cur.artistId ? `/artist/${cur.artistId}` : "#"} className="block truncate text-xs text-sub hover:text-fg hover:underline">
                {cur.artists}
              </Link>
            </div>
            <LikeButton track={cur} size={18} />
          </>
        ) : (
          <p className="text-sm text-sub">Pick something to play</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Transport size="md" />
        <Seekbar />
      </div>

      <div className="flex items-center justify-end gap-0.5">
        {cur && <IconBtn label="Share" onClick={() => share(cur)} className="h-8 w-8"><Share2 size={17} /></IconBtn>}
        {cur && <DownloadButton track={cur} size={17} className="h-8 w-8" />}
        <IconBtn label="Now playing view" active={ui.panel === "now"} onClick={() => ui.togglePanel("now")} className="hidden h-8 w-8 lg:grid"><PanelRight size={17} /></IconBtn>
        <IconBtn label="Lyrics" active={ui.panel === "lyrics"} onClick={() => ui.togglePanel("lyrics")} className="hidden h-8 w-8 lg:grid"><Mic2 size={17} /></IconBtn>
        <IconBtn label="Queue" active={ui.panel === "queue"} onClick={() => ui.togglePanel("queue")} className="hidden h-8 w-8 lg:grid"><ListMusic size={17} /></IconBtn>
        <IconBtn label="Listening together" active={ui.panel === "together" || !!p.room} onClick={() => ui.togglePanel("together")} className="hidden h-8 w-8 lg:grid"><Radio size={17} /></IconBtn>
        <IconBtn label="Friend activity" active={ui.panel === "friends"} onClick={() => ui.togglePanel("friends")} className="hidden h-8 w-8 lg:grid"><Users size={17} /></IconBtn>
        <IconBtn label="Lyrics & queue" onClick={() => ui.openFull("lyrics")} className="h-8 w-8 lg:hidden"><Mic2 size={17} /></IconBtn>
        <VolumeSlider />
        <IconBtn label="Full screen" onClick={() => ui.openFull()} className="h-8 w-8"><Maximize2 size={17} /></IconBtn>
      </div>
    </div>
  );
}

/* ───────────── Mobile floating mini player ───────────── */
export function MiniPlayer() {
  const p = usePlayer();
  const ui = useUI();
  const { time, duration } = usePlayerTime();
  const cur = p.current;
  if (!cur || ui.fullOpen) return null;
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div
      onClick={() => ui.openFull()}
      className="glass fade-up fixed inset-x-2 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-[60] flex h-[58px] cursor-pointer items-center gap-3 overflow-hidden rounded-2xl pl-2 pr-1 md:hidden"
      style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.55), rgb(var(--accent-rgb) / 0.18)), color-mix(in srgb, var(--panel) 60%, transparent)" }}
    >
      <Cover src={cur.image} alt={cur.name} className="h-11 w-11 shadow-md" iconSize={18} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{cur.name}</p>
        <p className="truncate text-xs text-fg/70">
          {p.room ? <span className="mr-1 inline-flex items-center gap-1 text-brand"><Radio size={11} /> Together ·</span> : null}
          {cur.artists}
        </p>
      </div>
      <LikeButton track={cur} size={20} className="text-fg/80" />
      <button
        aria-label={p.isPlaying ? "Pause" : "Play"}
        onClick={(e) => {
          e.stopPropagation();
          p.toggle();
        }}
        className="press grid h-11 w-11 place-items-center rounded-full text-fg"
      >
        {p.loading && p.isPlaying ? <Loader2 size={24} className="spin" /> : p.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
      </button>
      <div className="absolute inset-x-3 bottom-0 h-[2px] rounded bg-fg/15">
        <div className="h-full rounded bg-fg" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ───────────── Desktop Dynamic Island ───────────── */
export function DynamicIsland() {
  const p = usePlayer();
  const ui = useUI();
  const share = useShareTrack();
  const cur = p.current;
  const [hover, setHover] = useState(false);
  const [peek, setPeek] = useState(false);
  const [pinned, setPinned] = useState(false);
  const playingRef = useRef(p.isPlaying);
  playingRef.current = p.isPlaying;
  const first = useRef(true);

  useEffect(() => {
    if (!cur) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (!playingRef.current) return;
    setPeek(true);
    const t = setTimeout(() => setPeek(false), 3800);
    return () => clearTimeout(t);
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur || ui.fullOpen) return null;
  const open = hover || peek || pinned;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] hidden justify-center md:flex">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => !open && setPinned(true)}
        className={cn("island glass-dark dark-scope pointer-events-auto relative cursor-default overflow-hidden", !open && "cursor-pointer")}
        style={{
          width: open ? 440 : p.room ? 268 : 236,
          height: open ? 172 : 40,
          borderRadius: open ? 34 : 20,
          boxShadow: open
            ? `inset 0 1px 0 rgb(255 255 255 / .25), 0 24px 60px -12px rgb(var(--accent-rgb) / ${p.isPlaying ? 0.6 : 0.25}), 0 0 0 1px rgb(255 255 255 / .06)`
            : undefined,
        }}
        role="region"
        aria-label="Now playing"
      >
        {/* ambient colour wash */}
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(120% 140% at 0% 0%, rgb(var(--accent-rgb) / .45), transparent 60%)" }} />

        {/* compact */}
        <div className={cn("island-content absolute inset-0 flex items-center gap-2.5 px-2.5", open && "island-hide")}>
          <Cover src={cur.image} alt={cur.name} round className={cn("h-7 w-7", p.isPlaying && "vinyl")} iconSize={12} />
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{cur.name}</p>
          {p.room && <Radio size={14} className="text-brand" />}
          <EqBars playing={p.isPlaying} />
        </div>

        {/* expanded */}
        <div className={cn("island-content absolute inset-0 flex flex-col gap-2 p-4", !open && "island-hide")}>
          <div className="flex items-center gap-3">
            <button onClick={() => ui.openFull()} aria-label="Open full screen player">
              <Cover src={cur.image} alt={cur.name} className="h-16 w-16 shadow-xl" iconSize={24} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold leading-tight">{cur.name}</p>
              <p className="truncate text-sm text-white/65">{cur.artists}</p>
              {p.room && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand">
                  <Radio size={11} /> Listening together · {p.room.members.length}
                </p>
              )}
            </div>
            <EqBars playing={p.isPlaying} className="h-5" />
          </div>
          <Seekbar />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <LikeButton track={cur} size={18} className="h-8 w-8" />
              <IconBtn label="Share" onClick={() => share(cur)} className="h-8 w-8"><Share2 size={17} /></IconBtn>
            </div>
            <Transport size="sm" dark />
            <div className="flex items-center gap-1">
              <IconBtn label="Lyrics" onClick={() => ui.openFull("lyrics")} className="h-8 w-8"><Mic2 size={17} /></IconBtn>
              <IconBtn label="Expand" onClick={() => ui.openFull()} className="h-8 w-8"><Maximize2 size={16} /></IconBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Full-screen player ───────────── */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex-1 rounded-full py-2 text-sm font-bold transition", active ? "bg-white text-black" : "text-white/70 hover:text-white")}
    >
      {children}
    </button>
  );
}

export function FullPlayer() {
  const p = usePlayer();
  const ui = useUI();
  const share = useShareTrack();
  const cur = p.current;
  const open = ui.fullOpen && !!cur;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && ui.setFullOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ui]);

  const tab = ui.fullTab;
  const rightTab = tab === "player" ? "lyrics" : tab;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "dark-scope fixed inset-0 z-[80] overflow-hidden bg-black text-white transition-[transform,visibility] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
        open ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      {cur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cur.image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-150 object-cover opacity-60 blur-3xl saturate-150" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/85" />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),14px)] md:px-10">
        <div className="flex items-center justify-between gap-3">
          <IconBtn label="Close player" onClick={() => ui.setFullOpen(false)} className="h-10 w-10 text-white"><ChevronDown size={28} /></IconBtn>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{p.room ? "Listening together" : "Playing from"}</p>
            <p className="truncate text-sm font-bold">{p.room ? `Session ${p.room.code}` : p.source || cur?.album || "Swaram"}</p>
          </div>
          {cur ? <TrackMenu track={cur} className="h-10 w-10 text-white" /> : <span className="w-10" />}
        </div>

        {open && cur && (
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-center md:gap-14">
            {/* player column */}
            <div className={cn("min-h-0 flex-col justify-center gap-5 md:flex md:w-[44%] md:max-w-[460px]", tab === "player" ? "flex flex-1" : "hidden")}>
              <div className="mx-auto w-[min(100%,44vh)] md:w-full md:max-w-[min(100%,52vh)]">
                <Cover src={cur.image} alt={cur.name} className="aspect-square w-full rounded-2xl shadow-[0_30px_80px_-10px_rgb(0_0_0/.7)]" iconSize={80} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-extrabold md:text-3xl">{cur.name}</h2>
                    <Link
                      href={cur.artistId ? `/artist/${cur.artistId}` : "#"}
                      onClick={() => ui.setFullOpen(false)}
                      className="block truncate text-base text-white/70 hover:text-white hover:underline"
                    >
                      {cur.artists}
                    </Link>
                  </div>
                  <LikeButton track={cur} size={26} className="h-11 w-11" />
                </div>
                <div className="mt-3">
                  <Seekbar always />
                </div>
                <div className="mt-2">
                  <Transport size="lg" dark />
                </div>
                <div className="mt-3 flex items-center justify-between px-2 text-white/80">
                  <IconBtn label="Listening together" active={!!p.room} onClick={() => ui.setFullTab("together")} className="h-10 w-10"><Radio size={21} /></IconBtn>
                  <DownloadButton track={cur} size={21} className="h-10 w-10" />
                  <IconBtn label="Share" onClick={() => share(cur)} className="h-10 w-10"><Share2 size={21} /></IconBtn>
                  <IconBtn label="Queue" onClick={() => ui.setFullTab("queue")} className="h-10 w-10 md:hidden"><ListMusic size={21} /></IconBtn>
                </div>
              </div>
            </div>

            {/* side column: lyrics / queue / together */}
            <div className={cn("min-h-0 flex-1 flex-col md:flex md:h-[72vh]", tab === "player" ? "hidden" : "flex")}>
              <div className="mb-3 flex items-center gap-3 md:hidden">
                <Cover src={cur.image} alt={cur.name} className="h-12 w-12" iconSize={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{cur.name}</p>
                  <p className="truncate text-sm text-white/65">{cur.artists}</p>
                </div>
                <button onClick={p.toggle} aria-label="Play/Pause" className="press grid h-11 w-11 place-items-center rounded-full bg-white text-black">
                  {p.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
              </div>
              <div className="mb-3 hidden gap-1 rounded-full bg-white/10 p-1 md:flex">
                <TabButton active={rightTab === "lyrics"} onClick={() => ui.setFullTab("lyrics")}>Lyrics</TabButton>
                <TabButton active={rightTab === "queue"} onClick={() => ui.setFullTab("queue")}>Queue</TabButton>
                <TabButton active={rightTab === "together"} onClick={() => ui.setFullTab("together")}>Together</TabButton>
              </div>
              <div className="glass min-h-0 flex-1 overflow-y-auto rounded-3xl p-3 md:p-5" style={{ background: "rgb(0 0 0 / .28)" }}>
                {rightTab === "lyrics" && <LyricsView big />}
                {rightTab === "queue" && <QueueView />}
                {rightTab === "together" && <TogetherView />}
              </div>
            </div>
          </div>
        )}

        {/* mobile tab bar */}
        <div className="mt-3 flex gap-1 rounded-full bg-white/10 p-1 md:hidden">
          <TabButton active={tab === "player"} onClick={() => ui.setFullTab("player")}>Player</TabButton>
          <TabButton active={tab === "lyrics"} onClick={() => ui.setFullTab("lyrics")}>Lyrics</TabButton>
          <TabButton active={tab === "queue"} onClick={() => ui.setFullTab("queue")}>Queue</TabButton>
          <TabButton active={tab === "together"} onClick={() => ui.setFullTab("together")}>Together</TabButton>
        </div>
      </div>
    </div>
  );
}
