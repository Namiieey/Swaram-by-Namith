import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { playlistTracks, playlists, users } from "@/db/schema";
import type { PlaylistSummary } from "@/lib/types";
import { toPublic } from "@/lib/server";

export async function summarize(
  rows: (typeof playlists.$inferSelect)[],
  viewerId: string | null,
  memberOf: Set<string> = new Set(),
): Promise<PlaylistSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [tracks, owners] = await Promise.all([
    db.select().from(playlistTracks).where(inArray(playlistTracks.playlistId, ids)).orderBy(playlistTracks.id),
    db.select().from(users).where(inArray(users.id, [...new Set(rows.map((r) => r.ownerId))])),
  ]);
  const ownerMap = new Map(owners.map((o) => [o.id, toPublic(o)]));
  return rows.map((r) => {
    const tr = tracks.filter((t) => t.playlistId === r.id);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isPublic: r.isPublic,
      isCollaborative: r.isCollaborative,
      ownerId: r.ownerId,
      owner: ownerMap.get(r.ownerId) ?? null,
      trackCount: tr.length,
      covers: tr.slice(0, 4).map((t) => t.track.image),
      role: viewerId && r.ownerId === viewerId ? "owner" : memberOf.has(r.id) ? "collaborator" : undefined,
    };
  });
}
