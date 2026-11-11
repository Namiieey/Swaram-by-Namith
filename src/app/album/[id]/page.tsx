"use client";

import Link from "next/link";
import { use } from "react";
import { BigCover, CollectionPage, HeroSkeleton, TrackSkeletons } from "@/components/collection";
import { ErrorState } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getAlbum } from "@/lib/saavn";

export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useAsync(() => getAlbum(id), [id]);
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
      type="Album"
      title={data.name}
      source={data.name}
      tracks={data.songs}
      meta={
        <>
          {data.artists.map((a, i) => (
            <span key={a.id}>
              <Link href={`/artist/${a.id}`} className="font-bold hover:underline">
                {a.name}
              </Link>
              {i < data.artists.length - 1 && ", "}
            </span>
          ))}
          {data.year && <span className="opacity-80">• {data.year}</span>}
        </>
      }
    />
  );
}
