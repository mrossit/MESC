# 🤖 Sistema de Aprendizado Adaptativo - Implementação

## ✅ FASE 1: IMPLEMENTADO (Commit d9e47a2)

### 1. **Infraestrutura de Banco de Dados**
- ✅ Novos campos adicionados à tabela `users`:
  - `reliability_score` (INTEGER, default 100)
  - `substitution_request_count` (INTEGER, default 0)
  - `substitution_fulfilled_count` (INTEGER, default 0)
  - `manual_removal_count` (INTEGER, default 0)
  - `no_show_count` (INTEGER, default 0)
  - `last_reliability_update` (TIMESTAMP)
  - `reliability_notes` (TEXT)

### 2. **Serviço de Reliability Score** (`server/services/reliabilityScoreService.ts`)

#### Funções Principais:
```typescript
// Cálculo de pontuação
calculateReliabilityScore(substitutionRequests, fulfilled, removals, noShows)
  → Retorna score 0-100 com componentes detalhados

// Tracking automático
trackSubstitutionRequest(ministerId, scheduleId)  // -5 pontos
trackSubstitutionFulfillment(ministerId, scheduleId) // +3 pontos (máx +15)
trackManualRemoval(ministerId, scheduleId, reason) // -8 pontos
trackNoShow(ministerId, scheduleId, notes) // -20 pontos (SEVERO)

// Métricas e consultas
updateMinisterReliabilityScore(ministerId) → Recalcula e atualiza
getAllReliabilityMetrics() → Lista todos ministros com métricas
getLowReliabilityMinisters(threshold) → Identifica ministros problemáticos
```

#### Fórmula de Pontuação:
```
reliabilityScore = 100
  - (substitutionRequestCount × 5)
  - (manualRemovalCount × 8)
  - (noShowCount × 20)
  + min(substitutionFulfilledCount × 3, 15)

Resultado: Clamped entre 0 e 100
```

#### Categorias de Score:
- **90-100 (Excelente)**: Prioridade ALTA na seleção
- **75-89 (Bom)**: Prioridade NORMAL
- **60-74 (Regular)**: Prioridade BAIXA
- **40-59 (Ruim)**: ÚLTIMA OPÇÃO
- **0-39 (Crítico)**: ALERTA para coordenador

### 3. **Integração com Sistema de Substituições** (`server/routes/substitutions.ts`)

✅ **Hooks Automáticos Adicionados:**

1. **Criação de Substituição** (linha 289):
   ```typescript
   await trackSubstitutionRequest(requesterId, scheduleId);
   ```

2. **Aprovação de Substituição** (linha 628):
   ```typescript
   if (newStatus === "approved" && request.substituteId) {
     await trackSubstitutionFulfillment(request.substituteId, request.scheduleId);
   }
   ```

### 4. **Atualização do Schedule Generator** (`server/utils/scheduleGenerator.ts`)

✅ **Interface Minister Atualizada:**
- Adicionados campos de reliability metrics
- Query de ministros agora carrega todos os campos de confiabilidade

---

## 🚧 FASE 2: PENDENTE - Integração com Seleção de Ministros

### O que falta implementar:

#### 1. **Atualizar `calculatePreferenceScore()`**
Localização: `server/utils/scheduleGenerator.ts:2808`

Código atual:
```typescript
private calculatePreferenceScore(minister: any): number {
  return (minister.preferredTimes?.length || 0) + (minister.canServeAsCouple ? 2 : 0);
}
```

Código atualizado necessário:
```typescript
private calculatePreferenceScore(minister: any): number {
  const basePreference = (minister.preferredTimes?.length || 0) + (minister.canServeAsCouple ? 2 : 0);

  // 🤖 ADAPTIVE LEARNING: Include reliability score (normalized to 0-10 scale)
  const reliabilityBonus = Math.floor((minister.reliabilityScore || 100) / 10);

  return basePreference + reliabilityBonus;
}
```

#### 2. **Criar `calculateFinalMinisterScore()`**
Adicionar após linha 2810:

```typescript
/**
 * 🤖 ADAPTIVE LEARNING: Calculate final minister score
 * Combines availability, preference, and reliability
 */
private calculateFinalMinisterScore(minister: Minister, massTime: MassTime): number {
  const availabilityScore = this.calculateAvailabilityScore(minister);
  const preferenceScore = this.calculatePreferenceScore(minister);
  const reliabilityScore = minister.reliabilityScore || 100;

  // Weighted formula:
  // 40% Reliability (adaptive learning)
  // 30% Availability (can they serve?)
  // 20% Preference (do they want to?)
  // 10% Service balance (fairness)

  const finalScore =
    (reliabilityScore * 0.4) +
    (availabilityScore * 0.3) +
    (preferenceScore * 0.2) +
    ((100 - minister.totalServices) * 0.1);

  // Severe penalty for low reliability
  if (reliabilityScore < 50) {
    console.log(`[ADAPTIVE] ⚠️ ${minister.name} has LOW reliability (${reliabilityScore}) - marking as LAST RESORT`);
    return finalScore * 0.5; // 50% penalty
  }

  return finalScore;
}
```

