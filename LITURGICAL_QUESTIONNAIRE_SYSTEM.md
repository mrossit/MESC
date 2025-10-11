# Liturgically-Aware Questionnaire System

**Date:** October 11, 2025
**Status:** ✅ IMPLEMENTED (Backend)
**Target:** November 2025 onwards

---

## 🕊️ Purpose

The liturgically-aware questionnaire system integrates Catholic liturgical themes into monthly questionnaires, making them spiritually meaningful while producing algorithm-friendly structured data.

---

## 📅 Liturgical Themes by Month

| Month | Theme | Color | Description |
|-------|-------|-------|-------------|
| Janeiro | Santíssimo Nome de Jesus | Branco | Nome de Jesus e início do ano litúrgico |
| Fevereiro | Sagrada Família | Branco | Devoção à Sagrada Família |
| Março | São José | Branco | Protetor da Igreja |
| Abril | Eucaristia e Espírito Santo | Branco | Páscoa, Eucaristia e Espírito Santo |
| Maio | Virgem Maria | Azul | Mês mariano |
| Junho | Sagrado Coração de Jesus | Vermelho | Amor infinito de Jesus |
| Julho | Preciosíssimo Sangue de Cristo | Vermelho | Sangue redentor |
| Agosto | Vocações | Verde | Vocações sacerdotais |
| Setembro | Bíblia | Verde | Palavra de Deus |
| Outubro | Rosário | Azul | Nossa Senhora do Rosário |
| Novembro | Almas do Purgatório | Roxo | Orações pelos falecidos |
| Dezembro | Advento e Natal | Roxo/Branco | Preparação e Natal |

---

## 🎯 System Features

### **1. Auto-Generated Questions**

The system automatically generates questions based on the month:

```typescript
const questionnaire = generateLiturgicalQuestionnaire(11, 2025);

// Returns:
{
  month: 11,
  year: 2025,
  theme: {
    name: 'Almas do Purgatório',
    color: 'purple',
    colorHex: '#7B1FA2',
    description: 'Orações pelas almas do purgatório...'
  },
  questions: [
    {
      id: 'sunday_masses',
      type: 'checkbox_grid',
      question: 'Missas Dominicais - Almas do Purgatório',
      options: [
        { id: '2025-11-02_08:00', date: '2025-11-02', time: '08:00', ... },
        { id: '2025-11-02_10:00', date: '2025-11-02', time: '10:00', ... },
        // ... all Sundays and times
      ]
    },
    {
      id: 'weekday_masses',
      type: 'multiselect',
      question: 'Missas Diárias (6h30)',
      options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
    },
    {
      id: 'special_masses',
      type: 'checkbox_list',
      question: 'Missas Especiais do Mês',
      options: [
        '1ª Quinta-feira - Cura e Libertação',
        '1ª Sexta-feira - Sagrado Coração',
        '1º Sábado - Imaculado Coração',
        'Dia de Finados (2/11) - 7h',
        'Dia de Finados (2/11) - 10h',
        'Dia de Finados (2/11) - 15h'
      ]
    },
    {
      id: 'can_substitute',
      type: 'radio',
      question: 'Disponível para substituições?',
      options: ['Sim', 'Apenas domingos', 'Não']
    }
  ]
}
```

### **2. Special Month Handling**

**November (Almas do Purgatório):**
- ✅ Auto-adds All Souls Day masses (Nov 2: 7h, 10h, 15h)
- ✅ Theme: Purple (mourning and remembrance)
- ✅ Focus on prayers for the deceased

**December (Advento e Natal):**
- ✅ Auto-adds Christmas masses:
  - Midnight Mass (Dec 24 - 00h)
  - Christmas Day (Dec 25 - 8h, 10h, 19h)
  - New Year's Eve (Dec 31 - 19h)
- ✅ Theme: Purple/White (Advent preparation and Christmas joy)

**Other Months:**
- Standard Sunday masses (8h, 10h, 19h)
- Weekday masses (6:30)
- First Thursday/Friday/Saturday special masses

---

## 📊 Algorithm-Friendly Response Format

