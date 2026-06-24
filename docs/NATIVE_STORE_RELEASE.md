# Native Store Release

Data: 18/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name no binario: `MESC`
- App name na App Store: `MESC São Judas Tadeu`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Version: `5.4.3`
- iOS native build number: `50420`
- Android version code: `50418`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`
- PWA atual durante a transicao: `https://saojudastadeu.replit.app`

O app id ja foi registrado no App Store Connect. Trate `app.saojudastadeu.mesc` como definitivo para iOS.

Configuracao inicial de loja:
- iOS: alvo inicial iPhone-only, orientacao retrato.
- Android: orientacao retrato, backup automatico desativado e cleartext desativado.

## Status em 23/06/2026

- App Store Connect: app criado com Apple ID `6781440567`.
- iOS: archive e export App Store OK; upload inicial do build `5.4.3 (50403)` concluido.
- iOS UX update: build `5.4.3 (50404)` enviado ao App Store Connect em 17/06/2026, delivery UUID `dfd19d5a-5c61-4337-a58b-f47af29915c7`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS next pass: build `5.4.3 (50405)` enviado ao App Store Connect em 18/06/2026, delivery UUID `8d529ddb-a5a4-4f07-b87b-870bd90ef17d`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS responsive fix: build `5.4.3 (50406)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `90a12886-d8f2-40be-96af-01812b0f83d6`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS responsive final: build `5.4.3 (50408)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `66e54856-cefb-48f3-8a8d-b2c9a263695d`.
- iOS polish follow-up: build `5.4.3 (50409)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `2a48c4dc-1dbd-46b2-bd0e-15109254c9aa`; aguardando processamento/TestFlight aparecer no App Store Connect.
- iOS notch/data follow-up: build `5.4.3 (50410)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `5f1a98a0-6338-4d2c-a4d4-a2bf422d1413`; inclui status bar transparente/overlay, fundo continuo no login, rodape mobile ajustado e auditoria de mocks no data doctor; validado em simulador iPhone 17 Pro claro/escuro.
- iOS auth/data follow-up: build `5.4.3 (50411)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `7e841bb7-a274-4e97-bf27-e510deee8e4a`; corrige `401` em telas com `fetch` manual ao anexar automaticamente `Authorization: Bearer` para chamadas `/api` e impede uso de cache auth sem token.
- iOS biometria/glass follow-up: build `5.4.3 (50412)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `9af15a9e-665e-4d7d-8684-88d6db87d08b`; adiciona entrada nativa com Face ID/Touch ID/biometria via Keychain/Keystore, painel em Configuracoes para ativar/desativar biometria, limpeza da credencial no logout/exclusao de conta e refinamento Liquid Glass em login/header/nav/cards.
- iOS sessao/biometria fix: build `5.4.3 (50413)` validado e enviado ao App Store Connect em 18/06/2026, delivery UUID `141a195c-1b37-492a-abf9-51e586dcfd09`; corrige regressao da `50412` preservando credenciais biometricas no logout comum, mantendo `token`/`auth_token`/`session_token` durante limpeza de cache, restaurando sessao valida ao reabrir o app e impedindo popup automatico de Face ID logo apos tocar em Sair.
- iOS UX/auth follow-up: build `5.4.3 (50414)` validado e enviado ao App Store Connect em 19/06/2026, delivery UUID `1aabdea2-10e7-48ec-9e8f-389452bfbf6e`; reduz prompts repetidos de Face ID, move controle de som para o header, carrega fotos autenticadas por blob com token e refina o menu inferior para um padrao mais proximo do tab bar da App Store.
- iOS MVP P0/TestFlight candidate: build `5.4.3 (50415)` validado, enviado e distribuido para testers internos em 21/06/2026, delivery UUID `1d9608d9-5bfb-4bd5-bfc8-b4551877c59e`; inclui fundacao mobile P0 do PR `#38`, eventos de notificacao mobile, SDK/contrato, smoke tests, visual liturgico inicial e esteira `mobile:mvp:check`.
- iOS native staging API candidate: build `5.4.3 (50416)` validado e enviado ao App Store Connect em 22/06/2026, delivery UUID `5e6ffa62-bd2b-48ae-9710-56c32d8de29d`; usa temporariamente `https://mesc-native-api-marco-rossits-projects.vercel.app` para testar o backend nativo Supabase/Vercel antes da virada DNS de `https://saojudastadeu.app`.
- iOS native cache/login fix: build `5.4.3 (50417)` validado e enviado ao App Store Connect em 22/06/2026, delivery UUID `cde1df5f-9f2c-4d9b-ae47-449a17c7e5dc`; desativa Service Worker no runtime Capacitor, limpa Cache API no app nativo e diferencia cache interno por build, evitando que TestFlight continue servindo assets do build anterior apontando para `https://saojudastadeu.app`.
- iOS native coordinator questionnaire candidate: build `5.4.3 (50418)` validado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 23/06/2026, delivery/build ID `1eedd172-ed10-4783-888c-99f74c23f40b`; inclui o painel nativo do coordenador, respostas de questionario, pendentes e diagnostico de cadastro/readiness apos merge do PR `#44`.
- iOS native questionnaire fallback candidate: build `5.4.3 (50419)` validado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 23/06/2026, delivery/build ID `c135e769-997c-4205-8fd7-93b61f46f8a7`; inclui fallback para questionario publicado do proximo mes, deep links mobile reais e sincronizacao do seletor de mes no fluxo ministro/coordenador.
- iOS native biometric loop fix candidate: build `5.4.3 (50420)` validado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 23/06/2026, delivery/build ID `330303f8-c8aa-413b-96fa-99338a0cf152`; inclui as correcoes do `50419` e trava/cooldown para impedir loop de Face ID, guarda contra prompts concorrentes e renovacao da credencial biometrica apos login por senha.
- App Store version: `5.4.3` em `PREPARE_FOR_SUBMISSION`, build `50414` selecionada para loja, release `AFTER_APPROVAL`.
- App Store metadata pt-BR: nome, subtitulo, descricao, palavras-chave, texto promocional, URLs de marketing/suporte e privacy policy preenchidos em 18/06/2026.
- Dados staging: Supabase `mesc-staging` recebeu a escala oficial de junho/2026 com 321 linhas, 26 datas e 5 vagas `VACANTE`; foram criados 10 usuarios placeholder apenas para staging para validar ministros presentes na planilha e ausentes em `users`.
- TestFlight: build `5.4.3 (50420)` em estado `VALID`, associado ao grupo interno `MESC Interno` e pronto para teste fiel contra `https://saojudastadeu.app`.
- DNS nativo: `saojudastadeu.app` e `www.saojudastadeu.app` resolvem para a Vercel (`76.76.21.21`) e a home nativa responde `200`.
- Decisao de ambiente nativo: manter o MESC atual no Replit em `https://saojudastadeu.replit.app` e reservar `https://saojudastadeu.app` para o novo ambiente nativo com banco proprio. Ver `docs/NATIVE_ENVIRONMENT_SPLIT_2026-06-21.md`.
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

