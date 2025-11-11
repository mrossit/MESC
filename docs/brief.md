# Project Brief: MESC - Sistema de Gestão de Escalas para Ministros
**Ministros Extraordinários da Sagrada Comunhão**

**Documento:** Project Brief
**Versão:** 2.0 (Revisão Técnica)
**Data:** 10 de Novembro de 2025
**Status:** Projeto em Produção - Análise de Melhorias
**Tipo:** Projeto Brownfield (Existente)

---

## Executive Summary

O **MESC** (Ministros Extraordinários da Sagrada Comunhão) é uma aplicação web fullstack Progressive Web App (PWA) desenvolvida para a Paróquia São Judas Tadeu, focada na gestão automatizada de escalas de ministros da Eucaristia. O sistema está atualmente **em produção ativa** e atende aproximadamente 100+ ministros e coordenadores.

**Estado Atual:** O sistema possui funcionalidade core operacional, mas enfrenta **50 problemas técnicos identificados** (5 críticos, 15 altos, 22 médios, 8 baixos) que comprometem segurança, estabilidade e escalabilidade.

**Problema Principal:** Apesar da funcionalidade, o sistema apresenta vulnerabilidades de segurança críticas (CSRF desabilitado, riscos de SQL injection), 67 erros TypeScript não resolvidos, problemas de integridade de dados e débito técnico significativo.

**Proposta:** Modernização e correção sistemática do sistema existente através de refatoração técnica, correção de bugs críticos, implementação de testes, e melhoria da arquitetura - mantendo 100% da funcionalidade atual.

**Timeline:** 2-3 semanas para MVP (correções críticas), 4-6 semanas para projeto completo.

**Valor Esperado:**
- Eliminar 100% dos problemas de integridade de dados (race conditions, transações)
- Alcançar 0 erros TypeScript (compilação limpa)
- Eliminar vulnerabilidades de segurança críticas
- Reduzir tempo de manutenção em 60% através de código mais limpo
- Aumentar confiabilidade do sistema para 99.5% uptime
- Preparar base técnica sólida para evolução futura

---

## Problem Statement

### Current State and Pain Points

O MESC enfrenta desafios técnicos em múltiplas camadas:

#### 🔴 **Segurança Crítica (Impacto: ALTO)**
1. **CSRF Protection Completamente Desabilitado** - O middleware existe mas está desativado, expondo o sistema a ataques Cross-Site Request Forgery
2. **SQL Injection em Queries Raw** - Uso de string interpolation em consultas SQL diretas (server/storage.ts:1141-1151)
3. **Webhook WhatsApp Sem Autenticação** - Endpoint público `/api/whatsapp/webhook` aceita requisições de qualquer origem
4. **Tokens JWT em localStorage** - Vulnerável a ataques XSS, deveria usar httpOnly cookies
5. **Validação de Variáveis de Ambiente Ausente** - Aplicação pode crashar em produção se JWT_SECRET não estiver definido

**Impacto Quantificado:** Sistema vulnerável a pelo menos 5 vetores de ataque conhecidos. Em caso de exploração, poderia comprometer dados de 100+ usuários e dados litúrgicos sensíveis.

#### ⚠️ **Integridade de Dados (Impacto: MÉDIO-ALTO)**
1. **Race Conditions em Questionários** - Respostas duplicadas podem ser criadas se requisições simultâneas chegarem
2. **Ausência de Foreign Key Cascades** - Deletar usuários deixa registros órfãos em tabelas relacionadas
3. **Verificação de Deleção Insegura** - Sistema detecta "discrepâncias" entre métodos de verificação de atividade (server/routes.ts:734-917)
4. **Sem Suporte a Transações** - Operações multi-step podem falhar no meio, deixando estado inconsistente
5. **Hard Deletes sem Auditoria** - Dados deletados permanentemente sem possibilidade de recuperação

**Impacto Quantificado:** Média de 3-5 inconsistências de dados por mês reportadas. Risco de perda permanente de dados em caso de erros.

#### 🐛 **Qualidade de Código (Impacto: MÉDIO)**
1. **67 Erros TypeScript Não Resolvidos** - Compilação falha, indicando type safety comprometida
2. **500+ console.log() em Produção** - Logging excessivo pode expor dados sensíveis e degradar performance
3. **50+ TODOs/FIXMEs no Código** - Features incompletas marcadas mas não rastreadas
4. **Código Duplicado** - Lógica de formatação de datas e verificação de disponibilidade repetida em múltiplos lugares
5. **Imports e Variáveis Não Utilizados** - Aumenta tamanho do bundle e dificulta manutenção

**Impacto Quantificado:** Tempo médio de debugging aumentado em 40%. Dificuldade em onboarding de novos desenvolvedores.

#### ⚡ **Performance e Escalabilidade (Impacto: MÉDIO)**
1. **Problema N+1 Queries** - Carregamento de membros da família em loop (server/routes.ts:309-325)
2. **Falta de Índices no Banco** - Queries lentas em foreign keys não indexadas
3. **Processamento Ineficiente** - Reprocessamento de respostas carrega tudo em memória (server/routes/questionnaires.ts:1358-1476)

