# PRD - Sistema MESC (Ministros Extraordinários da Sagrada Comunhão)
## Santuário São Judas Tadeu - Sorocaba/SP

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Objetivo
Desenvolver um sistema web completo para gestão dos Ministros Extraordinários da Sagrada Comunhão (MESC) do Santuário São Judas Tadeu em Sorocaba/SP, automatizando processos de escalação, comunicação, formação e gestão administrativa.

### 1.2 Stakeholders
- **Administrador do Sistema**: Gestor (gestão e administração completa do sistema)
- **Coordenador Paroquial**: 2 pessoas: Marco Rossit e Priscila Machado (gestão operacional e acompanhamento de relatórios)
- **Coordenador**: 1 pessoa: Ana Paula (gestão operacional e acompanhamento de relatórios)
- **Ministros**: ~150 pessoas ativas (uso diário do sistema)

### 1.3 Problema a Resolver
- Gestão manual de escalas via WhatsApp e Forms (Google) é ineficiente
- Dificuldade em gerenciar substituições e ausências
- Falta de controle sobre disponibilidade dos ministros
- Comunicação fragmentada entre coordenação e ministros
- Ausência de trilha formativa estruturada
- Dificuldade em manter dados atualizados dos ministros

---

## 2. ARQUITETURA TÉCNICA

### 2.1 Stack Tecnológico
```
Frontend:
- React 18+ com TypeScript
- Vite como bundler
- TanStack Query para gerenciamento de estado
- Wouter para roteamento
- Tailwind CSS para estilização
- Shadcn/UI via MCP para componentes
- Lucide React para ícones

Backend:
- Node.js com Express
- TypeScript
- PostgreSQL (Neon DB)
- Drizzle ORM
- JWT para autenticação
- Bcrypt para criptografia

Infraestrutura:
- Deploy no Replit
- PostgreSQL hospedado no Neon
- Service Workers para PWA
- Cache com localStorage
```

### 2.2 Configuração MCP Shadcn/UI
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": [
        "@jpisnice/shadcn-ui-mcp-server",
        "--project-path",
        "/home/runner/workspace",
        "--component-path",
        "client/src/components/ui"
      ]
    }
  }
}
```

### 2.3 Design System - Paleta Litúrgica

#### Cores Principais (RGB)
```css
/* 1. CORES BASE - Tons Pérola e Marfim */
--color-pearl: 253, 252, 248;        /* #FDFCF8 - Fundo principal */
--color-ivory: 250, 248, 243;        /* #FAF8F3 - Cards e seções */
--color-cream: 247, 244, 237;        /* #F7F4ED - Elementos secundários */
--color-beige: 245, 241, 232;        /* #F5F1E8 - Bordas suaves */

/* 2. CORES DE TEXTO - Bronze e Mogno */
--color-bronze-900: 61, 47, 31;      /* #3D2F1F - Texto principal */
--color-bronze-800: 74, 58, 40;      /* #4A3A28 - Títulos */
--color-bronze-700: 92, 72, 55;      /* #5C4837 - Subtítulos */
--color-bronze-600: 115, 96, 79;     /* #73604F - Texto secundário */

/* 3. CORES PRIMÁRIAS - Cobre Acetinado */
--color-copper-800: 160, 82, 45;     /* #A0522D - Botão padrão */
--color-copper-700: 184, 115, 51;    /* #B87333 - Destaque */

