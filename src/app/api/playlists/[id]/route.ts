import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { playlistMembers, playlistTracks, playlists, users } from "@/db/schema";
import { getUid, json, toPublic, toTrack } from "@/lib/server";
import { summarize } from "@/lib/server-playlists";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = getUid(req);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  const pl = rows[0];
  if (!pl) return json({ error: "Playlist not found" }, 404);

  const members = await db.select().from(playlistMembers).where(eq(playlistMembers.playlistId, id));
  const isOwner = uid === pl.ownerId;
  const isMember = !!uid && members.some((m) => m.userId === uid);
  if (!pl.isPublic && !pl.isCollaborative && !isOwner && !isMember) {
    return json({ error: "This playlist is private" }, 403);
  }

  const tracks = await db.select().from(playlistTracks).where(eq(playlistTracks.playlistId, id)).orderBy(playlistTracks.id);
  const userIds = [...new Set([pl.ownerId, ...members.map((m) => m.userId), ...tracks.map((t) => t.addedBy)])];
  const people = await db.select().from(users).where(inArray(users.id, userIds));
  const map = new Map(people.map((p) => [p.id, toPublic(p)]));
  const summary = (await summarize([pl], uid, new Set(isMember ? [id] : [])))[0];

  return json({
    playlist: summary,
    owner: map.get(pl.ownerId) ?? null,
    collaborators: members.map((m) => map.get(m.userId)).filter(Boolean),
    canEdit: isOwner || isMember,
    isOwner,
    isMember,
    tracks: tracks.map((t) => ({
      track: toTrack(t.track),
      addedBy: map.get(t.addedBy) ?? null,
      addedAt: t.addedAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!rows[0] || rows[0].ownerId !== uid) return json({ error: "Forbidden" }, 403);
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    isPublic?: boolean;
    isCollaborative?: boolean;
  };
  const patch: Partial<typeof playlists.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body.description === "string") patch.description = body.description.slice(0, 300);
  if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;
  if (typeof body.isCollaborative === "boolean") patch.isCollaborative = body.isCollaborative;
  await db.update(playlists).set(patch).where(eq(playlists.id, id));
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!rows[0]) return json({ ok: true });
  if (rows[0].ownerId !== uid) {
    // collaborators can leave
    await db.delete(playlistMembers).where(and(eq(playlistMembers.playlistId, id), eq(playlistMembers.userId, uid)));
    return json({ ok: true, left: true });
  }
  await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));
  await db.delete(playlistMembers).where(eq(playlistMembers.playlistId, id));
  await db.delete(playlists).where(eq(playlists.id, id));
  return json({ ok: true });
}
