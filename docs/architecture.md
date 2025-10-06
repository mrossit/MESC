# Arquitetura do Sistema - MESC
## Sistema de Gestão de Escalas para Ministros Extraordinários da Sagrada Comunhão

---

## 1. Visão Geral

### 1.1 Propósito do Sistema
O Sistema MESC (Ministros Extraordinários da Sagrada Comunhão) é uma plataforma web completa para gestão de escalas de ministros da Eucaristia em paróquias. O sistema automatiza o processo de criação de escalas mensais, gerencia substituições, oferece formação continuada e fornece relatórios detalhados.

### 1.2 Objetivos Principais
- ✅ **Automatizar geração de escalas** baseada em disponibilidade dos ministros
- ✅ **Facilitar substituições** com sistema de solicitação e auto-escalação
- ✅ **Oferecer formação contínua** através de trilhas de aprendizado
- ✅ **Fornecer transparência** com relatórios e dashboards
- ✅ **Melhorar comunicação** entre coordenadores e ministros

### 1.3 Stakeholders
- **Ministros**: Visualizam suas escalas, solicitam substituições, acessam formação
- **Coordenadores**: Gerenciam escalas, aprovam substituições, monitoram atividade
- **Gestores**: Controle total do sistema, gerenciam usuários e configurações
- **Pároco/Admin**: Supervisão geral e aprovações finais

---

## 2. Arquitetura de Alto Nível

### 2.1 Estilo Arquitetural
**Monolito Modular Full-Stack** com separação clara entre:
- Frontend React (SPA - Single Page Application)
- Backend Express (RESTful API)
- Database PostgreSQL (Relacional)

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIOS                             │
│              (Navegador Web)                            │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│              FRONTEND (React SPA)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Dashboard  │  │ Substitui-  │  │  Formação   │    │
│  │             │  │    ções     │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Escalas   │  │  Relatórios │  │   Perfil    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                          │
│         TanStack Query (Cache & State Management)       │
└────────────────────┬────────────────────────────────────┘
                     │ REST API (JSON)
                     │ JWT Authentication
┌────────────────────▼────────────────────────────────────┐
│            BACKEND (Express.js API)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Authentication Middleware                 │  │
│  │              (JWT + Cookies)                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │ Auth    │  │Schedule │  │Substit. │  │ Users   │  │
│  │ Routes  │  │ Routes  │  │ Routes  │  │ Routes  │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │Question │  │Formation│  │ Reports │  │Notific. │  │
│  │ Routes  │  │ Routes  │  │ Routes  │  │ Routes  │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Drizzle ORM (Data Access Layer)         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ SQL Queries
┌────────────────────▼────────────────────────────────────┐
│              DATABASE (PostgreSQL)                       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │
│  │ users  │  │schedule│  │substit.│  │question│       │
│  │        │  │        │  │requests│  │  naires│       │
│  └────────┘  └────────┘  └────────┘  └────────┘       │
│  ┌────────┐  ┌────────┐  ┌────────┐                   │
│  │mass_   │  │formation│  │activity│                   │
│  │times   │  │        │  │  logs  │                   │
│  └────────┘  └────────┘  └────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Padrões Arquiteturais

#### **Frontend**
- **Component-Based Architecture** (React)
- **Container/Presentational Pattern**
- **Custom Hooks** para lógica reutilizável
- **Client-Side Caching** (TanStack Query)

#### **Backend**
- **Layered Architecture**:
  - **Routes Layer**: Handlers HTTP
  - **Business Logic**: Regras de negócio
  - **Data Access**: Drizzle ORM
- **Middleware Pipeline**: Auth, logging, error handling
- **Repository Pattern** (via storage.ts)

---

## 3. Módulos Principais

### 3.1 Autenticação e Autorização

**Tecnologia**: JWT (JSON Web Tokens) + Cookies HTTP-Only

