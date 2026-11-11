import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { ChevronDown, Heart, ListMusic, MicVocal, MoreHorizontal, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { audio } from '../lib/audio';
import { fmt, useAudioTime, useDesktop } from '../lib/hooks';
import { Quality, useStore } from '../store';
import LyricsPanel from './Lyrics';
import { Cover, Eq } from './ui';

type Tab = 'art' | 'lyrics' | 'queue';

function SeekBar() {
  const { time, duration } = useAudioTime(200);
  const [drag, setDrag] = useState<number | null>(null);
  const cur = useStore(s => s.queue[s.idx]);
  const d = duration || cur?.dur || 0;
  const val = drag ?? (d ? (time / d) * 1000 : 0);
  const commit = () => { if (drag !== null) { if (d) audio.currentTime = (drag / 1000) * d; setDrag(null); } };
  return (
    <div>
      <input
        type="range" className="range" min={0} max={1000} step={1} value={val} aria-label="Seek"
        style={{ ['--p' as string]: `${val / 10}%` }}
        onChange={e => setDrag(Number(e.target.value))}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit} onTouchEnd={commit}
      />
      <div className="-mt-0.5 flex justify-between text-xs font-medium tabular-nums text-white/55">
        <span>{fmt(drag !== null ? (drag / 1000) * d : time)}</span><span>-{fmt(Math.max(0, d - (drag !== null ? (drag / 1000) * d : time)))}</span>
      </div>
    </div>
  );
}

