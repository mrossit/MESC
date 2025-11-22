# 🚨 MIGRAÇÃO URGENTE - PRODUÇÃO

## Problema

Todos os usuários estão recebendo erro ao fazer login após o deploy:
```
"column \"deleted_at\" does not exist"
```

## Causa

O schema foi atualizado para incluir colunas de soft delete (`deleted_at` e `is_deleted`) em 3 tabelas:
- `users`
- `questionnaire_responses`  
- `schedules`

Essas colunas foram criadas no banco de **desenvolvimento**, mas NÃO no banco de **produção**.

## Solução

Execute o arquivo SQL `add-soft-delete-columns-production.sql` no banco de dados de **PRODUÇÃO**.

### Passo a Passo

#### Opção 1: Via Replit Database Pane

1. Abra o Replit
2. Clique em "Database" no painel esquerdo
3. Selecione o banco de **PRODUÇÃO** (PostgreSQL)
4. Cole o conteúdo do arquivo `add-soft-delete-columns-production.sql`
5. Clique em "Run Query"

#### Opção 2: Via Shell/Terminal

```bash
# Conectar ao banco de produção
psql $DATABASE_URL

# Copiar e colar o conteúdo do arquivo add-soft-delete-columns-production.sql
\i scripts/add-soft-delete-columns-production.sql

# Verificar se funcionou
\d users
\d questionnaire_responses
\d schedules
```

#### Opção 3: Via Cliente PostgreSQL (pgAdmin, DBeaver, etc)

1. Conecte ao banco de produção usando a string de conexão `DATABASE_URL`
2. Abra uma nova query
3. Cole o conteúdo de `add-soft-delete-columns-production.sql`
4. Execute

## Verificação

Após executar a migração, teste o login:

```bash
curl -X POST https://saojudastadeu.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rossit@icloud.com","password":"123pEgou$&@"}'
```

Deve retornar:
```json
{"success":true,"token":"...","user":{...}}
```

## Notas Importantes

- ✅ O SQL usa `IF NOT EXISTS`, então é seguro executar múltiplas vezes
- ✅ Não há perda de dados - apenas adiciona colunas novas
- ✅ Os valores default são aplicados automaticamente (`is_deleted = false`)
- ⚠️ Execute APENAS no banco de **PRODUÇÃO**
- ⚠️ O banco de desenvolvimento JÁ TEM essas colunas

## Prevenção Futura

Para evitar esse problema no futuro, sempre que modificar o schema (`shared/schema.ts`):

1. Execute `npm run db:push` no desenvolvimento (já feito)
2. Execute a mesma migração SQL em produção ANTES do deploy
3. Ou use ferramentas de migração automática (Drizzle Kit com migrations)
