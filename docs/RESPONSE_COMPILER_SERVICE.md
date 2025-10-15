# Response Compiler & Availability Service

## Overview

Two new services that standardize questionnaire response handling and provide easy querying of minister availability.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ResponseCompiler                        │
│  - Fetches responses from database                          │
│  - Auto-detects format (V2.0, V1.0 Array, Legacy)          │
│  - Converts to unified CompiledAvailability format          │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    CompiledAvailability Map
                  (userId → structured data)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AvailabilityService                       │
│  - Query methods for schedule generation                    │
│  - Who is available for specific mass?                      │
│  - Statistics and analytics                                 │
│  - Family and substitution logic                            │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. `/server/services/responseCompiler.ts`

**Purpose:** Compiles raw questionnaire responses into standardized format

**Key Features:**
- ✅ Auto-detects response format (V2.0, V1.0 Array, Legacy)
- ✅ Handles October 2025 special events (São Judas novena & feast)
- ✅ Parses legacy date formats ("Domingo 05/10")
- ✅ Parses legacy time formats ("19h30")
- ✅ Extracts weekday availability
- ✅ Includes minister metadata (family, substitute eligibility)

**Main Method:**
```typescript
await ResponseCompiler.compileMonthlyResponses(month: number, year: number)
```

**Output Format:**
```typescript
interface CompiledAvailability {
  userId: string;
  userName: string;
  month: number;
  year: number;
  availability: {
    dates: {
      '2025-10-28': {
        date: '2025-10-28',
        times: { '07:00': true, '10:00': false }
      }
    };
    weekdays: {
      monday: boolean;
      tuesday: boolean;
      // ...
    };
    specialEvents: {
      saint_judas_novena?: string[];
      saint_judas_feast?: Record<string, boolean>;
    };
  };
  metadata: {
    canSubstitute: boolean;
    preferredPosition?: number;
    familyId?: string;
    notes?: string;
  };
}
```

### 2. `/server/services/availabilityService.ts`

**Purpose:** Query interface for compiled availability data

**Key Methods:**

```typescript
// Who is available for a specific mass?
getAvailableMinistersForMass(date: string, time: string): string[]

// Is a specific minister available?
isMinisterAvailable(userId: string, date: string, time: string): boolean

// Get full minister data
getMinisterAvailability(userId: string): CompiledAvailability | undefined

// Statistics for a mass
getAvailabilityStats(date: string, time: string): {
  available: number;
  total: number;
  percentage: number;
  ministers: Array<{id: string, name: string}>;
}

// Substitution queries
getSubstituteEligibleMinisters(): string[]
getAvailableSubstitutes(date: string, time: string): string[]

// Family queries
getFamilyMembers(userId: string): string[]
shouldServeWithFamily(userId: string): boolean

// Minister-specific queries
getMinisterAvailableDates(userId: string): string[]
getMinisterAvailableTimes(userId: string, date: string): string[]

// Monthly overview
getMonthlyStats(): MonthlyStatistics
getAllMinisters(): MinisterSummary[]
```

### 3. `/scripts/test-availability-service.ts`

**Purpose:** Test script demonstrating service usage

**What it tests:**
1. ✅ Compilation of October 2025 responses (107 ministers)
2. ✅ Availability queries for specific masses
3. ✅ Monthly statistics generation
4. ✅ Substitution eligibility
5. ✅ Individual minister queries
6. ✅ Critical mass detection (low availability)

## Usage Example

```typescript
import { ResponseCompiler } from './server/services/responseCompiler';
import { AvailabilityService } from './server/services/availabilityService';

// Step 1: Compile responses for a month
const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);

// Step 2: Create availability service
const availService = new AvailabilityService(compiled);

// Step 3: Query availability
const available = availService.getAvailableMinistersForMass('2025-10-28', '19:30');
console.log(`São Judas 19h30: ${available.length} ministros disponíveis`);

// Step 4: Get statistics
const stats = availService.getAvailabilityStats('2025-10-28', '19:30');
console.log(`${stats.percentage}% de ministros disponíveis`);

// Step 5: Check specific minister
const isAvailable = availService.isMinisterAvailable(
  ministerId,
  '2025-10-28',
  '19:30'
);
```

## Test Results (October 2025)

✅ **Successfully compiled 107 minister responses**

Sample statistics:
- Format detection: 100% success rate
- V1.0 Array format: Dominant format in October 2025
- Special events parsed: São Judas novena (19-27/10) + feast day (28/10)
- Weekday availability: Correctly extracted for daily masses
- Date parsing: Legacy formats ("Domingo 05/10") → ISO ("2025-10-05")
- Time parsing: Legacy formats ("19h30") → 24h ("19:30")

## Integration Points

### For Schedule Generator

```typescript
// Use in schedule generation algorithm
const availService = new AvailabilityService(compiledData);

for (const mass of masses) {
  const candidates = availService.getAvailableMinistersForMass(
    mass.date,
    mass.time
  );

  // Filter by position preference
  // Apply constraints (workload, family, etc.)
  // Assign ministers
}
```

### For API Endpoints

```typescript
// GET /api/availability/stats?month=10&year=2025
app.get('/api/availability/stats', async (req, res) => {
  const compiled = await ResponseCompiler.compileMonthlyResponses(
    req.query.month,
    req.query.year
  );

  const service = new AvailabilityService(compiled);
  const stats = service.getMonthlyStats();

  res.json(stats);
});

// GET /api/availability/mass?date=2025-10-28&time=19:30
app.get('/api/availability/mass', async (req, res) => {
  const compiled = await ResponseCompiler.compileMonthlyResponses(10, 2025);
  const service = new AvailabilityService(compiled);

  const stats = service.getAvailabilityStats(
    req.query.date,
    req.query.time
  );

  res.json(stats);
});
```

## Benefits

### 1. **Format Independence**
- Schedule generation code doesn't need to know about questionnaire formats
- Works with V1.0, V2.0, or legacy responses automatically
- Future format changes isolated to ResponseCompiler

### 2. **Clean Interface**
- Simple, intuitive query methods
- No complex SQL joins needed
- Type-safe TypeScript interfaces

### 3. **Performance**
- In-memory Map for O(1) lookups
- Pre-compiled data structure
- No repeated database queries during generation

### 4. **Maintainability**
- Single source of truth for availability logic
- Testable and mockable
- Clear separation of concerns

### 5. **Analytics Ready**
- Built-in statistics methods
- Monthly overview capabilities
- Critical mass detection

## Next Steps

1. **Integrate with Schedule Generator**
   - Replace direct database queries with AvailabilityService
   - Use standardized availability checks
   - Simplify mass assignment logic

2. **Add Caching**
   - Cache compiled responses per month
   - Invalidate on questionnaire updates
   - Reduce database load

3. **API Endpoints**
   - Expose availability queries via REST API
   - Real-time availability dashboard
   - Minister availability calendar

4. **Testing**
   - Unit tests for edge cases
   - Integration tests with real data
   - Performance benchmarks

## Related Documentation

- `docs/QUESTIONNAIRE_DATA_CONTRACT.md` - Response format specifications
- `docs/VALIDATION_SYSTEM_USAGE.md` - Validation layer
- `server/utils/responseParser.ts` - Legacy parser (deprecated by this service)