function Controls() {
  const playing = useStore(s => s.playing); const shuffle = useStore(s => s.shuffle); const repeat = useStore(s => s.repeat);
  const loading = useStore(s => s.loading);
  const { toggle, next, prev, toggleShuffle, cycleRepeat } = useStore.getState();
  return (
    <div className="mx-auto flex w-full max-w-[420px] items-center justify-between">
      <button aria-label="Shuffle" onClick={toggleShuffle} className={`grid size-12 place-items-center rounded-full transition active:scale-85 ${shuffle ? 'bg-white/15 text-accent' : 'text-white/55 hover:text-white'}`}><Shuffle size={21} /></button>
      <button aria-label="Previous" onClick={prev} className="grid size-14 place-items-center rounded-full transition hover:bg-white/10 active:scale-85"><SkipBack size={32} fill="currentColor" /></button>
      <button aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className={`grid size-[74px] place-items-center rounded-full bg-white text-black shadow-[0_14px_40px_-10px_rgba(255,255,255,.55)] transition hover:scale-105 active:scale-90 ${loading && !playing ? 'animate-pulse' : ''}`}>
        {playing ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1" />}
      </button>
      <button aria-label="Next" onClick={() => next()} className="grid size-14 place-items-center rounded-full transition hover:bg-white/10 active:scale-85"><SkipForward size={32} fill="currentColor" /></button>
      <button aria-label="Repeat" onClick={cycleRepeat} className={`grid size-12 place-items-center rounded-full transition active:scale-85 ${repeat ? 'bg-white/15 text-accent' : 'text-white/55 hover:text-white'}`}>{repeat === 2 ? <Repeat1 size={21} /> : <Repeat size={21} />}</button>
    </div>
  );
}

function VolumeQuality() {
  const volume = useStore(s => s.volume); const setVolume = useStore(s => s.setVolume);
  const quality = useStore(s => s.quality); const setQuality = useStore(s => s.setQuality);
  const Ic = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="hidden w-44 items-center gap-2.5 text-white/60 lg:flex">
        <button aria-label="Mute" onClick={() => setVolume(volume ? 0 : 0.85)}><Ic size={18} /></button>
        <input type="range" className="range" min={0} max={100} value={Math.round(volume * 100)} aria-label="Volume" style={{ ['--p' as string]: `${volume * 100}%` }} onChange={e => setVolume(Number(e.target.value) / 100)} />
      </div>
      <div className="glass-clear mx-auto flex rounded-full p-[3px] lg:mx-0">
        {(['96kbps', '160kbps', '320kbps'] as Quality[]).map(q => (
          <button key={q} onClick={() => setQuality(q)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${quality === q ? 'bg-white text-black' : 'text-white/65 hover:text-white'}`}>{q.replace('kbps', '')}</button>
        ))}
      </div>
    </div>
  );
}

function QueuePanel() {
  const queue = useStore(s => s.queue); const idx = useStore(s => s.idx); const playing = useStore(s => s.playing);
  const playTrack = useStore(s => s.playTrack);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'center' }); }, []);
  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-24 pt-2">
      {queue.map((t, i) => {
        const cur = i === idx;
        return (
          <button key={t.id + i} ref={cur ? ref : undefined} onClick={() => playTrack(i)} className={`group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-white/10 ${cur ? 'bg-white/[.12]' : ''}`}>
            <div className="relative size-12 flex-none overflow-hidden rounded-lg">
              <Cover src={t.thumb || t.img} className="size-full" />
              {cur && <span className="absolute inset-0 grid place-items-center bg-black/50"><Eq paused={!playing} /></span>}
            </div>
            <div className="min-w-0 flex-1"><div className={`truncate text-[15px] font-semibold ${cur ? 'text-accent' : ''}`}>{t.name}</div><div className="truncate text-[13px] text-white/55">{t.artist}</div></div>
            <span className="text-xs tabular-nums text-white/40">{t.dur ? fmt(t.dur) : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function FullPlayer() {
  const open = useStore(s => s.fullOpen);
  const t = useStore(s => s.queue[s.idx]);
  const fav = useStore(s => !!(s.queue[s.idx] && s.favs.some(f => f.id === s.queue[s.idx].id)));
  const playing = useStore(s => s.playing);
  const { closeFull, toggleFav, openDetail, openMenu } = useStore.getState();
  const desktop = useDesktop();
  const [tab, setTab] = useState<Tab>('art');
  const controls = useDragControls();

  useEffect(() => { document.body.classList.toggle('lock', open); return () => document.body.classList.remove('lock'); }, [open]);
  useEffect(() => { if (open) setTab(desktop ? 'lyrics' : 'art'); }, [open, desktop]);

  const dtab = tab === 'queue' ? 'queue' : 'lyrics';
  const mobilePanel = !desktop && tab !== 'art';

  const info = t && (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="clamp-2 text-[24px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[28px]">{t.name}</motion.div>
        <button onClick={() => t.artists[0] && openDetail({ type: 'artist', id: t.artists[0].id })} className="mt-1 block max-w-full truncate text-left text-[17px] font-medium text-white/65 hover:text-white">{t.artist}</button>
      </div>
      <button aria-label="Favourite" onClick={() => toggleFav(t)} className={`glass-clear glass-btn grid size-11 flex-none place-items-center rounded-full ${fav ? 'text-accent' : ''}`}><Heart size={20} fill={fav ? 'currentColor' : 'none'} /></button>
      <button aria-label="More" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); openMenu(t, r.right, r.bottom); }} className="glass-clear glass-btn grid size-11 flex-none place-items-center rounded-full"><MoreHorizontal size={20} /></button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && t && (
        <motion.div
          key="full"
          className="fixed inset-0 z-[80] overflow-hidden bg-black"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 210, damping: 30 }}
          drag="y" dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, i) => { if (i.offset.y > 140 || i.velocity.y > 700) closeFull(); }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence>
              <motion.img key={t.img} src={t.img || t.thumb} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
                className="absolute -inset-1/4 size-[150%] max-w-none object-cover [animation:drift_24s_ease-in-out_infinite_alternate] [filter:blur(70px)_saturate(1.8)_brightness(.62)]" />
            </AnimatePresence>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(0,0,0,.65),transparent_70%)]" />
            <div className="absolute inset-0 bg-black/25" />
          </div>

          <div className="relative z-10 flex h-full flex-col" style={{ paddingTop: 'var(--safe-t)' }}>
            {/* top bar */}
            <div className="flex h-16 flex-none touch-none items-center justify-between px-4 lg:px-8" onPointerDown={e => controls.start(e)}>
              <button aria-label="Close player" onClick={closeFull} onPointerDown={e => e.stopPropagation()} className="glass-clear glass-btn grid size-10 place-items-center rounded-full"><ChevronDown size={22} /></button>
              <div className="absolute left-1/2 top-2.5 h-1.5 w-11 -translate-x-1/2 rounded-full bg-white/30 lg:hidden" />
              {desktop ? (
                <div onPointerDown={e => e.stopPropagation()} className="glass relative flex rounded-full p-1">
                  {([['lyrics', 'Lyrics', MicVocal], ['queue', 'Up Next', ListMusic]] as const).map(([k, label, Ic]) => (
                    <button key={k} onClick={() => setTab(k)} className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${dtab === k ? 'text-black' : 'text-white/75'}`}>
                      {dtab === k && <motion.span layoutId="ptab" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <Ic size={16} className="relative" /><span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold uppercase tracking-[.16em] text-white/55">{tab === 'queue' ? 'Up Next' : tab === 'lyrics' ? 'Lyrics' : 'Now Playing'}</span>
              )}
              <div className="size-10" />
            </div>

            {desktop ? (
              <div className="mx-auto grid min-h-0 w-full max-w-[1240px] flex-1 grid-cols-[minmax(360px,470px)_1fr] items-center gap-16 px-10 pb-8">
                <div className="flex min-w-0 flex-col gap-6">
                  <motion.div animate={{ scale: playing ? 1 : 0.88 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }} className="mx-auto aspect-square w-full max-w-[min(100%,max(180px,calc(100dvh-450px)))]">
                    <AnimatePresence mode="popLayout"><motion.div key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="size-full"><Cover src={t.img} eager className="size-full rounded-[22px] shadow-[0_50px_90px_-20px_rgba(0,0,0,.85)] ring-1 ring-white/15" /></motion.div></AnimatePresence>
                  </motion.div>
                  {info}<SeekBar /><Controls /><VolumeQuality />
                </div>
                <div className="glass relative h-[calc(100dvh-150px)] min-h-0 rounded-[32px] px-8 py-2">
                  {dtab === 'lyrics' ? <LyricsPanel key={t.id} track={t} /> : <QueuePanel />}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col px-5 pb-[calc(var(--safe-b)+14px)]">
                {mobilePanel ? (
                  <>
                    <div className="flex flex-none items-center gap-3 pb-2">
                      <Cover src={t.thumb || t.img} className="size-14 rounded-xl shadow-lg" eager />
                      <div className="min-w-0 flex-1"><div className="truncate text-[17px] font-bold">{t.name}</div><div className="truncate text-sm text-white/60">{t.artist}</div></div>
                      <button aria-label="Favourite" onClick={() => toggleFav(t)} className={`glass-clear grid size-10 place-items-center rounded-full ${fav ? 'text-accent' : ''}`}><Heart size={18} fill={fav ? 'currentColor' : 'none'} /></button>
                    </div>
                    <div className="min-h-0 flex-1">{tab === 'lyrics' ? <LyricsPanel key={t.id} track={t} /> : <QueuePanel />}</div>
                    <div className="flex-none space-y-1 pt-2"><SeekBar /><div className="scale-[.88]"><Controls /></div></div>
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col justify-center gap-5">
                    <motion.div animate={{ scale: playing ? 1 : 0.86 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }} className="mx-auto aspect-square w-full max-w-[min(100%,max(150px,calc(100dvh-480px)))]">
                      <AnimatePresence mode="popLayout"><motion.div key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="size-full"><Cover src={t.img} eager className="size-full rounded-[22px] shadow-[0_40px_70px_-20px_rgba(0,0,0,.85)] ring-1 ring-white/15" /></motion.div></AnimatePresence>
                    </motion.div>
                    {info}<SeekBar /><Controls />
                  </div>
                )}
                <div className="glass relative mx-auto mt-3 flex flex-none rounded-full p-1">
                  {([['art', 'Player', Play], ['lyrics', 'Lyrics', MicVocal], ['queue', 'Up Next', ListMusic]] as const).map(([k, label, Ic]) => (
                    <button key={k} onClick={() => setTab(k)} className={`relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${tab === k ? 'text-black' : 'text-white/75'}`}>
                      {tab === k && <motion.span layoutId="mtab" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <Ic size={15} className="relative" fill={k === 'art' ? 'currentColor' : 'none'} /><span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
