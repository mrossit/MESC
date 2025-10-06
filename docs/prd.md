# PRD - Sistema MESC
## Product Requirements Document

**Produto**: Sistema de Gestão de Escalas para Ministros Extraordinários da Sagrada Comunhão
**Versão**: 1.0
**Data**: Outubro 2025
**Status**: Em Desenvolvimento Ativo

---

## 1. Visão do Produto

### 1.1 Problema
Paróquias enfrentam desafios significativos na gestão de escalas de ministros da Eucaristia:
- ⚠️ Processo manual e demorado de criação de escalas mensais
- ⚠️ Dificuldade em gerenciar substituições de última hora
- ⚠️ Falta de visibilidade sobre disponibilidade dos ministros
- ⚠️ Comunicação ineficiente entre coordenadores e ministros
- ⚠️ Ausência de sistema de formação continuada estruturado
- ⚠️ Relatórios manuais e incompletos

### 1.2 Solução
Sistema web completo que automatiza a gestão de escalas através de:
- ✅ **Geração Automática de Escalas** baseada em questionários de disponibilidade
- ✅ **Sistema de Substituições Inteligente** com auto-escalação de suplentes
- ✅ **Plataforma de Formação** com trilhas de aprendizado
- ✅ **Dashboard Centralizado** com visibilidade completa
- ✅ **Notificações Automáticas** para manter todos informados
- ✅ **Relatórios Detalhados** para tomada de decisão

### 1.3 Objetivos de Negócio
1. **Reduzir tempo de gestão** de escalas em 80%
2. **Aumentar taxa de preenchimento** de escalas para 95%+
3. **Melhorar satisfação** dos ministros e coordenadores
4. **Garantir formação contínua** de 100% dos ministros ativos
5. **Eliminar missas sem cobertura** adequada de ministros

### 1.4 Métricas de Sucesso
- Tempo médio de criação de escala mensal: < 15 minutos
- Taxa de resposta a questionários: > 90%
- Tempo médio de resolução de substituição: < 24h
- Ministros com formação em dia: > 80%
- Satisfação dos usuários (NPS): > 8.0

---

## 2. Personas e Stakeholders

### 2.1 Persona Primária: Ministro da Eucaristia
**Nome**: Carlos Silva
**Idade**: 45 anos
**Profissão**: Contador
**Frequência**: Missa dominical

**Objetivos**:
- Visualizar suas escalas facilmente
- Solicitar substituição quando necessário
- Acompanhar formação continuada
- Receber notificações de mudanças

**Frustrações**:
- Não sabe quando está escalado com antecedência
- Difícil encontrar substituto
- Falta de feedback sobre desempenho

**Quote**: _"Gostaria de saber minhas escalas com mais antecedência para organizar meu mês."_

### 2.2 Persona Secundária: Coordenador
**Nome**: Ana Oliveira
**Idade**: 52 anos
**Função**: Coordenadora de Ministros

**Objetivos**:
- Criar escalas mensais rapidamente
- Gerenciar substituições eficientemente
- Monitorar atividade dos ministros
- Garantir formação adequada

**Frustrações**:
- Processo manual muito demorado
- Difícil saber quem está disponível
- Comunicação descentralizada

**Quote**: _"Passo horas todo mês criando escalas manualmente e ainda assim surgem problemas."_

### 2.3 Persona Terciária: Gestor/Admin
**Nome**: Padre João
**Idade**: 58 anos
**Função**: Pároco/Administrador

**Objetivos**:
- Supervisão geral do sistema
- Relatórios de atividade
- Garantir qualidade do serviço litúrgico

**Frustrações**:
- Falta de visibilidade sobre situação geral
- Ausência de dados para decisões

**Quote**: _"Preciso de dados concretos para avaliar se o ministério está funcionando bem."_

---

## 3. Funcionalidades (Features)

### 3.1 Epic 1: Autenticação e Perfis de Usuário

