# PRD - MESC App Nativo (Clone)

## Product Requirements Document
**Versão:** 1.0
**Data:** Fevereiro 2026
**Projeto:** Clone do MESC como App Nativo

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 O Que É
O **MESC (Sistema de Escalas e Coordenação Ministerial)** é um aplicativo para gerenciamento de escalas de ministérios em igrejas católicas. Este PRD descreve os requisitos para criar um clone como **app nativo** (React Native ou Flutter).

### 1.2 Problema que Resolve
- Coordenadores gastam horas criando escalas manualmente
- Ministros não sabem quando servir com antecedência
- Dificuldade de gerenciar substituições de última hora
- Falta de histórico e métricas de participação
- Comunicação fragmentada (WhatsApp grupos, ligações, etc)

### 1.3 Usuários-Alvo
| Papel | Descrição | Quantidade Típica |
|-------|-----------|-------------------|
| **Gestor** | Administrador do sistema | 1-2 por paróquia |
| **Coordenador** | Gerencia escalas e ministros | 2-5 por paróquia |
| **Ministro** | Serve nas missas | 20-100+ por paróquia |

### 1.4 Stack Tecnológica Recomendada

#### Opção A: React Native (Recomendado)
```
Frontend: React Native + Expo
UI: React Native Paper ou NativeBase
State: Zustand ou Redux Toolkit
Navigation: React Navigation
Backend: Reutilizar o existente (Node.js/Express)
Database: PostgreSQL (mesmo banco)
```

#### Opção B: Flutter
```
Frontend: Flutter + Dart
UI: Material Design 3
State: Riverpod ou BLoC
Backend: Reutilizar o existente (Node.js/Express)
Database: PostgreSQL (mesmo banco)
```

---

## 2. ARQUITETURA DO BANCO DE DADOS

### 2.1 Diagrama de Entidades Principais

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   USERS     │────▶│  SCHEDULES  │────▶│ SCHEDULE_CONFIRM │
└─────────────┘     └─────────────┘     └──────────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────────┐
       │            │ SUBSTITUTION_REQ │
       │            └──────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  FAMILIES   │     │QUESTIONNAIRE│────▶│QUESTIONNAIRE_RSP│
└─────────────┘     └─────────────┘     └─────────────────┘
       │
       ▼
┌─────────────────┐
│FAMILY_RELATIONS │
└─────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│FORM_TRACKS  │────▶│FORM_MODULES │────▶│FORM_LESSONS │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │FORM_LESSON_SECT │
                                        └─────────────────┘

┌─────────────┐     ┌─────────────┐
│   BADGES    │────▶│ USER_BADGES │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────────┐
│ USER_POINTS │     │POINT_TRANSACT   │
└─────────────┘     └─────────────────┘
```

### 2.2 Tabelas Detalhadas

#### 2.2.1 Users (Usuários)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  photo_url TEXT,
  schedule_display_name VARCHAR(100),

  -- Role e Status
  role VARCHAR(20) DEFAULT 'ministro', -- 'gestor', 'coordenador', 'ministro'
  status VARCHAR(20) DEFAULT 'pending', -- 'active', 'inactive', 'pending'
  requires_password_change BOOLEAN DEFAULT true,

  -- Dados Pessoais
  birth_date DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  marital_status VARCHAR(50),

  -- Dados Sacramentais
  baptism_date DATE,
  baptism_parish VARCHAR(255),
  confirmation_date DATE,
  confirmation_parish VARCHAR(255),
  marriage_date DATE,
  marriage_parish VARCHAR(255),

  -- Preferências Ministeriais
  preferred_position INTEGER,
  preferred_positions INTEGER[], -- Array de posições preferidas
  avoid_positions INTEGER[], -- Posições a evitar
  available_for_special_events BOOLEAN DEFAULT false,

  -- Família
  family_id UUID REFERENCES families(id),
  spouse_minister_id UUID REFERENCES users(id),

  -- Atividades Extras (JSON)
  extra_activities JSONB DEFAULT '{}',
  -- Exemplo: {"sickCommunion": true, "mondayAdoration": true}

  -- Métricas de Confiabilidade
  reliability_score INTEGER DEFAULT 100, -- 0-100
  substitution_request_count INTEGER DEFAULT 0,
  substitution_fulfilled_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  manual_removal_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_family ON users(family_id);
```

#### 2.2.2 Families (Famílias)
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  prefer_serve_together BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id),
  user_id UUID REFERENCES users(id),
  relationship_type VARCHAR(20), -- 'spouse', 'parent', 'child', 'sibling'
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.3 Schedules (Escalas)
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  type VARCHAR(50) DEFAULT 'missa', -- 'missa', 'celebracao', 'evento'
  location VARCHAR(255),

  -- Atribuição
  minister_id UUID REFERENCES users(id),
  position INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'published', 'completed'

  -- Substituição
  substitute_id UUID REFERENCES users(id),

  -- Notas e Ajustes
  notes TEXT,
  on_site_adjustments JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_minister ON schedules(minister_id);
CREATE INDEX idx_schedules_date_time ON schedules(date, time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_date_status ON schedules(date, status);
```

#### 2.2.4 Schedule Confirmations
```sql
CREATE TABLE schedule_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) NOT NULL,
  minister_id UUID REFERENCES users(id) NOT NULL,

  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending', 'confirmed', 'declined', 'no_response', 'no_show'

  requested_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,

  decline_reason TEXT,

  UNIQUE(schedule_id, minister_id)
);
```

#### 2.2.5 Substitution Requests
```sql
CREATE TABLE substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) NOT NULL,
  requester_id UUID REFERENCES users(id) NOT NULL,
  substitute_id UUID REFERENCES users(id),

  status VARCHAR(20) DEFAULT 'available',
  -- 'available', 'pending', 'approved', 'rejected', 'cancelled', 'auto_approved'

  urgency VARCHAR(20) DEFAULT 'medium',
  -- 'low' (>72h), 'medium' (24-72h), 'high' (12-24h), 'critical' (<12h)

  reason TEXT,
  response_message TEXT,

  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.6 Questionnaires
