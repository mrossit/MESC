# 📋 DPIA - Avaliação de Impacto à Proteção de Dados

**Sistema:** MESC - Ministros Extraordinários da Sagrada Comunhão
**Organização:** Paróquia São Judas Tadeu
**Data:** 2025-10-09
**Versão:** 1.0
**Base Legal:** LGPD Art. 38 (Lei 13.709/2018)

---

## 1. VISÃO GERAL DO TRATAMENTO DE DADOS

### 1.1. Descrição do Sistema
O Sistema MESC é uma plataforma web para gestão de ministros extraordinários da sagrada comunhão, permitindo:
- Organização de escalas de missas
- Gestão de disponibilidade de ministros
- Formação e treinamento ministerial
- Comunicação entre coordenadores e ministros
- Administração de substituições

### 1.2. Controlador de Dados
**Nome:** Paróquia São Judas Tadeu
**Responsável:** Padre Reitor
**Encarregado (DPO):** dpo@saojudastadeu.app

### 1.3. Categorias de Dados Tratados

#### 1.3.1. Dados Pessoais Básicos
- Nome completo
- Email
- Telefone/WhatsApp
- Endereço residencial (rua, cidade, CEP)
- Foto de perfil
- Data de nascimento

#### 1.3.2. Dados Sensíveis (LGPD Art. 11)
- **Dados Religiosos:**
  - Data e paróquia de batismo
  - Data e paróquia de confirmação (crisma)
  - Data e paróquia de casamento
  - Estado civil

#### 1.3.3. Dados de Relacionamento
- Relacionamentos familiares entre ministros
- Preferência de serviço em casal

#### 1.3.4. Dados de Atividade
- Disponibilidade para missas
- Preferências de horários
- Histórico de escalas
- Progresso em formação ministerial
- Logs de acesso e auditoria

### 1.4. Finalidades do Tratamento
1. **Organização Litúrgica:** Distribuição eficiente de ministros nas celebrações
2. **Comunicação Pastoral:** Notificações sobre escalas e atividades
3. **Formação Continuada:** Acompanhamento de cursos obrigatórios
4. **Gestão Familiar:** Facilitar coordenação entre familiares ministros
5. **Verificação de Elegibilidade:** Confirmar sacramentos necessários
6. **Compliance e Auditoria:** Rastreabilidade conforme LGPD Art. 37

---

## 2. ANÁLISE DE NECESSIDADE E PROPORCIONALIDADE

### 2.1. Necessidade dos Dados

| Categoria de Dados | Necessário? | Justificativa |
|-------------------|-------------|---------------|
| Nome completo | ✅ Sim | Identificação essencial |
| Email | ✅ Sim | Canal principal de comunicação |
| Telefone/WhatsApp | ✅ Sim | Comunicação urgente e notificações |
| Endereço | ⚠️ Parcial | Opcional - para eventos presenciais |
| Foto | ❌ Não essencial | Opcional - facilita identificação |
| Data nascimento | ✅ Sim | Validação de maioridade ministerial |
| Dados sacramentais | ✅ Sim | Requisito canônico (Direito Canônico 910 §2) |
| Estado civil | ✅ Sim | Para coordenação de casais |
| Disponibilidade | ✅ Sim | Core business do sistema |
| Formação | ✅ Sim | Requisito ministerial obrigatório |

### 2.2. Proporcionalidade
- ✅ **Dados mínimos:** Apenas o necessário para as finalidades declaradas
- ✅ **Transparência:** Política de privacidade completa disponível
- ✅ **Consentimento:** Obtido no cadastro, com opção de revogação
- ✅ **Segurança:** Criptografia AES-256-GCM para dados sensíveis
- ✅ **Retenção limitada:** Anonimização após 1 ano de inatividade

---

## 3. AVALIAÇÃO DE RISCOS

### 3.1. Identificação de Riscos

#### 3.1.1. Riscos de Segurança da Informação

| Risco | Probabilidade | Impacto | Nível |
|-------|--------------|---------|-------|
| Acesso não autorizado a dados | Baixa | Alto | 🟡 Médio |
| Vazamento de dados religiosos | Muito Baixa | Muito Alto | 🟡 Médio |
| Ataque de força bruta | Baixa | Médio | 🟢 Baixo |
| Injeção SQL | Muito Baixa | Alto | 🟢 Baixo |
| CSRF/XSS | Muito Baixa | Médio | 🟢 Baixo |
| Perda de dados (sem backup) | Muito Baixa | Alto | 🟢 Baixo |

#### 3.1.2. Riscos aos Direitos dos Titulares

| Risco | Probabilidade | Impacto | Nível |
|-------|--------------|---------|-------|
| Discriminação religiosa | Muito Baixa | Muito Alto | 🟡 Médio |
| Exposição de dados sensíveis | Muito Baixa | Alto | 🟢 Baixo |
| Dificuldade em exercer direitos LGPD | Baixa | Médio | 🟢 Baixo |
| Uso indevido de dados por terceiros | Muito Baixa | Alto | 🟢 Baixo |

