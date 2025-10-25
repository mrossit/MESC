#!/usr/bin/env node
/**
 * Script to inject version and build time into Service Worker
 * This runs during build to ensure SW always has updated version
 * preventing blank screen issues after deploys
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(projectRoot, 'package.json'), 'utf-8')
);

const VERSION = packageJson.version;
const BUILD_TIME = new Date().toISOString();
const BUILD_TIMESTAMP = Date.now();

console.log('📦 Injecting version into Service Worker...');
console.log(`   Version: ${VERSION}`);
console.log(`   Build Time: ${BUILD_TIME}`);
console.log(`   Build Timestamp: ${BUILD_TIMESTAMP}`);

// Read Service Worker template
const swTemplatePath = join(projectRoot, 'client/public/sw.js');
let swContent = readFileSync(swTemplatePath, 'utf-8');

// Replace version placeholders
swContent = swContent.replace(
  /const VERSION = ['"].*?['"];/,
  `const VERSION = '${VERSION}';`
);

swContent = swContent.replace(
  /const BUILD_TIME = ['"].*?['"];/,
  `const BUILD_TIME = '${BUILD_TIME}';`
);

swContent = swContent.replace(
  /const BUILD_TIMESTAMP = \d+;/,
  `const BUILD_TIMESTAMP = ${BUILD_TIMESTAMP};`
);

// Write updated Service Worker
writeFileSync(swTemplatePath, swContent, 'utf-8');

console.log('✅ Service Worker version injected successfully!');
console.log(`   Cache Name will be: mesc-v${VERSION}-${BUILD_TIMESTAMP}`);

// Also update version in a separate JSON file for runtime checks
const versionInfo = {
  version: VERSION,
  buildTime: BUILD_TIME,
  buildTimestamp: BUILD_TIMESTAMP,
};

writeFileSync(
  join(projectRoot, 'client/public/version.json'),
  JSON.stringify(versionInfo, null, 2),
  'utf-8'
);

console.log('✅ version.json created for runtime version checks');

// Update lib/version.ts APP_VERSION
const versionLibPath = join(projectRoot, 'client/src/lib/version.ts');
let versionLibContent = readFileSync(versionLibPath, 'utf-8');

versionLibContent = versionLibContent.replace(
  /export const APP_VERSION = ['"].*?['"];/,
  `export const APP_VERSION = '${VERSION}';`
);

writeFileSync(versionLibPath, versionLibContent, 'utf-8');

console.log('✅ client/src/lib/version.ts updated with APP_VERSION');

process.exit(0);