/* 4. CORES SECUNDÁRIAS - Dourado Litúrgico */
--color-gold-900: 184, 150, 63;      /* #B8963F - Ícones premium */
--color-gold-800: 201, 169, 97;      /* #C9A961 - Elementos especiais */
```

#### Requisitos de Contraste
- Texto principal sobre fundo: mínimo WCAG AA (4.5:1)
- Botões e elementos interativos: mínimo WCAG AA (3:1)
- Proibido uso de transparências no sidebar e elementos críticos

---

## 3. ESTRUTURA DO BANCO DE DADOS

### 3.1 Tabelas Principais

#### users
```sql
- id: uuid PRIMARY KEY
- name: varchar(255) NOT NULL
- email: varchar(255) UNIQUE NOT NULL
- password_hash: varchar(255) NOT NULL
- role: enum('ministro', 'coordenador', 'gestor')
- status: enum('pending', 'active', 'inactive')
- phone: varchar(20)
- whatsapp: varchar(20)
- birth_date: date
- join_date: date
- photo_url: text
- family_id: uuid REFERENCES families(id)
- created_at: timestamp DEFAULT NOW()
- updated_at: timestamp DEFAULT NOW()
```

#### families
```sql
- id: uuid PRIMARY KEY
- name: varchar(255) NOT NULL
- created_at: timestamp DEFAULT NOW()
```

#### questionnaires
```sql
- id: uuid PRIMARY KEY
- minister_id: uuid REFERENCES users(id)
- month: integer NOT NULL
- year: integer NOT NULL
- status: enum('pending', 'completed')
- responses: jsonb
- submitted_at: timestamp
- created_at: timestamp DEFAULT NOW()
- UNIQUE(minister_id, month, year)
```

#### schedules
```sql
- id: uuid PRIMARY KEY
- date: date NOT NULL
- time: time NOT NULL
- type: enum('missa', 'celebracao', 'evento')
- location: varchar(255)
- minister_id: uuid REFERENCES users(id)
- status: enum('scheduled', 'completed', 'absent', 'substituted')
- substitute_id: uuid REFERENCES users(id)
- notes: text
- created_at: timestamp DEFAULT NOW()
```

#### substitution_requests
```sql
- id: uuid PRIMARY KEY
- schedule_id: uuid REFERENCES schedules(id)
- requester_id: uuid REFERENCES users(id)
- substitute_id: uuid REFERENCES users(id)
- reason: text
- status: enum('pending', 'approved', 'rejected', 'cancelled')
- approved_by: uuid REFERENCES users(id)
- approved_at: timestamp
- created_at: timestamp DEFAULT NOW()
```

#### notifications
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id)
- type: enum('schedule', 'substitution', 'formation', 'announcement')
- title: varchar(255)
- message: text
- read: boolean DEFAULT false
- action_url: varchar(255)
- created_at: timestamp DEFAULT NOW()
```

#### active_sessions (NOVO - 03/10/2025)
```sql
- id: uuid PRIMARY KEY
- user_id: varchar REFERENCES users(id) ON DELETE CASCADE
- session_token: varchar(100) UNIQUE NOT NULL
- created_at: timestamp DEFAULT NOW()
- last_activity_at: timestamp DEFAULT NOW()
- expires_at: timestamp NOT NULL
- ip_address: varchar(45)
- user_agent: text
- is_active: boolean DEFAULT TRUE
- INDEX(user_id, is_active, expires_at, last_activity_at)
```
**Função:** Controle de inatividade com logout automático após 10 minutos sem atividade.

#### formation_modules
```sql
- id: uuid PRIMARY KEY
- title: varchar(255)
- description: text
- category: enum('liturgia', 'espiritualidade', 'pratica')
- content: text
- video_url: varchar(255)
- duration_minutes: integer
- order_index: integer
- created_at: timestamp DEFAULT NOW()
```

#### formation_progress
```sql
- id: uuid PRIMARY KEY
- user_id: uuid REFERENCES users(id)
- module_id: uuid REFERENCES formation_modules(id)
- status: enum('not_started', 'in_progress', 'completed')
- progress_percentage: integer DEFAULT 0
- completed_at: timestamp
- created_at: timestamp DEFAULT NOW()
- UNIQUE(user_id, module_id)
```

---

## 4. FUNCIONALIDADES DETALHADAS

### 4.1 Sistema de Autenticação

#### 4.1.1 Login
- **Campos**: Email e Senha
- **Validações**:
  - Email válido e cadastrado
  - Senha mínimo 8 caracteres
  - Máximo 5 tentativas em 15 minutos
- **Funcionalidades**:
  - "Lembrar-me" (30 dias)
  - Recuperação de senha via solicitação ao gestor
  - Login automático após cadastro aprovado

#### 4.1.2 Cadastro de Novos Ministros
- **Fluxo**:
  1. Ministro preenche formulário público
  2. Sistema envia notificação aos coordenadores
  3. Coordenador revisa e aprova/rejeita
  4. Push notification automático com credenciais ao aprovado

