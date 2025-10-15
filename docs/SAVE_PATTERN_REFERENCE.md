# Save Pattern Reference: Questionnaire Responses

## ✅ Correct Implementation (Already in Production)

The system already implements the correct save pattern in `server/routes/questionnaires.ts`. Here's the reference:

### Pattern: Standardize → Extract → Save

```typescript
// 1. STANDARDIZE to v2.0 format
const standardizedResponse = QuestionnaireService.standardizeResponse(
  data.responses,  // Raw input (any format)
  data.month,      // October = 10
  data.year        // 2025
);

// 2. EXTRACT structured data for legacy compatibility
const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);

// 3. SAVE both formats (v2.0 + extracted fields)
await db.insert(questionnaireResponses).values({
  userId: minister.id,
  questionnaireId: templateId,

  // ✅ CRITICAL: Save standardized v2.0 format
  responses: JSON.stringify(standardizedResponse),

  // ✅ Legacy fields for backward compatibility
  availableSundays: extractedData.availableSundays,
  preferredMassTimes: extractedData.preferredMassTimes,
  alternativeTimes: extractedData.alternativeTimes,
  dailyMassAvailability: extractedData.dailyMassAvailability,
  specialEvents: extractedData.specialEvents,
  canSubstitute: extractedData.canSubstitute,
  notes: extractedData.notes,

  // Other fields
  sharedWithFamilyIds: data.sharedWithFamilyIds || [],
  isSharedResponse: false
});
```

## Important Notes

### ❌ Don't Do This (Your Example)

```typescript
// WRONG: Schema doesn't have 'version' column
await db.query(
  'INSERT INTO questionnaire_responses (user_id, responses, version) VALUES ($1, $2, $3)',
  [userId, JSON.stringify(standardized), '2.0']
);
```

**Issues:**
1. ❌ Uses raw SQL instead of Drizzle ORM
2. ❌ Schema doesn't have a `version` column
3. ❌ Doesn't save extracted legacy fields
4. ❌ Missing required fields (questionnaireId, etc.)

### ✅ Do This Instead

```typescript
// CORRECT: Use Drizzle ORM with proper schema
const standardized = QuestionnaireService.standardizeResponse(rawData, month, year);
const extracted = QuestionnaireService.extractStructuredData(standardized);

await db.insert(questionnaireResponses).values({
  userId,
  questionnaireId,
  responses: JSON.stringify(standardized),  // v2.0 format embedded in JSONB
  availableSundays: extracted.availableSundays,
  // ... other fields
});
```

## Why Version is Inside `responses` JSONB

The v2.0 format is stored **inside** the `responses` JSONB field:

```json
{
  "format_version": "2.0",  ← Version is HERE
  "masses": { ... },
  "special_events": { ... }
}
```

**No separate `version` column needed!**

The format_version is part of the data itself, making it self-describing.

## Database Schema (Actual)

```typescript
// shared/schema.ts
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull(),
  userId: varchar('user_id').notNull(),

  responses: jsonb('responses').notNull(),  // ← v2.0 format stored here

  // Legacy extracted fields (for backward compatibility)
  availableSundays: jsonb('available_sundays').$type<string[]>(),
  preferredMassTimes: jsonb('preferred_mass_times').$type<string[]>(),
  alternativeTimes: jsonb('alternative_times').$type<string[]>(),
  dailyMassAvailability: jsonb('daily_mass_availability').$type<string[]>(),
  specialEvents: jsonb('special_events'),
  canSubstitute: boolean('can_substitute').default(false),
  notes: text('notes'),

  // ... other fields
});
```

**No `version` column!** The version is embedded in the `responses` JSONB.

## Complete Save Example

