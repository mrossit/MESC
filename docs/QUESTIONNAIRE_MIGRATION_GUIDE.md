# Questionnaire Data Migration Guide: Production to Dev Environment

## Executive Summary

This guide explains how to migrate questionnaire data from production to development environment. The system stores questionnaire responses in PostgreSQL with a v2.0 standardized format using ISO 8601 dates and 24-hour time formats.

---

## 1. QUESTIONNAIRE DATA STRUCTURE

### 1.1 Database Schema Overview

The questionnaire system uses these main tables:

```
users (minister data)
  ↓
questionnaires (monthly questionnaire templates)
  ↓
questionnaire_responses (individual minister responses)
```

### 1.2 Questionnaires Table Structure

File: `/home/runner/workspace/shared/schema.ts` (lines 156-170)

```typescript
export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  month: integer('month').notNull(),        // 1-12
  year: integer('year').notNull(),          // 2024, 2025, etc.
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  questions: jsonb('questions').notNull(),  // Array of question definitions
  deadline: timestamp('deadline'),
  targetUserIds: jsonb('target_user_ids').$type<string[]>(),
  notifiedUserIds: jsonb('notified_user_ids').$type<string[]>(),
  createdById: varchar('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### 1.3 Questionnaire Responses Table Structure

File: `/home/runner/workspace/shared/schema.ts` (lines 173-214)

```typescript
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull(),
  userId: varchar('user_id').notNull(),    // Minister ID
  responses: jsonb('responses').notNull(), // V2.0 standardized format
  
  // Denormalized fields for quick access
  availableSundays: jsonb('available_sundays').$type<string[]>(),
  preferredMassTimes: jsonb('preferred_mass_times').$type<string[]>(),
  alternativeTimes: jsonb('alternative_times').$type<string[]>(),
  dailyMassAvailability: jsonb('daily_mass_availability').$type<string[]>(),
  specialEvents: jsonb('special_events'),
  canSubstitute: boolean('can_substitute').default(false),
  notes: text('notes'),
  
  // Safety net for unmapped data
  unmappedResponses: jsonb('unmapped_responses'),
  processingWarnings: jsonb('processing_warnings'),
  
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
});
```

### 1.4 Response Data Format (V2.0)

**Location:** `/home/runner/workspace/docs/QUESTIONNAIRE_DATA_CONTRACT.md`

```typescript
interface ResponseData {
  format_version: '2.0';
  
  // Sunday masses organized by ISO date
  masses: {
    [isoDate: string]: {      // e.g., '2025-12-07'
      [time24h: string]: boolean;  // e.g., '08:00': true
    };
  };
  
  // Special events
  special_events: {
    saint_judas_novena?: string[];      // Array of 'YYYY-MM-DD_HH:MM'
    saint_judas_feast?: {
      [dateTime: string]: boolean;      // 'YYYY-MM-DD_HH:MM'
    };
    first_friday?: boolean;
    first_saturday?: boolean;
    healing_liberation?: boolean;
  };
  
