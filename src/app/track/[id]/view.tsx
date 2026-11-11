"use client";

import Link from "next/link";
import { ActionBar, BigCover, Hero, HeroSkeleton } from "@/components/collection";
import { LikeButton } from "@/components/controls";
import { useShareTrack } from "@/components/player-ui";
import { TrackMenu } from "@/components/tracks";
import { ErrorState, IconBtn } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getSong } from "@/lib/saavn";
import { hashColor } from "@/lib/utils";
import { Share2 } from "lucide-react";

export function TrackLanding({ id }: { id: string }) {
  const { data, error, loading, reload } = useAsync(() => getSong(id), [id]);
  const share = useShareTrack();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <HeroSkeleton />;
  if (!data) return <ErrorState message="We couldn't find that song." />;
  return (
    <div>
      <Hero color={hashColor(data.name, 55, 32)}>
        <BigCover src={data.image} alt={data.name} />
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-wider">Shared song</p>
          <h1 className="my-2 line-clamp-2 text-4xl font-black leading-tight tracking-tight md:text-6xl">{data.name}</h1>
          <p className="text-sm font-medium">
            {data.artistId ? (
              <Link href={`/artist/${data.artistId}`} className="font-bold hover:underline">
                {data.artists}
              </Link>
            ) : (
              data.artists
            )}
            {data.album && <span className="opacity-80"> • {data.album}</span>}
            {data.year && <span className="opacity-80"> • {data.year}</span>}
          </p>
        </div>
      </Hero>
      <ActionBar tracks={[data]} source="Shared song">
        <LikeButton track={data} size={28} className="h-11 w-11" />
        <IconBtn label="Share" onClick={() => share(data)} className="h-10 w-10">
          <Share2 size={24} />
        </IconBtn>
        <TrackMenu track={data} className="h-10 w-10" />
      </ActionBar>
      <p className="max-w-xl text-sub">Tap play to start listening. Add it to a playlist, download it for offline, or start a Listening Together session from the player.</p>
    </div>
  );
}
