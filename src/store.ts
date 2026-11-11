import { create } from 'zustand';
import { audio } from './lib/audio';
import { Track, getSong, getSuggestions, searchSongs, streamUrl } from './lib/api';

const ls = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem('swaram.' + k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem('swaram.' + k, JSON.stringify(v)); } catch { /* noop */ } }
};

export type View = 'home' | 'search' | 'library';
export interface DetailRef { type: 'album' | 'artist' | 'playlist' | 'mood' | 'lang'; id: string; title?: string }
export type Quality = '96kbps' | '160kbps' | '320kbps';

const slim = (t: Track): Track => ({ ...t, urls: [] });
const rand = (n: number) => Math.floor(Math.random() * n);

interface Store {
  langs: string[]; onboarded: boolean; langSheet: boolean;
  view: View; details: DetailRef[]; fullOpen: boolean; searchSeed: { q: string; n: number };
  favs: Track[]; recent: Track[]; searches: string[];
  queue: Track[]; idx: number; playing: boolean; loading: boolean;
  shuffle: boolean; repeat: 0 | 1 | 2; quality: Quality; volume: number; history: number[];
  toastMsg: string; toastN: number; menu: { track: Track; x: number; y: number } | null;

  setLangs: (l: string[]) => void; finishOnboarding: () => void; openLangSheet: (o: boolean) => void;
  nav: (v: View) => void; openDetail: (d: DetailRef) => void; popDetail: () => void; closeDetails: () => void;
  goSearch: (q: string) => void;
  openFull: () => void; closeFull: () => void;
  play: (list: Track[], i?: number, o?: { shuffle?: boolean }) => void;
  playTrack: (i: number) => void;
  playNext: (t: Track) => void; addToQueue: (t: Track) => void;
  next: (auto?: boolean) => void; prev: () => void; toggle: () => void;
  toggleShuffle: () => void; cycleRepeat: () => void; setQuality: (q: Quality) => void; setVolume: (v: number) => void;
  toggleFav: (t: Track) => void; addSearch: (q: string) => void; clearSearches: () => void; removeSearch: (q: string) => void;
  toast: (m: string) => void; openMenu: (t: Track, x: number, y: number) => void; closeMenu: () => void;
}