```typescript
import { QuestionnaireService } from '../services/questionnaireService';
import { db } from '../db';
import { questionnaireResponses } from '@shared/schema';

async function saveQuestionnaireResponse(
  userId: string,
  questionnaireId: string,
  rawResponses: any,  // Can be legacy array or v2.0 object
  month: number,
  year: number
) {
  // Step 1: Standardize to v2.0 format
  const standardized = QuestionnaireService.standardizeResponse(
    rawResponses,
    month,
    year
  );

  // Step 2: Extract structured data for legacy fields
  const extracted = QuestionnaireService.extractStructuredData(standardized);

  // Step 3: Save to database
  const [saved] = await db.insert(questionnaireResponses)
    .values({
      userId,
      questionnaireId,

      // v2.0 format (with format_version inside)
      responses: JSON.stringify(standardized),

      // Legacy extracted fields
      availableSundays: extracted.availableSundays,
      preferredMassTimes: extracted.preferredMassTimes,
      alternativeTimes: extracted.alternativeTimes,
      dailyMassAvailability: extracted.dailyMassAvailability,
      specialEvents: extracted.specialEvents,
      canSubstitute: extracted.canSubstitute,
      notes: extracted.notes,

      // Other metadata
      sharedWithFamilyIds: [],
      isSharedResponse: false
    })
    .returning();

  return saved;
}
```

## Reading the Version

When you read a response from the database:

```typescript
const [response] = await db.select()
  .from(questionnaireResponses)
  .where(eq(questionnaireResponses.userId, userId))
  .limit(1);

// Parse the responses JSONB
const data = typeof response.responses === 'string'
  ? JSON.parse(response.responses)
  : response.responses;

// Check version
if (data.format_version === '2.0') {
  // Use v2.0 format
  const masses = data.masses;
  const specialEvents = data.special_events;
} else {
  // Legacy format (during transition)
  console.warn('Legacy format detected');
}
```

## Benefits of This Approach

### ✅ Self-Describing Data
```json
{
  "format_version": "2.0",  ← Clear what format this is
  "masses": { ... }
}
```

### ✅ No Schema Changes Needed
- No new columns to add
- Version embedded in data
- Works with existing JSONB field

### ✅ Easy to Query
```sql
-- Find all v2.0 responses
SELECT * FROM questionnaire_responses
WHERE responses->>'format_version' = '2.0';

-- Find legacy responses
SELECT * FROM questionnaire_responses
WHERE responses->>'format_version' IS NULL;
```

### ✅ Backward Compatible
- Legacy fields still populated
- Old code continues to work
- Gradual migration path

## Common Mistakes to Avoid

### ❌ Mistake 1: Raw SQL Queries
```typescript
// DON'T DO THIS
await db.query('INSERT INTO ...', [userId, responses, '2.0']);
```

**Why:** Loses type safety, error-prone, bypasses Drizzle validation

### ❌ Mistake 2: Separate Version Column
```typescript
// DON'T DO THIS
version: varchar('version')  // ← No such column exists!
```

**Why:** Schema doesn't have this column, not needed

### ❌ Mistake 3: Not Extracting Legacy Fields
```typescript
// DON'T DO THIS
await db.insert(questionnaireResponses).values({
  responses: JSON.stringify(standardized)
  // ← Missing extracted fields!
});
```

**Why:** Breaks backward compatibility, old queries fail

### ❌ Mistake 4: Not Standardizing
```typescript
// DON'T DO THIS
await db.insert(questionnaireResponses).values({
  responses: JSON.stringify(rawData)  // ← Not standardized!
});
```

**Why:** Saves inconsistent formats, defeats the whole purpose

## Summary

### The Correct Pattern (3 Steps)

```typescript
// 1. Standardize
const standardized = QuestionnaireService.standardizeResponse(raw, month, year);

// 2. Extract
const extracted = QuestionnaireService.extractStructuredData(standardized);

// 3. Save BOTH
await db.insert(questionnaireResponses).values({
  responses: JSON.stringify(standardized),  // v2.0 format
  ...extracted                              // Legacy fields
});
```

### Key Points

- ✅ Version is **inside** `responses` JSONB as `format_version`
- ✅ Use **Drizzle ORM**, not raw SQL
- ✅ Save **both** v2.0 format and extracted fields
- ✅ Always **standardize** before saving
- ✅ Always **extract** legacy fields for compatibility

---

## Where to See the Real Implementation

- **Save endpoint**: `server/routes/questionnaires.ts:511-603`
- **Update endpoint**: `server/routes/questionnaires.ts:527-564`
- **Family sharing**: `server/routes/questionnaires.ts:672-708`
- **Migration script**: `server/migrations/standardizeQuestionnaireResponses.ts`

All these already use the correct pattern! 🎉