#### FR-1.1: Registro de Usuário
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Ministros podem se registrar no sistema preenchendo formulário com dados básicos.

**Critérios de Aceitação**:
- [ ] Formulário com campos: nome, email, senha, telefone
- [ ] Validação de email único
- [ ] Senha com mínimo de 8 caracteres
- [ ] Usuário criado com status "pending" aguardando aprovação
- [ ] Email de confirmação enviado

**User Story**:
> Como novo ministro, quero me registrar no sistema para começar a usar a plataforma.

#### FR-1.2: Login/Logout
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Usuários autenticados podem fazer login e logout.

**Critérios de Aceitação**:
- [x] Login com email e senha
- [x] JWT token gerado e armazenado em cookie
- [x] Sessão válida por 7 dias (renovável)
- [x] Logout limpa cookie e invalida sessão
- [x] Redirecionamento apropriado pós-login baseado em role

#### FR-1.3: Perfil de Usuário
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Usuários podem visualizar e editar seu perfil.

**Critérios de Aceitação**:
- [x] Visualizar dados pessoais
- [x] Editar: nome, telefone, WhatsApp
- [x] Upload de foto de perfil (max 5MB)
- [x] Foto redimensionada automaticamente
- [x] Dados litúrgicos: data batismo, confirmação, casamento
- [x] Adicionar/remover relacionamentos familiares

### 3.2 Epic 2: Questionários de Disponibilidade

#### FR-2.1: Criar Questionário
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Coordenadores criam questionários mensais de disponibilidade.

**Critérios de Aceitação**:
- [x] Criar para mês/ano específico
- [x] Definir deadline de resposta
- [x] Adicionar instruções personalizadas
- [x] Publicar ou salvar como rascunho
- [x] Notificar ministros quando publicado

#### FR-2.2: Responder Questionário
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Ministros respondem indicando disponibilidade.

**Critérios de Aceitação**:
- [x] Selecionar domingos disponíveis do mês
- [x] Indicar horários preferidos
- [x] Marcar se pode substituir
- [x] Adicionar observações
- [x] Compartilhar resposta com familiares
- [x] Editar resposta antes do deadline

#### FR-2.3: Relatório de Respostas
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Coordenadores visualizam quem respondeu o questionário.

**Critérios de Aceitação**:
- [x] Lista de respondentes
- [x] Taxa de resposta (%)
- [x] Filtrar por status (respondeu/não respondeu)
- [x] Enviar lembrete para não-respondentes

### 3.3 Epic 3: Geração e Gestão de Escalas

#### FR-3.1: Gerar Escala Automática
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Sistema gera escala mensal automaticamente baseado em respostas.

**Critérios de Aceitação**:
- [x] Buscar respostas do questionário do mês
- [x] Distribuir ministros por missa
- [x] Respeitar preferências de horário
- [x] Balancear frequência (lastService)
- [x] Evitar mesma família na mesma missa
- [x] Atingir mínimos por horário de missa
- [x] Preview antes de publicar

**Algoritmo**:
```
Para cada domingo do mês:
  Para cada horário de missa:
    1. Filtrar ministros disponíveis
    2. Priorizar quem preferiu o horário
    3. Ordenar por último serviço (menos recente primeiro)
    4. Distribuir até atingir mínimo
    5. Evitar conflitos familiares
```

#### FR-3.2: Editar Escala Manualmente
**Prioridade**: P1 (High)
**Status**: ⚠️ Parcialmente Implementado

**Descrição**: Coordenadores podem ajustar escala gerada.

**Critérios de Aceitação**:
- [ ] Adicionar ministro em data específica
- [ ] Remover ministro de data específica
- [ ] Trocar posição entre ministros
- [ ] Validar mínimos ao salvar
- [ ] Log de alterações manuais

#### FR-3.3: Publicar Escala
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Coordenadores publicam escala para visualização dos ministros.

**Critérios de Aceitação**:
- [x] Escala visível no dashboard de ministros
- [x] Notificação enviada a todos escalados
- [x] Export para PDF
- [x] Opção de imprimir

