export type ThemeId =
  | 'emerald'
  | 'gold'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'red'
  | 'silver'
  | string;

export interface ThemeOption {
  id: ThemeId;
  name: string;
  nameEn: string;
  nameZh: string;
  descriptionMs: string;
  descriptionEn: string;
  descriptionZh: string;
  accentHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Zamrud',
    nameEn: 'Emerald Green',
    nameZh: '祖母绿',
    descriptionMs: 'Hijau zamrud klasik Islamik lambang ketenangan Nusantara (Lalai).',
    descriptionEn: 'Classic Islamic emerald green reflecting tranquility (Default).',
    descriptionZh: '经典伊斯兰祖母绿，象征宁静与平和（默认）。',
    accentHex: '#10b981',
  },
  {
    id: 'gold',
    name: 'Emas Diraja',
    nameEn: 'Royal Gold',
    nameZh: '皇家金',
    descriptionMs: 'Kilauan emas diraja yang mewah, hangat dan bercahaya.',
    descriptionEn: 'Luxurious royal gold, warm and radiant.',
    descriptionZh: '华丽的皇家金，温暖而光芒四射。',
    accentHex: '#f59e0b',
  },
  {
    id: 'blue',
    name: 'Biru Nilam',
    nameEn: 'Sapphire Blue',
    nameZh: '蓝宝石',
    descriptionMs: 'Biru nilam laut dalam yang jernih, tenang dan profesional.',
    descriptionEn: 'Deep crystal sapphire blue, calm and professional.',
    descriptionZh: '深邃的蓝宝石，沉静而专业。',
    accentHex: '#3b82f6',
  },
  {
    id: 'teal',
    name: 'Teal Tropika',
    nameEn: 'Tropical Teal',
    nameZh: '热带青',
    descriptionMs: 'Gabungan hijau pirus dan biru toska moden yang menyegarkan.',
    descriptionEn: 'Refreshing blend of modern turquoise and oceanic teal.',
    descriptionZh: '现代绿松石与海青色的清新融合。',
    accentHex: '#14b8a6',
  },
  {
    id: 'purple',
    name: 'Ungu Amethyst',
    nameEn: 'Amethyst Purple',
    nameZh: '紫水晶',
    descriptionMs: 'Alunan ungu kerohanian yang anggun, tenang dan mendalam.',
    descriptionEn: 'Graceful spiritual purple, serene and meditative.',
    descriptionZh: '优雅的精神紫，宁静而深邃。',
    accentHex: '#a855f7',
  },
  {
    id: 'red',
    name: 'Merah Delima',
    nameEn: 'Ruby Red',
    nameZh: '红宝石',
    descriptionMs: 'Warna merah delima berani penuh semangat dan ketegasan.',
    descriptionEn: 'Bold ruby crimson, full of energy and devotion.',
    descriptionZh: '鲜艳的红宝石，充满生机与热忱。',
    accentHex: '#f43f5e',
  },
  {
    id: 'silver',
    name: 'Karbon Perak',
    nameEn: 'Silver Slate',
    nameZh: '碳板银',
    descriptionMs: 'Monokrom moden berprofil tinggi, bersih dan selesa pada mata.',
    descriptionEn: 'Sleek modern monochrome, clean and minimal.',
    descriptionZh: '时尚现代的单色调，干净且护眼。',
    accentHex: '#94a3b8',
  },
];

// Palet warna sokongan untuk override kelas Tailwind 'emerald'
interface ThemeColorSet {
  primary: string;       // untuk text-emerald-400 / border
  primaryDark: string;   // untuk bg-emerald-600
  primaryHover: string;  // untuk hover:bg-emerald-500
  primaryLight: string;  // untuk text-emerald-200 / 300
  surface: string;       // untuk bg-emerald-950
  surfaceAlt: string;    // untuk bg-emerald-900/60
  mutedBg: string;       // untuk bg-emerald-500/20
  border: string;        // untuk border-emerald-500/30
}

