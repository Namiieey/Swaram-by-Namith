"use client";

import { use } from "react";
import { BigCover, CollectionPage, HeroSkeleton, TrackSkeletons } from "@/components/collection";
import { ErrorState } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getPlaylist } from "@/lib/saavn";

export default function SaavnPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useAsync(() => getPlaylist(id), [id]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data)
    return (
      <>
        <HeroSkeleton />
        <TrackSkeletons />
      </>
    );
  return (
    <CollectionPage
      cover={<BigCover src={data.image} alt={data.name} />}
      type="Playlist"
      title={data.name}
      description={data.description}
      source={data.name}
      tracks={data.songs}
      meta={<span className="font-bold">Swaram Editorial</span>}
    />
  );
}
