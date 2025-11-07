# Atualização: Suporte a Missas Diárias

## 🎯 Problema Resolvido

O algoritmo Python alternativo agora **processa corretamente as missas diárias**, considerando a disponibilidade dos ministros por dia da semana.

## 📊 Dados no Banco de Dados

### Formato das Respostas

Os dados de disponibilidade para missas diárias estão armazenados em dois campos:

#### 1. `daily_mass_availability` (JSONB Array)
```json
["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]
```

#### 2. `responses.weekdays` (JSONB Object)
```json
{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true
}
```

## 🔧 Alterações Implementadas

### 1. Script Python Atualizado (`gerar_escala.py`)

**Adicionado:**
- ✅ Mapeamento de dias da semana (português ↔ inglês)
- ✅ Processamento de missas diárias (segunda a sexta, 07h)
- ✅ Verificação de disponibilidade por dia da semana
- ✅ Campo `tipo` nos resultados: `"fim_de_semana"` ou `"missa_diaria"`

**Exemplo de Missas Diárias:**
```python
missas_diarias = [
    {"id": 101, "descricao": "Segunda-feira 07h", "dia": "monday", ...},
    {"id": 102, "descricao": "Terça-feira 07h", "dia": "tuesday", ...},
    {"id": 103, "descricao": "Quarta-feira 07h", "dia": "wednesday", ...},
    {"id": 104, "descricao": "Quinta-feira 07h", "dia": "thursday", ...},
    {"id": 105, "descricao": "Sexta-feira 07h", "dia": "friday", ...},
]
```

### 2. Controller Atualizado

**Dados enviados ao Python:**
```typescript
const formattedResponses = responses.map((r: any) => ({
  user_id: r.userId,
  questionnaire_id: r.questionnaireId,
  available_sundays: r.availableSundays || [],
  preferred_times: r.preferredMassTimes || [],
  daily_mass_availability: r.dailyMassAvailability || [],  // ✅ NOVO
  weekdays: r.responses?.weekdays || {},                   // ✅ NOVO
  responses: r.responses || {}
}));
```

### 3. Interface TypeScript Atualizada

```typescript
export interface PythonScheduleResult {
  missa: string;
  tipo: "fim_de_semana" | "missa_diaria";  // ✅ NOVO
  ministro: string;
  ministro_id: string;
  preferido: boolean;
  atribuicoes_totais: number;
}
```

## 🧪 Teste Realizado

### Entrada de Teste:
```json
{
  "users": [
    {"id": "1", "name": "João Silva"},
    {"id": "2", "name": "Maria Santos"}
  ],
  "responses": [
    {
      "user_id": "1",
      "available_sundays": ["Domingo 08h"],
      "daily_mass_availability": ["Segunda-feira", "Quarta-feira"],
      "weekdays": {"monday": true, "wednesday": true}
    },
    {
      "user_id": "2",
      "available_sundays": ["Domingo 10h"],
      "daily_mass_availability": ["Terça-feira", "Quinta-feira", "Sexta-feira"],
      "weekdays": {"tuesday": true, "thursday": true, "friday": true}
    }
  ]
}
```

### Resultado Obtido:
```json
[
  {
    "missa": "Domingo 08h",
    "tipo": "fim_de_semana",
    "ministro": "João Silva",
    "ministro_id": "1",
    "preferido": false,
    "atribuicoes_totais": 1
  },
  {
    "missa": "Domingo 10h",
    "tipo": "fim_de_semana",
    "ministro": "Maria Santos",
    "ministro_id": "2",
    "preferido": false,
    "atribuicoes_totais": 1
  },
  {
    "missa": "Segunda-feira 07h",
    "tipo": "missa_diaria",
    "ministro": "João Silva",
    "ministro_id": "1",
    "preferido": false,
    "atribuicoes_totais": 2
  },
  {
    "missa": "Terça-feira 07h",
    "tipo": "missa_diaria",
    "ministro": "Maria Santos",
    "ministro_id": "2",
    "preferido": false,
    "atribuicoes_totais": 2
  },
  {
    "missa": "Quarta-feira 07h",
    "tipo": "missa_diaria",
    "ministro": "João Silva",
    "ministro_id": "1",
    "preferido": false,
    "atribuicoes_totais": 3
  },
  {
    "missa": "Quinta-feira 07h",
    "tipo": "missa_diaria",
    "ministro": "Maria Santos",
    "ministro_id": "2",
    "preferido": false,
    "atribuicoes_totais": 3
  },
  {
    "missa": "Sexta-feira 07h",
    "tipo": "missa_diaria",
    "ministro": "Maria Santos",
    "ministro_id": "2",
    "preferido": false,
    "atribuicoes_totais": 4
  }
]
```

✅ **Resultado:** Os ministros foram corretamente alocados apenas nos dias em que marcaram disponibilidade!

## 📈 Comparação de Funcionalidades

| Funcionalidade | Antes | Agora |
|----------------|-------|-------|
| Missas de fim de semana | ✅ | ✅ |
| Missas diárias | ❌ | ✅ |
| Disponibilidade por dia da semana | ❌ | ✅ |
| Campo `tipo` no resultado | ❌ | ✅ |
| Leitura de `daily_mass_availability` | ❌ | ✅ |
| Leitura de `weekdays` | ❌ | ✅ |

## 🔍 Como Funciona

### Lógica de Verificação de Disponibilidade para Missas Diárias:

```python
# Para cada missa diária (ex: Segunda-feira 07h)
for u in users:
    respostas = respostas_por_user.get(u["id"], [])
    disponivel = False
    
    for r in respostas:
        # Verificar no campo daily_mass_availability
        daily_avail = r.get("daily_mass_availability", [])
        if "Segunda-feira" in daily_avail:
            disponivel = True
            break
        
        # OU verificar no campo weekdays
        weekdays = r.get("weekdays", {})
        if weekdays.get("monday", False):
            disponivel = True
            break
    
    if disponivel:
        candidatos.append(u)
```

## 🎯 Benefícios

1. **Distribuição Justa**: Considera disponibilidade real por dia da semana
2. **Flexibilidade**: Ministros podem servir apenas em dias específicos
3. **Dados Reais**: Usa informações do questionário preenchido pelos ministros
4. **Separação Clara**: Distingue entre missas de fim de semana e missas diárias

## 🚀 Como Testar com Dados Reais

```bash
curl -X POST http://localhost:5000/api/escala-alternativa/gerar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-CSRF-Token: SEU_CSRF" \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 10}'
```

## 📝 Próximas Melhorias Sugeridas

- [ ] Configurar horários de missas diárias dinamicamente
- [ ] Suportar múltiplos horários por dia (ex: 07h e 19h)
- [ ] Adicionar eventos especiais em dias da semana
- [ ] Implementar rotação automática entre semanas do mês

---

**Status:** ✅ Implementado e testado com sucesso!  
**Data:** 31/10/2024  
**Versão do Algoritmo:** 2.0 (com suporte a missas diárias)