**Impacto Quantificado:** Tempo de resposta de algumas queries aumenta linearmente com dados. Dashboard pode levar 3-5s para carregar.

### Why Existing Solutions Fall Short

**Estado Atual:** O sistema **funciona** para as operações do dia-a-dia, mas:
- ❌ Não é seguro o suficiente para dados sensíveis (dados pessoais, telefones, disponibilidade)
- ❌ Não é confiável (erros TypeScript podem causar crashes inesperados)
- ❌ Não é sustentável (débito técnico dificulta manutenção e evolução)
- ❌ Não tem testes automatizados (mudanças podem quebrar funcionalidades sem aviso)

**Tentativas Anteriores de Correção:**
- Múltiplos sistemas de fallback foram adicionados (ex: DrizzleSQLiteFallback) ao invés de corrigir problemas raiz
- Logs de debug foram adicionados extensivamente ao invés de implementar logging estruturado
- Código duplicado foi criado ao invés de extrair para utilities

### Urgency and Importance

**POR QUE AGORA?**

1. **Risco de Segurança Crescente** - Sistema em produção com vulnerabilidades conhecidas é um passivo
2. **Conformidade LGPD** - Dados pessoais sem proteção adequada podem gerar penalidades
3. **Escalabilidade Limitada** - Crescimento de usuários vai expor problemas de performance
4. **Manutenibilidade** - Cada bug fix fica mais difícil sem correção do débito técnico
5. **Confiança dos Usuários** - Bugs frequentes reduzem adoção e satisfação

**JANELA DE OPORTUNIDADE:**
- Sistema está funcionalmente completo - ideal para refatoração sem adicionar features
- Equipe disponível para 4-6 semanas de trabalho focado
- Baixa temporada litúrgica (pós-festas) permite updates com menos impacto

---

## Proposed Solution

### Core Concept and Approach

**Abordagem: Refatoração Sistemática em Fases (Prioridade: Integridade → Segurança → Type Safety)**

Não é um rebuild - é uma **modernização técnica incremental acelerada** que mantém 100% da funcionalidade atual enquanto corrige problemas estruturais.

**Princípios Guia:**
1. ✅ **Integridade Primeiro** - Dados corretos são mais críticos que código perfeito
2. ✅ **Não Quebrar Produção** - Cada mudança deve ser deployável independentemente
3. ✅ **Deploy Rápido e Frequente** - Ciclos de 2-3 dias, não semanas
4. ✅ **Testes Práticos** - Focar em testes de código crítico, não 100% cobertura
5. ✅ **Code Review pelo Coordenador** - Validação de funcionalidade antes de deploy

### Key Differentiators from Current State

| Aspecto | Estado Atual | Estado Alvo (Prioridade) |
|---------|--------------|--------------------------|
| **Integridade Dados** 🥇 | Race conditions, hard deletes, sem transações | Transações, UPSERT, constraints, soft deletes |
| **Segurança** 🥈 | CSRF desabilitado, SQL injection risks | CSRF ativo, queries parametrizadas, webhook auth |
| **Type Safety** 🥉 | 67 erros TypeScript, implicit any | 0 erros, strict mode ativado |
| **Performance** | N+1 queries, sem índices | Queries otimizadas, índices adequados |
| **Testes** | Sem testes automatizados | 60%+ cobertura em fluxos críticos |
| **Logging** | 500+ console.log() | Winston logger estruturado |
| **Código** | Duplicação, TODOs espalhados | DRY, utilities compartilhadas |

### High-Level Vision for the Product

**Visão Técnica (2-3 semanas - MVP):**
- Integridade de dados garantida (transações, constraints, UPSERT)
- Segurança básica implementada (CSRF, SQL injection eliminado)
- Compilação TypeScript limpa
- Testes nos fluxos mais críticos (questionários, escalas, auth)
- Performance aceitável (< 3s para operações principais)

**Visão Técnica (4-6 semanas - Completo):**
- Sistema 100% seguro e estável
- Suite de testes cobrindo 60%+ do código crítico
- Performance otimizada (< 2s para todas operações)
- Logging estruturado e monitoring básico
- Código limpo e documentado

**Visão de Produto (mantida do atual):**
- Continuar sendo a ferramenta #1 de gestão de escalas para paróquias
- Manter todas as funcionalidades atuais: geração automática, substituições, formação
- Base técnica sólida para evolução nos próximos 4-6 meses

---

## Target Users

### Primary User Segment: Ministros da Eucaristia

**Perfil Demográfico:**
- Idade: 25-70 anos (média 45)
- Localização: Paróquia São Judas Tadeu e arredores
- Profissões: Variadas (profissionais liberais, comerciantes, aposentados)
- Literacia Digital: Baixa a Média

**Comportamentos Atuais:**
- Acessam sistema mensalmente para preencher questionário de disponibilidade
- Consultam escalas semanalmente
- Solicitam substituições ocasionalmente (2-3x/ano)
- Acessam formação esporadicamente