```sql
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,

  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'closed'

  questions JSONB NOT NULL,
  -- Estrutura de perguntas (ver seção 2.3)

  deadline TIMESTAMP,
  target_user_ids UUID[],
  notified_user_ids UUID[],

  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES questionnaires(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  responses JSONB NOT NULL,

  -- Campos parseados
  available_sundays TEXT[], -- ['2024-02-04', '2024-02-11']
  preferred_mass_times TEXT[], -- ['07:00', '09:00']
  alternative_times TEXT[],
  daily_mass_availability TEXT[],
  special_events JSONB,
  can_substitute BOOLEAN DEFAULT false,

  -- Metadados
  unmapped_responses JSONB,
  processing_warnings TEXT[],
  is_shared_response BOOLEAN DEFAULT false,

  -- Soft Delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(questionnaire_id, user_id)
);
```

#### 2.2.7 Mass Configurations
```sql
CREATE TABLE mass_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  recurrence_type VARCHAR(20) NOT NULL,
  -- 'weekly', 'monthly', 'yearly', 'one_time'

  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  day_of_month INTEGER, -- 1-31
  occurrence_in_month INTEGER, -- 1=first, -1=last

  time TIME NOT NULL,
  min_ministers INTEGER DEFAULT 4,
  max_ministers INTEGER DEFAULT 6,

  mass_type VARCHAR(50),
  -- 'missa_diaria', 'missa_dominical', 'festa_padroeiro', etc

  valid_from DATE,
  valid_until DATE,
  excluded_dates DATE[],
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  event_date DATE NOT NULL,
  event_time TIME NOT NULL,

  min_ministers INTEGER DEFAULT 4,
  max_ministers INTEGER DEFAULT 6,

  suppresses_mass_types TEXT[],
  priority INTEGER DEFAULT 100,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.8 Formation (Formação)
```sql
CREATE TABLE formation_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'liturgia', 'espiritualidade', 'pratica'
  icon VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES formation_tracks(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES formation_modules(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  lesson_number INTEGER,
  objectives TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES formation_lessons(id) NOT NULL,
  title VARCHAR(255),
  section_type VARCHAR(20) NOT NULL,
  -- 'text', 'video', 'audio', 'document', 'quiz', 'interactive'

  content TEXT,
  video_url TEXT,
  audio_url TEXT,
  document_url TEXT,
  image_url TEXT,
  quiz_data JSONB,

  estimated_minutes INTEGER,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE formation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  module_id UUID REFERENCES formation_modules(id) NOT NULL,

  status VARCHAR(20) DEFAULT 'not_started',
  -- 'not_started', 'in_progress', 'completed'

  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, module_id)
);

CREATE TABLE formation_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  track_id UUID REFERENCES formation_tracks(id) NOT NULL,

  certificate_number VARCHAR(50) UNIQUE NOT NULL,

  -- Snapshots no momento da emissão
  user_name VARCHAR(255) NOT NULL,
  track_title VARCHAR(255) NOT NULL,

  total_lessons INTEGER,
  total_hours DECIMAL(5,2),

  verification_code VARCHAR(100),
  metadata JSONB,

  issued_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.9 Gamification
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  category VARCHAR(20) NOT NULL,
  -- 'participation', 'formation', 'community', 'streak', 'milestone', 'special'

  rarity VARCHAR(20) DEFAULT 'common',
  -- 'common', 'uncommon', 'rare', 'epic', 'legendary'

  points_awarded INTEGER DEFAULT 0,

  requirement JSONB,
  -- {"type": "mass_count", "value": 100, "description": "Servir 100 missas"}

  icon_name VARCHAR(50),
  icon_color VARCHAR(20),
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,

  earned_at TIMESTAMP DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0, -- 0-100

  UNIQUE(user_id, badge_id)
);

CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,

  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  level INTEGER DEFAULT 1,
  level_progress INTEGER DEFAULT 0,

  masses_served INTEGER DEFAULT 0,
  substitutions_helped INTEGER DEFAULT 0,
  materials_completed INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,

  last_activity_at TIMESTAMP
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  action VARCHAR(50) NOT NULL,
  -- 'mass_served', 'substitution_offered', 'material_completed', etc

  points INTEGER NOT NULL,

  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE level_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  benefits JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.10 Auxiliary Panel (Painel Auxiliar)
