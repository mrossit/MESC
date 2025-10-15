# Questionnaire Response Validation System - Usage Guide

## Overview

The validation system provides bulletproof data handling for questionnaire responses with:
- ✅ Strict schema validation using Zod
- ✅ Automatic format detection (V2.0 vs Legacy)
- ✅ Format conversion utilities
- ✅ Comprehensive error messages
- ✅ Type safety with TypeScript

---

## Quick Start

### 1. Validating New Responses (V2.0 Format)

```typescript
import { validateQuestionnaireResponse } from '../shared/validators/questionnaireValidator';

// In your API endpoint
app.post('/api/questionnaires/responses', async (req, res) => {
  try {
    // Validate the incoming response
    const validatedData = validateQuestionnaireResponse(req.body);

    // Save with confidence - data is guaranteed valid
    await db.insert(questionnaireResponses).values(validatedData);

    res.json({ success: true });
  } catch (error) {
    // Detailed error message for debugging
    res.status(400).json({
      error: 'Invalid response format',
      details: error.message
    });
  }
});
```

### 2. Parsing Responses for Schedule Generation

```typescript
import { ResponseParser } from '../server/utils/responseParser';

// Parse any format (auto-detects version)
const availability = ResponseParser.parseResponse(response, year, month);

// Check if minister is available
if (availability['2025-10-20_19:30']) {
  console.log('Minister available for novena on Oct 20');
}
```

### 3. Migrating Legacy Responses

```bash
# Dry run (preview only)
npx tsx server/migrations/migrateQuestionnaireResponses.ts --dry-run

# Actual migration
npx tsx server/migrations/migrateQuestionnaireResponses.ts

# With options
npx tsx server/migrations/migrateQuestionnaireResponses.ts \
  --year=2025 \
  --month=10 \
  --batch-size=50
```

---

## API Reference

### Validation Functions

#### `validateQuestionnaireResponse(data: unknown)`
Validates V2.0 format responses with strict schema checking.

**Throws**: Detailed validation error with field-level feedback

**Example**:
```typescript
const valid = validateQuestionnaireResponse({
  version: '2.0',
  questionnaire_id: 'uuid-here',
  user_id: 'user-uuid',
  responses: {
    format_version: '2.0',
    masses: {
      '2025-10-05': { '08:00': false, '10:00': true, '19:00': true }
    },
    special_events: {
      saint_judas_novena: ['2025-10-20_19:30', '2025-10-21_19:30']
    },
    weekdays: {
      monday: false,
      tuesday: true,
      wednesday: true,
      thursday: false,
      friday: true
    },
    can_substitute: true
  }
});
```

#### `validateLegacyResponse(data: unknown)`
Validates V1.0 legacy format for backward compatibility.

#### `detectResponseVersion(data: any)`
Auto-detects format version: `'2.0'` | `'1.0'` | `'unknown'`

#### `validateAnyFormat(data: unknown)`
Validates and returns format info for any response.

**Returns**:
```typescript
{
  version: '2.0' | '1.0' | 'unknown',
  data: any,
  isValid: boolean,
  errors?: string[]
}
```

---

### Parser Functions

#### `ResponseParser.parseResponse(response, year?, month?)`
Main parser that auto-detects format and converts to availability map.

**Returns**: `ParsedAvailability` - Map of datetime keys → boolean
```typescript
{
  '2025-10-20_19:30': true,
  '2025-10-05_10:00': true,
  // ...
}
```

#### `ResponseParser.convertLegacyToV2(legacyResponse, year, month)`
Converts legacy V1.0 response to V2.0 format.

**Returns**: `QuestionnaireResponseV2 | null`

---

### Helper Functions

#### Date/Time Validation
```typescript
validateISODate('2025-10-05')        // true
validateISODate('05/10/2025')        // false

validate24HourTime('19:30')          // true
validate24HourTime('19h30')          // false

validateDateTimeKey('2025-10-20_19:30')  // true
validateDateTimeKey('Terça 20/10 às 19h30')  // false
```

#### Legacy Conversion
```typescript
convertLegacyDateToISO('Domingo 05/10', 2025, 10)  // '2025-10-05'
convertLegacyTimeTo24h('19h30')                    // '19:30'
```

#### Template Creation
```typescript
const empty = createEmptyV2Response(questionnaireId, userId);
// Returns fully structured empty response
```

---

## Usage Patterns

### Pattern 1: Save New Response (Frontend → Backend)

**Frontend (QuestionnaireUnified.tsx)**:
```typescript
const handleSubmit = async () => {
  const v2Response = {
    version: '2.0',
    questionnaire_id: questionnaireId,
    user_id: currentUser.id,
    responses: {
      format_version: '2.0',
      masses: {
        '2025-10-05': { '08:00': false, '10:00': true, '19:00': false },
        '2025-10-12': { '08:00': true, '10:00': true, '19:00': false }
      },
      special_events: {
        saint_judas_novena: selectedNovenaDates // ['2025-10-20_19:30', ...]
      },
      weekdays: weekdaySelection,
      can_substitute: canSubstitute
    }
  };

  const response = await fetch('/api/questionnaires/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(v2Response)
  });
};
```

**Backend**:
```typescript
app.post('/api/questionnaires/responses', async (req, res) => {
  try {
    const validated = validateQuestionnaireResponse(req.body);
    await db.insert(questionnaireResponses).values(validated);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Pattern 2: Read and Parse for Schedule Generation

```typescript
// In scheduleGenerator.ts
async loadAvailabilityData(year: number, month: number) {
  const responses = await db.select()
    .from(questionnaireResponses)
    .where(/* ... */);

  responses.forEach(response => {
    // Auto-detect format and parse
    const availability = ResponseParser.parseResponse(response, year, month);

    // Store in availability map
    this.availabilityData.set(response.userId, availability);
  });
}

