import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type StoredTrack } from "@/db/schema";
import type { PublicUser, Track } from "@/lib/types";

export type UserRow = typeof users.$inferSelect;

export function getUid(req: Request): string | null {
  const id = req.headers.get("x-user-id");
  if (!id || id.length < 6 || id.length > 128) return null;
  return id;
}

export async function getViewer(req: Request): Promise<UserRow | null> {
  const id = getUid(req);
  if (!id) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export function toPublic(u: UserRow): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    accent: u.accent,
    bio: u.bio,
  };
}

export function toTrack(t: StoredTrack | null | undefined): Track | null {
  if (!t) return null;
  return { ...t };
}

export function sanitizeTrack(input: unknown): StoredTrack | null {
  if (!input || typeof input !== "object") return null;
  const t = input as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.name !== "string") return null;
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
  return {
    id: str(t.id, 40),
    name: str(t.name),
    artists: str(t.artists),
    artistId: typeof t.artistId === "string" ? str(t.artistId, 40) : undefined,
    album: str(t.album),
    albumId: typeof t.albumId === "string" ? str(t.albumId, 40) : undefined,
    image: str(t.image, 500),
    duration: typeof t.duration === "number" ? t.duration : 0,
    language: str(t.language, 40),
    hasLyrics: !!t.hasLyrics,
    year: typeof t.year === "string" ? str(t.year, 8) : undefined,
  };
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function slugUsername(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return s.length >= 3 ? s : `listener_${Math.random().toString(36).slice(2, 7)}`;
}

export const ALLOWED_MEDIA_HOST = /(^|\.)saavncdn\.com$/i;
