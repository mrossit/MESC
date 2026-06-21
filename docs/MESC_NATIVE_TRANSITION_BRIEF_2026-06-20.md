# MESC Native - Documento de Transicao

Data: 2026-06-20
Status: briefing para iniciar novo ciclo nativo do zero
Base de aprendizado: app atual em Replit/Capacitor, PRD v2, TestFlight 5.4.3 (50414), auditorias de dados/release e conversas de validacao

## 1. Decisao

Vamos manter o app atual rodando no Replit como sistema em uso e iniciar, com calma, um novo produto nativo.

A publicacao nas lojas deixa de ser a urgencia principal. O objetivo passa a ser construir o MESC Native com PRD bem revisado, UX definida antes da implementacao, arquitetura nativa, testes fortes e menor risco de remendos acumulados.

Esta decisao muda a estrategia:

- o app atual continua atendendo a operacao;
- o trabalho de loja do Capacitor fica como experiencia, nao como destino final obrigatorio;
- o novo app nasce com escopo fechado, telas desenhadas e contratos de API antes do codigo pesado;
- SwiftUI e Kotlin/Jetpack Compose devem ser avaliados como caminho preferencial;
- backend e banco atuais podem ser reaproveitados, mas com contratos limpos.

## 2. Por Que Recomeçar Agora

O ciclo de TestFlight mostrou que o app atual pode ser empacotado, mas tambem mostrou limites importantes:

- UX nativa exige muitas correcoes de safe area, header, bottom nav, biometria e comportamento WebView;
- Liquid Glass no WebView fica apenas inspirado, nao equivalente a uma experiencia nativa iOS;
- a base atual acumula decisoes de PWA, Replit, admin web, mobile e release em um mesmo lugar;
- questionario, eventos, escala, multi-comunidade e aprendizado precisam de contratos mais rigidos;
- o risco de continuar lapidando para loja pode virar retrabalho permanente.

O novo app permite trabalhar sem pressa e sem quebrar o uso atual.

## 3. O Que Preservar Do App Atual

Devemos reaproveitar conhecimento, dados e partes conceituais, nao necessariamente codigo de interface.

Preservar:

- banco de dados real, depois de revisado e saneado;
- usuarios, ministros, comunidades, fotos, escala oficial e historico;
- regras de negocio ja validadas na pratica;
- scripts de backup, restore, health check e data doctor;
- aprendizados de TestFlight: notch, biometria, fotos autenticadas, dados reais e estados de erro;
- documentos existentes sobre questionarios, geracao de escala, multi-comunidade e seguranca;
- dominio `https://saojudastadeu.app` e identidade visual Sao Judas Tadeu/MESC.

Reavaliar:

- rotas de API que hoje nasceram para web/admin;
- modelo de roles e permissao;
- formato das respostas de questionario;
- gerador legado de escala;
- telas administrativas densas no mobile.

Descartar como base do app novo:

- WebView como experiencia principal;
- componentes mobile derivados de dashboard web;
- Liquid Glass via CSS como objetivo final;
- navegacao que dependa de rotas web;
- estados de erro tecnicos exibidos ao ministro.

## 4. Estrategia Recomendada

### 4.1 Produto

Criar primeiro um PRD v3, depois especificacao de telas e fluxos, depois arquitetura, depois codigo.

O PRD v3 deve responder:

- quem usa;
- em qual contexto;
- quais tarefas precisam ficar excelentes;
- quais features ficam fora do primeiro app nativo;
- quais dados cada papel pode ver;
- como medir sucesso.

### 4.2 Plataforma

Caminho preferencial:

- iOS: SwiftUI
- Android: Kotlin + Jetpack Compose
- Backend: manter API atual inicialmente, com camada de contratos mobile
- Admin web/Replit: permanece para coordenadores enquanto o app nativo amadurece

Alternativa futura:

- se manter dois apps nativos ficar caro demais, avaliar Kotlin Multiplatform para regras compartilhadas ou Flutter/React Native como segunda opcao;
- nao decidir isso por ansiedade. A primeira discussao deve ser arquitetura, custo e longevidade.

### 4.3 Repositorio

Opcoes:

1. Novo repositorio `MESC-Native`
   - mais limpo;
   - separa ciclo novo do legado;
   - facilita mentalidade de produto novo.

2. Monorepo dentro do repo atual
   - preserva docs e historico;
   - pode misturar preocupacoes de novo e legado.

