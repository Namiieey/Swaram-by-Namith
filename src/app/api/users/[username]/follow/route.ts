import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { getUid, json } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

async function target(ctx: Ctx) {
  const { username } = await ctx.params;
  const rows = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function POST(req: Request, ctx: Ctx) {
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const t = await target(ctx);
  if (!t) return json({ error: "Not found" }, 404);
  if (t.id === uid) return json({ error: "You can't follow yourself" }, 400);
  await db.insert(follows).values({ followerId: uid, followeeId: t.id }).onConflictDoNothing();
  return json({ following: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const uid = getUid(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const t = await target(ctx);
  if (!t) return json({ error: "Not found" }, 404);
  await db.delete(follows).where(and(eq(follows.followerId, uid), eq(follows.followeeId, t.id)));
  return json({ following: false });
}
