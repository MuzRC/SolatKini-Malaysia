import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA icons...');

  // 1. 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('✓ Created public/pwa-192x192.png');

  // 2. 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('✓ Created public/pwa-512x512.png');

  // 3. 180x180 Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/pwa-180x180.png');
  console.log('✓ Created public/pwa-180x180.png');

  // 4. 512x512 maskable icon with safe-zone margin (410x410 icon on 512x512 #070d0b background)
  const innerIcon = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 7, g: 13, b: 11, alpha: 1 },
    },
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('✓ Created public/pwa-maskable-512x512.png');

  // 5. Mobile screenshot (1080x1920) for Play Store / PWABuilder
  const mobileCenterIcon = await sharp(svgBuffer)
    .resize(420, 420)
    .toBuffer();

  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 7, g: 13, b: 11, alpha: 1 },
    },
  })
    .composite([
      { input: mobileCenterIcon, top: 600, left: 330 },
    ])
    .png()
    .toFile('public/screenshot-mobile.png');
  console.log('✓ Created public/screenshot-mobile.png');

  // 6. Desktop screenshot (1920x1080) for PWABuilder
  const desktopCenterIcon = await sharp(svgBuffer)
    .resize(380, 380)
    .toBuffer();

  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 7, g: 13, b: 11, alpha: 1 },
    },
  })
    .composite([
      { input: desktopCenterIcon, top: 320, left: 770 },
    ])
    .png()
    .toFile('public/screenshot-desktop.png');
  console.log('✓ Created public/screenshot-desktop.png');

  console.log('All PWA assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