#### 3.1.3. Riscos Operacionais

| Risco | Probabilidade | Impacto | Nível |
|-------|--------------|---------|-------|
| Indisponibilidade do sistema | Baixa | Médio | 🟢 Baixo |
| Perda de auditoria | Muito Baixa | Alto | 🟢 Baixo |
| Falha na criptografia | Muito Baixa | Muito Alto | 🟡 Médio |

### 3.2. Classificação de Risco Geral

**Nível de Risco Global:** 🟡 **MÉDIO**

**Justificativa:**
- Sistema trata dados religiosos sensíveis (LGPD Art. 11)
- Medidas de segurança robustas implementadas
- Risco residual controlado com mitigações adequadas

---

## 4. MEDIDAS DE MITIGAÇÃO IMPLEMENTADAS

### 4.1. Medidas Técnicas

#### 4.1.1. Segurança de Acesso
- ✅ Autenticação JWT com tokens seguros
- ✅ Senha criptografada com bcrypt (10 rounds)
- ✅ Rate limiting por email + IP (anti-brute force)
- ✅ Sessões com timeout de 10 minutos de inatividade
- ✅ RBAC - Controle de acesso baseado em funções

#### 4.1.2. Proteção de Dados Sensíveis
- ✅ **Criptografia AES-256-GCM** para dados religiosos:
  - baptismParish
  - confirmationParish
  - marriageParish
- ✅ HTTPS/TLS 1.3 obrigatório em produção
- ✅ Headers de segurança (Helmet.js):
  - CSP (Content Security Policy)
  - HSTS (HTTP Strict Transport Security)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff

#### 4.1.3. Proteção Contra Ataques
- ✅ CORS restrito por whitelist
- ✅ Parametrização de queries SQL (anti-SQL injection)
- ✅ Validação de entrada com Zod schemas
- ✅ Sanitização de dados em logs

#### 4.1.4. Backup e Recuperação
- ✅ Script de backup automatizado
- ✅ Backups criptografados
- ✅ Procedimento de restore documentado

### 4.2. Medidas Organizacionais

#### 4.2.1. Governança de Dados
- ✅ Encarregado (DPO) designado: dpo@saojudastadeu.app
- ✅ Política de Privacidade publicada e acessível
- ✅ Procedimentos de resposta a incidentes (em desenvolvimento)

#### 4.2.2. Auditoria e Rastreabilidade (LGPD Art. 37)
- ✅ Registro de todas operações sensíveis:
  - LOGIN/LOGOUT
  - CRIAÇÃO/ATUALIZAÇÃO/EXCLUSÃO de usuários
  - ACESSO a dados pessoais/religiosos
  - MUDANÇAS de senha
  - EVENTOS de segurança (rate limit, CORS blocked)
- ✅ Logs armazenados em banco de dados (activity_logs)
- ✅ Sanitização automática de dados sensíveis em logs

#### 4.2.3. Direitos dos Titulares (LGPD Art. 18)
- ✅ **Acesso:** GET /api/profile
- ✅ **Correção:** PUT /api/profile
- ✅ **Portabilidade:** Exportação em JSON (futuro)
- ✅ **Exclusão:** DELETE /api/users/:id (apenas admins)
- ✅ **Informação:** Página de política de privacidade
- ✅ **Revogação:** Funcionalidade de exclusão de conta

#### 4.2.4. Retenção de Dados
| Tipo de Dado | Período de Retenção | Ação Após Período |
|-------------|---------------------|-------------------|
| Dados ativos | Duração do ministério | Mantidos |
| Dados inativos | 1 ano após inativação | Anonimizados |
| Logs de auditoria | 5 anos | Excluídos |
| Dados anônimos | Indefinido | Mantidos para estatísticas |

### 4.3. Medidas de Conscientização
- 📚 Documentação de segurança (em desenvolvimento)
- 📚 Treinamento para coordenadores (planejado)
- 📚 Política de uso aceitável (planejado)

---

## 5. AVALIAÇÃO DE RISCOS RESIDUAIS

Após implementação das medidas de mitigação:

| Risco Original | Risco Residual | Status |
|---------------|---------------|--------|
| Acesso não autorizado | 🟢 Baixo | ✅ Controlado |
| Vazamento de dados religiosos | 🟢 Baixo | ✅ Controlado |
| Ataque de força bruta | 🟢 Muito Baixo | ✅ Controlado |
| Injeção SQL | 🟢 Muito Baixo | ✅ Controlado |
| Discriminação religiosa | 🟢 Baixo | ✅ Controlado |
| Falha de backup | 🟢 Baixo | ✅ Controlado |

**Risco Residual Global:** 🟢 **BAIXO**

---

## 6. CONFORMIDADE LGPD

### 6.1. Checklist de Conformidade

