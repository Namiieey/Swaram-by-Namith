"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { useMe, useUI } from "@/context/app";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";

export function FollowButton({
  username,
  initial,
  onChange,
  className,
}: {
  username: string;
  initial: boolean;
  onChange?: (following: boolean) => void;
  className?: string;
}) {
  const ui = useUI();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/users/${username}/follow`, { method: following ? "DELETE" : "POST" });
          setFollowing(!following);
          onChange?.(!following);
        } catch (e) {
          ui.toast(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "press flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition disabled:opacity-50",
        following ? "border-line text-fg hover:border-fg" : "border-fg/40 text-fg hover:scale-105 hover:border-fg",
        className,
      )}
    >
      {following ? <Check size={15} /> : <UserPlus size={15} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function PersonRow({ user, isFollowing }: { user: PublicUser; isFollowing?: boolean }) {
  const { me } = useMe();
  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-fg/10">
      <Link href={`/user/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={user.displayName} src={user.avatarUrl} color={user.accent} size={48} />
        <div className="min-w-0">
          <p className="truncate font-bold">{user.displayName}</p>
          <p className="truncate text-sm text-sub">@{user.username}</p>
        </div>
      </Link>
      {me && me.id !== user.id && <FollowButton username={user.username} initial={!!isFollowing} />}
    </div>
  );
}