  // Weekday availability (daily masses 6:30 AM)
  weekdays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
  };
  
  can_substitute: boolean;
  family_serve_preference?: 'together' | 'separate' | 'flexible';
  notes?: string;
}
```

### 1.5 December 2025 Questionnaire Example

The system generates month-specific questionnaires. For December:

- **Title:** "Questionário Dezembro 2025" (auto-generated)
- **Month:** 12
- **Year:** 2025
- **Status:** 'draft', 'published', or 'completed'
- **Questions:** Auto-generated based on liturgical calendar
- **Special Events:** 
  - Christmas masses (Dec 24-25)
  - New Year masses
  - First Friday/Saturday/Thursday masses
  - Healing/Liberation masses

---

## 2. MIGRATION METHODS

### Method 1: Direct Production-to-Dev Sync (Recommended)

**File:** `/home/runner/workspace/scripts/sync-questionnaire-from-prod.ts`

This script synchronizes questionnaire responses from production to dev by:
1. Connecting to both databases using Neon serverless
2. Fetching all responses from production
3. Clearing dev questionnaire_responses table
4. Inserting production data with batch processing
5. Verifying the sync with counts

**Requirements:**
- `PRODUCTION_DATABASE_URL` environment variable
- `DATABASE_URL` (dev) environment variable

**Command:**
```bash
NODE_ENV=development npx tsx scripts/sync-questionnaire-from-prod.ts
```

**What it does:**
- Backs up current dev data (counts only)
- Clears dev questionnaire_responses table
- Inserts production responses in batches of 50
- Shows real-time progress
- Verifies sync completion

### Method 2: Import Production Data (Comprehensive)

**File:** `/home/runner/workspace/scripts/import-production-data.ts`

This comprehensive import copies users, questionnaires, AND responses:

```bash
NODE_ENV=development npx tsx scripts/import-production-data.ts
```

**Data Flow:**
1. Clears all dependent tables in order (respecting foreign keys)
2. Imports users from production
3. Imports questionnaires with month/year extraction from titles
4. Imports questionnaire_responses with all fields

**Handles:**
- Month/year extraction from questionnaire titles
- Proper foreign key relationships
- Field mapping between databases
- All response data including unmapped responses and processing warnings

### Method 3: Export/Import with JSON Files

**Export from Production:**

```typescript
// Create backup/export file from production
const prodData = {
  timestamp: new Date().toISOString(),
  environment: 'production',
  users: [...],
  questionnaires: [...],
  questionnaireResponses: [...]
};

// Save to: /data-exports/export_TIMESTAMP.json
```

**Import to Dev:**

```bash
# Location: /home/runner/workspace/data-exports/
NODE_ENV=development npx tsx scripts/import-to-dev.ts
```

**Example export structure:** `/home/runner/workspace/data-exports/export_2025-09-28T22-43-07.json`

---

## 3. ENVIRONMENT CONFIGURATION

### 3.1 Database URLs

**File:** `/home/runner/workspace/.env.example`

```env
# PostgreSQL (Production)
DATABASE_URL=postgresql://user:password@host:5432/database

# For production-to-dev sync
PRODUCTION_DATABASE_URL=postgresql://neondb_owner:...@neon-prod.aws.neon.tech/neondb?sslmode=require
```

### 3.2 Database Connection Logic

**File:** `/home/runner/workspace/server/db.ts`

The system auto-detects environment:
- **Production:** Uses PostgreSQL from `DATABASE_URL` (Neon serverless)
- **Development:** Uses PostgreSQL if `DATABASE_URL` exists, otherwise falls back to SQLite
- **Detection:** Checks `NODE_ENV`, `REPLIT_DEPLOYMENT`, and `REPL_SLUG`

```typescript
const isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.REPLIT_DEPLOYMENT === '1';
const isDevelopment = process.env.NODE_ENV === 'development';

if (process.env.DATABASE_URL) {
  // Use PostgreSQL (both prod and dev with DB_URL)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else if (isDevelopment) {
  // Fallback to SQLite for local dev
  const sqlite = new Database('local.db');
  db = drizzle(sqlite, { schema });
}
```

---

## 4. EXISTING MIGRATION & STANDARDIZATION SCRIPTS

### 4.1 Questionnaire Data Migration Script

**File:** `/home/runner/workspace/scripts/migrate-questionnaire-data.ts`

Extracts structured data from legacy `responses` field into specific columns:

```bash
npx tsx scripts/migrate-questionnaire-data.ts
```

**Extracts:**
- availableSundays
- preferredMassTimes
- alternativeTimes
- dailyMassAvailability
- canSubstitute
- notes
- specialEvents

### 4.2 Standardization Migration (v2.0)

**File:** `/home/runner/workspace/server/migrations/migrateQuestionnaireResponses.ts`

Converts legacy format to v2.0 standardized format:

```bash
# Dry-run (preview changes)
npx tsx server/migrations/migrateQuestionnaireResponses.ts --dry-run

# Live migration
npx tsx server/migrations/migrateQuestionnaireResponses.ts

