import { useEffect, useRef } from 'react';
import { ExternalLink, MicVocal, RotateCw } from 'lucide-react';
import { Track } from '../lib/api';
import { audio } from '../lib/audio';
import { useAsync, useAudioTime } from '../lib/hooks';
import { getLyrics } from '../lib/lyrics';

function activeIndex(lines: { t: number }[], time: number) {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= time) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

const BLUR = ['', 'blur-[0.6px]', 'blur-[1.4px]', 'blur-[2.2px]', 'blur-[3px]'];

export default function LyricsPanel({ track }: { track: Track }) {
  const { data, loading, retry } = useAsync(() => getLyrics(track), [track.id]);
  const { time } = useAudioTime(120);
  const box = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const userUntil = useRef(0);
  const first = useRef(true);

  const synced = !!data?.synced;
  const active = synced && data ? activeIndex(data.lines, time + 0.2) : -1;

  useEffect(() => { first.current = true; }, [track.id]);
  useEffect(() => {
    if (!synced || active < 0) return;
    if (Date.now() < userUntil.current) return;
    const c = box.current, el = els.current[active];
    if (!c || !el) return;
    c.scrollTo({ top: Math.max(0, el.offsetTop - c.clientHeight * 0.3), behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [active, synced, data]);

  const hold = () => { userUntil.current = Date.now() + 3500; };

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-5 px-1 pt-6">
        {[80, 62, 90, 70, 55, 84, 66].map((w, i) => <div key={i} className="sk !rounded-xl" style={{ height: 32, width: w + '%', opacity: 1 - i * 0.1 }} />)}
      </div>
    );
  }
  if (!data) {
    const g = `https://www.google.com/search?q=${encodeURIComponent(`${track.name} ${track.artist} lyrics`)}`;
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <div className="glass mx-auto grid size-16 place-items-center rounded-full"><MicVocal size={26} className="text-white/80" /></div>
          <div className="mt-5 text-xl font-bold">No lyrics found</div>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/55">We looked through open lyric libraries but couldn’t find a match for this song.</p>
          <div className="mt-5 flex justify-center gap-2.5">
            <button onClick={retry} className="chip"><RotateCw size={14} /> Try again</button>
            <a href={g} target="_blank" rel="noreferrer" className="chip">Search Google <ExternalLink size={13} /></a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={box} onWheel={hold} onTouchMove={hold} onPointerDown={hold} className="lyr-mask group/ly no-scrollbar relative h-full overflow-y-auto px-1 pb-[45vh] pt-[16vh]">
        {data.lines.map((l, i) => {
          const d = synced ? i - active : 0;
          const ad = Math.abs(d);
          const isActive = synced && d === 0;
          const past = synced && d < 0;
          const blank = !l.text;
          if (!synced && blank) return <div key={i} className="h-5" />;
          return (
            <button
              key={i}
              ref={e => { els.current[i] = e; }}
              onClick={() => { if (synced) { audio.currentTime = l.t; audio.play().catch(() => { /* noop */ }); userUntil.current = 0; } }}
              style={{ opacity: synced ? (isActive ? 1 : Math.max(0.2, 0.52 - ad * 0.07)) : 0.92, transform: isActive ? 'scale(1)' : synced ? 'scale(.94)' : 'none' }}
              className={`lyr-line block w-full py-[7px] text-left text-[26px] font-bold leading-[1.22] tracking-[-0.02em] sm:text-[32px] lg:text-[34px] ${synced ? `cursor-pointer ${isActive ? '' : BLUR[Math.min(ad, 4)]} group-hover/ly:!blur-none hover:!opacity-90` : 'cursor-default !font-semibold !text-[22px] sm:!text-[26px]'} ${past ? 'text-white/80' : 'text-white'}`}
            >
              {blank ? <span className={`dots ${isActive ? 'text-white' : 'text-white/60'}`}><i /><i /><i /></span> : l.text}
            </button>
          );
        })}
        <div className="mt-10 flex items-center gap-2 pb-4 text-xs text-white/35">
          <MicVocal size={13} /> {synced ? 'Time-synced' : 'Not time-synced'} · Lyrics via {data.source}
        </div>
      </div>
    </div>
  );
}
