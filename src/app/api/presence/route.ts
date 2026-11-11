import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plays, users } from "@/db/schema";
import { getViewer, json, sanitizeTrack } from "@/lib/server";

export const dynamic = "force-dynamic";

// Updates "now playing" for friend activity and records plays for the music profile.
export async function POST(req: Request) {
  const viewer = await getViewer(req);
  if (!viewer) return json({ ok: false }, 401);
  const body = (await req.json().catch(() => ({}))) as { track?: unknown; isPlaying?: boolean; logPlay?: boolean };
  const track = sanitizeTrack(body.track);

  await db
    .update(users)
    .set({ nowPlaying: track, isPlaying: !!body.isPlaying && !!track, nowPlayingAt: new Date() })
    .where(eq(users.id, viewer.id));

  if (body.logPlay && track) {
    const last = await db
      .select()
      .from(plays)
      .where(and(eq(plays.userId, viewer.id), eq(plays.songId, track.id)))
      .orderBy(desc(plays.playedAt))
      .limit(1);
    if (!last[0] || Date.now() - last[0].playedAt.getTime() > 45_000) {
      await db.insert(plays).values({ userId: viewer.id, songId: track.id, track });
    }
  }
  return json({ ok: true });
}
