# Sistema de Backup e Restore - MESC

## 🔒 Visão Geral

Sistema completo de backup e restauração do banco de dados PostgreSQL do MESC, garantindo segurança e recuperação de dados em caso de desastres.

---

## 📋 Funcionalidades

### ✅ Backup Automático
- Backup diário via `pg_dump` (formato SQL)
- Fallback para export JSON via Drizzle (se pg_dump falhar)
- Retenção automática de 30 dias
- Verificação de integridade
- Estatísticas do banco

### ✅ Restauração Segura
- Interface interativa para seleção de backup
- Backup de segurança automático antes de restore
- Verificação de integridade pós-restore
- Suporte para formatos SQL e JSON

### ✅ Gestão de Backups
- Listagem de backups disponíveis
- Limpeza automática de backups antigos
- Informações detalhadas (tamanho, data)

---

## 🚀 Uso Rápido

### Criar Backup Manual

```bash
npm run db:backup
```

**Saída esperada:**
```
🚀 Iniciando backup do banco de dados MESC
📅 2025-10-05T20:30:00.000Z
────────────────────────────────────────────────────────────
📦 Iniciando pg_dump backup...
✅ Backup criado: backup-2025-10-05T20-30-00-000Z.sql (2.45 MB)
✅ Backup verificado
🧹 Limpando backups antigos...
✅ Limpeza concluída: 0 arquivos removidos

📋 Backups disponíveis:
  1. backup-2025-10-05T20-30-00-000Z.sql - 2.45 MB (0d atrás)
  2. backup-2025-10-04T20-30-00-000Z.sql - 2.43 MB (1d atrás)

────────────────────────────────────────────────────────────
✅ Backup concluído com sucesso!
📁 Arquivo: /home/runner/workspace/backups/backup-2025-10-05T20-30-00-000Z.sql
```

### Restaurar Backup

```bash
npm run db:restore
```

**Fluxo interativo:**

1. **Listar backups disponíveis**
   ```
   📋 Backups disponíveis:

     1. backup-2025-10-05T20-30-00-000Z.sql
        Data: 05/10/2025 20:30:00 | Tamanho: 2.45 MB

     2. backup-2025-10-04T20-30-00-000Z.sql
        Data: 04/10/2025 20:30:00 | Tamanho: 2.43 MB
   ```

2. **Selecionar backup**
   ```
   Digite o número do backup (1-2) ou caminho completo: 1
   ```

3. **Confirmar operação** ⚠️
   ```
   ⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER todos os dados atuais!
   Tem certeza que deseja continuar? (digite "SIM" para confirmar): SIM
   ```

4. **Backup de segurança**
   ```
   🔒 Criando backup de segurança antes de restaurar...
   ✅ Backup de segurança criado: backup-pre-restore-2025-10-05T20-35-00-000Z.sql
   ```

5. **Restauração**
   ```
   🚀 Iniciando restauração...
   📥 Restaurando backup SQL...
     🧹 Limpando tabelas existentes...
     📦 Importando dados do backup...
   ✅ Backup SQL restaurado com sucesso

   🔍 Verificando integridade do restore...
     ✓ users: 45 registros
     ✓ schedules: 312 registros
     ✓ questionnaires: 6 registros
   ✅ Verificação concluída

   ✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!
   ```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Obrigatório
DATABASE_URL=postgresql://user:pass@host/database

# Opcional (para snapshots Neon)
NEON_API_KEY=your_api_key_here
```

### Configuração de Retenção

Editar `/scripts/backup-db.ts`:

```typescript
const config: BackupConfig = {
  backupDir: path.join(process.cwd(), 'backups'),
  retentionDays: 30,  // ← Alterar aqui (padrão: 30 dias)
  neonApiKey: process.env.NEON_API_KEY
};
```

---

## 📅 Agendamento Automático

### Opção 1: Cron Job (Linux/Mac)

Editar crontab:
```bash
crontab -e
```

Adicionar linha (backup diário às 3h da manhã):
```cron
0 3 * * * cd /caminho/do/projeto && npm run db:backup >> logs/backup.log 2>&1
```

### Opção 2: GitHub Actions (recomendado)

Criar `.github/workflows/backup.yml`:

```yaml
name: Daily Database Backup

on:
  schedule:
    # Diariamente às 03:00 UTC
    - cron: '0 3 * * *'
  workflow_dispatch: # Permite execução manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npm run db:backup

      - name: Upload backup artifact
        uses: actions/upload-artifact@v3
        with:
          name: backup-${{ github.run_id }}
          path: backups/
          retention-days: 30
```

### Opção 3: Replit Cron (se disponível)

Criar `.replit`:
```toml
[deployment]
run = ["npm", "start"]

