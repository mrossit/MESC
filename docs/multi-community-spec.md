# MESC — Spec Multi-Comunidade

**Status**: Draft para revisão do Marco
**Autor**: Graunt
**Data**: 2026-06-07
**Implementador previsto**: Florence

---

## 1. Objetivo

Transformar o MESC de mono-comunidade implícito em multi-comunidade dentro de uma paróquia, mantendo 100% das regras de negócio atuais (permissões de auxiliares, algoritmo de geração de escala, gamificação, formação) sem regressão.

## 2. Modelo Conceitual

```
Paróquia (Santuário São Judas Tadeu de Sorocaba)
├── Comunidade São Judas Tadeu (matriz)   — coord: Fábio Vieira
├── Comunidade São Marcos                  — coord: Natalie Paola
├── Comunidade São José Maria Escrivá      — coord: a definir
└── Comunidade Padre Pio                   — coord: a definir
```

- Cada ministro tem **1 comunidade casa** (`home_community_id`)
- Ministro vê **a escala da sua comunidade** por padrão
- Se for escalado em outra (convite cruzado), a missa aparece na lista dele com **legenda cromática** identificando a comunidade visitante
- Coordenador de comunidade vê e edita só a sua + tem visão **read-only** das demais para acompanhamento
- Coordenador paroquial (Marco, Priscila, Ana Lisboa) vê e edita as 4

## 3. Matriz de Roles

| Role | Escopo | Pode editar escala | Vê outras comunidades |
|---|---|---|---|
| `coordenador_paroquial` | paróquia inteira | sim, qualquer comunidade | sim, edição total |
| `coordenador_comunidade` | 1 comunidade | sim, só a sua | sim, read-only |
| `auxiliar_1` | 1 comunidade | conforme regras atuais, só a sua | não |
| `auxiliar_2` | 1 comunidade | conforme regras atuais, só a sua | não |
| `ministro` | 1 comunidade | não | só missas onde foi escalado |

Regras de auxiliar_1/auxiliar_2 **inalteradas** — origem da comunidade do ministro não muda quem edita o quê.

## 4. Schema — Mudanças

### 4.1 Nova tabela `communities`

```sql
CREATE TABLE communities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_name varchar(255) NOT NULL DEFAULT 'Santuário São Judas Tadeu de Sorocaba',
  name        varchar(255) NOT NULL,
  slug        varchar(64)  NOT NULL UNIQUE,
  color_hex   varchar(7)   NOT NULL,         -- legenda cromática na UI
  is_matriz   boolean      NOT NULL DEFAULT false,
  active      boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO communities (name, slug, color_hex, is_matriz) VALUES
  ('São Judas Tadeu',          'sao-judas',     '#1E40AF', true),
  ('São Marcos',                'sao-marcos',    '#059669', false),
  ('São José Maria Escrivá',    'sao-jose-escriva', '#7C3AED', false),
  ('Padre Pio',                 'padre-pio',     '#DC2626', false);
```

### 4.2 Enum `user_role` — rename + add

```sql
ALTER TYPE user_role RENAME VALUE 'coordenador' TO 'coordenador_comunidade';
ALTER TYPE user_role ADD VALUE 'coordenador_paroquial';
-- 'gestor' mantido por compatibilidade; revisar uso atual antes de remover
-- 'ministro' inalterado
-- 'auxiliar_1' e 'auxiliar_2' já existem? (verificar — pode ser flag em vez de role)
```

### 4.3 `community_id` adicionado a 12 tabelas críticas

**Diretas (recebem FK):**
- `users.home_community_id` (NOT NULL após backfill)
- `schedules.community_id`
- `mass_configurations.community_id`
- `mass_times_config.community_id`
- `special_events.community_id`
- `questionnaires.community_id`

**Herdadas (vêm via JOIN com schedule, mas indexadas para performance):**
- `mass_execution_logs.community_id` (denormalizado)
- `standby_ministers.community_id`
- `minister_check_ins.community_id`
- `schedule_confirmations.community_id`
- `substitution_requests.community_id`
- `questionnaire_responses.community_id`

Cada coluna recebe FK para `communities(id)` com `ON DELETE RESTRICT` (proteção: nunca deletar comunidade com dados).

### 4.4 Índices

```sql
CREATE INDEX idx_users_home_community ON users(home_community_id);
CREATE INDEX idx_schedules_community_date ON schedules(community_id, date);
CREATE INDEX idx_questionnaires_community_period ON questionnaires(community_id, period);
-- replicar padrão community_id + chave de query frequente nas demais
```

