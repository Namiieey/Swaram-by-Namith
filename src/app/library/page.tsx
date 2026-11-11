"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownCircle, Heart, Plus } from "lucide-react";
import { UserPlaylistCard } from "@/components/collection";
import { Chip } from "@/components/ui";
import { useUI } from "@/context/app";
import { useDownloads, useLibrary } from "@/context/library";

export default function LibraryPage() {
  const lib = useLibrary();
  const dl = useDownloads();
  const ui = useUI();
  const [tab, setTab] = useState<"all" | "mine" | "collab">("all");
  const list = lib.playlists.filter((p) => (tab === "collab" ? p.isCollaborative : tab === "mine" ? p.role === "owner" : true));
  return (
    <div className="pt-2">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Library</h1>
        <button onClick={() => ui.setCreateOpen(true)} className="press flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-bold text-bg">
          <Plus size={18} /> Create
        </button>
      </div>
      <div className="mb-5 flex gap-2">
        <Chip active={tab === "all"} onClick={() => setTab("all")}>All</Chip>
        <Chip active={tab === "mine"} onClick={() => setTab("mine")}>Created by you</Chip>
        <Chip active={tab === "collab"} onClick={() => setTab("collab")}>Collaborative</Chip>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {tab === "all" && (
          <>
            <Link href="/liked" className="group rounded-xl p-3 transition hover:bg-fg/10">
              <div className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-300 text-white shadow-lg">
                <Heart size={52} fill="currentColor" />
              </div>
              <p className="mt-3 truncate font-bold">Liked Songs</p>
              <p className="text-sm text-sub">{lib.likes.length} songs</p>
            </Link>
            <Link href="/downloads" className="group rounded-xl p-3 transition hover:bg-fg/10">
              <div className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-lime-300 text-black shadow-lg">
                <ArrowDownCircle size={56} />
              </div>
              <p className="mt-3 truncate font-bold">Downloads</p>
              <p className="text-sm text-sub">{dl.items.length} songs · offline</p>
            </Link>
          </>
        )}
        {list.map((p) => (
          <UserPlaylistCard key={p.id} p={p} className="!w-full md:!w-full" />
        ))}
      </div>

      {lib.playlistsReady && list.length === 0 && (
        <div className="glass mx-auto mt-8 max-w-md rounded-2xl p-6 text-center">
          <p className="text-lg font-bold">{tab === "collab" ? "No collaborative playlists yet" : "Create your first playlist"}</p>
          <p className="mt-1 text-sm text-sub">Make a playlist and invite friends to add songs together.</p>
          <button onClick={() => ui.setCreateOpen(true)} className="press mt-4 rounded-full bg-fg px-5 py-2 text-sm font-bold text-bg">
            Create playlist
          </button>
        </div>
      )}
    </div>
  );
}
