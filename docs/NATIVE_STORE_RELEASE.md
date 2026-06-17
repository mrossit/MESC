# Native Store Release

Data: 17/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name no binario: `MESC`
- App name na App Store: `MESC São Judas Tadeu`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Version: `5.4.3`
- Native build number / Android version code: `50403`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`

O app id ja foi registrado no App Store Connect. Trate `app.saojudastadeu.mesc` como definitivo para iOS.

Configuracao inicial de loja:
- iOS: alvo inicial iPhone-only, orientacao retrato.
- Android: orientacao retrato, backup automatico desativado e cleartext desativado.

## Status em 17/06/2026

- App Store Connect: app criado com Apple ID `6781440567`.
- iOS: archive e export App Store OK; upload do build `5.4.3 (50403)` concluido e em processamento no TestFlight.
- Android: SDK 36 instalado localmente; `:app:assembleDebug` OK; `:app:bundleRelease` OK.
- Android AAB assinado: `android/app/build/outputs/bundle/release/app-release.aab`.
- Upload key Android local: `android/keystores/mesc-upload-key.jks`, ignorada pelo Git.
- Env local de assinatura Android: `.env.android-release.local`, ignorado pelo Git.

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

## iOS build e upload

Com o archive ja gerado:

```bash
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/ios/MESC.xcarchive" \
  -allowProvisioningUpdates \
  archive

xcodebuild -exportArchive \
  -archivePath "$PWD/build/ios/MESC.xcarchive" \
  -exportPath "$PWD/build/ios/upload" \
  -exportOptionsPlist "$PWD/build/ios/UploadOptions.plist" \
  -allowProvisioningUpdates
```

O upload atual foi aceito pelo App Store Connect. A etapa seguinte e aguardar o processamento do build, completar metadados, privacidade, screenshots, conta de reviewer e entao enviar para review.

## Android signing e AAB

O Gradle assina release somente quando todas as variaveis abaixo existem:

```bash
MESC_ANDROID_KEYSTORE_PATH=/caminho/mesc-upload-key.jks
MESC_ANDROID_KEYSTORE_PASSWORD=...
MESC_ANDROID_KEY_ALIAS=mesc-upload
MESC_ANDROID_KEY_PASSWORD=...
```

No Mac de release, carregue o arquivo local ignorado pelo Git e gere o AAB:

```bash
source ./.env.android-release.local
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

cd android
./gradlew :app:bundleRelease
```

Validacoes feitas:

```bash
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab
bundletool validate --bundle android/app/build/outputs/bundle/release/app-release.aab
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

- App Store: aguardar processamento do build no TestFlight e preencher metadados de loja.
- Google Play: criar app no Play Console, configurar Play App Signing, enviar o AAB assinado e montar trilha Internal testing.
- Google Play: guardar backup seguro da upload key Android fora do repositorio.
- Criar conta reviewer.
- Configurar screenshots, descricao curta, descricao completa, categoria e politica de privacidade.
- Validar login, logout, sessao expirada, questionario, escala, substituicao e exclusao de conta em dispositivos reais.
