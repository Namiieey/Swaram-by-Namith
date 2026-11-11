"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Download, Shuffle } from "lucide-react";
import { useDownloads } from "@/context/library";
import { usePlayer } from "@/context/player";
import type { PlaylistSummary, Track } from "@/lib/types";
import { cn, fmtLong, hashColor } from "@/lib/utils";
import { PlaylistCover } from "./dialogs";
import { TrackList } from "./tracks";
import { Cover, IconBtn, PlayFab } from "./ui";
import type { MenuItem } from "./ui";

/** Big gradient hero that slides behind the sticky top bar (Spotify style). */
export function Hero({
  color,
  children,
  className,
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("-mx-4 -mt-16 flex flex-col items-center gap-5 px-4 pb-6 pt-24 md:-mx-6 md:flex-row md:items-end md:gap-6 md:px-6", className)}
      style={{ background: `linear-gradient(180deg, ${color} 0%, color-mix(in srgb, ${color} 35%, transparent) 100%)` }}
    >
      {children}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="-mx-4 -mt-16 flex flex-col items-center gap-5 px-4 pb-6 pt-24 md:-mx-6 md:flex-row md:items-end md:px-6">
      <div className="skeleton h-52 w-52 rounded-lg md:h-60 md:w-60" />
      <div className="w-full flex-1 space-y-3">
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-14 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function TrackSkeletons({ n = 8 }: { n?: number }) {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <div className="skeleton h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActionBar({
  tracks,
  source,
  children,
  downloadAll = true,
}: {
  tracks: Track[];
  source?: string;
  children?: ReactNode;
  downloadAll?: boolean;
}) {
  const p = usePlayer();
  const dl = useDownloads();
  const active = tracks.length > 0 && !!p.current && tracks.some((t) => t.id === p.current!.id) && p.source === source;
  const playing = active && p.isPlaying;
  return (
    <div className="flex items-center gap-3 py-5 md:gap-5">
      <PlayFab
        size={56}
        playing={playing}
        onClick={() => (active ? p.toggle() : p.playList(tracks, 0, source))}
        className={cn(tracks.length === 0 && "pointer-events-none opacity-40")}
      />
      <IconBtn label="Shuffle play" onClick={() => p.playShuffled(tracks, source)} className="h-10 w-10" disabled={!tracks.length}>
        <Shuffle size={28} />
      </IconBtn>
      {downloadAll && (
        <IconBtn label="Download all for offline" onClick={() => void dl.downloadMany(tracks)} className="h-10 w-10" disabled={!tracks.length}>
          <Download size={26} />
        </IconBtn>
      )}
      {children}
    </div>
  );
}

export function CollectionPage({
  cover,
  type,
  title,
  description,
  meta,
  tracks,
  source,
  color,
  actions,
  extraFor,
  empty,
  showAlbum = true,
}: {
  cover: ReactNode;
  type: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  tracks: Track[];
  source: string;
  color?: string;
  actions?: ReactNode;
  extraFor?: (t: Track) => MenuItem[] | undefined;
  empty?: ReactNode;
  showAlbum?: boolean;
}) {
  const total = tracks.reduce((a, t) => a + t.duration, 0);
  return (
    <div>
      <Hero color={color ?? hashColor(title, 55, 32)}>
        {cover}
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-wider">{type}</p>
          <h1 className="my-2 line-clamp-2 text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">{title}</h1>
          {description && <p className="line-clamp-2 text-sm text-fg/70">{description}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm font-medium md:justify-start">
            {meta}
            {meta && <span className="opacity-70">•</span>}
            <span>{tracks.length} songs</span>
            {total > 0 && <span className="opacity-70">, {fmtLong(total)}</span>}
          </div>
        </div>
      </Hero>
      <ActionBar tracks={tracks} source={source}>
        {actions}
      </ActionBar>
      {tracks.length === 0 ? (
        (empty ?? <p className="py-10 text-center text-sub">Nothing here yet.</p>)
      ) : (
        <TrackList tracks={tracks} source={source} extraFor={extraFor} showAlbum={showAlbum} />
      )}
    </div>
  );
}

export function BigCover({ src, alt, round }: { src?: string; alt: string; round?: boolean }) {
  return <Cover src={src} alt={alt} round={round} className="h-52 w-52 shadow-[0_16px_60px_rgb(0_0_0/.5)] md:h-60 md:w-60" iconSize={70} />;
}

export function UserPlaylistCard({ p, className }: { p: PlaylistSummary; className?: string }) {
  return (
    <Link href={`/p/${p.id}`} className={cn("group w-40 shrink-0 snap-start rounded-xl p-3 transition hover:bg-fg/10 md:w-[11.5rem]", className)}>
      <PlaylistCover covers={p.covers} name={p.name} collaborative={p.isCollaborative} className="aspect-square w-full rounded-lg shadow-lg" />
      <p className="mt-3 truncate text-[15px] font-bold">{p.name}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-sub">
        {p.isCollaborative ? "Collaborative • " : ""}
        {p.owner ? `By ${p.owner.displayName}` : `${p.trackCount} songs`}
      </p>
    </Link>
  );
}
