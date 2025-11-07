# 💀 USUÁRIOS EXPOSTOS - BANCO DE DADOS COMMITADO

**Data de Extração:** 06/10/2025
**Extraído por:** Claude (sob ordem do Senhor Vangrey)
**Arquivo Fonte:** `local.db` (212 KB commitado no Git)

---

## ⚠️ AVISO CRÍTICO

Este arquivo contém **DADOS REAIS** extraídos do banco de dados SQLite que estava **COMMITADO NO GIT**.

**Qualquer pessoa com acesso ao repositório tem acesso a estes dados.**

---

## 📊 RESUMO DA EXPOSIÇÃO

- **Total de usuários expostos:** 2
- **Hashes de senha expostos:** 2
- **Emails expostos:** 2
- **Dados pessoais expostos:** Sim
- **Dados religiosos expostos:** Não (campos vazios neste banco)

---

## 👤 USUÁRIO #1

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DE IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID:              5d4d1608-8331-46ca-8055-1fcb01688cd5
Email:           admin@local.dev
Nome:            Administrador Local
Primeiro Nome:   Administrador
Último Nome:     Local
Role:            coordenador
Status:          active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDENCIAIS (HASH BCRYPT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

password_hash:   $2b$10$tKSWu5f54P2z1aGTorrnl.pAUpazjetGDzy5IbrodRRHaROr7rqY.

⚠️  VULNERABILIDADE: Hash bcrypt exposto
    Atacante pode fazer brute force OFFLINE
    Sem rate limiting em ataque offline!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requer Mudança de Senha:  NÃO (0)
Última Mudança de Senha:  NULL
Criado em:                 2025-09-13 21:57:25
Atualizado em:             2025-09-13 21:57:25
Último Login:              NULL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS PESSOAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Telefone:                  NULL
WhatsApp:                  NULL
Endereço:                  NULL
Cidade:                    NULL
CEP:                       NULL
Data de Nascimento:        NULL
Estado Civil:              NULL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS RELIGIOSOS (LGPD ART. 11 - SENSÍVEL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Data de Batismo:           NULL
Paróquia de Batismo:       NULL
Data de Confirmação:       NULL
Paróquia de Confirmação:   NULL
Data de Casamento:         NULL
Paróquia de Casamento:     NULL

⚠️  STATUS: Campos vazios (sem dados sensíveis neste usuário)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MINISTÉRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Início no Ministério:      NULL
Posição Preferida:         NULL
Treinamento Litúrgico:     NÃO (0)
Total de Serviços:         0
Formação Completa:         NÃO (0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 👤 USUÁRIO #2

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DE IDENTIFICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID:              30510913-7eab-43d9-adaf-b7b4fe58acc2
Email:           rossit@icloud.com
Nome:            Coordenador Rossit
Primeiro Nome:   Coordenador
Último Nome:     Rossit
Role:            coordenador
Status:          active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDENCIAIS (HASH BCRYPT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

password_hash:   $2b$10$lAn2RhLPmI3JYoQWsdIWv.dWYy6peWSA/M/AKa/syAHI8wGZoNUPS

⚠️  VULNERABILIDADE: Hash bcrypt exposto
    Atacante pode fazer brute force OFFLINE
    Sem rate limiting em ataque offline!

🔴 CRÍTICO: Este email (rossit@icloud.com) aparece em scripts hardcoded!
    - scripts/create-rossit-user.ts → senha: "senha123"
    - scripts/reset-rossit-password.ts → senha: "Admin@2024"

    Atacante pode testar estas senhas contra o hash!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Requer Mudança de Senha:  NÃO (0)
Última Mudança de Senha:  NULL
Criado em:                 2025-09-13 23:14:54
Atualizado em:             2025-09-24 11:15:26
Último Login:              2025-09-26 13:24:14.294Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS PESSOAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Telefone:                  NULL
WhatsApp:                  NULL
Endereço:                  NULL
Cidade:                    NULL
CEP:                       NULL
Data de Nascimento:        NULL
Estado Civil:              NULL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS RELIGIOSOS (LGPD ART. 11 - SENSÍVEL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Data de Batismo:           NULL
Paróquia de Batismo:       NULL
Data de Confirmação:       NULL
Paróquia de Confirmação:   NULL
Data de Casamento:         NULL
Paróquia de Casamento:     NULL

⚠️  STATUS: Campos vazios (sem dados sensíveis neste usuário)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MINISTÉRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Início no Ministério:      NULL
Posição Preferida:         NULL
Treinamento Litúrgico:     NÃO (0)
Total de Serviços:         0
Formação Completa:         NÃO (0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔓 TENTATIVA DE QUEBRA DOS HASHES

### Senhas Conhecidas dos Scripts:

```python
# Senhas encontradas em scripts hardcoded:
senhas_conhecidas = [
    'senha123',        # scripts/create-rossit-user.ts:10
    'Admin@2024',      # scripts/reset-rossit-password.ts:22
    'september2024',   # scripts/create-temp-admin.ts:11
    'Admin123456',     # scripts/create-simple-user.ts
    'admin123',        # scripts/create-local-user.ts
]

# Testar contra os hashes:
import bcrypt

hash_admin = b'$2b$10$tKSWu5f54P2z1aGTorrnl.pAUpazjetGDzy5IbrodRRHaROr7rqY.'
hash_rossit = b'$2b$10$lAn2RhLPmI3JYoQWsdIWv.dWYy6peWSA/M/AKa/syAHI8wGZoNUPS'

for senha in senhas_conhecidas:
    if bcrypt.checkpw(senha.encode(), hash_admin):
        print(f"✅ SENHA ADMIN ENCONTRADA: {senha}")

    if bcrypt.checkpw(senha.encode(), hash_rossit):
        print(f"✅ SENHA ROSSIT ENCONTRADA: {senha}")
```

**⚠️  NÃO EXECUTEI ESTE CÓDIGO, mas qualquer atacante pode executar offline.**

---

## 📋 ANÁLISE DE VULNERABILIDADE

### Schema da Tabela:

A tabela `users` tem **MÚLTIPLOS CAMPOS DUPLICADOS**, indicando migrações problemáticas:

```sql
-- Campos duplicados encontrados:
password          (antigo)
password_hash     (novo)
passwordHash      (duplicata?)

firstName         (antigo)
first_name        (novo)

lastName          (antigo)
last_name         (novo)

requiresPasswordChange     (antigo)
requires_password_change   (novo)
mustChangePassword         (duplicata?)
```

**Problema:** 3 campos de senha diferentes! Qual é usado?

### Criptografia:

```sql
-- SENHAS:
✅ password_hash: bcrypt (seguro, mas exposto)
❌ Sem criptografia em sessão (armazenamento)
❌ Sem criptografia at-rest (banco)

-- DADOS RELIGIOSOS:
❌ baptism_parish: TEXT (plaintext)
❌ confirmation_parish: TEXT (plaintext)
❌ marriage_parish: TEXT (plaintext)

-- DADOS PESSOAIS:
❌ address: TEXT (plaintext)
❌ phone: TEXT (plaintext)
❌ whatsapp: TEXT (plaintext)
```

**NENHUM dado sensível está criptografado além do hash da senha!**

---

## 🔥 EXPOSIÇÃO REAL

### O que um atacante TEM agora:

1. ✅ **2 emails válidos de coordenadores**
   - admin@local.dev
   - rossit@icloud.com

2. ✅ **2 hashes bcrypt**
   - Pode fazer brute force offline (sem rate limit!)
   - Pode testar senhas dos scripts hardcoded

3. ✅ **2 UUIDs válidos**
   - Pode fazer ataques direcionados
   - Pode falsificar JWTs (se tiver o secret hardcoded)

4. ✅ **Datas de criação e último login**
   - Pode inferir padrões de uso
   - Pode planejar timing de ataques

### O que um atacante PODE fazer:

#### Cenário 1: Brute Force Offline
```bash
# Usando hashcat (GPU)
hashcat -m 3200 -a 0 hashes.txt wordlist.txt

# Velocidade típica: 50.000-100.000 hashes/segundo
# Lista de 1 milhão de senhas = ~10-20 segundos
```

#### Cenário 2: Testar Senhas Hardcoded
```bash
# Testar as 5 senhas conhecidas dos scripts
curl -X POST https://saojudastadeu.app/api/auth/login \
  -d '{"email":"rossit@icloud.com","password":"Admin@2024"}'

# Se acertar = ACESSO TOTAL COMO COORDENADOR
```

#### Cenário 3: Credential Stuffing
```bash
# Usar emails em outros serviços
# Exemplo: testar rossit@icloud.com em Gmail, Facebook, etc.
# Se usar mesma senha = COMPROMETIMENTO TOTAL
```

---

## 💰 IMPACTO LEGAL (LGPD)

### Violações Identificadas:

| Artigo LGPD | Violação | Multa Máxima |
|-------------|----------|--------------|
| **Art. 46** | Falta de medidas de segurança adequadas | R$ 50 milhões |
| **Art. 48** | Não comunicação de incidente (se houve vazamento) | R$ 50 milhões |
| **Art. 11** | Tratamento inadequado de dados sensíveis (se houver) | R$ 50 milhões |

### Dados Expostos por Categoria:

| Categoria | Quantidade | Sensibilidade | Status |
|-----------|-----------|---------------|--------|
| **Identificadores** | 2 emails | Pessoal | ❌ EXPOSTO |
| **Credenciais** | 2 hashes | Crítico | ❌ EXPOSTO |
| **Dados Pessoais** | 0 (campos vazios) | Pessoal | ✅ Não preenchido |
| **Dados Religiosos** | 0 (campos vazios) | SENSÍVEL | ✅ Não preenchido |

**BOA NOTÍCIA:** Banco de desenvolvimento parece ter apenas dados de teste (campos vazios).

**MÁ NOTÍCIA:** Mesmo assim, expõe estrutura do banco e hashes de senhas de coordenadores.

---

## 🚨 AÇÕES IMEDIATAS NECESSÁRIAS

### 1. Verificar Banco de Produção
```bash
# ⚠️  URGENTE: Verificar se banco de PRODUÇÃO também foi exposto

# Buscar no histórico do Git:
git log --all --full-history -- "*.db"

# Se retornar qualquer resultado = INCIDENTE CRÍTICO
```

### 2. Resetar Senhas dos Coordenadores Expostos
```bash
# Resetar imediatamente:
# - admin@local.dev
# - rossit@icloud.com

npm run tsx scripts/EMERGENCY-reset-admin-passwords.ts
```

### 3. Revogar Todos os Tokens JWT
```bash
# Forçar re-login de todos os usuários
npm run tsx scripts/EMERGENCY-revoke-all-tokens.ts
```

### 4. Limpar Histórico do Git
```bash
# ⚠️  ATENÇÃO: Ação irreversível!

# Opção 1: BFG Repo-Cleaner
java -jar bfg.jar --delete-files "*.db" .

# Opção 2: git-filter-repo
git filter-repo --path local.db --invert-paths

# Opção 3 (RECOMENDADO): Criar novo repositório limpo
```

### 5. Notificar Usuários Afetados
```
Assunto: IMPORTANTE - Atualização de Segurança

Prezado(a) [Nome],

Por medida de segurança, estamos solicitando que todos os coordenadores
atualizem suas senhas imediatamente.

Acesse: https://saojudastadeu.app/change-password

Atenciosamente,
Equipe Técnica
```

### 6. Comunicar à ANPD (se aplicável)
```
Se o banco de PRODUÇÃO foi exposto:
- Comunicar à ANPD em até 72 horas
- Notificar titulares dos dados
- Documentar o incidente
```

---

## 📊 COMANDOS DE VERIFICAÇÃO EXTRAS

### Ver histórico completo do banco no Git:
```bash
git log --all --full-history --oneline -- local.db
```

### Ver conteúdo do banco em commits antigos:
```bash
# Ver em commit específico
git show COMMIT_HASH:local.db > old-db-snapshot.db
sqlite3 old-db-snapshot.db "SELECT * FROM users;"
```

### Ver quem commitou o banco:
```bash
git log --all --full-history --format="%H %an %ae %ai" -- local.db
```

### Exportar todos os dados para análise forense:
```bash
sqlite3 local.db ".dump" > local-db-dump.sql
```

---

## 🎯 CONCLUSÃO

### Resumo Executivo:

**EXPOSIÇÃO CONFIRMADA:**
- ✅ 2 usuários coordenadores
- ✅ 2 hashes bcrypt
- ✅ 2 emails válidos
- ✅ Estrutura completa do banco

**BOA NOTÍCIA:**
- ✅ Apenas dados de desenvolvimento/teste
- ✅ Campos sensíveis vazios (sem dados religiosos reais)
- ✅ Apenas 2 usuários (não 50+)

**MÁ NOTÍCIA:**
- ❌ Hashes podem ser quebrados offline
- ❌ Senhas possivelmente conhecidas (scripts)
- ❌ Estrutura do banco exposta
- ❌ Indica que PODE haver mais bancos no histórico

### Próximos Passos:

1. ✅ **EXECUTAR VERIFICAÇÃO COMPLETA DO GIT** (histórico completo)
2. ✅ **RESETAR SENHAS IMEDIATAMENTE**
3. ✅ **REVOGAR TOKENS JWT**
4. ✅ **LIMPAR HISTÓRICO DO GIT**
5. ✅ **VERIFICAR SE BANCO DE PRODUÇÃO FOI EXPOSTO**

---

**Relatório compilado por:** Claude (Anthropic AI)
**Sob ordem de:** Senhor Vangrey (Auditor de Primeira Classe)
**Data:** 06/10/2025
**Classificação:** CONFIDENCIAL - INCIDENTE DE SEGURANÇA

---

## 🔐 APÊNDICE: Hash Completo para Análise Forense

```
USUÁRIO 1 (admin@local.dev):
Hash bcrypt completo:
$2b$10$tKSWu5f54P2z1aGTorrnl.pAUpazjetGDzy5IbrodRRHaROr7rqY.

Formato bcrypt: $2b$[cost]$[salt][hash]
- Versão: 2b
- Cost: 10 (1024 iterações = 2^10)
- Salt: tKSWu5f54P2z1aGTorrnl.
- Hash: pAUpazjetGDzy5IbrodRRHaROr7rqY.

USUÁRIO 2 (rossit@icloud.com):
Hash bcrypt completo:
$2b$10$lAn2RhLPmI3JYoQWsdIWv.dWYy6peWSA/M/AKa/syAHI8wGZoNUPS

Formato bcrypt: $2b$[cost]$[salt][hash]
- Versão: 2b
- Cost: 10 (1024 iterações = 2^10)
- Salt: lAn2RhLPmI3JYoQWsdIWv.
- Hash: dWYy6peWSA/M/AKa/syAHI8wGZoNUPS
```

**Fim do Relatório de Exposição** 💀