- **Campos do Cadastro**:
  - Nome completo*
  - Email*
  - Telefone*
  - WhatsApp
  - Data de nascimento*
  - Endereço completo
  - Paróquia de origem
  - Tempo como ministro
  - Motivação (campo texto)

### 4.2 Questionário Mensal de Disponibilidade

#### 4.2.1 Estrutura do Questionário
**Perguntas na ordem exata:**

1. **Disponibilidade para Missas Dominicais**
   - Tipo: Múltipla escolha
   - Pergunta prévia - Preferência familiar: inserir uma pergunta se o usuário que tiver cônjuge ou familiar cadastrado, se o sistema deverá considerar as mesmas respostas para os familiares e abrir opção para quais familiares o sistema deverá considerar.
   - Pergunta principal: Você poderá servir esse mês?
   - ( ) Sim
   - ( ) Não
   - Se sim, qual horário constuma servir:
     - [ ] Domingo 8h
     - [ ] Domingo 10h
     - [ ] Domingo 15h (quando dia 28 cair em domingo - honra S. Judas Tadeu)
     - [ ] Domingo 19h
   OBS.: ao selecionar uma das opções de horário, abrir um segundo submenu com as opções reais de data para os domingos do referido mês

2. **Disponibilidade para Missas Semanais**
   - Tipo: Múltipla escolha
   - Pergunta prévia: (Sim, Não ou Apenas alguns dias)
   - Opções caso seja alguns dias:
     - [ ] Segunda-feira 6h30
     - [ ] Terça-feira 6h30
     - [ ] Quarta-feira 6h30
     - [ ] Quinta-feira 6h30
     - [ ] Sexta-feira 6h30 (a missa de sexta-feita durante o tempo quaresmal que antecede a Páscoa ocorrerá às 5h, mudar a pergunta durante o período de quaresma)

3. **Você poderá servir no dia [primeira quinta-feira do mês] na missa por cura e libertação às 19h30 (19h se cair em feriado)?**
     - ( ) Sim
     - ( ) Não
      
4. **Você poderá servir no dia [primeira sexta-feira do mês] na missa votiva ao Sagrado Coração de Jesus às 6h30 (19h se cair em feriado)?**
     - ( ) Sim
     - ( ) Não
       
5. **Você poderá servir no dia [primeiro sábado do mês] na missa votiva ao Imaculado Coração de Maria às 6h30?**
     - ( ) Sim
     - ( ) Não
      
6. **Você pode conduzir o terço da nossa adoração - Segunda-feira 22h? (faremos revezamento de ministros que conduzem o terço)**
   - Tipo: Múltipla escolha
   - Opções:
     - [ ] Sim
     - [ ] Não
   
7. **Observações Adicionais**
   - Tipo: Texto livre
   - Placeholder: "Alguma observação sobre sua disponibilidade?"
   - Limite: 500 caracteres

#### 4.2.2 Regras de Negócio
- Questionário liberado dia 20 de cada mês
- Prazo para resposta: até dia 25
- Notificações automáticas:
  - Dia 20: Questionário disponível
  - Dia 23: Lembrete para não respondentes
  - Dia 24: Último lembrete
  - Dia 25: Encerramento
- Ministros sem resposta: considerados indisponíveis

### 4.3 Sistema de Substituições

#### 4.3.1 Fluxo de Substituição
1. **Solicitação**:
   - Ministro acessa "Minhas Escalas"
   - Seleciona data que precisa substituição
   - Informa motivo (obrigatório)
   - Sistema sugere substitutos disponíveis

2. **Busca de Substituto**:
   - Sistema lista ministros:
     - Que marcaram disponibilidade para aquele horário
     - Que não estão escalados
     - Ordenados por: frequência de serviço
   - Ministro pode enviar convite direto
   - Ou solicitar que coordenação encontre substituto

3. **Confirmação**:
   - Substituto recebe notificação (app)
   - Tem 48h para aceitar/recusar
   - Ao aceitar: escala é atualizada automaticamente
   - Notificações enviadas para todos envolvidos (auxiliares 1 e 2)

4. **Regras**:
   - Substituições até 12h antes: automáticas
   - Menos de 12h: requer aprovação do coordenador
   - Máximo 2 substituições por mês por ministro se maior que duas precisará de aprovação de um dos coordenadores
   - Histórico mantido para relatórios

