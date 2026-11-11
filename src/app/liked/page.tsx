"use client";

import { Heart } from "lucide-react";
import { CollectionPage } from "@/components/collection";
import { useLibrary } from "@/context/library";

export default function LikedPage() {
  const { likes } = useLibrary();
  return (
    <CollectionPage
      cover={
        <div className="grid h-52 w-52 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-300 text-white shadow-[0_16px_60px_rgb(0_0_0/.5)] md:h-60 md:w-60">
          <Heart size={90} fill="currentColor" />
        </div>
      }
      type="Playlist"
      title="Liked Songs"
      color="#4b3fb8"
      source="Liked Songs"
      tracks={likes}
      meta={<span className="font-bold">You</span>}
      empty={
        <div className="py-16 text-center">
          <p className="text-2xl font-bold">Songs you like will appear here</p>
          <p className="mt-2 text-sub">Save songs by tapping the heart icon.</p>
        </div>
      }
    />
  );
}
