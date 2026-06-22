# MESC Native - Deploy Da API Na Vercel

Data: 2026-06-22

Este documento prepara o deploy da API do MVP nativo fora do Replit, apontando para o Supabase `mesc-native-staging`.

## Decisao

- O PWA atual continua em `https://saojudastadeu.replit.app`.
- A API/web shell do app nativo deve usar `https://saojudastadeu.app`.
- A Vercel deve publicar este repositorio como app Express, usando `index.js` na raiz como entrypoint para o bundle `dist/index.js`.
- O runtime Vercel nao abre porta propria e nao depende do build estatico do PWA.
- O banco Supabase usa o driver `postgres-js`; bancos Neon continuam usando o driver Neon existente.

## Projeto Vercel

Configuracao versionada:

- Framework: `express`
- Region: `gru1` (Sao Paulo)
- Fluid compute: ativo
- Function principal: `index.js`, carregando `dist/index.js`
- Install command: `npm ci --include=dev`, porque o build remoto usa Vite/esbuild de `devDependencies`.
- Build command: `npm run build`

## Variaveis Necessarias

Definir no projeto Vercel antes do primeiro smoke:

```bash
NODE_ENV=production
APP_URL=https://saojudastadeu.app
DATABASE_URL=<Supabase Postgres URL com sslmode=require>
POSTGRES_MAX_CONNECTIONS=5
ALLOWED_ORIGINS=https://saojudastadeu.app,capacitor://localhost,https://localhost
JWT_SECRET=<64+ caracteres aleatorios>
SESSION_SECRET=<32+ caracteres aleatorios>
ENCRYPTION_KEY=<64 caracteres hexadecimais>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<chave Resend>
```

Observacoes:

- Para Supabase em Vercel, prefira a Session Pooler URL se a conexao direta IPv6 falhar no runtime.
- O staging demo ja foi validado com seed P0; nao rode seed demo em banco real.
- `ENABLE_PUSH_NOTIFICATIONS=true` so deve ser ativado depois de configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.

## Validacao Do Deploy

Depois do preview publicar:

```bash
APP_URL="$VERCEL_PREVIEW_URL" npm run release:check:health
```

Smoke esperado:

```bash
curl "$VERCEL_PREVIEW_URL/health"
curl "$VERCEL_PREVIEW_URL/health/ready"
curl -i "$VERCEL_PREVIEW_URL/api/mobile/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"mobile.ministro.a@example.test","password":"MobileDemo123!","keepSignedIn":true,"deviceId":"vercel-smoke-device","platform":"ios","appVersion":"staging"}'
```

O dominio `saojudastadeu.app` so deve ser apontado para a Vercel depois que `/health/ready` e o smoke mobile P0 passarem no preview.