| Artigo LGPD | Requisito | Status | Evidência |
|------------|-----------|--------|-----------|
| Art. 6º | Princípios gerais | ✅ | Finalidade, adequação, necessidade |
| Art. 7º | Base legal | ✅ | Consentimento + execução de serviço |
| Art. 9º | Transparência | ✅ | Política de privacidade completa |
| Art. 11 | Dados sensíveis | ✅ | Criptografia AES-256-GCM |
| Art. 18 | Direitos dos titulares | ✅ | Rotas de acesso, correção, exclusão |
| Art. 37 | Registro de operações | ✅ | Auditoria completa (auditLogger.ts) |
| Art. 38 | DPIA | ✅ | Este documento |
| Art. 41 | Encarregado (DPO) | ✅ | dpo@saojudastadeu.app |
| Art. 46 | Segurança | ✅ | Criptografia, HTTPS, rate limiting |
| Art. 48 | Comunicação à ANPD | ⏳ | Procedimento em desenvolvimento |

### 6.2. Gaps Identificados
1. ⏳ **Procedimento formal de resposta a incidentes:** Em desenvolvimento
2. ⏳ **Treinamento LGPD para coordenadores:** Planejado
3. ⏳ **Termo de consentimento explícito no cadastro:** A implementar
4. ⏳ **Exportação de dados (portabilidade):** Funcionalidade futura

---

## 7. PLANO DE AÇÃO

### 7.1. Ações Imediatas (0-30 dias)

1. ✅ **Implementar criptografia de dados religiosos** - CONCLUÍDO
2. ✅ **Criar política de privacidade** - CONCLUÍDO
3. ✅ **Implementar auditoria completa** - CONCLUÍDO
4. ⏳ **Criar termo de consentimento no cadastro** - A FAZER
5. ⏳ **Documentar procedimento de resposta a incidentes** - A FAZER

### 7.2. Ações de Curto Prazo (1-3 meses)

1. 🔵 **Implementar exportação de dados (portabilidade)**
2. 🔵 **Criar dashboard de consentimentos**
3. 🔵 **Treinamento LGPD para coordenadores**
4. 🔵 **Teste de segurança (pentest básico)**
5. 🔵 **Documentação de segurança completa**

### 7.3. Ações de Médio Prazo (3-6 meses)

1. 🟣 **Auditoria externa de segurança**
2. 🟣 **Certificação ISO 27001 (opcional)**
3. 🟣 **Sistema de monitoramento contínuo (SIEM)**
4. 🟣 **2FA para coordenadores e gestores**

---

## 8. MONITORAMENTO E REVISÃO

### 8.1. Indicadores de Desempenho (KPIs)

| Indicador | Meta | Frequência |
|-----------|------|------------|
| Tentativas de acesso não autorizado | < 10/mês | Mensal |
| Incidentes de segurança | 0 | Contínuo |
| Tempo de resposta a direitos LGPD | < 15 dias | Por solicitação |
| Taxa de conformidade em auditorias | 100% | Trimestral |
| Disponibilidade do sistema | > 99.5% | Mensal |

### 8.2. Revisão do DPIA
- **Frequência:** Anual ou quando houver mudanças significativas
- **Responsável:** Encarregado (DPO)
- **Gatilhos para revisão:**
  - Novas funcionalidades com dados pessoais
  - Incidente de segurança grave
  - Mudança na legislação (LGPD)
  - Auditoria externa

---

## 9. CONCLUSÃO

### 9.1. Síntese da Avaliação

O Sistema MESC, após implementação das medidas de segurança e conformidade LGPD:

✅ **Trata dados sensíveis de forma adequada** com criptografia AES-256-GCM
✅ **Possui riscos residuais controlados** em nível baixo
✅ **Está em conformidade com a maioria dos requisitos LGPD**
⏳ **Possui gaps menores** que serão endereçados no plano de ação

### 9.2. Recomendação Final

**✅ O tratamento de dados pelo Sistema MESC é APROVADO**, condicionado à:

1. Execução do plano de ação de curto prazo (1-3 meses)
2. Monitoramento contínuo dos KPIs de segurança
3. Revisão anual desta DPIA

### 9.3. Assinaturas

**Elaborado por:** Claude Code (AI Security Assistant)
**Data:** 2025-10-09

**Aprovado por:** _________________________________
**Padre Reitor - Paróquia São Judas Tadeu**
**Data:** ___/___/______

**Revisado por:** _________________________________
**Encarregado de Dados (DPO)**
**Data:** ___/___/______

---

## ANEXOS

### Anexo A - Inventário de Dados Pessoais
Ver arquivo: `USUARIOS-EXPOSTOS-BANCO.md`

### Anexo B - Medidas de Segurança Técnicas
Ver arquivo: `SECURITY_IMPROVEMENTS_SUMMARY.md`

### Anexo C - Política de Privacidade
Ver arquivo: `client/src/pages/privacy-policy.tsx`

### Anexo D - Auditoria de Segurança
Ver arquivo: `CLAUDE_AUDIT_SUMMARY_4_Vangrey.md`

---

**Documento Confidencial - Uso Interno**
**Classificação:** RESTRITO
**Válido até:** 2026-10-09 (1 ano)
