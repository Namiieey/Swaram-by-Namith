import { NextResponse } from "next/server";
import { saavnUpstream } from "@/lib/server-saavn";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["search", "songs", "albums", "playlists", "artists"]);
const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path?.length || !ALLOWED.has(path[0])) {
    return NextResponse.json({ success: false, message: "Not allowed" }, { status: 400 });
  }
  const search = new URL(req.url).search;
  const body = await saavnUpstream(path, search);
  if (!body) return NextResponse.json({ success: false, message: "Music service unavailable" }, { status: 502 });
  return NextResponse.json(body, { headers: { "Cache-Control": CACHE } });
}