**Necessidades e Pain Points:**
- ✅ **Funciona Atual:** Visualizar escalas, responder questionários
- ❌ **Pain Point:** Sistema às vezes "trava" ou mostra erros inesperados
- ❌ **Pain Point:** Notificações nem sempre funcionam
- ❌ **Frustração:** Perdem respostas de questionário se não salvam rápido

**Objetivos:**
- Saber suas escalas com antecedência (10-15 dias)
- Preencher questionário rapidamente (< 3 minutos)
- Encontrar substituto facilmente quando necessário
- Acessar material de formação no próprio ritmo

**Como as Melhorias Técnicas Beneficiam:**
- Menos erros = menos frustração
- Performance melhor = questionário mais rápido
- Integridade de dados = respostas não perdidas
- Notificações confiáveis = não perdem escalas

### Secondary User Segment: Coordenadores de Ministério

**Perfil Demográfico:**
- Idade: 40-65 anos (média 52)
- Função: Liderança voluntária na paróquia
- Literacia Digital: Média
- Tempo Disponível: 5-10 horas/semana para ministério

**Comportamentos Atuais:**
- Geram escalas mensalmente (primeira semana do mês)
- Revisam e ajustam escalas manualmente
- Aprovam pedidos de substituição
- Monitoram atividade e formação dos ministros
- Exportam escalas para impressão/divulgação

**Necessidades e Pain Points:**
- ✅ **Funciona Atual:** Geração automática de escalas, ajustes drag-drop, relatórios
- ❌ **Pain Point:** Sistema às vezes gera escalas com erros (missas vazias, distribuição injusta)
- ❌ **Pain Point:** Exports para Excel/PDF ocasionalmente falham
- ❌ **Frustração:** Dados inconsistentes em relatórios

**Objetivos:**
- Criar escala mensal completa em < 15 minutos
- Ter certeza de 100% de cobertura das missas
- Distribuir ministros de forma justa e equilibrada
- Comunicar escalas eficientemente para todos

**Como as Melhorias Técnicas Beneficiam:**
- Algoritmo de geração mais confiável
- Exports nunca falham
- Relatórios sempre corretos
- Performance permite trabalhar com dados de anos anteriores

---

## Goals & Success Metrics

### Business Objectives

1. **Eliminar Riscos de Segurança**
   - Métrica: 0 vulnerabilidades críticas ou altas em audit de segurança
   - Prazo: 4 semanas
   - Impacto: Conformidade LGPD, proteção de dados sensíveis

2. **Alcançar Estabilidade de Código**
   - Métrica: 0 erros TypeScript, compilação limpa com strict mode
   - Prazo: 6 semanas
   - Impacto: Redução de 80% em crashes inesperados

3. **Melhorar Performance Percebida**
   - Métrica: 95% das operações completam em < 2 segundos
   - Baseline Atual: Dashboard 3-5s, geração de escalas 5-8s
   - Prazo: 8 semanas
   - Impacto: Satisfação do usuário aumenta 40%

4. **Estabelecer Qualidade de Código Profissional**
   - Métrica: 80%+ cobertura de testes em código crítico
   - Métrica: 0 código duplicado em funções core
   - Prazo: 10 semanas
   - Impacto: Tempo de desenvolvimento de novas features reduz 50%

5. **Criar Base para Escalabilidade**
   - Métrica: Sistema suporta 500+ usuários simultâneos sem degradação
   - Baseline Atual: ~30 usuários simultâneos (pico mensal)
   - Prazo: 12 semanas
   - Impacto: Preparação para expansão multi-paróquia

### User Success Metrics

1. **Confiabilidade do Sistema**
   - Métrica: Uptime > 99.5% (máximo 3.6h downtime/mês)
   - Baseline: ~97% (múltiplas interrupções por bugs)

2. **Taxa de Sucesso de Operações**
   - Métrica: 99%+ das submissões de questionários salvam com sucesso
   - Baseline: ~92% (8% falham ou perdem dados)

3. **Tempo de Resposta Percebido**
   - Métrica: Tempo médio de carregamento de página < 1.5s
   - Baseline: 2.5-4s dependendo da página

4. **Satisfação com Exports**
   - Métrica: 100% dos exports (PDF/Excel) completam sem erros
   - Baseline: ~90% (10% falham por problemas de formatação/dados)

### Key Performance Indicators (KPIs)

| KPI | Baseline | Meta (3 meses) | Medição |
|-----|----------|----------------|---------|
| **Vulnerabilidades Críticas** | 5 | 0 | npm audit + manual review |
| **Erros TypeScript** | 67 | 0 | tsc --noEmit |
| **Cobertura de Testes** | 0% | 80% | vitest --coverage |
| **Tempo Médio Geração Escala** | 5-8s | < 2s | Performance monitoring |
| **Uptime Mensal** | 97% | 99.5% | Uptime monitoring |
| **Bugs Reportados/Mês** | 8-12 | < 2 | Issue tracker |
| **Tempo Médio de Bug Fix** | 3-5 dias | < 1 dia | Issue metrics |

