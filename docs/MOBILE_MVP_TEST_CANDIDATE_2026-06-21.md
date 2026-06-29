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
- Base nativa de configuracao de missas/eventos aplicada no staging em 2026-06-24.

## Status Do Candidato

- Contrato mobile, migrations, seed demo, smoke tests e notificacoes P0: cobertos no PR `#38`.
- Visual nativo inicial: aplicado com vinho liturgico, ouro velho, marfim, grafite, Cinzel em titulos e glass discreto.
- Capacitor sync: validado localmente para Android e iOS.
- Capacitor doctor: iOS e Android OK.
- Android debug APK: gerado localmente.
- iOS simulator build: gerado localmente sem assinatura.
- iOS TestFlight: build `5.4.3 (50434)` enviado em 28/06/2026 para substituir o `50431/50432` nos testers internos.

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
- iOS IPA TestFlight: `build/ios/upload/App.ipa` apos archive/export assinado.

Os artefatos acima sao gerados localmente e nao devem ser commitados.

## TestFlight

- Versao: `5.4.3`
- Build: `50434`
- Delivery/build ID: `be63e01f-6f58-4f39-8841-d11ec51729e0`
- Status App Store Connect: `VALID`.
- Distribuicao: visivel no grupo interno `MESC Interno` no TestFlight.
- Changelog: `MVP nativo P0 com preview e publicacao de escala do coordenador, respostas acionaveis, lembretes para pendentes/cadastros incompletos, sessao biometrica renovavel sem salvar senha, ajustes de safe area para notch/status bar/toasts/menu lateral, Liquid Glass mais aparente e estavel no login, shell, header, cards, tab bar, bottom bar e menu lateral, push nativo com permissao do aparelho e registro APNS/FCM, notificacoes semanticas sem dependencia de Web Push/PWA, prontidao de escala por comunidade, calendario de escalas com navegacao mes/ano, visualizacoes Calendario/Tabela/Lista, fallback para questionario publicado do proximo mes, links mobile reais, Minha Missao, escalas, substituicoes e notificacoes.`

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

Status atual: o banco staging nativo esta populado, a API nativa esta publicada em `https://saojudastadeu.app` e o build iOS `5.4.3 (50434)` esta `VALID` no App Store Connect e visivel no grupo interno `MESC Interno`.

## Push Nativo

O build `5.4.3 (50428)` remove a dependencia de Push API de navegador dentro do app nativo. Em iOS/Android, a tela de Configuracoes usa permissao do aparelho via Capacitor, registra `pushToken`, `pushProvider` e `pushEnabled` em `mobile_devices`, e o backend tenta entrega remota por APNS/FCM antes de cair para o Web Push PWA. As rotas semanticas de questionario, escala e avisos tambem disparam notificacoes nativas mesmo quando o Web Push/PWA esta desativado.

O build `5.4.3 (50429)` reforca o Liquid Glass sem trocar a identidade visual: tint branco/cinza de baixa opacidade, blur/saturacao mais fortes, brilho refrativo diagonal, bordas claras/douradas, sombras internas e fundos lineares sutis para o material ficar perceptivel no app nativo.

O build `5.4.3 (50430)` substitui o `50429` por corrigir a regressao de posicionamento causada por `position: relative` nas superficies de glass compartilhadas, preservando a tab bar fixa no rodape, o header sticky e o sheet lateral.

O build `5.4.3 (50431)` estabiliza o Liquid Glass e o layout mobile apos a regressao visual do sheet/tour e valida o smoke de publicacao de escala isolado dos dados demo.

O build `5.4.3 (50434)` reforca o Liquid Glass no app todo, aplica glass ao bottom bar, clareia o menu lateral no modo claro, aumenta discretamente os logos e restaura Escalas com navegacao de mes/ano, botao Hoje e modos Calendario, Tabela e Lista.

Para envio remoto real em producao, ainda precisam existir as credenciais APNS/FCM no ambiente da API. Sem elas, o app registra o token e a UI fica correta, mas o backend registra skip operacional de entrega remota.

## Prontidao De Escala No Staging

Em 2026-06-24 foi aplicada a migration `0009_native_mass_configuration_baseline.sql` e o seed canonico de horarios/eventos em `mesc-native-staging`.

Resultado validado por comunidade demo:

- `mobile-demo-matriz`: 12 horarios legados, 15 configuracoes dinamicas e 32 eventos especiais;
- `mobile-demo-sao-lucas`: 12 horarios legados, 15 configuracoes dinamicas e 32 eventos especiais.

Smoke da API em `https://saojudastadeu.app`:

- login coordenador demo: `200`;
- `GET /api/mobile/v1/admin/schedules/readiness?month=2026-07`: `200`;
- `massConfig.configuredSlots`: `12`.

Bloqueio esperado restante para gerar/publicar escala definitiva: resposta de questionario do mes e encerramento do questionario. Isso deixa o TestFlight pronto para testar o fluxo real de resposta do ministro e revisao do coordenador.

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
