import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useAudioTime } from '../lib/hooks';
import { useStore } from '../store';
import { Cover } from './ui';

function MiniProgress() {
  const { time, duration } = useAudioTime(250);
  const f = duration ? Math.min(1, time / duration) : 0;
  return (
    <div className="pointer-events-none absolute inset-x-5 bottom-[5px] h-[3px] overflow-hidden rounded-full bg-white/10">
      <div className="h-full origin-left rounded-full bg-gradient-to-r from-accent to-accent2" style={{ transform: `scaleX(${f})` }} />
    </div>
  );
}

export default function MiniPlayer() {
  const t = useStore(s => s.queue[s.idx]);
  const playing = useStore(s => s.playing); const loading = useStore(s => s.loading);
  const fav = useStore(s => !!(s.queue[s.idx] && s.favs.some(f => f.id === s.queue[s.idx].id)));
  const { toggle, next, prev, toggleFav, openFull } = useStore.getState();
  const fullOpen = useStore(s => s.fullOpen);

  return (
    <AnimatePresence>
      {t && !fullOpen && (
        <motion.div
          key="mini"
          initial={{ y: 140, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 140, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-b)+84px)] z-[60] flex justify-center px-3 lg:bottom-5 lg:left-[268px] lg:px-6"
        >
          <div
            role="button" tabIndex={0} onClick={openFull} onKeyDown={e => { if (e.key === 'Enter') openFull(); }}
            className="glass refract pointer-events-auto relative flex h-[66px] w-full max-w-[780px] cursor-pointer items-center gap-3 overflow-hidden rounded-full pl-2.5 pr-3 transition-transform duration-300 hover:scale-[1.012] active:scale-[.985] lg:h-[72px]"
          >
            <motion.div key={t.id} initial={{ scale: 0.8, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} className="size-[50px] flex-none overflow-hidden rounded-full shadow-lg shadow-black/50 ring-1 ring-white/20 lg:size-[54px]">
              <Cover src={t.thumb || t.img} className={`size-full ${playing ? '[animation:spin_18s_linear_infinite]' : ''}`} eager />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[14.5px] font-semibold ${loading ? 'animate-pulse' : ''}`}>{t.name}</div>
              <div className="truncate text-[12.5px] text-white/60">{t.artist}</div>
            </div>
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button aria-label="Favourite" onClick={() => toggleFav(t)} className={`hidden size-10 place-items-center rounded-full transition hover:bg-white/10 active:scale-85 sm:grid ${fav ? 'text-accent' : 'text-white/70'}`}><Heart size={20} fill={fav ? 'currentColor' : 'none'} /></button>
              <button aria-label="Previous" onClick={prev} className="hidden size-10 place-items-center rounded-full transition hover:bg-white/10 active:scale-85 sm:grid"><SkipBack size={21} fill="currentColor" /></button>
              <button aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="grid size-11 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-90">
                {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
              </button>
              <button aria-label="Next" onClick={() => next()} className="grid size-10 place-items-center rounded-full transition hover:bg-white/10 active:scale-85"><SkipForward size={21} fill="currentColor" /></button>
            </div>
            <MiniProgress />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
