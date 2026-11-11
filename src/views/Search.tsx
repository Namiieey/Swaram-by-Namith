import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Loader2, Play, Search as SearchIcon, X } from 'lucide-react';
import { Album, Artist, Playlist, Track, searchAlbums, searchArtists, searchPlaylists, searchSongs, topResult, TopResult } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { LANGS, MOODS, langOf } from '../lib/languages';
import { useStore } from '../store';
import {
  AlbumCard, ArtistCard, Cover, Empty, ErrorBox, PageHeader, PlaylistCard, RailSection, RowsSkeleton, Reveal, SectionHead, SongRow, Tile
} from '../components/ui';

type Scope = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';
const SCOPES: { k: Scope; label: string }[] = [
  { k: 'all', label: 'Top Results' }, { k: 'songs', label: 'Songs' }, { k: 'albums', label: 'Albums' }, { k: 'artists', label: 'Artists' }, { k: 'playlists', label: 'Playlists' }
];

interface Results { songs: Track[]; total: number; albums: Album[]; artists: Artist[]; playlists: Playlist[]; top: TopResult }

async function runSearch(q: string): Promise<Results> {
  const [s, al, ar, pl, top] = await Promise.allSettled([searchSongs(q, 40, 1), searchAlbums(q, 20), searchArtists(q, 20), searchPlaylists(q, 20), topResult(q)]);
  const all = [s, al, ar, pl].every(x => x.status === 'rejected');
  if (all) throw new Error('Search failed');
  return {
    songs: s.status === 'fulfilled' ? s.value.tracks : [], total: s.status === 'fulfilled' ? s.value.total : 0,
    albums: al.status === 'fulfilled' ? al.value : [], artists: ar.status === 'fulfilled' ? ar.value : [],
    playlists: pl.status === 'fulfilled' ? pl.value : [], top: top.status === 'fulfilled' ? top.value : null
  };
}

function TopCard({ top, songs }: { top: NonNullable<TopResult> | { type: 'song'; track: Track }; songs: Track[] }) {
  const open = useStore(s => s.openDetail); const play = useStore(s => s.play);
  let img = '', title = '', sub = '', label = '', round = false, run: () => void = () => { /* noop */ };
  if ('track' in top) { img = top.track.img; title = top.track.name; sub = top.track.artist; label = 'Song'; run = () => play(songs, songs.indexOf(top.track)); }
  else {
    img = top.img; title = top.title; sub = top.sub; label = top.type.replace(/^./, c => c.toUpperCase()); round = top.type === 'artist';
    run = () => { if (top.type === 'song') { const i = songs.findIndex(s => s.id === top.id); if (i >= 0) play(songs, i); } else open({ type: top.type, id: top.id }); };
  }
  return (
    <button onClick={run} className="glass group relative flex w-full items-center gap-5 overflow-hidden rounded-[28px] p-5 text-left transition duration-500 hover:-translate-y-0.5 sm:p-6">
      <Cover src={img} className={`size-[104px] flex-none shadow-2xl shadow-black/60 ring-1 ring-white/15 transition-transform duration-700 group-hover:scale-105 sm:size-[132px] ${round ? 'rounded-full' : 'rounded-2xl'}`} eager />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-accent">Top Result · {label}</div>
        <div className="clamp-2 mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-[30px]">{title}</div>
        <div className="mt-1 truncate text-sm text-white/55">{sub}</div>
      </div>
      <span className="glass-clear hidden size-12 flex-none place-items-center rounded-full opacity-0 transition group-hover:opacity-100 sm:grid"><Play size={20} fill="currentColor" className="ml-0.5" /></span>
    </button>
  );
}

