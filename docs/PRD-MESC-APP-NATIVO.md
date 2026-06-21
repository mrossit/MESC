# PRD v3 - MESC Native

**Data:** 2026-06-20
**Status:** rascunho revisado a partir do briefing de transicao
**Fonte principal:** `docs/MESC_NATIVE_TRANSITION_BRIEF_2026-06-20.md`
**Produto:** novo app nativo MESC para iOS e Android
**Sistema atual:** permanece em producao como referencia funcional e operacional

---

## 1. Decisao De Produto

O MESC Native sera iniciado como um novo produto nativo, usando o app atual em Replit/Capacitor apenas como referencia de dominio, dados, regras e aprendizados.

A publicacao nas lojas do app Capacitor deixa de ser o objetivo principal. O ciclo de TestFlight mostrou que o app atual pode ser empacotado, mas tambem mostrou limites de UX nativa, WebView, safe area, biometria, header, bottom navigation, fotos autenticadas e manutencao acumulada.

O objetivo agora e construir com calma:

- PRD v3 revisado antes de codigo pesado;
- telas e fluxos definidos antes da implementacao;
- arquitetura nativa iOS/Android;
- contratos de API mobile versionados;
- testes fortes desde o primeiro milestone;
- menor dependencia de remendos sobre a base web/PWA.

### 1.1 O Que Continua Vivo

O app atual continua atendendo a operacao enquanto o MESC Native amadurece.

Devem ser preservados como aprendizado e materia-prima:

- banco de dados real, depois de revisado e saneado;
- usuarios, ministros, comunidades, fotos, escala oficial e historico;
- regras de negocio ja validadas na pratica;
- scripts de backup, restore, health check e data doctor;
- aprendizados de TestFlight 5.4.3 (50414);
- documentos existentes sobre questionarios, escalas, multi-comunidade e seguranca;
- dominio `https://saojudastadeu.app`;
- identidade visual Sao Judas Tadeu/MESC.

### 1.2 O Que Nao Sera Base Obrigatoria

O novo app nao deve nascer como clone do web app.

Nao usar como base obrigatoria:

- WebView como experiencia principal;
- componentes mobile derivados de dashboard web;
- Liquid Glass via CSS como objetivo final;
- navegacao dependente de rotas web;
- telas administrativas densas como primeira experiencia mobile;
- estados de erro tecnicos exibidos ao ministro;
- rotas de API atuais sem contrato mobile claro.

---

## 2. Objetivo Do Produto

O MESC Native deve ser o app oficial dos ministros, coordenadores de comunidade e coordenadores paroquiais para organizar missoes, disponibilidade, escalas, substituicoes, comunicacao e crescimento multi-comunidade.

O produto deve transmitir tres sensacoes:

- **Clareza:** o ministro sabe sua proxima missao e o que precisa responder.
- **Confianca:** o coordenador entende cobertura, pendencias e motivos das sugestoes de escala.
- **Cuidado:** a experiencia parece feita para a comunidade, nao adaptada de um painel administrativo.

### 2.1 Problemas A Resolver

- Ministros nao sabem com facilidade quando servirao, se precisam responder questionario ou se ha pendencias.
- Coordenadores perdem tempo consolidando disponibilidade, substituicoes e cobertura.
- Questionarios, eventos, escala e gerador precisam de contratos rigidos para evitar respostas ignoradas.
- Multi-comunidade exige isolamento de dados antes de conveniencia operacional.
- O app atual mistura PWA, Replit, admin web, mobile e release em uma mesma base.
- Recursos nativos, como biometria, camera, notificacoes e localizacao, precisam de justificativa, fallback e testes.

### 2.2 Objetivos

- Criar uma experiencia nativa serena, rapida e confiavel para ministros.
- Dar ao coordenador uma operacao mobile segura para acompanhar respostas, substituicoes e publicacao de escala.
- Proteger dados por comunidade, papel e contexto.
- Definir uma API mobile v1 que reduza dependencia de payloads e fluxos da UI web.
- Construir base tecnica preparada para iOS e Android sem pressa artificial de loja.
- Garantir que cada feature P0 tenha criterio de aceite, estados de tela, contrato de API e plano de teste.

### 2.3 Nao Objetivos Do MVP

- Substituir todo o admin web no primeiro release nativo.
- Copiar todas as telas do app atual.
- Reimplementar o gerador completo antes de corrigir contratos de questionario, evento e multi-comunidade.
- Fazer IA decidir escala sem revisao humana.
- Exigir geolocalizacao, camera ou biometria para uso basico.
- Criar sessao infinita sob o nome de "manter conectado".
- Priorizar widgets, Apple Watch, calendario nativo ou IA local antes do fluxo P0.

---