[[deployment.cron]]
schedule = "0 3 * * *"
command = ["npm", "run", "db:backup"]
```

---

## 🗄️ Estrutura de Arquivos

```
/home/runner/workspace/
├── backups/                              # Diretório de backups (gitignored)
│   ├── backup-2025-10-05T20-30-00.sql   # Backup SQL completo
│   ├── backup-2025-10-04T20-30-00.sql
│   └── backup-2025-10-03T20-30-00.json  # Backup JSON fallback
│
├── scripts/
│   ├── backup-db.ts                      # Script de backup
│   └── restore-db.ts                     # Script de restore
│
└── docs/
    └── BACKUP-RESTORE.md                 # Esta documentação
```

---

## 🔧 Troubleshooting

### Erro: `pg_dump: command not found`

**Problema**: PostgreSQL client tools não instalados

**Solução**:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# Mac
brew install postgresql

# Ou usar fallback JSON automático
```

### Erro: `DATABASE_URL não configurada`

**Problema**: Variável de ambiente não definida

**Solução**:
```bash
# Verificar .env
cat .env | grep DATABASE_URL

# Ou definir temporariamente
export DATABASE_URL="postgresql://..."
npm run db:backup
```

### Backup muito pequeno (< 1KB)

**Problema**: Backup pode estar vazio ou corrompido

**Verificação**:
```bash
# Ver tamanho do último backup
ls -lh backups/ | tail -1

# Ver conteúdo (primeiras linhas)
head -n 20 backups/backup-*.sql
```

**Solução**:
- Verificar se database está acessível
- Testar conexão: `npm run db:studio`
- Executar backup novamente

### Restore falha com "permission denied"

**Problema**: Permissões do banco de dados

**Solução**:
```bash
# Usar conta com permissões de superuser
# Ou ajustar permissões:
GRANT ALL PRIVILEGES ON DATABASE mesc TO your_user;
```

---

## 📊 Monitoramento

### Verificar Status dos Backups

```bash
# Listar backups com detalhes
ls -lth backups/

# Contar backups disponíveis
ls backups/backup-*.sql | wc -l

# Ver tamanho total ocupado
du -sh backups/

# Backup mais recente
ls -t backups/ | head -1
```

### Logs de Backup

Redirecionar saída para arquivo de log:

```bash
npm run db:backup >> logs/backup-$(date +%Y-%m-%d).log 2>&1
```

---

## 🔐 Segurança

### Boas Práticas

1. **NUNCA versionar backups no Git**
   - ✅ Já incluído no `.gitignore`
   - Backups contêm dados sensíveis

2. **Armazenar backups off-site**
   - Upload para S3, Google Drive, ou similar
   - Manter cópias em múltiplas localidades

3. **Criptografar backups**
   ```bash
   # Exemplo: criptografar com GPG
   gpg --encrypt --recipient your@email.com backup.sql
   ```

4. **Testar restauração regularmente**
   - Fazer restore teste mensalmente
   - Verificar integridade dos dados

5. **Proteger acesso aos backups**
   ```bash
   # Restringir permissões do diretório
   chmod 700 backups/
   chmod 600 backups/*.sql
   ```

---

## 🎯 Checklist de Disaster Recovery

### Preparação (fazer agora):
- [x] Sistema de backup implementado
- [x] Scripts testados (backup + restore)
- [ ] Backup automático agendado (cron/GitHub Actions)
- [ ] Backup off-site configurado
- [ ] Documentação de recovery lida pela equipe
- [ ] Teste de restore realizado

### Em caso de desastre:

1. **Manter a calma** 🧘
2. **Parar a aplicação** (evitar corrupção)
   ```bash
   # Parar servidor
   pkill -f "node.*dist/index.js"
   ```

3. **Avaliar dano**
   ```bash
   # Conectar ao banco e verificar
   npm run db:studio
   ```

4. **Restaurar backup**
   ```bash
   npm run db:restore
   # Selecionar backup mais recente ANTES do incidente
   ```

5. **Verificar integridade**
   - Fazer login no sistema
   - Verificar dados críticos
   - Testar funcionalidades principais

6. **Reiniciar aplicação**
   ```bash
   npm start
   ```

7. **Documentar incidente**
   - O que aconteceu?
   - Quando aconteceu?
   - Quanto dado foi perdido?
   - Como prevenir no futuro?

---

## 📈 Melhorias Futuras

### Planejado
- [ ] Backup incremental (apenas mudanças)
- [ ] Compressão automática (.sql.gz)
- [ ] Upload automático para cloud (S3/GCS)
- [ ] Notificações de backup (email/Slack)
- [ ] Dashboard de monitoramento
- [ ] Backup de arquivos (uploads, etc)

### Considerações
- **Point-in-Time Recovery**: Neon Database oferece nativamente
- **Read Replicas**: Para queries de leitura pesada
- **High Availability**: Configurar failover automático

---

## 📞 Suporte

**Em caso de problemas críticos:**

1. Verificar logs: `npm run db:backup` e ver output
2. Testar conexão: `npm run db:studio`
3. Contatar equipe de DevOps
4. Documentação Neon: https://neon.tech/docs
5. PostgreSQL docs: https://www.postgresql.org/docs/

---

**Última atualização**: Outubro 2025
**Versão**: 1.0
**Responsável**: Equipe MESC DevOps
