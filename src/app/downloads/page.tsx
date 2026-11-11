"use client";

import { useMemo } from "react";
import { ArrowDownCircle, Trash2, WifiOff } from "lucide-react";
import { CollectionPage } from "@/components/collection";
import { IconBtn } from "@/components/ui";
import { useDownloads } from "@/context/library";
import { fmtBytes } from "@/lib/utils";

export default function DownloadsPage() {
  const dl = useDownloads();
  const tracks = useMemo(() => dl.items.map((i) => i.track), [dl.items]);
  return (
    <CollectionPage
      cover={
        <div className="grid h-52 w-52 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-lime-300 text-black shadow-[0_16px_60px_rgb(0_0_0/.5)] md:h-60 md:w-60">
          <ArrowDownCircle size={96} />
        </div>
      }
      type="Offline library"
      title="Downloads"
      color="#0f8a4f"
      source="Downloads"
      tracks={tracks}
      showAlbum
      meta={
        <span className="flex items-center gap-1.5 font-bold">
          {!dl.online && <WifiOff size={14} />} {fmtBytes(dl.totalSize)} on this device
        </span>
      }
      actions={
        tracks.length > 0 ? (
          <IconBtn
            label="Remove all downloads"
            onClick={async () => {
              if (confirm("Remove all downloaded songs from this device?")) for (const t of tracks) await dl.remove(t.id);
            }}
            className="h-10 w-10"
          >
            <Trash2 size={24} />
          </IconBtn>
        ) : null
      }
      empty={
        <div className="py-16 text-center">
          <p className="text-2xl font-bold">{dl.ready ? "No downloads yet" : "Loading…"}</p>
          <p className="mx-auto mt-2 max-w-md text-sub">Tap the download icon on any song, album or playlist and it will be saved to this device so you can listen offline.</p>
        </div>
      }
    />
  );
}