## 3. Personas E Contexto De Uso

### 3.1 Ministro

Usa o app em momentos curtos: antes da missa, ao responder disponibilidade, ao receber aviso ou ao precisar pedir substituicao.

Tarefas principais:

- entrar com seguranca;
- manter sessao restauravel;
- desbloquear com Face ID/Touch ID/biometria apos primeiro login;
- ver a proxima missa;
- consultar escalas do mes;
- responder questionario;
- pedir substituicao;
- acompanhar status da substituicao;
- receber avisos;
- atualizar perfil, foto e contato;
- gerenciar privacidade e exclusao de conta.

### 3.2 Coordenador De Comunidade

Usa o app para acompanhar a vida operacional da comunidade, mas ainda pode depender do admin web para tarefas densas enquanto o nativo amadurece.

Tarefas principais:

- ver painel da comunidade;
- acompanhar respostas do questionario;
- identificar pendencias;
- revisar cobertura por missa;
- acompanhar substituicoes pendentes;
- consultar diretorio de ministros;
- ajustar e publicar escala dentro de limites seguros;
- entender motivos, confianca e alertas da sugestao de escala.

### 3.3 Coordenador Paroquial

Atua no nivel consolidado, com acesso multi-comunidade controlado.

Tarefas principais:

- alternar comunidade;
- ver cobertura consolidada;
- criar e acompanhar comunidades;
- atribuir coordenadores por comunidade;
- auditar isolamento e inconsistencias;
- padronizar regras, calendario e comunicados.

### 3.4 Administrador Tecnico

Nao e o foco de UX do app nativo P0, mas precisa de suporte operacional no ecossistema.

Tarefas principais:

- monitorar erros;
- validar integridade de dados;
- executar backup/restore;
- acompanhar logs e auditoria;
- gerenciar configuracoes sensiveis;
- apoiar release e rollback.

---

## 4. Escopo Por Release

### 4.1 P0 - MVP Nativo

P0 deve resolver o ciclo essencial sem tentar copiar o web app.

Ministro:

- login seguro;
- primeiro login sempre com senha;
- biometria para desbloquear credenciais salvas;
- sessao persistente segura com "manter conectado";
- home "Minha Missao";
- proxima escala;
- lista de escalas do mes;
- responder questionario atual;
- pedir substituicao;
- acompanhar status da substituicao;
- avisos e notificacoes;
- perfil, contato e foto por camera/galeria;
- privacidade e exclusao de conta;
- estados sem conexao e sessao expirada.

Coordenador:

- painel da comunidade;
- respostas do questionario;
- pendencias de disponibilidade;
- escala do mes;
- cobertura por missa;
- substituicoes pendentes;
- publicar/ajustar escala com seguranca;
- diretorio de ministros da comunidade.

Plataforma:

- API mobile v1;
- multi-comunidade com isolamento;
- device registry, push token e preferencias de notificacao;
- logs/auditoria;
- backup/restore;
- monitoramento;
- contratos OpenAPI;
- matriz de permissoes por papel e comunidade.

### 4.2 P1 - Operacao E Crescimento

- gerador v2.1 explicavel;
- aprendizado de ajustes apos publicacao;
- exports nativos;
- comunicacao segmentada;
- notificacao de atualizacao do app/conteudo;
- geolocalizacao opcional para check-in presencial;
- formacao;
- gamificacao com cuidado pastoral;
- relatorios mobile simplificados.

### 4.3 P2 - Inteligencia E Extensoes

- widgets iOS/Android;
- calendario nativo;
- offline avancado;
- Apple Watch;
- Apple Intelligence via App Intents/Siri/Shortcuts;
- Google Gemini/Gemini Nano/AppFunctions;
- assistente de coordenador com feature flag, auditoria e fallback sem IA.

---

## 5. Metricas De Sucesso

### 5.1 Produto

- ministros conseguem identificar a proxima missao em ate 10 segundos apos abrir o app;
- taxa de resposta de questionario mensal aumenta;
- tempo de resolucao de substituicao cai;
- queda de mensagens manuais para confirmar escala;
- coordenador consegue ver cobertura e pendencias sem abrir planilha ou WhatsApp;
- erros humanos de escala por resposta ignorada diminuem.

### 5.2 Tecnicas

- crash-free sessions acima de 99,5% no MVP;
- p95 de bootstrap da home abaixo de 2,5 segundos em rede boa;
- endpoints P0 com testes de contrato;
- zero vazamento conhecido entre comunidades em testes automatizados;
- refresh token rotativo validado por testes;
- logs suficientes para auditoria sem expor dados sensiveis desnecessarios.

### 5.3 Release

