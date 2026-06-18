# PRD Gap Analysis e Plano de Implantacao - Release Lojas

Data: 2026-06-18  
Branch base: `codex/ios-release-next-pass`  
App: MESC Sao Judas Tadeu

## Decisao executiva

Nao recomendo reescrever o app inteiro antes de publicar. A base atual ja tem:

- app Capacitor entregue ao TestFlight;
- dados reais restaurados em producao, com ministros e escala de junho;
- autenticacao, questionario, escala, trocas, formacao e dashboards funcionais;
- schema multi-comunidade aplicado e validado;
- trilha de auditoria/release com backup, restore, health check e data doctor.

O risco maior agora nao e arquitetura "irrecuperavel"; e acabamento desigual entre produto, UX nativa, contrato de dados do questionario e escopo multi-comunidade. O caminho mais seguro para Apple e Google Play e uma reforma cirurgica em camadas, com gates de aceite objetivos.

## Fontes revisadas

Documentos internos:

- `docs/PRD_STORE_RELEASE_V2.md`
- `docs/PRD-MESC-APP-NATIVO.md`
- `docs/prd.md`
- `docs/multi-community-spec.md`
- `docs/SCHEDULE_GENERATOR_V2.md`
- `docs/QUESTIONNAIRE_DATA_CONTRACT.md`
- `docs/RESPONSE_COMPILER_SERVICE.md`
- `docs/NATIVE_STORE_RELEASE.md`
- `docs/STORE_RELEASE_READINESS_2026-06-17.md`

Referencias externas:

- Apple Human Interface Guidelines / Liquid Glass: https://developer.apple.com/design/human-interface-guidelines/
- Apple LocalAuthentication: https://developer.apple.com/documentation/localauthentication
- Apple `NSFaceIDUsageDescription`: https://developer.apple.com/documentation/bundleresources/information-property-list/nsfaceidusagedescription
- Android biometric authentication: https://developer.android.com/identity/sign-in/biometric-auth
- Capacitor Plugins: https://capacitorjs.com/docs/plugins
- ECC `liquid-glass-design`: https://github.com/affaan-m/ECC

## PRD versus app atual