**Fluxo de Autenticação**:
1. Usuário envia credenciais → `POST /api/auth/login`
2. Backend valida contra database (bcrypt)
3. Se válido, gera JWT token
4. Token armazenado em cookie HTTP-only
5. Requests subsequentes enviam cookie automaticamente
6. Middleware `authenticateToken` valida JWT

**Roles**:
- `ministro`: Acesso básico (escalas, formação, perfil)
- `coordenador`: + Gerenciar escalas e substituições
- `gestor`: + Gerenciar usuários e sistema completo

**Implementação**:
```
server/auth.ts         - JWT generation/validation
server/authRoutes.ts   - Login/Register/Logout endpoints
Middleware: authenticateToken, requireRole
```

### 3.2 Gestão de Usuários

**Entidades**: Users, Family Relationships

**Funcionalidades**:
- CRUD de usuários
- Upload de foto de perfil (Multer + Sharp)
- Gestão de relacionamentos familiares
- Controle de status (active/inactive/pending)
- Verificação de atividade ministerial antes de deletar

**Regras de Negócio**:
- Pelo menos 1 gestor ativo sempre
- Coordenador não pode deletar gestor
- Usuário não pode alterar próprio status/role
- Soft delete (inativação) para usuários com histórico

**Endpoints**: `/api/users/*`, `/api/profile/*`

### 3.3 Questionários de Disponibilidade

**Propósito**: Coletar disponibilidade mensal dos ministros para geração inteligente de escalas.

**Fluxo**:
1. Coordenador cria questionário para o mês
2. Publica questionário
3. Ministros respondem indicando:
   - Domingos disponíveis
   - Horários preferidos
   - Se pode substituir
   - Observações
4. Sistema usa respostas para gerar escala automática

**Compartilhamento Familiar**:
- Membros de mesma família podem compartilhar respostas
- Evita duplicação de dados
- Facilita coordenação familiar

**Schema**:
```typescript
questionnaireResponses {
  availableSundays: string[]       // ["2025-10-05", "2025-10-12"]
  preferredMassTimes: string[]     // ["08:00:00", "10:00:00"]
  canSubstitute: boolean
  sharedWithFamilyIds: string[]
}
```

**Endpoints**: `/api/questionnaires/*`

### 3.4 Geração de Escalas

**Algoritmo de Distribuição**:
1. Busca respostas de questionário do mês
2. Filtra ministros disponíveis por domingo
3. Para cada missa, distribui ministros:
   - Prioriza quem preferiu aquele horário
   - Balanceia frequência (lastService tracking)
   - Respeita mínimos por posição litúrgica
   - Evita escalar mesma família junta

**Posições Litúrgicas**:
```typescript
LITURGICAL_POSITIONS = {
  1: "Ministro Coordenador",
  2: "Equipe 1",
  3: "Equipe 2",
  4: "Equipe 3"
}
```

**Mínimos Configuráveis**:
- Missa 08:00 - 15 ministros
- Missa 10:00 - 20 ministros
- Missa 19:00 - 20 ministros
- Missa São Judas (19:30) - 15 ministros

**Endpoints**: `/api/schedules/generate`

### 3.5 Sistema de Substituições

**Fluxo Tradicional**:
1. Ministro escalado solicita substituição
2. Pode indicar substituto específico (opcional)
3. Coordenador aprova/rejeita
4. Se aprovado, escala é atualizada

**🆕 Auto-Escalação de Suplentes**:
Quando não há substituto indicado:
1. Sistema busca **automaticamente** ministros elegíveis:
   - Não escalados naquela data/hora
   - Responderam questionário do mês
   - Marcaram disponibilidade para aquela data
   - Indicaram que "podem substituir"
2. Prioriza por:
   - Preferência pelo horário
   - Último serviço (distribui melhor)
3. Atribui substituto automaticamente
4. Notifica solicitante com dados do suplente (nome, telefone)
5. Aguarda confirmação do suplente

**Auto-Aprovação**:
- Solicitação >12h antes da missa: auto-aprovada
- <2 substituições no mês (ou coordenador/gestor): auto-aprovada
- Caso contrário: aguarda aprovação coordenador

