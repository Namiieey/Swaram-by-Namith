"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, pushRecent } from "@/lib/api";
import { getSong, pickAudio, searchSongs, stripTrack } from "@/lib/saavn";
import type { PublicUser, Track } from "@/lib/types";
import { useMe, useSettings, useUI } from "./app";
import { useDownloads } from "./library";

export type Repeat = "off" | "all" | "one";
export type RoomInfo = {
  code: string;
  isHost: boolean;
  hostId: string;
  host: PublicUser | null;
  members: PublicUser[];
};

type RoomPayload = {
  code: string;
  hostId: string;
  host: PublicUser | null;
  track: Track | null;
  position: number;
  isPlaying: boolean;
  updatedAt: number;
  serverNow: number;
  members: PublicUser[];
};

type PlayerValue = {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  loading: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  source: string;
  room: RoomInfo | null;
  needsTap: boolean;
  play: (track: Track, list?: Track[], source?: string) => void;
  playList: (tracks: Track[], start?: number, source?: string) => void;
  playShuffled: (tracks: Track[], source?: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  enqueue: (t: Track) => void;
  playNext: (t: Track) => void;
  removeAt: (i: number) => void;
  jumpTo: (i: number) => void;
  clearUpcoming: () => void;
  createRoom: () => Promise<string | null>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  resumeBlocked: () => void;
};

const PlayerCtx = createContext<PlayerValue | null>(null);
const TimeCtx = createContext<{ time: number; duration: number }>({ time: 0, duration: 0 });

export function usePlayer(): PlayerValue {
  const v = useContext(PlayerCtx);
  if (!v) throw new Error("Player provider missing");
  return v;
}
export const usePlayerTime = () => useContext(TimeCtx);

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { me } = useMe();
  const { toast } = useUI();
  const { getBlobUrl, online } = useDownloads();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [source, setSource] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadNonce, setLoadNonce] = useState(0);
  const [seekTick, setSeekTick] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);

  const origRef = useRef<Track[]>([]);
  const wantPlayRef = useRef(false);
  const switchingRef = useRef(false);
  const seekOnLoadRef = useRef<number | null>(null);
  const retryRef = useRef<string | null>(null);
  const loggedRef = useRef(false);
  const moreBusy = useRef(false);
  const restoredRef = useRef(false);

  const current = queue[index] ?? null;

  // latest-value refs (avoid stale closures in event handlers)
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const indexRef = useRef(index);
  indexRef.current = index;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const roomRef = useRef(room);
  roomRef.current = room;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const meRef = useRef(me);
  meRef.current = me;
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const currentRef = useRef(current);
  currentRef.current = current;
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const guard = useCallback(() => {
    const r = roomRef.current;
    if (r && !r.isHost) {
      toast("You're listening together — only the host controls playback");
      return false;
    }
    return true;
  }, [toast]);

  const tryPlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      setNeedsTap(false);
    } catch (e) {
      const name = (e as Error).name;
      if (name === "NotAllowedError") {
        setNeedsTap(true);
        setIsPlaying(false);
      } else if (name !== "AbortError") {
        setIsPlaying(false);
      }
    }
  }, []);

  const resolveSrc = useCallback(
    async (t: Track, fresh = false): Promise<string | null> => {
      const local = await getBlobUrl(t.id);
      if (local) return local;
      let tr = t;
      if (!tr.audio || fresh) {
        const got = await getSong(t.id, fresh ? 0 : undefined).catch(() => null);
        if (got) tr = got;
      }
      return pickAudio(tr, settingsRef.current.quality) ?? null;
    },
    [getBlobUrl],
  );

  /* ───── load the current track whenever it changes ───── */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!current) {
      a.removeAttribute("src");
      return;
    }
    let cancelled = false;
    switchingRef.current = true;
    retryRef.current = null;
    loggedRef.current = false;
    setLoading(true);
    setTime(0);
    setDuration(current.duration || 0);
    (async () => {
      const src = await resolveSrc(current);
      if (cancelled) return;
      if (!src) {
        switchingRef.current = false;
        setLoading(false);
        setIsPlaying(false);
        toast(onlineRef.current ? "Couldn't load this song" : "You're offline — play a downloaded song instead");
        return;
      }
      a.src = src;
      a.load();
      if (wantPlayRef.current) {
        await tryPlay();
      }
      if (!cancelled) {
        switchingRef.current = false;
        setSeekTick((n) => n + 1);
      }
    })();
    if (wantPlayRef.current) pushRecent(current);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, loadNonce]);

  /* ───── audio element events ───── */
  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setTime(a.currentTime);
    const c = currentRef.current;
    if (!loggedRef.current && a.currentTime > 20 && meRef.current && c) {
      loggedRef.current = true;
      api("/api/presence", { method: "POST", body: { track: stripTrack(c), isPlaying: true, logPlay: true } }).catch(() => {});
    }
  };

  const goTo = useCallback((i: number) => {
    wantPlayRef.current = true;
    const same = queueRef.current[i]?.id === queueRef.current[indexRef.current]?.id;
    setIndex(i);
    setIsPlaying(true);
    if (same) setLoadNonce((n) => n + 1);
  }, []);

  const autoplayMore = useCallback(async () => {
    if (moreBusy.current) return;
    moreBusy.current = true;
    try {
      const cur = queueRef.current[indexRef.current];
      if (!cur) return;
      const have = new Set(queueRef.current.map((t) => t.id));
      const seed = cur.artists.split(",")[0]?.trim() || cur.name;
      let more = (await searchSongs(seed, 25)).filter((t) => !have.has(t.id)).slice(0, 15);
      if (!more.length) {
        more = (await searchSongs(`${settingsRef.current.language} hits`, 25)).filter((t) => !have.has(t.id)).slice(0, 15);
      }
      if (!more.length) {
        setIsPlaying(false);
        return;
      }
      const start = queueRef.current.length;
      origRef.current = [...origRef.current, ...more];
      setQueue((q) => [...q, ...more]);
      wantPlayRef.current = true;
      setIndex(start);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      moreBusy.current = false;
    }
  }, []);

  const next = useCallback(() => {
    if (!guard()) return;
    const q = queueRef.current;
    const i = indexRef.current;
    if (!q.length) return;
    if (i < q.length - 1) goTo(i + 1);
    else if (repeatRef.current === "all") goTo(0);
    else void autoplayMore();
  }, [guard, goTo, autoplayMore]);

  const handleEnded = () => {
    const r = roomRef.current;
    if (r && !r.isHost) return;
    const a = audioRef.current;
    if (repeatRef.current === "one" && a) {
      a.currentTime = 0;
      void tryPlay();
      return;
    }
    next();
  };

  const prev = useCallback(() => {
    if (!guard()) return;
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      setSeekTick((n) => n + 1);
      return;
    }
    const i = indexRef.current;
    if (i > 0) goTo(i - 1);
    else if (a) {
      a.currentTime = 0;
      setSeekTick((n) => n + 1);
    }
  }, [guard, goTo]);

  const handleError = async () => {
    const c = currentRef.current;
    const a = audioRef.current;
    if (!c || !a || switchingRef.current) return;
    if (a.src.startsWith("blob:")) return;
    if (retryRef.current !== c.id) {
      retryRef.current = c.id;
      const src = await resolveSrc(c, true);
      if (src && currentRef.current?.id === c.id) {
        const pos = a.currentTime;
        a.src = src;
        a.load();
        if (pos > 0) seekOnLoadRef.current = pos;
        if (wantPlayRef.current) await tryPlay();
        return;
      }
    }
    setIsPlaying(false);
    setLoading(false);
    toast(onlineRef.current ? "This song can't be played right now" : "You're offline");
  };

  /* ───── transport actions ───── */
  const play = useCallback(
    (track: Track, list?: Track[], src?: string) => {
      if (!guard()) return;
      let q = list && list.length ? list : [track];
      if (!q.some((t) => t.id === track.id)) q = [track, ...q];
      origRef.current = q;
      let idx = q.findIndex((t) => t.id === track.id);
      if (shuffleRef.current) {
        const rest = q.filter((_, i) => i !== idx);
        q = [q[idx], ...shuffleArr(rest)];
        idx = 0;
      }
      const same = queueRef.current[indexRef.current]?.id === track.id;
      wantPlayRef.current = true;
      setQueue(q);
      setIndex(idx);
      setSource(src ?? "");
      setIsPlaying(true);
      if (same) {
        const a = audioRef.current;
        if (a && a.paused) {
          if (a.src) void tryPlay();
          else setLoadNonce((n) => n + 1);
        }
      }
    },
    [guard, tryPlay],
  );

  const playList = useCallback(
    (tracks: Track[], start = 0, src?: string) => {
      if (!tracks.length) return;
      play(tracks[Math.min(start, tracks.length - 1)], tracks, src);
    },
    [play],
  );

  const playShuffled = useCallback(
    (tracks: Track[], src?: string) => {
      if (!tracks.length || !guard()) return;
      shuffleRef.current = true;
      setShuffle(true);
      play(tracks[Math.floor(Math.random() * tracks.length)], tracks, src);
    },
    [play, guard],
  );

  const toggle = useCallback(() => {
    if (!guard()) return;
    const a = audioRef.current;
    if (!a || !currentRef.current) return;
    if (a.paused) {
      wantPlayRef.current = true;
      setIsPlaying(true);
      if (a.src) void tryPlay();
      else setLoadNonce((n) => n + 1);
    } else {
      wantPlayRef.current = false;
      a.pause();
      setIsPlaying(false);
    }
  }, [guard, tryPlay]);

  const seek = useCallback(
    (sec: number) => {
      if (!guard()) return;
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = Math.max(0, sec);
      setTime(a.currentTime);
      setSeekTick((n) => n + 1);
    },
    [guard],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    setMuted(v === 0);
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const toggleShuffle = useCallback(() => {
    if (!guard()) return;
    const q = queueRef.current;
    const cur = q[indexRef.current];
    if (!shuffleRef.current) {
      if (cur) {
        const upcoming = shuffleArr(q.slice(indexRef.current + 1));
        origRef.current = q;
        setQueue([...q.slice(0, indexRef.current + 1), ...upcoming]);
      }
      setShuffle(true);
    } else {
      const orig = origRef.current;
      const pos = cur ? orig.findIndex((t) => t.id === cur.id) : -1;
      if (pos >= 0) {
        setQueue(orig);
        setIndex(pos);
      }
      setShuffle(false);
    }
  }, [guard]);

  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);

  const enqueue = useCallback(
    (t: Track) => {
      if (!guard()) return;
      if (!queueRef.current.length) return play(t, [t]);
      origRef.current = [...origRef.current, t];
      setQueue((q) => [...q, t]);
      toast("Added to queue");
    },
    [guard, play, toast],
  );

  const playNext = useCallback(
    (t: Track) => {
      if (!guard()) return;
      if (!queueRef.current.length) return play(t, [t]);
      setQueue((q) => {
        const n = [...q];
        n.splice(indexRef.current + 1, 0, t);
        return n;
      });
      toast("Playing next");
    },
    [guard, play, toast],
  );

  const removeAt = useCallback(
    (i: number) => {
      if (!guard() || i === indexRef.current) return;
      setQueue((q) => q.filter((_, k) => k !== i));
      if (i < indexRef.current) setIndex((x) => x - 1);
    },
    [guard],
  );

  const jumpTo = useCallback(
    (i: number) => {
      if (!guard()) return;
      goTo(i);
    },
    [guard, goTo],
  );

  const clearUpcoming = useCallback(() => {
    if (!guard()) return;
    setQueue((q) => q.slice(0, indexRef.current + 1));
  }, [guard]);

  const resumeBlocked = useCallback(() => {
    wantPlayRef.current = true;
    void tryPlay();
  }, [tryPlay]);

  /* ───── volume ───── */
  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.volume = volume;
      a.muted = muted;
    }
  }, [volume, muted]);

  /* ───── persist / restore session ───── */
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("swaram:player") ?? "null") as {
        queue: Track[];
        index: number;
        volume: number;
        shuffle: boolean;
        repeat: Repeat;
      } | null;
      if (raw) {
        if (raw.queue?.length) {
          setQueue(raw.queue);
          origRef.current = raw.queue;
          setIndex(Math.min(raw.index ?? 0, raw.queue.length - 1));
        }
        if (typeof raw.volume === "number") setVolumeState(raw.volume);
        if (raw.shuffle) setShuffle(true);
        if (raw.repeat) setRepeat(raw.repeat);
      }
    } catch {
      /* ignore */
    }
    restoredRef.current = true;
  }, []);
  useEffect(() => {
    if (!restoredRef.current) return;
    if (roomRef.current && !roomRef.current.isHost) return;
    try {
      const slim = queue.slice(0, 150).map((t) => {
        const { audio: _a, ...rest } = t;
        void _a;
        return rest;
      });
      localStorage.setItem("swaram:player", JSON.stringify({ queue: slim, index, volume, shuffle, repeat }));
    } catch {
      /* ignore */
    }
  }, [queue, index, volume, shuffle, repeat]);

  /* ───── Media Session (lock-screen / media keys) ───── */
  const fnsRef = useRef({ toggle, next, prev, seek });
  fnsRef.current = { toggle, next, prev, seek };
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!current) {
      ms.metadata = null;
      return;
    }
    try {
      ms.metadata = new MediaMetadata({
        title: current.name,
        artist: current.artists,
        album: current.album,
        artwork: current.image ? [{ src: current.image, sizes: "500x500", type: "image/jpeg" }] : [],
      });
    } catch {
      /* ignore */
    }
  }, [current]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* unsupported action */
      }
    };
    set("play", () => {
      if (audioRef.current?.paused) fnsRef.current.toggle();
    });
    set("pause", () => {
      if (!audioRef.current?.paused) fnsRef.current.toggle();
    });
    set("previoustrack", () => fnsRef.current.prev());
    set("nexttrack", () => fnsRef.current.next());
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") fnsRef.current.seek(d.seekTime);
    });
    set("seekbackward", () => fnsRef.current.seek((audioRef.current?.currentTime ?? 0) - 10));
    set("seekforward", () => fnsRef.current.seek((audioRef.current?.currentTime ?? 0) + 10));
  }, []);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = current ? (isPlaying ? "playing" : "paused") : "none";
  }, [isPlaying, current]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !duration || !isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({ duration, position: Math.min(time, duration), playbackRate: 1 });
    } catch {
      /* ignore */
    }
  }, [Math.floor(time / 5), duration]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── presence: friend activity ───── */
  useEffect(() => {
    if (!me || !current) return;
    const t = setTimeout(() => {
      api("/api/presence", { method: "POST", body: { track: stripTrack(current), isPlaying } }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, isPlaying, me?.id]);
  useEffect(() => {
    if (!me || !isPlaying) return;
    const t = setInterval(() => {
      const c = currentRef.current;
      if (c) api("/api/presence", { method: "POST", body: { track: stripTrack(c), isPlaying: true } }).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [me, isPlaying]);

  /* ───── Listening Together ───── */
  const pushRoom = useCallback(async () => {
    const r = roomRef.current;
    const a = audioRef.current;
    if (!r || !r.isHost || !a) return;
    const c = currentRef.current;
    try {
      await api(`/api/rooms/${r.code}`, {
        method: "POST",
        body: {
          track: c ? stripTrack(c) : null,
          position: switchingRef.current ? 0 : a.currentTime,
          isPlaying: playingRef.current,
        },
      });
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    if (!room?.isHost) return;
    void pushRoom();
  }, [room?.code, room?.isHost, current?.id, isPlaying, seekTick, pushRoom]);
  useEffect(() => {
    if (!room?.isHost) return;
    const t = setInterval(() => void pushRoom(), 5000);
    return () => clearInterval(t);
  }, [room?.code, room?.isHost, pushRoom]);

  const applyRemote = useCallback(
    (s: RoomPayload) => {
      const a = audioRef.current;
      if (!a || !s.track) return;
      const elapsed = s.isPlaying ? Math.max(0, (s.serverNow - s.updatedAt) / 1000) : 0;
      const expected = s.position + elapsed;
      const cur = queueRef.current[indexRef.current];
      if (!cur || cur.id !== s.track.id) {
        wantPlayRef.current = s.isPlaying;
        seekOnLoadRef.current = expected;
        origRef.current = [s.track];
        setQueue([s.track]);
        setIndex(0);
        setSource("Listening Together");
        setIsPlaying(s.isPlaying);
        return;
      }
      if (a.readyState > 0 && Math.abs(a.currentTime - expected) > 2.5) {
        a.currentTime = expected;
      }
      if (s.isPlaying && a.paused) {
        wantPlayRef.current = true;
        setIsPlaying(true);
        void tryPlay();
      } else if (!s.isPlaying && !a.paused) {
        wantPlayRef.current = false;
        a.pause();
        setIsPlaying(false);
      }
    },
    [tryPlay],
  );

  const endRoomLocal = useCallback(() => {
    setRoom(null);
    roomRef.current = null;
    try {
      localStorage.removeItem("swaram:room");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!room) return;
    let stop = false;
    const tick = async () => {
      const r = roomRef.current;
      if (!r || stop) return;
      try {
        const s = await api<RoomPayload>(`/api/rooms/${r.code}${r.isHost ? "" : "?join=1"}`);
        if (stop) return;
        setRoom((cur) => (cur ? { ...cur, host: s.host, members: s.members } : cur));
        if (!r.isHost) applyRemote(s);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/not found|ended/i.test(msg)) {
          toast("The listening session has ended");
          endRoomLocal();
        }
      }
    };
    const t = setInterval(() => void tick(), 2200);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [room?.code, room?.isHost, applyRemote, endRoomLocal, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const createRoom = useCallback(async () => {
    const m = meRef.current;
    if (!m) {
      toast("Your profile isn't ready yet");
      return null;
    }
    if (roomRef.current) return roomRef.current.code;
    const a = audioRef.current;
    const c = currentRef.current;
    try {
      const r = await api<{ code: string }>("/api/rooms", {
        method: "POST",
        body: { track: c ? stripTrack(c) : null, position: a?.currentTime ?? 0, isPlaying: playingRef.current },
      });
      const info: RoomInfo = { code: r.code, isHost: true, hostId: m.id, host: m, members: [m] };
      roomRef.current = info;
      setRoom(info);
      try {
        localStorage.setItem("swaram:room", r.code);
      } catch {
        /* ignore */
      }
      return r.code;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't start a session");
      return null;
    }
  }, [toast]);

  const joinRoom = useCallback(
    async (code: string, silent = false) => {
      const m = meRef.current;
      if (!m) {
        if (!silent) toast("Your profile isn't ready yet");
        return false;
      }
      try {
        const s = await api<RoomPayload>(`/api/rooms/${code.toUpperCase()}?join=1`);
        const isHost = s.hostId === m.id;
        const info: RoomInfo = { code: s.code, isHost, hostId: s.hostId, host: s.host, members: s.members };
        roomRef.current = info;
        setRoom(info);
        try {
          localStorage.setItem("swaram:room", s.code);
        } catch {
          /* ignore */
        }
        if (!isHost) applyRemote(s);
        return true;
      } catch (e) {
        if (!silent) toast(e instanceof Error ? e.message : "Couldn't join that session");
        try {
          localStorage.removeItem("swaram:room");
        } catch {
          /* ignore */
        }
        return false;
      }
    },
    [applyRemote, toast],
  );

  const leaveRoom = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    endRoomLocal();
    if (!r.isHost) {
      wantPlayRef.current = false;
      audioRef.current?.pause();
      setIsPlaying(false);
    }
    try {
      await api(`/api/rooms/${r.code}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
    toast(r.isHost ? "Listening session ended" : "You left the session");
  }, [endRoomLocal, toast]);

  // rejoin a session after a reload
  const rejoined = useRef(false);
  useEffect(() => {
    if (!me || rejoined.current) return;
    rejoined.current = true;
    try {
      const code = localStorage.getItem("swaram:room");
      if (code) void joinRoom(code, true);
    } catch {
      /* ignore */
    }
  }, [me, joinRoom]);

  /* ───── context values ───── */
  const value = useMemo<PlayerValue>(
    () => ({
      queue,
      index,
      current,
      isPlaying,
      loading,
      volume,
      muted,
      shuffle,
      repeat,
      source,
      room,
      needsTap,
      play,
      playList,
      playShuffled,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      playNext,
      removeAt,
      jumpTo,
      clearUpcoming,
      createRoom,
      joinRoom: (c: string) => joinRoom(c),
      leaveRoom,
      resumeBlocked,
    }),
    [
      queue,
      index,
      current,
      isPlaying,
      loading,
      volume,
      muted,
      shuffle,
      repeat,
      source,
      room,
      needsTap,
      play,
      playList,
      playShuffled,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      playNext,
      removeAt,
      jumpTo,
      clearUpcoming,
      createRoom,
      joinRoom,
      leaveRoom,
      resumeBlocked,
    ],
  );
  const timeValue = useMemo(() => ({ time, duration }), [time, duration]);

  return (
    <PlayerCtx.Provider value={value}>
      <TimeCtx.Provider value={timeValue}>
        {children}
        <audio
          ref={audioRef}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={(e) => {
            const d = e.currentTarget.duration;
            if (isFinite(d) && d > 0) setDuration(d);
          }}
          onLoadedMetadata={(e) => {
            if (seekOnLoadRef.current != null) {
              const t = seekOnLoadRef.current;
              seekOnLoadRef.current = null;
              const d = e.currentTarget.duration;
              if (!isFinite(d) || t < d - 1) e.currentTarget.currentTime = Math.max(0, t);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={(e) => {
            if (switchingRef.current || e.currentTarget.ended) return;
            setIsPlaying(false);
          }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => {
            setLoading(false);
            setNeedsTap(false);
          }}
          onCanPlay={() => setLoading(false)}
          onEnded={handleEnded}
          onError={() => void handleError()}
        />
      </TimeCtx.Provider>
    </PlayerCtx.Provider>
  );
}