### **Structure:**

```json
{
  "version": "2.0",
  "structure": "liturgical",
  "availability": {
    // Direct mass lookup - NO PARSING NEEDED!
    "2025-11-02_08:00": true,
    "2025-11-02_10:00": false,
    "2025-11-02_19:00": true,
    "2025-11-09_08:00": true,
    "2025-11-09_10:00": true,
    "2025-11-09_19:00": false,

    // Weekday masses (grouped)
    "weekday_06:30": ["monday", "wednesday", "friday"],

    // Special masses
    "2025-11-02_07:00": true,  // All Souls Day 7h
    "2025-11-02_10:00": false, // All Souls Day 10h
    "2025-11-02_15:00": true,  // All Souls Day 15h
    "2025-11-07_19:30": true,  // First Thursday healing
    "2025-11-01_06:30": false, // First Friday sacred heart
    "2025-11-02_06:30": true   // First Saturday immaculate
  },
  "preferences": {
    "max_per_month": 4,
    "preferred_times": ["10:00"],
    "avoid_times": ["06:30"]
  },
  "substitute": {
    "available": true,
    "conditions": "only_sundays"
  },
  "metadata": {
    "total_availability": 12,
    "submitted_at": "2025-10-20T10:00:00Z"
  }
}
```

### **Algorithm Usage:**

```typescript
// BEFORE (October format - complex parsing):
function isAvailable(minister, mass) {
  const responses = parseOctoberFormat(minister.questionnaireResponse);
  const normalizedSundays = normalizeSundayFormat(responses.availableSundays);
  const sundayNumber = getSundayNumber(mass.date);
  const timeMatch = checkTimePreference(mass.time, responses.preferredTimes);
  // ... 50+ lines of parsing logic
}

// AFTER (v2.0 liturgical format - direct lookup):
function isAvailable(minister, mass) {
  const response = minister.questionnaireResponse;
  const massKey = `${mass.date}_${mass.time}`;
  return response.availability[massKey] === true;
}
```

**Complexity reduction:**
- ❌ No string parsing
- ❌ No date normalization
- ❌ No complex matching logic
- ✅ Direct object property access
- ✅ O(1) lookup time
- ✅ Type-safe

---

## 🎨 Visual Improvements

### **1. Liturgical Theme Banner**

```tsx
<div className={`p-6 ${getThemeColorClass(month)} rounded-lg`}>
  <h2 className={`text-2xl font-bold ${getThemeTextColor(month)}`}>
    {theme.name}
  </h2>
  <p className="text-sm mt-2 opacity-80">
    {theme.description}
  </p>
  <div className="mt-4 text-xs">
    Cor litúrgica: {theme.color}
  </div>
</div>
```

### **2. Calendar View (To be implemented)**

```
┌─────────────────────────────────────────┐
│ Novembro 2025 - Almas do Purgatório     │
├─────────────────────────────────────────┤
│ Domingo 02/11                           │
│ ☑ 08:00  □ 10:00  ☑ 19:00              │
├─────────────────────────────────────────┤
│ Domingo 09/11                           │
│ ☑ 08:00  ☑ 10:00  □ 19:00              │
├─────────────────────────────────────────┤
│ Domingo 16/11                           │
│ □ 08:00  ☑ 10:00  ☑ 19:00              │
└─────────────────────────────────────────┘

Resumo: Você está disponível para 8 missas
⚠️ Recomendamos marcar ao menos 3 missas por mês
```

### **3. Live Summary**

```tsx
<div className="summary-card">
  <div className="text-3xl font-bold">
    {totalSelected}
  </div>
  <div className="text-sm text-gray-600">
    missas marcadas
  </div>

  {totalSelected < 3 && (
    <Alert variant="warning">
      Considere marcar ao menos 3 missas para ajudar na escala
    </Alert>
  )}

  {totalSelected > 6 && (
    <Alert variant="info">
      Obrigado pela disponibilidade! Você está ajudando muito.
    </Alert>
  )}
</div>
```

---

## 🔧 API Functions

### **1. Generate Questionnaire**

