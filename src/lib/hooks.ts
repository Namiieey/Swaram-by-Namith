"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDownloadMeta } from "./idb";
import type { LyricsResult, Track } from "./types";
import { hashHue, proxyImg } from "./utils";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

const accentCache = new Map<string, string>();

/** Dominant colour of the artwork as "r g b" (used by the ambient liquid-glass background). */
export function useAccent(image: string | undefined, seed: string | undefined): string {
  const fallback = (() => {
    const [r, g, b] = hslToRgb(hashHue(seed ?? image ?? "swaram"), 60, 45);
    return `${r} ${g} ${b}`;
  })();
  const [rgb, setRgb] = useState<string>(() => (image && accentCache.get(image)) || fallback);
  useEffect(() => {
    if (!image) {
      setRgb("30 215 96");
      return;
    }
    const cached = accentCache.get(image);
    if (cached) {
      setRgb(cached);
      return;
    }
    setRgb(fallback);
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 24, 24);
        const px = ctx.getImageData(0, 0, 24, 24).data;
        let r = 0,
          g = 0,
          b = 0,
          w = 0;
        for (let i = 0; i < px.length; i += 4) {
          const max = Math.max(px[i], px[i + 1], px[i + 2]);
          const min = Math.min(px[i], px[i + 1], px[i + 2]);
          const sat = max === 0 ? 0 : (max - min) / max;
          const weight = 0.15 + sat * sat * 3 + (max > 40 ? 0.2 : 0);
          r += px[i] * weight;
          g += px[i + 1] * weight;
          b += px[i + 2] * weight;
          w += weight;
        }
        r /= w;
        g /= w;
        b /= w;
        const max = Math.max(r, g, b) || 1;
        const boost = max < 140 ? 140 / max : 1;
        const out = `${Math.min(255, Math.round(r * boost))} ${Math.min(255, Math.round(g * boost))} ${Math.min(255, Math.round(b * boost))}`;
        accentCache.set(image, out);
        if (!cancelled) setRgb(out);
      } catch {
        /* tainted canvas → keep fallback */
      }
    };
    img.src = proxyImg(image);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);
  return rgb;
}

const lyricsCache = new Map<string, LyricsResult>();

export function useLyrics(track: Track | null) {
  const [lyrics, setLyrics] = useState<LyricsResult>(null);
  const [loading, setLoading] = useState(false);
  const id = track?.id;
  useEffect(() => {
    if (!track) {
      setLyrics(null);
      return;
    }
    if (lyricsCache.has(track.id)) {
      setLyrics(lyricsCache.get(track.id) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLyrics(null);
    setLoading(true);
    (async () => {
      let result: LyricsResult = null;
      try {
        const meta = await getDownloadMeta(track.id);
        if (meta?.lyrics) result = meta.lyrics;
      } catch {
        /* ignore */
      }
      if (!result) {
        try {
          const qs = new URLSearchParams({
            title: track.name,
            artist: track.artists,
            album: track.album,
            duration: String(track.duration),
          });
          const res = await fetch(`/api/lyrics?${qs.toString()}`);
          if (res.ok) result = ((await res.json()) as { lyrics: LyricsResult }).lyrics;
          if (result) lyricsCache.set(track.id, result);
          else if (res.ok) lyricsCache.set(track.id, null);
        } catch {
          /* offline */
        }
      }
      if (!cancelled) {
        setLyrics(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return { lyrics, loading };
}
