# Formato de Questionário V2.0

## 🎯 Objetivo

Padronizar a estrutura de questionários e respostas para facilitar:
- ✅ Leitura automática pelo sistema
- ✅ Detecção correta de disponibilidades
- ✅ Geração precisa de escalas
- ✅ Manutenção e evolução do código

---

## 📋 Formato de Resposta V2.0

### Estrutura JSON

```json
{
  "format_version": "2.0",
  "user_id": "abc123",
  "questionnaire_id": "uuid-questionnaire",
  "month": 11,
  "year": 2025,

  "masses": {
    "2025-11-02": {
      "08:00": true,
      "10:00": false,
      "19:00": true
    },
    "2025-11-09": {
      "08:00": true,
      "10:00": true,
      "19:00": false
    }
  },

  "weekdays": {
    "monday": false,
    "tuesday": false,
    "wednesday": true,
    "thursday": false,
    "friday": true
  },

  "special_events": {
    "healing_liberation_mass": {
      "2025-11-06": {
        "19:30": true
      }
    },
    "sacred_heart_mass": {
      "2025-11-07": {
        "06:30": true
      }
    }
  },

  "metadata": {
    "can_substitute": true,
    "preferred_position": 2,
    "notes": "Disponível para qualquer horário em emergências"
  }
}
```

---

## 🔑 Campos Principais

### 1. `format_version` (obrigatório)
- **Tipo:** String
- **Valor:** `"2.0"`
- **Propósito:** Identifica o formato para o ResponseCompiler

### 2. `masses` (obrigatório)
- **Tipo:** Object
- **Estrutura:** `{ "YYYY-MM-DD": { "HH:MM": boolean } }`
- **Exemplo:**
  ```json
  "masses": {
    "2025-11-02": {
      "08:00": true,
      "10:00": false,
      "19:00": true
    }
  }
  ```
- **Uso:** Disponibilidade para missas específicas por data e horário

### 3. `weekdays` (opcional)
- **Tipo:** Object
- **Estrutura:**
  ```json
  {
    "monday": boolean,
    "tuesday": boolean,
    "wednesday": boolean,
    "thursday": boolean,
    "friday": boolean
  }
  ```
- **Uso:** Disponibilidade para missas diárias (06:30) por dia da semana

### 4. `special_events` (opcional)
- **Tipo:** Object
- **Estrutura:** Flexível para eventos especiais
- **Exemplo:**
  ```json
  "special_events": {
    "healing_liberation_mass": {
      "2025-11-06": { "19:30": true }
    },
    "christmas": {
      "2025-12-25": {
        "00:00": true,
        "08:00": false,
        "10:00": true
      }
    }
  }
  ```

### 5. `metadata` (opcional)
- **Campos:**
  - `can_substitute`: boolean
  - `preferred_position`: number (1-6)
  - `notes`: string

---

## 📝 Estrutura de Questionário V2.0

### Perguntas Recomendadas

```json
{
  "format_version": "2.0",
  "month": 11,
  "year": 2025,
  "title": "Questionário Novembro 2025",
  "questions": [
    {
      "id": "sundays",
      "type": "date_time_matrix",
      "question": "Em quais domingos e horários você pode servir?",
      "dates": [
        "2025-11-02",
        "2025-11-09",
        "2025-11-16",
        "2025-11-23",
        "2025-11-30"
      ],
      "times": ["08:00", "10:00", "19:00"],
      "required": true
    },
    {
      "id": "weekdays",
      "type": "checkbox",
      "question": "Em quais dias da semana você pode servir nas missas das 06:30?",
      "options": [
        {
          "value": "monday",
          "label": "Segunda-feira"
        },
        {
          "value": "tuesday",
          "label": "Terça-feira"
        },
        {
          "value": "wednesday",
          "label": "Quarta-feira"
        },
        {
          "value": "thursday",
          "label": "Quinta-feira"
        },
        {
          "value": "friday",
          "label": "Sexta-feira"
        }
      ],
      "required": false
    },
    {
      "id": "healing_liberation",
      "type": "yes_no",
      "question": "Você pode servir na Missa de Cura e Libertação (primeira quinta-feira às 19:30)?",
      "metadata": {
        "date": "2025-11-06",
        "time": "19:30",
        "event_type": "healing_liberation_mass"
      },
      "required": false
    },
    {
      "id": "can_substitute",
      "type": "yes_no",
      "question": "Você pode substituir outros ministros se necessário?",
      "required": false
    },
    {
      "id": "notes",
      "type": "text",
      "question": "Observações ou restrições de disponibilidade:",
      "required": false
    }
  ]
}
```