- smoke test em aparelho real iOS e Android antes de release;
- backup/restore validado antes de migracoes;
- health check e data doctor executados antes de rollout;
- monitoramento de crash ativo;
- rollback operacional definido.

---

## 6. Jornadas Principais

### 6.1 Jornada Do Ministro

1. Abre o app.
2. Faz login com email/senha.
3. Opcionalmente ativa biometria.
4. Ve "Minha Missao" com proxima missa, avisos e pendencias.
5. Responde questionario atual ou confirma que nao ha pendencias.
6. Consulta escalas do mes.
7. Se nao puder servir, solicita substituicao.
8. Acompanha status e recebe notificacao quando houver decisao.
9. Atualiza foto/contato quando necessario.
10. Gerencia sessao, dispositivos e privacidade.

### 6.2 Jornada Do Coordenador

1. Abre painel da comunidade.
2. Confere pendencias de questionario e cobertura do mes.
3. Revisa respostas e eventos vinculados.
4. Gera ou consulta sugestao de escala.
5. Analisa motivos, confianca, alertas e alternativas.
6. Ajusta escala.
7. Publica escala.
8. Acompanha confirmacoes, substituicoes e faltas.
9. Fecha aprendizado mensal com diferenca entre sugestao, ajustes e execucao real.

### 6.3 Jornada Do Coordenador Paroquial

1. Acessa visao consolidada.
2. Alterna entre comunidades.
3. Verifica cobertura, pendencias e risco por comunidade.
4. Audita dados sensiveis e isolamento.
5. Define ou revisa coordenadores por comunidade.
6. Exporta ou acompanha relatorios permitidos pelo papel.

---

## 7. Telas E Estados Obrigatorios

Toda tela P0 deve ter:

- estado carregando;
- estado vazio;
- estado de erro humano;
- estado sem conexao quando aplicavel;
- estado de permissao negada quando aplicavel;
- modo claro;
- modo escuro;
- acessibilidade com Dynamic Type/font scale;
- criterio de aceite.

### 7.1 Ministro

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

### 7.2 Coordenador

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

### 7.3 Coordenador Paroquial

1. Visao consolidada
2. Seletor de comunidade
3. Cadastro de comunidade
4. Coordenadores por comunidade
5. Relatorios por comunidade
6. Auditoria de isolamento

---

## 8. Requisitos De UX E Design System

Referencia visual detalhada: `docs/MESC_NATIVE_VISUAL_SYSTEM_2026-06-20.md`.

### 8.1 Direcao Visual

O visual deve ser sereno, liturgico, moderno e nativo.

Usar:

- navegacao nativa;
- hierarquia clara;
- superficies glass apenas em barras, sheets e destaques;
- componentes com toque confortavel;
- alto contraste;
- estados vazios humanos;
- linguagem pastoral, curta e objetiva;
- identidade Sao Judas Tadeu/MESC sem transformar cada tela em material promocional.

Evitar:

- dashboard administrativo como primeira tela do ministro;
- excesso de cards;
- bordas fortes em todos os elementos;
- fundo bege/preto solido demais;
- vidro aplicado indiscriminadamente;
- textos explicativos longos dentro da UI;
- mensagens tecnicas como erro final para usuario.

### 8.2 Liquid Glass E Plataformas

iOS:

- usar APIs nativas quando disponiveis;
- respeitar Reduce Transparency e Increase Contrast;
- oferecer fallback elegante em versoes antigas;
- testar em device real, nao somente no Simulator.

Android:

- nao copiar iOS literalmente;
- adaptar com Material/Jetpack Compose;
- usar translucidez moderada quando fizer sentido;
- preservar consistencia de marca.

### 8.3 Acessibilidade

- suportar Dynamic Type/font scale;
- alvos de toque confortaveis;
- contraste validado nos modos claro e escuro;
- labels acessiveis para botoes de icone;
- telas criticas navegaveis por leitor de tela;
- nenhuma informacao essencial deve depender apenas de cor.

---

## 9. Capacidades Nativas E Permissoes

Permissoes devem ser solicitadas apenas no momento de uso, com justificativa humana e alternativa funcional quando negadas.

