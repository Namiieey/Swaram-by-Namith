import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrolled } from './lib/hooks';
import { audio } from './lib/audio';
import { useStore } from './store';
import { LanguageSheet, Sidebar, SongMenu, Splash, TabBar, Toast } from './components/Shell';
import MiniPlayer from './components/MiniPlayer';
import FullPlayer from './components/FullPlayer';
import DetailHost from './components/Detail';
import Home from './views/Home';
import Search from './views/Search';
import Library from './views/Library';

const TITLES = { home: 'Listen Now', search: 'Search', library: 'Library' } as const;

export default function App() {
  const view = useStore(s => s.view);
  const hasDetail = useStore(s => s.details.length > 0);
  const [splash, setSplash] = useState(true);
  const scrolled = useScrolled(70);
  const showBar = scrolled && !hasDetail;

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1900);
    return () => clearTimeout(t);
  }, []);

  /* liquid glass: Chromium gets true SVG refraction, pointer-follow specular highlight everywhere */
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Chrome\//.test(ua) && !/(CriOS|FxiOS|EdgiOS)/.test(ua)) document.documentElement.classList.add('chromium');
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as Element | null)?.closest?.('.glass') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', move, { passive: true });
    return () => document.removeEventListener('pointermove', move);
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      const s = useStore.getState();
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); s.nav('search'); return; }
      if (e.key === 'Escape') {
        if (s.menu) s.closeMenu();
        else if (s.fullOpen) s.closeFull();
        else if (s.details.length) s.popDetail();
        return;
      }
      if (typing || el.tagName === 'BUTTON') { if (!(el.tagName === 'BUTTON' && e.code !== 'Space')) return; }
      if (e.code === 'Space' && s.queue.length) { e.preventDefault(); s.toggle(); }
      else if (e.key === 'ArrowRight' && s.queue.length) { if (e.shiftKey) s.next(); else audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 10); }
      else if (e.key === 'ArrowLeft' && s.queue.length) { if (e.shiftKey) s.prev(); else audio.currentTime = Math.max(0, audio.currentTime - 10); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  return (
    <>
      {/* SVG refraction filter for Liquid Glass */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="lg-distort" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="n" />
            <feGaussianBlur in="n" stdDeviation="2" result="nb" />
            <feDisplacementMap in="SourceGraphic" in2="nb" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="aurora"><i /><i /><i /></div>

      <Sidebar />

      {/* sticky glass title bar */}
      <div className={`pointer-events-none fixed inset-x-0 top-0 z-[45] flex h-[calc(var(--safe-t)+52px)] items-end justify-center border-b pb-3 transition-all duration-500 lg:left-[268px] ${showBar ? 'border-white/10 opacity-100' : 'border-transparent opacity-0'}`} style={showBar ? { WebkitBackdropFilter: 'blur(26px) saturate(1.7)', backdropFilter: 'blur(26px) saturate(1.7)', background: 'rgba(8,8,10,.6)' } : undefined}>
        <span className="text-[15px] font-bold">{TITLES[view]}</span>
      </div>

      <main className="relative z-10 px-4 pb-72 sm:px-6 lg:ml-[268px] lg:px-10 lg:pb-52">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} className="mx-auto max-w-[1280px]">
            {view === 'home' && <Home />}
            {view === 'search' && <Search />}
            {view === 'library' && <Library />}
          </motion.div>
        </AnimatePresence>
      </main>

      <DetailHost />
      <TabBar />
      <MiniPlayer />
      <FullPlayer />
      <LanguageSheet />
      <SongMenu />
      <Toast />
      <Splash show={splash} />
    </>
  );
}
