export type ThemeId =
  | 'emerald'
  | 'gold'
  | 'sapphire'
  | 'teal'
  | 'amethyst'
  | 'ruby'
  | 'slate';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  nameEn: string;
  nameZh: string;
  accentHex: string;
  secondaryHex: string;
  bgGlow: string;
  borderClass: string;
  activeClass: string;
  buttonClass: string;
  badgeClass: string;
  descriptionMs: string;
  descriptionEn: string;
  descriptionZh: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Zamrud',
    nameEn: 'Emerald Green',
    nameZh: '祖母绿 (经典伊斯兰)',
    accentHex: '#10b981',
    secondaryHex: '#059669',
    bgGlow: 'rgba(16, 185, 129, 0.15)',
    borderClass: 'border-emerald-500/30',
    activeClass: 'bg-emerald-500 text-slate-950 font-bold',
    buttonClass: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-950/50',
    badgeClass: 'bg-emerald-950 border-emerald-500/30 text-emerald-300',
    descriptionMs: 'Hijau zamrud klasik Islamik lambang ketenangan Nusantara (Lalai).',
    descriptionEn: 'Classic Islamic emerald green reflecting peace and serenity (Default).',
    descriptionZh: '经典伊斯兰翡翠绿色，象征和平与宁静（默认）。',
  },
  {
    id: 'gold',
    name: 'Emas Diraja',
    nameEn: 'Royal Gold & Amber',
    nameZh: '皇家金色琥珀',
    accentHex: '#f59e0b',
    secondaryHex: '#d97706',
    bgGlow: 'rgba(245, 158, 11, 0.15)',
    borderClass: 'border-amber-500/30',
    activeClass: 'bg-amber-500 text-slate-950 font-bold',
    buttonClass: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold shadow-amber-950/50',
    badgeClass: 'bg-amber-950 border-amber-500/30 text-amber-300',
    descriptionMs: 'Kilauan emas diraja yang mewah, hangat dan bercahaya.',
    descriptionEn: 'Luxurious royal golden amber warmth and radiance.',
    descriptionZh: '尊贵华丽的皇家金色与琥珀光芒。',
  },
  {
    id: 'sapphire',
    name: 'Biru Nilam',
    nameEn: 'Sapphire Ocean',
    nameZh: '蔚蓝宝石海洋',
    accentHex: '#3b82f6',
    secondaryHex: '#2563eb',
    bgGlow: 'rgba(59, 130, 246, 0.15)',
    borderClass: 'border-blue-500/30',
    activeClass: 'bg-blue-500 text-white font-bold',
    buttonClass: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-950/50',
    badgeClass: 'bg-blue-950 border-blue-500/30 text-blue-300',
    descriptionMs: 'Biru nilam laut dalam yang jernih, tenang dan profesional.',
    descriptionEn: 'Deep ocean sapphire blue offering clarity and calm.',
    descriptionZh: '深海蓝宝石般的清澈、宁静与专注。',
  },
  {
    id: 'teal',
    name: 'Teal Tropika',
    nameEn: 'Tropical Teal',
    nameZh: '热带青碧绿',
    accentHex: '#14b8a6',
    secondaryHex: '#0d9488',
    bgGlow: 'rgba(20, 184, 166, 0.15)',
    borderClass: 'border-teal-500/30',
    activeClass: 'bg-teal-500 text-slate-950 font-bold',
    buttonClass: 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-slate-950 font-bold shadow-teal-950/50',
    badgeClass: 'bg-teal-950 border-teal-500/30 text-teal-300',
    descriptionMs: 'Gabungan hijau pirus dan biru toska moden yang menyegarkan.',
    descriptionEn: 'Refreshing turquoise teal blending nature with modern aesthetics.',
    descriptionZh: '清新热带青碧蓝绿，活力与自然融合。',
  },
  {
    id: 'amethyst',
    name: 'Ungu Amethyst',
    nameEn: 'Royal Amethyst',
    nameZh: '紫水晶皇族',
    accentHex: '#8b5cf6',
    secondaryHex: '#7c3aed',
    bgGlow: 'rgba(139, 92, 246, 0.15)',
    borderClass: 'border-purple-500/30',
    activeClass: 'bg-purple-500 text-white font-bold',
    buttonClass: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-purple-950/50',
    badgeClass: 'bg-purple-950 border-purple-500/30 text-purple-300',
    descriptionMs: 'Alunan ungu kerohanian yang anggun, tenang dan mendalam.',
    descriptionEn: 'Graceful spiritual purple with depth and dignity.',
    descriptionZh: '优雅庄重的灵性深紫与紫晶辉光。',
  },
  {
    id: 'ruby',
    name: 'Merah Delima',
    nameEn: 'Ruby Crimson',
    nameZh: '红宝石石榴红',
    accentHex: '#f43f5e',
    secondaryHex: '#e11d48',
    bgGlow: 'rgba(244, 63, 94, 0.15)',
    borderClass: 'border-rose-500/30',
    activeClass: 'bg-rose-500 text-white font-bold',
    buttonClass: 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-950/50',
    badgeClass: 'bg-rose-950 border-rose-500/30 text-rose-300',
    descriptionMs: 'Warna merah delima berani penuh semangat dan ketegasan.',
    descriptionEn: 'Bold ruby crimson exuding strength and passion.',
    descriptionZh: '热情奔放的红宝石红色，醒目有力。',
  },
  {
    id: 'slate',
    name: 'Karbon Perak',
    nameEn: 'Onyx Slate',
    nameZh: '缟玛瑙暗黑银灰',
    accentHex: '#94a3b8',
    secondaryHex: '#64748b',
    bgGlow: 'rgba(148, 163, 184, 0.12)',
    borderClass: 'border-slate-500/30',
    activeClass: 'bg-slate-300 text-slate-950 font-bold',
    buttonClass: 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-slate-950/50',
    badgeClass: 'bg-slate-900 border-slate-600/30 text-slate-300',
    descriptionMs: 'Monokrom moden berprofil tinggi, bersih dan selesa pada mata.',
    descriptionEn: 'High-contrast minimalist monochrome slate, clean and easy on the eyes.',
    descriptionZh: '极简主义暗灰金属黑，现代深沉不刺眼。',
  },
];

export const THEME_STORAGE_KEY = 'solatkini_theme_id';

export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'emerald';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved as ThemeId;
    }
  } catch {
    // ignore
  }
  return 'emerald';
}

export function applyTheme(themeId: ThemeId) {
  if (typeof window === 'undefined') return;
  const theme = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];

  const root = document.documentElement;
  root.style.setProperty('--theme-accent', theme.accentHex);
  root.style.setProperty('--theme-secondary', theme.secondaryHex);
  root.style.setProperty('--theme-glow', theme.bgGlow);
  root.setAttribute('data-theme', themeId);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // ignore
  }
}
