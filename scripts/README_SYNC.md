# 🔄 Sync Questionnaire Responses: Production → Dev

## 📋 Visão Geral

Este conjunto de scripts permite copiar dados de respostas do questionário do banco de produção para o banco DEV de forma **SEGURA**, com backup automático e possibilidade de restauração.

## 🎯 Objetivo

Testar o sistema DEV com dados **reais de produção**, sem perder os dados DEV atuais (backup automático).

---

## 📁 Scripts Disponíveis

### 1. `sync-with-backup.ts` - Sincronização com Backup (RECOMENDADO)
Copia dados de produção para DEV, fazendo backup automático antes.

### 2. `restore-backup.ts` - Restaurar Backup
Restaura um backup anterior para o DEV.

---

## 🚀 Como Usar

### Passo 1: Configurar URL de Produção

Adicione a connection string de produção nos **Replit Secrets**:

1. Clique em **Tools** → **Secrets**
2. Adicione um novo secret:
   - **Name:** `PRODUCTION_DATABASE_URL`
   - **Value:** `postgresql://user:password@host/database` (sua connection string de produção)

### Passo 2: Executar Sincronização

```bash
NODE_ENV=development npx tsx scripts/sync-with-backup.ts
```

### Exemplo de Saída:

```
🔄 SYNC QUESTIONNAIRE RESPONSES (WITH BACKUP)

This will:
  1. ✅ Backup current DEV data
  2. ✅ Copy PRODUCTION data to DEV
  3. ✅ Save backup for restore if needed

📊 Database connections:
   🏭 Production: postgresql://prod.neon.tech...
   🔧 Dev:        postgresql://dev.neon.tech...

💾 STEP 1: Backing up current DEV data...
   📦 Backed up 109 responses from DEV
   💾 Backup saved to: backups/questionnaire_responses_dev_backup_2025-01-13.json

📥 STEP 2: Fetching data from PRODUCTION...
   ✅ Found 106 responses in PRODUCTION

📊 Data comparison:
   DEV (before):  109 responses
   PRODUCTION:    106 responses
   Difference:    -3

📋 Sample PRODUCTION data (first 5):
   1. User: 266cb5ba... | Version: 2.0 | Submitted: 2025-10-01
   2. User: 4a1c378d... | Version: 2.0 | Submitted: 2025-10-01
   3. User: 70a16a55... | Version: 2.0 | Submitted: 2025-10-02
   4. User: 8279bd17... | Version: 2.0 | Submitted: 2025-10-02
   5. User: a1234567... | Version: 2.0 | Submitted: 2025-10-03

🗑️  STEP 3: Clearing DEV table...
   ✅ DEV table cleared

📤 STEP 4: Inserting PRODUCTION data into DEV...
   Inserting 106 records in batches...
   Progress: 50/106 (47%)
   Progress: 100/106 (94%)
   Progress: 106/106 (100%)
   ✅ Inserted 106 records

✅ STEP 5: Verifying sync...
   Total responses in DEV: 106
   Unique users:           106

✅ SYNC COMPLETE! DEV now has PRODUCTION data.

📝 Summary:
   ✅ Backup saved to: backups/questionnaire_responses_dev_backup_2025-01-13.json
   ✅ Synced 106 responses from PRODUCTION to DEV
   ✅ DEV database is ready for testing with production data

💡 To restore DEV backup if needed:
   NODE_ENV=development npx tsx scripts/restore-backup.ts questionnaire_responses_dev_backup_2025-01-13.json

🔌 Database connections closed

🎉 Sync completed successfully!
```

---

## ♻️ Restaurar Backup (Se Necessário)

Se você quiser voltar aos dados DEV anteriores:

```bash
NODE_ENV=development npx tsx scripts/restore-backup.ts questionnaire_responses_dev_backup_2025-01-13.json
```

O script mostrará os backups disponíveis se você não passar o nome do arquivo.

---

## 🔒 Segurança

### ✅ O que o script FAZ:
- Cria backup automático dos dados DEV antes de apagar
- Salva backup em `backups/` com timestamp
- Copia dados de PRODUÇÃO para DEV
- Verifica integridade após sync