| Capacidade | Prioridade | Decisao de produto |
|------------|------------|--------------------|
| Camera | P0 | Usar para foto de perfil e, futuramente, anexos autorizados. O app tambem aceita galeria/arquivos. Negar camera nao bloqueia o ministro. |
| Biometria | P0 | Face ID/Touch ID no iOS e BiometricPrompt no Android para desbloquear credenciais salvas. Primeiro login sempre exige senha. |
| Sessao persistente | P0 | "Manter conectado" restaura sessao com refresh token rotativo, armazenamento seguro e logout remoto por dispositivo. Nao e token infinito. |
| Push notification | P0 | Registrar dispositivo, token, plataforma e preferencias. Push abre a tela correta por deep link e respeita horario silencioso. |
| Notificacoes de atualizacao | P0/P1 | P0 para escala, questionario, substituicao e comunicados. P1 para nova versao, atualizacao obrigatoria e notas de versao via configuracao remota. |
| Geolocalizacao | P1 | Somente para check-in presencial, validacao de chegada ou sugestao de comunidade proxima. Sem rastreamento continuo em background. |
| Apple Intelligence | P2 | Expor acoes seguras por App Intents/Siri/Shortcuts quando adequado. Nao enviar dados pastorais/sacramentais a modelos sem base legal e consentimento claro. |
| Google Gemini | P2 | Avaliar Gemini API, Gemini Nano/AICore e AppFunctions. Priorizar casos locais/privados quando disponiveis e manter fallback sem IA. |

Regras comuns:

- privacidade e exclusao de dados cobrem foto, device token, localizacao e preferencias de IA;
- IA apoia coordenadores, nao toma decisao final de escala;
- recursos de IA sao desligaveis por comunidade/paroquia;
- recursos de IA sao auditaveis e protegidos por feature flag.

---

## 10. Arquitetura Recomendada

### 10.1 Decisao Preferencial

Caminho preferencial inicial:

- iOS: SwiftUI;
- Android: Kotlin + Jetpack Compose;
- Backend: manter backend atual, criando camada de contratos mobile;
- Banco: Postgres atual, depois de revisao e saneamento;
- Admin web/Replit: continua em uso enquanto o app nativo amadurece.

Alternativas como Kotlin Multiplatform, Flutter ou React Native podem ser reavaliadas se dois apps nativos ficarem caros demais. Elas nao sao o ponto de partida deste PRD.

### 10.2 Repositorio

Recomendacao inicial: criar novo repositorio `MESC-Native` para apps nativos.

Motivos:

- separa ciclo novo do legado;
- reduz risco de misturar PWA, Capacitor, admin web e nativo real;
- melhora clareza mental de produto novo;
- permite usar este repositorio como referencia e backend ate haver motivo forte para migrar.

Opcao alternativa: monorepo dentro do repo atual, caso o custo operacional de dois repositorios pese mais que a separacao.

### 10.3 Visao Geral

```text
MESC Native iOS (SwiftUI)
        |
        | HTTPS / API Mobile v1
        |
Backend atual evoluido
        |
Postgres atual saneado
        |
Admin Web/Replit continua em uso
        |
MESC Native Android (Kotlin/Compose)
```

### 10.4 Camadas iOS

- `App`: bootstrap, navegacao, dependency injection;
- `DesignSystem`: cores, tipografia, Liquid Glass nativo, componentes;
- `Auth`: login, biometria, keychain, sessao;
- `Mission`: home do ministro e proxima missa;
- `Schedules`: escalas;
- `Questionnaires`: disponibilidade;
- `Substitutions`: trocas;
- `Communities`: multi-comunidade;
- `Profile`: perfil, foto e privacidade;
- `DeviceCapabilities`: camera, notificacoes, localizacao, biometria e versao do app;
- `Intelligence`: App Intents e assistencias protegidas;
- `Networking`: API client, retries e refresh de auth;
- `Persistence`: cache local seguro;
- `Observability`: logs, crash e analytics etico.

### 10.5 Camadas Android

- `app`: navegacao, DI e theme;
- `designsystem`: Material/Compose adaptado a identidade MESC;
- `auth`: login, biometria e encrypted storage;
- `mission`;
- `schedules`;
- `questionnaires`;
- `substitutions`;
- `communities`;
- `profile`;
- `devicecapabilities`;
- `intelligence`;
- `network`;
- `datastore`;
- `observability`.

---

## 11. Dados E Migracao

### 11.1 Dados A Preservar

- usuarios e papeis;
- ministros ativos/inativos;
- comunidades;
- fotos;
- escalas oficiais;
- historico de confirmacoes e substituicoes;
- questionarios e respostas;
- configuracoes de missas e eventos;
- materiais de formacao quando entrarem no escopo;
- logs/auditoria necessarios para suporte.

### 11.2 Dados A Reavaliar

- modelo de roles e permissao;
- formato das respostas de questionario;
- relacao entre pergunta personalizada, evento e gerador;
- gerador legado de escala;
- formato de push subscriptions web versus device registry nativo;
- dados sensiveis exibidos em telas administrativas mobile.

### 11.3 Gates De Migracao

- app atual congelado como sistema em producao antes de migracoes destrutivas;
- backup testado antes de qualquer alteracao relevante;
- data doctor executado sobre dados reais;
- fixtures anonimizadas para testes;
- contratos mobile escritos antes de alterar payloads usados pelo web;
- rotas web e mobile coexistem ate o nativo provar equivalencia funcional P0.

