import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, playlistTracks, playlists, plays, users } from "@/db/schema";
import { getUid, json, toPublic } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { username } = await ctx.params;
  const rows = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  const u = rows[0];
  if (!u) return json({ error: "Profile not found" }, 404);
  const viewerId = getUid(req);
  const isMe = viewerId === u.id;

  const [followers, following, followState, recent, pls] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followeeId, u.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followerId, u.id)),
    viewerId
      ? db
          .select()
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followeeId, u.id)))
          .limit(1)
      : Promise.resolve([]),
    db.select().from(plays).where(eq(plays.userId, u.id)).orderBy(desc(plays.playedAt)).limit(400),
    db
      .select()
      .from(playlists)
      .where(isMePlaylists(u.id, isMe))
      .orderBy(desc(playlists.updatedAt))
      .limit(24),
  ]);

  // stats from listening history
  const artistCount = new Map<string, { name: string; id?: string; image: string; n: number }>();
  const trackCount = new Map<string, { track: (typeof recent)[number]["track"]; n: number }>();
  const langCount = new Map<string, number>();
  for (const p of recent) {
    const first = p.track.artists.split(",")[0].trim();
    if (first) {
      const a = artistCount.get(first) ?? { name: first, id: p.track.artistId, image: p.track.image, n: 0 };
      a.n++;
      artistCount.set(first, a);
    }
    const t = trackCount.get(p.songId) ?? { track: p.track, n: 0 };
    t.n++;
    trackCount.set(p.songId, t);
    if (p.track.language) langCount.set(p.track.language, (langCount.get(p.track.language) ?? 0) + 1);
  }
  const totalLang = [...langCount.values()].reduce((a, b) => a + b, 0) || 1;

  const plIds = pls.map((p) => p.id);
  const tracksForCovers = plIds.length
    ? await db.select().from(playlistTracks).where(inArray(playlistTracks.playlistId, plIds)).orderBy(playlistTracks.id)
    : [];

  const showNow = u.showActivity || isMe;
  const fresh = u.nowPlayingAt ? Date.now() - u.nowPlayingAt.getTime() < 4 * 60_000 : false;

  return json({
    user: { ...toPublic(u), showActivity: u.showActivity, createdAt: u.createdAt.toISOString() },
    isMe,
    isFollowing: followState.length > 0,
    followers: followers[0]?.n ?? 0,
    following: following[0]?.n ?? 0,
    totalPlays: recent.length,
    nowPlaying: showNow && u.nowPlaying ? { track: u.nowPlaying, isPlaying: u.isPlaying && fresh, at: u.nowPlayingAt?.toISOString() ?? null } : null,
    topArtists: [...artistCount.values()].sort((a, b) => b.n - a.n).slice(0, 8),
    topTracks: [...trackCount.values()].sort((a, b) => b.n - a.n).slice(0, 8),
    recent: dedupe(recent.map((r) => r.track)).slice(0, 12),
    languages: [...langCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, n]) => ({ language, pct: Math.round((n / totalLang) * 100) })),
    playlists: pls.map((p) => {
      const tr = tracksForCovers.filter((t) => t.playlistId === p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        isPublic: p.isPublic,
        isCollaborative: p.isCollaborative,
        ownerId: p.ownerId,
        owner: null,
        trackCount: tr.length,
        covers: tr.slice(0, 4).map((t) => t.track.image),
      };
    }),
  });
}

function isMePlaylists(userId: string, isMe: boolean) {
  return isMe
    ? eq(playlists.ownerId, userId)
    : and(eq(playlists.ownerId, userId), or(eq(playlists.isPublic, true)));
}

function dedupe<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { username } = await ctx.params;
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  const u = rows[0];
  if (!u || u.id !== uid) return json({ error: "Forbidden" }, 403);

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    displayName?: string;
    bio?: string;
    accent?: string;
    avatarUrl?: string | null;
    showActivity?: boolean;
  };
  const patch: Partial<typeof users.$inferInsert> = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) patch.displayName = body.displayName.trim().slice(0, 50);
  if (typeof body.bio === "string") patch.bio = body.bio.slice(0, 160);
  if (typeof body.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accent)) patch.accent = body.accent;
  if (body.avatarUrl === null || typeof body.avatarUrl === "string") {
    patch.avatarUrl = body.avatarUrl ? body.avatarUrl.slice(0, 500) : null;
  }
  if (typeof body.showActivity === "boolean") patch.showActivity = body.showActivity;
  if (typeof body.username === "string" && body.username.toLowerCase() !== u.username) {
    const next = body.username.toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(next)) return json({ error: "Username must be 3–24 letters, numbers or _" }, 400);
    const taken = await db.select().from(users).where(eq(users.username, next)).limit(1);
    if (taken[0]) return json({ error: "That username is taken" }, 409);
    patch.username = next;
  }
  if (!Object.keys(patch).length) return json({ user: { ...toPublic(u), showActivity: u.showActivity } });
  const upd = await db.update(users).set(patch).where(eq(users.id, uid)).returning();
  return json({ user: { ...toPublic(upd[0]), showActivity: upd[0].showActivity } });
}
