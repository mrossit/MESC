import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../client/public');
const splashDir = path.join(publicDir, 'splash');
const iconPath = path.join(publicDir, 'images/icon-512.png');

// iOS splash screen sizes (width x height)
const splashScreens = [
  // iPhone
  { width: 1170, height: 2532, name: 'apple-splash-1170x2532.png' }, // iPhone 12/13/14
  { width: 1284, height: 2778, name: 'apple-splash-1284x2778.png' }, // iPhone 12/13/14 Pro Max
  { width: 1179, height: 2556, name: 'apple-splash-1179x2556.png' }, // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'apple-splash-1290x2796.png' }, // iPhone 14 Pro Max / 15 Pro Max
  { width: 1125, height: 2436, name: 'apple-splash-1125x2436.png' }, // iPhone X/XS/11 Pro
  { width: 1242, height: 2688, name: 'apple-splash-1242x2688.png' }, // iPhone XS Max/11 Pro Max
  { width: 828, height: 1792, name: 'apple-splash-828x1792.png' },   // iPhone XR/11
  { width: 750, height: 1334, name: 'apple-splash-750x1334.png' },   // iPhone 8/SE2/SE3
  { width: 640, height: 1136, name: 'apple-splash-640x1136.png' },   // iPhone SE1
  // iPad
  { width: 2048, height: 2732, name: 'apple-splash-2048x2732.png' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'apple-splash-1668x2388.png' }, // iPad Pro 11"
  { width: 1536, height: 2048, name: 'apple-splash-1536x2048.png' }, // iPad Air/Mini
  { width: 1620, height: 2160, name: 'apple-splash-1620x2160.png' }, // iPad 10.2"
  { width: 1640, height: 2360, name: 'apple-splash-1640x2360.png' }, // iPad Air 10.9"
];

const backgroundColor = { r: 248, g: 244, b: 237, alpha: 1 }; // #F8F4ED

async function generateSplashScreens() {
  console.log('Generating iOS splash screens...');

  // Load the icon
  const icon = sharp(iconPath);
  const iconMeta = await icon.metadata();

  for (const screen of splashScreens) {
    try {
      // Calculate icon size (about 25% of the smaller dimension)
      const iconSize = Math.round(Math.min(screen.width, screen.height) * 0.25);

      // Resize icon
      const resizedIcon = await sharp(iconPath)
        .resize(iconSize, iconSize, { fit: 'contain', background: backgroundColor })
        .toBuffer();

      // Create splash screen with centered icon
      const left = Math.round((screen.width - iconSize) / 2);
      const top = Math.round((screen.height - iconSize) / 2);

      await sharp({
        create: {
          width: screen.width,
          height: screen.height,
          channels: 4,
          background: backgroundColor
        }
      })
        .composite([{
          input: resizedIcon,
          left,
          top
        }])
        .png()
        .toFile(path.join(splashDir, screen.name));

      console.log(`  ✓ ${screen.name} (${screen.width}x${screen.height})`);
    } catch (err) {
      console.error(`  ✗ ${screen.name}: ${err.message}`);
    }
  }

  console.log('\nDone! Add these to your index.html:');
  console.log('\n<!-- iOS Splash Screens -->');

  for (const screen of splashScreens) {
    const isLandscape = screen.width > screen.height;
    const orientation = isLandscape ? 'landscape' : 'portrait';
    console.log(`<link rel="apple-touch-startup-image" href="/splash/${screen.name}" media="(device-width: ${Math.min(screen.width, screen.height) / 3}px) and (device-height: ${Math.max(screen.width, screen.height) / 3}px) and (-webkit-device-pixel-ratio: 3) and (orientation: ${orientation})">`);
  }
}

generateSplashScreens().catch(console.error);
