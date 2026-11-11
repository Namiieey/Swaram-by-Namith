import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Play, Shuffle } from 'lucide-react';
import { Album, Artist, Track, getAlbum, getArtist, getPlaylist, multiSongs, searchSongs, uniq } from '../lib/api';
import { useAsync, useDesktop } from '../lib/hooks';
import { MOODS, langName, langOf } from '../lib/languages';
import { DetailRef, useStore } from '../store';
import { AlbumCard, ArtistCard, Cover, ErrorBox, RailSection, RowsSkeleton, SongRow, Skeleton, Empty } from './ui';

interface Data {
  eyebrow: string; title: string; sub?: string; img: string; meta?: string; round?: boolean; numbered?: boolean;
  songs: Track[]; albums?: Album[]; similar?: Artist[]; g?: string;
}
const mins = (s: Track[]) => { const t = s.reduce((a, b) => a + (b.dur || 0), 0); return t ? Math.max(1, Math.round(t / 60)) + ' min' : ''; };

async function load(r: DetailRef): Promise<Data> {
  const langs = useStore.getState().langs;
  if (r.type === 'album') {
    const d = await getAlbum(r.id);
    return { eyebrow: 'Album', title: d.name, sub: d.artists, img: d.img, meta: [d.year, d.songs.length + ' songs', mins(d.songs)].filter(Boolean).join(' · '), songs: d.songs, numbered: true };
  }
  if (r.type === 'playlist') {
    const d = await getPlaylist(r.id);
    return { eyebrow: 'Playlist', title: d.name, sub: d.desc, img: d.img, meta: [d.songs.length + ' songs', mins(d.songs)].filter(Boolean).join(' · '), songs: d.songs };
  }
  if (r.type === 'artist') {
    const d = await getArtist(r.id);
    const f = d.followers ? new Intl.NumberFormat('en', { notation: 'compact' }).format(d.followers) + ' followers' : d.verified ? 'Verified artist' : '';
    return { eyebrow: 'Artist', title: d.name, sub: d.lang ? d.lang.replace(/^./, c => c.toUpperCase()) : '', img: d.img, meta: f, round: true, songs: d.songs, albums: d.albums, similar: d.similar };
  }
  if (r.type === 'mood') {
    const m = MOODS.find(x => x.k === r.id)!;
    const songs = await multiSongs(l => `${l} ${m.q}`, langs.slice(0, 5), 24);
    return { eyebrow: 'Mood', title: m.en, sub: langs.map(langName).join(' · '), img: songs[0]?.img || '', meta: songs.length + ' songs · ' + mins(songs), songs };
  }
  // language
  const l = r.id;
  const rs = await Promise.allSettled([searchSongs(`${l} top songs`, 40), searchSongs(`latest ${l} songs`, 30), searchSongs(`evergreen ${l} hits`, 30)]);
  let songs = uniq(rs.flatMap(x => (x.status === 'fulfilled' ? x.value.tracks : [])));
  if (!songs.length) throw new Error('none');
  const only = songs.filter(s => s.lang === l); if (only.length >= 8) songs = only;
  return { eyebrow: 'Language', title: langOf(l)?.native || langName(l), sub: langName(l), img: songs[0]?.img || '', meta: songs.length + ' songs · ' + mins(songs), songs, g: langOf(l)?.g };
}

function DetailPage({ r }: { r: DetailRef }) {
  const pop = useStore(s => s.popDetail); const play = useStore(s => s.play);
  const desktop = useDesktop();
  const { data, error, loading, retry } = useAsync(() => load(r), [r.type, r.id]);

  return (
    <motion.div
      initial={desktop ? { opacity: 0, y: 30 } : { x: '100%' }} animate={desktop ? { opacity: 1, y: 0 } : { x: 0 }} exit={desktop ? { opacity: 0, y: 20 } : { x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      className="fixed inset-y-0 left-0 right-0 z-40 overflow-y-auto overscroll-contain bg-[#08080a] lg:left-[268px]"
    >
      <div className="sticky top-0 z-20 flex h-[calc(var(--safe-t)+58px)] items-end px-4 pb-2 sm:px-6 lg:px-10">
        <button onClick={pop} className="glass glass-btn flex items-center gap-1 rounded-full py-2 pl-2.5 pr-4 text-[15px] font-semibold"><ChevronLeft size={19} /> Back</button>
      </div>
      <div className="relative -mt-[calc(var(--safe-t)+58px)] px-4 pb-64 pt-[calc(var(--safe-t)+84px)] sm:px-6 lg:px-10">
        {data?.img && <img src={data.img} alt="" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] w-full object-cover opacity-70 [filter:blur(80px)_saturate(1.6)_brightness(.55)] [mask-image:linear-gradient(#000_30%,transparent)]" />}
        {loading && (
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end">
            <Skeleton className="size-[220px] flex-none !rounded-[20px]" />
            <div className="w-full max-w-md"><Skeleton className="mb-4 h-10 w-3/4" /><Skeleton className="h-5 w-1/3" /></div>
          </div>
        )}
        {!!error && !loading && <div className="relative pt-10"><ErrorBox msg="Couldn’t load this page." onRetry={retry} /></div>}
        {data && (
          <>
            <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-9 sm:text-left">
              <motion.div initial={{ opacity: 0, scale: 0.85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                style={data.g && !data.img ? { background: data.g } : undefined}
                className={`size-[min(62vw,250px)] flex-none overflow-hidden shadow-[0_40px_70px_-20px_rgba(0,0,0,.85)] ring-1 ring-white/15 sm:size-[clamp(160px,20vw,250px)] ${data.round ? 'rounded-full' : 'rounded-[22px]'}`}>
                <Cover src={data.img} eager className="size-full" />
              </motion.div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-accent">{data.eyebrow}</div>
                <h1 className="mt-2 text-[clamp(30px,4.6vw,56px)] font-extrabold leading-[1.04] tracking-[-0.035em]">{data.title}</h1>
                {data.sub && <div className="clamp-2 mt-2 text-[17px] font-semibold text-white/85">{data.sub}</div>}
                {data.meta && <div className="mt-1.5 text-[13.5px] text-white/50">{data.meta}</div>}
                <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <button onClick={() => play(data.songs, 0)} className="flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-[15px] font-bold shadow-[0_12px_26px_-10px_rgba(250,45,72,.9)] transition hover:-translate-y-0.5 active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
                  <button onClick={() => play(data.songs, 0, { shuffle: true })} className="glass glass-btn flex items-center gap-2 rounded-full px-7 py-3 text-[15px] font-bold"><Shuffle size={18} /> Shuffle</button>
                </div>
              </div>
            </div>
            <div className="relative mt-9 flex flex-col">
              {data.songs.length ? data.songs.map((t, i) => <SongRow key={t.id} track={t} list={data.songs} i={i} num={data.numbered} />) : <Empty title="No songs found">Please try again later.</Empty>}
            </div>
            {!!data.albums?.length && <RailSection title="Albums">{data.albums.map((a, i) => <AlbumCard key={a.id} a={a} i={i} />)}</RailSection>}
            {!!data.similar?.length && <RailSection title="Similar Artists">{data.similar.map((a, i) => <ArtistCard key={a.id} a={a} i={i} />)}</RailSection>}
          </>
        )}
        {loading && <div className="relative mt-10"><RowsSkeleton /></div>}
      </div>
    </motion.div>
  );
}

export default function DetailHost() {
  const details = useStore(s => s.details);
  const top = details[details.length - 1];
  return <AnimatePresence>{top && <DetailPage key={details.length + top.type + top.id} r={top} />}</AnimatePresence>;
}
