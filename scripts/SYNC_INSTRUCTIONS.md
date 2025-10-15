# Sync Questionnaire Responses from Production to Dev

## Overview

The script `sync-questionnaire-from-prod.ts` copies all questionnaire response data from the production database to the development database.

**⚠️ WARNING:** This script will **DELETE ALL** existing questionnaire responses in the dev database and replace them with production data.

## Prerequisites

1. You must have both database URLs configured:
   - `DATABASE_URL` - Your development database
   - `PRODUCTION_DATABASE_URL` - Your production database

2. Add `PRODUCTION_DATABASE_URL` to your environment:

   **Option A: Replit Secrets** (Recommended)
   - Go to Tools → Secrets
   - Add a new secret:
     - Name: `PRODUCTION_DATABASE_URL`
     - Value: `postgresql://...` (your production connection string)

   **Option B: .env file**
   ```bash
   echo "PRODUCTION_DATABASE_URL=postgresql://..." >> .env
   ```

## How to Run

```bash
# Run the sync script
NODE_ENV=development npx tsx scripts/sync-questionnaire-from-prod.ts
```

## What the Script Does

1. ✅ Connects to both production and dev databases
2. ✅ Fetches all questionnaire_responses from production
3. ✅ Shows a summary of what will be synced
4. ✅ Clears the dev questionnaire_responses table
5. ✅ Inserts production data in batches (50 at a time)
6. ✅ Verifies the sync was successful

## Safety Features

- ✅ Requires `NODE_ENV=development` to prevent accidental production overwrites
- ✅ Shows count of records before deleting
- ✅ Batched inserts to prevent timeouts
- ✅ Verification step after sync
- ✅ Proper connection cleanup

## Example Output

```
🔄 SYNCING QUESTIONNAIRE RESPONSES FROM PRODUCTION TO DEV

⚠️  WARNING: This will delete all dev questionnaire_responses data!

📊 Connecting to databases...
   Production: postgresql://prod.neon.tech...
   Dev:        postgresql://dev.neon.tech...

📥 Step 1: Fetching data from PRODUCTION...
   ✅ Found 106 responses in production

📋 Sample data from production (first 3):
   1. User: 266cb5ba... | Version: 2.0
   2. User: 4a1c378d... | Version: 2.0
   3. User: 70a16a55... | Version: 2.0

📊 Step 2: Checking current DEV data...
   Current DEV has 109 responses

🗑️  Step 3: Clearing DEV table...
   ✅ DEV table cleared

📤 Step 4: Inserting production data into DEV...
   Inserting 106 records...
   Progress: 50/106 (47%)
   Progress: 100/106 (94%)
   Progress: 106/106 (100%)
   ✅ Inserted 106 records

✅ Step 5: Verifying sync...
   Total responses: 106
   Unique users:    106

✅ SYNC COMPLETE! Dev database now matches production.

🔌 Database connections closed

🎉 Sync script completed successfully!
```

## After Syncing

After running the sync:

1. The dev database will have **real production data**
2. Any test data or manual fixes in dev will be **lost**
3. You may need to re-run fix scripts like:
   - `scripts/fix-weekday-responses.ts` (if needed)

## Rollback

There is no automatic rollback. If you need to restore dev data:

1. You would need to have a backup of the dev data
2. Or re-run your test data generation scripts

## Troubleshooting

### Error: "PRODUCTION_DATABASE_URL not found"
- Make sure you've added the production database URL to Replit Secrets or .env

### Error: "Must be run with NODE_ENV=development"
- Always prefix the command with `NODE_ENV=development`

### Timeout errors
- The script uses batching to prevent timeouts
- If you still get timeouts, reduce `batchSize` in the script (currently 50)

### Connection errors
- Verify both DATABASE_URL and PRODUCTION_DATABASE_URL are valid
- Check that the production database is accessible from your dev environment