#### FR-3.4: Visualizar Escala
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Ministros visualizam suas escalas.

**Critérios de Aceitação**:
- [x] Dashboard mostra próximas escalas
- [x] Visualização mensal (calendário)
- [x] Filtrar por mês/ano
- [x] Destacar escalas próximas (próximos 7 dias)
- [x] Indicar se é coordenador da missa

### 3.4 Epic 4: Sistema de Substituições

#### FR-4.1: Solicitar Substituição
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Ministros escalados solicitam substituição.

**Critérios de Aceitação**:
- [x] Selecionar data/missa
- [x] Opcional: indicar substituto específico
- [x] Informar motivo (opcional)
- [x] Sistema calcula urgência automaticamente
- [x] Validar que usuário está escalado naquela data

#### FR-4.2: 🆕 Auto-Escalação de Suplentes
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado (RECENTE)

**Descrição**: Sistema encontra automaticamente suplente disponível.

**Critérios de Aceitação**:
- [x] Buscar ministros não escalados naquela data
- [x] Filtrar quem respondeu questionário
- [x] Verificar disponibilidade marcada
- [x] Verificar se marcou "pode substituir"
- [x] Priorizar quem preferiu o horário
- [x] Priorizar último serviço mais antigo
- [x] Atribuir automaticamente
- [x] Notificar solicitante com dados do suplente (nome, telefone)
- [x] Aguardar confirmação do suplente

**Lógica**:
```typescript
1. Buscar questionário do mês da missa
2. Buscar escalados naquela data/hora
3. Buscar respostas de NÃO-escalados
4. Filtrar:
   - availableSundays.includes(data)
   - canSubstitute === true
5. Ordenar:
   - preferredMassTimes.includes(horário) → prioridade
   - lastService (mais antigo) → prioridade
6. Selecionar primeiro da lista
7. Atribuir como substituteId
```

#### FR-4.3: Responder Solicitação (Suplente)
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Suplente aceita ou recusa solicitação.

**Critérios de Aceitação**:
- [x] Visualizar detalhes da solicitação
- [x] Aceitar substituição
- [x] Recusar com motivo
- [x] Prazo de 24h para responder
- [x] Após aceite, escala é atualizada automaticamente
- [x] Notificação enviada ao solicitante

#### FR-4.4: Aprovar/Rejeitar (Coordenador)
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Coordenadores aprovam/rejeitam substituições.

**Critérios de Aceitação**:
- [x] Listar substituições pendentes
- [x] Filtrar por urgência
- [x] Aprovar solicitação
- [x] Rejeitar com motivo
- [x] Auto-aprovação se >12h antes da missa

#### FR-4.5: Cancelar Solicitação
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Solicitante cancela substituição antes de aprovação.

**Critérios de Aceitação**:
- [x] Cancelar apenas se status = pending
- [x] Notificar suplente (se houver)
- [x] Reverter escala original

### 3.5 Epic 5: Pendências de Missas

#### FR-5.1: 🆕 Listar Missas com Desfalques
**Prioridade**: P1 (High)
**Status**: ✅ Implementado (RECENTE)

**Descrição**: Coordenadores visualizam missas que não atingiram mínimo.

**Critérios de Aceitação**:
- [x] Listar missas do mês corrente
- [x] Calcular ministros confirmados vs. mínimo
- [x] Considerar substituições aprovadas/pendentes
- [x] Mostrar quantos ministros faltam
- [x] Indicar nível de urgência
- [x] Sugerir ministros disponíveis
- [x] Atualizar em tempo real

**Lógica de Urgência**:
```
dias <= 1 && faltam >= 5 → CRITICAL
dias <= 3 && faltam >= 3 → HIGH
dias <= 7 && faltam >= 2 → MEDIUM
caso contrário → LOW
```

#### FR-5.2: Convidar Ministros
**Prioridade**: P2 (Medium)
**Status**: ⚠️ Parcialmente Implementado

