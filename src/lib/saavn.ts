/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Entity, Track } from "./types";
import { decodeHtml } from "./utils";

type R = Record<string, any>;

export const LANGUAGES: { id: string; label: string; native: string }[] = [
  { id: "malayalam", label: "Malayalam", native: "മലയാളം" },
  { id: "hindi", label: "Hindi", native: "हिन्दी" },
  { id: "tamil", label: "Tamil", native: "தமிழ்" },
  { id: "telugu", label: "Telugu", native: "తెలుగు" },
  { id: "kannada", label: "Kannada", native: "ಕನ್ನಡ" },
  { id: "english", label: "English", native: "English" },
  { id: "punjabi", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { id: "bengali", label: "Bengali", native: "বাংলা" },
  { id: "marathi", label: "Marathi", native: "मराठी" },
  { id: "gujarati", label: "Gujarati", native: "ગુજરાતી" },
  { id: "bhojpuri", label: "Bhojpuri", native: "भोजपुरी" },
  { id: "urdu", label: "Urdu", native: "اردو" },
];

export function langLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}

function pickImage(img: any, pref = "500x500"): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (Array.isArray(img) && img.length) {
    const hit = img.find((i: R) => i.quality === pref);
    return (hit ?? img[img.length - 1]).url ?? "";
  }
  return "";
}

export function normalizeSong(s: R): Track {
  const primary: R[] = s.artists?.primary ?? [];
  const all: R[] = s.artists?.all ?? [];
  const list = primary.length ? primary : all.slice(0, 3);
  const artists = list.map((a) => decodeHtml(a.name)).join(", ") || decodeHtml(s.primaryArtists) || "Unknown artist";
  const audio = Array.isArray(s.downloadUrl)
    ? s.downloadUrl.filter((d: R) => d?.url).map((d: R) => ({ q: String(d.quality), url: String(d.url) }))
    : undefined;
  return {
    id: String(s.id),
    name: decodeHtml(s.name),
    artists,
    artistId: list[0]?.id ? String(list[0].id) : undefined,
    album: decodeHtml(s.album?.name),
    albumId: s.album?.id ? String(s.album.id) : undefined,
    image: pickImage(s.image),
    duration: Number(s.duration) || 0,
    language: s.language ?? "",
    year: s.year ? String(s.year) : undefined,
    hasLyrics: !!s.hasLyrics,
    audio: audio && audio.length ? audio : undefined,
  };
}

export function normalizeAlbum(a: R): Entity {
  const primary: R[] = a.artists?.primary ?? [];
  const artists = primary.map((x) => decodeHtml(x.name)).join(", ");
  return {
    id: String(a.id),
    type: "album",
    title: decodeHtml(a.name ?? a.title),
    subtitle: [a.year, artists].filter(Boolean).join(" • ") || "Album",
    image: pickImage(a.image),
  };
}

export function normalizePlaylist(p: R): Entity {
  return {
    id: String(p.id),
    type: "playlist",
    title: decodeHtml(p.name ?? p.title),
    subtitle: decodeHtml(p.description) || (p.songCount ? `${p.songCount} songs` : "Playlist"),
    image: pickImage(p.image),
  };
}

export function normalizeArtist(a: R): Entity {
  return {
    id: String(a.id),
    type: "artist",
    title: decodeHtml(a.name ?? a.title),
    subtitle: "Artist",
    image: pickImage(a.image),
  };
}

export function pickAudio(track: Track, pref: string): string | undefined {
  const list = track.audio;
  if (!list?.length) return undefined;
  const exact = list.find((a) => a.q === pref);
  return (exact ?? list[list.length - 1]).url;
}

// ---------- client fetch helpers (go through our proxy route) ----------
const cache = new Map<string, { at: number; data: any }>();

export async function saavn<T = any>(
  path: string,
  params: Record<string, string | number> = {},
  ttl = 5 * 60_000,
): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `/api/saavn/${path}${qs ? `?${qs}` : ""}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.data as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Music service is unavailable");
  const json = await res.json();
  if (json?.success === false) throw new Error(json.message || "Music service error");
  cache.set(url, { at: Date.now(), data: json.data });
  return json.data as T;
}

export async function searchSongs(query: string, limit = 20, page = 0): Promise<Track[]> {
  const d = await saavn<R>("search/songs", { query, limit, page });
  return (d?.results ?? []).map(normalizeSong);
}
export async function searchAlbums(query: string, limit = 12): Promise<Entity[]> {
  const d = await saavn<R>("search/albums", { query, limit });
  return (d?.results ?? []).map(normalizeAlbum);
}
export async function searchPlaylists(query: string, limit = 12): Promise<Entity[]> {
  const d = await saavn<R>("search/playlists", { query, limit });
  return (d?.results ?? []).map(normalizePlaylist);
}
export async function searchArtists(query: string, limit = 12): Promise<Entity[]> {
  const d = await saavn<R>("search/artists", { query, limit });
  return (d?.results ?? []).map(normalizeArtist);
}
export async function getSongsByIds(ids: string[], ttl = 30 * 60_000): Promise<Track[]> {
  if (!ids.length) return [];
  const d = await saavn<R[]>("songs", { ids: ids.join(",") }, ttl);
  return (Array.isArray(d) ? d : []).map(normalizeSong);
}
export async function getSong(id: string, ttl?: number): Promise<Track | null> {
  const r = await getSongsByIds([id], ttl);
  return r[0] ?? null;
}
export async function getAlbum(id: string) {
  const d = await saavn<R>("albums", { id });
  return {
    id: String(d.id),
    name: decodeHtml(d.name),
    description: decodeHtml(d.description),
    year: d.year ? String(d.year) : "",
    image: pickImage(d.image),
    artists: ((d.artists?.primary ?? []) as R[]).map((a) => ({ id: String(a.id), name: decodeHtml(a.name) })),
    songs: ((d.songs ?? []) as R[]).map(normalizeSong),
  };
}
export async function getPlaylist(id: string) {
  const d = await saavn<R>("playlists", { id, limit: 100 });
  return {
    id: String(d.id),
    name: decodeHtml(d.name),
    description: decodeHtml(d.description),
    image: pickImage(d.image),
    songCount: Number(d.songCount) || 0,
    songs: ((d.songs ?? []) as R[]).map(normalizeSong),
  };
}
export async function getArtist(id: string) {
  const d = await saavn<R>("artists", { id });
  return {
    id: String(d.id),
    name: decodeHtml(d.name),
    image: pickImage(d.image),
    followers: Number(d.followerCount) || 0,
    verified: !!d.isVerified,
    bio: Array.isArray(d.bio)
      ? (d.bio as R[])
          .map((b) => decodeHtml(b.text))
          .filter(Boolean)
          .join("\n\n")
      : "",
    topSongs: ((d.topSongs ?? []) as R[]).map(normalizeSong),
    albums: ((d.topAlbums ?? []) as R[]).map(normalizeAlbum),
    similar: ((d.similarArtists ?? []) as R[]).map(normalizeArtist),
  };
}

export function stripTrack(t: Track) {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists,
    artistId: t.artistId,
    album: t.album,
    albumId: t.albumId,
    image: t.image,
    duration: t.duration,
    language: t.language,
    hasLyrics: t.hasLyrics,
    year: t.year,
  };
}
