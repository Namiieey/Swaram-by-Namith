import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { playlistMembers, playlists } from "@/db/schema";
import { getUid, getViewer, json } from "@/lib/server";
import { summarize } from "@/lib/server-playlists";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "mine";
  const uid = getUid(req);

  if (scope === "public") {
    const q = (sp.get("q") ?? "").trim();
    const rows = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.isPublic, true), q ? or(ilike(playlists.name, `%${q}%`), ilike(playlists.description, `%${q}%`)) : undefined))
      .orderBy(desc(playlists.updatedAt))
      .limit(60);
    const list = (await summarize(rows, uid)).filter((p) => p.trackCount > 0 || p.isCollaborative);
    return json({ playlists: list });
  }

  if (!uid) return json({ playlists: [] });
  const memberships = await db.select().from(playlistMembers).where(eq(playlistMembers.userId, uid));
  const memberIds = memberships.map((m) => m.playlistId);
  const rows = await db
    .select()
    .from(playlists)
    .where(memberIds.length ? or(eq(playlists.ownerId, uid), inArray(playlists.id, memberIds)) : eq(playlists.ownerId, uid))
    .orderBy(desc(playlists.updatedAt));
  return json({ playlists: await summarize(rows, uid, new Set(memberIds)) });
}

export async function POST(req: Request) {
  const viewer = await getViewer(req);
  if (!viewer) return json({ error: "Unauthorized" }, 401);
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    isPublic?: boolean;
    isCollaborative?: boolean;
  };
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 14);
  const name = (body.name ?? "").trim().slice(0, 80) || "My Playlist";
  const [row] = await db
    .insert(playlists)
    .values({
      id,
      ownerId: viewer.id,
      name,
      description: (body.description ?? "").slice(0, 300),
      isPublic: !!body.isPublic,
      isCollaborative: !!body.isCollaborative,
    })
    .returning();
  return json({ playlist: (await summarize([row], viewer.id))[0] });
}