---

## MVP Scope

### Core Features (Must Have) - Correções Técnicas Críticas

#### **FASE 1: INTEGRIDADE DE DADOS (Semana 1 - PRIORIDADE MÁXIMA)**

- **Implementar Transações em Operações Multi-Step**
  - Rationale: Falhas no meio de operações deixam estado inconsistente, afetam geração de escalas
  - Deliverable: Drizzle transactions em: deleção de usuários, geração de escalas, aprovação de substituições
  - Acceptance: Testes demonstram rollback em caso de falha; dados nunca ficam inconsistentes
  - Impact: **CRÍTICO** - Afeta diretamente confiabilidade das escalas

- **Adicionar UPSERT para Race Conditions em Questionários**
  - Rationale: Respostas duplicadas confundem algoritmo de geração de escalas
  - Deliverable: INSERT ... ON CONFLICT para questionnaireResponses
  - Acceptance: Teste de concorrência (10 requests simultâneas) não cria duplicatas
  - Impact: **CRÍTICO** - Ministros perdem respostas ou têm dados duplicados

- **Implementar Foreign Key Cascades e Constraints**
  - Rationale: Registros órfãos corrompem relatórios e queries de disponibilidade
  - Deliverable: CASCADE DELETE constraints em todas foreign keys do schema
  - Acceptance: Deletar usuário remove todos registros relacionados automaticamente
  - Impact: **ALTO** - Integridade referencial garante dados consistentes

- **Adicionar Soft Deletes com deletedAt**
  - Rationale: Dados deletados podem precisar ser recuperados; conformidade LGPD
  - Deliverable: Campo deletedAt timestamp em users, schedules, questionnaireResponses
  - Acceptance: "Deletar" marca registro mas não remove fisicamente; queries filtram deletados
  - Impact: **MÉDIO** - Recuperação de dados acidentalmente deletados

#### **FASE 2: SEGURANÇA (Semana 2 - ALTA PRIORIDADE)**

- **Corrigir SQL Injection Risks**
  - Rationale: Queries raw podem permitir extração/modificação de dados sensíveis
  - Deliverable: 100% das queries usando Drizzle prepared statements (eliminar raw SQL)
  - Acceptance: Code review + scan automático não encontra SQL injection
  - Impact: **CRÍTICO** - Proteção de dados pessoais e litúrgicos

- **Implementar CSRF Protection Completo**
  - Rationale: Vulnerabilidade permite ataques que modificam dados sem autorização
  - Deliverable: Middleware CSRF ativo, tokens em todas requests state-changing
  - Acceptance: Teste de penetração CSRF falha (sistema protegido)
  - Impact: **ALTO** - Segurança de sessões e operações críticas

- **Adicionar Autenticação em Webhooks**
  - Rationale: Endpoint público /api/whatsapp/webhook permite execução não autorizada
  - Deliverable: HMAC signature validation ou API key no webhook
  - Acceptance: Webhooks sem autenticação válida são rejeitados (401)
  - Impact: **MÉDIO** - Previne abuso do endpoint

- **Validação de Environment Variables na Inicialização**
  - Rationale: App crasha em produção se JWT_SECRET ou DATABASE_URL faltam
  - Deliverable: Script de validação pré-startup com mensagens claras
  - Acceptance: App não inicia se variáveis críticas faltam, com erro explicativo
  - Impact: **MÉDIO** - Previne crashes em produção

#### **FASE 3: TYPE SAFETY (Semana 3 - MÉDIA PRIORIDADE)**
- **Resolver 67 Erros TypeScript**
  - Rationale: Erros indicam bugs em potencial; impedem strict mode
  - Deliverable: `npm run check` passa sem erros; strict mode ativado
  - Acceptance: Zero erros TypeScript em compilação
  - Impact: **MÉDIO** - Previne bugs sutis, melhora DX

- **Adicionar Tipos Faltantes**
  - Rationale: Implicit any remove benefícios de type checking
  - Deliverable: @types/web-push instalado; custom types para módulos sem tipos
  - Acceptance: No implicit any; no type assertions desnecessárias
  - Impact: **BAIXO** - Melhoria de qualidade incremental

#### **FASE 4: PERFORMANCE (Semana 3-4 - PARALELA COM FASE 3)**

- **Resolver N+1 Queries**
  - Rationale: Queries lentas degradam experiência, especialmente em dashboard e relatórios
  - Deliverable: JOIN queries para family members, schedule assignments
  - Acceptance: Queries executam em < 100ms (medido com profiler)
  - Impact: **ALTO** - Dashboard carrega 3x mais rápido

- **Adicionar Database Indexes**
  - Rationale: Queries em foreign keys não indexadas são O(n), lentas com muitos dados
  - Deliverable: Índices em schedules.ministerId, questionnaireResponses.userId, schedules.massId
  - Acceptance: Query plans mostram index usage; queries 10x+ mais rápidas
  - Impact: **ALTO** - Melhora todas operações de leitura