export const useStore = create<Store>((set, get) => ({
  langs: ls.get<string[]>('langs', ['malayalam']),
  onboarded: ls.get('onboarded', false),
  langSheet: false,
  view: 'home', details: [], fullOpen: false, searchSeed: { q: '', n: 0 },
  favs: ls.get<Track[]>('favs', []), recent: ls.get<Track[]>('recent', []), searches: ls.get<string[]>('searches', []),
  queue: [], idx: -1, playing: false, loading: false, history: [],
  shuffle: ls.get('shuffle', false), repeat: ls.get<0 | 1 | 2>('repeat', 0),
  quality: ls.get<Quality>('quality', '160kbps'), volume: ls.get('volume', 0.85),
  toastMsg: '', toastN: 0, menu: null,

  setLangs: l => { ls.set('langs', l); set({ langs: l }); },
  finishOnboarding: () => { ls.set('onboarded', true); set({ onboarded: true, langSheet: false }); },
  openLangSheet: o => set({ langSheet: o }),

  nav: v => set({ view: v, details: [], fullOpen: false, menu: null }),
  openDetail: d => {
    history.pushState({ d: 1 }, '');
    set(s => ({ details: [...s.details, d], fullOpen: false, menu: null }));
  },
  popDetail: () => {
    if (history.state && history.state.d) history.back();
    else set(s => ({ details: s.details.slice(0, -1) }));
  },
  closeDetails: () => set({ details: [] }),
  goSearch: q => set(s => ({ view: 'search', details: [], fullOpen: false, searchSeed: { q, n: s.searchSeed.n + 1 } })),

  openFull: () => {
    if (!get().queue[get().idx]) return;
    history.pushState({ full: 1 }, '');
    set({ fullOpen: true });
  },
  closeFull: () => {
    if (history.state && history.state.full) history.back();
    else set({ fullOpen: false });
  },

  play: (list, i = 0, o = {}) => {
    if (!list.length) return;
    let idx = i;
    let shuffle = get().shuffle;
    if (o.shuffle) { shuffle = true; idx = rand(list.length); ls.set('shuffle', true); }
    set({ queue: list.slice(), history: [], shuffle });
    loadTrack(idx);
  },
  playTrack: i => loadTrack(i),
  playNext: t => {
    const s = get();
    if (!s.queue.length) { get().play([t]); return; }
    const q = s.queue.slice(); q.splice(s.idx + 1, 0, t);
    set({ queue: q }); get().toast('Playing next');
  },
  addToQueue: t => {
    const s = get();
    if (!s.queue.length) { get().play([t]); return; }
    set({ queue: [...s.queue, t] }); get().toast('Added to queue');
  },
  next: auto => { void nextTrack(!!auto); },
  prev: () => {
    const s = get(); if (!s.queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (s.shuffle && s.history.length) { const h = s.history.slice(); const p = h.pop()!; set({ history: h }); loadTrack(p); return; }
    let pi = s.idx - 1;
    if (pi < 0) pi = s.repeat === 1 ? s.queue.length - 1 : 0;
    loadTrack(pi);
  },
  toggle: () => {
    if (!get().queue.length) return;
    if (audio.paused) audio.play().catch(() => { /* noop */ }); else audio.pause();
  },
  toggleShuffle: () => { const v = !get().shuffle; ls.set('shuffle', v); set({ shuffle: v }); get().toast(v ? 'Shuffle on' : 'Shuffle off'); },
  cycleRepeat: () => {
    const v = ((get().repeat + 1) % 3) as 0 | 1 | 2; ls.set('repeat', v); set({ repeat: v });
    get().toast(['Repeat off', 'Repeat all', 'Repeat one'][v]);
  },
  setQuality: q => {
    ls.set('quality', q); set({ quality: q });
    const t = get().queue[get().idx];
    if (t && audio.src) {
      const url = streamUrl(t, q);
      if (url && audio.src !== url) {
        const pos = audio.currentTime, was = !audio.paused;
        audio.src = url;
        audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = pos; } catch { /* noop */ } if (was) audio.play().catch(() => { /* noop */ }); }, { once: true });
      }
    }
    get().toast('Audio quality · ' + q.replace('kbps', ' kbps'));
  },
  setVolume: v => { audio.volume = v; ls.set('volume', v); set({ volume: v }); },

  toggleFav: t => {
    const s = get();
    const has = s.favs.some(f => f.id === t.id);
    const favs = has ? s.favs.filter(f => f.id !== t.id) : [slim(t), ...s.favs];
    ls.set('favs', favs); set({ favs });
    get().toast(has ? 'Removed from Library' : 'Added to Library');
  },
  addSearch: q => {
    const v = q.trim(); if (v.length < 2) return;
    const searches = [v, ...get().searches.filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, 12);
    ls.set('searches', searches); set({ searches });
  },
  removeSearch: q => { const searches = get().searches.filter(x => x !== q); ls.set('searches', searches); set({ searches }); },
  clearSearches: () => { ls.set('searches', []); set({ searches: [] }); },

  toast: m => set(s => ({ toastMsg: m, toastN: s.toastN + 1 })),
  openMenu: (t, x, y) => set({ menu: { track: t, x, y } }),
  closeMenu: () => set({ menu: null })
}));

/* ---------------- player engine ---------------- */
let loadTok = 0, errCount = 0, extending = false;
audio.volume = useStore.getState().volume;

function addRecent(t: Track) {
  const recent = [slim(t), ...useStore.getState().recent.filter(x => x.id !== t.id)].slice(0, 30);
  ls.set('recent', recent); useStore.setState({ recent });
}

function setMediaSession(t: Track) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name, artist: t.artist, album: t.album,
      artwork: [{ src: t.thumb || t.img, sizes: '150x150' }, { src: t.img || t.thumb, sizes: '500x500' }]
    });
  } catch { /* noop */ }
}