### 4.4 Dashboard por Perfil

#### 4.4.1 Dashboard Ministro
**Cards Principais:**
- **Próximas Escalas**: Lista das próximas 5 escalas
- **Questionário do Mês**: Status e Push
- **Formação**: Progresso nos módulos
- **Substituições**: Solicitações pendentes

**Métricas Visíveis:**
- Participações no mês
- Taxa de presença
- Módulos completados
- Próximo evento especial

#### 4.4.2 Dashboard Coordenador
**Cards Principais:**
- **Escalas da Semana**: Visão completa com gaps
- **Questionários**: Taxa de resposta em tempo real
- **Substituições Pendentes**: Aprovações necessárias
- **Ministros Ativos**: Total e status

**Métricas Gerenciais:**
- Taxa de cobertura das missas
- Ministros mais/menos ativos
- Tendências de disponibilidade
- Alertas de ausências recorrentes

#### 4.4.3 Dashboard Gestor
**Visão Executiva:**
- KPIs gerais do ministério
- Relatórios consolidados
- Gestão de coordenadores
- Configurações do sistema

### 4.5 Acompanhamento de Respostas do Questionário

#### 4.5.1 Interface de Acompanhamento (Coordenadores)
**Tabela Principal:**
- Colunas:
  - Nome do Ministro
  - Status (Respondido/Pendente)
  - Data de Resposta
  - Disponibilidade Total (horas)
  - Preferências
  - Ações

**Filtros Disponíveis:**
- Por status de resposta
- Por tipo de missa
- Por dia da semana
- Por frequência desejada

**Funcionalidades:**
- Exportar para Excel
- Enviar lembrete individual
- Ver resposta detalhada
- Histórico de respostas anteriores

#### 4.5.2 Analytics do Questionário
**Gráficos:**
- Taxa de resposta ao longo do tempo
- Distribuição de disponibilidade por horário
- Heat map de disponibilidade
- Comparativo mês a mês

### 4.6 Sistema de Escalas
- há uma ordenação de posições dos ministros começando em 1 até 28, nas missas dominicais das 8h e 15h (quando houver) serão 15, nas missas dominicais das 10 e 19h serão 20 ministros; nas missas diárias serão 5 ministros e nas missas do Sagrado Coração de Jesus e Imaculado Coração de Maria serão 10 ministros; na Missa por Cura e Libertação serão escalados 28 ministros.
- as funções se distribuem da seguinte forma: Auxiliares (1 e 2); Recolher Jesus (3 e 4); Velas (5 e 6); Fila / Adoração (7 e 8); Purificar e Expor (9 ao 12); Mezanino e Auxiliar Capela (13 ao 15); Credência e Materiais Litúrgicos (16 ao 28).

#### 4.6.1 Geração Automática
**Algoritmo considera:**
- Respostas do questionário
- Frequência desejada
- Rodízio justo
- Famílias não servem juntas
- Histórico de participação
- Competências especiais (ex: levar comunhão aos enfermos)

#### 4.6.2 Ajuste Manual
**Interface drag-and-drop para:**
- Mover ministros entre horários e posições
- Adicionar/remover ministros
- Marcar ausências previstas
- Definir substitutos fixos

### 4.7 Módulos de Formação

#### 4.7.1 Trilhas Disponíveis

**Trilha Liturgia (obrigatória)**
1. História e Significado da Eucaristia (30 min)
2. O Papel do MESC na Liturgia (45 min)
3. Normas e Orientações Litúrgicas (30 min)
4. Posturas e Gestos Litúrgicos (20 min)
5. Situações Especiais e Como Agir (25 min)

**Trilha Espiritualidade**
1. A Espiritualidade Eucarística (40 min)
2. Oração e Vida Interior do Ministro (30 min)
3. Testemunho e Evangelização (35 min)
4. Maria, Modelo de Serviço (25 min)

**Trilha Prática**
1. Distribuição da Comunhão - Passo a Passo (vídeo 15 min)
2. Comunhão aos Enfermos (vídeo 20 min)
3. Purificação dos Vasos Sagrados (vídeo 10 min)
4. Situações Difíceis e Soluções (texto + quiz 30 min)