const PALETTES: Record<string, ThemeColorSet> = {
  gold: {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fde68a',
    surface: '#2e1903',
    surfaceAlt: '#451a03',
    mutedBg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  emas: {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fde68a',
    surface: '#2e1903',
    surfaceAlt: '#451a03',
    mutedBg: 'rgba(245, 158, 11, 0.18)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  blue: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#bfdbfe',
    surface: '#081735',
    surfaceAlt: '#0c224e',
    mutedBg: 'rgba(59, 130, 246, 0.18)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  biru: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#bfdbfe',
    surface: '#081735',
    surfaceAlt: '#0c224e',
    mutedBg: 'rgba(59, 130, 246, 0.18)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  teal: {
    primary: '#14b8a6',
    primaryDark: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: '#99f6e4',
    surface: '#04221f',
    surfaceAlt: '#07332f',
    mutedBg: 'rgba(20, 184, 166, 0.18)',
    border: 'rgba(20, 184, 166, 0.35)',
  },
  purple: {
    primary: '#a855f7',
    primaryDark: '#9333ea',
    primaryHover: '#7e22ce',
    primaryLight: '#e9d5ff',
    surface: '#200938',
    surfaceAlt: '#300f53',
    mutedBg: 'rgba(168, 85, 247, 0.18)',
    border: 'rgba(168, 85, 247, 0.35)',
  },
  ungu: {
    primary: '#a855f7',
    primaryDark: '#9333ea',
    primaryHover: '#7e22ce',
    primaryLight: '#e9d5ff',
    surface: '#200938',
    surfaceAlt: '#300f53',
    mutedBg: 'rgba(168, 85, 247, 0.18)',
    border: 'rgba(168, 85, 247, 0.35)',
  },
  red: {
    primary: '#f43f5e',
    primaryDark: '#e11d48',
    primaryHover: '#be123c',
    primaryLight: '#fecdd3',
    surface: '#330813',
    surfaceAlt: '#4c0c1c',
    mutedBg: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
  merah: {
    primary: '#f43f5e',
    primaryDark: '#e11d48',
    primaryHover: '#be123c',
    primaryLight: '#fecdd3',
    surface: '#330813',
    surfaceAlt: '#4c0c1c',
    mutedBg: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
  silver: {
    primary: '#94a3b8',
    primaryDark: '#64748b',
    primaryHover: '#475569',
    primaryLight: '#e2e8f0',
    surface: '#141a24',
    surfaceAlt: '#1e293b',
    mutedBg: 'rgba(148, 163, 184, 0.18)',
    border: 'rgba(148, 163, 184, 0.35)',
  },
  karbon: {
    primary: '#94a3b8',
    primaryDark: '#64748b',
    primaryHover: '#475569',
    primaryLight: '#e2e8f0',
    surface: '#141a24',
    surfaceAlt: '#1e293b',
    mutedBg: 'rgba(148, 163, 184, 0.18)',
    border: 'rgba(148, 163, 184, 0.35)',
  },
};

export const getSavedTheme = (): ThemeId => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('solatkini_theme') as ThemeId) || 'emerald';
  }
  return 'emerald';
};

export const applyTheme = (themeId: ThemeId): void => {
  if (typeof window === 'undefined') return;

  // 1. Simpan pilihan pengguna
  localStorage.setItem('solatkini_theme', themeId);
  document.documentElement.setAttribute('data-theme', themeId);

  // 2. Dapatkan atau bina tag <style id="solatkini-theme-style">
  let styleTag = document.getElementById('solatkini-theme-style') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'solatkini-theme-style';
    document.head.appendChild(styleTag);
  }

  // 3. Jika tema ialah Emerald Zamrud (default), kosongkan override style
  const normalizedId = themeId.toLowerCase();
  if (normalizedId === 'emerald' || !PALETTES[normalizedId]) {
    styleTag.innerHTML = '';
    return;
  }

  const p = PALETTES[normalizedId];

  // 4. Override secara automatik semua elemen Tailwind emerald di seluruh aplikasi
  styleTag.innerHTML = `
    /* Teks dan Ikon Berwarna */
    .text-emerald-400, .text-emerald-300, .fill-emerald-400 {
      color: ${p.primary} !important;
      fill: ${p.primary} !important;
    }
    .text-emerald-200 {
      color: ${p.primaryLight} !important;
    }

    /* Butang dan Latar Belakang Utama */
    .bg-emerald-600 {
      background-color: ${p.primaryDark} !important;
    }
    .bg-emerald-500 {
      background-color: ${p.primary} !important;
    }
    .hover\\:bg-emerald-500:hover {
      background-color: ${p.primary} !important;
    }
    .hover\\:bg-emerald-600:hover {
      background-color: ${p.primaryDark} !important;
    }

    /* Kad Gelap & Permukaan */
    .bg-emerald-950,
    .bg-emerald-950\\/40,
    .bg-emerald-950\\/60,
    .bg-emerald-950\\/70,
    .bg-emerald-950\\/80 {
      background-color: ${p.surface} !important;
    }
    .bg-emerald-900\\/40,
    .bg-emerald-900\\/50,
    .bg-emerald-900\\/60,
    .bg-emerald-900\\/70,
    .bg-emerald-900\\/80 {
      background-color: ${p.surfaceAlt} !important;
    }

    /* Badge & Latar Lembut (Translucent) */
    .bg-emerald-500\\/10,
    .bg-emerald-500\\/15,
    .bg-emerald-500\\/20,
    .bg-emerald-500\\/30 {
      background-color: ${p.mutedBg} !important;
    }

    /* Border & Garisan Kad */
    .border-emerald-500,
    .border-emerald-500\\/20,
    .border-emerald-500\\/30,
    .border-emerald-500\\/40,
    .border-emerald-400,
    .border-emerald-400\\/30,
    .border-emerald-400\\/40,
    .border-emerald-400\\/60,
    .border-emerald-700\\/50,
    .border-emerald-800\\/40,
    .border-emerald-950 {
      border-color: ${p.border} !important;
    }

    /* Ring Focus & Glow */
    .ring-emerald-400,
    .ring-emerald-400\\/40,
    .ring-emerald-400\\/50,
    .ring-emerald-400\\/60,
    .ring-emerald-500\\/30 {
      --tw-ring-color: ${p.primary} !important;
    }

    /* Kecerunan (Gradient) Bar & Header */
    .from-emerald-600 {
      --tw-gradient-from: ${p.primaryDark} var(--tw-gradient-from-position) !important;
    }
    .to-emerald-400 {
      --tw-gradient-to: ${p.primary} var(--tw-gradient-to-position) !important;
    }
    .via-emerald-500 {
      --tw-gradient-via: ${p.primary} var(--tw-gradient-via-position) !important;
    }

    /* Text Selection Highlight */
    ::selection {
      background-color: ${p.mutedBg} !important;
      color: ${p.primaryLight} !important;
    }
  `;
};
