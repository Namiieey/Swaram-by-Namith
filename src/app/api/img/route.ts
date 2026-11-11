import { ALLOWED_MEDIA_HOST } from "@/lib/server";

export const dynamic = "force-dynamic";

// Same-origin image proxy so we can read pixels (accent colours, share cards) without CORS taint.
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("url");
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
  try {
    const upstream = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 Swaram" } });
    if (!upstream.ok) return new Response("Upstream error", { status: 502 });
    return new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Fetch failed", { status: 502 });
  }
}