Recomendacao inicial: novo repositorio para apps nativos, mantendo este repo como referencia e backend ate haver motivo forte para migrar.

## 5. PRD v3 - Esqueleto Inicial

### 5.1 Objetivo Do Produto

O MESC Native deve ser o app oficial dos ministros, coordenadores de comunidade e coordenadores paroquiais para organizar missoes, disponibilidade, escalas, substituicoes, comunicacao e crescimento multi-comunidade.

O app deve transmitir tres sensacoes:

- clareza: o ministro sabe sua proxima missao;
- confianca: o coordenador entende como a escala foi sugerida;
- cuidado: a experiencia parece feita para a comunidade, nao adaptada de um sistema administrativo.

### 5.2 Personas

Ministro:

- consulta proxima missa;
- responde disponibilidade;
- pede substituicao;
- acompanha avisos;
- atualiza perfil e foto;
- sente pertencimento.

Coordenador de comunidade:

- gerencia ministros da comunidade;
- cria questionario mensal;
- revisa respostas;
- gera, ajusta e publica escala;
- acompanha substituicoes.

Coordenador paroquial:

- enxerga todas as comunidades;
- cria novas comunidades;
- acompanha cobertura;
- padroniza regras e calendario;
- audita vazamento ou inconsistencias.

Administrador tecnico:

- monitora erros;
- faz backup/restore;
- acompanha integridade de dados;
- gerencia configuracoes sensiveis.

### 5.3 MVP Nativo

O MVP nativo nao deve ser uma copia total do web app.

P0 ministro:

- login seguro;
- Face ID/Touch ID/biometria;
- sessao persistente segura, com opcao "manter conectado";
- home "Minha Missao";
- proxima escala;
- lista de escalas do mes;
- responder questionario;
- pedir substituicao;
- perfil, foto por camera/galeria e dados de contato;
- notificacoes/avisos;
- exclusao de conta e privacidade.

P0 coordenador:

- visao de respostas do questionario;
- pendencias de disponibilidade;
- escala do mes;
- cobertura por missa;
- substituicoes pendentes;
- publicar/ajustar escala com seguranca;
- ministros da comunidade.

P0 plataforma:

- multi-comunidade com isolamento;
- registro de dispositivo, push token e preferencias de notificacao;
- governanca de permissoes nativas por contexto;
- logs/auditoria;
- backup/restore;
- monitoramento;
- contratos de API versionados.

P1:

- gerador v2.1 explicavel;
- aprendizado de ajustes;
- exports nativos;
- comunicacao segmentada;
- notificacao de atualizacoes do app/conteudo;
- geolocalizacao opcional para check-in presencial;
- gamificacao/formacao.

P2:

- widgets iOS/Android;
- calendario nativo;
- offline avancado;
- app para Apple Watch;
- Apple Intelligence no iOS;
- Google Gemini/Gemini Nano no Android;
- IA assistiva para coordenador.

### 5.4 Capacidades Nativas E Permissoes

Estas capacidades devem entrar no PRD v3 como requisitos explicitos, com prompt de permissao apenas no momento de uso e alternativa funcional quando a permissao for negada.

| Capacidade | Prioridade | Decisao de produto |
|------------|------------|--------------------|
| Camera | P0 | Usar para foto de perfil e, futuramente, anexos autorizados. O app tambem deve aceitar galeria/arquivos. Nao bloquear o ministro se ele negar camera. |
| Biometria | P0 | Face ID/Touch ID no iOS e BiometricPrompt no Android para desbloquear credenciais salvas. Primeiro login sempre exige senha. Biometria nao substitui refresh token, revogacao e expiracao no servidor. |
| Sessao persistente | P0 | "Manter conectado" deve restaurar sessao ao reabrir o app, com refresh token rotativo, armazenamento seguro e logout remoto por dispositivo. Nao significa token infinito. |
| Notificacoes de atualizacao | P0/P1 | P0 para avisos de escala, questionario, substituicao e comunicados. P1 para aviso de nova versao, atualizacao obrigatoria e notas de versao via configuracao remota. |
| Push notification | P0 | Registrar dispositivo, token, plataforma e preferencias. Push deve abrir a tela correta via deep link e respeitar horario silencioso. |
| Geolocalizacao | P1 | Usar somente para check-in presencial, validacao de chegada ou sugestao de comunidade proxima. Permitir negar. Sem rastreamento continuo em background. |
| Apple Intelligence | P2 | Expor acoes e entidades seguras por App Intents, Siri/Shortcuts e, quando adequado, Writing Tools. Nao enviar dados pastorais/sacramentais a modelos sem base legal e consentimento claro. |
| Google Gemini | P2 | Avaliar Gemini API, Gemini Nano/AICore e AppFunctions para assistencia no Android. Priorizar casos locais/privados quando disponiveis e manter fallback sem IA. |