**Níveis de Urgência**:
- `critical`: <12h até missa
- `high`: <24h até missa
- `medium`: <72h até missa
- `low`: >72h até missa

**Implementação**:
```
server/routes/substitutions.ts
- POST / - Criar solicitação (com auto-escalação)
- PATCH /:id/respond - Suplente aceita/recusa
- DELETE /:id - Cancelar solicitação
```

### 3.6 Pendências de Missas

**Propósito**: Identificar missas que não atingiram número mínimo de ministros.

**Lógica**:
1. Busca escalas do mês corrente
2. Agrupa por data + horário
3. Conta ministros confirmados (considerando substituições)
4. Compara com mínimo necessário
5. Retorna apenas missas com desfalques

**Cálculo de Urgência**:
```typescript
dias <= 1 && faltam >= 5 → critical
dias <= 3 && faltam >= 3 → high
dias <= 7 && faltam >= 2 → medium
caso contrário → low
```

**Sugestões de Suplentes**:
- Lista ministros não escalados naquela data
- Limita a 10 sugestões
- Ordenados por último serviço

**Endpoint**: `GET /api/mass-pendencies`

### 3.7 Formação Continuada

**Estrutura**:
```
Tracks (Trilhas)
  └─ Modules (Módulos)
      └─ Lessons (Aulas)
          └─ Sections (Seções)
```

**Trilhas Disponíveis**:
- **Liturgia**: Fundamentos litúrgicos
- **Espiritualidade**: Vida espiritual do ministro
- **Prática**: Aspectos práticos do ministério

**Progresso do Usuário**:
- Tracking por seção
- Marcação de conclusão
- Cálculo de percentual completo
- Certificados (futuro)

**Gamification** (futuro):
- Badges por trilha completa
- Leaderboard
- Recompensas

**Endpoints**: `/api/formation/*`

### 3.8 Notificações

**Tipos de Notificação**:
- Nova escala publicada
- Solicitação de substituição recebida
- Substituição aprovada/rejeitada
- Suplente automático atribuído
- Lembrete de missa próxima
- Novo questionário disponível

**Canais**:
- **In-app**: Central de notificações no sistema
- **Email**: Nodemailer + Mailgun (configurável)
- **WhatsApp**: (futuro - integração API)

**Implementação**:
```
server/routes/notifications.ts
- POST / - Criar notificação
- GET / - Listar notificações do usuário
- PATCH /:id/read - Marcar como lida
```

### 3.9 Relatórios e Analytics

**Relatórios Disponíveis**:
1. **Estatísticas Gerais**:
   - Total de ministros ativos
   - Total de escalas no mês
   - Taxa de substituições
   - Ministros mais/menos atuantes

2. **Relatório de Presença**:
   - Por ministro
   - Por período
   - Ausências registradas

3. **Análise de Horários**:
   - Distribuição por horário de missa
   - Horários com mais desfalques

4. **Performance de Questionário**:
   - Taxa de resposta
   - Disponibilidade média

**Visualizações**:
- Gráficos (Chart.js - futuro)
- Tabelas filtráveis
- Export para PDF/Excel (futuro)

**Endpoints**: `/api/reports/*`

### 3.10 Dashboard

**Cards Principais**:
- Próximas escalas do usuário
- Substituições pendentes
- Notificações não lidas
- Progresso de formação
- Estatísticas pessoais

**Por Role**:
- **Ministro**: Suas escalas, formação, notificações
- **Coordenador**: + Pendências, aprovações, estatísticas gerais
- **Gestor**: + Gestão de usuários, configurações

**Endpoint**: `GET /api/dashboard/stats`

---

## 4. Modelo de Dados

### 4.1 Entidades Principais