---

## 12. API Mobile v1

O briefing lista os contratos como `/mobile/v1`. Como o backend atual usa prefixo `/api`, este PRD define a forma implementavel como `/api/mobile/v1`.

### 12.1 Convencoes

Headers:

```http
Authorization: Bearer <access_token>
X-Device-Id: <device_id>
X-App-Version: <semver/build>
X-Platform: ios | android
X-Community-Id: <community_id opcional por contexto>
Idempotency-Key: <uuid para mutacoes criticas>
```

Formato de erro:

```json
{
  "error": {
    "code": "QUESTIONNAIRE_EVENT_BINDING_REQUIRED",
    "message": "Revise os eventos antes de publicar o questionario.",
    "details": {},
    "traceId": "req_123"
  }
}
```

Regras:

- toda resposta sensivel deriva escopo do usuario autenticado;
- `communityId` explicito nao pode ampliar permissao;
- mutacoes criticas usam idempotencia;
- endpoints P0 tem contrato OpenAPI;
- respostas sao pequenas e orientadas a tela mobile;
- versao de contrato nao quebra clientes antigos sem feature/version gate.

### 12.2 Auth E Sessao

```http
POST /api/mobile/v1/auth/login
POST /api/mobile/v1/auth/refresh
POST /api/mobile/v1/auth/logout
GET  /api/mobile/v1/session
GET  /api/mobile/v1/session/devices
DELETE /api/mobile/v1/session/devices/{deviceId}
```

`POST /auth/login`:

```json
{
  "email": "ministro@example.com",
  "password": "senha",
  "rememberDevice": true,
  "device": {
    "platform": "ios",
    "model": "iPhone",
    "appVersion": "1.0.0"
  }
}
```

Resposta:

```json
{
  "accessToken": "jwt_curto",
  "refreshToken": "refresh_rotativo",
  "expiresAt": "2026-06-20T18:00:00-03:00",
  "user": {
    "id": "uuid",
    "name": "Maria",
    "role": "ministro",
    "communities": [
      { "id": "uuid", "name": "Sao Judas Tadeu", "role": "ministro" }
    ]
  },
  "requiresPasswordChange": false,
  "canEnableBiometrics": true
}
```

### 12.3 Device Registry E Configuracao

```http
POST   /api/mobile/v1/devices
PATCH  /api/mobile/v1/devices/{id}
DELETE /api/mobile/v1/devices/{id}
GET    /api/mobile/v1/app/config
```

Device:

```json
{
  "platform": "ios",
  "pushToken": "apns_or_fcm_token",
  "appVersion": "1.0.0",
  "locale": "pt-BR",
  "timezone": "America/Sao_Paulo",
  "notificationPreferences": {
    "schedule": true,
    "questionnaire": true,
    "substitution": true,
    "announcements": true,
    "quietHours": { "start": "22:00", "end": "07:00" }
  }
}
```

Config:

```json
{
  "minimumSupportedVersion": "1.0.0",
  "latestVersion": "1.0.1",
  "forceUpdate": false,
  "featureFlags": {
    "nativeCheckin": false,
    "coordinatorAssist": false
  }
}
```

### 12.4 Perfil

```http
GET  /api/mobile/v1/me
PATCH /api/mobile/v1/me
POST /api/mobile/v1/me/photo
GET  /api/mobile/v1/me/privacy
DELETE /api/mobile/v1/me/account
```

Regras:

- foto aceita camera, galeria ou arquivo;
- upload grande tem validacao de tamanho e tipo;
- dados sacramentais e pastorais sao minimizados no app P0;
- exclusao de conta segue regras de compliance e preservacao legal/auditoria.

### 12.5 Minha Missao

```http
GET /api/mobile/v1/mission/home
```

Resposta:

```json
{
  "nextMission": {
    "scheduleId": "uuid",
    "date": "2026-07-05",
    "time": "09:00",
    "community": "Sao Judas Tadeu",
    "position": 2,
    "status": "published",
    "confirmation": "pending"
  },
  "pendingActions": [
    {
      "type": "questionnaire",
      "title": "Disponibilidade de julho",
      "dueAt": "2026-06-25T23:59:00-03:00",
      "deepLink": "mesc://questionnaires/current"
    }
  ],
  "announcements": []
}
```

### 12.6 Escalas

```http
GET  /api/mobile/v1/schedules/month?month=YYYY-MM
GET  /api/mobile/v1/schedules/{id}
POST /api/mobile/v1/schedules/{id}/confirm
POST /api/mobile/v1/schedules/generate-preview
POST /api/mobile/v1/schedules/generation/{id}/publish
PATCH /api/mobile/v1/schedules/{id}/assignments
```

