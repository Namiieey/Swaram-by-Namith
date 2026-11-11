"use client";

import { useState, type CSSProperties } from "react";
import {
  Heart,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { useLibrary } from "@/context/library";
import { usePlayer, usePlayerTime } from "@/context/player";
import type { Track } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";
import { IconBtn } from "./ui";

export function Seekbar({ className, showTimes = true, always }: { className?: string; showTimes?: boolean; always?: boolean }) {
  const { time, duration } = usePlayerTime();
  const { seek, current } = usePlayer();
  const [drag, setDrag] = useState<number | null>(null);
  const max = duration || current?.duration || 1;
  const val = Math.min(drag ?? time, max);
  const commit = () => {
    if (drag !== null) {
      seek(drag);
      setDrag(null);
    }
  };
  return (
    <div className={cn("group flex w-full items-center gap-2", className)}>
      {showTimes && <span className="w-10 text-right text-[11px] tabular-nums text-sub">{fmtTime(val)}</span>}
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={max}
        step={0.1}
        value={val}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className={cn("spot flex-1", always && "always")}
        style={{ "--pct": `${(val / max) * 100}%` } as CSSProperties}
      />
      {showTimes && <span className="w-10 text-[11px] tabular-nums text-sub">{fmtTime(max)}</span>}
    </div>
  );
}

export function VolumeSlider({ className }: { className?: string }) {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? VolumeX : v < 0.4 ? Volume1 : Volume2;
  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <IconBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="h-8 w-8">
        <Icon size={18} />
      </IconBtn>
      <input
        type="range"
        aria-label="Volume"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="spot w-24"
        style={{ "--pct": `${v * 100}%` } as CSSProperties}
      />
    </div>
  );
}

export function LikeButton({ track, size = 20, className }: { track: Track; size?: number; className?: string }) {
  const lib = useLibrary();
  const liked = lib.isLiked(track.id);
  return (
    <IconBtn
      label={liked ? "Remove from Liked Songs" : "Save to Liked Songs"}
      active={liked}
      onClick={(e) => {
        e.stopPropagation();
        lib.toggleLike(track);
      }}
      className={cn("h-9 w-9", className)}
    >
      <Heart size={size} fill={liked ? "currentColor" : "none"} className={liked ? "pop-in" : ""} />
    </IconBtn>
  );
}

export function Transport({ size = "md", dark }: { size?: "sm" | "md" | "lg"; dark?: boolean }) {
  const p = usePlayer();
  const big = size === "lg" ? 64 : size === "md" ? 40 : 34;
  const ico = size === "lg" ? 34 : 26;
  const tone = dark ? "text-white/70 hover:text-white" : "";
  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      <IconBtn label="Shuffle" active={p.shuffle} onClick={p.toggleShuffle} className={cn("h-8 w-8", !p.shuffle && tone)}>
        <Shuffle size={size === "lg" ? 22 : 18} />
      </IconBtn>
      <IconBtn label="Previous" onClick={p.prev} className={cn("h-9 w-9", dark ? "text-white" : "text-fg")}>
        <SkipBack size={ico - 4} fill="currentColor" />
      </IconBtn>
      <button
        aria-label={p.isPlaying ? "Pause" : "Play"}
        onClick={p.toggle}
        disabled={!p.current}
        className={cn(
          "press grid place-items-center rounded-full shadow-lg transition hover:scale-105 disabled:opacity-40",
          dark || size === "lg" ? "bg-white text-black" : "bg-fg text-bg",
        )}
        style={{ width: big, height: big }}
      >
        {p.loading && p.isPlaying ? (
          <Loader2 size={big * 0.5} className="spin" />
        ) : p.isPlaying ? (
          <Pause size={big * 0.46} fill="currentColor" />
        ) : (
          <Play size={big * 0.46} fill="currentColor" className="translate-x-[1px]" />
        )}
      </button>
      <IconBtn label="Next" onClick={p.next} className={cn("h-9 w-9", dark ? "text-white" : "text-fg")}>
        <SkipForward size={ico - 4} fill="currentColor" />
      </IconBtn>
      <IconBtn label="Repeat" active={p.repeat !== "off"} onClick={p.cycleRepeat} className={cn("h-8 w-8", p.repeat === "off" && tone)}>
        {p.repeat === "one" ? <Repeat1 size={size === "lg" ? 22 : 18} /> : <Repeat size={size === "lg" ? 22 : 18} />}
      </IconBtn>
    </div>
  );
}
