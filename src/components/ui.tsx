"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Music2, Pause, Play, X } from "lucide-react";
import { useUI } from "@/context/app";
import { cn, hashColor, initials } from "@/lib/utils";

/* ───────────── Cover / Avatar ───────────── */
export function Cover({
  src,
  alt,
  className,
  round,
  iconSize = 28,
}: {
  src?: string;
  alt: string;
  className?: string;
  round?: boolean;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden bg-elev", round ? "rounded-full" : "rounded-[6px]", className)}
      style={!src || failed ? { background: `linear-gradient(135deg, ${hashColor(alt, 50, 32)}, ${hashColor(alt + "x", 60, 18)})` } : undefined}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <Music2 size={iconSize} />
        </div>
      )}
    </div>
  );
}

export function Avatar({
  name,
  src,
  color,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-black", className)}
      style={{ width: size, height: size, background: color ?? hashColor(name, 60, 55), fontSize: Math.max(10, size * 0.38) }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

/* ───────────── Buttons ───────────── */
export function IconBtn({
  children,
  active,
  className,
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        "press grid shrink-0 place-items-center rounded-full transition disabled:opacity-40",
        active ? "text-brand" : "text-sub hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PlayFab({
  playing,
  onClick,
  size = 56,
  className,
  label,
}: {
  playing?: boolean;
  onClick?: () => void;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <button
      aria-label={label ?? (playing ? "Pause" : "Play")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "press grid shrink-0 place-items-center rounded-full bg-brand text-onbrand shadow-xl transition hover:scale-105 hover:bg-brand-hover",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {playing ? <Pause size={size * 0.46} fill="currentColor" /> : <Play size={size * 0.46} fill="currentColor" className="translate-x-[1px]" />}
    </button>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active ? "bg-brand text-onbrand" : "bg-fg/10 text-fg hover:bg-fg/15",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ───────────── Equalizer ───────────── */
export function EqBars({ playing = true, className }: { playing?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-3.5 items-end gap-[2px] text-brand", !playing && "eq-paused", className)} aria-hidden>
      {[0, 0.25, 0.5, 0.15].map((d, i) => (
        <span key={i} className="eq-bar w-[3px] rounded-sm bg-current" style={{ height: "100%", animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

/* ───────────── Section / Shelf ───────────── */
export function SectionHeader({ title, href, action }: { title: string; href?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[22px] font-bold tracking-tight hover:underline">{href ? <Link href={href}>{title}</Link> : title}</h2>
      {action}
    </div>
  );
}

export function Shelf({ title, href, children, action }: { title: string; href?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="fade-up mb-8">
      <SectionHeader title={title} href={href} action={action} />
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">{children}</div>
    </section>
  );
}

export function ShelfSkeleton({ round }: { round?: boolean }) {
  return (
    <div className="mb-8">
      <div className="skeleton mb-4 h-6 w-48 rounded" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-40 shrink-0 md:w-44">
            <div className={cn("skeleton aspect-square w-full", round ? "rounded-full" : "rounded-md")} />
            <div className="skeleton mt-3 h-3.5 w-3/4 rounded" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass mx-auto my-10 max-w-md rounded-2xl p-6 text-center">
      <p className="text-lg font-bold">Something went off-beat</p>
      <p className="mt-1 text-sm text-sub">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="press mt-4 rounded-full bg-fg px-5 py-2 text-sm font-bold text-bg">
          Try again
        </button>
      )}
    </div>
  );
}

/* ───────────── Modal ───────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-6" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "glass-pop pop-in max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl p-5 text-fg md:rounded-3xl md:p-6",
          wide ? "md:max-w-2xl" : "md:max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="press grid h-8 w-8 place-items-center rounded-full bg-fg/10 hover:bg-fg/20">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ───────────── Popover menu ───────────── */
export type MenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
};

export function PopMenu({ trigger, items, title }: { trigger: (open: () => void, isOpen: boolean) => ReactNode; items: MenuItem[]; title?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openMenu = () => {
    const r = anchor.current?.getBoundingClientRect();
    if (r) setPos({ x: r.right, y: r.bottom });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  let style: React.CSSProperties = {};
  if (!mobile && pos) {
    const w = 244;
    const h = visible.length * 40 + 16;
    const left = Math.max(8, Math.min(pos.x - w, window.innerWidth - w - 8));
    const top = pos.y + h > window.innerHeight - 8 ? Math.max(8, pos.y - h - 36) : pos.y + 4;
    style = { left, top, width: w };
  }

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {trigger(openMenu, open)}
      </span>
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[95]" onMouseDown={() => setOpen(false)}>
            <div
              ref={menu}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "glass-pop pop-in absolute p-1.5 text-fg",
                mobile ? "inset-x-0 bottom-0 rounded-t-3xl p-3 pb-8" : "rounded-xl",
              )}
              style={style}
            >
              {mobile && title && <div className="mb-2 border-b border-line px-2 pb-3">{title}</div>}
              {visible.map((it, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-fg/10",
                    it.danger && "text-red-400",
                  )}
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center text-sub">{it.icon}</span>
                  <span className="truncate">{it.label}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ───────────── Toasts ───────────── */
export function Toasts() {
  const { toasts } = useUI();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[120] flex flex-col items-center gap-2 px-4 md:bottom-28">
      {toasts.map((t) => (
        <div key={t.id} className="glass-dark pop-in max-w-sm rounded-full px-5 py-2.5 text-center text-sm font-medium">
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ───────────── Credits ───────────── */
export function Credits({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-sub", className)}>
      Developed by{" "}
      <a href="https://namithrn.vercel.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-fg underline-offset-2 hover:text-brand hover:underline">
        Namith RN
      </a>
    </p>
  );
}

export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-full bg-brand text-onbrand shadow-[0_0_24px_-4px_var(--brand)]"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M4 13v-2M8 17V7M12 21V3M16 17V7M20 13v-2" />
        </svg>
      </span>
      {withText && (
        <span className="leading-none">
          <span className="block text-[19px] font-extrabold tracking-tight">Swaram</span>
          <span className="block pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-sub">by Namith</span>
        </span>
      )}
    </span>
  );
}