- **Otimizar Processamento de Dados em Batch**
  - Rationale: Carregar 1000+ respostas em memória pode causar crash
  - Deliverable: Batch processing com paginação para reprocessamento
  - Acceptance: Reprocessamento de qualquer quantidade de dados não estoura memória
  - Impact: **MÉDIO** - Escalabilidade futura

#### **FASE 5: TESTING & QUALIDADE (Semana 4-6 - FINALIZANDO)**
- **Setup de Testes para Fluxos Críticos**
  - Rationale: Mudanças podem quebrar funcionalidades sem detecção
  - Deliverable: Vitest configurado; testes para: auth login/logout, questionnaire submission, schedule generation
  - Acceptance: Testes rodam e passam; podem ser executados localmente
  - Impact: **ALTO** - Confiança para fazer mudanças

- **Testes de Integração para API Crítica**
  - Rationale: Endpoints principais (escalas, questionários) precisam garantias
  - Deliverable: Testes de integração para endpoints em /api/schedules/generate, /api/questionnaires/submit
  - Acceptance: 60%+ cobertura em código crítico (não precisa 100%)
  - Impact: **MÉDIO** - Regression testing automatizado

- **Logging Estruturado com Winston**
  - Rationale: 500+ console.log() polui logs e pode expor dados sensíveis
  - Deliverable: Winston configurado; substituir console.log() em código crítico
  - Acceptance: Logs estruturados com níveis (info, warn, error); sem dados sensíveis
  - Impact: **BAIXO** - Melhoria de debugging e monitoring

### Out of Scope for MVP

**Funcionalidades NOVAS (não são correções):**
- ❌ Mobile app nativo (iOS/Android)
- ❌ Integração WhatsApp completa (além de autenticar webhook)
- ❌ Multi-paróquia / multi-tenancy
- ❌ Sistema de pagamentos/doações
- ❌ App offline-first completo
- ❌ Analytics e relatórios avançados (além dos existentes)

**Refatorações NICE-TO-HAVE (não críticas):**
- ❌ Migração para Next.js ou outro framework
- ❌ Reescrever em outra linguagem (Go, Rust, etc)
- ❌ Separar em microservices
- ❌ GraphQL ao invés de REST
- ❌ Redesign completo de UI/UX

**Infraestrutura (podem vir depois):**
- ❌ Kubernetes/container orchestration
- ❌ CDN para assets
- ❌ Redis para caching
- ❌ Elasticsearch para search

### MVP Success Criteria

**O MVP é considerado sucesso quando:**

1. ✅ **Segurança**: Sistema passa em audit de segurança (nenhuma vulnerabilidade crítica ou alta)
2. ✅ **Estabilidade**: Zero crashes em produção por 30 dias consecutivos
3. ✅ **Type Safety**: Compilação TypeScript limpa (0 erros, strict mode)
4. ✅ **Testes**: 80%+ cobertura em código crítico (auth, schedules, questionnaires)
5. ✅ **Performance**: 95% das operações < 2s (medido por APM)
6. ✅ **Qualidade**: Code review aprovado por desenvolvedor sênior externo
7. ✅ **Documentação**: Arquitetura documentada, onboarding guide < 1 dia
8. ✅ **Funcionalidade**: Todos os features atuais continuam funcionando (regression tests passam)

**Critério de Aceitação Final:**
Sistema pode ser recomendado para outras paróquias sem ressalvas técnicas.

---

## Post-MVP Vision

### Phase 2 Features - Melhorias Técnicas (Mês 2-3)

**Monitoring e Observability Básico:**
- Error tracking simples (logs estruturados + alertas)
- Métricas básicas de performance (response times, error rates)
- Database query monitoring (slow query log)
- Uptime monitoring

**Developer Experience:**
- CI/CD pipeline básico (testes automatizados no push)
- Automated deployments simples
- Staging environment (se viável no Replit)
- Documentação atualizada

**Infraestrutura (Se Necessário):**
- Redis para caching de queries mais pesadas (dashboard, relatórios)
- Database backup automatizado semanal
- Disaster recovery procedure documentada

### Vision (4-6 Meses)

**Produto:**
- **Sistema Estável e Confiável**: 99.5%+ uptime, < 1 bug/mês
- **Performance Excelente**: Todas operações < 2s
- **Código Profissional**: Limpo, testado, documentado
- **Base para Crescimento**: Pronto para adicionar features sem medo

**Próximas Features (Após Estabilização):**
- **WhatsApp Integration Completa**: Notificações bidirecionais
- **Mobile Experience Melhorado**: PWA otimizado para mobile
- **Relatórios Avançados**: Analytics e insights para coordenadores
- **Sistema de Formação Expandido**: Mais conteúdo e tracking

**Técnico:**
- Código mantível e extensível
- Arquitetura documentada
- Onboarding de novos desenvolvedores < 1 dia
- CI/CD robusto com testes automatizados

