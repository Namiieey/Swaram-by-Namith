"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  Library,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  Users,
  WifiOff,
  Radio,
} from "lucide-react";
import { useMe, useTheme, useUI } from "@/context/app";
import { useDownloads, useLibrary } from "@/context/library";
import { usePlayer } from "@/context/player";
import { useAccent } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { CreatePlaylistDialog, PlaylistCover, PlaylistPicker, ShareDialog } from "./dialogs";
import { DynamicIsland, FullPlayer, MiniPlayer, PlayerBar } from "./player-ui";
import { RightPanel } from "./panels";
import { Avatar, Credits, IconBtn, Logo, PopMenu, Toasts } from "./ui";

/* ───────────── Sidebar ───────────── */
function NavItem({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-4 rounded-lg px-3 py-2.5 text-[15px] font-bold transition", active ? "bg-fg/10 text-fg" : "text-sub hover:text-fg")}
    >
      {icon}
      {label}
    </Link>
  );
}

function LibRow({ href, cover, title, sub, active }: { href: string; cover: ReactNode; title: string; sub: string; active?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-lg p-2 transition hover:bg-fg/10", active && "bg-fg/10")}>
      {cover}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-sm text-sub">{sub}</p>
      </div>
    </Link>
  );
}

export function LikedCover({ className }: { className?: string }) {
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-indigo-600 to-sky-300 text-white", className)}>
      <Heart size={20} fill="currentColor" />
    </div>
  );
}
export function DownloadCover({ className }: { className?: string }) {
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-emerald-500 to-lime-300 text-black", className)}>
      <ArrowDownCircle size={22} />
    </div>
  );
}