Regras:

- ministro ve suas escalas e informacoes publicas permitidas;
- coordenador ve apenas comunidade permitida;
- publicacao exige validacao de cobertura, conflitos e auditoria;
- gerador preview nao escreve escala oficial ate publicacao.

### 12.7 Questionarios

```http
GET  /api/mobile/v1/questionnaires/current
GET  /api/mobile/v1/questionnaires/{id}
POST /api/mobile/v1/questionnaires/{id}/responses
GET  /api/mobile/v1/admin/questionnaires/{id}/responses
POST /api/mobile/v1/admin/questionnaires
PATCH /api/mobile/v1/admin/questionnaires/{id}
POST /api/mobile/v1/admin/questionnaires/{id}/publish
```

Pergunta vinculada a evento:

```json
{
  "questionId": "q_event_01",
  "questionType": "availability",
  "label": "Voce pode servir na missa de 12/07 as 19h?",
  "eventBinding": {
    "eventId": "uuid",
    "date": "2026-07-12",
    "time": "19:00",
    "communityId": "uuid",
    "requiredForScheduleGeneration": true
  },
  "eligibilityRule": {
    "roles": ["ministro"],
    "communityId": "uuid"
  }
}
```

### 12.8 Substituicoes

```http
GET  /api/mobile/v1/substitutions
POST /api/mobile/v1/substitutions
PATCH /api/mobile/v1/substitutions/{id}/cancel
PATCH /api/mobile/v1/admin/substitutions/{id}/approve
PATCH /api/mobile/v1/admin/substitutions/{id}/reject
```

Regras:

- urgencia e calculada pelo backend;
- coordenador recebe contexto suficiente para decidir;
- solicitante acompanha status sem precisar perguntar por fora;
- aprovar substituicao atualiza escala e gera auditoria.

### 12.9 Comunidades E Admin Mobile Leve

```http
GET  /api/mobile/v1/communities
GET  /api/mobile/v1/admin/community-dashboard
GET  /api/mobile/v1/admin/ministers
GET  /api/mobile/v1/admin/coverage?month=YYYY-MM
GET  /api/mobile/v1/admin/audit/community-scope
```

### 12.10 Check-in E IA

```http
POST /api/mobile/v1/checkins
POST /api/mobile/v1/ai/coordinator-assist
```

`/checkins` e P1 e exige geolocalizacao foreground opcional quando habilitada.

`/ai/coordinator-assist` e P2, protegido por feature flag, rate limit, logs, autorizacao estrita e redacao de dados sensiveis.

---

## 13. Contratos Criticos De Produto

### 13.1 Questionario, Evento E Gerador

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
- preview mostra eventos gerados;
- respostas vinculadas a evento aparecem no painel do coordenador antes da geracao.

### 13.2 Gerador De Escala Explicavel

Toda sugestao deve incluir:

- ministro sugerido;
- disponibilidade considerada;
- restricoes aplicadas;
- score;
- motivos;
- confianca;
- alertas;
- alternativas.

Toda publicacao deve comparar:

- sugestao original;
- edicoes do coordenador;
- substituicoes posteriores;
- confirmacoes;
- faltas;
- aprendizado produzido.

### 13.3 Multi-Comunidade

Regra: isolamento de dados vem antes de conveniencia.

Todo endpoint sensivel deve receber ou derivar:

- `communityId`;
- papel do usuario;
- escopo permitido;
- modo consolidado apenas para coordenador paroquial/gestor.

Gates:

- ministro de A nao ve dados de B;
- coordenador de A nao exporta B;
- coordenador paroquial alterna e consolida dentro do escopo;
- logs registram escopo usado.

### 13.4 Sessao, Biometria E Dispositivos

Regra: biometria desbloqueia credenciais locais, nao substitui seguranca de servidor.

Gates:

- primeiro login exige senha;
- refresh token e rotativo;
- logout remoto revoga dispositivo;
- troca de senha revoga sessoes conforme politica;
- app lida com refresh expirado sem loop;
- "manter conectado" e opcional e revogavel.

---

## 14. Permissoes E Autorizacao

### 14.1 Papeis

| Papel | Escopo padrao |
|-------|---------------|
| Ministro | Dados proprios, escalas publicadas e informacoes necessarias da sua comunidade. |
| Coordenador de comunidade | Dados operacionais da comunidade atribuida. |
| Coordenador paroquial | Visao consolidada e alternancia entre comunidades autorizadas. |
| Gestor/admin | Administracao ampla, auditoria e configuracoes sensiveis. |
| Administrador tecnico | Operacao tecnica sem necessidade de expor mais dados pastorais que o necessario. |

### 14.2 Matriz P0