`build:mobile` gera os assets web com `VITE_API_URL=https://saojudastadeu.app`, porque o app nativo roda em `capacitor://localhost` no iOS e `https://localhost` no Android; chamadas relativas para `/api` nao devem apontar para o WebView local. Durante a transicao, o PWA atual permanece acessivel em `https://saojudastadeu.replit.app`.

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

O upload `5.4.3 (50405)` foi aceito pelo App Store Connect, mas o TestFlight apontou problemas de responsividade no topo e na barra inferior. O build `5.4.3 (50408)` foi publicado com o ajuste final de safe-area/status bar, barra inferior e navegacao do menu lateral. O build `5.4.3 (50409)` corrigiu a selecao duplicada Escalas/Trocas no rodape, melhorou superficies glass no shell nativo e adicionou o gate de dados para validar/importar a escala oficial de junho/2026. O build `5.4.3 (50410)` corrige a causa raiz do corte no notch/login: status bar iOS em overlay transparente e CSS continuo por tras da Dynamic Island. O build `5.4.3 (50411)` corrige a causa raiz dos dados zerados/401 no app nativo: chamadas manuais para `/api` agora recebem o token JWT e o auth guard nao confia em usuario cacheado sem token. O build `5.4.3 (50412)` adiciona a primeira fatia de biometria nativa e melhora o Liquid Glass. O build `5.4.3 (50413)` corrige a regressao de sessao/biometria vista em TestFlight. O build `5.4.3 (50414)` corrige a repeticao de prompts biometricos apos login manual, move o som para o header, busca fotos protegidas com token e ajusta o tab bar inferior. O build `5.4.3 (50415)` e o candidato MVP P0 distribuido no TestFlight interno. O build `5.4.3 (50416)` aponta para a API nativa publica na Vercel, validada contra Supabase, para permitir teste fiel antes da virada DNS. O build `5.4.3 (50417)` desativa Service Worker/cache PWA no Capacitor e substitui o `50416` nos testes de login. O build `5.4.3 (50418)` leva o fluxo de questionario/readiness do coordenador para teste interno. O build `5.4.3 (50419)` corrige a abertura do questionario vigente a partir da home quando o questionario publicado pertence ao proximo mes. O build `5.4.3 (50420)` substitui o `50419` no TestFlight por adicionar trava contra loop de Face ID e atualizar a sessao salva no Keychain apos login por senha.

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
- `PRODUCTION_BASE_URL=https://saojudastadeu.replit.app npm run release:check:health` enquanto o PWA atual seguir no Replit
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