### ✅ O que o script NÃO FAZ:
- **NÃO** modifica produção (somente leitura)
- **NÃO** apaga backups automaticamente
- **NÃO** roda se `NODE_ENV` não for `development`

---

## 📦 Estrutura de Backups

Os backups são salvos em:
```
/backups/
  questionnaire_responses_dev_backup_2025-01-13.json
  questionnaire_responses_dev_backup_2025-01-14.json
  ...
```

Cada backup contém:
- Todos os dados da tabela `questionnaire_responses`
- Formato JSON legível
- Timestamp no nome do arquivo

---

## 🔍 Verificar Dados Após Sync

Após sincronizar, você pode verificar os dados com:

```bash
# Ver total de respostas e usuários únicos
NODE_ENV=development npx tsx scripts/check-questionnaire-responses.ts

# Testar disponibilidade de missas diárias
NODE_ENV=development npx tsx scripts/test-weekday-availability.ts

# Ver respostas de ministros específicos
NODE_ENV=development npx tsx scripts/verify-minister-responses.ts
```

---

## ❓ Perguntas Frequentes

### P: Os dados de produção serão modificados?
**R:** Não! O script apenas **lê** de produção. Nunca escreve.

### P: Posso restaurar meus dados DEV depois?
**R:** Sim! Use o script `restore-backup.ts` com o arquivo de backup.

### P: Onde ficam os backups?
**R:** Na pasta `backups/` na raiz do projeto.

### P: Quantos backups são mantidos?
**R:** Todos! O script nunca apaga backups antigos automaticamente.

### P: E se der erro durante o sync?
**R:** Seu backup está seguro em `backups/`. Você pode restaurá-lo a qualquer momento.

### P: Preciso rodar algum fix depois do sync?
**R:** Depende. Se você fez correções manuais no DEV (como o `fix-weekday-responses.ts`), precisará reaplicá-las após o sync se os dados de produção não tiverem essas correções.

---

## 🛠️ Troubleshooting

### Erro: "PRODUCTION_DATABASE_URL not found"
- Adicione a URL nos Replit Secrets (Tools → Secrets)
- Nome: `PRODUCTION_DATABASE_URL`
- Valor: sua connection string de produção

### Erro: "Must be run with NODE_ENV=development"
- Sempre use: `NODE_ENV=development` antes do comando
- Isso evita rodar por engano em produção

### Timeout ou erro de conexão
- Verifique se as URLs de banco estão corretas
- Confirme que o banco de produção está acessível
- O script usa batches de 50 registros para evitar timeouts

### Backup não aparece
- Verifique a pasta `backups/` na raiz do projeto
- Os backups têm nome: `questionnaire_responses_dev_backup_YYYY-MM-DD.json`

---

## 📝 Exemplo Completo de Uso

```bash
# 1. Sincronizar com produção (cria backup automaticamente)
NODE_ENV=development npx tsx scripts/sync-with-backup.ts

# 2. Testar com os dados de produção
NODE_ENV=development npx tsx scripts/test-weekday-availability.ts

# 3. Se necessário, restaurar backup
NODE_ENV=development npx tsx scripts/restore-backup.ts questionnaire_responses_dev_backup_2025-01-13.json
```

---

## 💡 Dicas

1. **Antes de gerar escalas definitivas**, sempre sincronize com produção para testar com dados reais
2. **Mantenha os backups** - não há limite e ocupam pouco espaço
3. **Documente alterações manuais** que fizer no DEV para reaplicar após sync se necessário
4. **Verifique os dados** após cada sync com os scripts de teste

---

## 🎯 Workflow Recomendado

```
Desenvolvimento Local (DEV)
  ↓
  ↓ 1. Sync com backup
  ↓
DEV com dados de PRODUÇÃO
  ↓
  ↓ 2. Testar geração de escalas
  ↓
Testes OK?
  ├─ Sim → Deploy para produção
  └─ Não → Corrigir e testar novamente
           (restaurar backup se necessário)
```
