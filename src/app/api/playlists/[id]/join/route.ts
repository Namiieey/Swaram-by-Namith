import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playlistMembers, playlists } from "@/db/schema";
import { getViewer, json } from "@/lib/server";

export const dynamic = "force-dynamic";

// Join a collaborative playlist via its invite link.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getViewer(req);
  if (!viewer) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  const pl = rows[0];
  if (!pl) return json({ error: "Playlist not found" }, 404);
  if (!pl.isCollaborative) return json({ error: "This playlist isn't collaborative" }, 403);
  if (pl.ownerId !== viewer.id) {
    await db.insert(playlistMembers).values({ playlistId: id, userId: viewer.id }).onConflictDoNothing();
  }
  return json({ ok: true });
}
