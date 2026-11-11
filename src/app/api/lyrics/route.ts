import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Open-source lyrics: LRCLIB (https://lrclib.net) — synced + plain lyrics.
const BASE = "https://lrclib.net/api";
const HEADERS = { "User-Agent": "Swaram/1.0 (https://namithrn.vercel.app)" };

type Hit = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

async function lr(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseLrc(lrc: string) {
  const lines: { t: number; text: string }[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/^((?:\[\d+:\d+(?:[.:]\d+)?\])+)\s*(.*)$/);
    if (!m) continue;
    const text = m[2].trim();
    for (const tag of m[1].matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)) {
      const frac = tag[3] ? Number(`0.${tag[3]}`) : 0;
      lines.push({ t: Number(tag[1]) * 60 + Number(tag[2]) + frac, text });
    }
  }
  return lines.sort((a, b) => a.t - b.t);
}

function clean(s: string) {
  return s
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s+-\s+.*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function respond(hit: Hit | null) {
  if (!hit || hit.instrumental || (!hit.syncedLyrics && !hit.plainLyrics)) {
    return NextResponse.json({ lyrics: null }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
  const synced = hit.syncedLyrics ? parseLrc(hit.syncedLyrics) : [];
  const plain = hit.plainLyrics ?? synced.map((l) => l.text).join("\n");
  return NextResponse.json(
    { lyrics: { synced, plain, source: "LRCLIB" } },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = (sp.get("title") ?? "").trim();
  const artist = (sp.get("artist") ?? "").split(",")[0].trim();
  const album = (sp.get("album") ?? "").trim();
  const duration = Number(sp.get("duration") ?? 0);
  if (!title) return NextResponse.json({ lyrics: null }, { status: 400 });
  const t = clean(title) || title;

  const exact = new URLSearchParams({ track_name: t, artist_name: artist });
  if (album) exact.set("album_name", clean(album) || album);
  if (duration) exact.set("duration", String(Math.round(duration)));
  const direct = (await lr(`/get?${exact.toString()}`)) as Hit | null;
  if (direct && (direct.syncedLyrics || direct.plainLyrics)) return respond(direct);

  const pick = (list: unknown): Hit | null => {
    if (!Array.isArray(list)) return null;
    const hits = (list as Hit[]).filter((h) => !h.instrumental && (h.syncedLyrics || h.plainLyrics));
    if (!hits.length) return null;
    const scored = hits
      .map((h) => ({
        h,
        score:
          (h.syncedLyrics ? 0 : 20) +
          (duration && h.duration ? Math.min(Math.abs(h.duration - duration), 60) : 30),
      }))
      .sort((a, b) => a.score - b.score);
    // only accept hits whose duration is plausible
    const best = scored[0].h;
    if (duration && best.duration && Math.abs(best.duration - duration) > 25) return null;
    return best;
  };

  const s1 = pick(await lr(`/search?${new URLSearchParams({ track_name: t, artist_name: artist }).toString()}`));
  if (s1) return respond(s1);
  const s2 = pick(await lr(`/search?${new URLSearchParams({ q: `${t} ${artist}`.trim() }).toString()}`));
  return respond(s2);
}
