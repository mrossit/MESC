# MESC Native - Auditoria De Release

**Data:** 20/09/2026
**Base auditada:** `origin/main` em `0aa1181`, mais o corte de coordenacao P0 deste branch.

## Concluido E Verificado

- API mobile v1 cobre autenticacao, refresh, sessao biometrica, device registry, perfil/foto, notificacoes, missao, questionario, escalas, trocas, formacao e administracao de formacao.
- Mutacoes criticas possuem idempotencia; a suite tambem cobre isolamento de dados entre comunidades e paroquias.
- A tela SwiftUI do coordenador agora consome os contratos reais de comunidade, respostas de questionario, prontidao, cobertura, diretorio, previa e publicacao da escala.
- A configuracao mobile passa a anunciar `coordinatorMobile: true`, com smoke test para evitar que o cliente oculte um fluxo entregue.
- O motor de escala deixou de usar um cast exclusivo do Postgres na contagem historica. A leitura de equidade agora funciona tambem na base SQLite usada pelos testes locais.
- Validacoes deste corte:
  - `npm run check -- --pretty false`;
  - `npm run test:run -- --reporter=dot --silent=true` (`868` testes executados e aprovados; `55` skips previstos);
  - build Debug do iOS no simulador iPhone 17;
  - APK Android Debug.

## Bloqueadores Reais Para Loja

### Android Nativo

O projeto Android que compila hoje e um shell Capacitor. Ele nao atende ao requisito do PRD de cliente Kotlin/Jetpack Compose e nao deve ser apresentado como paridade nativa com o iOS. O proximo corte Android precisa substituir a Activity WebView por telas Compose que consumam a mesma API mobile v1, com `BiometricPrompt`, FCM e permissoes do sistema.

### Teste Em Aparelhos Reais

Antes de candidatura de loja, validar no TestFlight o fluxo de coordenador deste corte: login manual, sessao expirada com Face ID, respostas, previa, publicacao com confirmacao e deep links. No Android, repetir os fluxos somente depois do cliente Compose existir.

### Push Remoto

O app e a API registram tokens e preferencias; a entrega precisa de credenciais operacionais e teste em aparelho:

- APNs: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` e ambiente de producao;
- Android: `google-services.json` no app nativo e `FCM_SERVICE_ACCOUNT_JSON` no backend;
- validar os oito eventos P0, inclusive toque que abre o destino correto.

### Dados Reais E Operacao

Antes de abrir a distribuicao externa, rodar o data doctor no banco que servira o app e conferir uma amostra humana de cadastros, comunidades, escalas e progresso de formacao. Importacao historica nao substitui essa validacao de qualidade e de escopo por comunidade.

## Proxima Entrega Tecnica

1. Publicar este corte iOS como novo candidato TestFlight e executar o roteiro em aparelho real.
2. Iniciar o cliente Android Compose pela vertical de autenticacao, sessao segura, Missao, Escalas e notificacoes, sem reutilizar telas web.
3. Fechar FCM e a validacao de push junto do teste Android real.

Esses tres itens sao a linha que separa o MVP iOS utilizavel de uma versao realmente pronta para as duas lojas.
