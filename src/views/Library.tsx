import { ExternalLink, Heart, Languages, Play, Shuffle } from 'lucide-react';
import { LANGS, langOf } from '../lib/languages';
import { Quality, useStore } from '../store';
import { Empty, PageHeader, Reveal, SectionHead, SongRow } from '../components/ui';
import { CREDIT_URL, LogoMark } from '../components/Shell';

export default function Library() {
  const favs = useStore(s => s.favs); const recent = useStore(s => s.recent);
  const langs = useStore(s => s.langs); const openSheet = useStore(s => s.openLangSheet);
  const play = useStore(s => s.play);
  const quality = useStore(s => s.quality); const setQuality = useStore(s => s.setQuality);

  return (
    <div>
      <PageHeader title="Library" eyebrow="Yours" />

      <Reveal>
        <SectionHead title="Favourites" sub={`${favs.length} song${favs.length === 1 ? '' : 's'}`}>
          {favs.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => play(favs, 0)} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-bold transition hover:-translate-y-0.5 active:scale-95"><Play size={15} fill="currentColor" /> Play</button>
              <button onClick={() => play(favs, 0, { shuffle: true })} className="glass glass-btn flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold"><Shuffle size={15} /> Shuffle</button>
            </div>
          )}
        </SectionHead>
        {favs.length ? (
          <div className="grid grid-cols-1 gap-x-8 xl:grid-cols-2">{favs.map((t, i) => <SongRow key={t.id} track={t} list={favs} i={i} />)}</div>
        ) : (
          <div className="glass rounded-3xl"><Empty title="No favourites yet">Tap the <Heart size={14} className="inline -mt-0.5 text-accent" fill="currentColor" /> on any song to keep it here.</Empty></div>
        )}
      </Reveal>

      <Reveal className="mt-12">
        <SectionHead title="Recently Played" />
        {recent.length ? (
          <div className="grid grid-cols-1 gap-x-8 xl:grid-cols-2">{recent.slice(0, 20).map((t, i) => <SongRow key={t.id} track={t} list={recent} i={i} />)}</div>
        ) : (
          <div className="glass rounded-3xl"><Empty title="Nothing here yet">Songs you play will show up here.</Empty></div>
        )}
      </Reveal>

      <Reveal className="mt-12">
        <SectionHead title="Preferences" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-semibold"><Languages size={19} className="text-accent" /> Song languages</div>
              <button onClick={() => openSheet(true)} className="text-sm font-semibold text-accent">Edit</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {langs.map(c => <span key={c} style={{ background: langOf(c)?.g }} className="rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg">{langOf(c)?.native ?? c}</span>)}
            </div>
            <p className="mt-3 text-xs text-white/40">{langs.length} of {LANGS.length} languages · mixes and search follow your choice.</p>
          </div>
          <div className="glass rounded-3xl p-5">
            <div className="font-semibold">Streaming quality</div>
            <p className="mt-1 text-sm text-white/50">Higher bitrates sound better and use more data.</p>
            <div className="glass-clear mt-4 inline-flex rounded-full p-[3px]">
              {(['96kbps', '160kbps', '320kbps'] as Quality[]).map(q => <button key={q} onClick={() => setQuality(q)} className={`rounded-full px-5 py-2 text-sm font-bold transition ${quality === q ? 'bg-white text-black' : 'text-white/65 hover:text-white'}`}>{q.replace('kbps', ' kbps')}</button>)}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <a href={CREDIT_URL} target="_blank" rel="noreferrer" className="glass group flex items-center gap-5 rounded-[28px] p-6 transition hover:-translate-y-0.5">
          <LogoMark size={60} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-white/40">About</div>
            <div className="mt-0.5 text-xl font-extrabold tracking-tight">Swaram by Namith</div>
            <p className="mt-1 text-sm text-white/55">Designed &amp; developed by <b className="text-white">Namith RN</b> · namithrn.vercel.app</p>
          </div>
          <ExternalLink size={18} className="text-white/40 transition group-hover:text-white" />
        </a>
        <p className="mt-4 px-1 text-xs leading-relaxed text-white/35">Streams via the unofficial JioSaavn API for personal &amp; educational use only. Lyrics provided by LRCLIB and lyrics.ovh open lyric libraries. All music, artwork and lyrics belong to their respective owners.</p>
      </Reveal>
    </div>
  );
}