| Area | PRD / intencao | Estado atual observado | Gap para loja | Prioridade |
| --- | --- | --- | --- | --- |
| Autenticacao e sessao | Login seguro, sessao confiavel, app nativo sem erro 401 em fetch | Login JWT existe; bridge nativa de fetch adiciona Bearer token; cache auth foi endurecido | Biometria ausente; tokens ainda ficam no storage web; precisa fluxo nativo de desbloqueio seguro | P0 |
| Dados reais | Loja deve mostrar ministros e escala real, sem mock | Data doctor em producao: 153 usuarios, 137 ativos, 95 fotos, 321 escalas em junho, 0 mocks | Manter script como gate por build; validar TestFlight com usuario revisor | P0 |
| Dashboard do ministro | Ministro entende proxima missao, trocas e pendencias em segundos | Dashboard existe e ja usa alguns componentes glass; ainda muito card administrativo | Reorganizar como "Minha proxima missa", "Confirmar", "Pedir troca", "Responder questionario", "Avisos" | P0 |
| Questionario mensal | Perguntas fixas e personalizadas nao podem ser ignoradas | UI tem metadata `eventDate/eventTime/eventName`; backend tem `question_mass_mappings`; `ResponseCompiler` prioriza mapeamento explicito e cai em metadata/regex | Ao criar pergunta vinculada a evento, o app ainda nao garante criacao obrigatoria de `special_events` + mapping; precisa validacao antes de enviar/fechar | P0 |
| Geracao de escala | Algoritmo deve usar todas as respostas, explicar escolhas e aprender com escala publicada | Rota principal ainda usa gerador legado; existem `ResponseCompiler`, `AvailabilityService`, `learningService` e comparacao na publicacao | Fazer cutover controlado para gerador v2.1, com razoes, confianca, conflitos e aprendizado visivel | P0/P1 |
| Publicacao da escala | Coordenador revisa, ajusta e publica; sistema aprende com diferencas | `schedule_generations` guarda original/final/differences; publish chama aprendizado | Aprendizado precisa usar contexto real de missa/comunidade e nao apenas `missa_dominical`; UI precisa mostrar o que foi aprendido | P1 |
| Multi-parish / comunidades | Novo fato de loja: varias comunidades em uma paroquia | Migration/backfill OK; colunas `community_id` existem; escritas principais usam `resolveWriteCommunityId` | Read-scoping incompleto em endpoints de usuarios, escalas, eventos, metricas e relatorios; UI sem seletor/identidade de comunidade consistente | P1 |
| Trocas/substituicoes | Ministro consegue pedir troca e coordenador gerencia | Funcionalidade existe e ficou melhor no app nativo apos fix de auth | Revisar estados vazios, notificacoes e labels para experiencia de ministro | P1 |
| Formacao/gamificacao | Engajamento dos ministros | Rotas e paginas existem | Nao e bloqueante para loja; usar como diferencial depois do P0 | P2 |
| Compliance Apple/Google | Privacidade, exclusao, reviewer account, sem crash, sem segredo exposto | Paginas publicas existem; build TestFlight 50411 entregue; release scripts existem | Sentry DSN em producao, reviewer account, screenshots finais, GitGuardian resolvido/rotacionado e politica de privacidade revisada | P0 |
| UX nativa | Layout responsivo, safe areas, Liquid Glass | Safe area/header/nav melhoraram; CSS tem `liquid-glass`, `ios-glass-header`, `ios-glass-bar` | O visual ainda parece material solido/soap solid: excesso de cards, bordas fortes, pouco reflexo, pouca profundidade contextual | P0/P1 |

## Diagnostico tecnico por frente critica

### 1. UX Liquid Glass

O app tem classes glass, mas a aplicacao atual ainda esta baseada em:

- cards grandes em quase todas as secoes;
- bordas fortes em componentes internos;
- fundos bege/preto quase solidos;
- glass aplicado como camada decorativa, nao como sistema de hierarquia;
- pouca diferenca entre conteudo principal, barras, sheets e chips.

Liquid Glass deve virar sistema, nao enfeite. Proposta:

- usar vidro apenas em superficies de navegacao, sheet, card principal de missao e controles destacados;
- trocar cards administrativos por secoes fluidas e listas densas onde fizer sentido;
- introduzir tokens: `glass-surface`, `glass-toolbar`, `glass-chip`, `glass-sheet`, `glass-primary-action`;
- adicionar highlights especulares sutis, tint dinamico por contexto, blur com saturacao e sombras internas;
- reduzir linhas divisorias; quando houver separacao, usar fade/edge effect, nao borda reta;
- respeitar `prefers-reduced-transparency`, `prefers-contrast` e modo escuro.

Primeiro piloto recomendado:

1. Login nativo.
2. Header e bottom nav.
3. Dashboard do ministro.
4. Minhas escalas / proxima missa.
5. Sheet de pedido de troca.

So depois aplicar em telas administrativas. Isso evita "vidro em tudo" e melhora a percepcao dos ministros primeiro.

### 2. Face ID, Touch ID e biometria

Biometria ainda nao esta implementada. O caminho seguro:

- biometria nao substitui login do servidor;
- apos login normal, o app oferece "Ativar Face ID / Touch ID";
- o app salva somente um refresh/session token nativo, nunca senha;
- o token fica no Keychain iOS / Keystore Android, protegido por biometria quando disponivel;
- ao abrir o app, biometria desbloqueia o token, chama `/api/auth/me` e renova a sessao;
- logout, exclusao de conta ou revogacao apagam o segredo local;
- fallback obrigatorio: senha ou codigo do aparelho, conforme plataforma.

Alteracoes tecnicas:

