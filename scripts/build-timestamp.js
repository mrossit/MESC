#!/usr/bin/env node

/**
 * Script para injetar timestamp de build no service worker
 * Isso garante que cada build gera uma nova versão do cache
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Gera timestamp único para esta build
const buildTimestamp = Date.now();
const buildDate = new Date(buildTimestamp).toISOString();

console.log(`\n🔨 Build Timestamp: ${buildDate} (${buildTimestamp})`);

// Paths
const swSourcePath = join(__dirname, '../client/public/sw.js');
const swDistPath = join(__dirname, '../dist/public/sw.js');

try {
  // Lê o service worker
  const swContent = readFileSync(swSourcePath, 'utf8');
  
  // Substitui o placeholder pelo timestamp real
  const updatedContent = swContent.replace(
    /__BUILD_TIMESTAMP__/g,
    buildTimestamp.toString()
  );
  
  // Verifica se a substituição funcionou
  if (updatedContent.includes('__BUILD_TIMESTAMP__')) {
    console.warn('⚠️  Warning: Some __BUILD_TIMESTAMP__ placeholders were not replaced');
  }
  
  // Escreve no dist
  writeFileSync(swDistPath, updatedContent, 'utf8');
  
  console.log('✅ Service worker timestamp updated successfully');
  console.log(`📝 Cache name will be: mesc-v5.3.0-${buildTimestamp}\n`);
  
} catch (error) {
  console.error('❌ Error updating service worker timestamp:', error);
  process.exit(1);
}
