import React from 'react';

// Fungsi penukar angka rumi (0-9) kepada angka Arab Timur (٠-٩) secara automatik
const toArabicDigits = (numStr: string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return numStr.replace(/\d/g, (d) => arabicDigits[parseInt(d, 10)]);
};

interface QuranAyahBadgeProps {
  number: string;
}

/**
 * Komponen Lencana Nombor Ayat Al-Quran Berhias (Mushaf Ayah Rosette Marker)
 * Mengikut reka bentuk rasmi tanda wakaf/akhir ayat mushaf Al-Quran dengan
 * bingkai bulatan emas berhias, 4 kelopak bunga kardinal, dan nombor Arab di tengah.
 */
export const QuranAyahBadge: React.FC<QuranAyahBadgeProps> = ({ number }) => {
  const displayArabicNumber = toArabicDigits(number);

  return (
    <span
      className="inline-flex items-center justify-center align-middle mx-1.5 my-0.5 select-none"
      style={{ verticalAlign: 'middle', lineHeight: 1 }}
      dir="ltr"
      title={`Ayat ${number}`}
    >
      <svg
        className="w-7 h-7 sm:w-8 sm:h-8 inline-block drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] shrink-0 transition-transform hover:scale-110"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Ayat ${number}`}
      >
        {/* Bulatan luar berhias putus-putus keemasan */}
        <circle
          cx="19"
          cy="19"
          r="17.2"
          stroke="#d97706"
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
          opacity="0.85"
        />

        {/* Bingkai utama bulatan latar gelap zamrud bertrim emas */}
        <circle
          cx="19"
          cy="19"
          r="15"
          fill="#041f16"
          stroke="#f59e0b"
          strokeWidth="1.3"
        />

        {/* Cincin konsentrik halus dalaman */}
        <circle
          cx="19"
          cy="19"
          r="12.5"
          stroke="#fbbf24"
          strokeWidth="0.75"
          opacity="0.65"
        />

        {/* 4 Hiasan Kelopak Bunga Kardinal (Utara, Selatan, Barat, Timur) */}
        <path d="M19 1.5 L20.5 3.5 L19 5.5 L17.5 3.5 Z" fill="#fbbf24" />
        <path d="M19 32.5 L20.5 34.5 L19 36.5 L17.5 34.5 Z" fill="#fbbf24" />
        <path d="M1.5 19 L3.5 20.5 L5.5 19 L3.5 17.5 Z" fill="#fbbf24" />
        <path d="M32.5 19 L34.5 20.5 L36.5 19 L34.5 17.5 Z" fill="#fbbf24" />

        {/* 4 Titik hiasan pepenjuru bergemerlap */}
        <circle cx="7" cy="7" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="31" cy="7" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="7" cy="31" r="0.9" fill="#fde047" opacity="0.85" />
        <circle cx="31" cy="31" r="0.9" fill="#fde047" opacity="0.85" />

        {/* Nombor Ayat Arab di Tengah-Tengah Bulatan */}
        <text
          x="19"
          y="20.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fef08a"
          fontWeight="bold"
          fontFamily="'Amiri', 'Scheherazade New', serif"
          fontSize={displayArabicNumber.length >= 3 ? '10' : displayArabicNumber.length === 2 ? '11.5' : '13.5'}
          className="select-none"
        >
          {displayArabicNumber}
        </text>
      </svg>
    </span>
  );
};

interface ArabicQuranTextProps {
  text: string;
  className?: string;
}

/**
 * Komponen pemapar teks Arab yang mengesan simbol ayat Quran (۝١, ۝٢...)
 * atau nombor ayat dan menggantikannya secara automatik dengan QuranAyahBadge berhias.
 */
export const ArabicQuranText: React.FC<ArabicQuranTextProps> = ({
  text,
  className = 'font-arabic text-xl sm:text-2xl text-right text-emerald-100 leading-loose mb-3',
}) => {
  if (!text) return null;

  // Regex mengesan simbol akhir ayat atau angka Arab di celah perkataan
  const regex = /(۝[\u0660-\u0669\d]+|(?<=\s)[\u0660-\u0669\d]{1,4}(?=\s|$)|۝)/g;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return (
      <p className={className} dir="rtl">
        {text}
      </p>
    );
  }

  return (
    <p className={className} dir="rtl">
      {parts.map((part, index) => {
        if (!part) return null;

        // Semak jika bahagian ini mewakili nombor ayat
        if (part.startsWith('۝') || /^[\u0660-\u0669\d]+$/.test(part.trim())) {
          const num = part.replace(/^۝/, '').trim();
          if (num) {
            return <QuranAyahBadge key={index} number={num} />;
          }
          return (
            <span key={index} className="text-amber-400 font-arabic mx-1">
              ۝
            </span>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};