```sql
CREATE TABLE minister_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) NOT NULL,
  minister_id UUID REFERENCES users(id) NOT NULL,

  status VARCHAR(20) DEFAULT 'present',
  -- 'present', 'late', 'absent'

  checked_in_at TIMESTAMP DEFAULT NOW(),
  checked_in_by UUID REFERENCES users(id),

  notes TEXT
);

CREATE TABLE standby_ministers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) NOT NULL,
  minister_id UUID REFERENCES users(id) NOT NULL,

  confirmed_available BOOLEAN,
  called_at TIMESTAMP,
  responded_at TIMESTAMP,

  response VARCHAR(20),
  -- 'available', 'unavailable', 'on_way', 'arrived'

  assigned_position INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE mass_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,

  changes_made JSONB DEFAULT '[]',
  -- [{type: 'check_in', ministerId, timestamp}, ...]

  attendance JSONB DEFAULT '[]',
  -- [{ministerId, status, position, arrivalTime}, ...]

  incidents JSONB DEFAULT '[]',
  -- [{type: 'late_arrival', ministerId, details}, ...]

  mass_quality INTEGER, -- 1-5
  highlights TEXT,

  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.11 Notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  type VARCHAR(20) NOT NULL,
  -- 'schedule', 'substitution', 'formation', 'announcement', 'reminder'

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,

  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  action_url TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  endpoint TEXT UNIQUE NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2.12 Adorations (Adoração)
```sql
CREATE TABLE adoration_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,

  total_ministers_to_draw INTEGER,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE adoration_draw_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID REFERENCES adoration_draws(id) NOT NULL,
  minister_id UUID REFERENCES users(id) NOT NULL,

  monday_of_week INTEGER NOT NULL, -- 1-5
  is_voluntary BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(draw_id, minister_id, monday_of_week)
);
```

#### 2.2.13 Activity Logs
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  action VARCHAR(100) NOT NULL,
  -- 'login', 'view_schedule', 'respond_questionnaire', etc

  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id UUID,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  session_token VARCHAR(255) UNIQUE NOT NULL,

  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),

  ip_address VARCHAR(45),
  user_agent TEXT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 Estrutura de Perguntas (Questionário)

```json
{
  "questions": [
    {
      "id": "q1",
      "type": "checkbox",
      "question": "Quais domingos você está disponível?",
      "options": [
        {"value": "2024-02-04", "label": "04/02 (1º Domingo)"},
        {"value": "2024-02-11", "label": "11/02 (2º Domingo)"},
        {"value": "2024-02-18", "label": "18/02 (3º Domingo)"},
        {"value": "2024-02-25", "label": "25/02 (4º Domingo)"}
      ],
      "required": true,
      "category": "availability"
    },
    {
      "id": "q2",
      "type": "checkbox",
      "question": "Quais horários você prefere?",
      "options": [
        {"value": "07:00", "label": "7h"},
        {"value": "09:00", "label": "9h"},
        {"value": "11:00", "label": "11h"},
        {"value": "19:00", "label": "19h"}
      ],
      "required": true,
      "category": "preference"
    },
    {
      "id": "q3",
      "type": "yes_no",
      "question": "Você pode ser chamado como substituto?",
      "required": true,
      "category": "substitution"
    },
    {
      "id": "q4",
      "type": "yes_no_with_options",
      "question": "Você participa da Adoração às segundas?",
      "conditionalOptions": {
        "yes": [
          {"value": "week1", "label": "1ª segunda"},
          {"value": "week2", "label": "2ª segunda"},
          {"value": "week3", "label": "3ª segunda"},
          {"value": "week4", "label": "4ª segunda"}
        ]
      },
      "required": false,
      "category": "adoration"
    }
  ]
}
```

---

## 3. FUNCIONALIDADES POR TELA

### 3.1 Autenticação

#### Tela: Login
**Rota:** `/login`

**Campos:**
- Email (input text)
- Senha (input password)
- Checkbox "Lembrar-me"

**Ações:**
- Botão "Entrar"
- Link "Esqueci minha senha"
- Link "Primeiro acesso"

**Fluxo:**
1. Usuário insere credenciais
2. App envia POST `/api/auth/login`
3. Se sucesso, recebe JWT token
4. Se `requiresPasswordChange=true`, redireciona para troca de senha
5. Armazena token no secure storage
6. Redireciona para Dashboard ou Escalas

**API:**
```typescript
POST /api/auth/login
Body: { email: string, password: string }
Response: {
  token: string,
  user: User,
  requiresPasswordChange: boolean
}
```

#### Tela: Troca de Senha Obrigatória
**Rota:** `/change-password`

**Campos:**
- Nova senha
- Confirmar nova senha

**Validação:**
- Mínimo 8 caracteres
- Pelo menos 1 número
- Pelo menos 1 letra maiúscula

---

### 3.2 Dashboard (Coordenador/Gestor)

#### Tela: Dashboard Principal
**Rota:** `/dashboard`

**Seções:**

1. **Alertas Urgentes** (Card vermelho)
   - Missas sem ministros suficientes
   - Substituições pendentes críticas
   - Questionários não respondidos (>50% faltando)

2. **Estatísticas do Mês** (Cards)
   - Ministros ativos
   - Taxa de resposta questionário
   - Cobertura de escalas (%)
   - Substituições pendentes

3. **Próximas Missas** (Lista)
   - Data/Hora
   - Quantidade de ministros
   - Status (completa/incompleta)
   - Botão "Ver detalhes"

4. **Atividade Recente** (Timeline)
   - Últimas ações no sistema
   - Quem fez o quê

**APIs:**
```typescript
GET /api/dashboard/stats
GET /api/dashboard/urgent-alerts
GET /api/dashboard/upcoming-masses
GET /api/dashboard/activity
```

---

### 3.3 Escalas

#### Tela: Minhas Escalas (Ministro)
**Rota:** `/schedules`

**Visualizações:**
- Lista (próximas escalas)
- Calendário (visão mensal)

**Card de Escala:**
- Data (Ex: "Dom, 04 Fev")
- Horário (Ex: "9h")
- Local
- Posição (1º, 2º, etc)
- Status de confirmação
- Botões: "Confirmar" / "Pedir Substituição"

**Filtros:**
- Mês/Ano
- Apenas minhas escalas
- Todas as escalas (se coordenador)

**APIs:**
```typescript
GET /api/schedules?month=2&year=2024&ministerId=xxx
GET /api/schedules/minister/upcoming
```

#### Tela: Gerenciar Escalas (Coordenador)
**Rota:** `/schedules/manage`

**Funcionalidades:**
- Ver todas as escalas do mês
- Editar atribuições (drag & drop)
- Adicionar/remover ministros
- Publicar escalas

**Componentes:**
- Seletor de mês/ano
- Grid por data/horário
- Modal de edição
- Botão "Gerar Escala"
- Botão "Publicar"

**APIs:**
```typescript
GET /api/schedules?month=2&year=2024
POST /api/schedules
PUT /api/schedules/:id
DELETE /api/schedules/:id
POST /api/schedules/publish
POST /api/schedules/generate
```

#### Tela: Editor de Escala (Drag & Drop)
**Rota:** `/schedules/edit/:date`

**Layout:**
- Colunas por horário de missa
- Cards de ministros arrastáveis
- Pool de ministros disponíveis
- Indicador de conflitos

**Funcionalidades:**
- Arrastar ministro para posição
- Trocar posições entre ministros
- Adicionar ministro do pool
- Remover ministro da escala
- Ver disponibilidade ao passar mouse

---

### 3.4 Substituições

#### Tela: Solicitar Substituição (Ministro)
**Rota:** `/substitutions/request`

**Campos:**
- Seletor de escala (data/hora)
- Motivo (opcional)
- Sugerir substituto (opcional)

**Fluxo:**
1. Seleciona escala que não pode comparecer
2. Escreve motivo (opcional)
3. Pode selecionar substituto sugerido
4. Envia solicitação
5. Aguarda aprovação

**API:**
```typescript
POST /api/substitutions
Body: {
  scheduleId: string,
  reason?: string,
  suggestedSubstituteId?: string
}
```

#### Tela: Gerenciar Substituições (Coordenador)
**Rota:** `/substitutions`

**Tabs:**
- Pendentes
- Aprovadas
- Rejeitadas

**Card de Substituição:**
- Quem solicitou
- Data/hora da missa
- Urgência (badge colorido)
- Motivo
- Substituto sugerido
- Botões: Aprovar / Rejeitar

**APIs:**
```typescript
GET /api/substitutions?status=pending
PUT /api/substitutions/:id/approve
PUT /api/substitutions/:id/reject
```

---

### 3.5 Questionários

#### Tela: Responder Questionário (Ministro)
**Rota:** `/questionnaire/:id`

**Layout:**
- Título do questionário
- Prazo para resposta
- Perguntas em sequência
- Barra de progresso
- Botão "Enviar"

**Tipos de Pergunta:**
- Checkbox (múltipla seleção)
- Radio (seleção única)
- Sim/Não
- Texto livre
- Seleção de datas (calendário)
- Seleção de horários

**API:**
```typescript
GET /api/questionnaires/:id
POST /api/questionnaires/:id/responses
Body: { responses: { [questionId]: answer } }
```

#### Tela: Criar Questionário (Coordenador)
**Rota:** `/questionnaires/create`

**Campos:**
- Título
- Mês/Ano de referência
- Prazo de resposta
- Perguntas (builder)

**Builder de Perguntas:**
- Tipo de pergunta
- Texto da pergunta
- Opções (se aplicável)
- Obrigatória?

**API:**
```typescript
POST /api/questionnaires
Body: {
  title: string,
  month: number,
  year: number,
  deadline: Date,
  questions: Question[]
}
```

---

### 3.6 Formação

#### Tela: Trilhas de Formação
**Rota:** `/formation`

**Layout:**
- Cards de trilhas (Liturgia, Espiritualidade, Prática)
- Progresso geral do usuário
- Certificados obtidos

**Card de Trilha:**
- Ícone
- Título
- Descrição
- Progresso (%)
- Módulos completados / total
- Botão "Continuar"

**API:**
```typescript
GET /api/formation/tracks
GET /api/formation/progress
```

#### Tela: Módulos da Trilha
**Rota:** `/formation/track/:trackId`

**Layout:**
- Breadcrumb (Formação > Trilha)
- Lista de módulos em ordem
- Status de cada módulo (bloqueado/disponível/concluído)

**Card de Módulo:**
- Título
- Duração estimada
- Aulas completadas / total
- Status (ícone)

**API:**
```typescript
GET /api/formation/tracks/:trackId/modules
```

#### Tela: Aula
**Rota:** `/formation/lesson/:lessonId`

**Layout:**
- Título da aula
- Seções de conteúdo
- Navegação (anterior/próxima)
- Botão "Marcar como concluída"

**Tipos de Seção:**
- Texto (markdown)
- Vídeo (player embutido)
- Quiz (perguntas interativas)
- Documento (PDF viewer)

**APIs:**
```typescript
GET /api/formation/lessons/:lessonId
POST /api/formation/progress/update
Body: { lessonId, completed: boolean, timeSpent: number }
```

---

### 3.7 Gamificação

#### Tela: Meu Perfil de Gamificação
**Rota:** `/gamification`

**Seções:**

1. **Header**
   - Avatar
   - Nome
   - Nível atual (Ex: "Ministro Veterano")
   - Barra de XP para próximo nível

2. **Estatísticas**
   - Pontos totais
   - Missas servidas
   - Streak atual
   - Rank no leaderboard

3. **Badges Conquistados**
   - Grid de badges
   - Clique para ver detalhes
   - Badges secretos (com "?")

4. **Histórico de Pontos**
   - Timeline de transações
   - +10 pts - Serviu na missa
   - +20 pts - Completou material

**APIs:**
```typescript
GET /api/gamification/profile
GET /api/gamification/badges
GET /api/gamification/transactions
```

#### Tela: Leaderboard
**Rota:** `/gamification/leaderboard`

**Tabs:**
- Semanal
- Mensal
- Geral

**Lista:**
- Posição (#1, #2, etc)
- Avatar + Nome
- Pontos
- Nível
- Destaque para usuário atual

**API:**
```typescript
GET /api/gamification/leaderboard?period=weekly
```

---

### 3.8 Painel Auxiliar

#### Tela: Check-in da Missa
**Rota:** `/auxiliary/:scheduleId`

**Header:**
- Data e horário da missa
- Contagem regressiva para início
- Status geral (X de Y presentes)

**Lista de Ministros:**
- Foto + Nome
- Posição atribuída
- Status (Aguardando / Presente / Atrasado / Ausente)
- Botão "Check-in"
- Botão "Chamar Standby" (se ausente)

**Ações:**
- Check-in individual
- Trocar posições (drag & drop)
- Chamar standby
- Registrar incidente
- Finalizar missa

**APIs:**
```typescript
GET /api/auxiliary/panel/:scheduleId
POST /api/auxiliary/checkin
Body: { scheduleId, ministerId, status }

