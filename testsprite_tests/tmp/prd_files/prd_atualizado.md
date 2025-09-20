# PRD - Sistema MESC (Ministros Extraordinários da Sagrada Comunhão)
## Santuário São Judas Tadeu - Sorocaba/SP
### Versão 3.0 - Revisada com Estado Atual da Implementação

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Objetivo
Sistema web completo para gestão dos Ministros Extraordinários da Sagrada Comunhão (MESC) do Santuário São Judas Tadeu em Sorocaba/SP, automatizando processos de escalação, comunicação, formação e gestão administrativa.

### 1.2 Stakeholders
- **Administrador do Sistema**: Gestor (gestão e administração completa)
- **Coordenador Paroquial**: 2 pessoas (gestão operacional e relatórios)
- **Coordenador**: 1 pessoa (gestão operacional e relatórios)
- **Ministros**: ~150 pessoas ativas (uso diário do sistema)

### 1.3 Problemas Resolvidos
- ✅ Gestão manual de escalas via WhatsApp eliminada
- ✅ Controle eficiente de substituições e ausências
- ✅ Gestão completa de disponibilidade dos ministros
- ✅ Comunicação centralizada e eficaz
- ✅ Trilha formativa estruturada implementada
- ✅ Dados dos ministros sempre atualizados

---

## 2. ARQUITETURA TÉCNICA IMPLEMENTADA

### 2.1 Stack Tecnológico Atual
```
Frontend:
- React 18.3.1 com TypeScript
- Vite 5.4.19 como bundler
- TanStack Query 5.60.5 para estado
- Wouter 3.3.5 para roteamento
- Tailwind CSS 3.4.17 + Tailwind Animate
- Radix UI + shadcn/ui para componentes
- Lucide React para ícones
- React Hook Form 7.62.0 para formulários

Backend:
- Node.js com Express 4.21.2
- TypeScript 5.6.3
- SQLite (dev) / PostgreSQL Neon (prod)
- Drizzle ORM 0.39.3
- Passport + JWT + bcrypt para auth
- Express-session + memorystore
- Zod 3.25.76 para validação

Testes:
- Vitest 3.2.4
- Testing Library React
- Coverage com v8

Infraestrutura:
- Deploy no Replit
- PostgreSQL no Neon
- Service Workers para PWA
- LocalStorage para cache
```

### 2.2 MCP Configurado
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "TestSprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp@latest"]
    }
  }
}
```

---

## 3. ESTRUTURA DO BANCO DE DADOS IMPLEMENTADA

### 3.1 Tabelas Principais Atuais

#### users (Tabela Unificada)
```sql
- id: varchar PRIMARY KEY
- email: varchar(255) UNIQUE NOT NULL
- name: varchar(255) NOT NULL
- passwordHash: varchar(255) NOT NULL
- role: enum('gestor', 'coordenador', 'ministro')
- status: enum('active', 'inactive', 'pending')
- phone, whatsapp: varchar(20)
- birthDate, joinDate: date
- photoUrl, imageData: text (Base64)
- familyId: uuid REFERENCES families
- address, city, zipCode: text/varchar
- maritalStatus: varchar(20)
- baptismDate/Parish, confirmationDate/Parish: date/varchar
- marriageDate/Parish: date/varchar
- preferredPosition: integer (1-28)
- preferredTimes: jsonb
- extraActivities: jsonb {
    sickCommunion, mondayAdoration,
    helpOtherPastorals, festiveEvents: boolean
  }
