import { desc, eq, ilike, inArray, ne, or, and } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { getUid, getViewer, json, slugUsername, toPublic } from "@/lib/server";

export const dynamic = "force-dynamic";

// Create (or fetch) a music profile. Called on first launch and after Firebase sign-in.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    sync?: boolean;
  } | null;
  const id = body?.id;
  if (!id || id.length < 6 || id.length > 128) return json({ error: "Invalid id" }, 400);

  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (existing[0]) {
    let row = existing[0];
    if (body?.sync && (body.displayName || body.avatarUrl)) {
      const upd = await db
        .update(users)
        .set({
          displayName: body.displayName?.slice(0, 50) || row.displayName,
          avatarUrl: body.avatarUrl ?? row.avatarUrl,
        })
        .where(eq(users.id, id))
        .returning();
      row = upd[0] ?? row;
    }
    return json({ user: { ...toPublic(row), showActivity: row.showActivity } });
  }

  const display = (body?.displayName ?? "").trim().slice(0, 50) || "New Listener";
  const base = slugUsername(body?.username || display);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 18)}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const inserted = await db
        .insert(users)
        .values({ id, username: candidate, displayName: display, avatarUrl: body?.avatarUrl ?? null })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return json({ user: { ...toPublic(inserted[0]), showActivity: inserted[0].showActivity } });
      const again = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (again[0]) return json({ user: { ...toPublic(again[0]), showActivity: again[0].showActivity } });
    } catch {
      /* retry with a new username */
    }
  }
  return json({ error: "Could not create profile" }, 500);
}

// Find people. ?q= searches by name/username, otherwise returns newest listeners.
export async function GET(req: Request) {
  const viewer = await getViewer(req);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const rows = q
    ? await db
        .select()
        .from(users)
        .where(or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`)))
        .limit(24)
    : await db
        .select()
        .from(users)
        .where(viewer ? ne(users.id, viewer.id) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(24);

  let followingSet = new Set<string>();
  const uid = getUid(req);
  if (uid && rows.length) {
    const f = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, uid), inArray(follows.followeeId, rows.map((r) => r.id))));
    followingSet = new Set(f.map((x) => x.followeeId));
  }
  return json({
    users: rows
      .filter((r) => r.id !== uid)
      .map((r) => ({ ...toPublic(r), isFollowing: followingSet.has(r.id) })),
  });
}
