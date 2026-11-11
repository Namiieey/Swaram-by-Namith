import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, Home, Languages, Library, ListPlus, ListEnd, Music2, Search, Disc3, UserRound, X, ExternalLink, Pencil } from 'lucide-react';
import { LANGS, langOf } from '../lib/languages';
import { useStore, View } from '../store';

export const CREDIT_URL = 'https://namithrn.vercel.app';

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.29 }} className="relative grid flex-none place-items-center bg-gradient-to-br from-accent to-accent2 shadow-[0_8px_26px_-6px_rgba(250,45,72,.7)]">
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/35 to-transparent" style={{ maskImage: 'linear-gradient(#000, transparent 55%)', WebkitMaskImage: 'linear-gradient(#000, transparent 55%)' }} />
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 18V6l11-2v12" /><circle cx="6" cy="18" r="2.4" fill="#fff" /><circle cx="17" cy="16" r="2.4" fill="#fff" />
      </svg>
    </div>
  );
}

const NAV: { k: View; label: string; icon: typeof Home }[] = [
  { k: 'home', label: 'Listen Now', icon: Home },
  { k: 'search', label: 'Search', icon: Search },
  { k: 'library', label: 'Library', icon: Library }
];

export function Sidebar() {
  const view = useStore(s => s.view); const nav = useStore(s => s.nav);
  const langs = useStore(s => s.langs); const open = useStore(s => s.openLangSheet);
  return (
    <aside className="glass glass-thick fixed bottom-3 left-3 top-3 z-50 hidden w-[244px] flex-col rounded-[28px] p-4 lg:flex">
      <div className="flex items-center gap-3 px-2 pb-5 pt-2">
        <LogoMark />
        <div className="leading-tight">
          <b className="block text-[19px] font-extrabold tracking-tight">Swaram</b>
          <span className="text-xs text-white/50">by Namith</span>
        </div>
      </div>
      <button onClick={() => nav('search')} className="mb-3 flex h-10 items-center gap-2 rounded-xl bg-white/[.08] px-3 text-sm text-white/45 transition hover:bg-white/[.13]">
        <Search size={16} /> Search <kbd className="ml-auto rounded bg-white/10 px-1.5 text-[10px] font-semibold">/</kbd>
      </button>
      <nav className="flex flex-col gap-1">
        {NAV.map(n => (
          <button key={n.k} onClick={() => nav(n.k)} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${view === n.k ? 'text-white' : 'text-white/70 hover:bg-white/[.06]'}`}>
            {view === n.k && <motion.span layoutId="navpill" className="absolute inset-0 rounded-xl bg-white/[.12] shadow-[inset_0_1px_0_rgba(255,255,255,.2)]" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <n.icon size={19} className={`relative ${view === n.k ? 'text-accent' : ''}`} /><span className="relative">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-6 px-2">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[.14em] text-white/40">
          Your Languages
          <button onClick={() => open(true)} aria-label="Edit languages" className="grid size-6 place-items-center rounded-full transition hover:bg-white/10 hover:text-white"><Pencil size={12} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {langs.map(c => (
            <span key={c} className="rounded-full bg-white/[.09] px-2.5 py-1 text-xs font-semibold text-white/80">{langOf(c)?.native ?? c}</span>
          ))}
          <button onClick={() => open(true)} className="rounded-full border border-dashed border-white/25 px-2.5 py-1 text-xs font-semibold text-white/60 transition hover:border-white/50 hover:text-white">+ Add</button>
        </div>
      </div>

      <a href={CREDIT_URL} target="_blank" rel="noreferrer" className="group mt-auto rounded-2xl bg-white/[.06] p-3.5 text-[12px] leading-snug text-white/55 ring-1 ring-white/[.06] transition hover:bg-white/[.1]">
        <span className="block text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Designed & built by</span>
        <span className="mt-1 flex items-center gap-1.5 text-[14px] font-bold text-white">Namith RN <ExternalLink size={12} className="opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></span>
        <span className="mt-1.5 block text-[11px] text-white/35">Streams via the unofficial JioSaavn API. Lyrics by LRCLIB.</span>
      </a>
    </aside>
  );
}

export function TabBar() {
  const view = useStore(s => s.view); const nav = useStore(s => s.nav);
  const items = NAV.filter(n => n.k !== 'search');
  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] flex items-center justify-center gap-3 px-4 lg:hidden" style={{ paddingBottom: 'calc(var(--safe-b) + 10px)' }}>
      <nav className="glass refract flex h-[62px] flex-1 items-center rounded-full p-1.5" style={{ maxWidth: 360 }}>
        {items.map(n => (
          <button key={n.k} onClick={() => nav(n.k)} className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold transition-colors ${view === n.k ? 'text-accent' : 'text-white/65'}`}>
            {view === n.k && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-full bg-white/[.14] shadow-[inset_0_1px_0_rgba(255,255,255,.25)]" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <n.icon size={22} className="relative" /><span className="relative">{n.label}</span>
          </button>
        ))}
      </nav>
      <button aria-label="Search" onClick={() => nav('search')} className={`glass refract glass-btn grid size-[62px] flex-none place-items-center rounded-full ${view === 'search' ? 'text-accent' : 'text-white/80'}`}>
        <Search size={24} />
      </button>
    </div>
  );
}

