# Native Store Release

Data: 18/06/2026

Este documento prepara o empacotamento nativo do MESC para App Store e Google Play usando Capacitor.

## Identidade inicial

- App name no binario: `MESC`
- App name na App Store: `MESC São Judas Tadeu`
- App id / bundle id / application id: `app.saojudastadeu.mesc`
- Version: `5.4.7`
- iOS native build number: `50454`
- Android version code: `50418`
- Web assets: `dist/public`
- API de producao no build mobile: `https://saojudastadeu.app`
- PWA atual durante a transicao: `https://saojudastadeu.replit.app`
- Backend baseline extra: `0010_native_adoration_draws_baseline.sql` versiona as tabelas de sorteio de adoracao consultadas pelo algoritmo de escala; o runtime tolera bancos antigos sem gerar erro 500/log de erro.

O app id ja foi registrado no App Store Connect. Trate `app.saojudastadeu.mesc` como definitivo para iOS.

Configuracao inicial de loja:
- iOS: alvo inicial iPhone-only, orientacao retrato.
- Android: orientacao retrato, backup automatico desativado e cleartext desativado.

## Status em 06/07/2026

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
- iOS native questionnaire reminders candidate: build `5.4.3 (50421)` validado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 23/06/2026, delivery/build ID `29cf7145-0ab4-4c26-a0df-4bdd47904f90`; inclui a acao nativa de lembrete para pendentes/cadastros incompletos na tela de respostas do coordenador.
- iOS native Face ID/manual unlock + schedule readiness candidate: build `5.4.3 (50422)` validado e enviado ao App Store Connect em 23/06/2026, delivery/build ID `7dd4cbc9-785e-42ec-813b-a7b094780692`; remove o prompt automatico de Face ID no mount da tela de login, mantendo biometria apenas por toque manual, adiciona contrato mobile de prontidao da escala do coordenador e passa o motor de escala a aceitar filtro de comunidade para preview/publicacao futura sem vazamento multi-comunidade.
- iOS native schedule preview candidate: build `5.4.3 (50423)` validado, exportado e enviado ao App Store Connect em 27/06/2026, delivery UUID `057d77aa-c0a9-42e7-97b6-fece5be7f695`; inclui preview nativo de escala no painel do coordenador, correcao de vagas no resumo do preview e nova trava contra loop de Face ID antes de abrir o prompt biometrico.
- iOS native stale biometric session fix candidate: build `5.4.3 (50424)` validado, exportado e enviado ao App Store Connect em 27/06/2026, delivery UUID `69a6f0d9-2b4c-4176-a661-a277d317c4f5`; invalida credenciais biometricas antigas quando token/refresh sao recusados pelo backend, limpa sessao local expirada e renova a credencial Face ID/Touch ID apos login por senha.
- iOS native renewable biometric session candidate: build `5.4.3 (50425)` validado, exportado e enviado ao App Store Connect em 27/06/2026, delivery UUID `74035f97-f747-44d4-829d-e2cd0fc55274`; cria sessao biometrica renovavel sem salvar senha, emite refresh token seguro ao ativar Face ID/Touch ID, renova o session token de inatividade no unlock e remove o cooldown do toque manual em biometria.
- iOS native safe-area/glass candidate: build `5.4.3 (50426)` validado, exportado e enviado ao App Store Connect em 27/06/2026, delivery UUID `b930861f-24be-4cc3-b563-16d71cc65702`; afasta toasts/header/menu lateral da area do notch/status bar e reforca o Liquid Glass em header, cards, tab bar e menu lateral no runtime nativo.
- iOS native push registration candidate: build `5.4.3 (50427)` validado, exportado e enviado ao App Store Connect em 27/06/2026, delivery UUID `0add9114-9780-405a-8113-f26b66f111f3`; habilita Push Notifications no Bundle ID `app.saojudastadeu.mesc`, registra token APNS no app nativo, troca a UX de Configuracoes de navegador para aparelho, adiciona deep link por toque em notificacao e prepara dispatcher backend APNS/FCM.
- iOS native notification/settings follow-up: build `5.4.3 (50428)` validado, exportado e enviado ao App Store Connect em 28/06/2026, delivery UUID `881bfa03-730e-456f-83c8-24a866a7d197`; corrige roteamento backend de notificacoes sem depender de Web Push/PWA, refina a tela nativa de Configuracoes, ajusta tabs mobile, reforca Liquid Glass nos paineis e afasta toasts da area do notch.
- iOS native liquid glass follow-up: build `5.4.3 (50429)` validado, exportado e enviado ao App Store Connect em 28/06/2026, delivery UUID `41bc9bc8-2ffe-4bc1-8baf-dad509e29b93`; torna o Liquid Glass mais aparente com tint translucido de 3% a 5%, blur/saturacao mais fortes, brilho refrativo diagonal, bordas claras/douradas, sombras internas e fundos lineares sutis para o material ter conteudo a refratar.
- iOS native liquid glass positioning hotfix: build `5.4.3 (50430)` validado, exportado e enviado ao App Store Connect em 28/06/2026, delivery UUID `5830272c-10f1-4c4f-8240-9dbe1d312735`; substitui o `50429` removendo `position: relative` das superficies compartilhadas `ios-glass-header`, `ios-glass-bar` e menu lateral mobile, para preservar `sticky`, `fixed bottom-0` e o posicionamento do sheet lateral.
- iOS native glass/layout + schedule smoke candidate: build `5.4.3 (50431)` validado, exportado e enviado ao App Store Connect em 28/06/2026, delivery/build ID `0125fd58-2db9-4c4b-ab22-5cced4dbb873`; estabiliza o Liquid Glass sem quebrar header/tab bar/menu lateral, corrige o tour/sheet para respeitar largura mobile e isola o smoke test de publicacao de escala do seed demo.
- iOS native glass intensity candidate: build `5.4.3 (50432)` validado, exportado e enviado ao App Store Connect em 28/06/2026, delivery UUID `bf6e25c6-b33a-4449-8d9e-2e2fc8260164`; reforca o Liquid Glass, adiciona glass ao bottom tab bar, clareia o menu lateral no modo claro e aumenta discretamente os logos do Santuario.
- iOS native schedule navigation candidate: build `5.4.3 (50434)` validado, exportado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 28/06/2026, delivery/build ID `be63e01f-6f58-4f39-8841-d11ec51729e0`; inclui a passada visual do `50432` e restaura Escalas com navegacao de mes/ano, botao Hoje e visualizacoes Calendario, Tabela e Lista para ministro e coordenador.
- iOS native simplified schedule UX candidate: build `5.4.3 (50435)` validado, exportado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 28/06/2026, delivery/build ID `bd9d8960-acf9-474b-925f-8955c3f114a9`; simplifica a area de Escalas, volta a Lista como modo inicial, deixa o calendario mensal compacto e restaura a Lista do coordenador para a tabela do app anterior.
- iOS native navigable schedule/export candidate: build `5.4.3 (50436)` validado, exportado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 29/06/2026, delivery/build ID `f4aa6183-6df0-4781-8b6d-78e90b1c2bb4`; torna o calendario navegavel por dia, filtra a Lista ao tocar numa data e alinha PDF/HTML/Excel ao modelo oficial da tabela de escala com posicoes 1-28.
- iOS native public schedule candidate: build `5.4.3 (50437)` validado, exportado, enviado ao App Store Connect e associado ao grupo interno `MESC Interno` em 29/06/2026, delivery/build ID `ff6517a5-8687-4be5-97bb-4293cc9c7ba8`; disponibiliza para ministros a escala completa oficial da comunidade, separa Lista pessoal de acoes da visualizacao mensal, destaca o ministro logado e usa `publicSchedule.assignments` com anti-vazamento multi-comunidade para exportar HTML/PDF/Excel no modelo oficial.
- iOS native formation material candidate: build `5.4.7 (50444)` validado, exportado e enviado ao App Store Connect em 04/07/2026, delivery UUID `105e3119-a6c7-4aac-9c32-4d9d35f251ae`; integra o conteudo oficial do repo `MESC_Formation`, adiciona biblioteca de mapas/funcoes/checklists no app e corrige progresso de formacao contra o schema real.
- iOS native coordinator formation authoring candidate: build `5.4.7 (50448)` validado, exportado e enviado ao App Store Connect em 04/07/2026, delivery UUID `3a61ca3a-749e-498c-b994-6d93eaa7ef5b`; libera o estudio de formacao para coordenadores/gestores criarem aulas, conteudos, quizzes e secoes de video, com deploy de producao em `https://saojudastadeu.app`.
- iOS native SwiftUI shell candidate: build `5.4.7 (50451)` validado, exportado e enviado ao App Store Connect em 05/07/2026, delivery/build ID `d0c17390-eb8d-412d-a602-5d380c40e0b1`; substitui o shell Capacitor/WebView por telas SwiftUI nativas para login, tabs, Missao, Escalas, Formacao, Perfil e Ajustes, usando Liquid Glass nativo no iOS compatível e fallback `ultraThinMaterial`.
- iOS native connected actions candidate: build `5.4.7 (50452)` validado, exportado e enviado ao App Store Connect em 06/07/2026, delivery/build ID `28a0b135-6038-4200-a307-8bf9295a6316`; conecta a UI SwiftUI nativa aos fluxos de confirmar presenca, pedir substituicao, exportar escala oficial em HTML, pendencias/avisos reais, preferencias do device registry, biblioteca de videos e resumo de perfil.
- iOS native Liquid Glass polish candidate: build `5.4.7 (50453)` validado, exportado e enviado ao App Store Connect em 06/07/2026, delivery/build ID `ced4d9ef-8629-47d0-96c5-a7abed1b050f`; reforca o vidro nativo com material/tint dedicados para superficies flutuantes, brilho refrativo, sombras de relevo, fundo com luz sutil e remove a reserva duplicada de rodape que criava uma faixa/corte acima da tab bar.
- iOS native APNS registration candidate: build `5.4.7 (50454)` validado, exportado e enviado ao App Store Connect em 06/07/2026, delivery/build ID `2aa82928-3bcf-4963-bd89-dd2bc46ca129`; vincula o token APNS recebido pelo AppDelegate ao device registry mobile, sincroniza token salvo apos restaurar sessao, reativa `CODE_SIGN_ENTITLEMENTS` no Release e assina o IPA com perfil App Store contendo `aps-environment=production`.
- iOS native notification settings candidate: build `5.4.7 (50455)` validado, exportado e enviado ao App Store Connect em 08/07/2026, delivery/build ID `67328003-927f-45ce-81a3-1842c8b49b0f`; separa permissao nativa do iOS de vinculo no device registry, revalida APNS ao voltar dos Ajustes, evita marcar push como vinculado antes de receber token e refina os controles de Ajustes com surfaces Liquid Glass.
- App Store version: `5.4.3` em `PREPARE_FOR_SUBMISSION`, build `50414` selecionada para loja, release `AFTER_APPROVAL`.
- App Store metadata pt-BR: nome, subtitulo, descricao, palavras-chave, texto promocional, URLs de marketing/suporte e privacy policy preenchidos em 18/06/2026.
- Dados staging: Supabase `mesc-staging` recebeu a escala oficial de junho/2026 com 321 linhas, 26 datas e 5 vagas `VACANTE`; foram criados 10 usuarios placeholder apenas para staging para validar ministros presentes na planilha e ausentes em `users`.
- TestFlight: build `5.4.7 (50455)` enviado ao App Store Connect contra `https://saojudastadeu.app`; processamento `VALID`. A API da Apple recusou associacao manual ao grupo interno `MESC Interno` (`ENTITY_UNPROCESSABLE`) em tentativa anterior, pois builds internos nao sao adicionados por esse relacionamento; validar a disponibilidade diretamente no TestFlight/App Store Connect.
- Apple Developer: capability `PUSH_NOTIFICATIONS` esta habilitada para o Bundle ID `app.saojudastadeu.mesc`. O bloqueio de export por falta de `aps-environment` no perfil App Store foi resolvido em 06/07/2026 com o perfil `MESC App Store Push 2026-07-06T14-37-32`; o IPA `5.4.7 (50455)` foi assinado com `aps-environment=production`.
- DNS nativo: `saojudastadeu.app` e `www.saojudastadeu.app` resolvem para a Vercel (`76.76.21.21`) e a home nativa responde `200`.
- Supabase nativo: `mesc-native-staging` recebeu `0009_native_mass_configuration_baseline.sql` e seed idempotente de horarios/eventos em 2026-06-24; `0010_native_adoration_draws_baseline.sql` esta versionada para a base de sorteio de adoracao usada pelo algoritmo; a prontidao de escala da API retorna `massConfig.configuredSlots=12` para julho/2026 na comunidade demo Matriz.
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