#### **Users**
```typescript
users {
  id: uuid (PK)
  email: string (unique)
  password: string (bcrypt hashed)
  name: string
  role: enum('ministro', 'coordenador', 'gestor')
  status: enum('active', 'inactive', 'pending')
  phone: string?
  whatsapp: string?
  photoUrl: string?
  imageData: text? (base64)
  lastService: date?
  ministryStartDate: date?
  createdAt: timestamp
}
```

#### **Schedules**
```typescript
schedules {
  id: uuid (PK)
  date: date
  time: time
  location: string
  ministerId: uuid (FK → users)
  position: integer (1-4)
  status: enum('scheduled', 'completed', 'cancelled')
  substituteId: uuid? (FK → users)
  createdAt: timestamp
}
```

#### **SubstitutionRequests**
```typescript
substitutionRequests {
  id: uuid (PK)
  scheduleId: uuid (FK → schedules)
  requesterId: uuid (FK → users)
  substituteId: uuid? (FK → users) // Auto-atribuído ou manual
  reason: text?
  status: enum('pending', 'approved', 'rejected', 'cancelled', 'auto_approved')
  urgency: enum('low', 'medium', 'high', 'critical')
  createdAt: timestamp
  respondedAt: timestamp?
}
```

#### **QuestionnaireResponses**
```typescript
questionnaireResponses {
  id: uuid (PK)
  questionnaireId: uuid (FK → questionnaires)
  userId: uuid (FK → users)
  availableSundays: jsonb (string[])
  preferredMassTimes: jsonb (string[])
  canSubstitute: boolean
  sharedWithFamilyIds: jsonb (string[])?
  submittedAt: timestamp
}
```

### 4.2 Relacionamentos

```
users 1──────* schedules (ministerId)
users 1──────* schedules (substituteId)
users 1──────* substitutionRequests (requesterId)
users 1──────* substitutionRequests (substituteId)
users 1──────* questionnaireResponses
users 1──────* familyRelationships (from)
users 1──────* familyRelationships (to)

schedules 1──────* substitutionRequests
questionnaires 1──────* questionnaireResponses
```

### 4.3 Índices

