"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { Globe2, Lock, Pencil, Plus, Share2, Trash2, UserPlus, Users, X, LogOut } from "lucide-react";
import { ActionBar, Hero, HeroSkeleton, TrackSkeletons } from "@/components/collection";
import { PlaylistCover, Toggle } from "@/components/dialogs";
import { TrackListHeader, TrackRow } from "@/components/tracks";
import { Avatar, Cover, ErrorState, IconBtn, Modal } from "@/components/ui";
import { useMe, useUI } from "@/context/app";
import { useLibrary } from "@/context/library";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { searchSongs } from "@/lib/saavn";
import type { PlaylistSummary, PublicUser, Track } from "@/lib/types";
import { fmtLong, hashColor } from "@/lib/utils";

type Detail = {
  playlist: PlaylistSummary;
  owner: PublicUser | null;
  collaborators: PublicUser[];
  canEdit: boolean;
  isOwner: boolean;
  isMember: boolean;
  tracks: { track: Track; addedBy: PublicUser | null; addedAt: string }[];
};

export default function UserPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, ready } = useMe();
  const ui = useUI();
  const lib = useLibrary();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { data, error, loading, reload } = useAsync<Detail | null>(() => (ready ? api<Detail>(`/api/playlists/${id}`) : Promise.resolve(null)), [id, ready, me?.id]);

  const tracks = useMemo(() => (data?.tracks ?? []).map((t) => t.track), [data]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data)
    return (
      <>
        <HeroSkeleton />
        <TrackSkeletons />
      </>
    );

  const pl = data.playlist;
  const total = tracks.reduce((a, t) => a + t.duration, 0);
  const kind = pl.isCollaborative ? "Collaborative playlist" : pl.isPublic ? "Public playlist" : "Private playlist";
  const canJoin = pl.isCollaborative && !data.isOwner && !data.isMember;

  const invite = () =>
    ui.openShare({
      kind: "playlist",
      title: pl.name,
      subtitle: pl.isCollaborative ? "Join and add your songs" : `Playlist by ${data.owner?.displayName ?? "Swaram"}`,
      image: pl.covers[0],
      url: `${location.origin}/p/${pl.id}`,
      text: pl.isCollaborative ? `Join my collaborative playlist “${pl.name}” on Swaram` : `Check out my playlist “${pl.name}” on Swaram`,
    });

  return (
    <div>
      <Hero color={hashColor(pl.name, 55, 32)}>
        <PlaylistCover covers={pl.covers} name={pl.name} collaborative={pl.isCollaborative} className="h-52 w-52 shadow-[0_16px_60px_rgb(0_0_0/.5)] md:h-60 md:w-60" />
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider md:justify-start">
            {pl.isCollaborative ? <Users size={14} /> : pl.isPublic ? <Globe2 size={14} /> : <Lock size={14} />} {kind}
          </p>
          <h1 className="my-2 line-clamp-2 text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">{pl.name}</h1>
          {pl.description && <p className="line-clamp-2 text-sm text-fg/70">{pl.description}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium md:justify-start">
            {data.owner && (
              <Link href={`/user/${data.owner.username}`} className="flex items-center gap-1.5 font-bold hover:underline">
                <Avatar name={data.owner.displayName} src={data.owner.avatarUrl} color={data.owner.accent} size={22} /> {data.owner.displayName}
              </Link>
            )}
            {data.collaborators.length > 0 && (
              <span className="flex items-center gap-1.5">
                •
                <span className="flex -space-x-2">
                  {data.collaborators.slice(0, 5).map((c) => (
                    <Link key={c.id} href={`/user/${c.username}`} title={c.displayName}>
                      <Avatar name={c.displayName} src={c.avatarUrl} color={c.accent} size={22} className="ring-2 ring-black/40" />
                    </Link>
                  ))}
                </span>
                {data.collaborators.length} collaborator{data.collaborators.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="opacity-70">•</span>
            <span>{tracks.length} songs{total > 0 ? `, ${fmtLong(total)}` : ""}</span>
          </div>
        </div>
      </Hero>

      <ActionBar tracks={tracks} source={pl.name}>
        {canJoin && (
          <button
            onClick={async () => {
              try {
                await api(`/api/playlists/${id}/join`, { method: "POST" });
                ui.toast("You're now a collaborator 🎉");
                void lib.refreshPlaylists();
                reload();
              } catch (e) {
                ui.toast(e instanceof Error ? e.message : "Couldn't join");
              }
            }}
            className="press flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-onbrand"
          >
            <UserPlus size={17} /> Join as collaborator
          </button>
        )}
        <IconBtn label={pl.isCollaborative ? "Invite collaborators" : "Share playlist"} onClick={invite} className="h-10 w-10">
          <Share2 size={24} />
        </IconBtn>
        {data.isOwner && (
          <IconBtn label="Edit details" onClick={() => setEditing(true)} className="h-10 w-10">
            <Pencil size={22} />
          </IconBtn>
        )}
        {data.isMember && !data.isOwner && (
          <IconBtn
            label="Leave playlist"
            onClick={async () => {
              await api(`/api/playlists/${id}`, { method: "DELETE" });
              await lib.refreshPlaylists();
              router.push("/library");
            }}
            className="h-10 w-10"
          >
            <LogOut size={22} />
          </IconBtn>
        )}
      </ActionBar>

      {tracks.length > 0 ? (
        <>
          <TrackListHeader />
          {data.tracks.map(({ track, addedBy }, i) => {
            const removable = data.canEdit && (data.isOwner || addedBy?.id === me?.id);
            return (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                list={tracks}
                source={pl.name}
                right={
                  addedBy ? (
                    <Link href={`/user/${addedBy.username}`} onClick={(e) => e.stopPropagation()} title={`Added by ${addedBy.displayName}`} className="hidden md:block">
                      <Avatar name={addedBy.displayName} src={addedBy.avatarUrl} color={addedBy.accent} size={22} />
                    </Link>
                  ) : null
                }
                extra={
                  removable
                    ? [
                        {
                          label: "Remove from this playlist",
                          icon: <X size={16} />,
                          danger: true,
                          onClick: async () => {
                            try {
                              await api(`/api/playlists/${id}/tracks?songId=${track.id}`, { method: "DELETE" });
                              reload();
                              void lib.refreshPlaylists();
                            } catch (e) {
                              ui.toast(e instanceof Error ? e.message : "Couldn't remove");
                            }
                          },
                        },
                      ]
                    : undefined
                }
              />
            );
          })}
        </>
      ) : (
        <p className="py-6 text-center text-sub">This playlist is empty{data.canEdit ? " — let’s find something to add below." : "."}</p>
      )}

      {data.canEdit && <AddSongs playlistId={id} existing={new Set(tracks.map((t) => t.id))} onAdded={reload} />}

      {data.isOwner && (
        <EditDialog
          open={editing}
          onClose={() => setEditing(false)}
          pl={pl}
          onSaved={() => {
            reload();
            void lib.refreshPlaylists();
          }}
          onDeleted={async () => {
            await lib.refreshPlaylists();
            router.push("/library");
          }}
        />
      )}
    </div>
  );
}

function AddSongs({ playlistId, existing, onAdded }: { playlistId: string; existing: Set<string>; onAdded: () => void }) {
  const lib = useLibrary();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        setResults(await searchSongs(q.trim(), 10));
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h3 className="text-2xl font-bold">Let&apos;s find something for your playlist</h3>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for songs"
        className="mt-3 w-full max-w-md rounded-full border border-line bg-fg/5 px-5 py-3 text-sm outline-none focus:border-brand"
      />
      {busy && <p className="mt-3 text-sm text-sub">Searching…</p>}
      <div className="mt-3">
        {results.map((t) => {
          const done = existing.has(t.id) || added.has(t.id);
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-fg/10">
              <Cover src={t.image} alt={t.name} className="h-11 w-11" iconSize={18} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="truncate text-sm text-sub">{t.artists}</p>
              </div>
              <button
                disabled={done}
                onClick={async () => {
                  if (await lib.addToPlaylist(playlistId, t)) {
                    setAdded(new Set(added).add(t.id));
                    onAdded();
                  }
                }}
                className="press flex items-center gap-1 rounded-full border border-fg/40 px-4 py-1.5 text-sm font-bold hover:border-fg disabled:opacity-40"
              >
                {done ? "Added" : <><Plus size={14} /> Add</>}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EditDialog({
  open,
  onClose,
  pl,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  pl: PlaylistSummary;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const ui = useUI();
  const [name, setName] = useState(pl.name);
  const [desc, setDesc] = useState(pl.description);
  const [pub, setPub] = useState(pl.isPublic);
  const [collab, setCollab] = useState(pl.isCollaborative);
  useEffect(() => {
    if (open) {
      setName(pl.name);
      setDesc(pl.description);
      setPub(pl.isPublic);
      setCollab(pl.isCollaborative);
    }
  }, [open, pl]);
  return (
    <Modal open={open} onClose={onClose} title="Edit details">
      <div className="space-y-3">
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line bg-fg/5 px-4 py-3 outline-none focus:border-brand" placeholder="Name" />
        <textarea value={desc} maxLength={300} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-line bg-fg/5 px-4 py-3 text-sm outline-none focus:border-brand" placeholder="Add an optional description" />
        <Toggle icon={pub ? <Globe2 size={18} /> : <Lock size={18} />} title="Public playlist" desc="Shows on your profile and in Community" on={pub} set={setPub} />
        <Toggle icon={<Users size={18} />} title="Collaborative" desc="Friends with the link can add songs" on={collab} set={setCollab} />
        <div className="flex gap-2 pt-2">
          <button
            onClick={async () => {
              try {
                await api(`/api/playlists/${pl.id}`, { method: "PATCH", body: { name, description: desc, isPublic: pub, isCollaborative: collab } });
                onSaved();
                onClose();
              } catch (e) {
                ui.toast(e instanceof Error ? e.message : "Couldn't save");
              }
            }}
            className="press flex-1 rounded-full bg-brand py-3 font-bold text-onbrand"
          >
            Save
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Delete “${pl.name}”? This can't be undone.`)) return;
              await api(`/api/playlists/${pl.id}`, { method: "DELETE" });
              onClose();
              onDeleted();
            }}
            className="press grid h-12 w-12 place-items-center rounded-full border border-line text-red-400 hover:bg-red-500/10"
            aria-label="Delete playlist"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
