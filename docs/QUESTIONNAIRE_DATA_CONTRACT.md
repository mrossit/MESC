# Questionnaire Response Data Contract v2.0

## Overview
This document defines the **STRICT** data format for questionnaire responses in the MESC system. All code must follow this contract to ensure consistent data handling.

---

## 1. STORAGE FORMAT (Database Schema)

### Response Record Structure
```typescript
interface QuestionnaireResponse {
  id: string;                    // UUID
  questionnaire_id: string;      // Reference to questionnaire
  user_id: string;               // Minister UUID
  version: '2.0';                // Data format version
  responses: ResponseData;       // Actual response data (JSONB)
  submitted_at: Date;
  updated_at: Date;
}
```

### ResponseData Structure (JSONB field)
```typescript
interface ResponseData {
  // Version control
  format_version: '2.0';

  // Sunday masses - organized by ISO date
  masses: {
    [isoDate: string]: {          // e.g., '2025-10-05'
      [time24h: string]: boolean;  // e.g., '08:00': true
    };
  };

  // Special events with precise date-time keys
  special_events: {
    // Novena: Array of ISO date + time
    saint_judas_novena?: string[];  // ['2025-10-20_19:30', '2025-10-21_19:30']

    // Feast day masses: date + time
    saint_judas_feast?: {
      [dateTime: string]: boolean;  // '2025-10-28_07:00': true
    };

    // Monthly special masses
    first_friday?: boolean;         // Sagrado Coração 6h30
    first_saturday?: boolean;       // Imaculado Coração 6h30
    healing_liberation?: boolean;   // Cura e Libertação 19h30
  };

  // Weekday availability (daily masses 6h30)
  weekdays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
  };

  // Substitution availability
  can_substitute: boolean;

  // Family preferences
  family_serve_preference?: 'together' | 'separate' | 'flexible';

  // Optional notes
  notes?: string;
}
```

---

## 2. EXAMPLE: Complete Response