POST /api/auxiliary/standby/call
Body: { scheduleId, ministerId }

POST /api/auxiliary/position/change
Body: { scheduleId, fromPosition, toPosition }

POST /api/auxiliary/log
Body: { scheduleId, quality, highlights, incidents }
```

---

### 3.9 Relatórios (Coordenador)

#### Tela: Dashboard de Relatórios
**Rota:** `/reports`

**Cards de Relatório:**
- Participação por Ministro
- Taxa de Resposta de Questionários
- Substituições (solicitadas vs atendidas)
- Confiabilidade dos Ministros
- Progresso de Formação

**Filtros Globais:**
- Período (mês/trimestre/ano)
- Ministro específico (opcional)

#### Tela: Relatório de Participação
**Rota:** `/reports/participation`

**Visualizações:**
- Gráfico de barras (missas por ministro)
- Tabela detalhada
- Exportar CSV/Excel

**APIs:**
```typescript
GET /api/reports/participation?startDate=&endDate=
GET /api/reports/participation/export?format=csv
```

---

### 3.10 Configurações e Perfil

#### Tela: Meu Perfil
**Rota:** `/profile`

**Seções:**

1. **Dados Pessoais**
   - Foto (upload)
   - Nome
   - Email
   - Telefone
   - WhatsApp
   - Endereço

2. **Dados Sacramentais**
   - Data de batismo
   - Data de crisma
   - Data de casamento (se aplicável)

3. **Preferências**
   - Posições preferidas
   - Posições a evitar
   - Disponível para eventos especiais

4. **Segurança**
   - Alterar senha
   - Sessões ativas

**API:**
```typescript
GET /api/users/me
PATCH /api/users/me
Body: { name?, phone?, preferences?, etc }
```

#### Tela: Configurações do App
**Rota:** `/settings`

**Seções:**
- Notificações (push on/off)
- Tema (claro/escuro/sistema)
- Idioma
- Sobre o app
- Política de privacidade
- Sair

---

## 4. APIs - ESPECIFICAÇÃO COMPLETA

### 4.1 Autenticação

```typescript
// Login
POST /api/auth/login
Body: { email: string, password: string }
Response: { token: string, user: User, requiresPasswordChange: boolean }

