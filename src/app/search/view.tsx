"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useSettings } from "@/context/app";
import { usePlayer } from "@/context/player";
import { useAsync } from "@/lib/hooks";
import { LANGUAGES, langLabel, searchAlbums, searchArtists, searchPlaylists, searchSongs } from "@/lib/saavn";
import type { Entity, Track } from "@/lib/types";
import { EntityCard, TrackRow } from "@/components/tracks";
import { Cover, ErrorState, PlayFab, Shelf, ShelfSkeleton } from "@/components/ui";
import { TrackSkeletons } from "@/components/collection";

const MOODS: { label: string; color: string; q: string }[] = [
  { label: "Romantic", color: "#e8115b", q: "romantic" },
  { label: "Party", color: "#8d67ab", q: "party dance" },
  { label: "Chill", color: "#1e3264", q: "melody chill" },
  { label: "Workout", color: "#d84000", q: "workout energetic" },
  { label: "Devotional", color: "#e1118c", q: "devotional" },
  { label: "Retro Classics", color: "#477d95", q: "90s old hits" },
  { label: "Sad Songs", color: "#503750", q: "sad" },
  { label: "Mass Hits", color: "#b02897", q: "mass" },
  { label: "Folk", color: "#148a08", q: "folk" },
  { label: "Hip-Hop", color: "#bc5900", q: "hip hop rap" },
  { label: "Indie", color: "#27856a", q: "indie" },
  { label: "Wedding", color: "#dc148c", q: "wedding" },
  { label: "Lo-fi", color: "#006450", q: "lofi" },
  { label: "Rock", color: "#e61e32", q: "rock" },
];
const LANG_COLORS = ["#0d73ec", "#af2896", "#e13300", "#608108", "#8c1932", "#1e3264", "#b49bc8", "#477d95", "#e8115b", "#148a08", "#7d4b32", "#503750"];

type Results = { songs: Track[]; albums: Entity[]; artists: Entity[]; playlists: Entity[] };