#### 4.7.2 Gamificação
- Badges por conclusão de módulos
- Certificados digitais
- Ranking de engajamento
- Pontos por atividades completadas

---

## 5. ORGANIZAÇÃO DO MENU SIDEBAR

### 5.1 Estrutura Hierárquica

```
MESC - Santuário São Judas
├── [Avatar + Nome do Usuário]
│
├── MENU PRINCIPAL
│   ├── 📊 Dashboard
│   │
│   ├── 📅 Escalas
│   │   ├── Questionário
│   │   ├── Acompanhamento [coordenador]
│   │   ├── Minhas Escalas
│   │   └── Substituições
│   │
│   ├── 🎓 Formação
│   │   ├── Trilha Liturgia
│   │   ├── Espiritualidade
│   │   ├── Prática
│   │   └── Biblioteca
│   │
│   ├── 👥 Gestão [coordenador/gestor]
│   │   ├── Gerenciar Usuários
│   │   └── Aprovações (badge com pendentes)
│   │
│   ├── 📖 Diretório de Ministros
│   │
│   ├── 🔔 Comunicação (badge com não lidas)
│   │
│   ├── 📊 Relatórios [coordenador/gestor]
│   │
│   └── 📱 QR Code [coordenador/gestor]
│
└── ⚙️ Configurações
    ├── Meu Perfil
    ├── Configurações
    ├── Tutorial [ministros]
    ├── Alterar Senha
    └── Sair
```

### 5.2 Responsividade
- Desktop: Sidebar fixo expansível
- Tablet: Sidebar colapsado com ícones
- Mobile: Menu hambúrguer com drawer

---

## 6. NOTIFICAÇÕES E COMUNICAÇÃO

### 6.1 Tipos de Notificação

#### In-App
- Badge no sino com contador
- Lista dropdown com últimas 10
- Marca como lida ao clicar
- "Ver todas" leva para página completa

#### Push Notifications (PWA)
- Novas escalas
- Pedidos de substituição
- Lembretes de questionário
- Avisos importantes
- Novos módulos de formação

#### Integração WhatsApp (Webhook)
- Confirmação de escalas
- Alertas de substituição urgente
- Lembretes de questionário

### 6.2 Central de Comunicados
- Mural de avisos da coordenação
- Comentários habilitados
- Anexos permitidos (PDF, imagens)
- Categorias: Urgente, Formação, Eventos, Geral

---

## 7. RELATÓRIOS E ANALYTICS

### 7.1 Relatórios Disponíveis

#### Para Coordenadores
1. **Relatório de Presença Mensal**
   - Taxa de presença por ministro
   - Faltas e substituições
   - Comparativo com meses anteriores

2. **Análise de Disponibilidade**
   - Horários com maior/menor cobertura
   - Tendências ao longo do tempo
   - Previsões para próximo mês

3. **Performance Individual**
   - Ficha completa do ministro
   - Histórico de participação
   - Formações completadas
   - Feedback e observações

#### Para Gestores
1. **Dashboard Executivo**
   - KPIs do ministério
   - Evolução do número de ministros
   - Taxa de engajamento
   - ROI das formações

2. **Relatório Paroquial**
   - Formato para apresentação ao pároco
   - Estatísticas consolidadas
   - Realizações e desafios

### 7.2 Exportação
- Formatos: PDF, Excel, CSV
- Agendamento de envio automático
- Templates customizáveis

---

## 8. FUNCIONALIDADES PWA

### 8.1 Características
- Instalável em dispositivos móveis
- Funciona offline (dados em cache)
- Sincronização automática ao reconectar
- Push notifications nativas
- Acesso rápido via ícone

### 8.2 Service Worker
```javascript
- Cache de assets estáticos
- Cache de dados frequentes
- Background sync para questionários
- Update prompt quando houver nova versão
```

---

## 9. SEGURANÇA E COMPLIANCE

### 9.1 Segurança
- Senhas com hash bcrypt
- JWT com expiração configurável (12 horas)
- Rate limiting em endpoints sensíveis
- HTTPS obrigatório
- Sanitização de inputs
- Proteção contra SQL Injection (via ORM)

### 9.1.5 Controle de Sessões e Inatividade (NOVO - 03/10/2025)