export default function Search() {
  const seed = useStore(s => s.searchSeed); const langs = useStore(s => s.langs);
  const searches = useStore(s => s.searches); const addSearch = useStore(s => s.addSearch);
  const removeSearch = useStore(s => s.removeSearch); const clearSearches = useStore(s => s.clearSearches);
  const openDetail = useStore(s => s.openDetail);

  const [q, setQ] = useState(seed.q); const [dq, setDq] = useState(seed.q.trim());
  const [scope, setScope] = useState<Scope>('all'); const [lf, setLf] = useState('all');
  const [extra, setExtra] = useState<Track[]>([]); const [page, setPage] = useState(1); const [more, setMore] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seed.q) {
      setQ(seed.q); setDq(seed.q.trim()); setScope('all'); addSearch(seed.q);
      useStore.setState(s => ({ searchSeed: { q: '', n: s.searchSeed.n } }));
    }
  }, [seed.n]); // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 340); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (matchMedia('(pointer:fine)').matches) setTimeout(() => input.current?.focus({ preventScroll: true }), 350); }, []);
  useEffect(() => { setExtra([]); setPage(1); }, [dq]);
  useEffect(() => { if (dq.length > 2) { const t = setTimeout(() => addSearch(dq), 1800); return () => clearTimeout(t); } }, [dq]); // eslint-disable-line

  const res = useAsync(() => (dq ? runSearch(dq) : Promise.resolve(null)), [dq]);

  const rank = <T extends { lang: string }>(arr: T[]): T[] => {
    if (lf !== 'all') return arr.filter(x => x.lang === lf || !x.lang);
    const mine = arr.filter(x => langs.includes(x.lang)); const rest = arr.filter(x => !langs.includes(x.lang));
    return mine.concat(rest);
  };
  const r = res.data;
  const songs = useMemo(() => rank([...(r?.songs || []), ...extra].filter((s, i, a) => a.findIndex(z => z.id === s.id) === i)), [r, extra, lf, langs]); // eslint-disable-line
  const albums = useMemo(() => rank(r?.albums || []), [r, lf, langs]); // eslint-disable-line
  const playlists = useMemo(() => rank(r?.playlists || []), [r, lf, langs]); // eslint-disable-line
  const artists = r?.artists || [];
  const total = r?.total || 0;
  const canMore = !!r && r.songs.length + extra.length < total;

  const loadMore = async () => {
    setMore(true);
    try { const n = await searchSongs(dq, 40, page + 1); setExtra(e => [...e, ...n.tracks]); setPage(p => p + 1); } catch { /* noop */ }
    setMore(false);
  };

  const topEl = useMemo(() => {
    if (!r) return null;
    if (r.top && (r.top.type !== 'song')) {
      if (lf !== 'all' && r.top.type === 'playlist') return r.top;
      return r.top;
    }
    return songs[0] ? ({ type: 'song', track: songs[0] } as const) : null;
  }, [r, songs, lf]);

  const none = !!r && !songs.length && !albums.length && !artists.length && !playlists.length;
  const suggestions = useMemo(() => Array.from(new Set(langs.flatMap(c => (langOf(c)?.suggest || []).slice(0, 5)))), [langs]);

  return (
    <div>
      <PageHeader title="Search" />
      <div className="sticky top-[calc(var(--safe-t)+10px)] z-30">
        <div className="glass glass-thick relative flex h-[54px] max-w-[720px] items-center gap-3 rounded-full px-5 focus-within:ring-2 focus-within:ring-accent/70">
          <SearchIcon size={19} className="flex-none text-white/50" />
          <input
            ref={input} value={q} onChange={e => setQ(e.target.value)} type="search" enterKeyHint="search" autoComplete="off" spellCheck={false}
            onKeyDown={e => { if (e.key === 'Enter') { setDq(q.trim()); addSearch(q); input.current?.blur(); } }}
            placeholder="Songs, albums, artists, playlists"
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {res.loading && dq && <Loader2 size={18} className="animate-spin text-white/50" />}
          {q && <button aria-label="Clear" onClick={() => { setQ(''); setDq(''); input.current?.focus(); }} className="grid size-6 flex-none place-items-center rounded-full bg-white/20 text-black transition hover:bg-white/40"><X size={14} strokeWidth={3} /></button>}
        </div>
      </div>

      {dq ? (
        <>
          {/* scope + language filters */}
          <div className="mt-5 flex flex-col gap-3">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {SCOPES.map(s => (
                <button key={s.k} onClick={() => setScope(s.k)} className={`chip relative ${scope === s.k ? '' : ''}`} style={scope === s.k ? { background: '#fa2d48', color: '#fff', borderColor: '#fa2d48' } : undefined}>{s.label}</button>
              ))}
            </div>
            <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <span className="flex-none text-xs font-semibold uppercase tracking-wider text-white/35">Language</span>
              <button className={`chip !py-1.5 ${lf === 'all' ? 'on' : ''}`} onClick={() => setLf('all')}>All</button>
              {Array.from(new Set([...langs, ...(lf !== 'all' && !langs.includes(lf) ? [lf] : [])])).map(c => <button key={c} className={`chip !py-1.5 ${lf === c ? 'on' : ''}`} onClick={() => setLf(c)}>{langOf(c)?.native ?? c}</button>)}
              {LANGS.filter(l => !langs.includes(l.code)).slice(0, 5).map(l => <button key={l.code} className={`chip !py-1.5 opacity-60 ${lf === l.code ? 'on !opacity-100' : ''}`} onClick={() => setLf(l.code)}>{l.native}</button>)}
            </div>
          </div>

          <motion.div key={dq + scope + lf} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6">
            {res.loading && <RowsSkeleton n={7} />}
            {!!res.error && !res.loading && <ErrorBox msg="Search failed. Check your connection." onRetry={res.retry} />}
            {none && !res.loading && (
              <Empty title={`No results for “${dq}”`}>
                Check the spelling{lf !== 'all' ? ', or ' : '.'}
                {lf !== 'all' && <button onClick={() => setLf('all')} className="font-semibold text-accent underline underline-offset-2">search in all languages</button>}
              </Empty>
            )}
            {r && !none && !res.loading && (
              <>
                {scope === 'all' && topEl && <div className="mb-8 max-w-[760px]"><TopCard top={topEl} songs={songs} /></div>}

                {scope === 'all' && artists.length > 0 && <RailSection title="Artists" className="!mt-2">{artists.slice(0, 14).map((a, i) => <ArtistCard key={a.id} a={a} i={i} />)}</RailSection>}

                {(scope === 'all' || scope === 'songs') && songs.length > 0 && (
                  <section className="mt-6">
                    <SectionHead title="Songs" sub={scope === 'songs' && total ? `${total.toLocaleString()} found` : undefined}>
                      {scope === 'all' && songs.length > 8 && <button onClick={() => setScope('songs')} className="flex items-center gap-1 text-sm font-semibold text-accent">See all <ArrowUpRight size={15} /></button>}
                    </SectionHead>
                    <div className="grid grid-cols-1 gap-x-8 xl:grid-cols-2">
                      {(scope === 'all' ? songs.slice(0, 8) : songs).map((t, i, a) => <SongRow key={t.id} track={t} list={scope === 'all' ? songs : a} i={i} />)}
                    </div>
                    {scope === 'songs' && canMore && (
                      <div className="mt-6 flex justify-center"><button onClick={loadMore} disabled={more} className="chip !px-6 !py-3">{more ? <Loader2 size={16} className="animate-spin" /> : null} Show more songs</button></div>
                    )}
                  </section>
                )}

                {(scope === 'all' || scope === 'albums') && albums.length > 0 && (scope === 'all'
                  ? <RailSection title="Albums">{albums.map((a, i) => <AlbumCard key={a.id} a={a} i={i} />)}</RailSection>
                  : <GridOf title="Albums">{albums.map((a, i) => <AlbumCard key={a.id} a={a} i={i} />)}</GridOf>)}

                {scope === 'artists' && artists.length > 0 && <GridOf title="Artists">{artists.map((a, i) => <ArtistCard key={a.id} a={a} i={i} />)}</GridOf>}

                {(scope === 'all' || scope === 'playlists') && playlists.length > 0 && (scope === 'all'
                  ? <RailSection title="Playlists">{playlists.map((p, i) => <PlaylistCard key={p.id} p={p} i={i} />)}</RailSection>
                  : <GridOf title="Playlists">{playlists.map((p, i) => <PlaylistCard key={p.id} p={p} i={i} />)}</GridOf>)}

                {scope !== 'all' && ((scope === 'songs' && !songs.length) || (scope === 'albums' && !albums.length) || (scope === 'artists' && !artists.length) || (scope === 'playlists' && !playlists.length)) && (
                  <Empty title={`No ${scope} found`}>Try another scope{lf !== 'all' ? ' or language' : ''}.</Empty>
                )}
              </>
            )}
          </motion.div>
        </>
      ) : (
        <div className="pt-6">
          {searches.length > 0 && (
            <Reveal>
              <SectionHead title="Recent Searches"><button onClick={clearSearches} className="text-sm font-semibold text-accent">Clear</button></SectionHead>
              <div className="flex flex-col divide-y divide-white/[.06] overflow-hidden rounded-2xl bg-white/[.04] ring-1 ring-white/[.06] sm:max-w-[560px]">
                {searches.slice(0, 6).map(s => (
                  <div key={s} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[.06]">
                    <Clock size={16} className="flex-none text-white/40" />
                    <button className="min-w-0 flex-1 truncate text-left text-[15px] font-medium" onClick={() => { setQ(s); setDq(s); }}>{s}</button>
                    <button aria-label="Remove" onClick={() => removeSearch(s)} className="text-white/35 transition hover:text-white"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal className="mt-10">
            <SectionHead title="Trending for you" sub="Popular artists in your languages" />
            <div className="flex flex-wrap gap-2.5">{suggestions.map(s => <button key={s} className="chip" onClick={() => { setQ(s); setDq(s); }}><SearchIcon size={13} className="opacity-50" />{s}</button>)}</div>
          </Reveal>

          <Reveal className="mt-10">
            <SectionHead title="Browse by Language" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {LANGS.slice(0, 12).map(l => <Tile key={l.code} g={l.g} glyph={l.glyph} title={l.native} sub={l.name} onClick={() => openDetail({ type: 'lang', id: l.code })} />)}
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <SectionHead title="Browse by Mood" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {MOODS.map(m => <Tile key={m.k} g={m.g} title={m.en} onClick={() => openDetail({ type: 'mood', id: m.k })} />)}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  );
}

function GridOf({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <SectionHead title={title} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))] [&_.group]:!w-full">{children}</div>
    </section>
  );
}