function Sidebar() {
  const path = usePathname();
  const ui = useUI();
  const lib = useLibrary();
  const dl = useDownloads();
  const [filter, setFilter] = useState<"all" | "collab" | "dl">("all");
  const chip = (id: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(filter === id ? "all" : id)}
      className={cn("press rounded-full px-3 py-1.5 text-sm font-medium transition", filter === id ? "bg-fg text-bg" : "bg-fg/10 hover:bg-fg/15")}
    >
      {label}
    </button>
  );
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-2 md:flex lg:w-[330px]">
      <div className="panel rounded-xl p-2">
        <Link href="/" className="mb-2 block px-3 pb-1 pt-3">
          <Logo />
        </Link>
        <NavItem href="/" icon={<Home size={24} fill={path === "/" ? "currentColor" : "none"} />} label="Home" active={path === "/"} />
        <NavItem href="/search" icon={<Search size={24} strokeWidth={path.startsWith("/search") ? 3 : 2} />} label="Search" active={path.startsWith("/search")} />
        <NavItem href="/community" icon={<Users size={24} fill={path.startsWith("/community") ? "currentColor" : "none"} />} label="Community" active={path.startsWith("/community")} />
      </div>

      <div className="panel flex min-h-0 flex-1 flex-col rounded-xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <Link href="/library" className="flex items-center gap-3 font-bold text-sub transition hover:text-fg">
            <Library size={24} /> Your Library
          </Link>
          <IconBtn label="Create playlist" onClick={() => ui.setCreateOpen(true)} className="h-8 w-8 hover:bg-fg/10">
            <Plus size={20} />
          </IconBtn>
        </div>
        <div className="flex gap-2 px-4 pb-2">
          {chip("collab", "Collaborative")}
          {chip("dl", "Downloaded")}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filter !== "collab" && (
            <>
              {filter === "all" && (
                <LibRow
                  href="/liked"
                  active={path === "/liked"}
                  cover={<LikedCover className="h-12 w-12" />}
                  title="Liked Songs"
                  sub={`Playlist • ${lib.likes.length} songs`}
                />
              )}
              <LibRow
                href="/downloads"
                active={path === "/downloads"}
                cover={<DownloadCover className="h-12 w-12" />}
                title="Downloads"
                sub={`Offline • ${dl.items.length} songs`}
              />
            </>
          )}
          {filter !== "dl" &&
            lib.playlists
              .filter((p) => filter === "all" || p.isCollaborative)
              .map((p) => (
                <LibRow
                  key={p.id}
                  href={`/p/${p.id}`}
                  active={path === `/p/${p.id}`}
                  cover={<PlaylistCover covers={p.covers} name={p.name} className="h-12 w-12" collaborative={p.isCollaborative} />}
                  title={p.name}
                  sub={`${p.isCollaborative ? "Collaborative" : p.isPublic ? "Public" : "Playlist"} • ${p.role === "collaborator" ? p.owner?.displayName ?? "Shared" : "You"}`}
                />
              ))}
          {filter === "all" && lib.playlists.length === 0 && (
            <div className="glass mx-1 mt-3 rounded-xl p-4">
              <p className="font-bold">Create your first playlist</p>
              <p className="mt-1 text-sm text-sub">It&apos;s easy, we&apos;ll help you.</p>
              <button onClick={() => ui.setCreateOpen(true)} className="press mt-3 rounded-full bg-fg px-4 py-1.5 text-sm font-bold text-bg">
                Create playlist
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <Credits />
          <Link href="/settings" aria-label="Settings" className="text-sub hover:text-fg">
            <Settings size={18} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

/* ───────────── Top bar ───────────── */
function TopBar() {
  const router = useRouter();
  const { me, isGuest, firebaseEnabled, signIn, signOut } = useMe();
  const { theme, toggle } = useTheme();
  const ui = useUI();
  const p = usePlayer();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.getElementById("main-scroll");
    if (!el) return;
    const on = () => setScrolled(el.scrollTop > 60);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  const menu = [
    { label: "Profile", icon: <User size={16} />, onClick: () => router.push(me ? `/user/${me.username}` : "/settings") },
    { label: "Settings", icon: <Settings size={16} />, onClick: () => router.push("/settings") },
    { label: "Downloads", icon: <ArrowDownCircle size={16} />, onClick: () => router.push("/downloads") },
    { label: theme === "dark" ? "Light mode" : "Dark mode", icon: theme === "dark" ? <Sun size={16} /> : <Moon size={16} />, onClick: toggle },
    { label: "Sign in with Google", icon: <LogIn size={16} />, hidden: !(firebaseEnabled && isGuest), onClick: () => void signIn().catch(() => ui.toast("Sign-in was cancelled")) },
    { label: "Sign out", icon: <LogOut size={16} />, hidden: !(firebaseEnabled && !isGuest), onClick: () => void signOut() },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 transition-colors duration-300 md:px-6",
        scrolled ? "bg-panel/60 backdrop-blur-2xl" : "bg-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <button aria-label="Back" onClick={() => router.back()} className="press grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
            <ChevronLeft size={20} />
          </button>
          <button aria-label="Forward" onClick={() => router.forward()} className="press grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60">
            <ChevronRight size={20} />
          </button>
        </div>
        <Link href="/" className="md:hidden">
          <Logo size={30} />
        </Link>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2">
        {p.room && (
          <button onClick={() => ui.openFull("together")} className="press hidden items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-bold text-brand sm:flex">
            <Radio size={14} /> {p.room.code}
          </button>
        )}
        <IconBtn label="Toggle theme" onClick={toggle} className="h-9 w-9 bg-black/30 text-white hover:bg-black/50 hover:text-white">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </IconBtn>
        <IconBtn label="Friend activity" active={ui.panel === "friends"} onClick={() => ui.togglePanel("friends")} className="hidden h-9 w-9 bg-black/30 text-white hover:bg-black/50 hover:text-white lg:grid">
          <Users size={18} />
        </IconBtn>
        <Link href="/community" aria-label="Community" className="press grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50 lg:hidden">
          <Users size={18} />
        </Link>
        <PopMenu
          items={menu}
          title={<p className="font-bold">{me?.displayName ?? "Swaram Listener"}</p>}
          trigger={(open) => (
            <button aria-label="Account menu" onClick={open} className="press rounded-full bg-black/30 p-1 hover:bg-black/50">
              <Avatar name={me?.displayName ?? "Swaram"} src={me?.avatarUrl} color={me?.accent} size={30} />
            </button>
          )}
        />
      </div>
    </header>
  );
}

/* ───────────── Mobile bottom nav ───────────── */
function MobileNav() {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Home", icon: Home, active: path === "/" },
    { href: "/search", label: "Search", icon: Search, active: path.startsWith("/search") },
    { href: "/library", label: "Your Library", icon: Library, active: path.startsWith("/library") || path.startsWith("/liked") || path.startsWith("/downloads") || path.startsWith("/p/") },
    { href: "/community", label: "Community", icon: Users, active: path.startsWith("/community") },
  ];
  return (
    <nav className="glass safe-b fixed inset-x-0 bottom-0 z-[55] flex rounded-t-3xl border-b-0 pt-1 md:hidden">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={cn("press flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium", t.active ? "text-fg" : "text-sub")}>
          <t.icon size={24} strokeWidth={t.active ? 2.6 : 2} fill={t.active && t.icon === Home ? "currentColor" : "none"} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function OfflineBanner() {
  const dl = useDownloads();
  if (dl.online) return null;
  return (
    <div className="relative z-[2] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-bold text-black">
      <WifiOff size={14} /> You&apos;re offline — your downloaded songs are still available.{" "}
      <Link href="/downloads" className="underline">
        Open Downloads
      </Link>
    </div>
  );
}

/* ───────────── Shell ───────────── */
export function Shell({ children }: { children: ReactNode }) {
  const p = usePlayer();
  const path = usePathname();
  const accent = useAccent(p.current?.image, p.current?.id);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-rgb", accent);
  }, [accent]);
  useEffect(() => {
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, [path]);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <div className="ambient" aria-hidden />
      <div className="relative z-[1] flex h-dvh flex-col">
        <OfflineBanner />
        <div className="flex min-h-0 flex-1 gap-2 md:p-2 md:pb-2">
          <Sidebar />
          <main id="main-scroll" className="panel relative min-w-0 flex-1 overflow-y-auto max-md:rounded-none max-md:border-0 md:rounded-xl">
            <TopBar />
            <div className="px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-10">{children}</div>
          </main>
          <RightPanel />
        </div>
        <PlayerBar />
      </div>
      <MiniPlayer />
      <MobileNav />
      <DynamicIsland />
      <FullPlayer />
      <ShareDialog />
      <PlaylistPicker />
      <CreatePlaylistDialog />
      <Toasts />
    </>
  );
}