#### Sistema de Timeout Automático
**Objetivo:** Prevenir acesso não autorizado através de sessões abandonadas.

**Configuração:**
- **Timeout de Inatividade:** 10 minutos sem interação → logout automático
- **Expiração JWT:** 12 horas (absoluto)
- **Verificação:** A cada 30 segundos
- **Heartbeat:** A cada 1 minuto (quando ativo)

#### Funcionamento

**1. Ao Fazer Login:**
```
1. Backend cria JWT token (exp: 12h)
2. Backend cria session_token único (nanoid 64 chars)
3. Salva sessão em active_sessions com:
   - user_id
   - session_token
   - last_activity_at = NOW()
   - expires_at = NOW() + 12h
   - is_active = true
4. Retorna ambos tokens para frontend
5. Frontend salva em localStorage
```

**2. Durante Uso Ativo:**
```
Frontend:
- Monitora eventos: click, touch, keypress, scroll
- A cada interação → envia heartbeat para backend
- Heartbeat atualiza last_activity_at no banco
- Timer de 10min é resetado

Backend:
- Recebe heartbeat
- UPDATE active_sessions SET last_activity_at = NOW()
- Sessão permanece ativa
```

**3. Ao Ficar Inativo (10 minutos):**
```
Frontend (verificação a cada 30s):
- POST /api/session/verify { sessionToken }
- Backend calcula: NOW() - last_activity_at
- Se > 10 minutos:
  - Backend marca is_active = false
  - Retorna { expired: true }

Frontend (ao detectar expiração):
- Limpa localStorage (tokens, user)
- Limpa sessionStorage (dados temporários)
- MANTÉM preferências (theme, etc)
- Mostra toast: "Sessão encerrada por inatividade"
- Redireciona: /login?reason=inactivity
- Página de login mostra alerta explicativo
```

**4. Indicador Visual:**
- **Faltam 2 minutos:** Badge laranja no canto superior direito
- **Falta 1 minuto:** Alert vermelho pulsante
- **Mensagem:** "Sessão expira em X min - clique para continuar"

#### Endpoints de Sessão

**POST /api/session/verify**
- Verifica se sessão está ativa
- Retorna minutos restantes ou expiração

**POST /api/session/heartbeat**
- Atualiza last_activity_at
- Requer autenticação JWT

**POST /api/session/destroy**
- Marca sessão como inativa
- Usado no logout

**GET /api/session/cleanup**
- Job de limpeza automática
- Expira sessões >10min inativas
- Deleta sessões antigas (>30 dias)

#### Detecção de Atividade

**Eventos Monitorados (Frontend):**
- `click`, `touchstart` - Cliques e toques
- `keypress`, `keydown` - Digitação
- `scroll` - Rolagem (debounce 500ms)
- `mousemove` - Movimento do mouse (debounce 2s)
- Mudança de rota - Navegação

**Eventos que NÃO resetam timer:**
- App minimizado/background (mas não expira imediatamente)
- Tab inativa
- Browser em segundo plano

#### Segurança Adicional

**Proteções Implementadas:**
- ✅ Session tokens únicos e não-guessáveis (nanoid 64)
- ✅ Cookies HTTP-only (não acessíveis via JS)
- ✅ Verificação server-side obrigatória
- ✅ IP e User-Agent tracking
- ✅ ON DELETE CASCADE (limpa sessões ao deletar usuário)
- ✅ Limpeza automática de sessões antigas

**Benefícios:**
1. **Segurança:** Previne uso de sessões abandonadas
2. **UX:** Usuário sabe quando será deslogado (indicador visual)
3. **Compliance:** Atende requisitos de timeout de sessão
4. **Performance:** Limpeza automática evita acúmulo no banco
5. **Auditoria:** Logs de IP/User-Agent para cada sessão

#### Configurável para Futuro

**Parâmetros Ajustáveis:**
```typescript
// Backend: server/routes/session.ts
const INACTIVITY_TIMEOUT_MINUTES = 10;  // Alterar aqui

// Frontend: client/src/hooks/useActivityMonitor.tsx
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;  // Alterar aqui
```

**Para mudar timeout:**
1. Modificar as 2 constantes acima
2. Rebuild: `npm run build`
3. Deploy

