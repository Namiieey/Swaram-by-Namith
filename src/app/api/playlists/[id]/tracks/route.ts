import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlistMembers, playlistTracks, playlists } from "@/db/schema";
import { getViewer, json, sanitizeTrack } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const viewer = await getViewer(req);
  if (!viewer) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  const pl = rows[0];
  if (!pl) return json({ error: "Playlist not found" }, 404);

  const isOwner = pl.ownerId === viewer.id;
  if (!isOwner) {
    const m = await db
      .select()
      .from(playlistMembers)
      .where(and(eq(playlistMembers.playlistId, id), eq(playlistMembers.userId, viewer.id)))
      .limit(1);
    if (!m[0]) {
      if (!pl.isCollaborative) return json({ error: "You can't edit this playlist" }, 403);
      await db.insert(playlistMembers).values({ playlistId: id, userId: viewer.id }).onConflictDoNothing();
    }
  }

  const body = (await req.json().catch(() => ({}))) as { track?: unknown };
  const track = sanitizeTrack(body.track);
  if (!track) return json({ error: "Invalid track" }, 400);
  const inserted = await db
    .insert(playlistTracks)
    .values({ playlistId: id, songId: track.id, track, addedBy: viewer.id })
    .onConflictDoNothing()
    .returning();
  await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, id));
  return json({ ok: true, added: inserted.length > 0 });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const viewer = await getViewer(req);
  if (!viewer) return json({ error: "Unauthorized" }, 401);
  const songId = new URL(req.url).searchParams.get("songId");
  if (!songId) return json({ error: "songId required" }, 400);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  const pl = rows[0];
  if (!pl) return json({ error: "Not found" }, 404);
  const existing = await db
    .select()
    .from(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.songId, songId)))
    .limit(1);
  if (!existing[0]) return json({ ok: true });
  if (pl.ownerId !== viewer.id && existing[0].addedBy !== viewer.id) {
    return json({ error: "Only the owner or the person who added a song can remove it" }, 403);
  }
  await db.delete(playlistTracks).where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.songId, songId)));
  return json({ ok: true });
}