// Logout
POST /api/auth/logout
Headers: { Authorization: "Bearer {token}" }

// Verificar sessão
GET /api/auth/verify
Headers: { Authorization: "Bearer {token}" }
Response: { valid: boolean, user?: User }

// Trocar senha
POST /api/auth/change-password
Body: { currentPassword: string, newPassword: string }

// Esqueci minha senha
POST /api/auth/forgot-password
Body: { email: string }

// Reset de senha
POST /api/auth/reset-password
Body: { token: string, newPassword: string }
```

### 4.2 Usuários

```typescript
// Meu perfil
GET /api/users/me
Response: User

// Atualizar perfil
PATCH /api/users/me
Body: Partial<User>

// Listar usuários (admin)
GET /api/users?role=ministro&status=active
Response: User[]

// Buscar usuário
GET /api/users/:id
Response: User

// Criar usuário (admin)
POST /api/users
Body: CreateUserDto

// Atualizar usuário (admin)
PATCH /api/users/:id
Body: Partial<User>

// Desativar usuário
DELETE /api/users/:id
```

### 4.3 Escalas

```typescript
// Listar escalas
GET /api/schedules?month=2&year=2024&ministerId=xxx
Response: Schedule[]

// Próximas escalas do ministro
GET /api/schedules/minister/upcoming
Response: Schedule[]

// Escalas por data
GET /api/schedules/by-date/:date
Response: { schedules: Schedule[], assignments: Assignment[] }

// Criar escala
POST /api/schedules
Body: { date, time, ministerId, position }

// Atualizar escala
PUT /api/schedules/:id
Body: Partial<Schedule>

// Deletar escala
DELETE /api/schedules/:id

// Gerar escalas automaticamente
POST /api/schedules/generate
Body: { month: number, year: number }
Response: { generated: Schedule[], conflicts: Conflict[] }

// Publicar escalas
POST /api/schedules/publish
Body: { month: number, year: number }

// Confirmar presença
POST /api/schedules/:id/confirm
Body: { status: 'confirmed' | 'declined', reason?: string }
```

### 4.4 Substituições

```typescript
// Solicitar substituição
POST /api/substitutions
Body: { scheduleId, reason?, suggestedSubstituteId? }