Regras comuns:

- cada permissao deve ter justificativa humana e curta;
- privacidade e exclusao de dados devem cobrir foto, device token, localizacao e preferencias de IA;
- Apple Intelligence/Gemini devem apoiar coordenadores, nao tomar decisoes finais de escala;
- recursos de IA devem ser desligaveis por comunidade/paroquia e auditaveis.

## 6. Telas Que Precisam Ser Definidas Antes Do Codigo

### Ministro

1. Login
2. Ativar biometria
3. Home Minha Missao
4. Proxima missa
5. Minhas escalas
6. Responder questionario
7. Confirmacao de resposta
8. Pedir substituicao
9. Status da substituicao
10. Avisos
11. Perfil
12. Foto e dados pessoais
13. Permissoes do dispositivo
14. Sessao e dispositivos conectados
15. Privacidade e exclusao de conta
16. Sem conexao
17. Sessao expirada

### Coordenador

1. Painel da comunidade
2. Respostas do questionario
3. Criar/editar questionario
4. Pergunta vinculada a evento/missa
5. Preview de eventos gerados
6. Gerar escala
7. Revisar sugestao
8. Motivos/confianca do algoritmo
9. Ajustar escala
10. Publicar escala
11. Aprendizado apos publicacao
12. Substituicoes
13. Diretorio de ministros
14. Convites/aprovacoes

### Coordenador paroquial

1. Visao consolidada
2. Seletor de comunidade
3. Cadastro de comunidade
4. Coordenadores por comunidade
5. Relatorios por comunidade
6. Auditoria de isolamento

Cada tela deve ter:

- estado carregando;
- estado vazio;
- estado de erro humano;
- permissao negada;
- modo claro;
- modo escuro;
- acessibilidade/dynamic type;
- criterios de aceite.

## 7. Arquitetura Recomendada

### 7.1 Visao Geral

```text
MESC Native iOS (SwiftUI)
        |
        | HTTPS / API Mobile v1
        |
Backend atual evoluido
        |
Postgres atual
        |
Admin Web/Replit continua em uso
        |
MESC Native Android (Kotlin/Compose)
```

### 7.2 Camadas iOS

- `App`: bootstrap, navigation, dependency injection
- `DesignSystem`: cores, tipografia, Liquid Glass nativo, componentes
- `Auth`: login, biometria, keychain, sessao
- `Mission`: home do ministro e proxima missa
- `Schedules`: escalas
- `Questionnaires`: disponibilidade
- `Substitutions`: trocas
- `Communities`: multi-comunidade
- `Profile`: perfil/foto/privacidade
- `DeviceCapabilities`: camera, notificacoes, localizacao, biometria e versao do app
- `Intelligence`: App Intents, Apple Intelligence e assistencias protegidas
- `Networking`: API client, retries, auth refresh
- `Persistence`: cache local seguro
- `Observability`: logs, crash, analytics etico

### 7.3 Camadas Android

- `app`: navigation, DI, theme
- `designsystem`: Material/Compose adaptado a identidade MESC
- `auth`: login, biometria, encrypted storage
- `mission`
- `schedules`
- `questionnaires`
- `substitutions`
- `communities`
- `profile`
- `devicecapabilities`
- `intelligence`
- `network`
- `datastore`
- `observability`

### 7.4 API Mobile

Criar contratos mobile, mesmo que servidos pelo backend atual:

- `GET /mobile/v1/session`
- `POST /mobile/v1/auth/login`
- `POST /mobile/v1/auth/refresh`
- `POST /mobile/v1/auth/logout`
- `POST /mobile/v1/devices`
- `PATCH /mobile/v1/devices/{id}`
- `DELETE /mobile/v1/devices/{id}`
- `GET /mobile/v1/app/config`
- `GET /mobile/v1/me`
- `POST /mobile/v1/me/photo`
- `GET /mobile/v1/mission/home`
- `GET /mobile/v1/schedules/month?month=YYYY-MM`
- `GET /mobile/v1/questionnaires/current`
- `POST /mobile/v1/questionnaires/{id}/responses`
- `GET /mobile/v1/substitutions`
- `POST /mobile/v1/substitutions`
- `POST /mobile/v1/checkins`
- `GET /mobile/v1/communities`
- `GET /mobile/v1/admin/community-dashboard`
- `POST /mobile/v1/ai/coordinator-assist` (P2, feature flag)