#### 3. **Atualizar `selectOptimalMinisters()`**
Localização: Aproximadamente linha 2210

Modificar o sorting para usar o novo score:
```typescript
// Sort by final score (reliability + availability + preference)
candidates.sort((a, b) => {
  const scoreA = this.calculateFinalMinisterScore(a, massTime);
  const scoreB = this.calculateFinalMinisterScore(b, massTime);
  return scoreB - scoreA; // Higher score first
});
```

---

## 🚧 FASE 3: PENDENTE - Sistema de Comparação de Escalas

### Arquivo a criar: `server/services/scheduleComparisonService.ts`

```typescript
/**
 * 🤖 ADAPTIVE LEARNING: Schedule Comparison System
 * Compares auto-generated schedules with manually published ones
 * to identify patterns and improve future generations
 */

export interface ScheduleComparison {
  scheduleId: string;
  date: string;
  time: string;
  generatedMinisters: string[]; // IDs from auto-generation
  publishedMinisters: string[]; // IDs in final published version
  removedMinisters: string[];   // Removed by coordinator
  addedMinisters: string[];     // Added by coordinator
  changeReason?: string;
}

export async function compareAndLearn(
  month: number,
  year: number
): Promise<ScheduleComparison[]> {
  // 1. Buscar escalas geradas automaticamente (status = 'draft')
  // 2. Buscar escalas publicadas (status = 'published')
  // 3. Comparar diferenças ministro por ministro
  // 4. Para cada ministro removido: trackManualRemoval()
  // 5. Para cada ministro adicionado manualmente: bonus pequeno
  // 6. Gerar relatório de aprendizado
}

export async function analyzeMonthlyPatterns(
  month: number,
  year: number
): Promise<LearningReport> {
  // Identifica padrões:
  // - Quais ministros são frequentemente removidos?
  // - Quais ministros são frequentemente adicionados?
  // - Quais horários têm mais modificações?
  // - Taxa de aceitação da escala automática
}
```

### Quando executar:
- Criar endpoint: `POST /api/schedules/:id/publish`
- Ao publicar escala, rodar `compareAndLearn()` em background
- Atualizar reliability scores automaticamente

---

## 🚧 FASE 4: PENDENTE - Dashboard de Métricas

### Arquivo a criar: `server/routes/reliabilityMetrics.ts`

```typescript
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth';
import { getAllReliabilityMetrics, getLowReliabilityMinisters } from '../services/reliabilityScoreService';

const router = Router();

// GET /api/reliability/metrics - Ver métricas de todos ministros
router.get('/metrics', requireAuth, requireRole(['gestor', 'coordenador']), async (req, res) => {
  const metrics = await getAllReliabilityMetrics();
  res.json({ success: true, data: metrics });
});

// GET /api/reliability/low - Ministros com baixa confiabilidade
router.get('/low', requireAuth, requireRole(['gestor', 'coordenador']), async (req, res) => {
  const threshold = parseInt(req.query.threshold as string) || 60;
  const lowReliability = await getLowReliabilityMinisters(threshold);
  res.json({ success: true, data: lowReliability });
});

// POST /api/reliability/:ministerId/reset - Reset score (gestor only)
router.post('/:ministerId/reset', requireAuth, requireRole(['gestor']), async (req, res) => {
  // Reset reliability metrics to default
  // Use case: Ministro teve conversa com coordenador, quer dar nova chance
});

export default router;
```

### Registrar no `server/index.ts`:
```typescript
import reliabilityMetricsRouter from './routes/reliabilityMetrics';
app.use('/api/reliability', reliabilityMetricsRouter);
```

---

## 🚧 FASE 5: PENDENTE - Alertas Automáticos

### Sistema de Notificações:
```typescript
// Em reliabilityScoreService.ts, adicionar:

export async function checkAndAlertLowReliability() {
  const lowReliability = await getLowReliabilityMinisters(50);

  for (const minister of lowReliability) {
    if (minister.category === 'critical') {
      // Enviar notificação para coordenadores
      await createNotification({
        type: 'alert',
        title: `Alerta: Confiabilidade Crítica`,
        message: `Ministro ${minister.ministerName} está com score ${minister.reliabilityScore}.
                  ${minister.substitutionRequestCount} pedidos de substituição,
                  ${minister.noShowCount} faltas.`,
        priority: 'high',
        recipients: ['coordenadores', 'gestores']
      });
    }
  }
}
```

### Executar via Cron Job:
```typescript
// server/index.ts
import cron from 'node-cron';

// Executar todo domingo às 20h
cron.schedule('0 20 * * 0', async () => {
  await checkAndAlertLowReliability();
  logger.info('[CRON] Reliability check completed');
});
```

