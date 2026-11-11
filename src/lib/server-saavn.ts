/* eslint-disable @typescript-eslint/no-explicit-any */
import { nativeFetch } from "./server-native";
import { normalizeSong } from "./saavn";
import type { Track } from "./types";

// Unofficial JioSaavn API instances (open source: github.com/sumitkolhe/jiosaavn-api).
const BASES = [process.env.SAAVN_API_BASE, "https://saavn.sumit.co/api", "https://saavn.dev/api"].filter(
  (b): b is string => !!b,
);

const memory = new Map<string, { at: number; body: any }>();
const down = new Map<string, number>(); // circuit breaker: base -> retry-after timestamp
const TTL = 10 * 60_000;

/** Resolve a saavn.dev style request, trying hosted instances first, then JioSaavn directly. */
export async function saavnUpstream(path: string[], search: string): Promise<any | null> {
  const key = `${path.join("/")}${search}`;
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.body;

  const remember = (body: any) => {
    if (memory.size > 600) memory.clear();
    memory.set(key, { at: Date.now(), body });
    return body;
  };

  for (const base of BASES) {
    if ((down.get(base) ?? 0) > Date.now()) continue;
    try {
      const res = await fetch(`${base}/${path.map(encodeURIComponent).join("/")}${search}`, {
        signal: AbortSignal.timeout(7000),
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "Swaram/1.0" },
      });
      if (!res.ok) {
        down.set(base, Date.now() + (res.status === 429 ? 120_000 : 45_000));
        continue;
      }
      const body = await res.json();
      if (!body || body.success === false || body.status === "FAILED") {
        down.set(base, Date.now() + 30_000);
        continue;
      }
      return remember(body);
    } catch {
      down.set(base, Date.now() + 45_000);
    }
  }

  const native = await nativeFetch(path, new URLSearchParams(search));
  if (native) return remember(native);
  return hit?.body ?? null; // stale data beats an error page
}

export async function fetchSongServer(id: string): Promise<Track | null> {
  if (!/^[\w-]{3,20}$/.test(id)) return null;
  const body = await saavnUpstream(["songs"], `?ids=${encodeURIComponent(id)}`);
  const first = body?.data?.[0];
  return first ? normalizeSong(first) : null;
}
