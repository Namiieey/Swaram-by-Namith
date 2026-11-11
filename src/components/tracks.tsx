"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowDownCircle,
  CheckCircle2,
  Clock3,
  Disc3,
  Download,
  Heart,
  ListEnd,
  ListPlus,
  ListStart,
  MoreHorizontal,
  Play,
  Share2,
  Trash2,
  User,
} from "lucide-react";
import { useUI } from "@/context/app";
import { useDownloads, useLibrary } from "@/context/library";
import { usePlayer } from "@/context/player";
import { getAlbum, getArtist, getPlaylist } from "@/lib/saavn";
import type { Entity, Track } from "@/lib/types";
import { cn, fmtTime } from "@/lib/utils";
import { Cover, EqBars, IconBtn, PlayFab, PopMenu, type MenuItem } from "./ui";

export function useTrackMenu(track: Track, extra: MenuItem[] = []): MenuItem[] {
  const router = useRouter();
  const player = usePlayer();
  const lib = useLibrary();
  const dl = useDownloads();
  const ui = useUI();
  const liked = lib.isLiked(track.id);
  const downloaded = dl.isDownloaded(track.id);
  return [
    { label: "Add to queue", icon: <ListEnd size={16} />, onClick: () => player.enqueue(track) },
    { label: "Play next", icon: <ListStart size={16} />, onClick: () => player.playNext(track) },
    { label: "Add to playlist", icon: <ListPlus size={16} />, onClick: () => ui.openPicker(track) },
    {
      label: liked ? "Remove from Liked Songs" : "Save to Liked Songs",
      icon: <Heart size={16} fill={liked ? "currentColor" : "none"} />,
      onClick: () => lib.toggleLike(track),
    },
    downloaded
      ? { label: "Remove download", icon: <Trash2 size={16} />, onClick: () => void dl.remove(track.id) }
      : { label: "Download for offline", icon: <Download size={16} />, onClick: () => void dl.download(track) },
    {
      label: "Share",
      icon: <Share2 size={16} />,
      onClick: () =>
        ui.openShare({
          kind: "song",
          title: track.name,
          subtitle: track.artists,
          image: track.image,
          url: `${location.origin}/track/${track.id}`,
          text: `Listen to “${track.name}” by ${track.artists} on Swaram`,
        }),
    },
    { label: "Go to artist", icon: <User size={16} />, hidden: !track.artistId, onClick: () => router.push(`/artist/${track.artistId}`) },
    { label: "Go to album", icon: <Disc3 size={16} />, hidden: !track.albumId, onClick: () => router.push(`/album/${track.albumId}`) },
    ...extra,
  ];
}

export function TrackMenu({ track, extra, className }: { track: Track; extra?: MenuItem[]; className?: string }) {
  const items = useTrackMenu(track, extra);
  return (
    <PopMenu
      items={items}
      title={
        <div className="flex items-center gap-3">
          <Cover src={track.image} alt={track.name} className="h-12 w-12" />
          <div className="min-w-0">
            <p className="truncate font-bold">{track.name}</p>
            <p className="truncate text-sm text-sub">{track.artists}</p>
          </div>
        </div>
      }
      trigger={(open) => (
        <IconBtn label="More options" onClick={(e) => { e.stopPropagation(); open(); }} className={cn("h-8 w-8", className)}>
          <MoreHorizontal size={20} />
        </IconBtn>
      )}
    />
  );
}

export function DownloadBadge({ id, size = 16 }: { id: string; size?: number }) {
  const dl = useDownloads();
  const p = dl.progress[id];
  if (p !== undefined)
    return (
      <span title="Downloading" className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 20 20" className="spin" width={size} height={size}>
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" />
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeDasharray={`${Math.max(8, p * 50)} 60`} strokeLinecap="round" />
        </svg>
      </span>
    );
  if (dl.isDownloaded(id)) return <CheckCircle2 size={size} className="text-brand" aria-label="Downloaded" />;
  return null;
}

