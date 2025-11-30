import { neon } from "@neondatabase/serverless";

async function importDecemberResponses() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  const devUrl = process.env.DATABASE_URL;

  if (!prodUrl) {
    console.error("❌ PRODUCTION_DATABASE_URL not found in environment!");
    process.exit(1);
  }

  if (!devUrl) {
    console.error("❌ DATABASE_URL not found!");
    process.exit(1);
  }

  console.log("🔄 Connecting to databases...");

  try {
    const prodDb = neon(prodUrl);
    const devDb = neon(devUrl);

    // 1. Fetch responses submitted from Nov 1, 2025 to today (December questionnaire)
    console.log("📥 Fetching questionnaire_responses submitted from 2025-11-01 to today from production...");
    const responses = await prodDb(
      `SELECT
        id,
        questionnaire_id,
        user_id,
        responses,
        available_sundays,
        preferred_mass_times,
        alternative_times,
        daily_mass_availability,
        special_events,
        can_substitute,
        notes,
        submitted_at,
        shared_with_family_ids,
        is_shared_response,
        shared_from_user_id,
        unmapped_responses,
        processing_warnings,
        deleted_at,
        is_deleted
       FROM questionnaire_responses
       WHERE submitted_at >= '2025-11-01'
         AND submitted_at <= CURRENT_TIMESTAMP
       ORDER BY submitted_at;`
    );
    console.log(`   ✓ ${responses.length} responses found submitted since 2025-11-01`);

    if (responses.length === 0) {
      console.log("⚠️  No responses found submitted since 2025-11-01 in production!");
      process.exit(0);
    }

    // 2. Import data with safe JSON conversion
    console.log("📤 Importing responses to dev...");

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < responses.length; i++) {
      const row = responses[i];
      try {
        // Prepare JSON fields - neon returns them as objects, we need to stringify for insertion
        const toJsonString = (val: any) => {
          if (!val) return null;
          return typeof val === "object" ? JSON.stringify(val) : val;
        };

        await devDb(
          `INSERT INTO questionnaire_responses
          (id, questionnaire_id, user_id, responses, available_sundays, preferred_mass_times,
           alternative_times, daily_mass_availability, special_events, can_substitute, notes,
           submitted_at, shared_with_family_ids, is_shared_response, shared_from_user_id,
           unmapped_responses, processing_warnings, deleted_at, is_deleted)
          VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb, $14, $15, $16::jsonb, $17::jsonb, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            questionnaire_id = EXCLUDED.questionnaire_id,
            user_id = EXCLUDED.user_id,
            responses = EXCLUDED.responses,
            available_sundays = EXCLUDED.available_sundays,
            preferred_mass_times = EXCLUDED.preferred_mass_times,
            alternative_times = EXCLUDED.alternative_times,
            daily_mass_availability = EXCLUDED.daily_mass_availability,
            special_events = EXCLUDED.special_events,
            can_substitute = EXCLUDED.can_substitute,
            notes = EXCLUDED.notes,
            submitted_at = EXCLUDED.submitted_at,
            shared_with_family_ids = EXCLUDED.shared_with_family_ids,
            is_shared_response = EXCLUDED.is_shared_response,
            shared_from_user_id = EXCLUDED.shared_from_user_id,
            unmapped_responses = EXCLUDED.unmapped_responses,
            processing_warnings = EXCLUDED.processing_warnings,
            deleted_at = EXCLUDED.deleted_at,
            is_deleted = EXCLUDED.is_deleted;`,
          [
            row.id,
            row.questionnaire_id,
            row.user_id,
            toJsonString(row.responses),
            toJsonString(row.available_sundays),
            toJsonString(row.preferred_mass_times),
            toJsonString(row.alternative_times),
            toJsonString(row.daily_mass_availability),
            toJsonString(row.special_events),
            row.can_substitute,
            row.notes,
            row.submitted_at,
            toJsonString(row.shared_with_family_ids),
            row.is_shared_response,
            row.shared_from_user_id,
            toJsonString(row.unmapped_responses),
            toJsonString(row.processing_warnings),
            row.deleted_at,
            row.is_deleted,
          ]
        );

        successCount++;

        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Processed ${i + 1} responses...`);
        }
      } catch (rowError: any) {
        errorCount++;
        errors.push({
          index: i,
          id: row.id,
          userId: row.user_id,
          message: rowError.message,
          code: rowError.code,
        });
      }
    }

    console.log("");
    console.log("✅ IMPORT COMPLETED!");
    console.log(`   Total responses imported/updated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Import errors: ${errorCount}`);
      console.log("\n📋 First 5 errors:");
      errors.slice(0, 5).forEach((err) => {
        console.log(`   - ID ${err.id} (user: ${err.userId}): ${err.message.substring(0, 80)}`);
      });
    }
    console.log("   Responses submitted since 2025-11-01 are now in dev database! 🚀");
  } catch (error) {
    console.error("❌ Error during import:", error);
    process.exit(1);
  }
}

importDecemberResponses();
