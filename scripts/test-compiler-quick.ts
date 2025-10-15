#!/usr/bin/env tsx

import { ResponseCompiler } from '../server/services/responseCompiler';

async function main() {
  console.log('Testing ResponseCompiler...\n');

  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);

  console.log(`✅ Total compiled: ${compiled.size}`);

  if (compiled.size > 0) {
    const first = Array.from(compiled.values())[0];
    console.log(`\nFirst minister: ${first.userName}`);
    console.log(`Has dates: ${Object.keys(first.availability.dates).length}`);
    console.log(`Sample dates: ${Object.keys(first.availability.dates).slice(0, 5).join(', ')}`);

    // Check a specific date
    const oct05 = first.availability.dates['2025-10-05'];
    if (oct05) {
      console.log(`\n2025-10-05 times: ${Object.keys(oct05.times).join(', ')}`);
    }
  }
}

main().catch(console.error);