// Listar substituições
GET /api/substitutions?status=pending
Response: SubstitutionRequest[]

// Aprovar substituição
PUT /api/substitutions/:id/approve
Body: { substituteId }

// Rejeitar substituição
PUT /api/substitutions/:id/reject
Body: { reason? }

// Histórico de substituições
GET /api/substitutions/history?ministerId=xxx
```

### 4.5 Questionários

```typescript
// Listar questionários
GET /api/questionnaires?year=2024
Response: Questionnaire[]

// Buscar questionário
GET /api/questionnaires/:id
Response: Questionnaire

// Criar questionário
POST /api/questionnaires
Body: CreateQuestionnaireDto

// Enviar questionário (notificar ministros)
POST /api/questionnaires/:id/send

// Responder questionário
POST /api/questionnaires/:id/responses
Body: { responses: Record<string, any> }

// Ver respostas (admin)
GET /api/questionnaires/:id/responses
Response: QuestionnaireResponse[]

// Enviar lembrete
POST /api/questionnaires/:id/remind
```

### 4.6 Formação

```typescript
// Listar trilhas
GET /api/formation/tracks
Response: FormationTrack[]

// Módulos de uma trilha
GET /api/formation/tracks/:trackId/modules
Response: FormationModule[]

// Aulas de um módulo
GET /api/formation/modules/:moduleId/lessons
Response: FormationLesson[]

// Detalhes da aula
GET /api/formation/lessons/:lessonId
Response: FormationLesson & { sections: LessonSection[] }

// Progresso do usuário
GET /api/formation/progress
Response: FormationProgress[]

// Atualizar progresso
POST /api/formation/progress/update
Body: { lessonId, completed: boolean, timeSpent: number }

// Certificados
GET /api/formation/certificates
Response: FormationCertificate[]

// Gerar certificado
POST /api/formation/certificates/generate
Body: { trackId }
```

### 4.7 Gamificação

```typescript
// Perfil de gamificação
GET /api/gamification/profile
Response: { points: UserPoints, badges: UserBadge[], level: Level }

// Todos os badges
GET /api/gamification/badges
Response: Badge[]

// Leaderboard
GET /api/gamification/leaderboard?period=weekly
Response: LeaderboardEntry[]

// Histórico de pontos
GET /api/gamification/transactions?limit=20
Response: PointTransaction[]

// Verificar badges (interno)
POST /api/gamification/check-badges
```

### 4.8 Painel Auxiliar

```typescript
// Dados da missa
GET /api/auxiliary/panel/:scheduleId
Response: {
  schedule: Schedule,
  ministers: MinisterStatus[],
  standbyAvailable: User[]
}

// Check-in
POST /api/auxiliary/checkin
Body: { scheduleId, ministerId, status: 'present' | 'late' }

// Chamar standby
POST /api/auxiliary/standby/call
Body: { scheduleId, ministerId }

// Resposta do standby
POST /api/auxiliary/standby/:id/response
Body: { response: 'available' | 'unavailable' }

// Trocar posição
POST /api/auxiliary/position/change
Body: { scheduleId, ministerId, fromPosition, toPosition }

// Registrar incidente
POST /api/auxiliary/incidents
Body: { scheduleId, type, ministerId?, details }

// Finalizar missa
POST /api/auxiliary/log
Body: { scheduleId, quality: 1-5, highlights?, incidents? }
```

### 4.9 Notificações

```typescript
// Listar notificações
GET /api/notifications?unreadOnly=true
Response: Notification[]

// Marcar como lida
PUT /api/notifications/:id/read

// Marcar todas como lidas
PUT /api/notifications/read-all

// Registrar push subscription
POST /api/push-subscriptions
Body: { endpoint, p256dhKey, authKey }
```

### 4.10 Relatórios

```typescript
// Participação
GET /api/reports/participation?startDate=&endDate=
Response: ParticipationReport

// Disponibilidade
GET /api/reports/availability?month=2&year=2024
Response: AvailabilityReport

// Substituições
GET /api/reports/substitutions?startDate=&endDate=
Response: SubstitutionReport

// Confiabilidade
GET /api/reports/reliability
Response: ReliabilityReport

// Formação
GET /api/reports/formation
Response: FormationReport