# With batch size and date parameters
npx tsx server/migrations/migrateQuestionnaireResponses.ts --batch-size=100 --month=12 --year=2025
```

**Handles:**
- Legacy array format → V2.0 structured format
- Date conversion to ISO 8601 (YYYY-MM-DD)
- Time conversion to 24-hour format (HH:MM)
- Boolean type conversion (string "Sim/Não" → true/false)
- Idempotent: Safe to re-run, skips already-migrated responses

### 4.3 Response Parser Service

**File:** `/home/runner/workspace/server/services/questionnaireService.ts`

Core service that handles response standardization:

```typescript
class QuestionnaireService {
  static standardizeResponseWithTracking(
    rawResponse: any, 
    month?: number, 
    year?: number
  ): ProcessingResult {
    // Returns standardized response + unmappedResponses + warnings
  }
  
  static validateV2Format(response: any): StandardizedResponse {
    // Validates v2.0 structure
  }
}
```

**Features:**
- Handles both v2.0 and legacy formats
- Tracks unmapped responses (safety net)
- Validates against data contract
- No data loss guarantee

---

## 5. QUESTIONNAIRE GENERATION

### 5.1 Standard Questionnaire Questions

**File:** `/home/runner/workspace/server/utils/questionnaireGenerator.ts`

Generates month-specific questions using AI:

```typescript
export function generateQuestionnaireQuestions(month: number, year: number) {
  // Returns array of questions for the specified month/year
}
```

### 5.2 Liturgical Questionnaire Generator

**File:** `/home/runner/workspace/server/utils/liturgicalQuestionnaireGenerator.ts`

Advanced generator with liturgical awareness:

```typescript
interface LiturgicalQuestionnaire {
  month: number;
  year: number;
  theme: {
    name: string;
    color: string;
    colorHex: string;
    description: string;
  };
  questions: QuestionnaireQuestion[];
  metadata: {
    version: string;
    structure: string;
    totalSundays: number;
    hasSpecialMasses: boolean;
  };
}
```

**Generates:**
- Sunday masses (8h, 10h, 19h)
- Special masses (First Friday/Saturday, Healing/Liberation)
- Saint Judas feast day/novena (October)
- Christmas/New Year (December)
- Auto-adjusted for month's calendar

---

## 6. EXPORT & IMPORT UTILITIES

### 6.1 CSV Export

**File:** `/home/runner/workspace/server/utils/csvExporter.ts`

Exports questionnaire responses as CSV:

```typescript
export function convertResponsesToCSV(data: CSVExportData[]): string {
  // Creates CSV with automatic column detection
}

export function createDetailedCSV(data: CSVExportData[]): string {
  // Detailed CSV with question text as headers
}
```

**Features:**
- Auto-detects all questions as columns
- Handles multiple choice responses (semicolon-separated)
- Boolean conversion (true → "Sim", false → "Não")
- UTF-8 BOM for Excel compatibility
- Example: `/home/runner/workspace/escala_outubro_2025.csv`

### 6.2 API Endpoints for Export

**File:** `/home/runner/workspace/server/routes/questionnaires.ts`

RESTful API for questionnaire management:

```
GET /api/questionnaires              - List all questionnaires
GET /api/questionnaires/:id          - Get specific questionnaire
POST /api/questionnaires/templates   - Create questionnaire template
GET /api/questionnaires/:id/responses - Get all responses for questionnaire
GET /api/questionnaires/:id/export   - Export responses as CSV
POST /api/questionnaires/:id/submit  - Submit response
```

---

## 7. STEP-BY-STEP MIGRATION PROCESS

### Step 1: Prepare Environment

```bash
# Set development environment
export NODE_ENV=development

# Verify DATABASE_URL
echo $DATABASE_URL

# Verify PRODUCTION_DATABASE_URL is available
echo $PRODUCTION_DATABASE_URL
```

### Step 2: Run Migration

**Option A: Quick sync (questionnaire responses only)**

```bash
NODE_ENV=development npx tsx scripts/sync-questionnaire-from-prod.ts
```

**Option B: Complete migration (users + questionnaires + responses)**

```bash
NODE_ENV=development npx tsx scripts/import-production-data.ts
```

### Step 3: Verify Data

```bash
# Check questionnaire counts
npx tsx scripts/check-questionnaires.ts