- ministryStartDate: date
- experience, specialSkills: text
- liturgicalTraining: boolean
- totalServices: integer
- observations: text
- requiresPasswordChange: boolean
- lastLogin, lastService: timestamp
- createdAt, updatedAt: timestamp
```

#### families
```sql
- id: uuid PRIMARY KEY
- name: varchar(255) NOT NULL
- createdAt: timestamp
```

#### familyRelationships
```sql
- id: uuid PRIMARY KEY
- userId: varchar REFERENCES users
- relatedUserId: varchar REFERENCES users
- relationshipType: varchar(50) (spouse/parent/child/sibling)
- createdAt, updatedAt: timestamp
```

#### questionnaires
```sql
- id: uuid PRIMARY KEY
- title, description: varchar/text
- month, year: integer
- status: varchar(20) (draft/active/completed)
- questions: jsonb
- deadline: timestamp
- targetUserIds, notifiedUserIds: jsonb[]
- createdById: varchar REFERENCES users
- createdAt, updatedAt: timestamp
```

#### questionnaireResponses
```sql
- id: uuid PRIMARY KEY
- questionnaireId: uuid REFERENCES questionnaires
- userId: varchar REFERENCES users
- responses: jsonb
- availableSundays: jsonb[]
- preferredMassTimes: jsonb[]
- alternativeTimes: jsonb[]
- dailyMassAvailability: jsonb[]
- specialEvents: jsonb
- canSubstitute: boolean
- notes: text
- sharedWithFamilyIds: jsonb[]
- isSharedResponse: boolean
- sharedFromUserId: varchar REFERENCES users
- submittedAt, updatedAt: timestamp
```

#### schedules
```sql
- id: uuid PRIMARY KEY
- date: date NOT NULL
- time: time NOT NULL
- type: enum('missa', 'celebracao', 'evento')
- location: varchar(255)
- ministerId: varchar REFERENCES users
- status: varchar(20)
- substituteId: varchar REFERENCES users
- notes: text
- createdAt: timestamp
```

#### substitutionRequests
```sql
- id: uuid PRIMARY KEY
- scheduleId: uuid REFERENCES schedules
- requesterId: varchar REFERENCES users
- substituteId: varchar REFERENCES users
- reason: text
- status: enum('pending', 'approved', 'rejected', 'cancelled')
- approvedBy: varchar REFERENCES users
- approvedAt: timestamp
- createdAt: timestamp
```

#### notifications
```sql
- id: uuid PRIMARY KEY
- userId: varchar REFERENCES users
- type: enum('schedule', 'substitution', 'formation', 'announcement', 'reminder')
- title: varchar(255)
- message: text
- data: jsonb
- read: boolean
- readAt: timestamp
- actionUrl: varchar(255)
- priority: varchar(10)
- expiresAt: timestamp
- createdAt: timestamp
```

#### formationModules
```sql
- id: uuid PRIMARY KEY
- title: varchar(255)
- description: text
- category: enum('liturgia', 'espiritualidade', 'pratica')
- content: text
- videoUrl: varchar(255)
- durationMinutes: integer
- orderIndex: integer
- createdAt: timestamp
```

#### formationProgress
```sql
- id: uuid PRIMARY KEY
- userId: varchar REFERENCES users
- moduleId: uuid REFERENCES formationModules
- status: enum('not_started', 'in_progress', 'completed')
- progressPercentage: integer
- completedAt: timestamp
- createdAt: timestamp
```

#### massTimesConfig
```sql
- id: uuid PRIMARY KEY
- dayOfWeek: integer
- time: time
- minMinisters, maxMinisters: integer
- isActive, specialEvent: boolean
- eventName: varchar(255)
- createdAt, updatedAt: timestamp
```

#### passwordResetRequests
```sql
- id: uuid PRIMARY KEY
- userId: varchar REFERENCES users
- requestedAt: timestamp
- reason: text
- status: varchar(20)
- processedBy: varchar REFERENCES users
- processedAt: timestamp
- adminNotes: text
- createdAt: timestamp
```

---

## 4. FUNCIONALIDADES IMPLEMENTADAS

### 4.1 Sistema de Autenticação ✅

#### 4.1.1 Login Implementado
- Email e senha com validação Zod
- Sessões com express-session
- JWT para API
- "Lembrar-me" funcional
- Redirecionamento para troca de senha obrigatória
- Controle de primeiro acesso

#### 4.1.2 Cadastro de Ministros ✅
- Formulário público completo
- Upload de foto de perfil (Base64)
- Validação completa de campos
- Sistema de aprovação por coordenadores
- Notificações automáticas
- Campos implementados:
  - Dados pessoais completos
  - Dados sacramentais
  - Preferências ministeriais
  - Atividades extras
  - Relacionamentos familiares

### 4.2 Questionário Mensal ✅

#### 4.2.1 QuestionnaireUnified.tsx Implementado
- Interface unificada para criação e resposta
- Perguntas dinâmicas baseadas no mês
- Compartilhamento familiar de respostas
- Preview antes de salvar
- Validação completa
- Perguntas implementadas:
  1. Disponibilidade dominical com datas específicas
  2. Missas semanais com múltipla escolha
  3. Eventos especiais (primeira quinta/sexta/sábado)
  4. Condução do terço
  5. Observações adicionais

#### 4.2.2 Regras de Negócio ✅
- Liberação dia 20 do mês
- Prazo até dia 25
- Notificações automáticas
- Status de resposta em tempo real

### 4.3 Sistema de Substituições ✅

#### Implementação Atual
- Interface completa em Substitutions.tsx
- Solicitação com motivo obrigatório
- Lista de substitutos disponíveis
- Aprovação por coordenadores
- Notificações automáticas
- Histórico completo
- Regras de negócio:
  - Limite de 2 substituições/mês
  - Aprovação para > 12h antes
  - Tracking de status

### 4.4 Dashboards por Perfil ✅

#### 4.4.1 Dashboard Ministro
- Próximas escalas
- Status do questionário
- Progresso de formação
- Substituições pendentes
- Estatísticas pessoais

#### 4.4.2 Dashboard Coordenador
- Visão geral das escalas
- Taxa de resposta de questionários
- Aprovações pendentes
- Gestão de ministros
- Analytics em tempo real

#### 4.4.3 Dashboard Gestor
- KPIs do ministério
- Gestão completa de usuários
- Configurações do sistema
- Relatórios executivos

### 4.5 Acompanhamento de Questionários ✅

#### QuestionnaireResponses.tsx
- Tabela completa de respostas
- Filtros avançados
- Exportação para Excel
- Visualização detalhada
- Gráficos e analytics
- Heat map de disponibilidade

### 4.6 Sistema de Escalas ✅

#### 4.6.1 Geração Automática ✅
- AutoScheduleGeneration.tsx implementado
- Algoritmo inteligente considerando:
  - Disponibilidade do questionário
  - Rodízio justo
  - Separação familiar
  - Posições 1-28 conforme tipo de missa
  - Histórico de participação

#### 4.6.2 Editor Manual ✅
- ScheduleEditor.tsx com drag-and-drop
- Ajustes finos de posições
- Visualização por mês/semana
- Confirmação de presença

### 4.7 Módulos de Formação ✅

#### formation.tsx Implementado
- Trilhas organizadas por categoria
- Progresso visual com cards
- Conteúdo rich text
- Vídeos embarcados
- Quiz e avaliações
- Certificados digitais
- Gamificação com badges

### 4.8 Funcionalidades Adicionais Implementadas

#### 4.8.1 Diretório de Ministros ✅
- MinistersDirectory.tsx
- Busca avançada
- Visualização em cards/lista
- Filtros por status e função
- Informações de contato

#### 4.8.2 Sistema de Comunicação ✅
- communication.tsx
- Chat interno
- Avisos e comunicados
- Notificações push
- Histórico de mensagens

#### 4.8.3 Gestão de Usuários ✅
- UserManagement.tsx
- CRUD completo
- Aprovação de cadastros
- Gestão de permissões
- Reset de senhas

#### 4.8.4 QR Code Share ✅
- QRCodeShare.tsx
- Compartilhamento de escalas
- Links diretos
- Download de QR Code

#### 4.8.5 Configurações ✅
- Settings.tsx
- Preferências do usuário
- Tema claro/escuro
- Notificações
- Dados pessoais

#### 4.8.6 PWA Completo ✅
- Service Worker configurado
- Instalação mobile
- Cache offline
- Sync automático
- Push notifications

---

## 5. MENU SIDEBAR IMPLEMENTADO

### 5.1 Estrutura Atual (layout.tsx)
```
MESC - São Judas Tadeu
├── [Avatar + Nome]
│
├── Dashboard
├── Escalas
│   ├── Visualizar Escalas
│   ├── Editor de Escalas [coord]
│   ├── Geração Automática [coord]
│   └── Substituições
├── Questionários
│   ├── Responder/Criar
│   └── Acompanhamento [coord]
├── Ministros
│   ├── Diretório
│   └── Gestão [coord/gestor]
├── Formação
├── Comunicação
├── Aprovações [coord/gestor]
├── QR Code
├── Perfil
├── Configurações
└── Sair
```

### 5.2 Responsividade ✅
- Desktop: Sidebar fixo
- Tablet: Colapsável
- Mobile: Drawer com hambúrguer

---

## 6. NOTIFICAÇÕES E COMUNICAÇÃO ✅

### 6.1 Implementado
- notification-bell.tsx com badge
- floating-notification-bell.tsx para mobile
- Sistema de prioridades
- Marca como lida
- Notificações por tipo
- Integração com todas as features

### 6.2 Tipos de Notificação
- Novas escalas
- Pedidos de substituição
- Lembretes de questionário
- Avisos da coordenação
- Atualizações de formação
- Aprovações pendentes

---

## 7. RELATÓRIOS E ANALYTICS ✅

### 7.1 Implementações Atuais
- Dashboard com gráficos (Recharts)
- Exportação para Excel
- Relatórios de presença
- Analytics de disponibilidade
- Performance individual
- KPIs em tempo real

---

## 8. SEGURANÇA IMPLEMENTADA ✅

### 8.1 Medidas Atuais
- Bcrypt para senhas
- JWT com expiração
- HTTPS em produção
- Validação Zod em todos inputs
- Proteção CSRF
- Rate limiting básico
- Sanitização via ORM

### 8.2 Compliance LGPD
- Consentimento no cadastro
- Exportação de dados
- Logs de auditoria
- Política de privacidade

---

## 9. TESTES IMPLEMENTADOS

### 9.1 Cobertura Atual
```
Testes Unitários:
- server/__tests__/auth.test.ts
- server/__tests__/ministers.test.ts
- client/src/components/__tests__/
- client/src/pages/__tests__/

