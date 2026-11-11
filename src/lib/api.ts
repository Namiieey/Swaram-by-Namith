let currentUid: string | null = null;

export function setApiUid(id: string | null) {
  currentUid = id;
}
export function getApiUid() {
  return currentUid;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(currentUid ? { "x-user-id": currentUid } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// ---- tiny recently-played store (local, works offline) ----
import type { Track } from "./types";

const RECENT_KEY = "swaram:recent";

export function getRecent(): Track[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Track[];
  } catch {
    return [];
  }
}

export function pushRecent(t: Track) {
  try {
    const { audio: _audio, ...rest } = t;
    void _audio;
    const list = getRecent().filter((x) => x.id !== t.id);
    list.unshift(rest);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}
