# 🚀 Migration Guide: Standardize Questionnaire Responses

## Quick Start

### Step 1: Verify Everything Works

```bash
# 1. Run unit tests (22 tests should pass)
npm run test:run -- server/tests/questionnaireService.test.ts

# 2. Test with real data samples
npx tsx server/tests/testMigration.ts

# 3. Dry-run test the migration logic
npx tsx server/migrations/testMigrationDryRun.ts
```

**Expected Output**: All tests passing ✅

### Step 2: Run the Migration

```bash
# Run the migration script
npx tsx server/migrations/standardizeQuestionnaireResponses.ts
```

**What happens:**
1. ✅ Verifies database connection
2. 📦 Creates automatic backup in `backups/` directory
3. ⏸️ Waits 5 seconds (you can press Ctrl+C to cancel)
4. 🔄 Processes all responses with real-time progress
5. 📊 Shows final statistics

### Step 3: Verify Success

```bash
# Check that responses are now v2.0 format
psql $DATABASE_URL -c "
  SELECT
    id,
    responses::jsonb->'format_version' as version,
    jsonb_typeof(responses::jsonb->'masses') as masses_type,
    available_sundays
  FROM questionnaire_responses
  LIMIT 5;
"
```

**Expected**: `version` column shows `"2.0"` for all rows

### Step 4: Clean Up (Optional)

```bash
# After confirming everything works, delete the backup
rm backups/questionnaire_responses_backup_*.json
```

---

## What Changed

### Before Migration (Legacy Format)

```json
{
  "responses": [
    {"questionId": "available_sundays", "answer": ["Domingo 05/10"]},
    {"questionId": "main_service_time", "answer": "10h"},
    {"questionId": "saint_judas_feast_evening", "answer": "Sim"}
  ]
}
```

### After Migration (v2.0 Format)

```json
{
  "responses": {
    "format_version": "2.0",
    "masses": {
      "2025-10-05": {
        "10:00": true,
        "19:00": false
      }
    },
    "special_events": {
      "saint_judas_feast": {
        "2025-10-28_19:30": true
      }
    },
    "weekdays": {
      "monday": false,
      "tuesday": false,
      "wednesday": false,
      "thursday": false,
      "friday": false
    },
    "can_substitute": false
  }
}
```

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `npx tsx server/migrations/standardizeQuestionnaireResponses.ts` | Run full migration |
| `npx tsx server/migrations/testMigrationDryRun.ts` | Test without changing database |
| `npm run test:run -- server/tests/questionnaireService.test.ts` | Run unit tests |
| `npx tsx server/tests/testMigration.ts` | Test with real data samples |

---

## Safety Features

✅ **Automatic Backup** - Created before any database changes
✅ **Idempotent** - Safe to re-run; skips already-migrated responses
✅ **Error Handling** - Continues processing even if individual responses fail
✅ **Progress Tracking** - Real-time updates every 10 responses
✅ **5-Second Delay** - Time to cancel before starting
✅ **Validation** - Verifies format before saving

---

## Troubleshooting

### "Database connection not available"

```bash
# Check environment variable
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Migration shows errors

1. Review error details in the output
2. Fix specific issues if needed
3. Re-run migration (already-processed responses are skipped)

### Need to rollback

```bash
# Restore from backup (created automatically)
BACKUP_FILE="backups/questionnaire_responses_backup_YYYY-MM-DDTHH-MM-SS.json"

# See server/migrations/README.md for detailed restore instructions
```

---

## Performance

- **~10ms per response**
- 100 responses: ~1-2 seconds
- 1000 responses: ~10-15 seconds

---

## Support

- **Full Documentation**: `server/migrations/README.md`
- **Implementation Details**: `docs/REFACTOR_STANDARDIZATION_COMPLETE.md`
- **Service Code**: `server/services/questionnaireService.ts`
- **Tests**: `server/tests/questionnaireService.test.ts`

---

## After Migration

### ✅ All new responses are automatically standardized

Going forward, every new questionnaire submission will:
1. Be standardized to v2.0 format automatically
2. Have consistent date/time formats (ISO 8601, 24h)
3. Use proper types (boolean, not strings)
4. Work seamlessly with schedule generation

**No further action needed!** The system now handles everything automatically.

---

## Questions?

Check these files for detailed information:
- Migration instructions: `server/migrations/README.md`
- Technical details: `docs/REFACTOR_STANDARDIZATION_COMPLETE.md`
- Data contract: `docs/QUESTIONNAIRE_DATA_CONTRACT.md`