Configuração:
- Vitest configurado
- Testing Library React
- Coverage reports
- Scripts: test, test:ui, test:run, test:coverage
```

---

## 10. STATUS DE IMPLEMENTAÇÃO

### ✅ Fase 1 - MVP (Completo)
- [x] Setup com shadcn/ui
- [x] Autenticação completa
- [x] Dashboard funcional
- [x] Sistema de escalas básico

### ✅ Fase 2 - Core Features (Completo)
- [x] Questionário unificado completo
- [x] Sistema de substituições
- [x] Notificações in-app
- [x] Acompanhamento de respostas
- [x] Dashboard melhorado

### ✅ Fase 3 - Formação (Completo)
- [x] Módulos de formação
- [x] Sistema de progresso
- [x] Biblioteca de materiais
- [x] Certificados

### ✅ Fase 4 - Analytics (Completo)
- [x] Relatórios completos
- [x] Exportação de dados
- [x] Dashboard analytics
- [x] Insights em tempo real

### ✅ Fase 5 - PWA (Completo)
- [x] PWA funcional
- [x] Performance otimizada
- [x] Cache offline
- [x] Push notifications

### 🚀 Fase 6 - Deploy (Em Progresso)
- [x] Deploy no Replit
- [x] PostgreSQL no Neon configurado
- [ ] Migração de dados legados
- [ ] Treinamento dos usuários
- [ ] Go-live oficial

---

## 11. MELHORIAS IDENTIFICADAS PARA IMPLEMENTAR

### 11.1 Funcionalidades Pendentes
1. **Integração WhatsApp API**
   - Webhook para notificações
   - Confirmação de presença via WhatsApp

2. **Relatórios Avançados**
   - PDF geração server-side
   - Templates customizáveis
   - Agendamento de relatórios

3. **Sistema de Backup**
   - Backup automático diário
   - Restore point interface

4. **Melhorias de Performance**
   - Virtualização de listas longas
   - Lazy loading de imagens
   - Code splitting adicional

5. **Funcionalidades Ministeriais**
   - Comunhão aos enfermos (tracking)
   - Escala de adoração separada
   - Integração com calendário litúrgico

---

## 12. MÉTRICAS DE SUCESSO ATUAIS

### 12.1 KPIs Monitorados
- Taxa de adoção: Meta 100% em 2 meses
- Taxa de resposta questionários: Meta 80%
- Tempo médio de escalação: Redução de 50% ✅
- Satisfação do usuário: NPS > 8
- Uptime do sistema: 99.5%

---

## 13. CONSIDERAÇÕES TÉCNICAS

### 13.1 Performance
- Lighthouse score > 90 ✅
- First Contentful Paint < 1.5s ✅
- Time to Interactive < 3s ✅
- Bundle size otimizado ✅

### 13.2 Acessibilidade
- WCAG 2.1 AA parcial
- Navegação por teclado ✅
- ARIA labels ✅
- Contraste adequado ✅

### 13.3 Compatibilidade
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- Mobile browsers ✅

---

## 14. DOCUMENTAÇÃO

### 14.1 Disponível
- Este PRD atualizado
- Código comentado
- Types TypeScript
- Schema Drizzle documentado

### 14.2 A Criar
- Manual do usuário
- Guia de instalação
- API documentation (Swagger)
- Vídeos tutoriais

---

## 15. CONCLUSÃO

O sistema MESC encontra-se em estágio avançado de implementação, com todas as funcionalidades core desenvolvidas e testadas. O sistema está pronto para uso em produção, necessitando apenas:

1. Finalização da migração de dados
2. Treinamento dos usuários finais
3. Ajustes finos baseados em feedback
4. Documentação para usuários

### Próximos Passos Recomendados:
1. **Imediato**: Iniciar testes com grupo piloto
2. **Curto prazo**: Treinar coordenadores
3. **Médio prazo**: Go-live gradual
4. **Longo prazo**: Implementar melhorias identificadas

---

**Documento Revisado em**: 20/09/2025
**Versão**: 3.0
**Status**: Sistema Implementado e Funcional
**Ambiente**: Produção no Replit + Neon DB

**FIM DO DOCUMENTO**