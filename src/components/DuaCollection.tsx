import React, { useState } from 'react';
import { Search, Bookmark, BookmarkCheck, Copy, Check, Sparkles, BookOpen, Heart, Eye, EyeOff } from 'lucide-react';
import { DUA_COLLECTION } from '../data/wiridAndDoa';
import { DuaItem } from '../types/prayer';

type FontSize = 'normal' | 'large' | 'xlarge' | '4xl';

export const DuaCollection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Saiz Tulisan
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_dua_font_size') as FontSize;
      if (saved === 'normal' || saved === 'large' || saved === 'xlarge' || saved === '4xl') return saved;
    }
    return 'large';
  });

  const handleSetFontSize = (s: FontSize) => {
    setFontSize(s);
    if (typeof window !== 'undefined') {
      localStorage.setItem('solatkini_dua_font_size', s);
    }
  };

  // Kawalan Collapse / Expand Paparan (Arab, Rumi, Terjemahan)
  const [showArabic, setShowArabic] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_show_arabic');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [showRumi, setShowRumi] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_show_rumi');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [showTranslation, setShowTranslation] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('solatkini_show_translation');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const toggleArabic = () => {
    setShowArabic((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_show_arabic', String(next));
      return next;
    });
  };

  const toggleRumi = () => {
    setShowRumi((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_show_rumi', String(next));
      return next;
    });
  };

  const toggleTranslation = () => {
    setShowTranslation((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') localStorage.setItem('solatkini_show_translation', String(next));
      return next;
    });
  };

  // Penanda Buku (Bookmarks)
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('solatkini_dua_bookmarks');
        return saved ? JSON.parse(saved) : ['dua-selepas-solat', 'dua-kedua-ibu-bapa'];
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleToggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('solatkini_dua_bookmarks', JSON.stringify(next));
      }
      return next;
    });
  };

  const handleCopy = (dua: DuaItem) => {
    const textToCopy = `${dua.title}\n\n${dua.arabic}\n\n"${dua.transliteration || ''}"\n\nTerjemahan:\n${dua.translation || ''}\n\n(${dua.reference || 'SolatKini Malaysia'})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(dua.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const categories = [
    { id: 'semua', label: 'Semua Doa' },
    { id: 'kegemaran', label: 'Kegemaran' },
    { id: 'selepas_solat', label: 'Selepas Solat' },
    { id: 'pagi_petang', label: 'Pagi & Petang' },
    { id: 'harian', label: 'Doa Harian' },
    { id: 'puasa', label: 'Puasa & Berbuka' },
    { id: 'ibu_bapa_keluarga', label: 'Ibu Bapa & Keluarga' },
    { id: 'perlindungan_rezeki', label: 'Rezeki & Perlindungan' },
  ];

  const filteredDuas = (DUA_COLLECTION || []).filter((item) => {
    const isBookmarked = bookmarks.includes(item.id);

    if (selectedCategory === 'kegemaran' && !isBookmarked) {
      return false;
    }
    if (selectedCategory !== 'semua' && selectedCategory !== 'kegemaran' && item.category !== selectedCategory) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.transliteration || '').toLowerCase().includes(q) ||
      (item.translation || '').toLowerCase().includes(q)
    );
  });

  const fontStyles = {
    normal: {
      arabic: 'text-lg sm:text-xl leading-relaxed',
      rumi: 'text-xs sm:text-sm',
      translation: 'text-xs sm:text-sm',
    },
    large: {
      arabic: 'text-xl sm:text-2xl leading-loose',
      rumi: 'text-sm sm:text-base',
      translation: 'text-sm sm:text-base',
    },
    xlarge: {
      arabic: 'text-2xl sm:text-3xl leading-loose',
      rumi: 'text-base sm:text-lg',
      translation: 'text-base sm:text-lg',
    },
    '4xl': {
      arabic: 'text-3xl sm:text-4xl leading-loose',
      rumi: 'text-lg sm:text-xl',
      translation: 'text-lg sm:text-xl',
    },
  }[fontSize];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 select-none">
      {/* Header, Controls & Search */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase mb-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              Koleksi Doa Mustajab
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Koleksi Doa Harian
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Doa-doa sahih yang bersumberkan Al-Quran dan Hadis Nabawi
            </p>
          </div>

          {/* Action Toolbar: Saiz Tulisan & Togol Collapse Teks */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* 1. Selector Saiz Tulisan */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 px-1.5 font-medium">Saiz:</span>
              {(['normal', 'large', 'xlarge', '4xl'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSetFontSize(s)}
                  title={s === '4xl' ? 'Saiz Ekstra 4XL' : undefined}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    fontSize === s
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'normal' ? 'A' : s === 'large' ? 'A+' : s === 'xlarge' ? 'A++' : 'A+++'}
                </button>
              ))}
            </div>

            {/* 2. Selector Collapse/Expand: Jawi/Arab, Rumi, Terjemahan */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={toggleArabic}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                  showArabic
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                }`}
                title={showArabic ? 'Sorokkan teks Arab' : 'Tunjukkan teks Arab'}
              >
                {showArabic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Jawi</span>
              </button>

              <button
                type="button"
                onClick={toggleRumi}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                  showRumi
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                }`}
                title={showRumi ? 'Sorokkan teks Rumi' : 'Tunjukkan teks Rumi'}
              >
                {showRumi ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Rumi</span>
              </button>

              <button
                type="button"
                onClick={toggleTranslation}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                  showTranslation
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                }`}
                title={showTranslation ? 'Sorokkan Terjemahan' : 'Tunjukkan Terjemahan'}
              >
                {showTranslation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Maksud</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="mt-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari doa (cth: rezeki, ibu bapa, istighfar, duka)..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition active:scale-95 cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {c.id === 'kegemaran' && <Heart className="w-3 h-3 inline mr-1 text-red-400" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <span>Menjumpai {filteredDuas.length} doa</span>
        {bookmarks.length > 0 && (
          <span className="text-amber-300 font-medium">
            {bookmarks.length} doa disimpan dalam kegemaran
          </span>
        )}
      </div>

      {/* Duas List */}
      <div className="space-y-4">
        {filteredDuas.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-slate-400">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">Tiada doa dijumpai untuk carian ini.</p>
            <p className="text-xs text-slate-500 mt-1">Cuba kata kunci lain atau pilih Semua Doa.</p>
          </div>
        ) : (
          filteredDuas.map((dua) => {
            const isBookmarked = bookmarks.includes(dua.id);
            const isCopied = copiedId === dua.id;

            return (
              <div
                key={dua.id}
                className="glass-card rounded-2xl p-6 border border-white/5 hover:border-emerald-500/25 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    {dua.title}
                  </h3>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(dua.id)}
                      className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition active:scale-95 cursor-pointer ${
                        isBookmarked
                          ? 'text-red-400 bg-red-950/40'
                          : 'text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                      title={isBookmarked ? 'Keluarkan dari kegemaran' : 'Simpan kegemaran'}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(dua)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900/60 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
                      title="Salin Teks Doa"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 1. Teks Arab / Jawi (Boleh Collapse) */}
                {showArabic && (
                  <p className={`font-arabic text-right text-emerald-200 transition-all duration-150 ${fontStyles.arabic}`}>
                    {dua.arabic}
                  </p>
                )}

                {/* 2. Teks Rumi (Boleh Collapse) */}
                {showRumi && (
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <p className={`text-slate-300 italic leading-relaxed transition-all duration-150 ${fontStyles.rumi}`}>
                      &quot;{dua.transliteration}&quot;
                    </p>
                  </div>
                )}

                {/* 3. Teks Terjemahan / Maksud (Boleh Collapse) */}
                {showTranslation && (
                  <p className={`text-slate-400 leading-relaxed transition-all duration-150 ${fontStyles.translation}`}>
                    <strong className="text-slate-300">Terjemahan:</strong> {dua.translation}
                  </p>
                )}

                {/* Amaran ringkas jika pengguna collapse ketiga-tiga bahagian */}
                {!showArabic && !showRumi && !showTranslation && (
                  <div className="py-3 px-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
                    Semua teks disorokkan. Klik butang <strong>Jawi</strong>, <strong>Rumi</strong>, atau <strong>Maksud</strong> di atas untuk memaparkan kembali.
                  </div>
                )}

                {/* Reference */}
                {dua.reference && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400/80 flex items-center justify-between">
                    <span>Sumber: {dua.reference}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
