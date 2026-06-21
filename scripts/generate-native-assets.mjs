import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const colors = {
  ink: '#2b241f',
  inkSoft: '#3d3129',
  gold: '#c6923b',
  goldLight: '#f2c76c',
  cream: '#fff6e7',
};

const androidDensities = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

function markSvg() {
  return `
    <g transform="translate(0 -58)">
      <circle cx="512" cy="296" r="124" fill="none" stroke="${colors.gold}" stroke-width="18" opacity=".45"/>
      <path d="M512 170v235" stroke="${colors.goldLight}" stroke-width="34" stroke-linecap="round"/>
      <path d="M428 260h168" stroke="${colors.goldLight}" stroke-width="30" stroke-linecap="round"/>
      <path d="M360 414c28 112 86 170 152 170s124-58 152-170" fill="none" stroke="${colors.goldLight}" stroke-width="38" stroke-linecap="round"/>
      <path d="M410 430c18 74 55 112 102 112s84-38 102-112" fill="${colors.gold}" opacity=".9"/>
      <path d="M394 612h236" stroke="${colors.goldLight}" stroke-width="34" stroke-linecap="round"/>
      <path d="M512 584v72" stroke="${colors.goldLight}" stroke-width="32" stroke-linecap="round"/>
    </g>`;
}

function iconSvg({ transparent = false } = {}) {
  const background = transparent
    ? ''
    : `
      <rect width="1024" height="1024" fill="${colors.ink}"/>
      <circle cx="512" cy="430" r="420" fill="url(#warmGlow)" opacity=".72"/>
      <path d="M0 814c216-70 396-66 512 0s296 70 512 0v210H0z" fill="${colors.inkSoft}" opacity=".56"/>`;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <radialGradient id="warmGlow" cx="50%" cy="39%" r="58%">
        <stop offset="0%" stop-color="${colors.goldLight}" stop-opacity=".42"/>
        <stop offset="54%" stop-color="${colors.gold}" stop-opacity=".2"/>
        <stop offset="100%" stop-color="${colors.ink}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="letterGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colors.goldLight}"/>
        <stop offset="100%" stop-color="${colors.gold}"/>
      </linearGradient>
    </defs>
    ${background}
    ${markSvg()}
    <text x="512" y="780" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="174" font-weight="700" fill="url(#letterGold)" letter-spacing="0">MESC</text>
    <text x="512" y="864" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="${colors.cream}" opacity=".82" letter-spacing="5">SAO JUDAS TADEU</text>
  </svg>`;
}

function splashSvg(width, height) {
  const min = Math.min(width, height);
  const scale = min / 1450;
  const left = (width - 1024 * scale) / 2;
  const top = height * 0.34 - 512 * scale;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1f1a17"/>
        <stop offset="48%" stop-color="#7a5627"/>
        <stop offset="100%" stop-color="#f8f0df"/>
      </linearGradient>
      <radialGradient id="centerGlow" cx="50%" cy="46%" r="58%">
        <stop offset="0%" stop-color="${colors.goldLight}" stop-opacity=".55"/>
        <stop offset="100%" stop-color="${colors.gold}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width / 2}" cy="${height * 0.46}" r="${min * 0.42}" fill="url(#centerGlow)"/>
    <g transform="translate(${left} ${top}) scale(${scale})">
      ${markSvg()}
      <text x="512" y="780" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="174" font-weight="700" fill="${colors.cream}" letter-spacing="0">MESC</text>
      <text x="512" y="864" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="${colors.cream}" opacity=".82" letter-spacing="5">SAO JUDAS TADEU</text>
    </g>
  </svg>`;
}

async function writePngFromSvg(svg, outputPath, { removeAlpha = false } = {}) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  let image = sharp(Buffer.from(svg)).png({ compressionLevel: 9 });
  if (removeAlpha) {
    image = image.flatten({ background: colors.ink });
  }
  await image.toFile(outputPath);
}

async function writeResizedPngFromSvg(svg, outputPath, width, height, { removeAlpha = false } = {}) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  let image = sharp(Buffer.from(svg)).resize(width, height).png({ compressionLevel: 9 });
  if (removeAlpha) {
    image = image.flatten({ background: colors.ink });
  }
  await image.toFile(outputPath);
}

async function generateIosAssets() {
  await writePngFromSvg(
    iconSvg(),
    path.join(rootDir, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),
    { removeAlpha: true },
  );

  const splashPath = 'ios/App/App/Assets.xcassets/Splash.imageset';
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await writePngFromSvg(splashSvg(2732, 2732), path.join(rootDir, splashPath, name), { removeAlpha: true });
  }
}

async function generateAndroidAssets() {
  for (const [density, iconSize, foregroundSize] of androidDensities) {
    const mipmapDir = path.join(rootDir, `android/app/src/main/res/mipmap-${density}`);
    await writeResizedPngFromSvg(iconSvg(), path.join(mipmapDir, 'ic_launcher.png'), iconSize, iconSize, { removeAlpha: true });
    await writeResizedPngFromSvg(iconSvg(), path.join(mipmapDir, 'ic_launcher_round.png'), iconSize, iconSize, { removeAlpha: true });
    await writeResizedPngFromSvg(iconSvg({ transparent: true }), path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundSize, foregroundSize);
  }

  await fs.writeFile(
    path.join(rootDir, 'android/app/src/main/res/values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${colors.ink}</color>\n</resources>\n`,
  );

  await fs.writeFile(
    path.join(rootDir, 'android/app/src/main/res/drawable/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportWidth="108"\n    android:viewportHeight="108">\n    <path\n        android:fillColor="${colors.ink}"\n        android:pathData="M0,0h108v108h-108z" />\n</vector>\n`,
  );

  const splashFiles = [
    'android/app/src/main/res/drawable/splash.png',
    ...['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].flatMap((density) => [
      `android/app/src/main/res/drawable-port-${density}/splash.png`,
      `android/app/src/main/res/drawable-land-${density}/splash.png`,
    ]),
  ];

  for (const relativeFile of splashFiles) {
    const outputPath = path.join(rootDir, relativeFile);
    const metadata = await sharp(outputPath).metadata();
    await writePngFromSvg(splashSvg(metadata.width, metadata.height), outputPath, { removeAlpha: true });
  }
}

await generateIosAssets();
await generateAndroidAssets();

console.log('Native icon and splash assets generated.');
