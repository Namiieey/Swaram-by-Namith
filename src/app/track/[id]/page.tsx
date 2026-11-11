import type { Metadata } from "next";
import { fetchSongServer } from "@/lib/server-saavn";
import { TrackLanding } from "./view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const song = await fetchSongServer(id);
  if (!song) return { title: "Song on Swaram" };
  const title = `${song.name} — ${song.artists}`;
  return {
    title,
    description: `Listen to “${song.name}” by ${song.artists} on Swaram by Namith.`,
    openGraph: {
      title,
      description: `Listen to “${song.name}” by ${song.artists} on Swaram.`,
      images: song.image ? [{ url: song.image, width: 500, height: 500 }] : undefined,
      type: "music.song",
    },
    twitter: { card: "summary", title, images: song.image ? [song.image] : undefined },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackLanding id={id} />;
}
