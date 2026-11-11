"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Link2, LogOut, Radio, Users, X, Music2, Share2 } from "lucide-react";
import { useMe, useUI } from "@/context/app";
import { usePlayer, usePlayerTime } from "@/context/player";
import { api } from "@/lib/api";
import { useAsync, useLyrics } from "@/lib/hooks";
import { getArtist } from "@/lib/saavn";
import type { ActivityItem } from "@/lib/types";
import { cn, fmtCount, timeAgo } from "@/lib/utils";
import { Avatar, Cover, EqBars, IconBtn } from "./ui";
import { TrackMenu } from "./tracks";

/* ───────────── Queue ───────────── */
export function QueueView() {
  const p = usePlayer();
  const upcoming = p.queue.slice(p.index + 1);
  return (
    <div className="px-1">
      {p.current && (
        <>
          <h4 className="mb-2 px-2 text-sm font-bold text-sub">Now playing</h4>
          <div className="flex items-center gap-3 rounded-lg bg-fg/10 p-2">
            <Cover src={p.current.image} alt={p.current.name} className="h-11 w-11" iconSize={18} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-brand">{p.current.name}</p>
              <p className="truncate text-sm text-sub">{p.current.artists}</p>
            </div>
            <EqBars playing={p.isPlaying} />
          </div>
        </>
      )}
      <div className="mb-2 mt-5 flex items-center justify-between px-2">
        <h4 className="text-sm font-bold text-sub">Next up</h4>
        {upcoming.length > 0 && (
          <button onClick={p.clearUpcoming} className="text-xs font-semibold text-sub hover:text-fg">
            Clear queue
          </button>
        )}
      </div>
      {upcoming.length === 0 && <p className="px-2 text-sm text-sub">Nothing queued. Songs you add will show up here.</p>}
      {upcoming.map((t, i) => {
        const real = p.index + 1 + i;
        return (
          <div key={`${t.id}-${real}`} onClick={() => p.jumpTo(real)} className="group flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-fg/10">
            <Cover src={t.image} alt={t.name} className="h-11 w-11" iconSize={18} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t.name}</p>
              <p className="truncate text-sm text-sub">{t.artists}</p>
            </div>
            <IconBtn
              label="Remove from queue"
              onClick={(e) => {
                e.stopPropagation();
                p.removeAt(real);
              }}
              className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <X size={16} />
            </IconBtn>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Lyrics ───────────── */
export function LyricsView({ big, className }: { big?: boolean; className?: string }) {
  const { current, seek } = usePlayer();
  const { time } = usePlayerTime();
  const { lyrics, loading } = useLyrics(current);
  const box = useRef<HTMLDivElement>(null);
  const activeIdx = useMemo(() => {
    if (!lyrics?.synced.length) return -1;
    let lo = 0;
    let hi = lyrics.synced.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lyrics.synced[mid].t <= time + 0.25) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }, [lyrics, time]);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(`[data-i="${activeIdx}"]`);
    const c = box.current;
    if (el && c) c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [activeIdx]);

  if (!current) return <p className="p-4 text-sub">Play a song to see its lyrics.</p>;
  if (loading)
    return (
      <div className="space-y-4 p-4">
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div key={i} className="skeleton h-6 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  if (!lyrics)
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <Music2 className="mx-auto mb-3 text-sub" size={34} />
          <p className="text-lg font-bold">No lyrics for this one yet</p>
          <p className="mt-1 text-sm text-sub">We looked on LRCLIB but couldn’t find a match. Enjoy the music!</p>
        </div>
      </div>
    );

  const synced = lyrics.synced.length > 0;
  return (
    <div ref={box} className={cn("no-scrollbar relative h-full overflow-y-auto scroll-smooth px-2 py-6", className)}>
      {synced ? (
        <div className="space-y-3 pb-[40%] pt-[20%]">
          {lyrics.synced.map((l, i) => (
            <p
              key={i}
              data-i={i}
              onClick={() => seek(l.t)}
              className={cn(
                "cursor-pointer font-bold leading-snug transition-all duration-300",
                big ? "text-2xl md:text-4xl" : "text-xl",
                i === activeIdx ? "origin-left scale-100 text-fg" : i < activeIdx ? "text-fg/35" : "text-fg/55",
                i === activeIdx ? "" : "hover:text-fg/80",
              )}
            >
              {l.text || "♪"}
            </p>
          ))}
        </div>
      ) : (
        <p className={cn("whitespace-pre-line font-bold leading-relaxed text-fg/90", big ? "text-xl md:text-2xl" : "text-lg")}>{lyrics.plain}</p>
      )}
      <p className="mt-6 text-xs text-sub">Lyrics by {lyrics.source ?? "LRCLIB"}</p>
    </div>
  );
}

/* ───────────── Friend activity ───────────── */
export function FriendActivityView({ compact }: { compact?: boolean }) {
  const { me } = useMe();
  const p = usePlayer();
  const { data, loading, reload } = useAsync(() => api<{ items: ActivityItem[]; following?: number }>("/api/activity"), [me?.id]);
  useEffect(() => {
    const t = setInterval(reload, 20_000);
    return () => clearInterval(t);
  }, [reload]);
  const items = data?.items ?? [];
  return (
    <div className="px-1">
      {loading && !data && (
        <div className="space-y-4 p-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="p-3 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-fg/10">
            <Users size={26} className="text-sub" />
          </div>
          <p className="font-bold">Let friends and followers see what you’re playing</p>
          <p className="mt-1 text-sm text-sub">Follow people to see their listening activity here.</p>
          <Link href="/community" className="press mt-4 inline-block rounded-full bg-fg px-5 py-2 text-sm font-bold text-bg">
            Find people
          </Link>
        </div>
      )}
      {items.map((it) => (
        <div key={it.user.id} className="group flex gap-3 rounded-lg p-2 hover:bg-fg/10">
          <Link href={`/user/${it.user.username}`}>
            <Avatar name={it.user.displayName} src={it.user.avatarUrl} color={it.user.accent} size={compact ? 36 : 40} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/user/${it.user.username}`} className="truncate text-sm font-bold hover:underline">
                {it.user.displayName}
              </Link>
              <span className="shrink-0 text-xs text-sub">{it.isPlaying ? <EqBars /> : timeAgo(it.at)}</span>
            </div>
            {it.track && (
              <button onClick={() => p.play(it.track!, [it.track!], `${it.user.displayName}'s activity`)} className="block w-full text-left">
                <p className="truncate text-sm hover:underline">{it.track.name}</p>
                <p className="truncate text-xs text-sub">
                  {it.track.artists}
                </p>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── Listening together ───────────── */
export function TogetherView() {
  const p = usePlayer();
  const ui = useUI();
  const { me } = useMe();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const shareRoom = (c: string) =>
    ui.openShare({
      kind: "room",
      title: "Listen together on Swaram",
      subtitle: `${me?.displayName ?? "A friend"} invited you · Code ${c}`,
      image: p.current?.image,
      url: `${location.origin}/room/${c}`,
      text: `Join my Listening Together session on Swaram — code ${c}`,
    });

  if (p.room) {
    const r = p.room;
    return (
      <div className="px-2">
        <div className="glass relative overflow-hidden rounded-2xl p-5 text-center">
          <Radio className="mx-auto mb-2 text-brand" size={26} />
          <p className="text-xs font-semibold uppercase tracking-widest text-sub">{r.isHost ? "You’re hosting" : "Listening together"}</p>
          <p className="mt-1 font-mono text-4xl font-black tracking-[0.25em]">{r.code}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => shareRoom(r.code)} className="press flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-onbrand">
              <Share2 size={16} /> Invite
            </button>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(`${location.origin}/room/${r.code}`);
                ui.toast("Invite link copied");
              }}
              className="press flex items-center gap-2 rounded-full bg-fg/10 px-4 py-2 text-sm font-bold hover:bg-fg/20"
            >
              <Link2 size={16} /> Copy link
            </button>
          </div>
        </div>
        {p.needsTap && (
          <button onClick={p.resumeBlocked} className="press mt-3 w-full rounded-full bg-brand py-3 text-sm font-bold text-onbrand">
            Tap to start listening
          </button>
        )}
        <p className="mb-2 mt-5 px-1 text-sm font-bold text-sub">Listeners · {r.members.length}</p>
        {r.members.map((m) => (
          <Link key={m.id} href={`/user/${m.username}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-fg/10">
            <Avatar name={m.displayName} src={m.avatarUrl} color={m.accent} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {m.displayName} {m.id === me?.id && <span className="text-sub">(you)</span>}
              </p>
              <p className="truncate text-xs text-sub">@{m.username}</p>
            </div>
            {m.id === r.hostId && <Crown size={16} className="text-yellow-400" aria-label="Host" />}
          </Link>
        ))}
        <p className="mt-3 px-1 text-xs text-sub">
          {r.isHost ? "Whatever you play is streamed in sync to everyone in the session." : "Playback is controlled by the host and stays in sync automatically."}
        </p>
        <button onClick={() => void p.leaveRoom()} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-bold hover:bg-fg/10">
          <LogOut size={16} /> {r.isHost ? "End session" : "Leave session"}
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 text-center">
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-brand/15 text-brand">
        <Radio size={30} />
      </div>
      <p className="text-lg font-extrabold">Listening Together</p>
      <p className="mt-1 text-sm text-sub">Start a live session and friends hear exactly what you hear, in perfect sync.</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const c = await p.createRoom();
          setBusy(false);
          if (c) shareRoom(c);
        }}
        className="press mt-4 w-full rounded-full bg-brand py-3 text-sm font-bold text-onbrand disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start a session"}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-sub">
        <span className="h-px flex-1 bg-line" /> or join with a code <span className="h-px flex-1 bg-line" />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (code.trim().length < 4) return;
          setBusy(true);
          await p.joinRoom(code.trim());
          setBusy(false);
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="ABC123"
          className="min-w-0 flex-1 rounded-full border border-line bg-fg/5 px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] outline-none placeholder:text-sub/60 focus:border-brand"
        />
        <button className="press rounded-full bg-fg px-5 text-sm font-bold text-bg">Join</button>
      </form>
    </div>
  );
}

/* ───────────── Now playing (desktop right panel) ───────────── */
export function NowPlayingView() {
  const p = usePlayer();
  const cur = p.current;
  const artistId = cur?.artistId;
  const { data: artist } = useAsync(() => (artistId ? getArtist(artistId) : Promise.resolve(null)), [artistId]);
  const nextTrack = p.queue[p.index + 1];
  if (!cur)
    return (
      <div className="grid h-full place-items-center p-8 text-center text-sub">
        <div>
          <Music2 className="mx-auto mb-3" size={36} />
          <p className="font-bold text-fg">Nothing playing</p>
          <p className="mt-1 text-sm">Pick a song to get started.</p>
        </div>
      </div>
    );
  return (
    <div className="px-2 pb-6">
      <Cover src={cur.image} alt={cur.name} className="aspect-square w-full rounded-xl shadow-2xl" iconSize={60} />
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-extrabold">{cur.name}</h3>
          <p className="truncate text-sub">{cur.artists}</p>
        </div>
        <TrackMenu track={cur} />
      </div>
      {artist && (
        <div className="glass mt-5 overflow-hidden rounded-2xl">
          <div className="relative h-40">
            <Cover src={artist.image} alt={artist.name} className="absolute inset-0 !rounded-none" iconSize={50} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <p className="absolute left-4 top-3 text-sm font-bold text-white drop-shadow">About the artist</p>
          </div>
          <div className="p-4">
            <Link href={`/artist/${artist.id}`} className="font-bold hover:underline">
              {artist.name}
            </Link>
            <p className="text-sm text-sub">{fmtCount(artist.followers)} followers</p>
            {artist.bio && <p className="mt-2 line-clamp-4 text-sm text-sub">{artist.bio}</p>}
          </div>
        </div>
      )}
      {nextTrack && (
        <div className="glass mt-4 rounded-2xl p-3">
          <p className="mb-2 text-sm font-bold">Next in queue</p>
          <div className="flex items-center gap-3">
            <Cover src={nextTrack.image} alt={nextTrack.name} className="h-11 w-11" iconSize={18} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{nextTrack.name}</p>
              <p className="truncate text-xs text-sub">{nextTrack.artists}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Desktop right panel ───────────── */
export function RightPanel() {
  const ui = useUI();
  const titles = {
    now: "Now playing",
    queue: "Queue",
    friends: "Friend Activity",
    lyrics: "Lyrics",
    together: "Listening Together",
    none: "",
  } as const;
  if (ui.panel === "none") return null;
  return (
    <aside className="panel fade-up hidden w-[340px] shrink-0 flex-col overflow-hidden rounded-xl lg:flex">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h3 className="text-base font-bold">{titles[ui.panel]}</h3>
        <IconBtn label="Close panel" onClick={() => ui.setPanel("none")} className="h-8 w-8">
          <X size={18} />
        </IconBtn>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {ui.panel === "now" && <NowPlayingView />}
        {ui.panel === "queue" && <QueueView />}
        {ui.panel === "friends" && <FriendActivityView />}
        {ui.panel === "lyrics" && <LyricsView />}
        {ui.panel === "together" && <TogetherView />}
      </div>
    </aside>
  );
}
