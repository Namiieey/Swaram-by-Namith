"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroSkeleton } from "@/components/collection";
import { useMe } from "@/context/app";

export default function MyProfileRedirect() {
  const { me, ready } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me) router.replace(`/user/${me.username}`);
  }, [me, router]);
  if (ready && !me) {
    return (
      <div className="glass mx-auto my-16 max-w-md rounded-2xl p-8 text-center">
        <p className="text-lg font-bold">Profile unavailable</p>
        <p className="mt-1 text-sm text-sub">We couldn&apos;t reach the server. Check your connection and refresh.</p>
      </div>
    );
  }
  return <HeroSkeleton />;
}