# Check response counts
npx tsx scripts/check-questionnaire-responses.ts

# List all questionnaires
npx tsx scripts/list-all-questionnaires.ts
```

### Step 4: Run Standardization (if needed)

```bash
# Check migration status first
npx tsx scripts/check-migration-status.ts

# Dry-run migration
npx tsx server/migrations/migrateQuestionnaireResponses.ts --dry-run

# Execute migration
npx tsx server/migrations/migrateQuestionnaireResponses.ts
```

### Step 5: Export Data for Backup

```bash
# Export to JSON
NODE_ENV=development npx tsx scripts/sync-production-data.ts export

# Export responses to CSV
NODE_ENV=development npx tsx scripts/verify-csv-export.ts
```

---

## 8. IMPORTANT CONSIDERATIONS

### 8.1 Data Format Standards

**Date Format:** ISO 8601 (`YYYY-MM-DD`)
- Example: `2025-12-07`
- Not: `07/12/2025` or `Domingo 07/12`

**Time Format:** 24-hour (`HH:MM`)
- Example: `08:00`, `19:30`
- Not: `8h`, `19h30`, `7:00 PM`

**DateTime Format:** (`YYYY-MM-DD_HH:MM`)
- Example: `2025-10-20_19:30` (for novenas)

**Booleans:** JSON boolean (`true`/`false`)
- Not: `"Sim"`, `"Não"`, `1`, `0`

### 8.2 Legacy Format Support

System supports legacy format (for backward compatibility):

**Legacy Array Format:**
```json
{
  "responses": [
    {"questionId": "available_sundays", "answer": ["Domingo 05/10"]},
    {"questionId": "main_service_time", "answer": "10h"}
  ]
}
```

**Auto-converted to V2.0 by:**
- `QuestionnaireService.standardizeResponseWithTracking()`
- `ResponseParser.convertLegacyToV2()`

### 8.3 Foreign Key Dependencies

**Deletion order (for clean import):**
1. notifications
2. formation_progress
3. substitution_requests
4. schedule_ministers
5. schedules
6. questionnaire_responses
7. questionnaires
8. users

**Must respect when truncating:**
- questionnaire_responses depends on questionnaires + users
- questionnaires depends on users (createdById)

### 8.4 Safety Features

All migration scripts include:
- ✅ Automatic backup creation
- ✅ Idempotent operations (safe to re-run)
- ✅ Error handling with detailed logging
- ✅ Progress tracking
- ✅ Dry-run capabilities
- ✅ Data validation

---

## 9. TROUBLESHOOTING

### Issue: "PRODUCTION_DATABASE_URL not found"

**Solution:**
```bash
# Add to .env or Replit Secrets
PRODUCTION_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Or export before running
export PRODUCTION_DATABASE_URL="..."
```

### Issue: "Database connection not available"

**Solution:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Issue: "Foreign key constraint violation"

**Solution:**
Delete tables in correct order:
```sql
DELETE FROM questionnaire_responses;
DELETE FROM questionnaires;
DELETE FROM users;
```

### Issue: "Responses in legacy format"

**Solution:**
Run standardization:
```bash
npx tsx server/migrations/migrateQuestionnaireResponses.ts --dry-run