**Possível Expansão (Após 6 Meses):**
- Avaliar multi-paróquia se houver demanda
- Considerar mobile apps nativos se PWA não for suficiente
- API pública se houver interesse em integrações

### Expansion Opportunities

1. **Mercado Vertical - Outras Paróquias**
   - 10,000+ paróquias no Brasil
   - Potencial de 50,000+ ministros gerenciados
   - Modelo de receita recorrente

2. **Mercado Horizontal - Outros Ministérios**
   - Adaptar para: Leitores, Coroinhas, Músicos, Catequistas
   - Cada ministério tem necessidades similares de escala/formação

3. **Mercado Internacional**
   - Sistema pode ser traduzido (i18n ready)
   - Calendário litúrgico universal
   - Potencial LATAM e Europa (Portugal, Espanha)

4. **B2B - Diocese/Arquidiocese**
   - Dashboard agregado de múltiplas paróquias
   - Analytics diocesanos
   - Treinamento centralizado

---

## Technical Considerations

### Platform Requirements

**Target Platforms:**
- Web (Desktop): Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Web (Mobile): Responsive design, Chrome Mobile, Safari iOS
- PWA: Installable em iOS/Android via browser
- Network: Funciona em 3G (graceful degradation)

**Browser/OS Support:**
- Desktop: Windows 10+, macOS 11+, Linux (Ubuntu 20.04+)
- Mobile: iOS 14+, Android 8+
- Screen Sizes: 320px (mobile) até 2560px (4K desktop)
- Orientations: Portrait e Landscape

**Performance Requirements:**
- **Time to Interactive (TTI)**: < 3s em 3G, < 1.5s em 4G/WiFi
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **API Response Time**: p95 < 500ms, p99 < 1s
- **Database Query Time**: p95 < 100ms
- **Concurrent Users**: Suportar 100 simultâneos (pico mensal 500)

### Technology Preferences

**Frontend:**
- ✅ **Keep:** React 18 (functional components, hooks)
- ✅ **Keep:** Vite (excelente DX, fast builds)
- ✅ **Keep:** TanStack Query (server state management)
- ✅ **Keep:** Tailwind CSS + shadcn/ui (design system consistente)
- ✅ **Keep:** Wouter (lightweight routing suficiente)
- ⚠️ **Consider:** Adicionar React Error Boundaries
- ⚠️ **Consider:** Adicionar React Testing Library

**Backend:**
- ✅ **Keep:** Node.js + Express (maduro, bem conhecido)
- ✅ **Keep:** TypeScript (type safety crítico)
- ✅ **Keep:** Drizzle ORM (type-safe, performático)
- ✅ **Upgrade:** Winston para logging estruturado (substituir console.log)
- ⚠️ **Consider:** Zod para validation (runtime type checking)
- ⚠️ **Consider:** BullMQ para background jobs

**Database:**
- ✅ **Keep:** PostgreSQL via Neon (serverless, auto-scaling)
- ✅ **Keep:** Better-sqlite3 para development
- ⚠️ **Add:** Redis para caching (Phase 2)

**Hosting/Infrastructure:**
- ✅ **Current:** Replit (development + staging)
- ⚠️ **Consider:** Railway/Render para production (melhor uptime SLA)
- ⚠️ **Future:** Vercel/Netlify para frontend, separate backend

### Architecture Considerations

**Repository Structure:**
- ✅ **Keep:** Monorepo (frontend + backend no mesmo repo)
- Rationale: Pequeno time, deploy conjunto, shared types
- Alternative Considered: Polyrepo (mais complexo sem benefício claro)

**Service Architecture:**
- ✅ **Keep:** Monolith modular (um processo Node.js)
- Rationale: Complexidade baixa, deploy simples, latência intra-service zero
- Alternative Considered: Microservices (over-engineering para escala atual)

**Integration Requirements:**
- **Database:** PostgreSQL via pg/Neon driver
- **Email:** SMTP (futuro - SendGrid ou AWS SES)
- **WhatsApp:** Business API webhook (autenticação necessária)
- **Push Notifications:** Web Push API (já implementado)
- **File Storage:** Local filesystem (migration para S3 no futuro)

**Security/Compliance:**
- **HTTPS:** Obrigatório em produção (Replit fornece)
- **LGPD:** Soft deletes, data export, consent tracking
- **OWASP Top 10:** Mitigar todas as vulnerabilidades
- **Password Policy:** Mínimo 8 caracteres, bcrypt hash
- **Session Management:** JWT com refresh tokens (implementar)
- **Audit Trail:** Logs de todas operações sensíveis

---

## Constraints & Assumptions

### Constraints

**Budget:**
- 💰 **Zero orçamento adicional** - Projeto voluntário
- Infraestrutura: Aproveitando free tiers (Neon, Replit)
- Ferramentas: Somente open-source/free tier

**Timeline:**
- ⏱️ **2-3 semanas** para MVP (Fases 1-3: Integridade, Segurança, Type Safety)
- ⏱️ **4-6 semanas** para projeto completo (incluindo Performance e Testes)
- Trabalho focado e acelerado (sprints curtos de 2-3 dias)

