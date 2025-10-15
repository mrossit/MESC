# Database Migrations

This directory contains database migration scripts for the MESC system.

## Available Migrations

### standardizeQuestionnaireResponses.ts

Converts all existing questionnaire responses from legacy format to the standardized v2.0 format.

**What it does:**
- Creates a backup of all responses before migration
- Converts legacy array format to v2.0 structured format
- Updates all extracted fields (availableSundays, preferredMassTimes, etc.)
- Provides detailed progress reporting
- Handles errors gracefully

**When to run:**
- After deploying the QuestionnaireService standardization
- When you want to convert all existing responses to v2.0 format
- Before removing legacy format support

## Running Migrations

### Method 1: Direct Script Execution (Recommended)

```bash
# Run the migration script
npx tsx server/migrations/standardizeQuestionnaireResponses.ts
```

This will:
1. ✅ Check database connection
2. 📦 Create a backup in `backups/` directory
3. ⏸️ Wait 5 seconds for you to cancel (Ctrl+C)
4. 🔄 Process all responses with progress updates
5. 📊 Display final statistics

### Method 2: Using the API Endpoint

```bash
# Alternative: Use the reprocess endpoint
curl -X POST http://localhost:5000/api/questionnaires/admin/reprocess-responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Before Running Migration

### ✅ Pre-Migration Checklist

1. **Verify Database Connection**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM questionnaire_responses;"
   ```

2. **Check Existing Format Distribution**
   ```bash
   psql $DATABASE_URL -c "
     SELECT
       CASE
         WHEN responses::text LIKE '%format_version%' THEN 'v2.0'
         ELSE 'legacy'
       END as format,
       COUNT(*)
     FROM questionnaire_responses
     GROUP BY format;
   "
   ```

3. **Test with Sample Data**
   ```bash
   # Run the test migration script first
   npx tsx server/tests/testMigration.ts
   ```

4. **Ensure Backup Directory Exists**
   ```bash
   mkdir -p backups
   ```

## After Running Migration

### ✅ Post-Migration Verification

1. **Check Migration Statistics**
   - Review the console output
   - Verify success count matches total
   - Ensure no errors reported

2. **Verify Data Format**
   ```bash
   psql $DATABASE_URL -c "
     SELECT
       id,
       responses::jsonb->'format_version' as version,
       jsonb_typeof(responses::jsonb->'masses') as masses_type
     FROM questionnaire_responses
     LIMIT 5;
   "
   ```

3. **Test Schedule Generation**
   - Generate a test schedule
   - Verify ministers are assigned correctly
   - Check that special events work

4. **Review Backup**
   ```bash
   ls -lh backups/
   ```

5. **Delete Backup** (after confirming success)
   ```bash
   # Only after thoroughly testing!
   rm backups/questionnaire_responses_backup_*.json
   ```

## Backup & Recovery

### Backup Location

Backups are stored in: `backups/questionnaire_responses_backup_TIMESTAMP.json`

### Restoring from Backup

If something goes wrong, restore from backup:

```bash
# 1. Load the backup file
BACKUP_FILE="backups/questionnaire_responses_backup_2025-01-13T15-30-00-000Z.json"

# 2. Create a restore script
cat > restore_backup.ts << 'EOF'
import { db } from './server/db';
import { questionnaireResponses } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

async function restore() {
  const backup = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

  for (const record of backup) {
    await db.update(questionnaireResponses)
      .set({ responses: record.responses })
      .where(eq(questionnaireResponses.id, record.id));
  }

  console.log(`Restored ${backup.length} responses`);
}

restore().catch(console.error);
EOF

# 3. Run restore
npx tsx restore_backup.ts "$BACKUP_FILE"
```

## Migration Output Example

```
╔══════════════════════════════════════════════════════════════════════════════╗
║          QUESTIONNAIRE RESPONSE STANDARDIZATION MIGRATION                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

✅ Database connection verified

📦 Creating backup of questionnaire_responses...
✅ Backup created: backups/questionnaire_responses_backup_2025-01-13T15-30-00.json
   Total responses backed up: 127

⚠️  WARNING: This will modify all questionnaire responses in the database.
   Backup created at: backups/questionnaire_responses_backup_2025-01-13T15-30-00.json

   Press Ctrl+C to cancel or wait 5 seconds to continue...

🔄 Starting migration of questionnaire responses...

================================================================================

📊 Found 127 responses to process

✅ [1/127] (0.8%) 0497245c... - Standardized successfully
✅ [2/127] (1.6%) 071750a6... - Standardized successfully
⏭️  [3/127] (2.4%) a1b2c3d4... - Already v2.0, skipping
...

   Progress: 100 success, 0 errors, 27 skipped

================================================================================

📊 MIGRATION COMPLETE

   Total responses:     127
   ✅ Successfully migrated: 100
   ⏭️  Already v2.0 (skipped): 27
   ❌ Errors:            0
   ⏱️  Duration:          12.34s
   📦 Backup file:       backups/questionnaire_responses_backup_2025-01-13T15-30-00.json

✅ ALL RESPONSES SUCCESSFULLY MIGRATED TO v2.0 FORMAT!

   Next steps:
   1. Verify responses in the database
   2. Test schedule generation with new format
   3. Delete backup file once confirmed working
```

## Troubleshooting

### Error: "Database connection not available"

**Solution:**
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Error: "Questionnaire not found"

**Cause:** Some responses reference deleted questionnaires

**Solution:** The migration uses default values (month=10, year=2025) for orphaned responses

### Error: "Permission denied" when creating backup

**Solution:**
```bash
# Ensure backup directory is writable
mkdir -p backups
chmod 755 backups
```

### Error: Partial migration completed

**Solution:**
1. Check the error details in output
2. The migration is idempotent - already migrated responses are skipped
3. Fix the specific error and re-run
4. Already processed responses will be skipped automatically

## Performance Notes

- **Processing time:** ~10ms per response
- **Expected duration:**
  - 100 responses: ~1-2 seconds
  - 1000 responses: ~10-15 seconds
  - 10000 responses: ~100-120 seconds

## Safety Features

✅ **Automatic Backup** - Created before any changes
✅ **Progress Tracking** - Real-time progress updates
✅ **Error Handling** - Continues processing on individual errors
✅ **Idempotent** - Safe to re-run, skips already migrated
✅ **Validation** - Verifies v2.0 format before saving
✅ **5-Second Delay** - Time to cancel before starting

## Support

For issues or questions:
- Check `docs/REFACTOR_STANDARDIZATION_COMPLETE.md`
- Review `server/services/questionnaireService.ts`
- Run tests: `npm run test:run -- server/tests/questionnaireService.test.ts`