**Descrição**: Coordenadores convidam ministros para missas com desfalque.

**Critérios de Aceitação**:
- [ ] Selecionar ministros da lista de disponíveis
- [ ] Enviar convite individual ou em massa
- [ ] Ministro recebe notificação
- [ ] Ministro aceita/recusa convite
- [ ] Se aceitar, é adicionado à escala

### 3.6 Epic 6: Formação Continuada

#### FR-6.1: Trilhas de Formação
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Sistema oferece trilhas de formação estruturadas.

**Trilhas Disponíveis**:
1. **Liturgia**: Fundamentos litúrgicos
2. **Espiritualidade**: Vida espiritual do ministro
3. **Prática**: Aspectos práticos do ministério

**Critérios de Aceitação**:
- [x] Visualizar trilhas disponíveis
- [x] Acessar módulos de cada trilha
- [x] Visualizar lições de cada módulo
- [x] Conteúdo em markdown com multimídia
- [x] Marcar seção como concluída
- [x] Progresso calculado automaticamente

#### FR-6.2: Progresso de Formação
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Ministros e coordenadores acompanham progresso.

**Critérios de Aceitação**:
- [x] Dashboard mostra % de conclusão por trilha
- [x] Visualizar próximas lições
- [x] Histórico de lições concluídas
- [x] Tempo estimado para conclusão
- [x] Certificado ao completar trilha (futuro)

#### FR-6.3: Gestão de Conteúdo
**Prioridade**: P2 (Medium)
**Status**: ❌ Não Implementado

**Descrição**: Gestores adicionam/editam conteúdo de formação.

**Critérios de Aceitação**:
- [ ] Criar nova trilha
- [ ] Adicionar módulo a trilha
- [ ] Criar lição com editor rich text
- [ ] Upload de vídeos/imagens
- [ ] Ordenar lições
- [ ] Publicar/despublicar conteúdo

### 3.7 Epic 7: Notificações

#### FR-7.1: Central de Notificações
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Sistema centralizado de notificações in-app.

**Critérios de Aceitação**:
- [x] Badge com contador de não-lidas
- [x] Lista de notificações com filtros
- [x] Marcar como lida
- [x] Marcar todas como lidas
- [x] Link direto para contexto (ex: escala, substituição)
- [x] Persistência no database

**Tipos de Notificação**:
- Nova escala publicada
- Solicitação de substituição
- Suplente automático atribuído
- Substituição aprovada/rejeitada
- Lembrete de missa próxima
- Novo questionário disponível

#### FR-7.2: Notificações por Email
**Prioridade**: P2 (Medium)
**Status**: ⚠️ Parcialmente Implementado

**Descrição**: Notificações importantes enviadas por email.

**Critérios de Aceitação**:
- [x] Integração com Nodemailer
- [ ] Templates de email profissionais
- [ ] Preferências de notificação por usuário
- [ ] Unsubscribe link
- [ ] Rate limiting (não spammar)

#### FR-7.3: Notificações Push (PWA)
**Prioridade**: P3 (Low)
**Status**: ❌ Não Implementado

**Descrição**: Push notifications via PWA.

**Critérios de Aceitação**:
- [ ] Service worker configurado
- [ ] Permissão de notificações
- [ ] Notificações push funcionais
- [ ] Funciona offline

### 3.8 Epic 8: Relatórios e Analytics

#### FR-8.1: Estatísticas do Dashboard
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Dashboard com KPIs principais.

**Métricas Exibidas**:
- Total de ministros ativos
- Escalas do mês
- Taxa de substituições
- Questionários respondidos
- Pendências abertas

**Critérios de Aceitação**:
- [x] Cards com números atualizados
- [x] Gráficos visuais (futuro)
- [x] Comparação mês anterior
- [x] Drilldown para detalhes

#### FR-8.2: Relatório de Presença
**Prioridade**: P2 (Medium)
**Status**: ⚠️ Parcialmente Implementado

