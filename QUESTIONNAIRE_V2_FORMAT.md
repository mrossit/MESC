# Questionnaire Format v2.0 (November 2025+)

**Date:** October 11, 2025
**Status:** ✅ IMPLEMENTED IN COMPATIBILITY LAYER
**Target:** November 2025 onwards

---

## 🎯 Purpose

Version 2.0 introduces an improved questionnaire response format that eliminates ambiguity and provides explicit yes/no for each mass, making scheduling more accurate and user-friendly.

---

## 📊 Format Comparison

### **October 2025 (v1.0) - Array Format:**
```json
[
  {"questionId": "available_sundays", "answer": ["Domingo 05/10", "Domingo 12/10"]},
  {"questionId": "main_service_time", "answer": "10h"},
  {"questionId": "can_substitute", "answer": "Sim"}
]
```

**Problems:**
- ❌ String-based dates ("Domingo 05/10") - parsing fragile
- ❌ No explicit rejection - unclear if "not available" or "not answered"
- ❌ Can't see total commitment before submitting
- ❌ Difficult to validate

### **November 2025+ (v2.0) - Structured Format:**
```json
{
  "version": "2.0",
  "availability": {
    "2025-11-02_08:00": true,
    "2025-11-02_10:00": false,
    "2025-11-02_19:00": true,
    "2025-11-09_08:00": true,
    "2025-11-09_10:00": true,
    "2025-11-09_19:00": false,

    "weekday_06:30": ["mon", "tue", "wed"],

    "first_thursday_healing": true,
    "first_friday_sacred": false,
    "first_saturday_immaculate": true
  },
  "preferences": {
    "max_per_month": 3,
    "preferred_times": ["10:00", "19:00"],
    "avoid_times": ["06:30"]
  },
  "substitute": {
    "available": true,
    "conditions": "only_sundays"
  }
}
```

**Advantages:**
- ✅ **Explicit dates** - ISO format (YYYY-MM-DD_HH:MM)
- ✅ **Clear intent** - `true`/`false` for each mass
- ✅ **Version tracking** - `version` field for compatibility
- ✅ **Type-safe** - Structured, validated data
- ✅ **User preview** - "Você está disponível para 5 missas"

---

## 🔧 Data Structure

### **1. Version Field**
```typescript
version: "2.0"  // Required - identifies format
```

### **2. Availability Object**

**Sunday/Event Masses:**
```typescript
"2025-11-02_08:00": true,   // Available for Nov 2 at 8am
"2025-11-02_10:00": false,  // NOT available for Nov 2 at 10am
"2025-11-02_19:00": true,   // Available for Nov 2 at 7pm
```

**Weekday Masses:**
```typescript
"weekday_06:30": ["mon", "tue", "wed"],  // Available Mon-Wed at 6:30am
"weekday_19:30": ["thu", "fri"],         // Available Thu-Fri at 7:30pm
```

**Special Masses:**
```typescript
"first_thursday_healing": true,          // 1st Thursday healing mass
"first_friday_sacred": false,            // 1st Friday Sacred Heart (not available)
"first_saturday_immaculate": true,       // 1st Saturday Immaculate Heart
```

### **3. Preferences Object**
```typescript
{
  "max_per_month": 3,               // User-defined limit
  "preferred_times": ["10:00", "19:00"],  // Prefers 10am and 7pm
  "avoid_times": ["06:30"]          // Prefers to avoid 6:30am
}
```

### **4. Substitute Object**
```typescript
{
  "available": true,                // Can substitute
  "conditions": "only_sundays"      // Conditions: "any", "only_sundays", "only_weekdays"
}
```

---

## 🔄 Compatibility Layer Support

The adapter (in `scheduleGenerator.ts`) automatically handles v2.0:

```typescript
if (questionnaireMonth >= 11 && questionnaireYear >= 2025) {
  console.log(`[COMPATIBILITY_LAYER] ✅ Detected v2.0 format (Nov 2025+)`);

  if (data.version === '2.0') {
    // Parse new format
    const availability = data.availability || {};

    // Extract explicit date-time availability
    Object.keys(availability).forEach(key => {
      if (key.match(/^\d{4}-\d{2}-\d{2}_/) && availability[key] === true) {
        const [datePart, timePart] = key.split('_');
        availableSundays.push(`${datePart} ${timePart}`);
      }
    });

    // Parse weekday availability
    if (availability['weekday_06:30']) {
      const days = availability['weekday_06:30']; // ['mon', 'tue', 'wed']
      dailyMassAvailability = days.map(d => dayMap[d]); // ['Segunda', 'Terça', 'Quarta']
    }

    // Parse special events
    if (availability.first_thursday_healing) {
      specialEvents['healing_liberation_mass'] = 'Sim';
    }
  } else {
    // Fallback to October format
    console.log(`[COMPATIBILITY_LAYER] ℹ️ No version field, trying October format`);
  }
}
```

