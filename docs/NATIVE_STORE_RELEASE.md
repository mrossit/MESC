# Native Store Release

Data: 17/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name: `MESC`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Version: `5.4.3`
- Native build number / Android version code: `50403`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`

O app id ainda pode ser alterado no repositorio antes de registrar o app nas lojas. Depois de registrar no App Store Connect ou Google Play Console, trate como definitivo.

Configuracao inicial de loja:
- iOS: alvo inicial iPhone-only, orientacao retrato.
- Android: orientacao retrato, backup automatico desativado e cleartext desativado.

## Scripts

```bash
npm run build:mobile
npm run mobile:doctor
```

`build:mobile` gera os assets web com `VITE_API_URL=https://saojudastadeu.app`, porque o app nativo roda em `capacitor://localhost` no iOS e `https://localhost` no Android; chamadas relativas para `/api` nao devem apontar para o WebView local.

## Gerar plataformas nativas

As plataformas nativas ja foram geradas em `ios/` e `android/`. Para atualizar os assets antes de abrir Xcode/Android Studio:

```bash
npm run mobile:assets
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
- Validar build/archive no Xcode com a conta Apple Developer.
- Validar Android App Bundle assinado no Android Studio/Play Console.

## Pendencias nativas

- Revisar icone e splash finais com o usuario antes da submissao publica.
- Revisar nome exibido nas lojas.
- Confirmar bundle id antes de registrar nas lojas.
- Criar conta reviewer.
- Configurar screenshots, descricao curta, descricao completa, categoria e politica de privacidade.
- Validar login, logout, sessao expirada, questionario, escala, substituicao e exclusao de conta em dispositivos reais.