**Descrição**: Relatório de presença por ministro.

**Critérios de Aceitação**:
- [ ] Listar todas escalas por ministro
- [ ] Indicar presença/ausência
- [ ] Filtrar por período
- [ ] Export para PDF/Excel
- [ ] Taxa de presença (%)

#### FR-8.3: Análise de Disponibilidade
**Prioridade**: P2 (Medium)
**Status**: ❌ Não Implementado

**Descrição**: Análise de padrões de disponibilidade.

**Critérios de Aceitação**:
- [ ] Horários com mais/menos disponibilidade
- [ ] Ministros mais/menos disponíveis
- [ ] Tendências ao longo do tempo
- [ ] Recomendações automáticas

### 3.9 Epic 9: Administração do Sistema

#### FR-9.1: Gestão de Usuários
**Prioridade**: P0 (Critical)
**Status**: ✅ Implementado

**Descrição**: Gestores gerenciam cadastro de usuários.

**Critérios de Aceitação**:
- [x] Listar todos usuários
- [x] Aprovar/rejeitar cadastros pendentes
- [x] Alterar role (ministro/coordenador/gestor)
- [x] Ativar/inativar usuário
- [x] Deletar usuário (com validações)
- [x] Verificar histórico antes de deletar
- [x] Impedir deletar último gestor

#### FR-9.2: Configurações de Horários de Missa
**Prioridade**: P1 (High)
**Status**: ✅ Implementado

**Descrição**: Gestores configuram horários e mínimos.

**Critérios de Aceitação**:
- [x] CRUD de horários de missa
- [x] Definir mínimo de ministros por horário
- [x] Definir local (Matriz, São Judas, etc)
- [x] Ativar/desativar horários

#### FR-9.3: Logs de Atividade
**Prioridade**: P2 (Medium)
**Status**: ⚠️ Parcialmente Implementado

**Descrição**: Sistema registra ações importantes.

**Critérios de Aceitação**:
- [ ] Log de login/logout
- [ ] Log de alterações em escalas
- [ ] Log de aprovações/rejeições
- [ ] Log de alterações de configuração
- [ ] Visualizar logs com filtros
- [ ] Export de logs

---

## 4. Requisitos Não-Funcionais (NFRs)

### NFR-1: Performance
- ✅ Página inicial carrega em < 2 segundos
- ✅ Queries de database < 200ms (95th percentile)
- ⚠️ Support 100 usuários concorrentes (não testado em produção)
- ✅ Frontend bundle < 500KB (gzipped)

### NFR-2: Segurança
- ✅ HTTPS obrigatório em produção
- ✅ Passwords com bcrypt (10 salt rounds)
- ✅ JWT tokens com expiração
- ✅ HTTP-only cookies
- ✅ Helmet.js security headers
- ✅ Input validation com Zod
- ⚠️ Rate limiting (futuro)
- ⚠️ CSRF protection (futuro)

### NFR-3: Usabilidade
- ✅ Interface responsiva (mobile-first)
- ✅ Acessibilidade WCAG 2.1 AA (parcial)
- ✅ Mensagens de erro claras
- ✅ Loading states em operações assíncronas
- ✅ Confirmação antes de ações destrutivas

### NFR-4: Disponibilidade
- ⚠️ Uptime de 99% (target, não medido)
- ❌ Backup automático diário (não implementado)
- ❌ Disaster recovery plan (não implementado)
- ✅ Error logging estruturado

### NFR-5: Manutenibilidade
- ✅ Código TypeScript type-safe
- ✅ Documentação inline (comentários)
- ✅ Estrutura modular
- ✅ Git commit messages descritivos
- ⚠️ Testes automatizados (0% coverage - futuro)

### NFR-6: Escalabilidade
- ✅ Database indexes em queries críticas
- ✅ Pagination em listas grandes
- ⚠️ Caching (TanStack Query no frontend, backend futuro)
- ❌ CDN para assets (futuro)
- ❌ Load balancing (não necessário ainda)

