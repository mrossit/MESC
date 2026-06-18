# Native Store Release

Data: 18/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name no binario: `MESC`
- App name na App Store: `MESC São Judas Tadeu`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Version: `5.4.3`
- Native build number / Android version code: `50410`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`

O app id ja foi registrado no App Store Connect. Trate `app.saojudastadeu.mesc` como definitivo para iOS.

Configuracao inicial de loja:
- iOS: alvo inicial iPhone-only, orientacao retrato.
- Android: orientacao retrato, backup automatico desativado e cleartext desativado.

## Status em 18/06/2026

- App Store Connect: app criado com Apple ID `6781440567`.
- iOS: archive e export App Store OK; upload inicial do build `5.4.3 (50403)` concluido.
- iOS UX update: build `5.4.3 (50404)` enviado ao App Store Connect em 17/06/2026, delivery UUID `dfd19d5a-5c61-4337-a58b-f47af29915c7`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS next pass: build `5.4.3 (50405)` enviado ao App Store Connect em 18/06/2026, delivery UUID `8d529ddb-a5a4-4f07-b87b-870bd90ef17d`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS responsive fix: build `5.4.3 (50406)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `90a12886-d8f2-40be-96af-01812b0f83d6`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS responsive final: build `5.4.3 (50408)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `66e54856-cefb-48f3-8a8d-b2c9a263695d`.
- iOS polish follow-up: build `5.4.3 (50409)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `2a48c4dc-1dbd-46b2-bd0e-15109254c9aa`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS notch/data follow-up: build `5.4.3 (50410)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `5f1a98a0-6338-4d2c-a4d4-a2bf422d1413`; inclui status bar transparente/overlay, fundo continuo no login, rodape mobile ajustado e auditoria de mocks no data doctor; validado em simulador iPhone 17 Pro claro/escuro.
- Dados staging: Supabase `mesc-staging` recebeu a escala oficial de junho/2026 com 321 linhas, 26 datas e 5 vagas `VACANTE`; foram criados 10 usuarios placeholder apenas para staging para validar ministros presentes na planilha e ausentes em `users`.
- TestFlight: build `5.4.3 (50403)` processado como `Ready to Submit`; grupo interno `MESC Interno` criado com 1 build e 1 tester convidado. Substituir por `50410` apos processamento.
- Android: SDK 36 instalado localmente; `:app:assembleDebug` OK; `:app:bundleRelease` OK.
- Android AAB assinado: `android/app/build/outputs/bundle/release/app-release.aab`.
- Upload key Android local: `android/keystores/mesc-upload-key.jks`, ignorada pelo Git.
- Env local de assinatura Android: `.env.android-release.local`, ignorado pelo Git.
- Google Play Console: conta de desenvolvedor criada com ID `8424478179778617108`; a criacao de apps ainda esta bloqueada ate concluir verificacao de identidade, confirmacao de acesso a um aparelho Android real pelo app Play Console e verificacao do telefone de contato.

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
  -exportOptionsPlist "$PWD/build/ios/ExportOptions.plist" \
  -allowProvisioningUpdates

xcrun altool --upload-app \
  -f "$PWD/build/ios/upload/App.ipa" \
  --type ios \
  --api-key 53CSXQC7YK \
  --api-issuer d1513888-2c5a-4569-9163-cf5c01460a33
```

O upload `5.4.3 (50405)` foi aceito pelo App Store Connect, mas o TestFlight apontou problemas de responsividade no topo e na barra inferior. O build `5.4.3 (50408)` foi publicado com o ajuste final de safe-area/status bar, barra inferior e navegacao do menu lateral. O build `5.4.3 (50409)` corrigiu a selecao duplicada Escalas/Trocas no rodape, melhorou superficies glass no shell nativo e adicionou o gate de dados para validar/importar a escala oficial de junho/2026. O build `5.4.3 (50410)` corrige a causa raiz do corte no notch/login: status bar iOS em overlay transparente e CSS continuo por tras da Dynamic Island. A etapa seguinte e aguardar o processamento do `50410`, trocar o build do grupo `MESC Interno`, completar metadados, privacidade, screenshots, conta de reviewer e entao enviar para review.

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

- App Store: preencher metadados de loja, privacidade, screenshots e informacoes de review.
- Google Play: concluir as verificacoes obrigatorias da conta de desenvolvedor Play (`identidade`, `aparelho Android real`, `telefone de contato`) para liberar o botao `Criar app`.
- Google Play: criar app no Play Console, configurar Play App Signing, enviar o AAB assinado e montar trilha Internal testing.
- Google Play: guardar backup seguro da upload key Android fora do repositorio.
- Criar conta reviewer.
- Configurar screenshots, descricao curta, descricao completa, categoria e politica de privacidade.
- Validar login, logout, sessao expirada, questionario, escala, substituicao e exclusao de conta em dispositivos reais.
