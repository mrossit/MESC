# MESC Native - RLS Hardening

**Data:** 25/07/2026
**Escopo:** fechar o schema `public` do Supabase nativo para o Data API, preservando a API MESC hospedada na Vercel.

## Modelo De Acesso

O app iOS/Android conversa apenas com `https://saojudastadeu.app/api/mobile/v1`. Essa API usa `DATABASE_URL` no servidor e aplica autenticacao, escopo de comunidade, auditoria e idempotencia antes de chegar ao PostgreSQL.

O app nao usa `supabase-js`, chaves publicas do Supabase, nem chamadas diretas a `/rest/v1`. Portanto, `anon` e `authenticated` nao devem ter acesso direto as tabelas em `public`.

## Migration

`migrations/0012_native_data_api_rls_hardening.sql`:

- revoga privilegios de tabelas e sequencias de `anon` e `authenticated`;
- remove esses privilegios como padrao para futuras tabelas criadas pelo papel `postgres`;
- habilita RLS nas 36 tabelas que ainda estavam abertas;
- nao usa `FORCE ROW LEVEL SECURITY`, preservando o acesso do owner usado pela API do servidor.

## Aplicar No Banco Nativo

```bash
CONFIRM_NATIVE_RLS_HARDENING=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:migrate:native-rls

DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:validate:native-rls
```

O comando recusa o host conhecido do banco atual/Replit, salvo confirmacao explicita de emergencia. Nao aplique no banco legado.

## Verificacao Funcional

Depois da validacao de privilegios, confirmar pelo menos:

1. login mobile e renovacao de sessao;
2. Missao e Escalas;
3. Formacao e conclusao de secao;
4. questionario e confirmacao de presenca;
5. preferencias e registro de notificacao do dispositivo.

O validador comprova que cada tabela protegida tem RLS ativo e nao pode ser lida por `anon` ou `authenticated` via Data API.

O Security Advisor pode exibir `rls_enabled_no_policy` como informacao. Neste projeto isso e intencional: os papeis do Data API tambem nao possuem privilegios nas tabelas, e todo acesso passa pela API MESC do servidor.
