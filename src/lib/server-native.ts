/* eslint-disable @typescript-eslint/no-explicit-any */
// Fallback adapter: talks to JioSaavn's own web endpoints and reshapes the answers into the
// same schema that the open-source `jiosaavn-api` (saavn.dev) returns, so the app never notices.
import CryptoJS from "crypto-js";

type R = Record<string, any>;

const NATIVE = "https://www.jiosaavn.com/api.php";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function call(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ _format: "json", _marker: "0", api_version: "4", ctx: "web6dot0", ...params });
  const res = await fetch(`${NATIVE}?${qs.toString()}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`native ${res.status}`);
  const text = await res.text();
  return JSON.parse(text);
}

function decrypt(enc: string): string | null {
  try {
    const out = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(enc) } as CryptoJS.lib.CipherParams,
      CryptoJS.enc.Utf8.parse("38346591"),
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
    ).toString(CryptoJS.enc.Utf8);
    return out || null;
  } catch {
    return null;
  }
}

const img = (u: unknown, size = "500x500") => {
  const url = typeof u === "string" ? u : "";
  if (!url) return [];
  return [{ quality: size, url: url.replace(/150x150|50x50/, size) }];
};

function artistOf(a: R) {
  return { id: String(a.id), name: a.name, role: a.role, image: img(a.image), type: "artist" };
}

function song(s: R): R {
  const mi: R = s.more_info ?? {};
  const map: R = mi.artistMap ?? {};
  const enc: string | undefined = mi.encrypted_media_url;
  const url = enc ? decrypt(enc) : null;
  const downloadUrl: { quality: string; url: string }[] = [];
  if (url) {
    for (const q of ["12", "48", "96", "160", "320"]) {
      if (q === "320" && mi["320kbps"] !== "true") continue;
      downloadUrl.push({ quality: `${q}kbps`, url: url.replace(/_(?:12|48|96|160|320)\.mp4/, `_${q}.mp4`) });
    }
  }
  const primary: R[] = (map.primary_artists ?? []).map(artistOf);
  const all: R[] = (map.artists ?? []).map(artistOf);
  return {
    id: String(s.id),
    name: s.title ?? s.name,
    type: "song",
    year: s.year,
    duration: Number(mi.duration) || 0,
    language: s.language,
    hasLyrics: mi.has_lyrics === "true",
    album: { id: mi.album_id ? String(mi.album_id) : undefined, name: mi.album },
    artists: { primary, all },
    image: img(s.image),
    downloadUrl,
  };
}

function album(a: R): R {
  const mi: R = a.more_info ?? {};
  const primary: R[] = (mi.artistMap?.primary_artists ?? []).map(artistOf);
  return {
    id: String(a.id),
    name: a.title ?? a.name,
    year: a.year,
    type: "album",
    songCount: Number(mi.song_count) || undefined,
    artists: { primary },
    image: img(a.image),
    description: a.subtitle ?? "",
  };
}

function playlist(p: R): R {
  const mi: R = p.more_info ?? {};
  return {
    id: String(p.id),
    name: p.title ?? p.name,
    type: "playlist",
    description: p.header_desc || p.subtitle || "",
    songCount: Number(mi.song_count ?? p.list_count) || undefined,
    image: img(p.image),
  };
}

function artist(a: R): R {
  return { id: String(a.id ?? a.artistId), name: a.name, type: "artist", image: img(a.image) };
}

function parseBio(bio: unknown): R[] {
  if (Array.isArray(bio)) return bio as R[];
  if (typeof bio === "string" && bio.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(bio);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return typeof bio === "string" && bio ? [{ text: bio }] : [];
}

/** Returns a saavn.dev-shaped body ({ success, data }) or null if unsupported / failed. */
export async function nativeFetch(path: string[], sp: URLSearchParams): Promise<R | null> {
  try {
    const [a, b] = path;
    const limit = String(Math.min(Number(sp.get("limit")) || 20, 50));
    const page = String((Number(sp.get("page")) || 0) + 1);
    const query = sp.get("query") ?? "";

    if (a === "search" && b === "songs") {
      const d = await call({ __call: "search.getResults", q: query, n: limit, p: page });
      return { success: true, data: { total: d.total, start: 0, results: (d.results ?? []).map(song) } };
    }
    if (a === "search" && b === "albums") {
      const d = await call({ __call: "search.getAlbumResults", q: query, n: limit, p: page });
      return { success: true, data: { total: d.total, start: 0, results: (d.results ?? []).map(album) } };
    }
    if (a === "search" && b === "playlists") {
      const d = await call({ __call: "search.getPlaylistResults", q: query, n: limit, p: page });
      return { success: true, data: { total: d.total, start: 0, results: (d.results ?? []).map(playlist) } };
    }
    if (a === "search" && b === "artists") {
      const d = await call({ __call: "search.getArtistResults", q: query, n: limit, p: page });
      return { success: true, data: { total: d.total, start: 0, results: (d.results ?? []).map(artist) } };
    }
    if (a === "songs" && !b) {
      const ids = sp.get("ids") ?? "";
      if (!ids) return null;
      const d = await call({ __call: "song.getDetails", pids: ids });
      return { success: true, data: (d.songs ?? []).map(song) };
    }
    if (a === "albums") {
      const d = await call({ __call: "content.getAlbumDetails", albumid: sp.get("id") ?? "" });
      if (!d?.id) return null;
      return { success: true, data: { ...album(d), songs: (d.list ?? []).map(song) } };
    }
    if (a === "playlists") {
      const d = await call({ __call: "playlist.getDetails", listid: sp.get("id") ?? "", n: String(Number(sp.get("limit")) || 100), p: "1" });
      if (!d?.id) return null;
      return { success: true, data: { ...playlist(d), songCount: Number(d.list_count) || (d.list ?? []).length, songs: (d.list ?? []).map(song) } };
    }
    if (a === "artists") {
      const d = await call({ __call: "artist.getArtistPageDetails", artistId: sp.get("id") ?? "", n_song: "20", n_album: "20" });
      if (!d?.artistId) return null;
      return {
        success: true,
        data: {
          id: String(d.artistId),
          name: d.name,
          image: img(d.image),
          followerCount: Number(d.follower_count) || 0,
          isVerified: d.isVerified === true || d.isVerified === "true",
          bio: parseBio(d.bio),
          topSongs: (d.topSongs ?? []).map(song),
          topAlbums: (d.topAlbums ?? []).map(album),
          similarArtists: (d.similarArtists ?? []).map(artist),
        },
      };
    }
  } catch {
    return null;
  }
  return null;
}