**Performance-Critical Indexes**:
```sql
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_minister ON schedules(ministerId);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_substitutions_schedule ON substitutionRequests(scheduleId);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

---

## 5. Segurança

### 5.1 Autenticação
- **JWT tokens** com expiração configurável
- **HTTP-only cookies** (não acessível via JavaScript)
- **Bcrypt** para hash de senhas (salt rounds: 10)
- **Password reset** via token temporário por email

### 5.2 Autorização
- **Role-based access control (RBAC)**
- **Middleware de verificação** em todas rotas protegidas
- **Validação de ownership** (usuário só acessa próprios dados)

### 5.3 Proteções
- **Helmet.js**: Security headers HTTP
- **CORS**: Configurado para domínio específico
- **SQL Injection**: Prevenido por Drizzle ORM (prepared statements)
- **XSS**: React auto-escaping + sanitização de inputs
- **CSRF**: Tokens em formulários críticos (futuro)
- **Rate Limiting**: (futuro - Express Rate Limit)

### 5.4 Dados Sensíveis
- **Senhas**: Nunca retornadas em responses
- **Tokens JWT**: Armazenados apenas em cookies HTTP-only
- **Env variables**: Credenciais em `.env` (não versionado)
- **HTTPS**: Obrigatório em produção

---

## 6. Performance e Escalabilidade

### 6.1 Frontend
- **Code Splitting**: Lazy loading de rotas
- **TanStack Query**: Cache automático de API responses
- **Debounce**: Inputs de busca
- **Memoization**: Cálculos pesados com `useMemo`
- **Virtual Scrolling**: Listas longas (futuro)

### 6.2 Backend
- **Connection Pooling**: PostgreSQL via Drizzle
- **Selective Queries**: Select apenas campos necessários
- **Pagination**: Limit queries grandes
- **Indexes**: Em colunas frequentemente consultadas
- **Caching**: (futuro - Redis para sessões)

### 6.3 Database
- **Indexes estratégicos**: Queries críticas
- **JSONB**: Campos complexos (arrays, objetos)
- **Partitioning**: (futuro - particionar schedules por ano)

---

## 7. Monitoramento e Logging

### 7.1 Logging Atual
- **Console logs**: Estruturados por módulo
- **Request logging**: Middleware que loga todas requisições
- **Error logging**: Stack traces completos
- **Activity logs**: Ações importantes de usuários

### 7.2 Futuro
- **Winston**: Logger profissional
- **Sentry**: Error tracking
- **Application Performance Monitoring (APM)**
- **Database query logging**

---

## 8. Deploy e DevOps

### 8.1 Ambiente de Desenvolvimento
- **Vite Dev Server**: HMR rápido
- **tsx watch**: Backend auto-reload
- **Drizzle Studio**: GUI para database

### 8.2 Build de Produção
```bash
npm run build
# Compila:
# - Frontend: Vite → dist/client
# - Backend: esbuild → dist/index.js
```

### 8.3 Deploy
- **Platform**: Replit
- **Database**: Neon PostgreSQL (serverless)
- **Process Manager**: Node.js direto (sem PM2 por limitações)
- **Environment**: Variáveis via Replit Secrets

### 8.4 CI/CD (Futuro)
- GitHub Actions
- Automated tests
- Automated migrations
- Blue-green deployments

---

## 9. Decisões Arquiteturais

### 9.1 Por que Monolito?
- **Simplicidade**: Uma codebase, um deploy
- **Performance**: Sem latência entre serviços
- **Development Speed**: Mais rápido para MVP
- **Resource Efficient**: Menos overhead

**Trade-offs**:
- Escalabilidade horizontal limitada
- Acoplamento entre módulos
- Deploy afeta sistema inteiro

### 9.2 Por que PostgreSQL?
- **Relacional**: Dados estruturados com relacionamentos claros
- **ACID**: Garantias de consistência
- **JSONB**: Flexibilidade para campos complexos
- **Mature**: Ecossistema robusto

### 9.3 Por que Drizzle ORM?
- **Type-safe**: Queries validadas em compile-time
- **Performance**: Queries otimizadas, sem overhead
- **Developer Experience**: Autocomplete excelente
- **Migrations**: Schema-first approach

### 9.4 Por que TanStack Query?
- **Automatic caching**: Reduz calls desnecessárias
- **Optimistic updates**: UX responsiva
- **Background refetching**: Dados sempre frescos
- **DevTools**: Debugging fácil

---

## 10. Roadmap Técnico

### 10.1 Curto Prazo (1-3 meses)
- [ ] Testes automatizados (Jest + React Testing Library)
- [ ] Validação de formulários melhorada
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Export de relatórios (PDF/Excel)

### 10.2 Médio Prazo (3-6 meses)
- [ ] Mobile app (React Native)
- [ ] Integração WhatsApp (notificações)
- [ ] Sistema de backup automático
- [ ] Logs centralizados (Winston + ELK)
- [ ] Rate limiting e DDoS protection

### 10.3 Longo Prazo (6-12 meses)
- [ ] Microservices (se necessário)
- [ ] GraphQL API (alternativa a REST)
- [ ] Real-time features (WebSockets)
- [ ] Multi-tenancy (múltiplas paróquias)
- [ ] AI/ML para predição de disponibilidade

---

## 11. Conclusão

O Sistema MESC é uma aplicação full-stack robusta construída com tecnologias modernas, focada em resolver os desafios reais de gestão de escalas de ministros da Eucaristia. A arquitetura prioriza **simplicidade**, **type safety** e **developer experience**, enquanto mantém flexibilidade para evoluções futuras.

Os módulos são bem separados, facilitando manutenção e novas features. O sistema de auto-escalação de suplentes é um diferencial importante que reduz trabalho manual dos coordenadores.

Para detalhes técnicos específicos, consulte:
- [Tech Stack](./architecture/tech-stack.md)
- [Source Tree](./architecture/source-tree.md)
- [Coding Standards](./architecture/coding-standards.md)