async function loadTrack(i: number) {
  const s = useStore.getState();
  const t = s.queue[i]; if (!t) return;
  const tok = ++loadTok;
  useStore.setState({ idx: i, loading: true });
  document.title = `${t.name} · Swaram`;
  setMediaSession(t);
  let url = streamUrl(t, s.quality);
  if (!url) {
    try { const f = await getSong(t.id); if (f) { t.urls = f.urls; url = streamUrl(t, useStore.getState().quality); } } catch { /* noop */ }
    if (tok !== loadTok) return;
  }
  if (!url) { useStore.setState({ loading: false }); useStore.getState().toast('This track isn’t available'); return skipOnError(tok); }
  audio.src = url;
  try { await audio.play(); errCount = 0; addRecent(t); }
  catch (e: any) { if (e?.name === 'NotAllowedError') { useStore.getState().toast('Tap play to start'); useStore.setState({ loading: false }); } }
}

function skipOnError(tok: number) {
  if (tok !== loadTok) return;
  errCount++;
  if (errCount >= 3 || useStore.getState().queue.length < 2) { errCount = 0; audio.pause(); return; }
  setTimeout(() => { if (tok === loadTok) void nextTrack(true); }, 500);
}

async function extendQueue(): Promise<boolean> {
  if (extending) return true;
  const s = useStore.getState();
  const last = s.queue[s.queue.length - 1]; if (!last) return false;
  extending = true;
  try {
    let arr: Track[] = [];
    try { arr = await getSuggestions(last.id, 15); } catch { /* noop */ }
    if (!arr.length && last.artists[0]) { try { arr = (await searchSongs(last.artists[0].name, 15)).tracks; } catch { /* noop */ } }
    const have = new Set(useStore.getState().queue.map(x => x.id));
    const add = arr.filter(x => !have.has(x.id));
    if (!add.length) { extending = false; return false; }
    const start = useStore.getState().queue.length;
    useStore.setState({ queue: [...useStore.getState().queue, ...add] });
    useStore.getState().toast('Playing similar songs');
    extending = false; loadTrack(start); return true;
  } catch { extending = false; return false; }
}

async function nextTrack(_auto: boolean) {
  const s = useStore.getState(); const n = s.queue.length; if (!n) return;
  const hist = s.idx >= 0 ? [...s.history, s.idx].slice(-60) : s.history;
  useStore.setState({ history: hist });
  let ni: number;
  if (s.shuffle && n > 1) { do { ni = rand(n); } while (ni === s.idx); }
  else ni = s.idx + 1;
  if (ni >= n) {
    if (s.repeat === 1) ni = 0;
    else {
      if (await extendQueue()) return;
      audio.pause(); audio.currentTime = 0; useStore.getState().toast('End of queue'); return;
    }
  }
  loadTrack(ni);
}

audio.addEventListener('play', () => { useStore.setState({ playing: true }); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
audio.addEventListener('pause', () => { useStore.setState({ playing: false }); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
audio.addEventListener('playing', () => { errCount = 0; useStore.setState({ loading: false }); });
audio.addEventListener('waiting', () => useStore.setState({ loading: true }));
audio.addEventListener('ended', () => {
  if (useStore.getState().repeat === 2) { audio.currentTime = 0; audio.play().catch(() => { /* noop */ }); } else void nextTrack(true);
});
audio.addEventListener('error', () => {
  if (!audio.src || !useStore.getState().queue.length) return;
  useStore.setState({ loading: false });
  useStore.getState().toast('Couldn’t play this track — skipping');
  skipOnError(loadTok);
});

if ('mediaSession' in navigator) {
  const h = (n: MediaSessionAction, f: MediaSessionActionHandler) => { try { navigator.mediaSession.setActionHandler(n, f); } catch { /* noop */ } };
  h('play', () => { audio.play().catch(() => { /* noop */ }); });
  h('pause', () => audio.pause());
  h('previoustrack', () => useStore.getState().prev());
  h('nexttrack', () => useStore.getState().next());
  h('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
}

/* browser back button closes overlays */
window.addEventListener('popstate', () => {
  const s = useStore.getState();
  if (s.menu) { useStore.setState({ menu: null }); }
  if (s.fullOpen) { useStore.setState({ fullOpen: false }); return; }
  if (s.details.length) useStore.setState({ details: s.details.slice(0, -1) });
});

export const currentTrack = () => { const s = useStore.getState(); return s.queue[s.idx]; };
