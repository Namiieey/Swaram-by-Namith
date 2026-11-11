"use client";

import type { ReactNode } from "react";
import { AppProvider } from "@/context/app";
import { LibraryProvider } from "@/context/library";
import { PlayerProvider } from "@/context/player";
import { Shell } from "./shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <LibraryProvider>
        <PlayerProvider>
          <Shell>{children}</Shell>
        </PlayerProvider>
      </LibraryProvider>
    </AppProvider>
  );
}