## 5. Migration Plan (Fase 1)

### 5.1 Pré-requisitos
- Backup completo do banco antes de rodar
- Rodar em **staging** primeiro, validar com Marco, depois produção
- Script idempotente: pode rodar 2× sem efeito colateral
- Reversível: script de rollback acompanha

### 5.2 Ordem de execução

```
1. CREATE TABLE communities + seed 4 registros
2. ALTER TYPE user_role (rename + add coordenador_paroquial)
3. ADD COLUMN community_id em todas as 12 tabelas (NULLABLE inicialmente)
4. UPDATE em massa:
   a. communities.id de São Judas       → todos os usuários sem exceção listada
   b. communities.id de São Marcos      → Natalie Paola, Maria da Penha
   c. demais tabelas herdam o community_id do schedule/user pai
5. ALTER COLUMN community_id SET NOT NULL nas 12 tabelas
6. Promover roles:
   a. Marco, Priscila, Ana Lisboa → coordenador_paroquial
   b. Natalie Paola, Fábio Vieira → coordenador_comunidade (já é o rename)
7. CREATE INDEX em todas as colunas community_id + queries frequentes
8. VALIDATE: contagem por comunidade, integridade FK, smoke test de queries
```

### 5.3 Critérios de aceite Fase 1
- [ ] Todas as 4 comunidades existem em `communities`
- [ ] 121 ministros distribuídos: ~119 São Judas, 2 São Marcos, 0 nas outras (ainda)
- [ ] Schedules históricos têm `community_id = São Judas` (default seguro)
- [ ] Marco, Priscila, Ana Lisboa com role `coordenador_paroquial`
- [ ] Fábio Vieira = `coordenador_comunidade` (comunidade São Judas)
- [ ] Natalie Paola = `coordenador_comunidade` (comunidade São Marcos) **+ ministra**
- [ ] Nenhuma query existente quebra (validar com test suite atual)

## 6. Fases Seguintes (visão geral, detalhar em spec separada)

| Fase | Duração | Entrega |
|---|---|---|
| 1. Schema + migration + seed | 2 dias | DB pronto |
| 2. Backend: storage layer respeita comunidade | 4-5 dias | API filtra por escopo do role |
| 3. Algoritmo escala adaptado | 3-4 dias | Geração por comunidade + endpoint cross-community manual |
| 4. UI: badges/cores, edição cross | 5-7 dias | Frontend espelha modelo |
| 5. Testes + paridade com hoje | 2-3 dias | Zero regressão |
| **Total multi-comunidade** | **~3-4 semanas** | Produção nas 4 comunidades |
| 6. Empacotar Expo + push nativo | +2 semanas | TestFlight + Play Console |

## 7. Decisões já travadas (não revisitar sem motivo)

- **Sem aceite no app** para convite cruzado — combinado via WhatsApp, escala já entra confirmada
- **Permissões de auxiliar_1/auxiliar_2 inalteradas** — origem da comunidade não muda regras de edição
- **Questionários por comunidade** — cada uma com periodicidade própria
- **Gamificação/formação/badges globais** — pertencem à paróquia, não à comunidade
- **Reliability score do ministro global** — comportamento é dele, não da comunidade
- **Coordenador comunidade vê outras read-only** — para acompanhamento
- **Push notifications filtradas por home_community_id** (exceto quando é convidado)

## 8. Riscos a Monitorar

1. **Conflito de horário cross-community**: ministro em S. Marcos 9h convidado pra S. Judas 10h30. Validação **não bloqueia**, só alerta o coordenador que está escalando.
2. **Backfill da migration**: se algum minister não cadastrado aparecer durante o processo, default = São Judas (matriz). Reversível.
3. **Cache do frontend**: queries de escala mudam de "tudo" para "filtrado por escopo do role". Invalidar cache cliente após deploy.
4. **Reports históricos**: tudo antes da migration aparece como São Judas. Adicionar nota visual "Dados pré-multi-comunidade" em reports históricos.

## 9. Próximo Passo Concreto

1. Marco revisa este doc — qualquer ajuste, voltar pra cá
2. Florence implementa Fase 1 (schema + migration) em staging
3. Marco valida em staging com dataset real
4. Deploy em produção numa janela fora de horário de missa
5. Abrir spec da Fase 2 (storage layer)

---

**Pendências para o Marco antes da Fase 2:**
- Definir coordenador de São José Maria Escrivá
- Definir coordenador de Padre Pio
- Listar ministros já existentes dessas 2 comunidades (se houver)
- Confirmar paleta de cores final (sugerida em §4.1) ou ajustar