// Exportar
GET /api/reports/:type/export?format=csv|xlsx
Response: Binary file
```

---

## 5. REGRAS DE NEGÓCIO

### 5.1 Geração de Escalas

1. **Prioridade de Atribuição:**
   - Ministros com maior reliability score têm prioridade
   - Respeitar preferências de horário do questionário
   - Evitar posições marcadas como "evitar"
   - Famílias que preferem servir juntas devem ser agrupadas

2. **Conflitos:**
   - Ministro não pode ser escalado 2x no mesmo dia
   - Ministro não pode ser escalado em data que marcou indisponível
   - Alertar se ministro foi escalado muitas vezes no mês

3. **Aprendizado:**
   - Sistema aprende com edições do coordenador
   - Padrões detectados são usados em futuras gerações

### 5.2 Substituições

1. **Cálculo de Urgência:**
   ```
   < 12 horas  → CRÍTICA (vermelho)
   12-24 horas → ALTA (laranja)
   24-72 horas → MÉDIA (amarelo)
   > 72 horas  → BAIXA (verde)
   ```

2. **Auto-aprovação:**
   - Se ministro sugere substituto E substituto aceita → auto-aprovar

3. **Impacto na Confiabilidade:**
   - Cada substituição solicitada: -2 pontos
   - Cada substituição atendida (ajudou): +3 pontos
   - No-show: -10 pontos

### 5.3 Gamificação

1. **Pontuação:**
   ```
   Servir na missa:        +10 pts
   Substituição oferecida: +5 pts
   Substituição aceita:    +15 pts
   Material completado:    +20 pts
   Quiz perfeito:          +20 pts
   Streak semanal:         +50 pts
   Badge conquistado:      +[pts do badge]
   ```

2. **Níveis:**
   ```
   Nível 1: Iniciante       (0-99 pts)
   Nível 2: Aprendiz        (100-299 pts)
   Nível 3: Ministro        (300-599 pts)
   Nível 4: Ministro Fiel   (600-999 pts)
   Nível 5: Veterano        (1000-1499 pts)
   Nível 6: Mestre          (1500-2499 pts)
   Nível 7: Guardião        (2500+ pts)
   ```

3. **Badges:**
   - Primeira missa servida
   - 10/50/100 missas servidas
   - Streak de 4 semanas
   - Trilha de formação completa
   - Ajudou em 10 substituições
   - Participou de evento especial

### 5.4 Confirmação de Presença

1. **Fluxo:**
   - Escala publicada → Confirmação criada com status "pending"
   - Enviar notificação ao ministro
   - Se não responder em 48h → enviar lembrete
   - Máximo de 3 lembretes
   - Se não aparecer → marcar como "no_show"

2. **Impacto:**
   - Confirmou e apareceu: +5 reliability
   - Confirmou e não apareceu: -15 reliability
   - Não confirmou e apareceu: 0
   - Não confirmou e não apareceu: -10 reliability

---

## 6. FLUXOS DE NAVEGAÇÃO

### 6.1 Ministro

```
Login
  │
  ├─► Home (Minhas Escalas)
  │     ├─► Ver Detalhes da Escala
  │     ├─► Confirmar Presença
  │     └─► Solicitar Substituição
  │
  ├─► Questionário
  │     └─► Responder
  │
  ├─► Formação
  │     ├─► Trilhas
  │     ├─► Módulos
  │     └─► Aulas
  │
  ├─► Gamificação
  │     ├─► Meu Perfil
  │     ├─► Badges
  │     └─► Leaderboard
  │
  ├─► Notificações
  │
  └─► Perfil
        ├─► Editar Dados
        └─► Configurações
```

### 6.2 Coordenador

```
Login
  │
  ├─► Dashboard
  │     ├─► Alertas Urgentes
  │     └─► Estatísticas
  │
  ├─► Escalas
  │     ├─► Visualizar
  │     ├─► Editar (Drag & Drop)
  │     ├─► Gerar
  │     └─► Publicar
  │
  ├─► Substituições
  │     ├─► Pendentes
  │     ├─► Aprovar/Rejeitar
  │     └─► Histórico
  │
  ├─► Questionários
  │     ├─► Criar
  │     ├─► Enviar
  │     └─► Ver Respostas
  │
  ├─► Painel Auxiliar
  │     ├─► Check-in
  │     ├─► Standby
  │     └─► Finalizar Missa
  │
  ├─► Relatórios
  │     └─► Vários tipos
  │
  ├─► Ministros
  │     └─► Diretório
  │
  └─► (Todas as telas de Ministro também)
```

---

## 7. NOTIFICAÇÕES PUSH

### 7.1 Tipos de Notificação

| Tipo | Título | Corpo | Ação |
|------|--------|-------|------|
| **schedule_published** | "Escala Publicada!" | "A escala de {mês} foi publicada. Confira suas datas." | Abrir escalas |
| **schedule_reminder** | "Lembrete de Escala" | "Amanhã você serve na missa das {hora}." | Abrir escala |
| **confirmation_request** | "Confirme sua Presença" | "Por favor, confirme sua presença na missa de {data}." | Abrir confirmação |
| **substitution_needed** | "Substituição Necessária" | "{nome} precisa de substituto para {data}." | Abrir substituição |
| **substitution_approved** | "Substituição Aprovada" | "Sua substituição para {data} foi aprovada." | Abrir escalas |
| **formation_new** | "Novo Conteúdo" | "Nova aula disponível: {título}" | Abrir formação |
| **badge_earned** | "Badge Conquistado!" | "Você ganhou o badge '{nome}'!" | Abrir gamificação |

### 7.2 Configurações

```typescript
interface NotificationSettings {
  pushEnabled: boolean;
  scheduleReminders: boolean;  // 24h antes
  substitutionAlerts: boolean;
  formationUpdates: boolean;
  gamificationAlerts: boolean;
  quietHoursStart?: string;    // Ex: "22:00"
  quietHoursEnd?: string;      // Ex: "07:00"
}
```

---

## 8. OFFLINE SUPPORT

### 8.1 Dados para Cache Local

```typescript
// Essenciais (sempre sincronizar)
- Minhas escalas do mês atual e próximo
- Meu perfil
- Configurações

// Secundários (sincronizar quando possível)
- Trilhas de formação em progresso
- Badges conquistados
- Últimas notificações

// Não cachear
- Dados de outros ministros
- Relatórios
- Questionários (sempre online)
```

### 8.2 Sync Strategy

1. **Pull on Launch:** Buscar dados novos ao abrir app
2. **Background Sync:** Sincronizar periodicamente
3. **Push Sync:** Atualizar via push notification
4. **Conflict Resolution:** Server wins (dados do servidor têm prioridade)

---

## 9. SEGURANÇA

### 9.1 Autenticação
- JWT com expiração de 24h
- Refresh token com 7 dias
- Secure storage para tokens
- Biometria opcional para login

### 9.2 Autorização
- RBAC (Role-Based Access Control)
- Middleware de verificação em cada rota
- Validação de ownership para recursos pessoais

### 9.3 Dados Sensíveis
- Senhas com bcrypt (10 rounds)
- HTTPS obrigatório
- Sanitização de inputs
- Rate limiting em APIs

---

## 10. MÉTRICAS E ANALYTICS

### 10.1 Eventos para Rastrear

```typescript
// Autenticação
- login_success
- login_failure
- logout

