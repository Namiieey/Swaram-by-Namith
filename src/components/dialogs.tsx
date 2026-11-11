"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Download, Globe2, ImageDown, Lock, MessageCircle, Send, Share2, Users, Plus } from "lucide-react";
import { useUI, type ShareData } from "@/context/app";
import { useLibrary } from "@/context/library";
import { cn, hashColor, hashHue, proxyImg } from "@/lib/utils";
import { Cover, Modal } from "./ui";

/* ───────────── Playlist cover mosaic ───────────── */
export function PlaylistCover({ covers, name, className, collaborative }: { covers: string[]; name: string; className?: string; collaborative?: boolean }) {
  if (covers.length >= 4) {
    return (
      <div className={cn("grid shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-[6px]", className)}>
        {covers.slice(0, 4).map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={c} alt="" className="h-full w-full object-cover" loading="lazy" />
        ))}
      </div>
    );
  }
  if (covers.length > 0) return <Cover src={covers[0]} alt={name} className={className} />;
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-[6px] text-white/80", className)}
      style={{ background: `linear-gradient(135deg, ${hashColor(name, 55, 40)}, ${hashColor(name + "z", 60, 22)})` }}
    >
      {collaborative ? <Users size={24} /> : <Plus size={24} />}
    </div>
  );
}

