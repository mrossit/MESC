# MESC Native - MVP Test Candidate

Data: 2026-06-21
Branch: `codex/ios-release-next-pass`
PR: `#38`

Este documento registra o primeiro caminho repetivel para transformar a fundacao mobile P0 em um MVP testavel no app nativo.

## Status Do Candidato

- Contrato mobile, migrations, seed demo, smoke tests e notificacoes P0: cobertos no PR `#38`.
- Visual nativo inicial: aplicado com vinho liturgico, ouro velho, marfim, grafite, Cinzel em titulos e glass discreto.
- Capacitor sync: validado localmente para Android e iOS.
- Capacitor doctor: iOS e Android OK.
- Android debug APK: gerado localmente.
- iOS simulator build: gerado localmente sem assinatura.

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

Os artefatos acima sao gerados localmente e nao devem ser commitados.

## API De Teste

Por padrao, o build mobile usa producao:

```bash
npm run build:mobile
```

Para demo/staging, defina explicitamente a URL antes de sincronizar:

```bash
VITE_API_URL="$STAGING_OR_DEMO_BASE_URL" npm run mobile:sync
```

Isso evita recompilar um app demo apontando acidentalmente para `https://saojudastadeu.app`.

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

## Bloqueios Para Beta Real

- PR `#38` precisa estar mergeado no ambiente que servira a API do app.
- Aplicar migrations mobile no banco alvo antes do teste.
- Rodar seed demo somente em ambiente demo descartavel.
- Para Android release, usar upload key local fora do Git.
- Para iOS TestFlight, gerar archive assinado no Xcode/App Store Connect.