| Acao | Ministro | Coord. comunidade | Coord. paroquial | Gestor |
|------|----------|-------------------|------------------|--------|
| Ver propria proxima missao | Sim | Sim | Sim | Sim |
| Responder proprio questionario | Sim | Sim | Sim | Sim |
| Pedir propria substituicao | Sim | Sim | Sim | Sim |
| Ver respostas da comunidade | Nao | Sim | Sim, por escopo | Sim |
| Publicar escala | Nao | Sim, comunidade | Sim, por escopo | Sim |
| Ver outra comunidade | Nao | Nao | Sim | Sim |
| Gerenciar usuarios | Nao | Limitado | Sim, por escopo | Sim |
| Auditar isolamento | Nao | Nao | Sim | Sim |
| Configurar feature flags/IA | Nao | Nao | Limitado | Sim |

---

## 15. Offline E Sincronizacao

### 15.1 P0

Cache local seguro para:

- usuario autenticado;
- configuracao do app;
- proxima missao;
- escalas publicadas do mes;
- questionario atual em andamento;
- avisos recentes;
- preferencias de notificacao.

Regras:

- dados sensiveis ficam em armazenamento seguro quando aplicavel;
- resposta de questionario pode ser salva como rascunho local;
- mutacoes offline sao limitadas e precisam de estado claro;
- ao reconectar, conflitos sao explicados de forma humana.

### 15.2 P1/P2

- fila de sincronizacao mais robusta;
- resolucao de conflitos em questionarios e substituicoes;
- calendario nativo;
- modo offline avancado para coordenador apenas apos contratos P0 estaveis.

---

## 16. Seguranca, Privacidade E Compliance

Requisitos:

- HTTPS obrigatorio;
- access token curto;
- refresh token rotativo;
- armazenamento seguro: Keychain no iOS, EncryptedSharedPreferences/Keystore no Android;
- protecao contra replay em mutacoes criticas;
- rate limit em auth, substituicoes e endpoints de IA;
- logs sem segredos;
- mascaramento de dados sensiveis em crash reports;
- exclusao de conta e privacidade disponiveis no app;
- consentimento claro para notificacoes, camera, localizacao e IA;
- nenhuma credencial ou segredo em documento, repo ou fixture.

---

## 17. Observabilidade

### 17.1 App

- crash reporting;
- eventos de erro por tela;
- falhas de login, refresh e upload;
- status de push token;
- tempo de bootstrap da home;
- deep links abertos por notificacao;
- estado offline/sync.

### 17.2 Backend

- traceId por request;
- logs de auditoria para escala, questionario, substituicao e comunidade;
- alertas de erro por endpoint;
- metricas de latencia p50/p95;
- health check e readiness;
- data doctor periodico para inconsistencias criticas.

### 17.3 Etica De Analytics

- coletar o minimo necessario;
- nao criar leaderboard pastoral invasivo;
- evitar rastreamento comportamental sem necessidade;
- permitir desligar recursos sensiveis por configuracao.

---

## 18. Plano De Testes

### 18.1 Antes Do Codigo

- checklist de aceite por feature;
- prototipo de fluxo;
- revisao de API;
- matriz de permissoes;
- fixtures de dados reais anonimizados;
- OpenAPI inicial;
- criterios de release por milestone.

### 18.2 iOS

- unit tests de services/view models;
- snapshot tests das telas principais;
- UI tests de login, home, escala, questionario e substituicao;
- testes de biometria no Simulator e aparelho real;
- testes de camera/galeria, upload de foto, permissao negada e imagem grande;
- testes de sessao persistente, refresh expirado, logout remoto e troca de aparelho;
- testes de push, deep link, horario silencioso e notificacao de atualizacao;
- testes de App Intents/Apple Intelligence com feature flag, fallback e dados sensiveis redigidos.

### 18.3 Android

- unit tests;
- Compose UI tests;
- screenshot tests;
- testes de biometria em emulator e aparelho real;
- testes de camera/galeria, upload de foto, permissao negada e imagem grande;
- testes de sessao persistente, refresh expirado, logout remoto e troca de aparelho;
- testes de push, deep link, horario silencioso e notificacao de atualizacao;
- testes de geolocalizacao foreground, permissao negada, local impreciso e ausencia de GPS;
- testes de Gemini/Gemini Nano/AppFunctions com feature flag, fallback e dados sensiveis redigidos.

### 18.4 Backend/API

- contratos OpenAPI;
- testes anti-vazamento multi-comunidade;
- testes de questionario-evento-gerador;
- testes de escala v2.1 com fixtures de junho/2026;
- testes de registro/revogacao de dispositivo e push token;
- testes de version gate para atualizacao opcional/obrigatoria;
- testes de check-in com localizacao, anti-replay e auditoria;
- testes de endpoints de IA com autorizacao, rate limit, logs e redacao de dados.

