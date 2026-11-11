/* Lyrics from open providers: LRCLIB (synced + plain, open source) → lyrics.ovh (plain fallback) */
import type { Track } from './api';

export interface LyricLine { t: number; text: string }
export interface Lyrics { synced: boolean; lines: LyricLine[]; source: string }

const cache = new Map<string, Promise<Lyrics | null>>();

async function jget<T>(url: string, ms = 9000): Promise<T | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; } finally { clearTimeout(to); }
}

export function parseLRC(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  const re = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(re)];
    if (!stamps.length) continue;
    const text = raw.replace(re, '').trim();
    for (const m of stamps) {
      const frac = m[3] ? Number('0.' + m[3]) : 0;
      out.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

export function cleanTitle(s: string) {
  return s
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s[-–]\s(from|official|remix|lofi|reprise|video|lyric|male|female|film).*$/i, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ').trim();
}
const firstArtist = (t: Track) => (t.artists[0]?.name || t.artist.split(',')[0] || '').trim();

interface LrcItem { duration?: number; syncedLyrics?: string | null; plainLyrics?: string | null; instrumental?: boolean }

function fromItem(it: LrcItem): Lyrics | null {
  if (it.syncedLyrics) {
    const lines = parseLRC(it.syncedLyrics);
    if (lines.length > 2) return { synced: true, lines, source: 'LRCLIB' };
  }
  if (it.plainLyrics && it.plainLyrics.trim().length > 20) {
    return { synced: false, lines: it.plainLyrics.split(/\r?\n/).map(text => ({ t: -1, text: text.trim() })), source: 'LRCLIB' };
  }
  return null;
}

function best(items: LrcItem[] | null, dur: number, tol: number): Lyrics | null {
  if (!items?.length) return null;
  const usable = items.filter(i => !i.instrumental && (i.syncedLyrics || i.plainLyrics));
  const near = usable
    .filter(i => !dur || !i.duration || Math.abs(i.duration - dur) <= tol)
    .sort((a, b) => (b.syncedLyrics ? 1 : 0) - (a.syncedLyrics ? 1 : 0) || Math.abs((a.duration || dur) - dur) - Math.abs((b.duration || dur) - dur));
  for (const it of near) { const l = fromItem(it); if (l) return l; }
  return null;
}

async function fetchLyrics(t: Track): Promise<Lyrics | null> {
  const title = cleanTitle(t.name) || t.name;
  const artist = firstArtist(t);
  const album = cleanTitle(t.album);
  const base = 'https://lrclib.net/api';
  const q = (o: Record<string, string>) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  // 1. exact signature match
  if (t.dur && artist) {
    const g = await jget<LrcItem>(`${base}/get?${q({ track_name: title, artist_name: artist, album_name: album, duration: String(Math.round(t.dur)) })}`);
    if (g) { const l = fromItem(g); if (l) return l; }
  }
  // 2. structured search, 3. free-text search, 4. title only
  const attempts = [
    `${base}/search?${q({ track_name: title, artist_name: artist })}`,
    `${base}/search?${q({ q: `${title} ${artist}` })}`,
    `${base}/search?${q({ track_name: title })}`,
    `${base}/search?${q({ q: t.name })}`
  ];
  for (let i = 0; i < attempts.length; i++) {
    const items = await jget<LrcItem[]>(attempts[i]);
    const l = best(items, t.dur, i < 2 ? 8 : 5);
    if (l) return l;
  }
  // 5. lyrics.ovh (plain)
  if (artist) {
    const o = await jget<{ lyrics?: string }>(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, 8000);
    if (o?.lyrics && o.lyrics.trim().length > 20) {
      return { synced: false, lines: o.lyrics.replace(/\r/g, '').split('\n').map(text => ({ t: -1, text: text.trim() })), source: 'lyrics.ovh' };
    }
  }
  return null;
}

export function getLyrics(t: Track, force = false): Promise<Lyrics | null> {
  if (force) cache.delete(t.id);
  let p = cache.get(t.id);
  if (!p) {
    p = fetchLyrics(t).catch(() => null);
    cache.set(t.id, p);
    p.then(r => { if (!r) cache.delete(t.id); });
  }
  return p;
}