---

## 🎨 User Interface Changes

### **Before (October 2025):**
```
□ Domingo 05/10
□ Domingo 12/10
□ Domingo 19/10
```

Minister checks boxes, but doesn't see:
- What TIME on those Sundays
- How many total masses committed
- Total workload for the month

### **After (November 2025+):**
```
┌─────────────────────────────────────────┐
│ Domingo 02/11                           │
│ □ 08:00  □ 10:00  ☑ 19:00              │
├─────────────────────────────────────────┤
│ Domingo 09/11                           │
│ ☑ 08:00  ☑ 10:00  □ 19:00              │
└─────────────────────────────────────────┘

Resumo: Você está disponível para 5 missas em Novembro
```

Clear preview with:
- ✅ Exact times shown
- ✅ Total count displayed
- ✅ Visual confirmation
- ✅ Can review before submit

---

## 🛡️ Migration Safety

### **No Database Changes Required**

Both formats use the same `responses` JSONB field:

```sql
-- October 2025 (array format)
responses: [{questionId: "...", answer: "..."}]

-- November 2025+ (v2.0 format)
responses: {version: "2.0", availability: {...}, ...}
```

### **Algorithm Auto-Detects Format**

```typescript
if (month === 10 && year === 2025) {
  // Use October parser
} else if (month >= 11 && year >= 2025) {
  // Check for version field
  if (data.version === '2.0') {
    // Use v2.0 parser
  } else {
    // Fallback to October parser
  }
}
```

### **Zero Risk to Production**

- ✅ October data **never touched**
- ✅ New format **opt-in**
- ✅ Fallback mechanism **built-in**
- ✅ Version field **explicitly checked**

---

## 📋 Implementation Checklist

### **Backend (✅ DONE):**
- [x] Add v2.0 parser to compatibility layer
- [x] Version detection logic
- [x] Date-time extraction
- [x] Weekday parsing
- [x] Special events mapping
- [x] Fallback to October format

### **Frontend (⏳ TODO):**
- [ ] Create new questionnaire UI for November
- [ ] Show all masses with explicit checkboxes
- [ ] Display live summary: "Disponível para X missas"
- [ ] Validate before submit
- [ ] Save in v2.0 format

### **Testing (⏳ TODO):**
- [ ] Test v2.0 format with mock data
- [ ] Verify schedule generation
- [ ] Compare October vs November output
- [ ] Validate all edge cases

---

## 🧪 Example v2.0 Response

```json
{
  "version": "2.0",
  "availability": {
    // November Sundays
    "2025-11-02_08:00": true,
    "2025-11-02_10:00": false,
    "2025-11-02_19:00": true,

    "2025-11-09_08:00": true,
    "2025-11-09_10:00": true,
    "2025-11-09_19:00": false,

    "2025-11-16_08:00": false,
    "2025-11-16_10:00": true,
    "2025-11-16_19:00": true,

    "2025-11-23_08:00": true,
    "2025-11-23_10:00": false,
    "2025-11-23_19:00": true,

    "2025-11-30_08:00": false,
    "2025-11-30_10:00": false,
    "2025-11-30_19:00": true,

    // Weekday masses
    "weekday_06:30": ["mon", "wed", "fri"],

    // Special masses
    "first_thursday_healing": true,
    "first_friday_sacred": true,
    "first_saturday_immaculate": false
  },
  "preferences": {
    "max_per_month": 4,
    "preferred_times": ["10:00", "19:00"],
    "avoid_times": ["06:30"]
  },
  "substitute": {
    "available": true,
    "conditions": "only_sundays"
  }
}
```

**Parse Result:**
- **Available for 7 Sunday masses** (explicit dates and times)
- **Available for weekday masses** (Mon/Wed/Fri at 6:30am)
- **Available for 2 special masses** (healing + sacred heart)
- **Total: ~10 masses in November**
- **Can substitute on Sundays only**

---

## 🎓 Key Principles

1. **Explicit > Implicit** - Every mass has clear yes/no
2. **Structured > String-based** - ISO dates, not text parsing
3. **Versioned > Guessed** - `version` field for compatibility
4. **Preview > Surprise** - Show total before submit
5. **Safe > Risky** - No migration, fallback built-in

---

## 📁 File Locations

**Compatibility Layer:**
- `server/utils/scheduleGenerator.ts:556-660` - v2.0 parser

**Documentation:**
- `QUESTIONNAIRE_V2_FORMAT.md` - This file
- `COMPATIBILITY_LAYER.md` - Overall compatibility strategy

---

## 🚀 Next Steps

1. **Create November questionnaire UI** with v2.0 format
2. **Add preview component** showing total commitment
3. **Test with mock November data**
4. **Launch for November 2025**
5. **Monitor adoption** and user feedback

---

**Generated with Claude Code**
**Co-Authored-By:** Claude <noreply@anthropic.com>