```typescript
import { generateLiturgicalQuestionnaire } from './liturgicalQuestionnaireGenerator';

const questionnaire = generateLiturgicalQuestionnaire(11, 2025);
```

### **2. Convert Responses**

```typescript
import { convertToAlgorithmFormat } from './liturgicalQuestionnaireGenerator';

const userResponses = {
  sunday_masses: {
    '2025-11-02_08:00': true,
    '2025-11-02_10:00': false,
    '2025-11-02_19:00': true
  },
  weekday_masses: ['monday', 'wednesday', 'friday'],
  special_masses: {
    '2025-11-02_07:00': true
  },
  can_substitute: 'sundays_only'
};

const algorithmFormat = convertToAlgorithmFormat(userResponses, 11, 2025);
```

### **3. Check Availability**

```typescript
import { isMinisterAvailableForMass } from './liturgicalQuestionnaireGenerator';

const available = isMinisterAvailableForMass(
  minister.questionnaireResponse,
  '2025-11-02',
  '08:00'
);
```

---

## 📋 Implementation Checklist

### **Backend (✅ DONE):**
- [x] Liturgical themes constants
- [x] Theme helper functions
- [x] Questionnaire generator
- [x] Sunday mass generator
- [x] Special mass generator
- [x] November-specific masses
- [x] December-specific masses
- [x] Response format converter
- [x] Availability checker

### **Frontend (⏳ TODO):**
- [ ] Theme banner component
- [ ] Calendar view component
- [ ] Checkbox grid component
- [ ] Live summary component
- [ ] Visual warnings/encouragements
- [ ] Integration with questionnaire form
- [ ] Save in v2.0 liturgical format

### **Algorithm Integration (⏳ TODO):**
- [ ] Update compatibility layer to use direct lookup
- [ ] Add liturgical format parser
- [ ] Test with November data
- [ ] Performance comparison (old vs new)

---

## 🧪 Testing

### **Generate November Questionnaire:**

```bash
NODE_ENV=development npx tsx -e "
import { generateLiturgicalQuestionnaire } from './server/utils/liturgicalQuestionnaireGenerator.js';

const questionnaire = generateLiturgicalQuestionnaire(11, 2025);
console.log(JSON.stringify(questionnaire, null, 2));
"
```

### **Expected Output:**

```json
{
  "month": 11,
  "year": 2025,
  "theme": {
    "name": "Almas do Purgatório",
    "color": "purple",
    "colorHex": "#7B1FA2",
    "description": "Orações pelas almas do purgatório e meditação sobre a eternidade"
  },
  "questions": [
    {
      "id": "sunday_masses",
      "type": "checkbox_grid",
      "question": "Missas Dominicais - Almas do Purgatório",
      "options": [...]
    }
  ],
  "metadata": {
    "version": "2.0",
    "structure": "liturgical",
    "totalSundays": 4,
    "hasSpecialMasses": true
  }
}
```

---

## 🎓 Key Benefits

### **For Users:**
- ✅ Spiritually meaningful (liturgical themes)
- ✅ Clear visual organization
- ✅ Live feedback on commitment
- ✅ Easy to understand

### **For Algorithm:**
- ✅ Direct mass lookup (O(1))
- ✅ No complex parsing
- ✅ Type-safe structure
- ✅ Pre-calculated metadata

### **For System:**
- ✅ Auto-generated questions
- ✅ Special month handling
- ✅ Version tracking (2.0)
- ✅ Future-proof design

---

## 📁 File Locations

**Constants:**
- `shared/constants/liturgicalThemes.ts` - Theme definitions

**Generator:**
- `server/utils/liturgicalQuestionnaireGenerator.ts` - Main logic

**Documentation:**
- `LITURGICAL_QUESTIONNAIRE_SYSTEM.md` - This file

---

## 🚀 Next Steps

1. **Create frontend components** for liturgical UI
2. **Integrate with questionnaire admin** page
3. **Add calendar view** component
4. **Test with November 2025** data
5. **Launch for November** questionnaire

---

**Generated with Claude Code**
**Co-Authored-By:** Claude <noreply@anthropic.com>
