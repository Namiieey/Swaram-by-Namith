import { ALLOWED_MEDIA_HOST } from "@/lib/server";

export const dynamic = "force-dynamic";

// Streams audio from the JioSaavn CDN (used for offline downloads, supports Range requests).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (u.protocol !== "https:" || !ALLOWED_MEDIA_HOST.test(u.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }
  const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 Swaram" };
  const range = req.headers.get("range");
  if (range) headers.Range = range;
  try {
    const upstream = await fetch(u, { headers, cache: "no-store" });
    if (!upstream.ok && upstream.status !== 206) return new Response("Upstream error", { status: 502 });
    const out = new Headers();
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    if (!out.has("content-type")) out.set("content-type", "audio/mp4");
    out.set("cache-control", "public, max-age=86400");
    const name = searchParams.get("name");
    if (name) {
      const safe = name.replace(/[^\w\s.-]/g, "").trim() || "song";
      out.set("content-disposition", `attachment; filename="${safe}.m4a"`);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