- adicionar plugin Capacitor de biometria/secure storage ou criar plugin local enxuto;
- iOS: adicionar `NSFaceIDUsageDescription` no `Info.plist`;
- Android: adicionar suporte a BiometricPrompt e permissao `android.permission.USE_BIOMETRIC` quando necessario;
- criar `client/src/lib/native-biometric-auth.ts`;
- criar tela/setting: "Entrar com Face ID" / "Entrar com biometria";
- criar endpoints/fluxo de refresh token com rotacao e revogacao por dispositivo, caso o token atual nao seja adequado;
- testes: iOS simulator + device real, Android emulator + device, fallback sem biometria.

Decisao recomendada: usar plugin local se quisermos controle total de Keychain/Keystore e menor risco de dependencia. Plugin comunitario so se passar por auditoria de manutencao, permissoes, armazenamento e compatibilidade com Capacitor 8.

### 3. Questionario, perguntas personalizadas e eventos

Pontos positivos:

- UI ja coleta `eventDate`, `eventTime`, `eventName`;
- respostas de eventos sao validadas como obrigatorias quando visiveis;
- backend tem `special_events` e `question_mass_mappings`;
- `ResponseCompiler` usa mapping explicito antes de metadata/regex.

Gap:

- o ato de criar uma pergunta "vinculada a evento/missa" ainda parece salvar metadata no questionario, mas nao garante atomically:
  - criar/atualizar `special_events`;
  - criar/atualizar `question_mass_mappings`;
  - bloquear envio se houver pergunta de evento sem mapping;
  - mostrar preview "esta pergunta criara missa X em data Y".

Plano:

1. No backend, criar service `QuestionEventBindingService`.
2. Ao salvar template, detectar perguntas com metadata de evento.
3. Criar/atualizar `special_events` e `question_mass_mappings` em transacao.
4. Validar antes de enviar: toda pergunta `special_event` ou custom com data/hora precisa mapping valido.
5. Na UI, trocar "opcional" por estados claros:
   - pergunta comum;
   - pergunta de evento;
   - pergunta vinculada a missa existente.
6. Teste de aceite: pergunta personalizada do mes aparece na resposta, vira evento e entra no gerador sem regex.

### 4. Gerador de escala v2.1

O PRD pede algoritmo que considere todas as respostas e aprenda com a escala publicada. O app ja tem pecas, mas o fluxo principal ainda usa o gerador legado.

Cutover recomendado:

1. Criar modo `generator=v2` por feature flag.
2. Entrada unica: `ResponseCompiler.compileMonthlyResponses(month, year, communityId)`.
3. Usar `AvailabilityService` para disponibilidade por missa/evento.
4. Score por ministro:
   - disponibilidade explicita;
   - restricoes familiares;
   - historico/carga recente;
   - confiabilidade;
   - preferencia de horario;
   - comunidade;
   - aprendizado de correcoes anteriores.
5. Saida explicavel:
   - `confidence`;
   - `reasons`;
   - `warnings`;
   - `unfilledSlots`;
   - `ignoredResponses=0` como gate.
6. Comparacao:
   - gerar rascunho;
   - coordenador edita;
   - publicar;
   - salvar diferencas por slot real;
   - aprendizado aparece em relatorio "o algoritmo aprendeu que...".

Gate de aceite:

- nenhuma pergunta de evento mapeada fica fora da massa/evento;
- nenhuma resposta valida fica sem leitura;
- geracao explica os 20 casos de menor confianca;
- publicacao cria aprendizado com comunidade, data, horario e tipo corretos;
- runbook inclui comparacao contra escala de junho publicada.

### 5. Multi-parish / comunidades

Estado atual: schema e backfill estao ok. Produto ainda precisa acabamento para ser anunciado como novidade.

Faltam:

- filtros de leitura por `community_id` em todos os endpoints sensiveis;
- permissao por role:
  - `coordenador_paroquial`: ve todas;
  - `coordenador_comunidade`: ve a propria;
  - ministro: ve propria comunidade e suas escalas;
