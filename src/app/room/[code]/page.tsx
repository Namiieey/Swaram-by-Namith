"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { Crown, Radio } from "lucide-react";
import { TogetherView } from "@/components/panels";
import { Avatar, Cover, EqBars } from "@/components/ui";
import { useMe, useUI } from "@/context/app";
import { usePlayer } from "@/context/player";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { PublicUser, Track } from "@/lib/types";

type Preview = { code: string; host: PublicUser | null; track: Track | null; isPlaying: boolean; members: PublicUser[] };

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const { ready, me } = useMe();
  const p = usePlayer();
  const ui = useUI();
  const inRoom = p.room?.code === code;
  const { data, error, loading, reload } = useAsync<Preview | null>(() => (ready ? api<Preview>(`/api/rooms/${code}`) : Promise.resolve(null)), [code, ready, inRoom]);

  useEffect(() => {
    const t = setInterval(reload, 6000);
    return () => clearInterval(t);
  }, [reload]);

  if (error)
    return (
      <div className="glass mx-auto my-16 max-w-md rounded-3xl p-8 text-center">
        <Radio className="mx-auto mb-3 text-sub" size={34} />
        <p className="text-xl font-extrabold">Session not found</p>
        <p className="mt-1 text-sm text-sub">This listening session has ended or the code is wrong.</p>
        <Link href="/community" className="press mt-5 inline-block rounded-full bg-fg px-6 py-2.5 text-sm font-bold text-bg">
          Back to Community
        </Link>
      </div>
    );
  if ((loading && !data) || !data) return <div className="skeleton mx-auto mt-16 h-72 max-w-xl rounded-3xl" />;

  return (
    <div className="mx-auto max-w-xl pt-4">
      <div className="glass relative overflow-hidden rounded-3xl p-6 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(80% 60% at 50% 0%, rgb(var(--accent-rgb) / .5), transparent 70%)" }} />
        <div className="relative">
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            <Radio size={14} /> Listening Together
          </p>
          <p className="mt-2 font-mono text-4xl font-black tracking-[0.3em]">{code}</p>
          {data.host && (
            <Link href={`/user/${data.host.username}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-fg/10 py-1 pl-1 pr-4 text-sm font-semibold hover:bg-fg/15">
              <Avatar name={data.host.displayName} src={data.host.avatarUrl} color={data.host.accent} size={28} />
              <Crown size={14} className="text-yellow-400" /> {data.host.displayName}&apos;s session
            </Link>
          )}
          {data.track ? (
            <div className="mt-6">
              <Cover src={data.track.image} alt={data.track.name} className="mx-auto h-48 w-48 shadow-2xl" iconSize={50} />
              <p className="mt-4 text-2xl font-extrabold">{data.track.name}</p>
              <p className="text-sub">{data.track.artists}</p>
              <p className="mt-2 flex justify-center text-xs text-sub">{data.isPlaying ? <span className="flex items-center gap-2"><EqBars /> Playing now</span> : "Paused"}</p>
            </div>
          ) : (
            <p className="mt-6 text-sub">The host hasn&apos;t picked a song yet.</p>
          )}
          <div className="mt-4 flex justify-center -space-x-2">
            {data.members.slice(0, 8).map((m) => (
              <Avatar key={m.id} name={m.displayName} src={m.avatarUrl} color={m.accent} size={34} className="ring-2 ring-black/40" />
            ))}
          </div>
          <p className="mt-1 text-xs text-sub">{data.members.length} listening</p>

          {!inRoom && (
            <button
              onClick={async () => {
                if (await p.joinRoom(code)) {
                  ui.toast("You're in! Playing in sync with the host.");
                  ui.openFull("player");
                }
              }}
              disabled={!me}
              className="press mt-6 w-full rounded-full bg-brand py-3.5 text-base font-bold text-onbrand disabled:opacity-50"
            >
              Join session
            </button>
          )}
        </div>
      </div>
      {inRoom && (
        <div className="glass mt-4 rounded-3xl p-4">
          <TogetherView />
        </div>
      )}
    </div>
  );
}