---

## 📊 EXEMPLO DE COMPORTAMENTO DO SISTEMA

### Cenário Real: Ministro "João Silva"

**Mês 1:**
```
João: reliabilityScore = 100
João é escalado normalmente em 4 missas
```

**Mês 2:**
```
João pede 1 substituição (aprovada)
→ trackSubstitutionRequest() executado
→ reliabilityScore = 100 - 5 = 95
→ Ainda é bem avaliado, seleção normal
```

**Mês 3-4:**
```
João pede mais 3 substituições
→ Total: 4 pedidos
→ reliabilityScore = 100 - (4 × 5) = 80
→ Categoria: "Bom", mas prioridade começando a cair
```

**Mês 5:**
```
João pede mais 2 substituições
→ Total: 6 pedidos
→ reliabilityScore = 100 - (6 × 5) = 70
→ Categoria: "Regular"
→ ⚠️ Algoritmo começa a priorizá-lo MENOS
```

**Mês 6:**
```
Coordenador remove João manualmente de 2 escalas
→ trackManualRemoval() × 2
→ reliabilityScore = 70 - (2 × 8) = 54
→ Categoria: "Ruim"
→ João vai para FINAL da fila de seleção
→ 📧 Alerta enviado para coordenador
```

**Mês 7:**
```
João falta em 1 missa (no-show)
→ trackNoShow() executado
→ reliabilityScore = 54 - 20 = 34
→ Categoria: "CRÍTICO"
→ 🚨 ALERTA SEVERO para coordenadores
→ João praticamente não é mais selecionado automaticamente
→ Necessita intervenção humana
```

**Reabilitação:**
```
João tem conversa com coordenador
João serve como substituto 3 vezes (ajudando outros)
→ trackSubstitutionFulfillment() × 3
→ reliabilityScore = 34 + (3 × 3) = 43
→ Ainda "Crítico", mas melhorando
→ Trend: "improving"
```

---

## 🎯 MÉTRICAS DE SUCESSO

### KPIs para medir eficácia do sistema:

1. **Taxa de Aceitação de Escalas**
   - Objetivo: > 85% das escalas geradas aceitas sem modificações

2. **Redução de Substituições**
   - Objetivo: -20% pedidos de substituição após 6 meses

3. **Melhoria na Distribuição**
   - Ministros com score < 60 devem receber menos escalas
   - Ministros com score > 90 devem ser priorizados

4. **Precisão do Algoritmo**
   - Taxa de ministros removidos manualmente < 10%

---

## 📝 PRÓXIMOS PASSOS

### Ordem recomendada de implementação:

1. ✅ **CONCLUÍDO**: Infraestrutura e tracking básico
2. **PRÓXIMO**: Integrar reliability score na seleção (Fase 2)
3. **DEPOIS**: Sistema de comparação de escalas (Fase 3)
4. **DEPOIS**: Dashboard de métricas (Fase 4)
5. **FINAL**: Alertas automáticos (Fase 5)

### Tempo estimado:
- Fase 2: 2-3 horas
- Fase 3: 3-4 horas
- Fase 4: 2-3 horas
- Fase 5: 1-2 horas

**Total restante: ~10-12 horas de desenvolvimento**

---

## 🔧 COMANDOS ÚTEIS

```bash
# Ver reliability scores de todos ministros
psql $DATABASE_URL -c "SELECT name, reliability_score, substitution_request_count,
  manual_removal_count, no_show_count FROM users WHERE status='active'
  ORDER BY reliability_score ASC LIMIT 20;"

# Ministros com score crítico
psql $DATABASE_URL -c "SELECT name, reliability_score FROM users
  WHERE reliability_score < 50 AND status='active'
  ORDER BY reliability_score ASC;"

# Reset score de um ministro específico (dar nova chance)
psql $DATABASE_URL -c "UPDATE users SET reliability_score=100,
  substitution_request_count=0, manual_removal_count=0, no_show_count=0
  WHERE id='MINISTER_ID';"
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### Arquivos criados:
- ✅ `server/services/reliabilityScoreService.ts` - Serviço principal
- ✅ `shared/schema.ts` - Schema atualizado com novos campos
- ✅ `server/routes/substitutions.ts` - Hooks integrados
- ✅ `server/utils/scheduleGenerator.ts` - Interface atualizada

### Arquivos modificados:
- ✅ Database migrations aplicadas

### Arquivos pendentes (Fases 2-5):
- 🚧 `server/routes/reliabilityMetrics.ts`
- 🚧 `server/services/scheduleComparisonService.ts`
- 🚧 Frontend dashboard components

---

**Última atualização**: 2025-11-30
**Versão**: 1.0.0 (Fase 1 Completa)
**Status**: ✅ Pronto para Fase 2
