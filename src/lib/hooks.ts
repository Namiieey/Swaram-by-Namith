import { useCallback, useEffect, useState } from 'react';
import { audio } from './audio';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [st, setSt] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let off = false;
    setSt({ loading: true });
    fn().then(
      data => { if (!off) setSt({ data, loading: false }); },
      error => { if (!off) setSt({ error, loading: false }); }
    );
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const retry = useCallback(() => setN(x => x + 1), []);
  return { ...st, retry };
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    h(); mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}
export const useDesktop = () => useMediaQuery('(min-width:1024px)');

/** Live playback position. `ms` controls polling cadence. */
export function useAudioTime(ms = 250) {
  const [time, setTime] = useState(audio.currentTime || 0);
  const [duration, setDuration] = useState(isFinite(audio.duration) ? audio.duration : 0);
  useEffect(() => {
    const read = () => {
      setTime(audio.currentTime || 0);
      setDuration(isFinite(audio.duration) ? audio.duration : 0);
    };
    read();
    const id = setInterval(() => { if (!audio.paused) read(); }, ms);
    const evs = ['seeked', 'loadedmetadata', 'durationchange', 'emptied', 'pause'] as const;
    evs.forEach(e => audio.addEventListener(e, read));
    return () => { clearInterval(id); evs.forEach(e => audio.removeEventListener(e, read)); };
  }, [ms]);
  return { time, duration };
}

export function useScrolled(threshold = 60) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const h = () => setS(window.scrollY > threshold);
    h(); window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, [threshold]);
  return s;
}

export const fmt = (s: number) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
