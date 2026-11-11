"use client";

import { use, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { ActionBar, BigCover, Hero, HeroSkeleton, TrackSkeletons } from "@/components/collection";
import { EntityCard, TrackList } from "@/components/tracks";
import { ErrorState, Shelf } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getArtist } from "@/lib/saavn";
import { fmtCount, hashColor } from "@/lib/utils";

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useAsync(() => getArtist(id), [id]);
  const [more, setMore] = useState(false);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data)
    return (
      <>
        <HeroSkeleton />
        <TrackSkeletons />
      </>
    );
  const songs = more ? data.topSongs : data.topSongs.slice(0, 5);
  return (
    <div>
      <Hero color={hashColor(data.name, 55, 30)}>
        <BigCover src={data.image} alt={data.name} round />
        <div className="min-w-0 flex-1 text-center md:text-left">
          {data.verified && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium md:justify-start">
              <BadgeCheck size={22} className="fill-sky-500 text-white" /> Verified Artist
            </p>
          )}
          <h1 className="my-2 line-clamp-2 text-5xl font-black leading-tight tracking-tight md:text-7xl lg:text-8xl">{data.name}</h1>
          <p className="text-sm font-medium">{fmtCount(data.followers)} followers</p>
        </div>
      </Hero>
      <ActionBar tracks={data.topSongs} source={data.name} />
      {data.topSongs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-bold">Popular</h2>
          <TrackList tracks={songs} header={false} source={data.name} />
          {data.topSongs.length > 5 && (
            <button onClick={() => setMore(!more)} className="mt-2 px-4 text-sm font-bold text-sub hover:text-fg">
              {more ? "Show less" : "See more"}
            </button>
          )}
        </section>
      )}
      {data.albums.length > 0 && (
        <Shelf title="Albums">
          {data.albums.map((a) => (
            <EntityCard key={a.id} e={a} />
          ))}
        </Shelf>
      )}
      {data.similar.length > 0 && (
        <Shelf title="Fans also like">
          {data.similar.map((a) => (
            <EntityCard key={a.id} e={a} />
          ))}
        </Shelf>
      )}
      {data.bio && (
        <section className="mb-8 max-w-3xl">
          <h2 className="mb-3 text-2xl font-bold">About</h2>
          <p className="line-clamp-[12] whitespace-pre-line text-sub">{data.bio}</p>
        </section>
      )}
    </div>
  );
}