---

## 🔄 Migração V1.0 → V2.0

### Diferenças Principais

| Aspecto | V1.0 Array | V2.0 Standard |
|---------|------------|---------------|
| **Formato** | Array de Q&A | Objeto estruturado |
| **Horários de domingo** | Inferido (main_service_time + available_sundays) | Explícito por data e horário |
| **Missas diárias** | Array de dias ou "Sim/Não" | Objeto weekdays |
| **Eventos especiais** | Múltiplas perguntas separadas | Objeto special_events |
| **Parsing** | Complexo (regex, strings) | Direto (chaves estruturadas) |

### Exemplo de Conversão

**V1.0 Array:**
```json
[
  {
    "questionId": "main_service_time",
    "answer": "19h"
  },
  {
    "questionId": "available_sundays",
    "answer": ["Domingo 02/11", "Domingo 09/11"]
  }
]
```

**V2.0 Standard:**
```json
{
  "format_version": "2.0",
  "masses": {
    "2025-11-02": { "19:00": true },
    "2025-11-09": { "19:00": true }
  }
}
```

---

## 💻 Processamento no Código

### ResponseCompiler

O `ResponseCompiler` detecta automaticamente o formato e processa:

```typescript
// Detecta formato
const format = ResponseCompiler.detectFormat(data);

switch (format) {
  case 'V2_STANDARD':
    // Leitura direta - simples!
    for (const [date, times] of Object.entries(data.masses)) {
      availability.dates[date] = { date, times };
    }
    break;

  case 'V1_ARRAY':
    // Parsing complexo com regex e inferências
    // ...
    break;
}
```

### Vantagens V2.0

1. **Sem ambiguidade**: Cada disponibilidade é explícita
2. **Sem parsing complexo**: Estrutura já pronta
3. **Sem inferências**: Não precisa combinar campos
4. **Fácil validação**: Schema JSON simples
5. **Extensível**: Adicionar novos campos é trivial

---

## 🎨 Interface de Usuário

### Componente Recomendado: DateTimeMatrix

```tsx
<DateTimeMatrix
  dates={sundays}
  times={['08:00', '10:00', '19:00']}
  value={selectedSlots}
  onChange={handleChange}
  highlightWeekends={true}
/>
```

### Visualização

```
┌─────────────────────────────────────────┐
│  Novembro 2025 - Disponibilidade        │
├─────────────┬───────┬───────┬──────────┤
│ Data        │ 08:00 │ 10:00 │ 19:00    │
├─────────────┼───────┼───────┼──────────┤
│ Dom 02/11   │  [ ]  │  [x]  │  [x]     │
│ Dom 09/11   │  [x]  │  [x]  │  [ ]     │
│ Dom 16/11   │  [ ]  │  [x]  │  [x]     │
│ Dom 23/11   │  [x]  │  [ ]  │  [x]     │
│ Dom 30/11   │  [x]  │  [x]  │  [x]     │
└─────────────┴───────┴───────┴──────────┘
```

---

## ✅ Checklist de Implementação

### Para Novembro 2025

- [x] Corrigir bug V1.0 (main_service_time)
- [ ] Criar questionário V2.0
- [ ] Implementar componente DateTimeMatrix
- [ ] Testar ResponseCompiler com V2.0
- [ ] Migrar generator para usar V2.0
- [ ] Documentar para coordenadores

### Para o Futuro

- [ ] Deprecar formato V1.0
- [ ] Adicionar validação de schema
- [ ] Criar editor visual de questionários
- [ ] Suporte a eventos litúrgicos automáticos
- [ ] Integração com calendário litúrgico

---

## 📞 Suporte

**Problema com leitura de disponibilidades?**

1. Verificar `format_version` na resposta
2. Conferir estrutura do objeto `masses`
3. Validar datas no formato `YYYY-MM-DD`
4. Validar horários no formato `HH:MM`
5. Verificar logs do ResponseCompiler

**Dúvidas sobre implementação?**

Consultar:
- `/docs/RESPONSE_COMPILER_SERVICE.md`
- `/docs/SCHEDULE_GENERATOR_V2.md`
- `/server/services/responseCompiler.ts`

---

## 🎉 Conclusão

O formato V2.0 resolve os problemas identificados em outubro:

✅ Horários de domingo explícitos
✅ Sem parsing complexo de strings
✅ Estrutura padronizada e previsível
✅ Fácil de manter e evoluir

**Data de adoção:** Novembro 2025+
