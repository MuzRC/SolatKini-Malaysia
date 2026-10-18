import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAndroidIcons() {
  const resDir = path.resolve('android/app/src/main/res');

  // Background color #071510 matching the dark emerald theme
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#071510</color>
</resources>`;

  const valuesDir = path.join(resDir, 'values');
  if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), bgXml, 'utf-8');
  console.log('✓ Updated ic_launcher_background.xml with #071510');

  // Clean up any stale vector foregrounds that might override PNGs
  const staleFiles = [
    'drawable-v24/ic_launcher_foreground.xml',
    'drawable/ic_launcher_background.xml',
    'drawable/ic_launcher_foreground.xml',
  ];
  for (const f of staleFiles) {
    const fullP = path.join(resDir, f);
    if (fs.existsSync(fullP)) {
      try {
        fs.unlinkSync(fullP);
        console.log(`✓ Removed stale vector: ${f}`);
      } catch {
        // ignore
      }
    }
  }

  // Ensure anydpi-v26 xml definitions point to ic_launcher_background and ic_launcher_foreground
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml, 'utf-8');
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml, 'utf-8');

  // Foreground SVG specifically designed for Android Adaptive Icon safe-zone (72dp safe zone in 108dp canvas)
  // Transparent background, glowing emerald crescent, golden star, and minaret silhouette
  const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Glowing Crescent Moon -->
  <path d="M 270 120 C 190 120 126 184 126 264 C 126 344 190 408 270 408 C 304 408 335 396 360 376 C 285 370 226 308 226 232 C 226 178 256 131 300 108 C 290 106 280 120 270 120 Z" fill="url(#emerald)" filter="url(#glow)"/>

  <!-- Golden 8-Point Star / Rub el Hizb -->
  <g transform="translate(350, 190) scale(0.65)" filter="url(#glow)">
    <rect x="-35" y="-35" width="70" height="70" rx="6" fill="url(#gold)" />
    <rect x="-35" y="-35" width="70" height="70" rx="6" fill="url(#gold)" transform="rotate(45)" />
    <circle cx="0" cy="0" r="16" fill="#071510" />
  </g>

  <!-- Subtle Mosque Minaret Silhouette -->
  <path d="M 230 408 L 282 408 L 274 330 C 274 320 268 314 256 314 C 244 314 238 320 238 330 Z" fill="#34d399" opacity="0.4"/>
</svg>`;

  const fullSvgPath = path.resolve('public/icon.svg');
  const fullSvgBuffer = fs.readFileSync(fullSvgPath);
  const fgSvgBuffer = Buffer.from(foregroundSvg);

  // Density specifications for Android
  const densities = [
    { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const { name, iconSize, fgSize } of densities) {
    const targetDir = path.join(resDir, name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. ic_launcher.png (Legacy square launcher icon)
    await sharp(fullSvgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Circular launcher icon)
    const circleSvg = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><circle cx="${iconSize / 2}" cy="${iconSize / 2}" r="${iconSize / 2}" fill="#fff"/></svg>`
    );
    const roundBuffer = await sharp(fullSvgBuffer)
      .resize(iconSize, iconSize)
      .toBuffer();

    await sharp(roundBuffer)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Adaptive icon foreground: clean transparent background with glowing crescent & star)
    // Scale foreground graphic to 75% of fgSize to fit inside adaptive icon safe area without double-squircle
    const safeContentSize = Math.round(fgSize * 0.75);
    const resizedFg = await sharp(fgSvgBuffer)
      .resize(safeContentSize, safeContentSize)
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedFg, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`✓ Generated icons for ${name} (${iconSize}x${iconSize}, FG: ${fgSize}x${fgSize})`);
  }

  console.log('Semua ikon Android SolatKini berjaya dijana dengan rekaan seragam dan kemas!');
}

generateAndroidIcons().catch((err) => {
  console.error('Error generating android icons:', err);
  process.exit(1);
});
