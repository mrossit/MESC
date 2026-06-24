# MESC Native - MVP Test Candidate

Data: 2026-06-21
Branch: `codex/ios-release-next-pass`
PR: `#38`

Este documento registra o primeiro caminho repetivel para transformar a fundacao mobile P0 em um MVP testavel no app nativo.

Atualizacao de ambiente nativo:

- Branch de separacao/infra: `codex/native-domain-split`.
- PR de ambiente: `#39`.
- Supabase staging criado: `mesc-native-staging` (`sdochgpfjosmhrbztthr`, `sa-east-1`).
- Seed demo e schema P0/runtime aplicados no staging em 2026-06-21.

## Status Do Candidato

- Contrato mobile, migrations, seed demo, smoke tests e notificacoes P0: cobertos no PR `#38`.
- Visual nativo inicial: aplicado com vinho liturgico, ouro velho, marfim, grafite, Cinzel em titulos e glass discreto.
- Capacitor sync: validado localmente para Android e iOS.
- Capacitor doctor: iOS e Android OK.
- Android debug APK: gerado localmente.
- iOS simulator build: gerado localmente sem assinatura.
- iOS TestFlight: build `5.4.3 (50422)` validado no App Store Connect para substituir o `50421` nos testers internos.

## Comandos Validados

Build/sync mobile:

```bash
npm run mobile:sync
```

Doctor:

```bash
npx cap doctor
```

Android debug:

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run mobile:android:debug
```

iOS simulator:

```bash
npm run mobile:ios:simulator:build
```

Esteira completa:

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run mobile:mvp:check
```

## Artefatos Locais

- Android APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- iOS app de simulador: `build/ios-derived-data/Build/Products/Debug-iphonesimulator/App.app`
- iOS IPA TestFlight: `build/MESC-50422-export/App.ipa`

Os artefatos acima sao gerados localmente e nao devem ser commitados.

## TestFlight

- Versao: `5.4.3`
- Build: `50422`
- Delivery UUID: `7dd4cbc9-785e-42ec-813b-a7b094780692`
- Status App Store Connect: `VALID`
- Distribuicao: testers internos via TestFlight; vinculacao manual por API ao grupo interno nao e aceita pela Apple, validar disponibilidade no App Store Connect/TestFlight.
- Changelog: `MVP nativo P0 com respostas do coordenador acionaveis, lembretes para pendentes/cadastros incompletos, Face ID apenas por toque manual para eliminar loop de prompt, prontidao de escala por comunidade, fallback para questionario publicado do proximo mes, links mobile reais, Minha Missao, escalas, substituicoes e notificacoes.`

## API De Teste

Por padrao, o build mobile usa producao:

```bash
npm run build:mobile
```

Para a transicao nativa, `https://saojudastadeu.app` fica reservado ao novo ambiente do app nativo. O PWA atual continua em `https://saojudastadeu.replit.app`.

Para demo/staging, defina explicitamente a URL antes de sincronizar:

```bash
VITE_API_URL="$STAGING_OR_DEMO_BASE_URL" npm run mobile:sync
```

Isso evita recompilar um app demo apontando acidentalmente para `https://saojudastadeu.app` antes de o novo ambiente nativo estar pronto.

Status atual: o banco staging nativo esta populado, a API nativa esta publicada em `https://saojudastadeu.app` e o TestFlight `5.4.3 (50422)` esta validado no App Store Connect para o proximo teste fiel do MVP.

## Smoke Manual Do MVP

Com o ambiente demo/staging preparado:

1. Login mobile com `mobile.ministro.a@example.test` / `MobileDemo123!`.
2. Refresh token apos reabrir o app.
3. Abrir Minha Missao.
4. Abrir notificacoes e validar `eventKey`.
5. Responder questionario vigente.
6. Confirmar presenca em escala publicada.
7. Pedir substituicao em escala futura.
8. Validar replay seguro de idempotencia repetindo a mesma mutacao.
9. Login mobile com `mobile.coord.a@example.test` / `MobileDemo123!`.
10. Abrir Respostas do questionario, revisar pendentes/cadastros e enviar lembrete para pendentes ou cadastro incompleto.

## Bloqueios Para Beta Real

- `https://saojudastadeu.app` ja aponta para o ambiente nativo novo; o PWA atual permanece em `https://saojudastadeu.replit.app`.
- Supabase staging ja esta criado e populado; o deploy da API nativa usa o `DATABASE_URL` desse banco.
- Para Android release, usar upload key local fora do Git.
- Para iOS TestFlight, gerar archive assinado no Xcode/App Store Connect.