O upload `5.4.3 (50405)` foi aceito pelo App Store Connect, mas o TestFlight apontou problemas de responsividade no topo e na barra inferior. O build `5.4.3 (50408)` foi publicado com o ajuste final de safe-area/status bar, barra inferior e navegacao do menu lateral. O build `5.4.3 (50409)` corrigiu a selecao duplicada Escalas/Trocas no rodape, melhorou superficies glass no shell nativo e adicionou o gate de dados para validar/importar a escala oficial de junho/2026. O build `5.4.3 (50410)` corrige a causa raiz do corte no notch/login: status bar iOS em overlay transparente e CSS continuo por tras da Dynamic Island. O build `5.4.3 (50411)` corrige a causa raiz dos dados zerados/401 no app nativo: chamadas manuais para `/api` agora recebem o token JWT e o auth guard nao confia em usuario cacheado sem token. O build `5.4.3 (50412)` adiciona a primeira fatia de biometria nativa e melhora o Liquid Glass. O build `5.4.3 (50413)` corrige a regressao de sessao/biometria vista em TestFlight. O build `5.4.3 (50414)` corrige a repeticao de prompts biometricos apos login manual, move o som para o header, busca fotos protegidas com token e ajusta o tab bar inferior. O build `5.4.3 (50415)` e o candidato MVP P0 distribuido no TestFlight interno. O build `5.4.3 (50416)` aponta para a API nativa publica na Vercel, validada contra Supabase, para permitir teste fiel antes da virada DNS. O build `5.4.3 (50417)` desativa Service Worker/cache PWA no Capacitor e substitui o `50416` nos testes de login. O build `5.4.3 (50418)` leva o fluxo de questionario/readiness do coordenador para teste interno. O build `5.4.3 (50419)` corrige a abertura do questionario vigente a partir da home quando o questionario publicado pertence ao proximo mes. O build `5.4.3 (50420)` substitui o `50419` no TestFlight por adicionar trava contra loop de Face ID e atualizar a sessao salva no Keychain apos login por senha. O build `5.4.3 (50421)` adiciona lembretes de questionario/cadastro diretamente no fluxo nativo do coordenador. O build `5.4.3 (50422)` desativa o disparo automatico de Face ID, mantendo entrada biometrica manual, e abre o contrato de prontidao da escala com escopo de comunidade. O build `5.4.3 (50423)` adiciona o preview nativo da escala, corrige o calculo de vagas no resumo e reforca a trava contra loop de Face ID. O build `5.4.3 (50424)` invalida a sessao biometrica antiga quando o backend recusa token/refresh e renova a credencial biometrica apos login por senha. O build `5.4.3 (50425)` faz a biometria funcionar com access token expirado sem salvar senha, usando refresh token seguro no Keychain/Keystore e renovando a sessao de inatividade no unlock. O build `5.4.3 (50426)` corrige sobreposicoes com notch/status bar em toasts/header/menu lateral e deixa o Liquid Glass mais evidente no shell nativo. O build `5.4.3 (50427)` troca o push da tela de Configuracoes para fluxo nativo, registra APNS/FCM no `mobile_devices`, adiciona dispatcher backend APNS/FCM e abre deep link ao tocar na notificacao. O build `5.4.3 (50428)` corrige disparos semanticos de notificacao para nao dependerem de Web Push/PWA, melhora a linguagem nativa da tela de Configuracoes, ajusta tabs mobile e reforca Liquid Glass nos paineis. O build `5.4.3 (50429)` torna o Liquid Glass mais evidente com material translucido, highlights refrativos, sombras internas e fundos sutis no login, shell, header, cards, tab bar e menu lateral. O build `5.4.3 (50430)` corrige a regressao visual do `50429`, preservando o posicionamento fixo/sticky das barras e do menu lateral. O build `5.4.3 (50431)` estabiliza o glass/layout apos o caos visual do sheet lateral/tour e valida o smoke de publicacao de escala isolado do seed demo. O build `5.4.3 (50432)` aumenta a intensidade do Liquid Glass, adiciona glass ao tab bar inferior, clareia o menu lateral no modo claro e aumenta discretamente os logos. O build `5.4.3 (50434)` substitui o `50432` como candidato de teste por incluir tambem navegacao completa de Escalas com calendario mensal, tabela e lista. O build `5.4.3 (50435)` reduz a poluicao visual de Escalas: Lista volta a ser a entrada principal, calendario mensal fica compacto e a Lista do coordenador volta ao padrao de tabela anterior. O build `5.4.3 (50436)` torna o calendario navegavel por dia e faz as exportacoes PDF/HTML/Excel seguirem a tabela oficial de escala. O build `5.4.3 (50437)` disponibiliza essa escala oficial completa tambem para ministros, com destaque do proprio usuario e contrato publico filtrado por comunidade ativa.

O build `5.4.7 (50452)` substitui o `50451` no TestFlight como candidato SwiftUI nativo com acoes conectadas: presenca, substituicao, exportacao HTML da escala oficial, preferencias do aparelho, avisos/pendencias reais, videos de formacao e resumo de perfil. O build `5.4.7 (50453)` adiciona a passada visual de Liquid Glass nativo e corrige o corte/faixa acima da tab bar.

## Push nativo APNS/FCM

O app iOS ja possui Push Notifications habilitado no Bundle ID `app.saojudastadeu.mesc` e o IPA `5.4.3 (50437)` foi assinado com `aps-environment=production`.

Variaveis esperadas no backend para entrega remota real:

```bash
APNS_KEY_ID=...
APNS_TEAM_ID=TVTU93G6PU
APNS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----...'
APNS_BUNDLE_ID=app.saojudastadeu.mesc
APNS_ENV=production

FCM_SERVICE_ACCOUNT_JSON='{"project_id":"...","client_email":"...","private_key":"..."}'
```

Sem essas credenciais, o app ainda consegue pedir permissao e registrar o token no banco, mas o servidor apenas registra que a entrega remota APNS/FCM foi pulada.

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