// Check availability for specific mass
isMinisterAvailable(ministerId: string, massDate: string, massTime: string): boolean {
  const availability = this.availabilityData.get(ministerId);
  const key = `${massDate}_${massTime}`;
  return availability?.[key] === true;
}
```

### Pattern 3: Batch Migration

```typescript
import { migrateQuestionnaireResponses } from './migrations/migrateQuestionnaireResponses';

async function runMigration() {
  const result = await migrateQuestionnaireResponses({
    dryRun: false,
    batchSize: 100,
    targetYear: 2025,
    targetMonth: 10
  });

  console.log(`Migrated: ${result.migrated}`);
  console.log(`Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
}
```

---

## Error Handling

### Validation Errors

When validation fails, you get detailed error messages:

```
Invalid questionnaire response format:
  - responses.masses.05/10/2025: Date must be in ISO format YYYY-MM-DD (got: invalid value)
  - responses.special_events.saint_judas_novena.0: DateTime must be in format YYYY-MM-DD_HH:MM (got: invalid value)
  - responses.weekdays: Required (got: type undefined)

See /docs/QUESTIONNAIRE_DATA_CONTRACT.md for correct format.
```

### Handling in API

```typescript
app.post('/api/questionnaires/responses', async (req, res) => {
  try {
    const validated = validateQuestionnaireResponse(req.body);
    await saveResponse(validated);
    res.json({ success: true });
  } catch (error) {
    if (error.message.includes('Invalid questionnaire response')) {
      // Validation error - send user-friendly message
      return res.status(400).json({
        error: 'Invalid response format',
        details: error.message,
        help_url: '/docs/QUESTIONNAIRE_DATA_CONTRACT.md'
      });
    }

    // Other errors
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Testing

### Running Tests

```bash
# Run all questionnaire contract tests
npm test -- questionnaireContract.test.ts

# Run specific test
npm test -- -t "should validate correct V2.0 format"

# Run with coverage
npm test -- --coverage questionnaireContract.test.ts
```

### Writing Tests

```typescript
import { validateQuestionnaireResponse } from '../../shared/validators/questionnaireValidator';

describe('My Feature', () => {
  it('should handle valid V2.0 responses', () => {
    const response = createTestResponse();
    expect(() => validateQuestionnaireResponse(response)).not.toThrow();
  });

  it('should reject invalid dates', () => {
    const invalid = createInvalidResponse();
    expect(() => validateQuestionnaireResponse(invalid)).toThrow();
  });
});
```

---

## Migration Checklist

### Phase 1: Setup (Week 1)
- [x] Create validation schemas
- [x] Implement response parser
- [x] Write comprehensive tests
- [x] Create migration script
- [x] Document usage

### Phase 2: Integration (Week 2-3)
- [ ] Update frontend to save in V2.0 format
- [ ] Add validation to API endpoints
- [ ] Deploy with dual-format support
- [ ] Monitor for validation errors

### Phase 3: Migration (Week 4-6)
- [ ] Run migration in dry-run mode
- [ ] Verify converted data
- [ ] Run actual migration
- [ ] Confirm all responses in V2.0

### Phase 4: Cleanup (Week 7-8)
- [ ] Remove legacy parser fallbacks
- [ ] Update documentation
- [ ] Archive legacy code
- [ ] Celebrate! 🎉

---

## Troubleshooting

### "Invalid date format" error
**Problem**: Date not in ISO format
**Solution**: Use `YYYY-MM-DD` (e.g., `2025-10-05`, not `05/10/2025`)

### "Invalid time format" error
**Problem**: Time not in 24h format
**Solution**: Use `HH:MM` (e.g., `19:30`, not `19h30`)

### "DateTime must be in format..." error
**Problem**: Novena/feast dates not using underscore separator
**Solution**: Use `YYYY-MM-DD_HH:MM` (e.g., `2025-10-20_19:30`)

### Migration fails for some responses
**Problem**: Legacy data has unexpected format
**Solution**:
1. Run migration with `--dry-run`
2. Check error details
3. Manually fix problematic records
4. Re-run migration

---

## Performance Considerations

### Caching
```typescript
// Cache parsed responses during schedule generation
private parsedResponsesCache = new Map<string, ParsedAvailability>();

getMinisterAvailability(ministerId: string): ParsedAvailability {
  if (!this.parsedResponsesCache.has(ministerId)) {
    const response = await this.db.getResponse(ministerId);
    const parsed = ResponseParser.parseResponse(response, this.year, this.month);
    this.parsedResponsesCache.set(ministerId, parsed);
  }
  return this.parsedResponsesCache.get(ministerId)!;
}
```

### Database Indexes
```sql
-- Fast lookup by version
CREATE INDEX idx_questionnaire_responses_version
ON questionnaire_responses(version);

-- Fast JSONB queries
CREATE INDEX idx_responses_masses
ON questionnaire_responses USING GIN ((responses->'masses'));
```

---

## Support

- **Documentation**: `/docs/QUESTIONNAIRE_DATA_CONTRACT.md`
- **Tests**: `/server/tests/questionnaireContract.test.ts`
- **Examples**: This file
- **Migration**: `/server/migrations/migrateQuestionnaireResponses.ts`

For questions or issues, refer to the data contract documentation first.
