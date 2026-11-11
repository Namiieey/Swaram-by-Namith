"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { ArrowDownCircle, Heart } from "lucide-react";
import { useSettings } from "@/context/app";
import { useDownloads, useLibrary } from "@/context/library";
import { usePlayer } from "@/context/player";
import { getRecent } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { LANGUAGES, langLabel, searchAlbums, searchArtists, searchPlaylists, searchSongs } from "@/lib/saavn";
import type { Entity, Track } from "@/lib/types";
import { EntityCard, RoundArtist, TrackCard } from "@/components/tracks";
import { PlaylistCover } from "@/components/dialogs";
import { UserPlaylistCard } from "@/components/collection";
import { Chip, Cover, ErrorState, Shelf, ShelfSkeleton } from "@/components/ui";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type HomeData = {
  trending: Track[];
  romantic: Track[];
  party: Track[];
  playlists: Entity[];
  albums: Entity[];
  artists: Entity[];
};

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}

function QuickTile({ href, cover, title, onPlay }: { href: string; cover: ReactNode; title: string; onPlay?: () => void }) {
  return (
    <Link href={href} className="group relative flex items-center gap-3 overflow-hidden rounded-md bg-fg/[0.08] pr-3 transition hover:bg-fg/[0.16]">
      {cover}
      <span className="min-w-0 flex-1 truncate text-sm font-bold md:text-base">{title}</span>
      {onPlay && (
        <button
          aria-label={`Play ${title}`}
          onClick={(e) => {
            e.preventDefault();
            onPlay();
          }}
          className="press absolute right-2 hidden h-10 w-10 place-items-center rounded-full bg-brand text-onbrand opacity-0 shadow-xl transition group-hover:opacity-100 md:grid"
        >
          <Play size={18} fill="currentColor" className="translate-x-px" />
        </button>
      )}
    </Link>
  );
}