---

## 5. Dependências Externas

### 5.1 APIs/Services
- **Neon Database**: PostgreSQL serverless (hosting DB)
- **Mailgun**: Envio de emails transacionais
- **Replit**: Hosting da aplicação

### 5.2 Bibliotecas Críticas
- React 18, Express 4, Drizzle ORM
- TanStack Query, React Hook Form
- Radix UI, Tailwind CSS
- Veja [Tech Stack](./architecture/tech-stack.md) completo

---

## 6. Restrições e Limitações

### 6.1 Técnicas
- **Monolito**: Dificulta escalabilidade horizontal
- **PostgreSQL**: Limite de conexões simultâneas
- **Replit**: Recursos limitados de CPU/RAM
- **Single-tenant**: Sistema para uma paróquia apenas (por agora)

### 6.2 Regulatórias
- **LGPD**: Dados pessoais de usuários (implementação parcial)
- **Igreja Católica**: Regras litúrgicas devem ser respeitadas

### 6.3 Negócio
- **Orçamento**: Limitado (Replit + Neon free tier)
- **Time**: 1 desenvolvedor (+ Claude AI)
- **Prazo**: MVP em 3 meses

---

## 7. Roadmap de Releases

### v1.0 (MVP) - ✅ Concluído
- ✅ Autenticação e perfis
- ✅ Questionários de disponibilidade
- ✅ Geração automática de escalas
- ✅ Sistema de substituições
- ✅ Dashboard básico

### v1.1 (Current) - 🚧 Em Progresso
- ✅ Auto-escalação de suplentes
- ✅ Pendências de missas
- ✅ Formação continuada
- ⚠️ Notificações melhoradas
- ⚠️ Relatórios expandidos

### v1.2 (Next) - 📅 Planejado
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Export de relatórios (PDF/Excel)
- [ ] Integração WhatsApp
- [ ] Testes automatizados

### v2.0 (Future) - 💡 Ideação
- [ ] Mobile app nativo
- [ ] Multi-tenancy (múltiplas paróquias)
- [ ] AI/ML para predições
- [ ] Gamification avançada

---

## 8. Riscos e Mitigações

### Risco 1: Baixa adoção pelos ministros
**Probabilidade**: Média
**Impacto**: Alto
**Mitigação**:
- Treinamento presencial
- Suporte dedicado
- Interface intuitiva
- Onboarding guiado

### Risco 2: Falha no algoritmo de distribuição
**Probabilidade**: Baixa
**Impacto**: Alto
**Mitigação**:
- Testes extensivos
- Edição manual sempre disponível
- Logs detalhados
- Rollback fácil

### Risco 3: Problemas de performance com escala
**Probabilidade**: Média
**Impacto**: Médio
**Mitigação**:
- Monitoring ativo
- Database optimization
- Caching estratégico
- Upgrade de plano se necessário

### Risco 4: Perda de dados
**Probabilidade**: Baixa
**Impacto**: Crítico
**Mitigação**:
- Backups automáticos diários (implementar)
- Database replication (Neon feature)
- Export manual periódico

---

## 9. Anexos

### 9.1 Glossário
- **Ministro**: Membro leigo autorizado a distribuir a Eucaristia
- **Escala**: Calendário mensal de designações de ministros
- **Suplente**: Ministro que substitui outro
- **Coordenador**: Responsável por gerenciar ministros
- **Gestor**: Admin do sistema com acesso total

### 9.2 Referências
- [Arquitetura do Sistema](./architecture.md)
- [Tech Stack](./architecture/tech-stack.md)
- [Coding Standards](./architecture/coding-standards.md)
- [Source Tree](./architecture/source-tree.md)

---

**Aprovações**:
- [ ] Product Owner
- [ ] Stakeholders (Pároco)
- [ ] Technical Lead

**Próxima Revisão**: Dezembro 2025