**Resources:**
- 👥 **1-2 desenvolvedores** (trabalho voluntário)
- Expertise: Fullstack TypeScript, React, Node.js
- Disponibilidade: ~15-20 horas/semana

**Technical:**
- 🔒 **Sem breaking changes** - Produção ativa não pode parar
- 🔒 **Backward compatibility** - Dados existentes devem migrar sem perda
- 🔒 **No rewrites** - Refatoração incremental apenas
- 🔒 **Deploy sem downtime** - Migrations devem ser online

### Key Assumptions

**Técnicas:**
- TypeScript strict mode não quebrará funcionalidades se tipos forem corretos
- Drizzle ORM transactions são confiáveis para integridade de dados
- Testes podem ser adicionados gradualmente (não precisa 100% cobertura de uma vez)
- Performance gains de índices justificam tempo de criação (queries 10x+ mais rápidas)

**Negócio:**
- Usuários atuais continuarão usando durante refatoração (não migrarão para alternativas)
- Paróquia tem paciência para melhorias técnicas mesmo sem features novas visíveis
- Sistema não crescerá explosivamente durante período de refatoração (100→150 usuários max)

**Processo:**
- Code reviews podem ser feitos assíncronos (não tem team dedicado)
- Documentação pode ser escrita em paralelo com desenvolvimento
- Testes de regressão podem ser manuais inicialmente (automatizar depois)

**Validações Necessárias:**
- ✅ Confirmar que JWT_SECRET está configurado em produção (crítico!)
- ✅ Backup completo do banco antes de começar migrations
- ✅ Testar CSRF protection em staging antes de ativar em produção
- ✅ Validar que indices não degradam performance de writes

---

## Risks & Open Questions

### Key Risks

1. **Downtime Durante Migrations**
   - Descrição: Migrations de schema podem travar banco se queries longas estiverem rodando
   - Impacto: Sistema indisponível por minutos/horas, afeta 100+ usuários
   - Probabilidade: MÉDIA
   - Mitigação: Migrations em horários de baixo uso (madrugada), backup antes, rollback plan

2. **Breaking Changes Não Detectados**
   - Descrição: Mudanças de tipos podem quebrar funcionalidades sutilmente
   - Impacto: Bugs em produção só descobertos após deploy
   - Probabilidade: ALTA (sem testes abrangentes)
   - Mitigação: Testes de regressão manual extensivos, deploy gradual com feature flags

3. **Performance Degradation por Overhead de Segurança**
   - Descrição: CSRF tokens, JWT validation podem adicionar latência
   - Impacto: Sistema mais lento, satisfação reduzida
   - Probabilidade: BAIXA
   - Mitigação: Benchmark antes/depois, otimizar critical path

4. **Scope Creep**
   - Descrição: Tentação de adicionar features novas durante refatoração
   - Impacto: Timeline estende de 6 para 12+ semanas
   - Probabilidade: MÉDIA
   - Mitigação: Documento claro de Out of Scope, discipline de feature freeze

5. **Incompatibilidade de Dados Antigos**
   - Descrição: Questionários em formato v1 podem não migrar corretamente
   - Impacto: Perda de histórico, relatórios quebrados
   - Probabilidade: MÉDIA
   - Mitigação: Migration scripts testados com dados de produção (cópia), validação pós-migration

### Open Questions

**Técnicas:**
1. ❓ Como garantir zero downtime durante migration de foreign key constraints? (ALTER TABLE pode travar)
2. ❓ Devemos usar database transactions para migrations ou scripts idempotentes?
3. ❓ Qual estratégia de cache invalidation ao adicionar Redis? (TTL vs event-based)
4. ❓ Como testar CSRF protection sem quebrar integrações existentes?

**Produto:**
1. ❓ Usuários aceitam potenciais bugs temporários durante refatoração?
2. ❓ Coordenadores podem testar em staging antes de cada deploy?
3. ❓ Há janela de manutenção aceitável? (ex: domingos à noite 22h-02h)

**Processo:**
1. ❓ Quem fará code review se é projeto voluntário de 1-2 devs?
2. ❓ Como priorizar entre correções críticas vs features solicitadas por usuários?
3. ❓ Qual frequência de deploy é aceitável? (semanal? quinzenal?)

### Areas Needing Further Research

**Segurança:**
- ✅ Research: Best practices para CSRF em SPAs (muitos recomendam omitir se JWT em header)
- ✅ Research: HMAC signature validation para webhooks (como WhatsApp Business API faz)
- ✅ Research: Estratégias de rotation de JWT_SECRET sem invalidar todos tokens

**Performance:**
- ✅ Research: Índices compostos vs índices simples para queries de schedules
- ✅ Research: Drizzle ORM vs raw SQL para queries críticas de performance
- ✅ Research: Connection pooling optimal settings para Neon PostgreSQL

**Testing:**
- ✅ Research: Vitest vs Jest para projeto existente (migration effort)
- ✅ Research: E2E testing tools (Playwright vs Cypress para PWA)
- ✅ Research: Mocking strategies para database em tests