export function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const { settings } = useSettings();
  const [text, setText] = useState(urlQ);
  const [q, setQ] = useState(urlQ);
  const player = usePlayer();
  const qRef = useRef(urlQ);

  // debounce typing → query + URL
  useEffect(() => {
    const t = setTimeout(() => {
      const v = text.trim();
      qRef.current = v;
      setQ(v);
      router.replace(v ? `/search?q=${encodeURIComponent(v)}` : "/search", { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [text, router]);
  // external navigation (e.g., browser back) updates the field
  useEffect(() => {
    if (urlQ === qRef.current) return;
    qRef.current = urlQ;
    setText(urlQ);
    setQ(urlQ);
  }, [urlQ]);

  const { data, loading, error, reload } = useAsync<Results | null>(async () => {
    if (!q) return null;
    const [s, al, ar, pl] = await Promise.allSettled([searchSongs(q, 24), searchAlbums(q, 12), searchArtists(q, 12), searchPlaylists(q, 12)]);
    if (s.status === "rejected" && al.status === "rejected" && ar.status === "rejected" && pl.status === "rejected") {
      throw new Error("Search is unavailable right now. Please try again.");
    }
    const ok = <T,>(r: PromiseSettledResult<T[]>): T[] => (r.status === "fulfilled" ? r.value : []);
    return { songs: ok(s), albums: ok(al), artists: ok(ar), playlists: ok(pl) };
  }, [q]);

  const top = data?.songs[0];
  const nothing = data && !data.songs.length && !data.albums.length && !data.artists.length && !data.playlists.length;

  return (
    <div className="pt-1">
      <div className="sticky top-16 z-20 -mx-4 mb-5 px-4 py-2 md:-mx-6 md:px-6">
        <div className="glass relative flex h-12 max-w-xl items-center rounded-full">
          <SearchIcon size={20} className="ml-4 shrink-0 text-sub" />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you want to play?"
            aria-label="Search"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium outline-none placeholder:text-sub"
          />
          {text && (
            <button aria-label="Clear search" onClick={() => setText("")} className="mr-3 text-sub hover:text-fg">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {!q && (
        <>
          <h2 className="mb-4 text-2xl font-bold">Browse languages</h2>
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {LANGUAGES.map((l, i) => (
              <Tile key={l.id} label={l.label} sub={l.native} color={LANG_COLORS[i % LANG_COLORS.length]} onClick={() => setText(`${l.label} songs`)} highlight={l.id === settings.language} />
            ))}
          </div>
          <h2 className="mb-4 text-2xl font-bold">Browse all</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {MOODS.map((m) => (
              <Tile key={m.label} label={m.label} color={m.color} onClick={() => setText(`${langLabel(settings.language)} ${m.q}`)} />
            ))}
          </div>
        </>
      )}

      {q && loading && !data && (
        <>
          <TrackSkeletons />
          <div className="mt-6"><ShelfSkeleton /></div>
        </>
      )}
      {q && error && <ErrorState message={error} onRetry={reload} />}
      {q && nothing && (
        <div className="py-16 text-center">
          <p className="text-2xl font-bold">No results found for “{q}”</p>
          <p className="mt-2 text-sub">Please check the spelling, or try different keywords.</p>
        </div>
      )}

      {q && data && !nothing && (
        <div className="fade-up">
          <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {top && (
              <div>
                <h2 className="mb-3 text-2xl font-bold">Top result</h2>
                <div
                  onClick={() => (player.current?.id === top.id ? player.toggle() : player.play(top, data.songs, `Search: ${q}`))}
                  className="group relative cursor-pointer rounded-2xl bg-fg/[0.07] p-5 transition hover:bg-fg/[0.13]"
                >
                  <Cover src={top.image} alt={top.name} className="h-24 w-24 shadow-xl" iconSize={36} />
                  <p className="mt-4 line-clamp-2 text-3xl font-extrabold">{top.name}</p>
                  <p className="mt-1 text-sm text-sub">
                    <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-white">Song</span> <span className="ml-2 font-medium text-fg">{top.artists}</span>
                  </p>
                  <div className="absolute bottom-5 right-5 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:opacity-100">
                    <PlayFab size={52} playing={player.current?.id === top.id && player.isPlaying} onClick={() => (player.current?.id === top.id ? player.toggle() : player.play(top, data.songs, `Search: ${q}`))} />
                  </div>
                </div>
              </div>
            )}
            {data.songs.length > 0 && (
              <div>
                <h2 className="mb-3 text-2xl font-bold">Songs</h2>
                {data.songs.slice(0, 5).map((t) => (
                  <TrackRow key={t.id} track={t} list={data.songs} source={`Search: ${q}`} showAlbum={false} />
                ))}
              </div>
            )}
          </div>

          {data.songs.length > 5 && (
            <section className="mb-8">
              <h2 className="mb-3 text-2xl font-bold">More songs</h2>
              {data.songs.slice(5).map((t) => (
                <TrackRow key={t.id} track={t} list={data.songs} source={`Search: ${q}`} />
              ))}
            </section>
          )}
          {data.artists.length > 0 && (
            <Shelf title="Artists">
              {data.artists.map((e) => (
                <EntityCard key={e.id} e={e} />
              ))}
            </Shelf>
          )}
          {data.albums.length > 0 && (
            <Shelf title="Albums">
              {data.albums.map((e) => (
                <EntityCard key={e.id} e={e} />
              ))}
            </Shelf>
          )}
          {data.playlists.length > 0 && (
            <Shelf title="Playlists">
              {data.playlists.map((e) => (
                <EntityCard key={e.id} e={e} />
              ))}
            </Shelf>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ label, sub, color, onClick, highlight }: { label: string; sub?: string; color: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="press relative aspect-[1.7/1] overflow-hidden rounded-xl p-4 text-left text-white shadow-lg transition hover:brightness-110"
      style={{ background: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }}
    >
      <span className="block text-xl font-extrabold leading-tight">{label}</span>
      {sub && <span className="mt-0.5 block text-sm font-medium text-white/80">{sub}</span>}
      {highlight && <span className="absolute left-4 top-auto mt-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase">Default</span>}
      <span className="absolute -bottom-3 -right-4 h-20 w-20 rotate-[25deg] rounded-lg bg-black/25 shadow-2xl" />
      <span className="absolute -bottom-1 right-1 h-12 w-12 rotate-[25deg] rounded-md bg-white/20" />
    </button>
  );
}
