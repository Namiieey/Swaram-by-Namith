import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { roomMembers, rooms, users } from "@/db/schema";
import { getUid, json, sanitizeTrack, toPublic, toTrack } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

// Poll the session state. Passing ?join=1 registers the caller as a listener.
export async function GET(req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  const uid = getUid(req);
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  const room = rows[0];
  if (!room) return json({ error: "Session not found or ended" }, 404);

  if (uid) {
    const me = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (me[0] && (new URL(req.url).searchParams.get("join") === "1" || uid === room.hostId)) {
      await db
        .insert(roomMembers)
        .values({ code, userId: uid, lastSeen: new Date() })
        .onConflictDoUpdate({ target: [roomMembers.code, roomMembers.userId], set: { lastSeen: new Date() } });
    } else if (me[0]) {
      await db
        .update(roomMembers)
        .set({ lastSeen: new Date() })
        .where(and(eq(roomMembers.code, code), eq(roomMembers.userId, uid)));
    }
  }

  const since = new Date(Date.now() - 25_000);
  const members = await db
    .select()
    .from(roomMembers)
    .where(and(eq(roomMembers.code, code), gt(roomMembers.lastSeen, since)));
  const ids = [...new Set([room.hostId, ...members.map((m) => m.userId)])];
  const people = await db.select().from(users).where(inArray(users.id, ids));
  const map = new Map(people.map((p) => [p.id, toPublic(p)]));

  return json({
    code,
    host: map.get(room.hostId) ?? null,
    hostId: room.hostId,
    track: toTrack(room.track),
    position: room.position,
    isPlaying: room.isPlaying,
    version: room.version,
    updatedAt: room.updatedAt.getTime(),
    serverNow: Date.now(),
    members: members.map((m) => map.get(m.userId)).filter(Boolean),
  });
}

// Host pushes playback state.
export async function POST(req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  const room = rows[0];
  if (!room) return json({ error: "Session not found" }, 404);
  if (room.hostId !== uid) return json({ error: "Only the host controls playback" }, 403);
  const body = (await req.json().catch(() => ({}))) as { track?: unknown; position?: number; isPlaying?: boolean };
  const track = body.track === null ? null : (sanitizeTrack(body.track) ?? room.track);
  await db
    .update(rooms)
    .set({
      track,
      position: typeof body.position === "number" && isFinite(body.position) ? Math.max(0, body.position) : room.position,
      isPlaying: !!body.isPlaying,
      version: room.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, code));
  await db
    .insert(roomMembers)
    .values({ code, userId: uid, lastSeen: new Date() })
    .onConflictDoUpdate({ target: [roomMembers.code, roomMembers.userId], set: { lastSeen: new Date() } });
  return json({ ok: true });
}

// Host ends the session; guests just leave.
export async function DELETE(req: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!rows[0]) return json({ ok: true });
  if (rows[0].hostId === uid) {
    await db.delete(roomMembers).where(eq(roomMembers.code, code));
    await db.delete(rooms).where(eq(rooms.code, code));
  } else {
    await db.delete(roomMembers).where(and(eq(roomMembers.code, code), eq(roomMembers.userId, uid)));
  }
  return json({ ok: true });
}
