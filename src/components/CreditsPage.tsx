import React from 'react';
import {
  Award,
  Sparkles,
  Heart,
  User,
  ShieldCheck,
  Database,
  Radio,
  Clock,
  Compass,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  BookOpen,
  Lock,
  Smartphone,
  Shield
} from 'lucide-react';
import { ActiveTab } from '../types/prayer';

interface CreditsPageProps {
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const CreditsPage: React.FC<CreditsPageProps> = ({ onNavigateToTab }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          Dokumentasi & Penghargaan Projek
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Kredit & Pembangunan SolatKini
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Inisiatif perisian waktu solat moden, kompas kiblat tepat, dan peringatan azan berteraskan piawaian data rasmi Jabatan Kemajuan Islam Malaysia (JAKIM).
        </p>
      </div>

      {/* Main Attribution Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Musa Bin Sarudin (Pencetus Visi) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-xl flex flex-col justify-between group hover:border-emerald-500/50 transition">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold tracking-wider uppercase">
                Pencetus Visi & Konsep
              </span>
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-md">
                <User className="w-5 h-5" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Ketua Projek & Idea</p>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                Musa Bin Sarudin
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mengemudi reka bentuk pengalaman pengguna dan keperluan teknikal SolatKini Malaysia. Menumpukan kepada ketepatan jadual zon solat JAKIM tanpa kompromi, sistem laungan azan luar talian yang tidak terjejas oleh sekatan bateri Android, serta susun atur antaramuka yang bersih untuk kemudahan seisi keluarga.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-900/50 font-medium">
                Penyelaras Takwim JAKIM
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-emerald-300 border border-emerald-900/50 font-medium">
                Reka Bentuk Pengalaman Pengguna
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dibangunkan untuk kemaslahatan komuniti Muslim Malaysia</span>
          </div>
        </div>

        {/* Card 2: Kejuruteraan & Arkitektur Sistem */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-xl flex flex-col justify-between group hover:border-indigo-500/50 transition">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold tracking-wider uppercase">
                Arkitektur & Kejuruteraan
              </span>
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Pelaksanaan Perisian</p>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                Gemini 3.8
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Membangunkan struktur kod penuh aplikasi merangkumi penyelarasan algoritma falak tempatan, servis penggera tepat Android AlarmManager, pengurusan audio IndexedDB luar talian, sokongan widget desktop telefon, dan sistem togol auto-start peranti.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-900/50 font-medium">
                React 19 & TypeScript SPA
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-indigo-300 border border-indigo-900/50 font-medium">
                Capacitor Native Android Bridge
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
            <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Dibina dengan seni bina modular, ringan & pantas</span>
          </div>
        </div>
      </div>

      {/* JAKIM & Official Authority Source Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-7 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                Piawaian & Ketepatan Takwim Rasmi
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Disahkan Tepat
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rujukan rasmi Jabatan Kemajuan Islam Malaysia (JAKIM) & Jabatan Mufti Seluruh Negeri
              </p>
            </div>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-emerald-400 shrink-0">
            60 Zon Waktu Solat
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" /> Portal e-Solat JAKIM
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Penyelarasan automatik secara langsung dengan pangkalan data waktu solat kerajaan mengikut kod kawasan JAKIM.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 shrink-0" /> Sandaran Falak Luar Talian
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pengiraan algoritma matematik falak tempatan berasaskan latitud dan longitud jika ketiadaan akses internet.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4 shrink-0" /> Trigonometri Kiblat Kaabah
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Formula Geodesik sfera mengira unjuran darjah azimut Kaabah Makkah (21.4225° U, 39.8262° T) dengan getaran haptik.
            </p>
          </div>
        </div>
      </div>

      {/* Privasi & Integriti Data */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-7 shadow-lg">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Komitmen Privasi & Keselamatan Pengguna
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Sifar Penjejakan Data
            </div>
            <p className="text-slate-300 leading-relaxed">
              Aplikasi tidak mengumpul, menjejak, atau menjual profil pengguna. Semua data tetapan disimpan dalam peranti anda sendiri.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 100% Bebas Iklan
            </div>
            <p className="text-slate-300 leading-relaxed">
              Bebas daripada sebarang iklan komersial, sepanduk promosi, atau video pop-up bagi memelihara kekhusyukan ibadah.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Penggunaan GPS Setempat
            </div>
            <p className="text-slate-300 leading-relaxed">
              Koordinat GPS hanya digunakan pada masa nyata untuk memadankan zon waktu solat terdekat dan tidak dihantar ke mana-mana pelayan luar.
            </p>
          </div>
        </div>
      </div>

      {/* System Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Versi Aplikasi</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">v2.5.0</div>
            <p className="text-xs text-slate-400 mt-0.5">SolatKini Android APK</p>
          </div>
          <div className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-fit">
            Sokongan Android 8.0 - 15
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Teras Kejuruteraan</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">React 19 & Tailwind CSS</div>
            <p className="text-xs text-slate-400 mt-0.5">Capacitor Android, Exact Alarm & Web Audio API</p>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
            Ringan & Jimat Penggunaan Bateri
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Koleksi Suara Azan</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">7 Alunan Muadzin Rasmi</div>
            <p className="text-xs text-slate-400 mt-0.5">JAKIM Malaysia, Makkah, Madinah, Al-Aqsa & Subuh</p>
          </div>
          <div className="text-[11px] text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/40 w-fit">
            Audio Berkualiti Tinggi (MP3 Luar Talian)
          </div>
        </div>
      </div>

      {/* Dedication & Du'a */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 p-6 sm:p-8 text-center space-y-4">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Heart className="w-5 h-5 fill-emerald-500/20 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-white">Dedikasi & Amal Jariah</h3>
          <p className="text-emerald-300 font-arabic text-lg sm:text-xl pt-1">
            رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ
          </p>
          <p className="text-xs text-slate-400 italic">
            &quot;Wahai Tuhan kami! Terimalah amalan daripada kami; sesungguhnya Engkaulah Yang Maha Mendengar lagi Maha Mengetahui.&quot; (Surah Al-Baqarah: 127)
          </p>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Semoga setiap laungan azan yang diperingatkan dan setiap rakaat solat yang ditunaikan melalui aplikasi ini menjadi bekalan amal jariah yang berpanjangan buat seluruh warga penggerak projek, keluarga, serta seluruh masyarakat Islam.
        </p>

        {onNavigateToTab && (
          <div className="pt-3 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateToTab('solat')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Kembali ke Waktu Solat
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('kiblat')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              Kompas Kiblat
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('doa')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer"
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
