"use client";

import { useEffect, useState } from "react";
import { Search, Share2 } from "lucide-react";
import { UserPlaylistCard } from "@/components/collection";
import { FriendActivityView, TogetherView } from "@/components/panels";
import { PersonRow } from "@/components/social";
import { Chip } from "@/components/ui";
import { useMe, useUI } from "@/context/app";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { PlaylistSummary, PublicUser } from "@/lib/types";

type Tab = "activity" | "playlists" | "people";

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("activity");
  const { me } = useMe();
  const ui = useUI();
  return (
    <div className="pt-2">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Community</h1>
          <p className="mt-1 text-sub">See what friends are playing, discover public playlists and listen together.</p>
        </div>
        <button
          onClick={() =>
            ui.openShare({
              kind: "profile",
              title: me?.displayName ?? "Swaram",
              subtitle: me ? `@${me.username} on Swaram` : "Music for every mood",
              url: me ? `${location.origin}/user/${me.username}` : location.origin,
              text: "Follow me on Swaram — my music profile",
            })
          }
          className="press hidden items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold hover:bg-fg/10 sm:flex"
        >
          <Share2 size={16} /> Share my profile
        </button>
      </div>
      <div className="mb-6 mt-5 flex gap-2">
        <Chip active={tab === "activity"} onClick={() => setTab("activity")}>Friend Activity</Chip>
        <Chip active={tab === "playlists"} onClick={() => setTab("playlists")}>Public Playlists</Chip>
        <Chip active={tab === "people"} onClick={() => setTab("people")}>People</Chip>
      </div>

      {tab === "activity" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="glass rounded-3xl p-3">
            <h2 className="px-3 pb-2 pt-2 text-xl font-bold">Friend Activity</h2>
            <FriendActivityView />
          </section>
          <section className="glass rounded-3xl p-3">
            <h2 className="px-3 pb-3 pt-2 text-xl font-bold">Listening Together</h2>
            <TogetherView />
          </section>
        </div>
      )}
      {tab === "playlists" && <PublicPlaylists />}
      {tab === "people" && <People />}
    </div>
  );
}

function PublicPlaylists() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useAsync(() => api<{ playlists: PlaylistSummary[] }>(`/api/playlists?scope=public&q=${encodeURIComponent(query)}`), [query]);
  const list = data?.playlists ?? [];
  return (
    <div>
      <div className="glass mb-6 flex h-11 max-w-md items-center rounded-full">
        <Search size={18} className="ml-4 text-sub" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search public playlists" className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-sub" />
      </div>
      {loading && !data && <div className="skeleton h-48 rounded-2xl" />}
      {data && list.length === 0 && (
        <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
          <p className="text-lg font-bold">No public playlists yet</p>
          <p className="mt-1 text-sm text-sub">Create a playlist and toggle “Public” to share it with everyone.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {list.map((p) => (
          <UserPlaylistCard key={p.id} p={p} className="!w-full md:!w-full" />
        ))}
      </div>
    </div>
  );
}

function People() {
  const { me } = useMe();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useAsync(() => api<{ users: (PublicUser & { isFollowing: boolean })[] }>(`/api/users?q=${encodeURIComponent(query)}`), [query, me?.id]);
  const users = data?.users ?? [];
  return (
    <div className="max-w-2xl">
      <div className="glass mb-4 flex h-11 items-center rounded-full">
        <Search size={18} className="ml-4 text-sub" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find people by name or @username" className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-sub" />
      </div>
      <h2 className="mb-2 px-2 text-lg font-bold">{query ? "Results" : "Suggested listeners"}</h2>
      {loading && !data && <div className="skeleton h-40 rounded-2xl" />}
      {data && users.length === 0 && <p className="px-2 text-sub">{query ? "No one found." : "No other listeners yet — invite your friends!"}</p>}
      {users.map((u) => (
        <PersonRow key={u.id} user={u} isFollowing={u.isFollowing} />
      ))}
    </div>
  );
}
