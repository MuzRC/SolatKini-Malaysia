import React from 'react';
import {
  Award,
  Sparkles,
  Heart,
  Bot,
  User,
  ShieldCheck,
  Database,
  Radio,
  Clock,
  Compass,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { ActiveTab } from '../types/prayer';

interface CreditsPageProps {
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const CreditsPage: React.FC<CreditsPageProps> = ({ onNavigateToTab }) => {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          Penghargaan & Profil Sistem
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Kredit & Pembangunan SolatKini
        </h1>
        <p className="text-sm sm:text-base text-slate-300">
          Aplikasi waktu solat moden, kompas kiblat, penjejak puasa dan azan audio asli berteraskan ketepatan takwim rasmi JAKIM.
        </p>
      </div>

      {/* Main Attribution Showcase: Musa Bin Sarudin & Gemini 3.8 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card 1: Musa Bin Sarudin (Idea) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-xl shadow-emerald-950/30 flex flex-col justify-between group hover:border-emerald-500/50 transition">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide uppercase">
                Pencetus Idea & Visi
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-md">
                <User className="w-6 h-6" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Idea Asal Oleh</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Musa Bin Sarudin
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Pencetus gagasan dan reka bentuk konsep aplikasi SolatKini Malaysia. Menekankan kemudahan akses waktu solat yang tepat, sokongan laungan azan vokal asli tanpa bergantung semata-mata kepada internet, serta pengalaman pengguna yang bersih dan mesra semua peringkat umur.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-900/50">
                💡 Konsep & Arah Tuju
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-900/50">
                🇲🇾 Zon Waktu JAKIM
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-900/50">
                🕌 Mesra Jemaah & Komuniti
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Dedikasi khas untuk kemudahan ibadah harian</span>
          </div>
        </div>

        {/* Card 2: Gemini 3.8 (Pelaksanaan) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-xl shadow-indigo-950/30 flex flex-col justify-between group hover:border-indigo-500/50 transition">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold tracking-wide uppercase">
                Kejuruteraan & Arkitektur
              </span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
                <Bot className="w-6 h-6" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Dilaksanakan Oleh</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Gemini 3.8
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Melaksanakan pembinaan penuh aplikasi daripada seni bina kod, algoritma falak, pengurusan memori audio IndexedDB luar talian, pemulihan ralat, reka bentuk antara muka responsif Tailwind CSS, serta integrasi automatik GPS dan PWA.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-900/50">
                ⚡ TypeScript & React SPA
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-900/50">
                🔊 Audio Engine & Cache Offline
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-900/50">
                🧭 Kaedah Hisab Falak GPS
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Dikuasakan oleh model kecerdasan buatan Gemini</span>
          </div>
        </div>
      </div>

      {/* JAKIM & Official Authority Source Card */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Sumber Data Rasmi Waktu Solat
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Sah & Tepat
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Jabatan Kemajuan Islam Malaysia (JAKIM) & Jabatan Mufti Negeri-Negeri
              </p>
            </div>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400">
            60 Zon Seluruh Malaysia
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> e-Solat JAKIM
            </div>
            <p className="text-xs text-slate-300">
              Penyelarasan automatik terus daripada pelayan waktu solat rasmi mengikut kod zon daerah dan negeri.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" /> Sandaran Luar Talian
            </div>
            <p className="text-xs text-slate-300">
              Pengiraan algoritma falak tempatan berasaskan latitud/longitud zon sekiranya ketiadaan sambungan internet.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Falak Kiblat Kaabah
            </div>
            <p className="text-xs text-slate-300">
              Formula trigonometri sfera Geodesik mengira sudut darjah kiblat ke Kaabah (21.4225° N, 39.8262° E).
            </p>
          </div>
        </div>
      </div>

      {/* System Specifications & Release Details */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Versi Aplikasi</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">v2.5.0</div>
            <p className="text-xs text-slate-400 mt-1">SolatKini Progressive Web App (PWA)</p>
          </div>
          <div className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-fit">
            Ready for Offline Use
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Teras Teknologi</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">React + Vite + Tailwind</div>
            <p className="text-xs text-slate-400 mt-1">TypeScript 5, IndexedDB Audio Storage, Web Audio API</p>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
            Sifar Kebergantungan Pihak Ketiga Berat
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Koleksi Suara Azan</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">7 Rakaman Vokal Penuh</div>
            <p className="text-xs text-slate-400 mt-1">JAKIM Malaysia, Makkah, Madinah, Al-Aqsa, Subuh & Takbir Raya</p>
          </div>
          <div className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-fit">
            100% Fail Tempatan (MP3 Asli)
          </div>
        </div>
      </div>

      {/* Heartfelt Dedication & Du'a */}
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Heart className="w-6 h-6 fill-emerald-500/20 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">Dedikasi & Amal Jariah</h3>
          <p className="text-xs sm:text-sm text-emerald-300 font-arabic text-base sm:text-lg">
            رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ
          </p>
          <p className="text-xs text-slate-400 italic">
            "Wahai Tuhan kami! Terimalah amalan daripada kami; sesungguhnya Engkaulah Yang Maha Mendengar lagi Maha Mengetahui." (Surah Al-Baqarah: 127)
          </p>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Semoga setiap laungan azan yang diperingatkan, setiap rakaat solat yang ditegakkan, dan setiap doa yang dipanjatkan melalui aplikasi ini menjadi amal jariah yang berterusan untuk pencetus idea, pembangun, keluarga, dan seluruh masyarakat Islam.
        </p>

        {onNavigateToTab && (
          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigateToTab('solat')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Clock className="w-4 h-4" />
              Kembali ke Waktu Solat
            </button>
            <button
              onClick={() => onNavigateToTab('kiblat')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              Kompas Kiblat
            </button>
            <button
              onClick={() => onNavigateToTab('doa')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Koleksi Doa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