### October 2025 Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "questionnaire_id": "oct-2025-questionnaire-id",
  "user_id": "minister-uuid-123",
  "version": "2.0",
  "responses": {
    "format_version": "2.0",
    "masses": {
      "2025-10-05": {
        "08:00": false,
        "10:00": true,
        "19:00": true
      },
      "2025-10-12": {
        "08:00": false,
        "10:00": true,
        "19:00": false
      },
      "2025-10-19": {
        "08:00": false,
        "10:00": false,
        "19:00": true
      },
      "2025-10-26": {
        "08:00": true,
        "10:00": true,
        "19:00": true
      }
    },
    "special_events": {
      "saint_judas_novena": [
        "2025-10-20_19:30",
        "2025-10-21_19:30",
        "2025-10-22_19:30",
        "2025-10-24_19:00"
      ],
      "saint_judas_feast": {
        "2025-10-28_07:00": false,
        "2025-10-28_10:00": true,
        "2025-10-28_12:00": false,
        "2025-10-28_15:00": false,
        "2025-10-28_17:00": false,
        "2025-10-28_19:30": true
      },
      "first_friday": true,
      "first_saturday": false,
      "healing_liberation": true
    },
    "weekdays": {
      "monday": false,
      "tuesday": true,
      "wednesday": true,
      "thursday": false,
      "friday": true
    },
    "can_substitute": true,
    "family_serve_preference": "together",
    "notes": "Prefiro servir com minha família"
  },
  "submitted_at": "2025-09-28T14:30:00Z",
  "updated_at": "2025-09-28T14:30:00Z"
}
```

---

## 3. DATA VALIDATION RULES

### Date Format Rules
✅ **MUST USE**: ISO 8601 format `YYYY-MM-DD`
❌ **NEVER USE**: `DD/MM`, `MM/DD/YYYY`, or text like "Domingo 05/10"

### Time Format Rules
✅ **MUST USE**: 24-hour format `HH:MM` (e.g., `08:00`, `19:30`)
❌ **NEVER USE**: `8h`, `19h30`, `7:00 PM`

### DateTime Key Format (for novena/feast)
✅ **MUST USE**: `YYYY-MM-DD_HH:MM` (e.g., `2025-10-20_19:30`)
❌ **NEVER USE**: Mixed formats or text descriptions

### Boolean Rules
✅ **MUST USE**: `true` or `false` (JSON boolean)
❌ **NEVER USE**: `"Sim"`, `"Não"`, `1`, `0`

---

## 4. LEGACY FORMAT COMPATIBILITY

### Current October 2025 Format (LEGACY - v1.0)
```json
{
  "responses": [
    {"questionId": "available_sundays", "answer": ["Domingo 05/10", "Domingo 12/10"]},
    {"questionId": "main_service_time", "answer": "10h"},
    {"questionId": "saint_judas_novena", "answer": ["Terça 20/10 às 19h30", "Quinta 22/10 às 19h30"]}
  ]
}
```

### Migration Strategy
The system MUST support BOTH formats during transition:

1. **Reading (Backward Compatibility)**
   - Detect format version
   - Parse legacy format if no `format_version` field
   - Convert legacy → v2.0 structure internally

2. **Writing (Forward Only)**
   - All NEW responses use v2.0 format
   - Update existing responses to v2.0 when edited

---

## 5. IMPLEMENTATION CHECKLIST

### Frontend (QuestionnaireUnified.tsx)
- [ ] Update form state to match v2.0 structure
- [ ] Convert date selections to ISO format
- [ ] Convert time selections to 24h format
- [ ] Use datetime keys for novena/feast arrays
- [ ] Submit with `format_version: '2.0'`

### Backend (scheduleGenerator.ts)
- [ ] Add format version detection
- [ ] Implement v2.0 parser (primary)
- [ ] Keep legacy parser (fallback)
- [ ] Use ISO dates for all comparisons
- [ ] Use 24h times for all comparisons

### Database
- [ ] Add format_version column (nullable for legacy)
- [ ] Create migration to backfill version field
- [ ] Add validation constraint on response structure

---

## 6. ALGORITHM USAGE

### Reading Minister Availability
```typescript
function isMinisterAvailable(
  response: QuestionnaireResponse,
  massDate: string,      // '2025-10-20'
  massTime: string       // '19:30'
): boolean {
  // V2.0 format (primary)
  if (response.responses.format_version === '2.0') {
    // Check novena
    const novenaKey = `${massDate}_${massTime}`;
    if (response.responses.special_events?.saint_judas_novena?.includes(novenaKey)) {
      return true;
    }

    // Check regular Sunday mass
    if (response.responses.masses?.[massDate]?.[massTime] === true) {
      return true;
    }

    return false;
  }

  // Legacy format (fallback)
  return checkLegacyAvailability(response, massDate, massTime);
}
```

---

## 7. MIGRATION PLAN

### Phase 1: Dual Support (Current)
- System reads BOTH formats
- New submissions use v2.0
- Legacy responses remain unchanged

### Phase 2: Gradual Migration (3 months)
- Background job converts legacy → v2.0
- UI prompts users to update old responses
- Both formats still supported

### Phase 3: v2.0 Only (6 months)
- Remove legacy parser
- All responses guaranteed v2.0
- Simplified codebase

---

## 8. TESTING REQUIREMENTS

### Unit Tests Required
```typescript
describe('Questionnaire Response v2.0', () => {
  test('parses novena availability correctly', () => {
    const response = createV2Response();
    expect(isAvailableForNovena(response, '2025-10-20', '19:30')).toBe(true);
  });

  test('handles legacy format gracefully', () => {
    const legacyResponse = createLegacyResponse();
    expect(isAvailableForNovena(legacyResponse, '2025-10-20', '19:30')).toBe(true);
  });

  test('rejects invalid date formats', () => {
    expect(() => submitResponse({masses: {'05/10': {...}}})).toThrow();
  });
});
```

---

## 9. ERROR HANDLING

### Validation Errors
```typescript
enum ValidationError {
  INVALID_DATE_FORMAT = 'Date must be ISO 8601 (YYYY-MM-DD)',
  INVALID_TIME_FORMAT = 'Time must be 24h format (HH:MM)',
  MISSING_VERSION = 'format_version field required for v2.0',
  INVALID_BOOLEAN = 'Value must be true or false, not string'
}
```

### Error Recovery
- If validation fails, reject submission with clear error
- Log error details for debugging
- Suggest correct format in error message

---

## 10. PERFORMANCE CONSIDERATIONS

### Indexing Strategy
```sql
-- Index for fast date lookups
CREATE INDEX idx_responses_masses ON questionnaire_responses
USING GIN ((responses->'masses'));

-- Index for novena lookups
CREATE INDEX idx_responses_novena ON questionnaire_responses
USING GIN ((responses->'special_events'->'saint_judas_novena'));
```

### Caching Strategy
- Cache parsed responses in memory during schedule generation
- Use Map<userId, ParsedResponse> for O(1) lookups
- Invalidate cache when response updated

---

## SUMMARY

### Key Principles
1. **Consistency**: Same format everywhere
2. **Precision**: ISO dates, 24h times, exact datetime keys
3. **Validation**: Strict schema enforcement
4. **Compatibility**: Support legacy during transition
5. **Performance**: Indexed for fast queries

### Contact
For questions or clarification, refer to:
- Technical Lead: [Contact Info]
- Documentation: `/docs/QUESTIONNAIRE_DATA_CONTRACT.md`
- Implementation: `server/utils/scheduleGenerator.ts`