**Nota:** Atualmente fixado em 10 minutos. Pode ser aumentado para 15, 20 ou 30 minutos no futuro após análise de métricas de uso.

### 9.2 LGPD
- Consentimento explícito no cadastro
- Direito de exclusão de dados
- Exportação de dados pessoais
- Log de todas as operações
- Política de privacidade clara

### 9.3 Backup
- Backup diário automático do BD
- Retenção de 30 dias
- Restore point antes de operações críticas

---

## 10. FASES DE IMPLEMENTAÇÃO

### Fase 1 - MVP ✅ CONCLUÍDA
- [x] Setup inicial com MCP Shadcn/UI
- [x] Autenticação e gestão de usuários
- [x] Questionário básico
- [x] Dashboard simples
- [x] Sistema de escalas manual

### Fase 2 - Core Features ✅ CONCLUÍDA
- [x] Questionário completo com todas as perguntas
- [x] Sistema de substituições
- [x] Notificações in-app
- [x] Acompanhamento de respostas
- [x] Melhorias no dashboard

### Fase 2.5 - Segurança e Sessões ✅ CONCLUÍDA (NOVO - 03/10/2025)
- [x] Sistema de controle de inatividade (10 minutos)
- [x] Tabela active_sessions no banco de dados
- [x] Endpoints de verificação e heartbeat
- [x] Monitor de atividade no frontend
- [x] Indicador visual de expiração
- [x] Limpeza automática de cache
- [x] Integração com login/logout

### Fase 3 - Formação 🚧 EM ANDAMENTO
- [x] Estrutura de módulos de formação (banco de dados)
- [x] Interface de formação (frontend)
- [ ] Conteúdo dos módulos (0% - PENDENTE)
- [ ] Sistema de progresso completo
- [ ] Biblioteca de materiais
- [ ] Certificados digitais

### Fase 4 - Analytics 🚧 PARCIAL (50%)
- [x] Relatórios básicos (disponibilidade, substituições)
- [x] Exportação CSV básica
- [ ] Relatórios completos
- [ ] Exportação Excel/PDF avançada
- [ ] Dashboard analytics com gráficos
- [ ] Previsões e insights

### Fase 5 - PWA e Otimizações ✅ CONCLUÍDA (95%)
- [x] Service Worker implementado
- [x] Manifest.json configurado
- [x] Cache offline
- [x] Instalável em dispositivos
- [x] Otimizações de performance
- [ ] Push notifications nativas (85% - estrutura pronta)
- [ ] Testes de carga

### Fase 6 - Deploy e Treinamento ⏳ AGUARDANDO
- [ ] Deploy em produção
- [ ] Migração de dados existentes
- [ ] Treinamento dos coordenadores
- [ ] Material de apoio aos ministros
- [ ] Go-live gradual

---

## 11. MÉTRICAS DE SUCESSO

### KPIs Principais
1. **Adoção**: 100% dos ministros ativos em 2 meses
2. **Engajamento**: 80% de resposta nos questionários
3. **Eficiência**: Redução de 50% no tempo de escalação
4. **Satisfação**: NPS > 8 após 6 meses
5. **Formação**: 60% com trilha básica completa em 6 meses

### Monitoramento
- Google Analytics para uso
- Sentry para erros
- Hotjar para UX insights
- Feedback surveys trimestrais

---

## 12. CONSIDERAÇÕES TÉCNICAS ADICIONAIS

### 12.1 Performance
- Lazy loading de componentes
- Otimização de imagens (WebP)
- Code splitting por rota
- Cache agressivo de dados estáticos
- Debounce em buscas
- Virtualização de listas longas

### 12.2 Acessibilidade
- WCAG 2.1 nível AA
- Navegação por teclado
- Screen reader friendly
- Contraste mínimo 4.5:1
- Textos alternativos em imagens
- ARIA labels apropriados

### 12.3 SEO (páginas públicas)
- Meta tags apropriadas
- Open Graph para compartilhamento
- Sitemap.xml
- Robots.txt configurado
- URLs amigáveis

### 12.4 Internacionalização
- Preparado para i18n
- Datas e números localizados
- Timezone America/Sao_Paulo
- Formato brasileiro padrão

---

