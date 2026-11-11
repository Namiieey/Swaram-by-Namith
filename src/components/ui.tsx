import { ReactNode, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, MoreHorizontal, Play, RotateCw } from 'lucide-react';
import { Album, Artist, Playlist, Track } from '../lib/api';
import { fmt } from '../lib/hooks';
import { useStore } from '../store';

export const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#121215"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><path d="M42 68V38l22-4v28" fill="none" stroke="#fa2d48" stroke-width="4" stroke-linecap="round"/><circle cx="37" cy="68" r="6" fill="#fa2d48"/><circle cx="59" cy="62" r="6" fill="#fa2d48"/></svg>'
  );

export function Cover({ src, className = '', alt = '', eager = false }: { src?: string; className?: string; alt?: string; eager?: boolean }) {
  const [bad, setBad] = useState(false);
  return (
    <img
      src={bad || !src ? FALLBACK : src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setBad(true)}
      className={`bg-[#1a1a1e] object-cover ${className}`}
    />
  );
}

export function Eq({ paused }: { paused?: boolean }) {
  return <span className={`eq ${paused ? 'paused' : ''}`}><i /><i /><i /></span>;
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Pop({ children, i = 0, className = '' }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 40px 0px 0px' }}
      transition={{ duration: 0.7, delay: Math.min(i, 8) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.025em] sm:text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-white/50">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** Horizontal scroller with section title and desktop arrows */
export function RailSection({ title, sub, children, className = '', cols = false }: { title: string; sub?: string; children: ReactNode; className?: string; cols?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.8 * d, behavior: 'smooth' });
  return (
    <Reveal className={`mt-10 sm:mt-12 ${className}`}>
      <SectionHead title={title} sub={sub}>
        <div className="hidden gap-2 md:flex [@media(hover:none)]:hidden">
          <button aria-label="Scroll left" onClick={() => go(-1)} className="glass glass-btn grid size-8 place-items-center rounded-full"><ChevronLeft size={16} /></button>
          <button aria-label="Scroll right" onClick={() => go(1)} className="glass glass-btn grid size-8 place-items-center rounded-full"><ChevronRight size={16} /></button>
        </div>
      </SectionHead>
      <div ref={ref} className={`no-scrollbar -mx-4 snap-x overflow-x-auto px-4 pb-5 pt-1 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scroll-padding-inline:1rem] ${cols ? 'grid snap-mandatory auto-cols-[88%] grid-flow-col grid-rows-4 gap-x-6 sm:auto-cols-[minmax(330px,420px)]' : 'flex snap-proximity gap-4'}`}>
        {children}
      </div>
    </Reveal>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`sk ${className}`} />;
}
export const RailSkeleton = ({ n = 7, round }: { n?: number; round?: boolean }) => (
  <>{Array.from({ length: n }, (_, i) => (
    <div key={i} className="w-[140px] flex-none sm:w-[172px]"><Skeleton className={`aspect-square w-full ${round ? '!rounded-full' : ''}`} /><Skeleton className="mt-3 h-3.5 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /></div>
  ))}</>
);
export const RowsSkeleton = ({ n = 6 }: { n?: number }) => (
  <div className="flex flex-col gap-1">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-[60px] !rounded-xl" />)}</div>
);

export function ErrorBox({ onRetry, msg = 'Couldn’t reach the music servers.' }: { onRetry?: () => void; msg?: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/60">
      <span>{msg}</span>
      {onRetry && <button onClick={onRetry} className="chip !py-2"><RotateCw size={14} /> Retry</button>}
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center text-[15px] leading-relaxed text-white/50">
      <b className="mb-1 block text-lg font-semibold text-white">{title}</b>
      {children}
    </div>
  );
}

/* ---------- song row ---------- */
export function SongRow({ track, list, i, num }: { track: Track; list: Track[]; i: number; num?: boolean }) {
  const isCur = useStore(s => s.queue[s.idx]?.id === track.id);
  const playing = useStore(s => s.playing);
  const fav = useStore(s => s.favs.some(f => f.id === track.id));
  const play = useStore(s => s.play);
  const toggle = useStore(s => s.toggle);
  const toggleFav = useStore(s => s.toggleFav);
  const openMenu = useStore(s => s.openMenu);

  const overlay = (
    <span className={`absolute inset-0 grid place-items-center rounded-[inherit] bg-black/50 text-white transition-opacity ${isCur ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      {isCur ? <Eq paused={!playing} /> : <Play size={18} fill="currentColor" />}
    </span>
  );
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => (isCur ? toggle() : play(list, i))}
      onKeyDown={e => { if (e.key === 'Enter') (isCur ? toggle() : play(list, i)); }}
      className={`group relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-[7px] transition-colors hover:bg-white/[.07] ${isCur ? 'bg-accent/10' : ''}`}
    >
      {num ? (
        <div className="relative grid h-11 w-8 flex-none place-items-center rounded text-sm text-white/50">
          <span className={isCur ? 'opacity-0' : 'group-hover:opacity-0'}>{i + 1}</span>{overlay}
        </div>
      ) : (
        <div className="relative size-12 flex-none overflow-hidden rounded-lg shadow-lg shadow-black/40">
          <Cover src={track.thumb || track.img} className="size-full" />{overlay}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[15px] font-semibold ${isCur ? 'text-accent' : ''}`}>{track.name}</div>
        <div className="mt-0.5 truncate text-[13px] text-white/55">{track.artist}</div>
      </div>
      {track.dur > 0 && <span className="hidden text-[13px] tabular-nums text-white/45 sm:block">{fmt(track.dur)}</span>}
      <button
        aria-label="Favourite"
        onClick={e => { e.stopPropagation(); toggleFav(track); }}
        className={`grid size-9 flex-none place-items-center rounded-full transition hover:bg-white/10 active:scale-85 ${fav ? 'text-accent' : 'text-white/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}
      >
        <Heart size={19} fill={fav ? 'currentColor' : 'none'} />
      </button>
      <button
        aria-label="More"
        onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); openMenu(track, r.right, r.bottom); }}
        className="grid size-9 flex-none place-items-center rounded-full text-white/60 transition hover:bg-white/10 active:scale-85 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <MoreHorizontal size={19} />
      </button>
    </div>
  );
}

/* ---------- cards ---------- */
function CardShell({ img, title, sub, round, onClick, playing, children }: { img: string; title: string; sub?: string; round?: boolean; onClick: () => void; playing?: boolean; children?: ReactNode }) {
  return (
    <div onClick={onClick} className={`group w-[140px] flex-none cursor-pointer snap-start sm:w-[172px] ${round ? 'text-center' : ''}`}>
      <div className={`relative aspect-square overflow-hidden shadow-xl shadow-black/50 ring-1 ring-white/10 transition duration-500 [transition-timing-function:var(--ease-swaram)] group-hover:-translate-y-1 group-hover:shadow-2xl ${round ? 'rounded-full' : 'rounded-2xl'} ${playing ? 'outline outline-2 outline-offset-2 outline-accent' : ''}`}>
        <Cover src={img} className="size-full transition-transform duration-700 group-hover:scale-[1.07]" />
        {children}
      </div>
      <div className="mt-2.5 truncate text-sm font-semibold">{title}</div>
      {sub && <div className="mt-0.5 truncate text-[13px] text-white/50">{sub}</div>}
    </div>
  );
}
const Fab = () => (
  <span className="glass-clear absolute bottom-2.5 right-2.5 grid size-10 translate-y-2 scale-90 place-items-center rounded-full text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
    <Play size={17} fill="currentColor" className="ml-0.5" />
  </span>
);

export function TrackCard({ track, list, i }: { track: Track; list: Track[]; i: number }) {
  const isCur = useStore(s => s.queue[s.idx]?.id === track.id);
  const play = useStore(s => s.play); const toggle = useStore(s => s.toggle);
  return (
    <Pop i={i} className="flex-none">
      <CardShell img={track.img} title={track.name} sub={track.artist} playing={isCur} onClick={() => (isCur ? toggle() : play(list, i))}><Fab /></CardShell>
    </Pop>
  );
}
export function AlbumCard({ a, i = 0 }: { a: Album; i?: number }) {
  const open = useStore(s => s.openDetail);
  return <Pop i={i} className="flex-none"><CardShell img={a.img} title={a.name} sub={a.sub} onClick={() => open({ type: 'album', id: a.id })}><Fab /></CardShell></Pop>;
}
export function PlaylistCard({ p, i = 0 }: { p: Playlist; i?: number }) {
  const open = useStore(s => s.openDetail);
  return <Pop i={i} className="flex-none"><CardShell img={p.img} title={p.name} sub={p.sub} onClick={() => open({ type: 'playlist', id: p.id })}><Fab /></CardShell></Pop>;
}
export function ArtistCard({ a, i = 0 }: { a: Artist; i?: number }) {
  const open = useStore(s => s.openDetail);
  return <Pop i={i} className="flex-none"><CardShell img={a.img} title={a.name} sub="Artist" round onClick={() => open({ type: 'artist', id: a.id })} /></Pop>;
}

export function Tile({ g, title, sub, onClick, glyph }: { g: string; title: string; sub?: string; onClick: () => void; glyph?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ background: g }}
      className="group relative flex h-[104px] flex-col justify-end overflow-hidden rounded-[20px] p-4 text-left shadow-xl shadow-black/40 ring-1 ring-white/15 transition duration-500 [transition-timing-function:var(--ease-swaram)] hover:-translate-y-1 hover:scale-[1.02] sm:h-[118px]"
    >
      <span className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/20 blur-[2px] transition-transform duration-700 group-hover:scale-150" />
      {glyph && <span className="pointer-events-none absolute right-3 top-1 text-6xl font-black text-white/25">{glyph}</span>}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35" />
      <b className="relative text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-[22px]">{title}</b>
      {sub && <span className="relative text-xs font-semibold text-white/85">{sub}</span>}
    </button>
  );
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5 pt-[calc(var(--safe-t)+64px)] lg:pt-[72px]">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs font-bold uppercase tracking-[.14em] text-accent">{eyebrow}</div>}
        <h1 className="mt-1.5 text-[38px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl">{title}</h1>
      </div>
      {right}
    </div>
  );
}