export default function HomePage() {
  const { settings, setLanguage } = useSettings();
  const lib = useLibrary();
  const dl = useDownloads();
  const player = usePlayer();
  const lang = settings.language;
  const label = langLabel(lang);
  const [recent, setRecent] = useState<Track[]>([]);
  useEffect(() => setRecent(getRecent()), []);

  const { data, loading, error, reload } = useAsync<HomeData | null>(async () => {
    if (!settings.ready) return null;
    const [t, r, p, pl, al] = await Promise.allSettled([
      searchSongs(`${lang} top hits`, 30),
      searchSongs(`${lang} romantic songs`, 20),
      searchSongs(`${lang} dance party`, 20),
      searchPlaylists(lang, 14),
      searchAlbums(lang, 14),
    ]);
    const trending = settled(t, []);
    if (t.status === "rejected" && r.status === "rejected" && pl.status === "rejected") {
      throw new Error("We couldn't reach the music service. Check your connection and try again.");
    }
    // popular artists derived from the trending list (names + ids), enriched with photos
    const seen = new Set<string>();
    const names: { id?: string; name: string }[] = [];
    for (const tr of trending) {
      const name = tr.artists.split(",")[0]?.trim();
      if (name && !seen.has(name) && names.length < 10) {
        seen.add(name);
        names.push({ id: tr.artistId, name });
      }
    }
    const artistResults = await Promise.allSettled(names.map((n) => searchArtists(n.name, 3)));
    const artists: Entity[] = [];
    artistResults.forEach((res, i) => {
      if (res.status !== "fulfilled" || !res.value.length) return;
      const pick = res.value.find((a) => a.id === names[i].id) ?? res.value[0];
      if (!artists.some((a) => a.id === pick.id)) artists.push(pick);
    });
    return {
      trending,
      romantic: settled(r, []),
      party: settled(p, []),
      playlists: settled(pl, []),
      albums: settled(al, []),
      artists,
    };
  }, [lang, settings.ready]);

  const quick = useMemo(() => {
    const items: { href: string; title: string; cover: ReactNode; play?: () => void }[] = [
      { href: "/liked", title: "Liked Songs", cover: <div className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-indigo-600 to-sky-300 text-white md:h-16 md:w-16"><Heart size={22} fill="currentColor" /></div>, play: lib.likes.length ? () => player.playList(lib.likes, 0, "Liked Songs") : undefined },
      { href: "/downloads", title: "Downloads", cover: <div className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-emerald-500 to-lime-300 text-black md:h-16 md:w-16"><ArrowDownCircle size={24} /></div>, play: dl.items.length ? () => player.playList(dl.items.map((i) => i.track), 0, "Downloads") : undefined },
    ];
    for (const p of lib.playlists.slice(0, 2)) {
      items.push({ href: `/p/${p.id}`, title: p.name, cover: <PlaylistCover covers={p.covers} name={p.name} className="h-14 w-14 !rounded-none md:h-16 md:w-16" collaborative={p.isCollaborative} /> });
    }
    for (const pl of (data?.playlists ?? []).slice(0, 8 - items.length)) {
      items.push({ href: `/playlist/${pl.id}`, title: pl.title, cover: <Cover src={pl.image} alt={pl.title} className="h-14 w-14 !rounded-none md:h-16 md:w-16" iconSize={20} /> });
    }
    return items;
  }, [lib.likes, lib.playlists, dl.items, data?.playlists, player]);

  return (
    <div className="pt-1">
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6">
        {LANGUAGES.slice(0, 7).map((l) => (
          <Chip key={l.id} active={l.id === lang} onClick={() => setLanguage(l.id)}>
            {l.label}
          </Chip>
        ))}
        <Link href="/settings" className="press whitespace-nowrap rounded-full bg-fg/10 px-3.5 py-1.5 text-sm font-medium hover:bg-fg/15">
          More…
        </Link>
      </div>

      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">{greeting()}</h1>
      <div className="mb-9 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {quick.map((q) => (
          <QuickTile key={q.href} href={q.href} cover={q.cover} title={q.title} onPlay={q.play} />
        ))}
      </div>

      {recent.length > 0 && (
        <Shelf title="Recently played">
          {recent.slice(0, 14).map((t) => (
            <TrackCard key={t.id} track={t} list={recent} source="Recently played" />
          ))}
        </Shelf>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading && !data && (
        <>
          <ShelfSkeleton />
          <ShelfSkeleton />
          <ShelfSkeleton round />
        </>
      )}

      {data && (
        <>
          {data.trending.length > 0 && (
            <Shelf title={`Trending in ${label}`}>
              {data.trending.map((t) => (
                <TrackCard key={t.id} track={t} list={data.trending} source={`Trending in ${label}`} />
              ))}
            </Shelf>
          )}
          {data.playlists.length > 0 && (
            <Shelf title={`${label} playlists for you`}>
              {data.playlists.map((e) => (
                <EntityCard key={e.id} e={e} />
              ))}
            </Shelf>
          )}
          {data.artists.length > 0 && (
            <Shelf title="Popular artists">
              {data.artists.map((a) => (
                <RoundArtist key={a.id} name={a.title} image={a.image} href={`/artist/${a.id}`} />
              ))}
            </Shelf>
          )}
          {data.romantic.length > 0 && (
            <Shelf title="Romantic melodies">
              {data.romantic.map((t) => (
                <TrackCard key={t.id} track={t} list={data.romantic} source="Romantic melodies" />
              ))}
            </Shelf>
          )}
          {data.albums.length > 0 && (
            <Shelf title="New releases">
              {data.albums.map((e) => (
                <EntityCard key={e.id} e={e} />
              ))}
            </Shelf>
          )}
          {data.party.length > 0 && (
            <Shelf title="Party & dance">
              {data.party.map((t) => (
                <TrackCard key={t.id} track={t} list={data.party} source="Party & dance" />
              ))}
            </Shelf>
          )}
          {lib.playlists.length > 0 && (
            <Shelf title="Your playlists">
              {lib.playlists.map((p) => (
                <UserPlaylistCard key={p.id} p={p} />
              ))}
            </Shelf>
          )}
        </>
      )}

      <footer className="mt-12 border-t border-line pt-6 text-sm text-sub">
        <p className="font-bold text-fg">Swaram by Namith</p>
        <p>
          Music via the JioSaavn unofficial API · Lyrics via LRCLIB · Developed by{" "}
          <a href="https://namithrn.vercel.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-fg hover:text-brand hover:underline">
            Namith RN
          </a>
        </p>
      </footer>
    </div>
  );
}