/* ───────────── Rows ───────────── */
export function TrackRow({
  track,
  index,
  list,
  source,
  showAlbum = true,
  showCover = true,
  extra,
  right,
}: {
  track: Track;
  index?: number;
  list: Track[];
  source?: string;
  showAlbum?: boolean;
  showCover?: boolean;
  extra?: MenuItem[];
  right?: ReactNode;
}) {
  const player = usePlayer();
  const lib = useLibrary();
  const isCurrent = player.current?.id === track.id;
  const liked = lib.isLiked(track.id);
  const activate = () => {
    if (isCurrent) player.toggle();
    else player.play(track, list, source);
  };
  return (
    <div
      onClick={activate}
      className={cn(
        "group grid cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-fg/10 md:px-4",
        showAlbum ? "grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,4fr)_minmax(0,3fr)_auto]" : "grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[24px_minmax(0,1fr)_auto]",
      )}
    >
      <div className="relative grid h-6 place-items-center text-center text-[15px] tabular-nums text-sub">
        {isCurrent ? (
          <span className="group-hover:hidden"><EqBars playing={player.isPlaying} /></span>
        ) : (
          <span className="group-hover:hidden">{index !== undefined ? index + 1 : <Play size={14} />}</span>
        )}
        <span className="hidden text-fg group-hover:block">
          {isCurrent && player.isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {showCover && <Cover src={track.image} alt={track.name} className="h-10 w-10" iconSize={16} />}
        <div className="min-w-0">
          <p className={cn("truncate text-[15px] font-medium", isCurrent && "text-brand")}>{track.name}</p>
          <p className="truncate text-sm text-sub">
            {track.artistId ? (
              <Link href={`/artist/${track.artistId}`} onClick={(e) => e.stopPropagation()} className="hover:text-fg hover:underline">
                {track.artists}
              </Link>
            ) : (
              track.artists
            )}
          </p>
        </div>
      </div>

      {showAlbum && (
        <div className="hidden min-w-0 text-sm text-sub md:block">
          {track.albumId ? (
            <Link href={`/album/${track.albumId}`} onClick={(e) => e.stopPropagation()} className="truncate hover:text-fg hover:underline">
              {track.album}
            </Link>
          ) : (
            <span className="truncate">{track.album}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-1 md:gap-3">
        {right}
        <DownloadBadge id={track.id} />
        <button
          aria-label={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            lib.toggleLike(track);
          }}
          className={cn("press hidden h-8 w-8 place-items-center md:grid", liked ? "text-brand" : "text-sub opacity-0 hover:text-fg group-hover:opacity-100")}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="hidden w-10 text-right text-sm tabular-nums text-sub md:block">{fmtTime(track.duration)}</span>
        <TrackMenu track={track} extra={extra} className="md:opacity-0 md:group-hover:opacity-100" />
      </div>
    </div>
  );
}

export function TrackListHeader({ showAlbum = true }: { showAlbum?: boolean }) {
  return (
    <div
      className={cn(
        "sticky top-16 z-10 mb-2 hidden items-center gap-3 border-b border-line px-4 py-2 text-xs font-medium uppercase tracking-wider text-sub backdrop-blur-xl md:grid",
        showAlbum ? "grid-cols-[24px_minmax(0,4fr)_minmax(0,3fr)_auto]" : "grid-cols-[24px_minmax(0,1fr)_auto]",
      )}
    >
      <span className="text-center">#</span>
      <span>Title</span>
      {showAlbum && <span>Album</span>}
      <span className="flex justify-end pr-[66px]"><Clock3 size={15} /></span>
    </div>
  );
}

export function TrackList({
  tracks,
  source,
  showAlbum = true,
  header = true,
  extraFor,
}: {
  tracks: Track[];
  source?: string;
  showAlbum?: boolean;
  header?: boolean;
  extraFor?: (t: Track) => MenuItem[] | undefined;
}) {
  return (
    <div>
      {header && <TrackListHeader showAlbum={showAlbum} />}
      {tracks.map((t, i) => (
        <TrackRow key={`${t.id}-${i}`} track={t} index={i} list={tracks} source={source} showAlbum={showAlbum} extra={extraFor?.(t)} />
      ))}
    </div>
  );
}

/* ───────────── Cards ───────────── */
export function usePlayEntity() {
  const player = usePlayer();
  const ui = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (e: Entity) => {
    setBusy(e.id);
    try {
      if (e.type === "album") {
        const a = await getAlbum(e.id);
        player.playList(a.songs, 0, a.name);
      } else if (e.type === "playlist") {
        const p = await getPlaylist(e.id);
        player.playList(p.songs, 0, p.name);
      } else {
        const a = await getArtist(e.id);
        player.playList(a.topSongs, 0, a.name);
      }
    } catch {
      ui.toast("Couldn't load that right now");
    } finally {
      setBusy(null);
    }
  };
  return { play: run, busy };
}

export function EntityCard({ e, className }: { e: Entity; className?: string }) {
  const { play, busy } = usePlayEntity();
  const href = `/${e.type}/${e.id}`;
  const round = e.type === "artist";
  return (
    <Link
      href={href}
      className={cn("group relative w-40 shrink-0 snap-start rounded-xl p-3 transition hover:bg-fg/10 md:w-[11.5rem]", className)}
    >
      <div className="relative">
        <Cover src={e.image} alt={e.title} round={round} className={cn("aspect-square w-full shadow-lg", !round && "rounded-lg")} iconSize={40} />
        <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
          <PlayFab size={46} playing={false} onClick={() => void play(e)} className={cn(busy === e.id && "animate-pulse")} />
        </div>
      </div>
      <p className={cn("mt-3 truncate text-[15px] font-bold", round && "text-center")}>{e.title}</p>
      <p className={cn("mt-0.5 line-clamp-2 text-sm text-sub", round && "text-center")}>{e.subtitle}</p>
    </Link>
  );
}

export function TrackCard({ track, list, source }: { track: Track; list: Track[]; source?: string }) {
  const player = usePlayer();
  const isCurrent = player.current?.id === track.id;
  return (
    <div
      onClick={() => (isCurrent ? player.toggle() : player.play(track, list, source))}
      className="group relative w-40 shrink-0 cursor-pointer snap-start rounded-xl p-3 transition hover:bg-fg/10 md:w-[11.5rem]"
    >
      <div className="relative">
        <Cover src={track.image} alt={track.name} className="aspect-square w-full rounded-lg shadow-lg" iconSize={40} />
        <div
          className={cn(
            "absolute bottom-2 right-2 transition duration-300 max-md:hidden",
            isCurrent && player.isPlaying ? "opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
          )}
        >
          <PlayFab size={46} playing={isCurrent && player.isPlaying} onClick={() => (isCurrent ? player.toggle() : player.play(track, list, source))} />
        </div>
      </div>
      <p className={cn("mt-3 truncate text-[15px] font-bold", isCurrent && "text-brand")}>{track.name}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-sub">{track.artists}</p>
    </div>
  );
}

export function RoundArtist({ name, image, href }: { name: string; image?: string; href?: string }) {
  const body = (
    <div className="group w-40 shrink-0 snap-start rounded-xl p-3 text-center transition hover:bg-fg/10 md:w-[11.5rem]">
      <Cover src={image} alt={name} round className="aspect-square w-full shadow-lg" iconSize={40} />
      <p className="mt-3 truncate text-[15px] font-bold">{name}</p>
      <p className="mt-0.5 text-sm text-sub">Artist</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export { ArrowDownCircle };