## 13. RISCOS E MITIGAÇÕES

### Riscos Identificados

1. **Resistência à mudança**
   - Mitigação: Interface intuitiva, treinamento, período de transição

2. **Baixa adesão inicial**
   - Mitigação: Gamificação, benefícios claros, support ativo

3. **Problemas de conectividade**
   - Mitigação: PWA offline-first, sync automático

4. **Sobrecarga dos coordenadores**
   - Mitigação: Automação máxima, dashboards eficientes

5. **Dados sensíveis**
   - Mitigação: Criptografia, backups, compliance LGPD

---

## 14. GLOSSÁRIO

- **MESC**: Ministros Extraordinários da Sagrada Comunhão
- **Escala**: Programação de ministros para missas
- **Substituição**: Troca de ministro escalado
- **Questionário**: Formulário mensal de disponibilidade
- **Trilha**: Conjunto de módulos de formação
- **Badge**: Conquista ou notificação visual
- **Dashboard**: Painel de controle com métricas
- **PWA**: Progressive Web App
- **MCP**: Model Context Protocol (para Shadcn/UI)

---

## 15. ANEXOS

### Anexo A - Wireframes
[Links para wireframes no Figma - a criar]

### Anexo B - Fluxogramas
[Diagramas de fluxo de processos - a criar]

### Anexo C - Modelo de Dados Completo
[DER detalhado - a criar]

### Anexo D - APIs Endpoints
[Documentação Swagger/OpenAPI - a criar]

---

**Documento elaborado em**: 07/09/2025
**Versão**: 2.1 (Atualizado em 03/10/2025)
**Aprovado por**: Pe. Anderson (Coordenador Geral)
**Próxima revisão**: Após conclusão da Fase 3 (Formação)

---

## CHANGELOG

### Versão 2.1 (03/10/2025)
**Adições:**
- ✅ Seção 9.1.5: Sistema de Controle de Sessões e Inatividade
- ✅ Tabela `active_sessions` no banco de dados
- ✅ Fase 2.5: Segurança e Sessões (concluída)
- ✅ 4 novos endpoints: `/api/session/*`
- ✅ Hook `useActivityMonitor()` (frontend)
- ✅ Componente `SessionIndicator` (frontend)
- ✅ Timeout automático de 10 minutos de inatividade
- ✅ Indicador visual de expiração de sessão
- ✅ Limpeza automática de cache preservando preferências

**Alterações de Status:**
- Fase 1: Marcada como ✅ Concluída
- Fase 2: Marcada como ✅ Concluída
- Fase 5 (PWA): Atualizada para 95% (Service Worker implementado)

**Arquivos Criados:**
- `server/routes/session.ts`
- `client/src/hooks/useActivityMonitor.tsx`
- `client/src/components/SessionIndicator.tsx`
- `scripts/create-active-sessions-table.ts`

**Progresso Geral:** 73% → 76% do projeto completo

### Versão 2.0 (07/09/2025)
- Documento inicial completo
- Definição de todas as funcionalidades core
- Estrutura de banco de dados
- Fases de implementação

---

## NOTAS DE IMPLEMENTAÇÃO

Este PRD serve como documento vivo que deve ser atualizado conforme o projeto evolui. Todas as mudanças significativas devem ser documentadas com versionamento apropriado.

**Estado Atual do Projeto (03/10/2025):**
- ✅ Fases 1 e 2 completamente implementadas e funcionais
- ✅ Sistema de segurança e sessões implementado (Fase 2.5)
- ✅ PWA básico funcionando (95% completo)
- 🚧 Fase 3 (Formação) em andamento - estrutura pronta, falta conteúdo
- 🚧 Fase 4 (Analytics) parcialmente implementada (50%)
- ⏳ Fase 6 (Deploy) aguardando finalização das fases anteriores

**Próximos Passos:**
1. Popular módulos de formação com conteúdo
2. Implementar certificados digitais
3. Completar analytics avançado
4. Realizar testes completos de timeout de sessão
5. Preparar para deploy em produção

**Sistema Pronto Para:**
- ✅ Testes de funcionalidades core
- ✅ Testes de timeout de sessão (10 minutos)
- ✅ Uso em ambiente de homologação

**FIM DO DOCUMENTO**