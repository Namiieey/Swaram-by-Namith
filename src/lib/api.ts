/* Unofficial JioSaavn API client + normalisers */

export interface Artist { id: string; name: string; img: string }
export interface Track {
  id: string; name: string; album: string; albumId: string; artist: string;
  artists: Artist[]; img: string; thumb: string; dur: number;
  urls: { quality: string; url: string }[]; lang: string; year: string;
}
export interface Album { id: string; name: string; img: string; sub: string; lang: string; year: string }
export interface Playlist { id: string; name: string; img: string; sub: string; lang: string }

const BASES = ['https://saavn.sumit.co', 'https://saavn.dev'];
let baseIdx = 0;
const cache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();

export const enc = encodeURIComponent;

export function dec(s: unknown): string {
  if (s == null) return '';
  const t = document.createElement('textarea');
  t.innerHTML = String(s);
  return t.value.trim();
}

export async function api<T = any>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path);
  if (inflight.has(path)) return inflight.get(path)!;
  const p = (async () => {
    let lastErr: unknown = new Error('Network error');
    for (let k = 0; k < BASES.length; k++) {
      const bi = (baseIdx + k) % BASES.length;
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 14000);
      try {
        const r = await fetch(BASES[bi] + path, { signal: ctrl.signal });
        clearTimeout(to);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (j.success === false || j.data == null) throw new Error(j.message || 'API error');
        baseIdx = bi;
        cache.set(path, j.data);
        return j.data as T;
      } catch (e) { clearTimeout(to); lastErr = e; }
    }
    throw lastErr;
  })();
  inflight.set(path, p);
  try { return await p; } finally { inflight.delete(path); }
}

export function pickImg(arr: any, q = '500x500'): string {
  if (!arr) return '';
  if (typeof arr === 'string') return arr.replace('http:', 'https:');
  if (!arr.length) return '';
  const f = arr.find((i: any) => i.quality === q) || arr[arr.length - 1];
  return ((f && (f.url || f.link)) || '').replace('http:', 'https:');
}

export function norm(s: any): Track {
  const prim = s.artists?.primary?.length ? s.artists.primary : s.artists?.all || [];
  const t: Track = {
    id: String(s.id),
    name: dec(s.name || s.title) || 'Untitled',
    album: dec(typeof s.album === 'string' ? s.album : s.album?.name || ''),
    albumId: s.album?.id ? String(s.album.id) : '',
    artist: dec(prim.slice(0, 3).map((a: any) => a.name).join(', ')) || dec(s.primaryArtists) || 'Unknown artist',
    artists: prim.map((a: any) => ({ id: String(a.id), name: dec(a.name), img: pickImg(a.image) })),
    img: pickImg(s.image, '500x500'),
    thumb: pickImg(s.image, '150x150'),
    dur: Number(s.duration) || 0,
    urls: Array.isArray(s.downloadUrl) ? s.downloadUrl.map((u: any) => ({ quality: u.quality, url: u.url || u.link })) : [],
    lang: String(s.language || '').toLowerCase(),
    year: String(s.year || '')
  };
  if (!t.thumb) t.thumb = t.img;
  return t;
}
export const normAlbum = (a: any): Album => ({
  id: String(a.id), name: dec(a.name || a.title), img: pickImg(a.image),
  sub: dec((a.artists?.primary || []).slice(0, 2).map((x: any) => x.name).join(', ')) || (a.year ? String(a.year) : 'Album'),
  lang: String(a.language || '').toLowerCase(), year: String(a.year || '')
});
export const normArtist = (a: any): Artist => ({ id: String(a.id), name: dec(a.name || a.title), img: pickImg(a.image) });
export const normPlaylist = (p: any): Playlist => ({
  id: String(p.id), name: dec(p.name || p.title), img: pickImg(p.image),
  sub: p.songCount ? `${p.songCount} songs` : dec(p.description) || 'Playlist', lang: String(p.language || '').toLowerCase()
});

export const uniq = <T extends { id: string }>(list: T[]) => { const m = new Set<string>(); return list.filter(x => !m.has(x.id) && m.add(x.id)); };

export function streamUrl(t: Track | undefined, quality: string): string {
  if (!t || !t.urls?.length) return '';
  for (const q of [quality, '160kbps', '96kbps', '320kbps', '48kbps', '12kbps']) {
    const f = t.urls.find(u => u.quality === q);
    if (f?.url) return f.url.replace('http:', 'https:');
  }
  return (t.urls[t.urls.length - 1].url || '').replace('http:', 'https:');
}