# If satisfied, run for real:
npx tsx server/migrations/migrateQuestionnaireResponses.ts
```

---

## 10. DECEMBER QUESTIONNAIRE SPECIFICS

December questionnaires include:

**Special Events:**
- Christmas Eve masses (Dec 24, 8h/10h/19h/Vigil masses)
- Christmas Day masses (Dec 25, standard times)
- New Year's Eve masses (Dec 31)
- New Year's Day masses (Jan 1)
- Holy Family feast
- First Friday/Saturday/Thursday of December

**Questions May Include:**
- Sunday availability (for month's Sundays)
- Weekday availability (daily masses)
- Special event participation (Christmas, New Year)
- Family preferences (serving together/separately)
- Substitution availability
- Special notes/observations

**Data Structure in Database:**
```json
{
  "format_version": "2.0",
  "masses": {
    "2025-12-07": {"08:00": true, "10:00": true, "19:00": false},
    "2025-12-14": {"08:00": false, "10:00": true, "19:00": true},
    "2025-12-21": {"08:00": true, "10:00": true, "19:00": true},
    "2025-12-25": {"08:00": true, "10:00": true, "19:00": false},
    "2025-12-31": {"19:00": true}
  },
  "special_events": {
    "christmas_eve": true,
    "christmas_day": true,
    "new_year_eve": false,
    "new_year_day": true
  },
  "weekdays": {
    "monday": true,
    "tuesday": true,
    "wednesday": false,
    "thursday": true,
    "friday": true
  },
  "can_substitute": true,
  "notes": "Prefiro servir em família no Natal"
}
```

---

## 11. FILE REFERENCE GUIDE

| File | Purpose | Key Info |
|------|---------|----------|
| `/shared/schema.ts` | Database table definitions | Lines 156-214 for questionnaire tables |
| `/docs/QUESTIONNAIRE_DATA_CONTRACT.md` | Data format specification | Full v2.0 format definition |
| `/scripts/sync-questionnaire-from-prod.ts` | Production to dev sync | Primary migration script |
| `/scripts/import-production-data.ts` | Comprehensive import | Users + questionnaires + responses |
| `/server/migrations/migrateQuestionnaireResponses.ts` | v2.0 standardization | Converts legacy to v2.0 |
| `/server/services/questionnaireService.ts` | Response standardization logic | Core parsing engine |
| `/server/utils/csvExporter.ts` | CSV export utilities | Response export functions |
| `/server/routes/questionnaires.ts` | API endpoints | REST interface for questionnaires |
| `/server/utils/questionnaireGenerator.ts` | Standard generator | Month-specific questions |
| `/server/utils/liturgicalQuestionnaireGenerator.ts` | Liturgical generator | Liturgical-aware questions |
| `.env.example` | Environment template | Database URLs configuration |
| `/server/db.ts` | Database connection | Auto-detection logic |

---

## 12. QUICK REFERENCE COMMANDS

```bash
# Sync questionnaire responses from prod to dev
NODE_ENV=development npx tsx scripts/sync-questionnaire-from-prod.ts

# Import all data (users + questionnaires + responses)
NODE_ENV=development npx tsx scripts/import-production-data.ts

# Check questionnaires
npx tsx scripts/check-questionnaires.ts
npx tsx scripts/list-all-questionnaires.ts

# Check December questionnaire
npx tsx scripts/check-questionnaire-nov2025.ts

# Export responses to CSV
npx tsx scripts/verify-csv-export.ts

# Verify CSV export
NODE_ENV=development npx tsx scripts/verify-csv-export.ts

# Standardize to v2.0 (dry-run)
npx tsx server/migrations/migrateQuestionnaireResponses.ts --dry-run

# Standardize to v2.0 (live)
npx tsx server/migrations/migrateQuestionnaireResponses.ts

# Extract data to denormalized columns
npx tsx scripts/migrate-questionnaire-data.ts

# Check migration status
npx tsx scripts/check-migration-status.ts
```

---

## 13. ADDITIONAL RESOURCES

- **Data Migration Documentation:** `/home/runner/workspace/Documents/MIGRATION_GUIDE.md`
- **Questionnaire Format V2 Spec:** `/home/runner/workspace/Documents/QUESTIONNAIRE_V2_FORMAT.md`
- **Liturgical System Docs:** `/home/runner/workspace/Documents/LITURGICAL_QUESTIONNAIRE_SYSTEM.md`
- **Format Tester:** `/home/runner/workspace/server/utils/questionnaireFormatTester.ts`
- **Sample Data:** `/home/runner/workspace/attached_assets/questionnaire_responses*.json`
- **Tests:** `/home/runner/workspace/server/tests/questionnaireService.test.ts`

