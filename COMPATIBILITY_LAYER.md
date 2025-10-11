# Questionnaire Format Compatibility Layer

**Date:** October 11, 2025
**Status:** ✅ IMPLEMENTED
**Commit:** TBD

---

## 🎯 Purpose

The compatibility layer allows the schedule generator to read questionnaire responses from different months **WITHOUT modifying the database**. Each month's questionnaire may have a different structure, and this adapter handles all format variations.

---

## 🔧 How It Works

### **Version Detection**

The compatibility layer automatically detects the questionnaire format based on `year` and `month`:

```typescript
if (questionnaireMonth === 10 && questionnaireYear === 2025) {
  // Use October 2025 format parser
} else if (questionnaireMonth === 11 && questionnaireYear === 2025) {
  // Add November 2025 format parser here
} else {
  // Default/fallback behavior
}
```

### **October 2025 Format**

**Database Structure:**
- Field: `responses` (JSONB)
- Format: Array of `{questionId: string, answer: any}` objects

**Example:**
```json
[
  {"questionId": "monthly_availability", "answer": "Sim"},
  {"questionId": "main_service_time", "answer": "10h"},
  {"questionId": "available_sundays", "answer": ["Domingo 05/10", "Domingo 12/10"]},
  {"questionId": "can_substitute", "answer": "Sim"},
  {"questionId": "saint_judas_novena", "answer": ["Terça 20/10 às 19h30"]}
]
```

**Adapter Logic:**
```typescript
private adaptQuestionnaireResponse(
  response: any,
  questionnaireYear: number,
  questionnaireMonth: number
): {
  availableSundays: any[];
  preferredMassTimes: any[];
  alternativeTimes: any[];
  dailyMassAvailability: any[];
  canSubstitute: boolean;
  specialEvents: Record<string, any>;
}
```

The adapter:
1. ✅ **Detects** the format based on year/month
2. ✅ **Parses** the responses array
3. ✅ **Extracts** all relevant fields
4. ✅ **Returns** standardized structure

---

## 📊 Test Results

**October 2025 Data:**
- ✅ 106 responses processed successfully
- ✅ All fields extracted correctly:
  - Available Sundays
  - Preferred times
  - Can substitute
  - Special events (novena, feast day masses)
- ✅ Generation time: 777ms
- ✅ 44 masses generated
- ✅ Zero parsing errors

**Console Output:**
```
[SCHEDULE_GEN] 🔄 Using COMPATIBILITY LAYER for 2025/10
[COMPATIBILITY_LAYER] ✅ Detected October 2025 format - using array parser
[COMPATIBILITY_LAYER] ✅ October 2025 format parsed successfully
[COMPATIBILITY_LAYER]    - Sundays: 3
[COMPATIBILITY_LAYER]    - Preferred times: 1
[COMPATIBILITY_LAYER]    - Can substitute: true
```

---

## 🚀 Adding New Formats (November 2025+)

When creating a questionnaire for November 2025 with a new format:

### **Step 1: Identify the new format**

Check the database:
```sql
SELECT responses FROM questionnaire_responses
WHERE questionnaire_id = '<november-questionnaire-id>'
LIMIT 1;
```

### **Step 2: Add version detection**

In `adaptQuestionnaireResponse()`:
```typescript
} else if (questionnaireMonth === 11 && questionnaireYear === 2025) {
  console.log(`[COMPATIBILITY_LAYER] ✅ Detected November 2025 format`);

  // Parse November format here
  // Example: if it's an object instead of array
  if (typeof response.responses === 'object' && !Array.isArray(response.responses)) {
    availableSundays = response.responses.availableSundays || [];
    preferredMassTimes = response.responses.preferredTimes || [];
    canSubstitute = response.responses.canSubstitute || false;
    // ... etc
  }
}
```

### **Step 3: Test with real data**

```bash
NODE_ENV=development npx tsx test-fair-algorithm.ts
```

Look for:
- ✅ `[COMPATIBILITY_LAYER] ✅ Detected November 2025 format`
- ✅ No parsing errors
- ✅ All fields extracted correctly

---

## 🛡️ Safety Features

### **1. Database Protection**
- ✅ **READ-ONLY:** Adapter only reads data, never writes
- ✅ **No migrations:** October data stays in original format
- ✅ **Zero risk:** Cannot corrupt existing data

### **2. Fallback Mechanisms**
```typescript
// Fallback to separate JSONB fields (legacy support)
if (!availableSundays.length && response.availableSundays) {
  availableSundays = typeof response.availableSundays === 'string'
    ? JSON.parse(response.availableSundays)
    : response.availableSundays;
}
```

### **3. Error Handling**
```typescript
try {
  // Parse responses
} catch (error) {
  console.error(`[COMPATIBILITY_LAYER] ❌ Error parsing:`, error);
  return { /* empty defaults */ };
}
```

---

## 📁 File Locations

**Main Implementation:**
- `server/utils/scheduleGenerator.ts:443-587` - Adapter function
- `server/utils/scheduleGenerator.ts:694-703` - Usage in loadAvailabilityData

**Test Script:**
- `test-fair-algorithm.ts` - Test with October 2025 data

---

## 🔍 Debugging

**Enable detailed logs:**
```typescript
console.log(`[COMPATIBILITY_LAYER] Adapting response for ${questionnaireMonth}/${questionnaireYear}`);
console.log(`[COMPATIBILITY_LAYER] ✅ Detected October 2025 format - using array parser`);
console.log(`[COMPATIBILITY_LAYER]    - Sundays: ${availableSundays.length}`);
```

**Check format detection:**
```bash
npm run dev 2>&1 | grep COMPATIBILITY_LAYER
```

---

## 📋 Summary

| Feature | Status |
|---------|--------|
| October 2025 support | ✅ Working |
| Database read-only | ✅ Safe |
| Fallback mechanism | ✅ Implemented |
| Error handling | ✅ Robust |
| Future-ready | ✅ Extensible |
| Test coverage | ✅ Validated |

**The October 2025 data is SAFE and UNTOUCHED in production!** 🎉

---

## 🎓 Key Principles

1. **Read, Never Write:** Adapter only reads existing data
2. **Version Detection:** Explicit year/month checks
3. **Graceful Fallback:** Multiple parsing strategies
4. **Clear Logging:** Easy to debug format issues
5. **Future-Proof:** Simple to add new formats

---

**Generated with Claude Code**
**Co-Authored-By:** Claude <noreply@anthropic.com>
