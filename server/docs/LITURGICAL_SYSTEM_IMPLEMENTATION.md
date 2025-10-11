# Liturgical Calendar System Implementation Guide

## Overview
Complete Catholic liturgical calendar-aware scheduling system for MESC ministry.

## Database Schema (COMPLETED)

### Tables Created in shared/schema.ts:

1. **liturgical_years**
   - Tracks liturgical year cycles (A, B, C)
   - Stores Advent start/end dates
   - Calculated Easter dates

2. **liturgical_seasons**
   - Advent, Christmas, Lent, Easter, Ordinary Time
   - Color coding (purple, white, green, red, rose, black)
   - Date ranges per season

3. **liturgical_celebrations**
   - Solemnities, Feasts, Memorials
   - Special mass configurations
   - Saint of the day
   - Movable feast tracking

4. **liturgical_mass_overrides**
   - Coordinator-defined special mass times
   - Override min/max ministers for special occasions

## Next Steps for Implementation

### 1. Easter Calculation (Computus Algorithm)
Location: `server/utils/liturgicalCalculations.ts`

```typescript
export function calculateEaster(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}
```

### 2. Mass Configuration Constants
Location: `shared/constants/massConfig.ts`

```typescript
export const MASS_CONFIGURATIONS = {
  REGULAR: {
    SUNDAY: [
      { time: '08:00', min: 15, max: 20 },
      { time: '10:00', min: 20, max: 28 },
      { time: '19:00', min: 20, max: 28 }
    ],
    WEEKDAY: [
      { time: '06:30', min: 5, max: 8 }
    ],
    SATURDAY: [
      { time: '06:30', min: 5, max: 8 }
    ]
  },
  SPECIAL_MONTHLY: {
    FIRST_THURSDAY_HEALING: { time: '19:30', min: 20, max: 28 },
    FIRST_FRIDAY_SACRED_HEART: { time: '06:30', min: 8, max: 12 },
    FIRST_SATURDAY_IMMACULATE_HEART: { time: '06:30', min: 8, max: 12 }
  },
  ST_JUDE_DAY_28: {
    WEEKDAY: [
      { time: '07:00', min: 12, max: 12 },
      { time: '15:00', min: 12, max: 12 },
      { time: '19:30', min: 20, max: 25 }
    ],
    SATURDAY: [
      { time: '07:00', min: 12, max: 12 },
      { time: '15:00', min: 12, max: 12 },
      { time: '19:00', min: 20, max: 25 }
    ],
    SUNDAY: [
      { time: '08:00', min: 20, max: 20 },
      { time: '10:00', min: 25, max: 28 },
      { time: '15:00', min: 18, max: 20 },
      { time: '19:00', min: 25, max: 28 }
    ],
    OCTOBER_FEAST: [
      { time: '07:00', min: 12, max: 12 },
      { time: '10:00', min: 12, max: 12 },
      { time: '12:00', min: 12, max: 12 },
      { time: '15:00', min: 12, max: 12 },
      { time: '17:00', min: 15, max: 15 },
      { time: '19:30', min: 20, max: 25 }
    ]
  },
  SOLEMNITIES: {
    CHRISTMAS_MIDNIGHT: { time: '00:00', min: 25, max: 28 },
    CHRISTMAS_MORNING: { time: '08:00', min: 18, max: 20 },
    CHRISTMAS_DAY: { time: '10:00', min: 25, max: 28 },
    EASTER_VIGIL: { time: '20:00', min: 25, max: 28 },
    CORPUS_CHRISTI: { processionMinisters: 10 }
  }
};
```

### 3. Seeding Script
Location: `server/seeds/liturgical-calendar.ts`

Populate 2024-2026 with:
- All Sundays and solemnities
- Movable feasts (Easter-dependent)
- Fixed feast days
- Liturgical seasons

### 4. API Endpoints Needed

#### GET /api/liturgical/current-season
Returns current liturgical season and cycle for UI display

#### GET /api/liturgical/celebrations/:month/:year
Returns all special celebrations for questionnaire generation

#### GET /api/liturgical/mass-config/:date
Returns mass configuration for specific date (considers overrides)

#### POST /api/liturgical/overrides (Coordinator only)
Create special mass time overrides

### 5. Frontend Components

#### LiturgicalContext Provider
```typescript
// client/src/contexts/LiturgicalContext.tsx
export const LiturgicalContext = createContext({
  currentSeason: null,
  currentCycle: 'A',
  getCurrentSeasonColor: () => 'green',
  getCelebrationForDate: (date) => null,
});
```

#### Enhanced AutoScheduleGeneration.tsx
- Calendar with liturgical color bars
- Celebration badges (gold star for solemnities)
- Minister assignment with liturgical appropriateness scoring
- Generate button with modes:
  - Standard Generation
  - Maximize Coverage
  - Holiday Mode

#### Liturgical Settings Page (Coordinator)
- Override mass times
- Set minister requirements
- Pre-generation checklist
- Post-generation analytics

### 6. Intelligent Scheduling Algorithm

Priority scoring system:
```typescript
function calculateMinisterScore(minister, mass, celebration) {
  let score = 0;

  // Rank-based priorities
  if (celebration.rank === 'SOLEMNITY') {
    score += minister.yearsOfService * 10;
    score += minister.liturgicalTraining ? 50 : 0;
  }

  // Season-based
  if (season.name === 'Advent' || season.name === 'Lent') {
    score += minister.contemplativeScore || 0;
  }

  // Balance fairness
  const servicesThisMonth = getMonthlyServiceCount(minister);
  score -= servicesThisMonth * 5;

  // Availability
  score += minister.preferredTimes.includes(mass.time) ? 20 : 0;

  return score;
}
```

### 7. Visual Indicators

Liturgical color mapping:
```typescript
export const LITURGICAL_COLORS = {
  purple: '#8B4789',  // Advent/Lent
  white: '#FFFFFF',   // Christmas/Easter
  green: '#5C8F4F',   // Ordinary Time
  red: '#C41E3A',     // Pentecost/Martyrs
  rose: '#FF007F',    // Gaudete/Laetare Sundays
  black: '#000000'    // Good Friday
};
```

### 8. Mobile Optimization

Simplified view showing:
- Current liturgical season banner
- Next celebration
- Key assignment details only

## Migration Plan

1. ✅ Database schema created
2. Run migration: `npm run db:push` (after testing in dev)
3. Create seeding script
4. Populate 2024-2026 data
5. Implement Easter calculation
6. Create liturgical API endpoints
7. Build frontend context provider
8. Enhance existing pages with liturgical awareness
9. Test scheduling algorithm
10. Deploy with feature flag

## Testing Checklist

- [ ] Easter calculation accuracy (2024-2030)
- [ ] Cycle determination (A/B/C)
- [ ] Movable feast date calculation
- [ ] Mass configuration for Day 28
- [ ] October novena handling
- [ ] Solemnity override logic
- [ ] Minister priority scoring
- [ ] Season color display
- [ ] Mobile responsiveness
- [ ] Performance with large datasets

## Future Enhancements

- Automatic reading suggestions
- Saint feast day integration
- Liturgical music recommendations
- Formation modules per season
- Historical schedule analytics
- Export liturgical calendar PDF

---

**Status**: Database schema complete, ready for implementation
**Est. Completion Time**: 2-3 weeks for full system
**Priority**: High for enhanced scheduling during liturgical seasons
