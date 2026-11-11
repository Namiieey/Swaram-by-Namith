"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Disc3, LogIn, Pencil, Play, Radio, Share2 } from "lucide-react";
import { UserPlaylistCard, Hero, HeroSkeleton } from "@/components/collection";
import { Toggle } from "@/components/dialogs";
import { FollowButton } from "@/components/social";
import { RoundArtist, TrackCard, TrackRow } from "@/components/tracks";
import { Avatar, Cover, Credits, ErrorState, EqBars, Modal, Shelf } from "@/components/ui";
import { useMe, useUI } from "@/context/app";
import { usePlayer } from "@/context/player";
import { api } from "@/lib/api";
import { mirrorProfile } from "@/lib/firebase";
import { useAsync } from "@/lib/hooks";
import { langLabel } from "@/lib/saavn";
import type { PlaylistSummary, PublicUser, Track } from "@/lib/types";
import { fmtCount, timeAgo } from "@/lib/utils";

type Profile = {
  user: PublicUser & { showActivity: boolean; createdAt: string };
  isMe: boolean;
  isFollowing: boolean;
  followers: number;
  following: number;
  totalPlays: number;
  nowPlaying: { track: Track; isPlaying: boolean; at: string | null } | null;
  topArtists: { name: string; id?: string; image: string; n: number }[];
  topTracks: { track: Track; n: number }[];
  recent: Track[];
  languages: { language: string; pct: number }[];
  playlists: PlaylistSummary[];
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { ready, me } = useMe();
  const ui = useUI();
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const { data, error, loading, reload } = useAsync<Profile | null>(() => (ready ? api<Profile>(`/api/users/${username}`) : Promise.resolve(null)), [username, ready, me?.id]);

  // live "now playing" refresh
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <HeroSkeleton />;
  if (!data) return <HeroSkeleton />;
  const u = data.user;
  const topLang = data.languages[0];

  return (
    <div>
      <Hero color={`color-mix(in srgb, ${u.accent} 70%, #111)`}>
        <Avatar name={u.displayName} src={u.avatarUrl} color={u.accent} size={208} className="shadow-[0_16px_60px_rgb(0_0_0/.5)] md:!h-60 md:!w-60" />
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-wider">Music Profile</p>
          <h1 className="my-2 line-clamp-2 text-5xl font-black leading-tight tracking-tight md:text-7xl">{u.displayName}</h1>
          <p className="text-sm font-medium text-fg/80">@{u.username}</p>
          {u.bio && <p className="mx-auto mt-2 max-w-xl text-sm text-fg/80 md:mx-0">{u.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium md:justify-start">
            <span>{data.playlists.length} public playlists</span>•<span>{fmtCount(data.followers)} followers</span>•<span>{fmtCount(data.following)} following</span>
            {data.totalPlays > 0 && <>•<span>{data.totalPlays}+ plays</span></>}
          </div>
        </div>
      </Hero>

      <div className="flex flex-wrap items-center gap-3 py-5">
        {data.isMe ? (
          <button onClick={() => setEditing(true)} className="press flex items-center gap-2 rounded-full border border-fg/40 px-5 py-2 text-sm font-bold hover:border-fg">
            <Pencil size={16} /> Edit profile
          </button>
        ) : (
          <FollowButton username={u.username} initial={data.isFollowing} onChange={() => reload()} className="px-6 py-2" />
        )}
        <button
          onClick={() =>
            ui.openShare({
              kind: "profile",
              title: u.displayName,
              subtitle: `@${u.username} · Music profile on Swaram`,
              image: u.avatarUrl ?? undefined,
              url: `${location.origin}/user/${u.username}`,
              text: `Check out ${u.displayName}'s music profile on Swaram`,
            })
          }
          className="press flex items-center gap-2 rounded-full border border-line px-5 py-2 text-sm font-bold hover:bg-fg/10"
        >
          <Share2 size={16} /> Share
        </button>
        {topLang && (
          <span className="glass rounded-full px-4 py-2 text-sm font-bold">
            <Disc3 size={14} className="mr-1.5 inline text-brand" />
            {langLabel(topLang.language)} Soul
          </span>
        )}
      </div>

      {data.nowPlaying && (
        <section className="glass mb-8 flex max-w-2xl items-center gap-4 rounded-2xl p-4">
          <Cover src={data.nowPlaying.track.image} alt={data.nowPlaying.track.name} className="h-20 w-20 shadow-lg" iconSize={28} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
              {data.nowPlaying.isPlaying ? (
                <>
                  <EqBars /> Listening now
                </>
              ) : (
                <>Last played {timeAgo(data.nowPlaying.at)}</>
              )}
            </p>
            <p className="truncate text-lg font-extrabold">{data.nowPlaying.track.name}</p>
            <p className="truncate text-sm text-sub">{data.nowPlaying.track.artists}</p>
          </div>
          <button
            aria-label="Play this song"
            onClick={() => player.play(data.nowPlaying!.track, [data.nowPlaying!.track], `${u.displayName}'s activity`)}
            className="press grid h-12 w-12 place-items-center rounded-full bg-brand text-onbrand"
          >
            <Play size={22} fill="currentColor" className="translate-x-px" />
          </button>
        </section>
      )}

      {data.topArtists.length > 0 && (
        <Shelf title="Top artists">
          {data.topArtists.map((a) => (
            <RoundArtist key={a.name} name={a.name} image={a.image} href={a.id ? `/artist/${a.id}` : undefined} />
          ))}
        </Shelf>
      )}

      {data.topTracks.length > 0 && (
        <section className="mb-8 max-w-4xl">
          <h2 className="mb-3 text-[22px] font-bold">Top tracks</h2>
          {data.topTracks.slice(0, 5).map((t, i) => (
            <TrackRow key={t.track.id} track={t.track} index={i} list={data.topTracks.map((x) => x.track)} source={`${u.displayName}'s top tracks`} showAlbum={false} right={<span className="hidden text-xs text-sub md:block">{t.n} plays</span>} />
          ))}
        </section>
      )}

      {data.languages.length > 0 && (
        <section className="mb-8 max-w-xl">
          <h2 className="mb-3 text-[22px] font-bold">Language mix</h2>
          <div className="glass space-y-3 rounded-2xl p-4">
            {data.languages.map((l) => (
              <div key={l.language}>
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{langLabel(l.language)}</span>
                  <span className="text-sub">{l.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-fg/10">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${l.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.recent.length > 0 && (
        <Shelf title="Recently played">
          {data.recent.map((t) => (
            <TrackCard key={t.id} track={t} list={data.recent} source={`${u.displayName}'s recent`} />
          ))}
        </Shelf>
      )}

      {data.playlists.length > 0 && (
        <Shelf title="Public playlists">
          {data.playlists.map((p) => (
            <UserPlaylistCard key={p.id} p={{ ...p, owner: u }} />
          ))}
        </Shelf>
      )}

      {data.totalPlays === 0 && data.playlists.length === 0 && !data.nowPlaying && (
        <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
          <Radio className="mx-auto mb-3 text-brand" size={30} />
          <p className="text-lg font-bold">{data.isMe ? "Your music profile is waiting" : "Nothing to show yet"}</p>
          <p className="mt-1 text-sm text-sub">{data.isMe ? "Play a few songs and your top artists, tracks and language mix will appear here." : `${u.displayName} hasn't listened to anything yet.`}</p>
          {data.isMe && (
            <Link href="/" className="press mt-4 inline-block rounded-full bg-fg px-5 py-2 text-sm font-bold text-bg">
              Start listening
            </Link>
          )}
        </div>
      )}

      <Credits className="mt-10" />

      {data.isMe && <EditProfile open={editing} onClose={() => setEditing(false)} profile={data} onSaved={reload} />}
    </div>
  );
}

const SWATCHES = ["#1ed760", "#e8115b", "#8d67ab", "#0d73ec", "#ff7a00", "#f5c518", "#00c2c7", "#ff4d8d"];

function EditProfile({ open, onClose, profile, onSaved }: { open: boolean; onClose: () => void; profile: Profile; onSaved: () => void }) {
  const { setMe, isGuest, firebaseEnabled, signIn } = useMe();
  const ui = useUI();
  const router = useRouter();
  const u = profile.user;
  const [displayName, setDisplayName] = useState(u.displayName);
  const [username, setUsername] = useState(u.username);
  const [bio, setBio] = useState(u.bio ?? "");
  const [accent, setAccent] = useState(u.accent);
  const [avatarUrl, setAvatarUrl] = useState(u.avatarUrl ?? "");
  const [showActivity, setShowActivity] = useState(u.showActivity);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDisplayName(u.displayName);
      setUsername(u.username);
      setBio(u.bio ?? "");
      setAccent(u.accent);
      setAvatarUrl(u.avatarUrl ?? "");
      setShowActivity(u.showActivity);
    }
  }, [open, u]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await api<{ user: PublicUser & { showActivity: boolean } }>(`/api/users/${u.username}`, {
        method: "PATCH",
        body: { displayName, username, bio, accent, avatarUrl: avatarUrl.trim() || null, showActivity },
      });
      setMe(res.user);
      void mirrorProfile(res.user.id, { username: res.user.username, displayName: res.user.displayName, bio: res.user.bio ?? "", accent: res.user.accent });
      ui.toast("Profile updated");
      onClose();
      if (res.user.username !== u.username) router.replace(`/user/${res.user.username}`);
      else onSaved();
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : "Couldn't save profile");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border border-line bg-fg/5 px-4 py-2.5 text-sm outline-none focus:border-brand";
  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar name={displayName || "S"} src={avatarUrl || null} color={accent} size={72} />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Profile photo URL (optional)" className={input} />
        </div>
        <input value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className={input} />
        <div className="flex items-center rounded-lg border border-line bg-fg/5 pl-4 focus-within:border-brand">
          <span className="text-sub">@</span>
          <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={24} placeholder="username" className="w-full bg-transparent px-1 py-2.5 text-sm outline-none" />
        </div>
        <textarea value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Bio" className={`${input} resize-none`} />
        <div>
          <p className="mb-2 text-sm font-bold">Accent colour</p>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button key={c} aria-label={c} onClick={() => setAccent(c)} className="h-8 w-8 rounded-full ring-offset-2 ring-offset-transparent transition hover:scale-110" style={{ background: c, boxShadow: accent === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }} />
            ))}
          </div>
        </div>
        <Toggle title="Share my listening activity" desc="Followers can see what you're playing" on={showActivity} set={setShowActivity} />
        {firebaseEnabled && isGuest && (
          <button onClick={() => void signIn().catch(() => ui.toast("Sign-in was cancelled"))} className="press flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-bold hover:bg-fg/10">
            <LogIn size={16} /> Sign in with Google to keep your profile on every device
          </button>
        )}
        <button disabled={busy} onClick={save} className="press w-full rounded-full bg-brand py-3 font-bold text-onbrand disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