- seletor/indicador de comunidade no header para coordenadores;
- cadastro de nova comunidade;
- convite/aprovacao de ministros com comunidade inicial;
- exports e relatorios por comunidade;
- testes anti-vazamento: usuario de uma comunidade nao enxerga escala/dados de outra.

Recomendacao de comunicacao: tratar como "Beta multi-comunidade" no TestFlight ate passar por read-scoping completo.

## Plano de implantacao

### Fase 0 - Congelar base publicavel

Objetivo: garantir que 50411 e dados reais sao a base de trabalho.

Itens:

- rodar `release:check:data -- --strict-mock-data` em producao por build;
- validar login, diretorio, escala de junho e fotos no TestFlight;
- manter backup/restore e health check como gates;
- confirmar rotacao da credencial apontada pelo GitGuardian.

Status: quase pronto.

### Fase 1 - UX nativa + biometria

Objetivo: ministros sentirem que o app novo vale ser baixado.

Itens:

- Liquid Glass piloto em login, dashboard, header, bottom nav e sheets;
- dashboard orientado a "minha proxima missa";
- Face ID/Touch ID/biometria com fallback por senha;
- safe areas sem corte em notch/dynamic island;
- estados vazios bonitos: sem erro tecnico cru para ministro.

Gate:

- screenshots iPhone pequeno, iPhone com Dynamic Island, iPad, Android;
- dark mode sem degrade quebrado;
- biometria ativa/desativa corretamente;
- logout remove token seguro.

### Fase 2 - Questionario como contrato de escala

Objetivo: nenhuma pergunta personalizada relevante ser ignorada.

Itens:

- service transacional pergunta-evento-mapping;
- validacao antes de envio/fechamento;
- preview de eventos gerados pelo questionario;
- teste automatizado para pergunta custom -> special_event -> generator.

Gate:

- pergunta custom com data/hora gera evento;
- evento aparece no calendario de escala;
- resposta entra no compilador sem depender de regex.

### Fase 3 - Gerador v2.1

Objetivo: algoritmo confiavel, explicavel e aprendendo.

Itens:

- feature flag `SCHEDULE_GENERATOR_VERSION=v2`;
- integrar `ResponseCompiler` e `AvailabilityService` no endpoint principal;
- reasons/confidence/warnings por missa;
- comparacao gerado vs publicado visivel;
- aprendizado por comunidade/missa/horario.

Gate:

- comparativo com junho publicado;
- zero resposta valida ignorada;
- relatorio dos casos de baixa confianca;
- rollback para v1 via flag.

### Fase 4 - Multi-community publicavel

Objetivo: poder anunciar multi-parish sem risco de vazamento de dados.

Itens:

- read-scoping completo;
- UI de comunidade;
- cadastro/convite/aprovacao por comunidade;
- exports e metricas por comunidade;
- testes de isolamento.

Gate:

- usuario de comunidade A nao lista dados de B;
- coordenador paroquial consegue alternar comunidades;
- coordenador comunidade fica restrito ao proprio escopo.

### Fase 5 - Loja

Objetivo: enviar para revisao sem surpresa.

Itens:

- reviewer account com dados reais seguros;
- screenshots finais apos UX;
- privacy policy atualizada;
- Sentry DSN em producao;
- release notes TestFlight e App Store;
- build novo apos Fase 1/2, sem mocks e sem erros 401.

## Proximo incremento recomendado

Comecar pela Fase 1 em uma branch curta:

1. Implementar arquitetura de biometria nativa.
2. Refatorar tokens Liquid Glass e aplicar no login/dashboard/nav.
3. Trocar estados de erro tecnico por estados humanos.
4. Validar em navegador, iOS simulator/device e TestFlight.

Depois disso, entrar na Fase 2 do questionario. Essa ordem da maior percepcao de valor para os ministros sem colocar a geracao de escala em risco antes de termos a UX e a autenticacao estabilizadas.