/* ───────────── Share ───────────── */
async function makeCard(d: ShareData): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const hue = hashHue(d.title);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${hue} 65% 42%)`);
  g.addColorStop(1, "#080808");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 0, 50, W * 0.8, 0, 700);
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const img = d.image
    ? await new Promise<HTMLImageElement | null>((res) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = proxyImg(d.image);
      })
    : null;
  const x = 90;
  const y = 150;
  const s = 900;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 30;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 36);
  ctx.fillStyle = hashColor(d.title, 50, 30);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 36);
  ctx.clip();
  if (img) ctx.drawImage(img, x, y, s, s);
  ctx.restore();

  const fit = (text: string, weight: number, size: number, max: number) => {
    let sz = size;
    ctx.font = `${weight} ${sz}px system-ui, "Noto Sans Malayalam", sans-serif`;
    while (ctx.measureText(text).width > max && sz > 28) {
      sz -= 2;
      ctx.font = `${weight} ${sz}px system-ui, "Noto Sans Malayalam", sans-serif`;
    }
    return text;
  };
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(fit(d.title, 800, 66, 900), x, y + s + 100);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(fit(d.subtitle ?? "", 500, 40, 900), x, y + s + 160);

  ctx.fillStyle = "#1ed760";
  ctx.beginPath();
  ctx.arc(x + 28, H - 100, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  [[-12, 5], [-6, 10], [0, 16], [6, 10], [12, 5]].forEach(([dx, h]) => {
    ctx.beginPath();
    ctx.moveTo(x + 28 + dx, H - 100 - h);
    ctx.lineTo(x + 28 + dx, H - 100 + h);
    ctx.stroke();
  });
  ctx.fillStyle = "#fff";
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText("Swaram", x + 74, H - 102);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = '500 24px system-ui, sans-serif';
  ctx.fillText("by Namith", x + 74, H - 70);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

export function ShareDialog() {
  const ui = useUI();
  const d = ui.share;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!d) return <Modal open={false} onClose={() => {}}>{null}</Modal>;
  const text = d.text ?? d.title;
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(d.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      ui.toast("Couldn't copy — long-press the link instead");
    }
  };
  const saveCard = async (share = false) => {
    setBusy(true);
    try {
      const blob = await makeCard(d);
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "swaram-share.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url: d.url });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `swaram-${d.title.replace(/[^\w]+/g, "-").toLowerCase()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch {
      ui.toast("Couldn't create the share card");
    } finally {
      setBusy(false);
    }
  };
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", icon: <MessageCircle size={20} />, href: `https://wa.me/?text=${enc(`${text} ${d.url}`)}`, color: "#25d366" },
    { label: "Telegram", icon: <Send size={20} />, href: `https://t.me/share/url?url=${enc(d.url)}&text=${enc(text)}`, color: "#2aabee" },
    { label: "X", icon: <span className="text-lg font-black">𝕏</span>, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(d.url)}`, color: "#8a8a8a" },
  ];

  return (
    <Modal open onClose={() => ui.openShare(null)} title={d.kind === "room" ? "Invite to listen together" : "Share"}>
      <div className="glass flex items-center gap-4 rounded-2xl p-3">
        <Cover src={d.image} alt={d.title} className="h-20 w-20" iconSize={30} />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{d.title}</p>
          <p className="truncate text-sm text-sub">{d.subtitle}</p>
          <p className="mt-1 text-xs font-semibold text-brand">Swaram by Namith</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-line bg-fg/5 py-1.5 pl-4 pr-1.5">
        <input readOnly value={d.url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-sm text-sub outline-none" />
        <button onClick={copy} className="press flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-sm font-bold text-bg">
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="press flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-fg/10">
            <span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ background: l.color }}>
              {l.icon}
            </span>
            {l.label}
          </a>
        ))}
        {canNative ? (
          <button
            onClick={() => void navigator.share({ title: d.title, text, url: d.url }).catch(() => {})}
            className="press flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-fg/10"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-fg/15">
              <Share2 size={20} />
            </span>
            More…
          </button>
        ) : (
          <button onClick={() => void saveCard(false)} className="press flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-fg/10">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-fg/15">
              <ImageDown size={20} />
            </span>
            Card
          </button>
        )}
      </div>

      <button
        disabled={busy}
        onClick={() => void saveCard(canNative)}
        className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-bold hover:bg-fg/10 disabled:opacity-50"
      >
        <Download size={16} /> {busy ? "Creating…" : canNative ? "Share as image card" : "Download image card"}
      </button>
    </Modal>
  );
}

/* ───────────── Create playlist ───────────── */
export function CreatePlaylistDialog() {
  const ui = useUI();
  const lib = useLibrary();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [collab, setCollab] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const pl = await lib.createPlaylist({ name: name.trim() || "My Playlist", isPublic, isCollaborative: collab });
    setBusy(false);
    if (pl) {
      ui.setCreateOpen(false);
      setName("");
      setPublic(false);
      setCollab(false);
      router.push(`/p/${pl.id}`);
    }
  };
  return (
    <Modal open={ui.createOpen} onClose={() => ui.setCreateOpen(false)} title="Create playlist">
      <form onSubmit={submit} className="space-y-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="My Playlist #1"
          className="w-full rounded-lg border border-line bg-fg/5 px-4 py-3 text-base outline-none focus:border-brand"
        />
        <Toggle icon={isPublic ? <Globe2 size={18} /> : <Lock size={18} />} title="Public playlist" desc="Anyone can find and listen to it" on={isPublic} set={setPublic} />
        <Toggle icon={<Users size={18} />} title="Collaborative" desc="Friends with the link can add songs" on={collab} set={setCollab} />
        <button disabled={busy} className="press w-full rounded-full bg-brand py-3 font-bold text-onbrand disabled:opacity-50">
          {busy ? "Creating…" : "Create"}
        </button>
      </form>
    </Modal>
  );
}

export function Toggle({ icon, title, desc, on, set }: { icon?: React.ReactNode; title: string; desc?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => set(!on)} className="flex w-full items-center gap-3 rounded-xl bg-fg/5 p-3 text-left hover:bg-fg/10">
      {icon && <span className="grid h-9 w-9 place-items-center rounded-full bg-fg/10">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {desc && <span className="block text-xs text-sub">{desc}</span>}
      </span>
      <span className={cn("relative h-6 w-11 rounded-full transition", on ? "bg-brand" : "bg-fg/25")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/* ───────────── Add to playlist ───────────── */
export function PlaylistPicker() {
  const ui = useUI();
  const lib = useLibrary();
  const t = ui.pickerTrack;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => ui.openPicker(null);
  return (
    <Modal open={!!t} onClose={close} title="Add to playlist">
      {t && (
        <>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const pl = await lib.createPlaylist({ name: name.trim() || t.name });
              if (pl) await lib.addToPlaylist(pl.id, t);
              setBusy(false);
              setName("");
              close();
            }}
            className="mb-4 flex gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New playlist name"
              className="min-w-0 flex-1 rounded-full border border-line bg-fg/5 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button disabled={busy} className="press flex items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-bold text-bg disabled:opacity-50">
              <Plus size={16} /> New
            </button>
          </form>
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
            {lib.playlists.length === 0 && <p className="py-6 text-center text-sm text-sub">You don’t have any playlists yet — create one above.</p>}
            {lib.playlists.map((p) => (
              <button
                key={p.id}
                onClick={async () => {
                  await lib.addToPlaylist(p.id, t);
                  close();
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-fg/10"
              >
                <PlaylistCover covers={p.covers} name={p.name} className="h-12 w-12" collaborative={p.isCollaborative} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-sub">
                    {p.trackCount} songs{p.isCollaborative ? " · Collaborative" : ""}
                    {p.role === "collaborator" ? " · Shared with you" : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
