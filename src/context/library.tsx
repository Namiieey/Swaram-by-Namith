"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getSong, getSongsByIds, pickAudio, stripTrack } from "@/lib/saavn";
import {
  getDownloadBlob,
  listDownloads,
  removeDownload,
  saveDownload,
  type DownloadMeta,
} from "@/lib/idb";
import type { LyricsResult, PlaylistSummary, Track } from "@/lib/types";
import { useMe, useSettings, useUI } from "./app";

/* ───────────── Library: likes + playlists ───────────── */
type LibraryValue = {
  likes: Track[];
  isLiked: (id: string) => boolean;
  toggleLike: (t: Track) => void;
  playlists: PlaylistSummary[];
  playlistsReady: boolean;
  refreshPlaylists: () => Promise<void>;
  createPlaylist: (o: { name: string; isPublic?: boolean; isCollaborative?: boolean; description?: string }) => Promise<PlaylistSummary | null>;
  addToPlaylist: (playlistId: string, t: Track) => Promise<boolean>;
};
const LibraryCtx = createContext<LibraryValue | null>(null);
export function useLibrary(): LibraryValue {
  const v = useContext(LibraryCtx);
  if (!v) throw new Error("Library provider missing");
  return v;
}

/* ───────────── Downloads (offline) ───────────── */
type DownloadsValue = {
  items: DownloadMeta[];
  ready: boolean;
  online: boolean;
  progress: Record<string, number>;
  isDownloaded: (id: string) => boolean;
  download: (t: Track) => Promise<void>;
  downloadMany: (ts: Track[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  totalSize: number;
  getBlobUrl: (id: string) => Promise<string | null>;
};
const DownloadsCtx = createContext<DownloadsValue | null>(null);
export function useDownloads(): DownloadsValue {
  const v = useContext(DownloadsCtx);
  if (!v) throw new Error("Downloads provider missing");
  return v;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { me } = useMe();
  const { settings } = useSettings();
  const { toast } = useUI();

  /* likes */
  const [likes, setLikes] = useState<Track[]>([]);
  useEffect(() => {
    try {
      setLikes(JSON.parse(localStorage.getItem("swaram:likes") ?? "[]") as Track[]);
    } catch {
      /* ignore */
    }
  }, []);
  const likeIds = useMemo(() => new Set(likes.map((l) => l.id)), [likes]);
  const isLiked = useCallback((id: string) => likeIds.has(id), [likeIds]);
  const toggleLike = useCallback(
    (t: Track) => {
      setLikes((cur) => {
        const has = cur.some((x) => x.id === t.id);
        const { audio: _a, ...rest } = t;
        void _a;
        const next = has ? cur.filter((x) => x.id !== t.id) : [rest as Track, ...cur];
        try {
          localStorage.setItem("swaram:likes", JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      toast(likeIds.has(t.id) ? "Removed from Liked Songs" : "Added to Liked Songs");
    },
    [likeIds, toast],
  );

  /* playlists */
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistsReady, setPlaylistsReady] = useState(false);
  const refreshPlaylists = useCallback(async () => {
    if (!me) return;
    try {
      const r = await api<{ playlists: PlaylistSummary[] }>("/api/playlists?scope=mine");
      setPlaylists(r.playlists);
    } catch {
      /* offline */
    } finally {
      setPlaylistsReady(true);
    }
  }, [me]);
  useEffect(() => {
    void refreshPlaylists();
  }, [refreshPlaylists]);
  useEffect(() => {
    const onFocus = () => void refreshPlaylists();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPlaylists]);

  const createPlaylist = useCallback<LibraryValue["createPlaylist"]>(
    async (o) => {
      try {
        const r = await api<{ playlist: PlaylistSummary }>("/api/playlists", { method: "POST", body: o });
        await refreshPlaylists();
        return r.playlist;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't create playlist");
        return null;
      }
    },
    [refreshPlaylists, toast],
  );

  const addToPlaylist = useCallback<LibraryValue["addToPlaylist"]>(
    async (id, t) => {
      try {
        const r = await api<{ added: boolean }>(`/api/playlists/${id}/tracks`, { method: "POST", body: { track: stripTrack(t) } });
        toast(r.added ? "Added to playlist" : "Already in this playlist");
        void refreshPlaylists();
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't add song");
        return false;
      }
    },
    [refreshPlaylists, toast],
  );

  const libValue = useMemo<LibraryValue>(
    () => ({ likes, isLiked, toggleLike, playlists, playlistsReady, refreshPlaylists, createPlaylist, addToPlaylist }),
    [likes, isLiked, toggleLike, playlists, playlistsReady, refreshPlaylists, createPlaylist, addToPlaylist],
  );

  /* downloads */
  const [items, setItems] = useState<DownloadMeta[]>([]);
  const [dlReady, setDlReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const busy = useRef(new Set<string>());
  const urls = useRef(new Map<string, string>());

  const reload = useCallback(async () => {
    try {
      setItems(await listDownloads());
    } catch {
      /* IndexedDB unavailable */
    } finally {
      setDlReady(true);
    }
  }, []);
  useEffect(() => {
    void reload();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [reload]);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const isDownloaded = useCallback((id: string) => ids.has(id), [ids]);

  const download = useCallback(
    async (track: Track) => {
      if (ids.has(track.id) || busy.current.has(track.id)) return;
      busy.current.add(track.id);
      setProgress((p) => ({ ...p, [track.id]: 0 }));
      try {
        let t = track;
        if (!t.audio) t = (await getSong(track.id)) ?? track;
        const src = pickAudio(t, settings.quality);
        if (!src) throw new Error("No audio source");
        let res: Response | null = null;
        try {
          res = await fetch(src);
          if (!res.ok) res = null;
        } catch {
          res = null;
        }
        if (!res) {
          res = await fetch(`/api/audio?url=${encodeURIComponent(src)}`);
          if (!res.ok) throw new Error("Download failed");
        }
        const total = Number(res.headers.get("content-length")) || 0;
        const chunks: BlobPart[] = [];
        let received = 0;
        if (res.body) {
          const reader = res.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value as BlobPart);
              received += value.length;
              if (total) setProgress((p) => ({ ...p, [track.id]: Math.min(0.98, received / total) }));
            }
          }
        } else {
          chunks.push(await res.blob());
        }
        const blob = new Blob(chunks, { type: res.headers.get("content-type") || "audio/mp4" });

        let lyrics: LyricsResult = null;
        try {
          const lr = await fetch(
            `/api/lyrics?title=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artists)}&album=${encodeURIComponent(track.album)}&duration=${track.duration}`,
          );
          if (lr.ok) lyrics = ((await lr.json()) as { lyrics: LyricsResult }).lyrics;
        } catch {
          /* optional */
        }

        const { audio: _a, ...rest } = t;
        void _a;
        await saveDownload(
          { id: track.id, track: rest as Track, size: blob.size, quality: settings.quality, savedAt: Date.now(), lyrics },
          blob,
        );
        try {
          if (track.image && "caches" in window) {
            const cache = await caches.open("swaram-img");
            const req = new Request(track.image, { mode: "no-cors" });
            await cache.put(req, await fetch(req));
          }
        } catch {
          /* cover caching is best effort */
        }
        try {
          await navigator.storage?.persist?.();
        } catch {
          /* ignore */
        }
        await reload();
        toast(`Downloaded “${track.name}”`);
      } catch (e) {
        toast(e instanceof Error ? `Download failed: ${e.message}` : "Download failed");
      } finally {
        busy.current.delete(track.id);
        setProgress((p) => {
          const n = { ...p };
          delete n[track.id];
          return n;
        });
      }
    },
    [ids, settings.quality, reload, toast],
  );

  const downloadMany = useCallback(
    async (ts: Track[]) => {
      const todo = ts.filter((t) => !ids.has(t.id));
      if (!todo.length) return toast("Everything here is already downloaded");
      toast(`Downloading ${todo.length} song${todo.length > 1 ? "s" : ""}…`);
      // hydrate audio urls in one batch where missing
      const need = todo.filter((t) => !t.audio).map((t) => t.id);
      let fresh = new Map<string, Track>();
      if (need.length) {
        try {
          const got = await getSongsByIds(need.slice(0, 40));
          fresh = new Map(got.map((g) => [g.id, g]));
        } catch {
          /* individual downloads will retry */
        }
      }
      for (const t of todo) {
        await download(fresh.get(t.id) ? { ...t, audio: fresh.get(t.id)!.audio } : t);
      }
    },
    [ids, download, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeDownload(id);
      const u = urls.current.get(id);
      if (u) {
        URL.revokeObjectURL(u);
        urls.current.delete(id);
      }
      await reload();
      toast("Removed from downloads");
    },
    [reload, toast],
  );

  const getBlobUrl = useCallback(async (id: string) => {
    try {
      const blob = await getDownloadBlob(id);
      if (!blob) return null;
      const prev = urls.current.get(id);
      if (prev) return prev;
      const u = URL.createObjectURL(blob);
      urls.current.set(id, u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const totalSize = useMemo(() => items.reduce((a, b) => a + b.size, 0), [items]);
  const dlValue = useMemo<DownloadsValue>(
    () => ({ items, ready: dlReady, online, progress, isDownloaded, download, downloadMany, remove, totalSize, getBlobUrl }),
    [items, dlReady, online, progress, isDownloaded, download, downloadMany, remove, totalSize, getBlobUrl],
  );

  return (
    <LibraryCtx.Provider value={libValue}>
      <DownloadsCtx.Provider value={dlValue}>{children}</DownloadsCtx.Provider>
    </LibraryCtx.Provider>
  );
}
