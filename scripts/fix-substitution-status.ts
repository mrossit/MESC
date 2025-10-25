/**
 * Migration Script: Fix Inconsistent Substitution Request Status
 *
 * Problem:
 * - Old substitution requests have status "pending" but substituteId is NULL
 * - This is inconsistent with the current logic:
 *   - "pending" should ONLY be used for directed requests (has substituteId)
 *   - "available" should be used for open requests (no substituteId)
 *
 * Solution:
 * - Update all "pending" requests where substituteId IS NULL to status "available"
 *
 * Usage:
 * - Run with: npx tsx scripts/fix-substitution-status.ts
 */

import { db } from "../server/db";
import { substitutionRequests } from "@shared/schema";
import { sql, isNull, and, eq } from "drizzle-orm";

async function fixSubstitutionStatus() {
  console.log('🔧 Starting substitution status fix...\n');

  try {
    // Find affected requests
    const affectedRequests = await db
      .select({
        id: substitutionRequests.id,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        createdAt: substitutionRequests.createdAt,
      })
      .from(substitutionRequests)
      .where(
        and(
          eq(substitutionRequests.status, 'pending'),
          isNull(substitutionRequests.substituteId)
        )
      );

    if (affectedRequests.length === 0) {
      console.log('✅ No inconsistent requests found. Database is clean!');
      return;
    }

    console.log(`📊 Found ${affectedRequests.length} inconsistent request(s):\n`);

    affectedRequests.forEach((req, index) => {
      console.log(`${index + 1}. Request ID: ${req.id}`);
      console.log(`   Status: ${req.status} (should be "available")`);
      console.log(`   Substitute ID: ${req.substituteId} (NULL - not directed)`);
      console.log(`   Created: ${req.createdAt}`);
      console.log('');
    });

    // Update the status
    const result = await db
      .update(substitutionRequests)
      .set({ status: 'available' })
      .where(
        and(
          eq(substitutionRequests.status, 'pending'),
          isNull(substitutionRequests.substituteId)
        )
      );

    console.log(`✅ Successfully updated ${affectedRequests.length} request(s)!`);
    console.log('📝 Changed status from "pending" to "available"');
    console.log('\n🎉 Migration complete! These requests will now show the "Aceitar Substituição" button.');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
fixSubstitutionStatus()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