### 18.5 Release

- health check;
- data doctor;
- backup/restore;
- smoke test em device real;
- crash monitoring ativo;
- plano de rollback.

---

## 19. Plano De Implementacao

### Fase 0 - Preparacao

- aprovar PRD v3;
- definir telas P0;
- validar matriz de permissoes;
- desenhar contrato API mobile v1;
- decidir repositorio;
- escolher se o primeiro milestone sera iOS-only ou iOS/Android em paralelo;
- congelar app atual como sistema em producao para evitar acoplamento de emergencia.

### Fase 1 - Base Nativa

- criar projeto SwiftUI;
- criar projeto Android/Compose ou iniciar iOS primeiro com arquitetura replicavel;
- implementar design system base;
- implementar API client;
- login, sessao e refresh token;
- biometria;
- device registry;
- observabilidade.

### Fase 2 - Ministro

- Home Minha Missao;
- proxima escala;
- escalas do mes;
- questionario atual;
- substituicao;
- perfil/foto;
- privacidade e exclusao de conta;
- notificacoes P0.

### Fase 3 - Coordenador

- painel comunidade;
- respostas;
- escalas;
- substituicoes;
- diretorio;
- publicacao segura.

### Fase 4 - Contratos Fortes

- questionario -> evento -> gerador;
- gerador v2.1 explicavel;
- aprendizado mensal;
- multi-comunidade completo;
- auditoria ampliada.

### Fase 5 - Lojas

- TestFlight/Play Internal;
- testers externos;
- screenshots;
- privacy labels/data safety;
- review;
- rollout gradual.

---

## 20. Backlog Inicial

### Produto E UX

- desenhar fluxos P0 do ministro;
- desenhar fluxos P0 do coordenador;
- definir tom de voz de mensagens de erro;
- definir estados vazios;
- definir criterio de aceite por tela;
- validar acessibilidade minima.

### API E Dados

- mapear endpoints atuais usados pelo app;
- desenhar OpenAPI `/api/mobile/v1`;
- criar fixtures anonimizadas;
- definir modelo de device registry nativo;
- definir contrato questionario-evento;
- definir matriz multi-comunidade;
- planejar migracoes sem quebrar web.

### Nativo

- decidir repositorio;
- decidir iOS primeiro ou paralelo;
- definir arquitetura de modulos;
- definir armazenamento seguro;
- definir estrategia de push;
- definir estrategia de cache;
- definir observabilidade.

---

## 21. Riscos E Cuidados

Riscos:

- tentar copiar tudo do app atual;
- iniciar Swift e Android ao mesmo tempo sem PRD fechado;
- manter backend sem contrato mobile claro;
- gastar energia em visual antes de contrato de dados;
- prometer multi-comunidade antes de read-scoping completo;
- usar biometria como seguranca falsa;
- pedir camera/localizacao cedo demais;
- transformar geolocalizacao em rastreamento;
- deixar IA sugerir ou publicar escala sem auditoria humana.

Cuidados:

- app atual segue vivo;
- codigo novo so com feature definida;
- toda feature nasce com criterio de aceite;
- toda tela nasce com estados;
- toda regra sensivel nasce com teste;
- toda permissao nativa nasce com justificativa, fallback e teste de negacao;
- todo recurso de IA nasce atras de feature flag, logs e revisao humana.

---

## 22. Decisoes Em Aberto

- Novo repositorio `MESC-Native` ou monorepo?
- iOS primeiro ou iOS e Android juntos?
- Backend atual com API mobile nova ou backend novo em paralelo?
- Qual usuario/conta demo representara reviewer/tester?
- Qual escopo exato do MVP nativo para ministros?
- Quando o admin web sera substituido, se for?
- Como anonimizar fixtures reais para testes?
- Qual politica de retencao para device tokens, logs e geolocalizacao de check-in?

---

## 23. Criterio De Pronto Da Transicao

Esta transicao estara pronta quando houver:

- PRD v3 aprovado;
- telas P0 definidas;
- matriz de permissao aprovada;
- contrato API mobile v1 desenhado;
- arquitetura iOS/Android decidida;
- backlog inicial escrito;
- app atual mantido estavel em producao;
- primeiro milestone nativo com escopo pequeno e testavel.

---

## 24. Proxima Entrega Recomendada

Produzir a especificacao de telas P0 com:

- objetivo da tela;
- usuario principal;
- entrada/saida de dados;
- estados obrigatorios;
- acoes primarias e secundarias;
- contratos de API usados;
- permissoes nativas envolvidas;
- criterios de aceite;
- testes esperados.
