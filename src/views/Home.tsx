import { ReactNode, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, Play, Plus } from 'lucide-react';
import { Artist, Track, multiAlbums, multiPlaylists, multiSongs } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { LANGS, MOODS, langOf } from '../lib/languages';
import { useStore } from '../store';
import {
  AlbumCard, ArtistCard, Cover, ErrorBox, PageHeader, PlaylistCard, RailSection, RailSkeleton, Reveal, SectionHead,
  Skeleton, SongRow, Tile, TrackCard
} from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
}

function Block<T>({ s, skel, children }: { s: { data?: T; error?: unknown; loading: boolean; retry: () => void }; skel: ReactNode; children: (d: T) => ReactNode }) {
  if (s.loading) return <>{skel}</>;
  if (s.error || !s.data) return <div className="w-full"><ErrorBox onRetry={s.retry} /></div>;
  return <>{children(s.data)}</>;
}

function Hero({ items }: { items: Track[] }) {
  const play = useStore(s => s.play);
  const isCur = useStore(s => s.queue[s.idx]?.id);
  const playing = useStore(s => s.playing);
  const toggle = useStore(s => s.toggle);
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-1 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scroll-padding-inline:1rem]">
      {items.map((t, i) => {
        const cur = isCur === t.id;
        return (
          <motion.article
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={() => (cur ? toggle() : play(items, i))}
            className="group relative h-[clamp(270px,34vw,380px)] w-[min(90%,700px)] flex-none cursor-pointer snap-start overflow-hidden rounded-[28px] ring-1 ring-white/12 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]"
          >
            <img src={t.img} alt="" className="absolute -inset-[20%] size-[140%] max-w-none object-cover [filter:blur(40px)_saturate(1.6)_brightness(.72)] transition-transform duration-[1400ms] group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
            <div className="relative flex h-full items-center justify-between gap-5 p-6 sm:p-9">
              <div className="min-w-0 max-w-[56%]">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-white/80">{i === 0 ? 'Latest' : 'Featured'}{t.lang ? ` · ${langOf(t.lang)?.name ?? t.lang}` : ''}</div>
                <h3 className="clamp-3 mb-2 mt-2.5 text-[clamp(24px,3.6vw,40px)] font-extrabold leading-[1.08] tracking-[-0.03em]">{t.name}</h3>
                <p className="truncate text-[15px] text-white/75">{t.artist}</p>
                <span className="glass glass-btn mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"><Play size={15} fill="currentColor" /> {cur && playing ? 'Playing' : 'Play'}</span>
              </div>
              <Cover src={t.img} eager className="aspect-square w-[clamp(120px,26vw,260px)] flex-none rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,.7)] ring-1 ring-white/20 transition-transform duration-700 group-hover:-rotate-2 group-hover:scale-105" />
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

export default function Home() {
  const langs = useStore(s => s.langs); const openSheet = useStore(s => s.openLangSheet);
  const recent = useStore(s => s.recent); const openDetail = useStore(s => s.openDetail);
  const [pick, setPick] = useState('all');
  const active = pick !== 'all' && langs.includes(pick) ? pick : 'all';
  const L = useMemo(() => (active === 'all' ? langs.slice(0, 4) : [active]), [active, langs]);
  const per = L.length > 2 ? 14 : 22;
  const key = L.join(',');

  const hero = useAsync(() => multiSongs(l => `latest ${l} songs`, L, 12), [key]);
  const hits = useAsync(() => multiSongs(l => `${l} top hits`, L, 24), [key]);
  const fresh = useAsync(() => multiSongs(l => `new ${l} songs 2026`, L, per), [key]);
  const albums = useAsync(() => multiAlbums(l => `${l} movie songs`, L), [key]);
  const lists = useAsync(() => multiPlaylists(l => `${l} hits`, L), [key]);
  const ever = useAsync(() => multiSongs(l => `evergreen ${l} classics`, L, per), [key]);
  const indie = useAsync(() => multiSongs(l => `${l} hip hop indie`, L, per), [key]);

  const artists = useMemo(() => {
    const m = new Map<string, Artist>();
    [hero.data, hits.data, ever.data, indie.data, fresh.data].forEach(list => (list || []).forEach(s => s.artists.forEach(a => {
      if (a.img && !/(placeholder|default)/i.test(a.img) && !m.has(a.id)) m.set(a.id, a);
    })));
    return Array.from(m.values()).slice(0, 24);
  }, [hero.data, hits.data, ever.data, indie.data, fresh.data]);

  const heroItems = useMemo(() => (hero.data || []).filter(s => s.img).slice(0, 7), [hero.data]);
  const freshItems = useMemo(() => { const ids = new Set(heroItems.map(h => h.id)); const f = (fresh.data || []).filter(s => !ids.has(s.id)); return f.length > 6 ? f : fresh.data || []; }, [fresh.data, heroItems]);
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <PageHeader
        eyebrow={`${greeting()} · ${dateStr}`}
        title="Listen Now"
        right={<button onClick={() => openSheet(true)} aria-label="Choose languages" className="glass glass-btn mb-1.5 flex flex-none items-center gap-2 rounded-full py-2.5 pl-3.5 pr-4 text-sm font-semibold lg:hidden"><Languages size={17} /> {langs.length}</button>}
      />

      {/* language filter */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <button className={`chip ${active === 'all' ? 'on' : ''}`} onClick={() => setPick('all')}>All my languages</button>
        {langs.map(c => <button key={c} className={`chip ${active === c ? 'on' : ''}`} onClick={() => setPick(c)}>{langOf(c)?.native ?? c}</button>)}
        <button className="chip" onClick={() => openSheet(true)}><Plus size={14} /> Add</button>
      </div>

      <Block s={hero} skel={<div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"><Skeleton className="h-[clamp(270px,34vw,380px)] w-[min(90%,700px)] flex-none !rounded-[28px]" /><Skeleton className="h-[clamp(270px,34vw,380px)] w-[min(90%,700px)] flex-none !rounded-[28px]" /></div>}>
        {() => <Hero items={heroItems} />}
      </Block>

      <RailSection title="Top Hits" sub="The songs everyone is playing" cols>
        <Block s={hits} skel={Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="my-1 h-[56px] !rounded-xl" />)}>
          {d => { const items = d.slice(0, 40); return <>{items.map((t, i) => <div key={t.id} className="snap-start"><SongRow track={t} list={items} i={i} /></div>)}</>; }}
        </Block>
      </RailSection>

      {recent.length > 0 && (
        <RailSection title="Recently Played">{recent.slice(0, 20).map((t, i) => <TrackCard key={t.id} track={t} list={recent} i={i} />)}</RailSection>
      )}

      <RailSection title="New & Noteworthy" sub="Fresh releases in your languages">
        <Block s={fresh} skel={<RailSkeleton />}>{() => <>{freshItems.slice(0, 24).map((t, i) => <TrackCard key={t.id} track={t} list={freshItems} i={i} />)}</>}</Block>
      </RailSection>

      <Reveal className="mt-10 sm:mt-12">
        <SectionHead title="Your Languages" sub="Dive into a language" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {langs.map(c => { const l = langOf(c); return l && <Tile key={c} g={l.g} glyph={l.glyph} title={l.native} sub={l.name} onClick={() => openDetail({ type: 'lang', id: c })} />; })}
          <button onClick={() => openSheet(true)} className="glass flex h-[104px] flex-col items-center justify-center gap-1.5 rounded-[20px] text-sm font-semibold text-white/80 transition hover:-translate-y-1 hover:text-white sm:h-[118px]"><Plus size={22} />More languages<span className="text-[11px] font-medium text-white/40">{LANGS.length} available</span></button>
        </div>
      </Reveal>

      <RailSection title="Featured Playlists" sub="Curated for you">
        <Block s={lists} skel={<RailSkeleton />}>{d => <>{d.map((p, i) => <PlaylistCard key={p.id} p={p} i={i} />)}</>}</Block>
      </RailSection>

      <Reveal className="mt-10 sm:mt-12">
        <SectionHead title="Browse by Mood" sub="Pick a vibe, we’ll find the songs" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {MOODS.map(m => <Tile key={m.k} g={m.g} title={m.en} onClick={() => openDetail({ type: 'mood', id: m.k })} />)}
        </div>
      </Reveal>

      <RailSection title="Albums & Movies">
        <Block s={albums} skel={<RailSkeleton />}>{d => <>{d.map((a, i) => <AlbumCard key={a.id} a={a} i={i} />)}</>}</Block>
      </RailSection>

      <RailSection title="Voices You’ll Love" sub="Artists on repeat">
        {artists.length ? artists.map((a, i) => <ArtistCard key={a.id} a={a} i={i} />) : <RailSkeleton round />}
      </RailSection>

      <RailSection title="Evergreen Classics" sub="Timeless, forever">
        <Block s={ever} skel={<RailSkeleton />}>{d => <>{d.slice(0, 24).map((t, i) => <TrackCard key={t.id} track={t} list={d} i={i} />)}</>}</Block>
      </RailSection>

      <RailSection title="Hip-Hop & Indie" sub="The new sound">
        <Block s={indie} skel={<RailSkeleton />}>{d => <>{d.slice(0, 24).map((t, i) => <TrackCard key={t.id} track={t} list={d} i={i} />)}</>}</Block>
      </RailSection>

      <Reveal className="mt-16 border-t border-white/10 pt-6 text-[12.5px] leading-relaxed text-white/35">
        Swaram by Namith is an independent listening experience built on the unofficial JioSaavn API, with lyrics from LRCLIB. All music and artwork belong to their respective owners. Designed &amp; developed by{' '}
        <a href="https://namithrn.vercel.app" target="_blank" rel="noreferrer" className="font-semibold text-white/60 underline decoration-white/20 underline-offset-2 hover:text-white">Namith RN</a>.
      </Reveal>
    </div>
  );
}
