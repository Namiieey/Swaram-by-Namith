import { db } from "@/db";
import { roomMembers, rooms } from "@/db/schema";
import { getViewer, json, sanitizeTrack } from "@/lib/server";

export const dynamic = "force-dynamic";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

// Start a Listening Together session (the creator is the host).
export async function POST(req: Request) {
  const viewer = await getViewer(req);
  if (!viewer) return json({ error: "Unauthorized" }, 401);
  const body = (await req.json().catch(() => ({}))) as { track?: unknown; position?: number; isPlaying?: boolean };
  const track = sanitizeTrack(body.track);
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const ins = await db
      .insert(rooms)
      .values({
        code,
        hostId: viewer.id,
        track,
        position: typeof body.position === "number" ? body.position : 0,
        isPlaying: !!body.isPlaying,
      })
      .onConflictDoNothing()
      .returning();
    if (ins[0]) {
      await db.insert(roomMembers).values({ code, userId: viewer.id }).onConflictDoNothing();
      return json({ code });
    }
  }
  return json({ error: "Could not create session" }, 500);
}