// Escalas
- schedule_viewed
- confirmation_sent
- substitution_requested

// Formação
- lesson_started
- lesson_completed
- quiz_answered

// Engajamento
- app_opened
- notification_received
- notification_clicked
```

### 10.2 KPIs

- DAU/MAU (usuários ativos)
- Taxa de resposta de questionários
- Taxa de confirmação de presença
- Tempo médio em formação
- Badges mais conquistados

---

## 11. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: MVP (4-6 semanas)
- [ ] Setup do projeto (React Native/Flutter)
- [ ] Autenticação (login, logout, troca de senha)
- [ ] Visualização de escalas
- [ ] Confirmação de presença
- [ ] Perfil básico
- [ ] Push notifications básicas

### Fase 2: Core Features (4-6 semanas)
- [ ] Solicitação de substituição
- [ ] Questionários (responder)
- [ ] Dashboard coordenador
- [ ] Gerenciamento de escalas
- [ ] Publicação de escalas

### Fase 3: Engagement (3-4 semanas)
- [ ] Gamificação completa
- [ ] Formação (trilhas, módulos, aulas)
- [ ] Certificados
- [ ] Leaderboard

### Fase 4: Advanced (3-4 semanas)
- [ ] Painel auxiliar (check-in)
- [ ] Relatórios
- [ ] Geração inteligente de escalas
- [ ] Integração WhatsApp

### Fase 5: Polish (2-3 semanas)
- [ ] Offline support
- [ ] Otimizações de performance
- [ ] Testes E2E
- [ ] Preparação para lojas (App Store, Play Store)

---

## 12. BACKUP DO BANCO DE DADOS

### 12.1 Como Fazer Backup (PostgreSQL)

```bash
# Backup completo
pg_dump -h localhost -U postgres -d mesc_db -F c -f mesc_backup.dump

# Backup apenas dados (sem estrutura)
pg_dump -h localhost -U postgres -d mesc_db --data-only -f mesc_data.sql

# Backup de tabelas específicas
pg_dump -h localhost -U postgres -d mesc_db -t users -t schedules -f mesc_partial.sql
```

### 12.2 Como Restaurar

```bash
# Criar banco novo
createdb -h localhost -U postgres mesc_new_db

# Restaurar
pg_restore -h localhost -U postgres -d mesc_new_db mesc_backup.dump

# Ou com SQL puro
psql -h localhost -U postgres -d mesc_new_db -f mesc_data.sql
```

### 12.3 Variáveis de Ambiente Necessárias

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
JWT_SECRET=sua-chave-secreta-muito-longa

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=sua-chave-publica
VAPID_PRIVATE_KEY=sua-chave-privada
VAPID_SUBJECT=mailto:seu@email.com

# WhatsApp (Z-API) - Opcional
ZAPI_INSTANCE_ID=seu-instance-id
ZAPI_TOKEN=seu-token
ZAPI_SECURITY_TOKEN=seu-security-token
```

---

## 13. CHECKLIST PARA O CURSOR

### Antes de Começar

- [ ] Instalar Node.js 18+
- [ ] Instalar PostgreSQL 14+
- [ ] Fazer backup do banco atual
- [ ] Configurar variáveis de ambiente
- [ ] Escolher stack (React Native ou Flutter)

### Estrutura de Pastas Sugerida (React Native)

```
mesc-native/
├── src/
│   ├── api/           # Chamadas de API
│   ├── components/    # Componentes reutilizáveis
│   ├── hooks/         # Custom hooks
│   ├── navigation/    # Configuração de navegação
│   ├── screens/       # Telas do app
│   ├── services/      # Serviços (auth, storage, etc)
│   ├── store/         # Estado global (Zustand/Redux)
│   ├── theme/         # Cores, fontes, espaçamentos
│   ├── types/         # TypeScript types
│   └── utils/         # Funções utilitárias
├── assets/            # Imagens, fontes, etc
├── __tests__/         # Testes
├── app.json           # Configuração Expo
├── package.json
└── tsconfig.json
```

### Comandos para Iniciar

```bash
# Com Expo (recomendado para React Native)
npx create-expo-app mesc-native --template expo-template-blank-typescript
cd mesc-native

# Instalar dependências essenciais
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
npx expo install expo-notifications

# UI Library
npm install react-native-paper

# State Management
npm install zustand

# API Client
npm install axios

# Forms
npm install react-hook-form zod @hookform/resolvers
```

---

## 14. CONCLUSÃO

Este PRD documenta completamente o sistema MESC e fornece todas as especificações necessárias para criar um clone como app nativo. O documento inclui:

1. **Estrutura completa do banco de dados** com todas as tabelas e relacionamentos
2. **Especificação de todas as telas** com campos e ações
3. **APIs detalhadas** para cada funcionalidade
4. **Regras de negócio** documentadas
5. **Fluxos de navegação** claros
6. **Instruções de backup e restauração** do banco

Com este documento e o backup do banco de dados, você terá tudo necessário para implementar o app nativo no Cursor.

---

**Documento criado em:** Fevereiro 2026
**Baseado em:** MESC v5.4.3
**Autor:** Claude (assistente AI)
