import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { getUid, json, toPublic, toTrack } from "@/lib/server";

export const dynamic = "force-dynamic";

// Friend activity: what the people you follow are listening to.
export async function GET(req: Request) {
  const uid = getUid(req);
  if (!uid) return json({ items: [] });
  const f = await db.select().from(follows).where(eq(follows.followerId, uid));
  if (!f.length) return json({ items: [] });
  const rows = await db
    .select()
    .from(users)
    .where(inArray(users.id, f.map((x) => x.followeeId)))
    .orderBy(desc(users.nowPlayingAt));
  const items = rows
    .filter((u) => u.showActivity && u.nowPlaying)
    .map((u) => ({
      user: toPublic(u),
      track: toTrack(u.nowPlaying),
      isPlaying: u.isPlaying && !!u.nowPlayingAt && Date.now() - u.nowPlayingAt.getTime() < 4 * 60_000,
      at: u.nowPlayingAt?.toISOString() ?? null,
    }));
  return json({ items, following: rows.length });
}
