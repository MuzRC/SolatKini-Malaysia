import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAndroidIcons() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const resDir = path.resolve('android/app/src/main/res');

  // Background color #0a1a14 matching the icon background
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0a1a14</color>
</resources>`;

  fs.writeFileSync(path.join(resDir, 'values/ic_launcher_background.xml'), bgXml, 'utf-8');
  console.log('✓ Updated ic_launcher_background.xml with #0a1a14');

  // Remove the default vector foreground if it exists
  const v24Foreground = path.join(resDir, 'drawable-v24/ic_launcher_foreground.xml');
  if (fs.existsSync(v24Foreground)) {
    fs.unlinkSync(v24Foreground);
    console.log('✓ Removed default android robot in drawable-v24/ic_launcher_foreground.xml');
  }

  // Also remove drawable/ic_launcher_background.xml if present
  const drawableBg = path.join(resDir, 'drawable/ic_launcher_background.xml');
  if (fs.existsSync(drawableBg)) {
    fs.unlinkSync(drawableBg);
  }

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

    // 1. ic_launcher.png (Legacy square launcher icon with rounded corners)
    await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Circular launcher icon)
    // Create circular mask
    const circleSvg = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2}" fill="#fff"/></svg>`
    );
    const roundBuffer = await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .toBuffer();

    await sharp(roundBuffer)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Adaptive icon foreground: 108dp with 72dp safe zone in center)
    const contentSize = Math.round(fgSize * 0.72);
    const innerIcon = await sharp(svgBuffer)
      .resize(contentSize, contentSize)
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerIcon, gravity: 'center' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`✓ Generated icons for ${name} (${iconSize}x${iconSize})`);
  }

  console.log('Semua ikon Android SolatKini berjaya dijana!');
}

generateAndroidIcons().catch((err) => {
  console.error('Error generating android icons:', err);
  process.exit(1);
});
