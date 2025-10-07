/**
 * Plugin Vite para injetar timestamp de build no service worker
 * Garante que cada build gera uma nova versão do cache automaticamente
 */

import { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function swTimestampPlugin(): Plugin {
  let buildTimestamp: number;
  
  return {
    name: 'vite-plugin-sw-timestamp',
    
    buildStart() {
      // Gera timestamp único para este build
      buildTimestamp = Date.now();
      const buildDate = new Date(buildTimestamp).toISOString();
      console.log(`\n🔨 [SW Plugin] Build Timestamp: ${buildDate}`);
      console.log(`📝 [SW Plugin] Cache version: mesc-v5.3.0-${buildTimestamp}\n`);
    },
    
    closeBundle() {
      // Caminho do service worker
      const swSourcePath = join(process.cwd(), 'client/public/sw.js');
      const swDistPath = join(process.cwd(), 'dist/public/sw.js');
      
      try {
        // Verifica se o arquivo fonte existe
        if (!existsSync(swSourcePath)) {
          console.warn('⚠️  [SW Plugin] Source sw.js not found, skipping...');
          return;
        }
        
        // Lê o service worker
        const swContent = readFileSync(swSourcePath, 'utf8');
        
        // Substitui o placeholder pelo timestamp real
        const updatedContent = swContent.replace(
          /__BUILD_TIMESTAMP__/g,
          buildTimestamp.toString()
        );
        
        // Verifica se a substituição funcionou
        if (updatedContent.includes('__BUILD_TIMESTAMP__')) {
          console.warn('⚠️  [SW Plugin] Some placeholders were not replaced');
        }
        
        // Escreve no dist
        writeFileSync(swDistPath, updatedContent, 'utf8');
        
        console.log('✅ [SW Plugin] Service worker timestamp injected successfully\n');
        
      } catch (error) {
        console.error('❌ [SW Plugin] Error processing service worker:', error);
      }
    }
  };
}