/* ---------- endpoints ---------- */
export async function searchSongs(q: string, limit = 30, page = 1) {
  const d = await api(`/api/search/songs?query=${enc(q)}&limit=${limit}&page=${page}`);
  return { tracks: uniq<Track>((d.results || []).map(norm)), total: Number(d.total) || 0 };
}
export async function searchAlbums(q: string, limit = 20): Promise<Album[]> {
  const d = await api(`/api/search/albums?query=${enc(q)}&limit=${limit}`);
  return uniq<Album>((d.results || []).map(normAlbum));
}
export async function searchArtists(q: string, limit = 20): Promise<Artist[]> {
  const d = await api(`/api/search/artists?query=${enc(q)}&limit=${limit}`);
  return uniq<Artist>((d.results || []).map(normArtist));
}
export async function searchPlaylists(q: string, limit = 20): Promise<Playlist[]> {
  const d = await api(`/api/search/playlists?query=${enc(q)}&limit=${limit}`);
  return uniq<Playlist>((d.results || []).map(normPlaylist));
}
export type TopResult = { type: 'artist' | 'album' | 'playlist' | 'song'; id: string; title: string; img: string; sub: string } | null;
export async function topResult(q: string): Promise<TopResult> {
  const d = await api(`/api/search?query=${enc(q)}`);
  const r = d?.topQuery?.results?.[0];
  if (!r || !['artist', 'album', 'playlist', 'song'].includes(r.type)) return null;
  return { type: r.type, id: String(r.id), title: dec(r.title || r.name), img: pickImg(r.image), sub: dec(r.description || r.type) };
}
export async function getSong(id: string): Promise<Track | null> {
  let d: any;
  try { d = await api('/api/songs/' + enc(id)); } catch { d = await api('/api/songs?ids=' + enc(id)); }
  const o = Array.isArray(d) ? d[0] : d?.songs ? d.songs[0] : d;
  return o ? norm(o) : null;
}
export async function getAlbum(id: string) {
  const d = await api('/api/albums?id=' + enc(id));
  const songs = (d.songs || []).map(norm) as Track[];
  return {
    name: dec(d.name), img: pickImg(d.image) || songs[0]?.img || '', year: String(d.year || ''),
    artists: dec((d.artists?.primary || []).slice(0, 3).map((a: any) => a.name).join(', ')), songs
  };
}
export async function getPlaylist(id: string) {
  const d = await api(`/api/playlists?id=${enc(id)}&limit=100`);
  const songs = (d.songs || []).map(norm) as Track[];
  return { name: dec(d.name), img: pickImg(d.image) || songs[0]?.img || '', desc: dec(d.description), songs };
}
export async function getArtist(id: string) {
  const d = await api(`/api/artists?id=${enc(id)}&songCount=30&albumCount=14`);
  let songs = (d.topSongs || []).map(norm) as Track[];
  if (!songs.length) {
    try { const sd = await api(`/api/artists/${enc(id)}/songs`); songs = (sd.songs || sd.results || []).map(norm); } catch { /* noop */ }
  }
  return {
    name: dec(d.name), img: pickImg(d.image) || songs[0]?.img || '',
    lang: dec(d.dominantLanguage || ''), followers: Number(d.followerCount || d.fanCount || 0), verified: !!d.isVerified,
    songs, albums: (d.topAlbums || []).map(normAlbum) as Album[],
    similar: (d.similarArtists || []).map(normArtist).filter((a: Artist) => a.img).slice(0, 14) as Artist[]
  };
}
export async function getSuggestions(id: string, limit = 15): Promise<Track[]> {
  const d = await api(`/api/songs/${enc(id)}/suggestions?limit=${limit}`);
  const arr = Array.isArray(d) ? d : d.results || d.songs || [];
  return arr.map(norm);
}

/* ---------- multi-language helpers ---------- */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = []; const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) lists.forEach(l => { if (l[i]) out.push(l[i]); });
  return out;
}
const settle = async <T,>(ps: Promise<T>[]) => (await Promise.allSettled(ps)).map(r => (r.status === 'fulfilled' ? r.value : null));

/** Songs for a query template across several languages, round-robin merged. */
export async function multiSongs(tpl: (lang: string) => string, langs: string[], per = 20): Promise<Track[]> {
  const res = await settle(langs.map(l => searchSongs(tpl(l), per).then(r => {
    const f = r.tracks.filter(t => t.lang === l);
    return f.length >= 3 ? f : r.tracks;
  })));
  const ok = res.filter(Boolean) as Track[][];
  if (!ok.length) throw new Error('No results');
  return uniq(interleave(ok));
}
export async function multiAlbums(tpl: (lang: string) => string, langs: string[], per = 14): Promise<Album[]> {
  const res = await settle(langs.map(l => searchAlbums(tpl(l), per).then(r => {
    const f = r.filter(a => a.lang === l);
    return f.length >= 3 ? f : r;
  })));
  const ok = res.filter(Boolean) as Album[][];
  if (!ok.length) throw new Error('No results');
  return uniq(interleave(ok));
}
export async function multiPlaylists(tpl: (lang: string) => string, langs: string[], per = 12): Promise<Playlist[]> {
  const res = await settle(langs.map(l => searchPlaylists(tpl(l), per)));
  const ok = res.filter(Boolean) as Playlist[][];
  if (!ok.length) throw new Error('No results');
  return uniq(interleave(ok));
}