**Infraestrutura:**
- ✅ Research: Blue-green deployment em Replit (é possível?)
- ✅ Research: Database migration tools (Drizzle Kit vs Flyway vs custom)
- ✅ Research: Monitoring free tier options (DataDog? New Relic?)

---

## Appendices

### A. Research Summary

**Análise de Código Completa:**
- 50 problemas identificados (5 críticos, 15 altos, 22 médios, 8 baixos)
- Report detalhado disponível em memória da análise técnica
- Localização específica de cada issue (arquivo:linha)

**Documentação Existente Revisada:**
- docs/prd.md - PRD original do sistema
- docs/architecture.md - Arquitetura documentada
- replit.md - Visão geral do sistema
- 30+ docs técnicos sobre features específicas

**Tecnologias Auditadas:**
- package.json: 123 dependências (production + dev)
- TypeScript: Versão 5.6.3 com configuração permissiva (sem strict)
- Database: Drizzle ORM 0.39.3 com schema em shared/schema.ts

### B. Stakeholder Input

**Coordenadores da Paróquia (feedback informal):**
- Sistema funciona bem para necessidades básicas
- Bugs ocasionais causam frustração (especialmente exports falhando)
- Interesse em sistema mais rápido e confiável
- Dispostos a testar melhorias antes de lançar para todos

**Ministros (observação de uso):**
- Alguns têm dificuldade com interface (mais UX issue do que tech)
- Questionários ocasionalmente "somem" ao preencher (race condition ou timeout)
- Notificações nem sempre chegam (investigation needed)

**Coordenação (Decisor Final):**
- Sistema é ferramenta crítica para operação do ministério
- Preocupação com confiabilidade e correção dos dados
- Interesse em sistema estável e fácil de manter
- Prioriza correções sobre features novas

### C. References

**Documentação Técnica:**
- [MESC Architecture](./architecture.md)
- [MESC PRD](./prd.md)
- [Tech Stack Details](./architecture/tech-stack.md)
- [Security Guidelines](./SECURITY.md)
- [Testing Strategy](./TESTING.md)

**External Resources:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- TypeScript Strict Mode: https://www.typescriptlang.org/tsconfig#strict
- Drizzle ORM Transactions: https://orm.drizzle.team/docs/transactions
- LGPD Compliance Guide: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd

**Tools & Libraries:**
- Drizzle ORM: https://orm.drizzle.team/
- TanStack Query: https://tanstack.com/query/latest
- Vitest: https://vitest.dev/
- shadcn/ui: https://ui.shadcn.com/

---

## Next Steps

### Immediate Actions

1. **Criar PRD Detalhado** com base neste Project Brief
   - Documento separado com requisitos funcionais e não-funcionais
   - Stories detalhadas para cada fase de correção
   - Acceptance criteria específicos

2. **Setup de Ambiente de Staging**
   - Clonar produção para ambiente de testes
   - Configurar CI/CD pipeline básico
   - Preparar scripts de backup/restore

3. **Priorização Final com Stakeholders**
   - Review deste brief com coordenadores
   - Confirmar timeline e expectations
   - Alinhar sobre comunicação durante refatoração

4. **Kick-off Técnico**
   - Branch strategy (feature branches + staging + main)
   - Code review process
   - Testing checklist

### PM Handoff

Este Project Brief fornece o contexto completo para o **Sistema MESC** em seu estado atual (brownfield).

**Para a próxima fase:**
Por favor, inicie em **'PRD Generation Mode'**, revise este brief minuciosamente e trabalhe com o usuário para criar o PRD seção por seção conforme o template indica.

**Prioridades Confirmadas:**
1. 🥇 **FASE 1: Integridade de Dados** (Semana 1) - Transações, UPSERT, constraints, soft deletes
2. 🥈 **FASE 2: Segurança** (Semana 2) - SQL injection, CSRF, webhook auth, env validation
3. 🥉 **FASE 3: Type Safety** (Semana 3) - Resolver 67 erros TypeScript, strict mode
4. **FASE 4: Performance** (Semana 3-4, paralela) - N+1 queries, índices, batch processing
5. **FASE 5: Testing & Qualidade** (Semana 4-6) - Testes críticos, logging estruturado

**Timeline Alvo:** 2-3 semanas MVP, 4-6 semanas completo (acelerado)

**Stakeholder:** Coordenador é decisor final

**Foco Especial no PRD:**
- Stories devem ser pequenas e deployáveis a cada 2-3 dias
- Acceptance criteria devem ser verificáveis pelo coordenador
- Priorizar INTEGRIDADE → SEGURANÇA → TYPE SAFETY
- Cada story deve ter impacto mensurável no sistema

---

**Documento gerado em:** 10 de Novembro de 2025
**Próxima revisão:** Após criação do PRD
**Status:** Draft para aprovação do stakeholder

---

_🤖 Generated with [Claude Code](https://claude.com/claude-code)_