O app nativo nao deve depender de respostas gigantes feitas para a UI web.

## 8. Contratos De Produto Criticos

### 8.1 Questionario E Evento

Regra: pergunta personalizada que representa missa/evento deve gerar ou se vincular a um evento real.

Contrato minimo:

- `questionId` estavel;
- `questionType`;
- `eventBinding`;
- `communityId`;
- `date`;
- `time`;
- `eligibilityRule`;
- `requiredForScheduleGeneration`.

Gate:

- questionario nao publica com evento sem binding;
- gerador nao roda com respostas validas ignoradas;
- preview mostra eventos gerados.

### 8.2 Gerador De Escala

Regra: o algoritmo deve ser explicavel.

Toda sugestao deve incluir:

- ministro sugerido;
- disponibilidade considerada;
- restricoes;
- score;
- motivos;
- confianca;
- alertas;
- alternativas.

Toda publicacao deve comparar:

- sugestao original;
- edicoes do coordenador;
- substituicoes posteriores;
- faltas/confirmacoes;
- aprendizado produzido.

### 8.3 Multi-Comunidade

Regra: isolamento de dados vem antes de conveniencia.

Todo endpoint sensivel deve receber/derivar:

- `communityId`;
- role do usuario;
- escopo permitido;
- modo consolidado apenas para coordenador paroquial/gestor.

Gate:

- ministro de A nao ve dados de B;
- coordenador de A nao exporta B;
- coordenador paroquial consegue alternar e consolidar;
- logs registram escopo usado.

## 9. Design System Nativo

Referencia visual detalhada: `docs/MESC_NATIVE_VISUAL_SYSTEM_2026-06-20.md`.

### 9.1 Direcao

O visual deve ser sereno, liturgico, moderno e nativo.

Evitar:

- dashboard administrativo como primeira tela;
- excesso de cards;
- bordas fortes em tudo;
- fundo bege/preto solido demais;
- vidro aplicado indiscriminadamente;
- textos explicativos longos dentro da UI.

Usar:

- navegacao nativa;
- superficies glass apenas em barras, sheets e destaques;
- hierarquia clara;
- componentes com toque confortavel;
- dynamic type;
- alto contraste;
- estados vazios humanos.

### 9.2 Liquid Glass

iOS:

- usar APIs nativas quando disponiveis;
- fallback elegante em versoes antigas;
- respeitar Reduce Transparency e Increase Contrast;
- testar em aparelho real, nao so Simulator.

Android:

- nao tentar copiar iOS literalmente;
- adaptar com Material/Compose, translucidez moderada e identidade propria;
- preservar consistencia de marca.

## 10. Plano De Testes

### 10.1 Antes Do Codigo

- checklist de aceite por feature;
- prototipo de fluxo;
- revisao de API;
- matriz de permissoes;
- fixtures de dados reais anonimizados.

### 10.2 Durante Implementacao

iOS:

- unit tests de services/view models;
- snapshot tests das telas principais;
- UI tests de login, home, escala, questionario e substituicao;
- testes de biometria no Simulator e device real;
- testes de camera/galeria, upload de foto, permissao negada e imagem grande;
- testes de sessao persistente, refresh token expirado, logout remoto e troca de aparelho;
- testes de push, deep link, horario silencioso e notificacao de atualizacao;
- testes de App Intents/Apple Intelligence com feature flag, fallback e dados sensiveis redigidos.

Android:

- unit tests;
- Compose UI tests;
- screenshot tests;
- testes de biometria/emulator e device real;
- testes de camera/galeria, upload de foto, permissao negada e imagem grande;
- testes de sessao persistente, refresh token expirado, logout remoto e troca de aparelho;
- testes de push, deep link, horario silencioso e notificacao de atualizacao;
- testes de geolocalizacao foreground, permissao negada, local impreciso e ausencia de GPS;
- testes de Gemini/Gemini Nano/AppFunctions com feature flag, fallback e dados sensiveis redigidos.

Backend/API:

- contratos OpenAPI;
- testes anti-vazamento multi-comunidade;
- testes de questionario-evento-gerador;
- testes de escala v2.1 com junho/2026;
- testes de registro/revogacao de dispositivo e push token;
- testes de version gate para atualizacao opcional/obrigatoria;
- testes de check-in com localizacao, anti-replay e auditoria;
- testes de endpoints de IA com autorizacao, rate limit, logs e redacao de dados.

Release:

- health check;
- data doctor;
- backup/restore;
- smoke test device;
- crash monitoring ativo.

## 11. Plano De Migracao

Fase 0 - Preparacao:

- congelar app atual como sistema em producao;
- documentar endpoints usados;
- definir PRD v3;
- definir telas e fluxos;
- escolher repositorio/estrutura.

Fase 1 - Base Nativa:

- criar projeto SwiftUI;
- criar projeto Android/Compose ou decidir iniciar iOS primeiro;
- login + sessao + biometria;
- design system base;
- API client;
- observabilidade.

Fase 2 - Ministro:

- Home Minha Missao;
- proxima escala;
- escalas do mes;
- questionario atual;
- substituicao;
- perfil/foto.

Fase 3 - Coordenador:

- painel comunidade;
- respostas;
- escalas;
- substituicoes;
- diretorio;
- publicacao.

Fase 4 - Contratos Fortes:

- questionario -> evento -> gerador;
- gerador v2.1 explicavel;
- aprendizado mensal;
- multi-comunidade completo.

Fase 5 - Lojas:

- TestFlight/Play internal;
- testers externos;
- screenshots;
- privacidade;
- review;
- rollout gradual.

## 12. Riscos E Cuidados

Riscos:

- tentar copiar tudo do app atual e recriar a colcha de retalhos;
- manter backend sem contrato mobile claro;
- iniciar Swift e Android ao mesmo tempo sem PRD fechado;
- gastar energia em visual antes de contrato de dados;
- prometer multi-comunidade antes de read-scoping completo;
- usar biometria como seguranca falsa sem refresh token correto;
- vender "always on" como sessao infinita e fragil;
- pedir camera/localizacao cedo demais e perder confianca do usuario;
- transformar geolocalizacao em rastreamento desnecessario;
- deixar Apple Intelligence/Gemini gerar sugestoes sem auditoria humana.

Cuidados:

- app atual segue vivo;
- codigo novo so com feature definida;
- toda feature nasce com criterios de aceite;
- toda tela nasce com estados;
- toda regra sensivel nasce com teste;
- toda permissao nativa nasce com justificativa, fallback e teste de negacao;
- todo recurso de IA nasce atras de feature flag, logs e revisao humana;
- nenhuma credencial ou segredo entra em documento.

## 13. Primeira Nova Sessao

Abrir uma nova sessao com este objetivo:

```text
Quero começar o MESC Native do zero.
Use o app atual apenas como referência, não como base obrigatória.
Leia docs/MESC_NATIVE_TRANSITION_BRIEF_2026-06-20.md e, a partir dele, vamos produzir primeiro o PRD v3 completo, depois fluxos/telas, arquitetura nativa iOS/Android, contratos de API e plano de testes.
Não escreva código ainda sem fecharmos o PRD e as telas prioritárias.
```

Primeiras entregas da nova sessao:

1. PRD v3 completo.
2. Mapa de features P0/P1/P2.
3. Jornada do ministro.
4. Jornada do coordenador.
5. Matriz de permissoes multi-comunidade.
6. Matriz de capacidades nativas e permissoes.
7. Lista de telas com estados.
8. Decisao de arquitetura e repositorio.
9. Plano de implementacao por marcos.

## 14. Decisoes Em Aberto

- Novo repositorio ou monorepo?
- iOS primeiro ou iOS e Android juntos?
- Backend atual com API mobile nova ou backend novo em paralelo?
- Qual usuario/conta demo representara o reviewer/tester?
- Qual escopo exato do MVP nativo para ministros?
- Quando o admin web sera substituido, se for?
- Como anonimizar fixtures reais para testes?

## 15. Criterio De Pronto Da Transicao

Esta transicao estará pronta quando houver:

- PRD v3 aprovado;
- telas P0 definidas;
- matriz de permissao aprovada;
- contrato API mobile v1 desenhado;
- arquitetura iOS/Android decidida;
- backlog inicial escrito;
- app atual mantido estavel em producao;
- primeiro milestone nativo com escopo pequeno e testavel.