export function Splash({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-[#050506]"
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="aurora"><i /><i /><i /></div>
          <motion.div initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative bg-gradient-to-r from-white via-white to-accent2 bg-clip-text text-[clamp(60px,14vw,120px)] font-extrabold leading-tight tracking-tight text-transparent">
            സ്വരം
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="relative text-[13px] font-semibold uppercase tracking-[.45em] text-white/55">
            Swaram <span className="text-accent">·</span> by Namith
          </motion.div>
          <div className="relative mt-8 h-0.5 w-28 overflow-hidden rounded bg-white/10"><i className="block h-full w-2/5 bg-accent" style={{ animation: 'slide 1.1s infinite var(--ease-swaram)' }} /></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- language picker ---------- */
export function LanguageSheet() {
  const open = useStore(s => s.langSheet); const onboarded = useStore(s => s.onboarded);
  const langs = useStore(s => s.langs); const setLangs = useStore(s => s.setLangs);
  const openSheet = useStore(s => s.openLangSheet); const finish = useStore(s => s.finishOnboarding);
  const visible = open || !onboarded;
  const first = !onboarded;

  const toggle = (c: string) => setLangs(langs.includes(c) ? langs.filter(x => x !== c) : [...langs, c]);
  const done = () => { if (!langs.length) return; if (first) finish(); else openSheet(false); };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="lsheet" className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !first && openSheet(false)} />
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="glass glass-thick relative flex max-h-[92dvh] w-full flex-col rounded-t-[32px] sm:max-w-[640px] sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6 sm:px-8 sm:pt-8">
              <div>
                {first && <div className="mb-2"><LogoMark size={44} /></div>}
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{first ? 'Welcome to Swaram' : 'Song languages'}</h2>
                <p className="mt-1 text-sm text-white/55">{first ? 'Pick the languages you love — choose as many as you like. You can change this anytime.' : 'Home, mixes and search will be tuned to your languages.'}</p>
              </div>
              {!first && <button aria-label="Close" onClick={() => openSheet(false)} className="glass-clear grid size-9 flex-none place-items-center rounded-full"><X size={17} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2.5 overflow-y-auto px-5 pb-4 pt-2 sm:grid-cols-3 sm:px-8">
              {LANGS.map(l => {
                const on = langs.includes(l.code);
                return (
                  <button key={l.code} onClick={() => toggle(l.code)} aria-pressed={on}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 text-left ring-1 transition duration-300 active:scale-95 ${on ? 'bg-white/[.14] ring-white/50' : 'bg-white/[.05] ring-white/10 hover:bg-white/[.1]'}`}>
                    <span style={{ background: l.g }} className="grid size-11 flex-none place-items-center rounded-xl text-lg font-extrabold text-white shadow-lg">{l.glyph}</span>
                    <span className="min-w-0 leading-tight"><b className="block truncate text-[15px]">{l.native}</b><span className="text-xs text-white/50">{l.name}</span></span>
                    <AnimatePresence>
                      {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-accent text-white"><Check size={12} strokeWidth={3.5} /></motion.span>}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4 pb-safe sm:px-8">
              <span className="text-sm text-white/50">{langs.length ? `${langs.length} selected` : 'Select at least one'}</span>
              <button onClick={done} disabled={!langs.length} className="rounded-full bg-accent px-7 py-3 text-[15px] font-bold text-white shadow-[0_12px_26px_-10px_rgba(250,45,72,.9)] transition hover:scale-[1.03] active:scale-95 disabled:opacity-40">
                {first ? 'Start listening' : 'Done'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- toast ---------- */
export function Toast() {
  const msg = useStore(s => s.toastMsg); const n = useStore(s => s.toastN);
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => useStore.setState({ toastMsg: '' }), 2400);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex justify-center px-4" style={{ paddingTop: 'calc(var(--safe-t) + 14px)' }}>
      <AnimatePresence>
        {msg && (
          <motion.div key={n} initial={{ y: -70, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -40, opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="glass glass-thick refract max-w-full rounded-full px-5 py-3 text-sm font-semibold">
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- song context menu ---------- */
export function SongMenu() {
  const menu = useStore(s => s.menu); const close = useStore(s => s.closeMenu);
  const s = useStore();
  useEffect(() => {
    if (!menu) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [menu, close]);
  const t = menu?.track;
  const fav = t ? s.favs.some(f => f.id === t.id) : false;
  const items = t ? [
    { icon: ListEnd, label: 'Play Next', run: () => s.playNext(t) },
    { icon: ListPlus, label: 'Add to Queue', run: () => s.addToQueue(t) },
    { icon: Heart, label: fav ? 'Remove from Library' : 'Add to Library', run: () => s.toggleFav(t) },
    ...(t.albumId ? [{ icon: Disc3, label: 'Go to Album', run: () => s.openDetail({ type: 'album', id: t.albumId }) }] : []),
    ...(t.artists[0] ? [{ icon: UserRound, label: 'Go to Artist', run: () => s.openDetail({ type: 'artist', id: t.artists[0].id }) }] : []),
    { icon: Search, label: 'Search similar', run: () => s.goSearch(t.artists[0]?.name || t.name) }
  ] : [];
  const desktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const x = menu ? Math.min(Math.max(12, menu.x - 230), window.innerWidth - 242) : 0;
  const y = menu ? Math.min(menu.y + 6, window.innerHeight - 330) : 0;
  return (
    <AnimatePresence>
      {menu && t && (
        <motion.div key="menu" className="fixed inset-0 z-[110]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <div className={`absolute inset-0 ${desktop ? '' : 'bg-black/50'}`} />
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={desktop ? { opacity: 0, scale: 0.92, y: -6 } : { y: 300 }} animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }} exit={desktop ? { opacity: 0, scale: 0.95 } : { y: 300 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={desktop ? { left: x, top: y, width: 230, transformOrigin: 'top right' } : { left: 10, right: 10, bottom: 10, paddingBottom: 'var(--safe-b)' }}
            className="glass glass-thick absolute rounded-3xl p-2"
          >
            {!desktop && (
              <div className="flex items-center gap-3 border-b border-white/10 p-3">
                <img src={t.thumb || t.img} alt="" className="size-12 rounded-lg object-cover" />
                <div className="min-w-0"><div className="truncate font-semibold">{t.name}</div><div className="truncate text-sm text-white/55">{t.artist}</div></div>
              </div>
            )}
            {items.map(it => (
              <button key={it.label} onClick={() => { close(); it.run(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition hover:bg-white/10 active:bg-white/15">
                <it.icon size={18} className="text-white/70" />{it.label}
              </button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { Languages, Music2 };
