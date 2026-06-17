# Native Store Release

Data: 17/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name: `MESC`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`

O app id ainda pode ser alterado no repositorio antes de registrar o app nas lojas. Depois de registrar no App Store Connect ou Google Play Console, trate como definitivo.

## Scripts

```bash
npm run build:mobile
npm run mobile:doctor
```

`build:mobile` gera os assets web com `VITE_API_URL=https://saojudastadeu.app`, porque o app nativo roda em `capacitor://localhost` no iOS e `https://localhost` no Android; chamadas relativas para `/api` nao devem apontar para o WebView local.

## Gerar plataformas nativas

Execute apenas quando for abrir Xcode/Android Studio e preparar os assets finais:

```bash
npm run mobile:add:ios
npm run mobile:add:android
npm run mobile:sync
```

Depois:

```bash
npm run mobile:open:ios
npm run mobile:open:android
```

## Gates antes de TestFlight / Play Internal Testing

- `npm run release:check:local`
- `npm run mobile:doctor`
- `NODE_ENV=production npm run release:check:env`
- `PRODUCTION_BASE_URL=https://saojudastadeu.app npm run release:check:health`
- Smoke test no Replit Preview
- Smoke test em dispositivo real iOS/Android apos `cap sync`

## Pendencias nativas

- Gerar icone e splash finais.
- Revisar nome exibido nas lojas.
- Confirmar bundle id antes de registrar.
- Criar conta reviewer.
- Configurar screenshots, descricao curta, descricao completa, categoria e politica de privacidade.
- Validar login, logout, sessao expirada, questionario, escala, substituicao e exclusao de conta em dispositivos reais.
