# MESC Native - Especificacao De Telas P0

**Data:** 2026-06-20
**Status:** primeira especificacao de desenvolvimento apos PRD v3
**Base:** `docs/PRD-MESC-APP-NATIVO.md` e `docs/MESC_NATIVE_TRANSITION_BRIEF_2026-06-20.md`
**Visual:** `docs/MESC_NATIVE_VISUAL_SYSTEM_2026-06-20.md`
**Runbook tecnico:** `docs/MOBILE_FOUNDATION_RUNBOOK_2026-06-21.md`
**Objetivo:** transformar o escopo P0 em telas implementaveis, com dados, estados, APIs, criterios de aceite e testes esperados.

---

## 1. Principios Para Implementacao

1. O app nativo nao deve copiar o web app; cada tela deve resolver uma tarefa curta e clara.
2. A primeira experiencia do ministro deve ser pastoral e objetiva: proxima missao, pendencias e avisos.
3. Coordenador mobile P0 deve operar com seguranca, sem tentar substituir todas as telas densas do admin web.
4. Toda tela P0 precisa nascer com loading, vazio, erro humano, sem conexao e sessao expirada quando aplicavel.
5. Toda mutacao critica deve usar `Idempotency-Key`, gerar auditoria no backend e respeitar escopo de comunidade.
6. Permissoes nativas devem ser solicitadas apenas no momento de uso, com fallback funcional.
7. A API mobile deve expor payloads orientados a tela, nao reaproveitar payloads administrativos extensos.

---

## 2. Navegacao P0

### 2.1 Ministro

```text
Login
  -> Ativar biometria (opcional)
  -> Minha Missao
      -> Proxima missa
      -> Minhas escalas
      -> Questionario atual
      -> Pedir substituicao
      -> Status da substituicao
      -> Avisos
      -> Perfil
          -> Foto e dados pessoais
          -> Sessao e dispositivos
          -> Privacidade e exclusao de conta
```

### 2.2 Coordenador

```text
Login
  -> Minha Missao / Painel da comunidade
      -> Respostas do questionario
      -> Escala do mes
      -> Cobertura por missa
      -> Substituicoes pendentes
      -> Diretorio de ministros
      -> Ajustar/Publicar escala
```

### 2.3 Regras De Navegacao

- Se o token expirar e refresh funcionar, manter o usuario no contexto atual.
- Se refresh falhar, abrir `Sessao expirada` preservando a intencao para retorno apos login.
- Push notification deve abrir a tela alvo por deep link se o usuario tiver permissao.
- Alternancia de comunidade deve ser explicita para coordenador paroquial e gestor.

---

## 3. Contratos Compartilhados

### 3.1 Headers Obrigatorios

```http
Authorization: Bearer <access_token>
X-Device-Id: <device_id>
X-App-Version: <semver/build>
X-Platform: ios | android
X-Community-Id: <community_id opcional por contexto>
Idempotency-Key: <uuid para mutacoes criticas>
```

Para mutacoes criticas, o backend registra `Idempotency-Key` por 24h. Se o app repetir a mesma requisicao com a mesma chave, recebe replay da resposta concluida; se reutilizar a chave com outro payload, recebe conflito `409`.

### 3.2 Estados Obrigatorios Por Tela

| Estado | Comportamento esperado |
|--------|------------------------|
| Carregando | Skeleton ou progress nativo sem bloquear navegacao global indevidamente. |
| Vazio | Mensagem humana com proxima acao clara. |
| Erro | Mensagem curta, `traceId` apenas em area tecnica/copiar suporte, e acao de tentar novamente. |
| Sem conexao | Exibir dados em cache quando seguro; explicar o que nao pode ser atualizado. |
| Sessao expirada | Solicitar novo login sem loop de refresh. |
| Permissao negada | Explicar impacto, oferecer abrir ajustes quando fizer sentido e manter alternativa. |

---

## 4. Telas Do Ministro

### 4.1 Login

**Objetivo:** autenticar com email/senha e registrar contexto inicial do dispositivo.

**Usuario principal:** ministro, coordenador ou gestor.

**Entrada de dados:** email, senha, opcao `manter conectado`.

**Saida de dados:** access token curto, refresh token rotativo quando permitido, usuario, comunidades, papel e flag de biometria.

**API usada:**

- `POST /api/mobile/v1/auth/login`
- `GET /api/mobile/v1/app/config`

**Acoes primarias:** entrar.

**Acoes secundarias:** esqueci minha senha, politica de privacidade, suporte.

**Estados especificos:** credencial invalida, senha temporaria exige troca, versao minima nao suportada, rede indisponivel.

**Criterios de aceite:**

- Dado email/senha validos, quando tocar em entrar, entao o app abre `Minha Missao` ou `Painel da comunidade` conforme papel.
- Dado login invalido, quando a API retornar erro, entao a mensagem nao revela se email existe.
- Dado `manter conectado` desligado, quando o app fechar, entao nao deve armazenar refresh token persistente.
- Dado versao bloqueada por config, quando abrir login, entao deve orientar atualizacao antes de autenticar.

**Testes esperados:** unit de validacao, UI de login feliz/erro, contrato de auth, refresh expirado, rate limit simulado.

### 4.2 Ativar Biometria

**Objetivo:** permitir desbloqueio local de credenciais salvas apos primeiro login com senha.

**Usuario principal:** usuario autenticado que optou por manter conectado.

**Entrada de dados:** consentimento explicito para biometria.

**Saida de dados:** preferencia local e credencial protegida no Keychain/Keystore.

**API usada:** nenhuma obrigatoria; opcionalmente `PATCH /api/mobile/v1/devices/{id}` para registrar capacidade.

**Permissoes nativas:** Face ID/Touch ID no iOS; BiometricPrompt no Android.

**Acoes primarias:** ativar biometria.

**Acoes secundarias:** pular, entender como funciona.

**Estados especificos:** dispositivo sem biometria, biometria bloqueada, permissao negada, usuario cancelou.

**Criterios de aceite:**

- Dado primeiro login concluido, quando biometria estiver disponivel, entao a tela oferece ativacao sem bloquear uso.
- Dado usuario pular, quando voltar ao app, entao login/sessao continua funcionando sem biometria.
- Dado biometria falhar, quando exceder tentativas, entao o app oferece senha novamente.

**Testes esperados:** unit de policy, UI com biometria disponivel/indisponivel, testes em simulador/emulador e aparelho real.

### 4.3 Home Minha Missao

**Objetivo:** mostrar rapidamente proxima missao, pendencias e avisos relevantes.

**Usuario principal:** ministro.

**Entrada de dados:** contexto autenticado e comunidade ativa.

**Saida de dados:** proxima escala, acoes pendentes, avisos recentes.

**API usada:**

- `GET /api/mobile/v1/mission/home`
- `GET /api/mobile/v1/app/config`

**Acoes primarias:** ver proxima missa, responder questionario pendente, confirmar escala quando disponivel.

**Acoes secundarias:** abrir escalas do mes, avisos, perfil.

**Estados especificos:** sem proxima missao, questionario vencido, escala nao publicada, cache offline.

**Criterios de aceite:**

- Dado usuario com escala publicada, quando abrir a home, entao a proxima missao aparece acima das demais informacoes.
- Dado acao pendente de questionario, quando tocar no card, entao abre o questionario atual.
- Dado offline com cache valido, quando abrir a home, entao exibe cache com aviso de ultima atualizacao.
- Dado sem escala publicada, quando abrir a home, entao comunica isso sem tom de erro.

**Testes esperados:** unit/view model, snapshot claro/escuro, contrato da home, performance de bootstrap p95 alvo.

### 4.4 Proxima Missa

**Objetivo:** detalhar a proxima escala do ministro e suas acoes permitidas.

**Usuario principal:** ministro.

**Entrada de dados:** `scheduleId`.

**Saida de dados:** data, hora, comunidade, posicao, status, confirmacao, orientacoes e substituicao relacionada.

**API usada:**

- `GET /api/mobile/v1/schedules/{id}`
- `POST /api/mobile/v1/schedules/{id}/confirm`

**Acoes primarias:** confirmar presenca, pedir substituicao.

**Acoes secundarias:** adicionar lembrete local futuramente, compartilhar informacao permitida.

**Estados especificos:** escala cancelada, confirmacao fechada, substituicao em andamento, missa ja ocorreu.

**Criterios de aceite:**

- Dado escala publicada, quando abrir detalhes, entao mostra somente informacoes permitidas ao ministro.
- Dado confirmacao aberta, quando confirmar, entao o status muda sem duplicar requisicao em toque repetido.
- Dado substituicao ja solicitada, quando abrir detalhes, entao a acao primaria vira acompanhar status.

**Testes esperados:** contrato de schedules, idempotencia de confirmacao, UI de status, teste anti-duplo-toque.

### 4.5 Minhas Escalas

**Objetivo:** listar escalas publicadas do mes e permitir consulta simples.

**Usuario principal:** ministro.

**Entrada de dados:** mes selecionado.

**Saida de dados:** lista mensal de escalas do usuario e status de cada uma.

**API usada:** `GET /api/mobile/v1/schedules/month?month=YYYY-MM`.

**Acoes primarias:** abrir detalhe da escala.

**Acoes secundarias:** trocar mes, filtrar futuras/passadas.

**Estados especificos:** mes sem escalas, escalas nao publicadas, offline com cache.

**Criterios de aceite:**

- Dado mes com escalas, quando abrir a tela, entao a lista aparece ordenada por data/hora.
- Dado mes sem escalas, quando abrir a tela, entao exibe estado vazio pastoral.
- Dado usuario ministro, quando consumir endpoint, entao nao recebe dados sensiveis de outros ministros.

**Testes esperados:** unit de agrupamento por data, snapshot lista/vazio, teste de escopo por role.

### 4.6 Responder Questionario

**Objetivo:** coletar disponibilidade atual com seguranca para o gerador de escala.

**Usuario principal:** ministro.

**Entrada de dados:** respostas por pergunta, incluindo perguntas vinculadas a eventos/missas.

**Saida de dados:** resposta salva e comprovante de envio.

**API usada:**

- `GET /api/mobile/v1/questionnaires/current`
- `GET /api/mobile/v1/questionnaires/{id}`
- `POST /api/mobile/v1/questionnaires/{id}/responses`

**Acoes primarias:** enviar resposta.

**Acoes secundarias:** salvar rascunho local, revisar antes de enviar.

**Estados especificos:** questionario inexistente, encerrado, ja respondido, rascunho local, conflito apos reconectar.

**Criterios de aceite:**

- Dado questionario com evento vinculado, quando exibir pergunta, entao data/hora/comunidade ficam claras.
- Dado resposta incompleta em pergunta obrigatoria, quando tentar enviar, entao destaca o campo sem perder respostas.
- Dado envio bem-sucedido, quando concluir, entao mostra confirmacao e data/hora de envio.
- Dado offline, quando responder, entao salva rascunho local e explica que envio exige conexao se mutacao offline nao estiver habilitada.

**Testes esperados:** unit de validacao, contrato questionnaire-event-binding, UI de rascunho, teste de nao ignorar resposta vinculada a evento.

### 4.7 Confirmacao De Resposta

**Objetivo:** dar seguranca de que o questionario foi recebido e sera considerado.

**Usuario principal:** ministro.

**Entrada de dados:** resultado do envio.

**Saida de dados:** resumo curto das respostas e protocolo/trace funcional quando aplicavel.

**API usada:** resposta de `POST /api/mobile/v1/questionnaires/{id}/responses` e opcional `GET /api/mobile/v1/questionnaires/{id}`.

**Acoes primarias:** voltar para Minha Missao.

**Acoes secundarias:** revisar resposta, abrir escalas.

**Estados especificos:** resposta recebida com avisos, resposta substituiu envio anterior, janela de edicao fechada.

**Criterios de aceite:**

- Dado resposta enviada, quando abrir confirmacao, entao usuario ve que nao precisa responder novamente.
- Dado backend retornar warnings, quando mostrar confirmacao, entao linguagem deve ser humana e acionavel.

**Testes esperados:** UI de sucesso/warning, contrato de response receipt.

### 4.8 Pedir Substituicao

**Objetivo:** solicitar substituicao para uma escala publicada sem depender de WhatsApp.

**Usuario principal:** ministro escalado.

**Entrada de dados:** `scheduleId`, motivo opcional, substituto sugerido opcional quando permitido.

**Saida de dados:** solicitacao criada com status e urgencia calculada pelo backend.

**API usada:** `POST /api/mobile/v1/substitutions`.

**Acoes primarias:** enviar solicitacao.

**Acoes secundarias:** cancelar, voltar para escala.

**Estados especificos:** prazo critico, substituicao ja existente, escala nao substituivel, sem conexao.

**Criterios de aceite:**

- Dado escala futura substituivel, quando enviar solicitacao, entao o backend calcula urgencia e retorna status.
- Dado usuario tocar duas vezes em enviar, quando idempotencia estiver ativa, entao apenas uma solicitacao e criada.
- Dado escala nao pertence ao usuario, quando tentar solicitar, entao API nega sem vazar dados.

**Testes esperados:** contrato de substitutions, idempotencia, teste de ownership, UI de urgencia.

### 4.9 Status Da Substituicao

**Objetivo:** acompanhar decisao sem depender de mensagens paralelas.

**Usuario principal:** solicitante e substituto envolvido.

**Entrada de dados:** `substitutionId` ou lista filtrada.

**Saida de dados:** status, historico curto, proxima acao e decisao do coordenador quando houver.

**API usada:**

- `GET /api/mobile/v1/substitutions`
- `PATCH /api/mobile/v1/substitutions/{id}/cancel`

**Acoes primarias:** cancelar solicitacao quando permitido.

**Acoes secundarias:** abrir escala relacionada.

**Estados especificos:** pendente, aprovada, rejeitada, cancelada, auto-aprovada futuramente.

**Criterios de aceite:**

- Dado substituicao pendente, quando abrir status, entao mostra quem precisa agir sem expor dados indevidos.
- Dado coordenador aprovar, quando usuario receber push, entao deep link abre status atualizado.
- Dado cancelamento permitido, quando cancelar, entao status muda e escala volta ao estado correto.

**Testes esperados:** UI por status, contrato GET/PATCH, deep link de push, auditoria de cancelamento.

### 4.10 Avisos

**Objetivo:** centralizar comunicados, escala publicada, questionario e substituicoes.

**Usuario principal:** ministro.

**Entrada de dados:** filtros simples por tipo e lido/nao lido.

**Saida de dados:** lista de avisos com deep link permitido.

**API usada:** `/api/mobile/v1/notifications` e resumo em `mission/home`.

**Eventos minimos P0:** `questionnaire_published`, `coordinator_announcement`, `questionnaire_closed`, `schedule_published`, `substitution_requested`, `substitute_accepted`, `formation_available` e `schedule_reminder`.

**Acoes primarias:** abrir aviso.

**Acoes secundarias:** marcar como lido, ajustar preferencias.

**Estados especificos:** sem avisos, push desativado, horario silencioso.

**Criterios de aceite:**

- Dado aviso com deep link, quando tocar, entao abre apenas se usuario tiver permissao.
- Dado push desativado, quando abrir avisos, entao oferece ativacao sem bloquear uso.

**Testes esperados:** UI lista/vazio, deep link autorizado/negado, preferencias de notificacao.

### 4.11 Perfil

**Objetivo:** permitir consulta e edicao segura de dados basicos do usuario.

**Usuario principal:** ministro.

**Entrada de dados:** nome de exibicao quando permitido, telefone, WhatsApp, foto.

**Saida de dados:** perfil atualizado.

**API usada:**

- `GET /api/mobile/v1/me`
- `PATCH /api/mobile/v1/me`

**Acoes primarias:** salvar alteracoes.

**Acoes secundarias:** alterar foto, privacidade, sair.

**Estados especificos:** campos bloqueados por admin, validacao de telefone, erro de conflito.

**Criterios de aceite:**

- Dado campo nao editavel, quando abrir perfil, entao aparece como leitura com explicacao curta.
- Dado telefone invalido, quando salvar, entao valida antes de chamar API quando possivel.

**Testes esperados:** unit de validacao, contrato de perfil, UI campos editaveis/bloqueados.

### 4.12 Foto E Dados Pessoais

**Objetivo:** atualizar foto usando camera, galeria ou arquivo sem bloquear uso quando permissao for negada.

**Usuario principal:** ministro.

**Entrada de dados:** imagem capturada ou selecionada.

**Saida de dados:** foto validada e atualizada.

**API usada:** `POST /api/mobile/v1/me/photo`.

**Permissoes nativas:** camera e biblioteca/arquivos conforme plataforma.

**Acoes primarias:** tirar foto, escolher da galeria.

**Acoes secundarias:** remover foto quando politica permitir.

**Estados especificos:** permissao negada, arquivo grande, tipo invalido, upload interrompido.

**Criterios de aceite:**

- Dado usuario negar camera, quando atualizar foto, entao ainda pode escolher da galeria/arquivo.
- Dado imagem grande, quando enviar, entao app comprime ou backend rejeita com mensagem humana.
- Dado upload falhar, quando tentar novamente, entao nao duplica registros.

**Testes esperados:** camera/galeria, permissao negada, upload grande, contrato multipart.

### 4.13 Permissoes Do Dispositivo

**Objetivo:** explicar e gerenciar permissoes nativas usadas pelo app.

**Usuario principal:** usuario autenticado.

**Entrada de dados:** preferencias locais e sistema operacional.

**Saida de dados:** status de notificacao, camera, biometria e futuramente localizacao.

**API usada:** `PATCH /api/mobile/v1/devices/{id}` para preferencias de notificacao.

**Acoes primarias:** ativar notificacoes.

**Acoes secundarias:** abrir ajustes, desativar categorias.

**Estados especificos:** permissao negada permanentemente, push token ausente, horario silencioso.

**Criterios de aceite:**

- Dado notificacao nao autorizada, quando usuario pedir ativacao, entao prompt aparece no momento correto.
- Dado permissao negada permanentemente, quando tentar ativar, entao app orienta abrir ajustes.

**Testes esperados:** permissoes iOS/Android, registro de push token, preferencias quiet hours.

### 4.14 Sessao E Dispositivos Conectados

**Objetivo:** permitir ver e revogar dispositivos/sessoes persistentes.

**Usuario principal:** usuario autenticado.

**Entrada de dados:** dispositivo atual e lista remota.

**Saida de dados:** sessoes ativas/revogadas.

**API usada:**

- `GET /api/mobile/v1/session/devices`
- `DELETE /api/mobile/v1/session/devices/{deviceId}`
- `POST /api/mobile/v1/auth/logout`

**Acoes primarias:** sair deste dispositivo.

**Acoes secundarias:** revogar outro dispositivo, sair de todos quando suportado.

**Estados especificos:** dispositivo atual, dispositivo desconhecido, revogacao falhou.

**Criterios de aceite:**

- Dado usuario revogar outro dispositivo, quando confirmar, entao refresh token daquele dispositivo deixa de funcionar.
- Dado revogar dispositivo atual, quando concluir, entao app volta para login.

**Testes esperados:** contrato devices, logout remoto, refresh revogado, UI confirmacao destrutiva.

### 4.15 Privacidade E Exclusao De Conta

**Objetivo:** expor direitos de privacidade e iniciar exclusao/solicitacao conforme compliance.

**Usuario principal:** usuario autenticado.

**Entrada de dados:** confirmacao explicita e motivo opcional.

**Saida de dados:** solicitacao de exclusao ou status de privacidade.

**API usada:**

- `GET /api/mobile/v1/me/privacy`
- `DELETE /api/mobile/v1/me/account`

**Acoes primarias:** solicitar exclusao de conta.

**Acoes secundarias:** baixar/solicitar dados quando suportado, ler politica.

**Estados especificos:** conta com obrigacoes de auditoria, exclusao pendente, conta gerenciada pela paroquia.

**Criterios de aceite:**

- Dado usuario abrir privacidade, quando ler a tela, entao entende que dados pastorais podem ter regras de retencao.
- Dado confirmar exclusao, quando enviar, entao backend registra pedido e encerra sessoes conforme politica.

**Testes esperados:** UI de confirmacao, contrato privacy/delete, auditoria, revogacao de sessoes.

### 4.16 Sem Conexao

**Objetivo:** oferecer experiencia segura quando rede falhar.

**Usuario principal:** qualquer usuario.

**Entrada de dados:** estado de conectividade e cache local.

**Saida de dados:** informacao disponivel em cache e limites claros.

**API usada:** nenhuma direta; depende do cache das telas.

**Acoes primarias:** tentar novamente.

**Acoes secundarias:** abrir dados em cache, voltar.

**Estados especificos:** sem cache, cache expirado, mutacao pendente.

**Criterios de aceite:**

- Dado cache seguro, quando offline, entao app exibe dados com aviso de ultima atualizacao.
- Dado sem cache, quando offline, entao app nao mostra tela em branco.
- Dado mutacao nao suportada offline, quando usuario tentar enviar, entao explica que precisa de conexao.

**Testes esperados:** simular offline, cache hit/miss, UI sem tela branca.

### 4.17 Sessao Expirada

**Objetivo:** recuperar autenticacao sem loops e sem perder contexto.

**Usuario principal:** qualquer usuario autenticado anteriormente.

**Entrada de dados:** falha de refresh ou revogacao remota.

**Saida de dados:** novo login ou saida segura.

**API usada:** `POST /api/mobile/v1/auth/login` apos reautenticacao.

**Acoes primarias:** entrar novamente.

**Acoes secundarias:** sair, suporte.

**Estados especificos:** senha alterada, dispositivo revogado, refresh expirado, rede indisponivel.

**Criterios de aceite:**

- Dado refresh expirado, quando API retornar 401, entao app abre sessao expirada uma unica vez.
- Dado usuario logar novamente, quando havia deep link pendente, entao app tenta retomar contexto permitido.

**Testes esperados:** interceptor de auth, 401 concorrente, deep link apos login, logout remoto.

---

## 5. Telas Do Coordenador

### 5.1 Painel Da Comunidade

**Objetivo:** resumir cobertura, pendencias e substituicoes da comunidade ativa.

**Usuario principal:** coordenador de comunidade.

**Entrada de dados:** `communityId`, mes corrente.

**Saida de dados:** KPIs operacionais, alertas e atalhos.

**API usada:** `GET /api/mobile/v1/admin/community/home`.

**Acoes primarias:** abrir pendencias, cobertura ou substituicoes.

**Acoes secundarias:** trocar mes, abrir diretorio.

**Estados especificos:** sem comunidade atribuida, dados incompletos, risco de cobertura.

**Criterios de aceite:**

- Dado coordenador de comunidade A, quando abrir painel, entao nao recebe dados de comunidade B.
- Dado pendencias criticas, quando abrir painel, entao elas aparecem antes de metricas secundarias.
- Dado offline, quando cache existir, entao mostra leitura com aviso de que acoes exigem conexao.

**Testes esperados:** contrato dashboard, teste anti-vazamento multi-comunidade, UI de alertas.

### 5.2 Respostas Do Questionario

**Objetivo:** acompanhar quem respondeu, pendencias e respostas relevantes para escala.

**Usuario principal:** coordenador.

**Entrada de dados:** `questionnaireId`, comunidade ativa.

**Saida de dados:** taxa de resposta, lista de ministros, respostas por evento e pendencias.

**API usada:** `GET /api/mobile/v1/admin/questionnaires/{id}/responses`.

**Acoes primarias:** filtrar pendentes, abrir resposta, enviar lembrete quando suportado.

**Acoes secundarias:** alternar evento/pergunta, buscar ministro.

**Estados especificos:** questionario sem respostas, evento sem binding, respostas com warnings.

**Criterios de aceite:**

- Dado pergunta vinculada a evento, quando listar respostas, entao coordenador ve consolidacao por evento.
- Dado resposta com warning de parsing, quando abrir, entao mostra alerta antes de gerar escala.
- Dado coordenador sem permissao, quando acessar, entao API nega sem retornar lista parcial.

**Testes esperados:** contrato responses, fixture questionario-evento, RBAC, UI pendentes/warnings.

### 5.3 Criar/Editar Questionario

**Objetivo:** criar questionario P0 seguro, com perguntas vinculadas a eventos quando necessario.

**Usuario principal:** coordenador.

**Entrada de dados:** titulo, mes, prazo, perguntas, eventos vinculados.

**Saida de dados:** rascunho ou questionario atualizado.

**API usada:**

- `POST /api/mobile/v1/admin/questionnaires`
- `PATCH /api/mobile/v1/admin/questionnaires/{id}`

**Acoes primarias:** salvar rascunho.

**Acoes secundarias:** preview, cancelar.

**Estados especificos:** pergunta sem binding, prazo invalido, edicao bloqueada apos publicacao.

**Criterios de aceite:**

- Dado pergunta que representa missa/evento, quando salvar, entao deve exigir `eventBinding` ou marcar como nao usada no gerador.
- Dado questionario publicado, quando tentar editar campo critico, entao app bloqueia ou exige fluxo de revisao.

**Testes esperados:** validacao local, contrato create/patch, teste de binding obrigatorio.

### 5.4 Pergunta Vinculada A Evento/Missa

**Objetivo:** garantir que disponibilidade coletada alimente o gerador corretamente.

**Usuario principal:** coordenador.

**Entrada de dados:** evento, data, hora, comunidade, regra de elegibilidade.

**Saida de dados:** `eventBinding` estavel no questionario.

**API usada:** mesma de questionarios; futura fonte de eventos em `/api/mobile/v1/admin/events` se criada.

**Acoes primarias:** vincular evento.

**Acoes secundarias:** criar evento simples, remover vinculo.

**Estados especificos:** conflito de horario, comunidade errada, evento ja publicado.

**Criterios de aceite:**

- Dado evento selecionado, quando salvar pergunta, entao payload inclui `eventId`, data, hora, `communityId` e `requiredForScheduleGeneration`.
- Dado comunidade ativa A, quando buscar eventos, entao nao lista eventos de B.

**Testes esperados:** unit de payload, contrato de binding, teste multi-comunidade.

### 5.5 Preview De Eventos Gerados

**Objetivo:** mostrar ao coordenador quais eventos/missas o questionario alimentara antes de publicar.

**Usuario principal:** coordenador.

**Entrada de dados:** questionario rascunho.

**Saida de dados:** lista de eventos vinculados, sem vinculo e excluidos do gerador.

**API usada:** resposta de create/patch ou endpoint de preview quando criado.

**Acoes primarias:** revisar e voltar para editar.

**Acoes secundarias:** publicar se valido.

**Estados especificos:** nenhum evento vinculado, evento duplicado, pergunta ignorada pelo gerador.

**Criterios de aceite:**

- Dado pergunta obrigatoria para escala sem binding, quando abrir preview, entao bloqueia publicacao.
- Dado todos bindings validos, quando abrir preview, entao permite seguir para publicacao.

**Testes esperados:** UI de bloqueio, fixtures com evento duplicado, contrato de warnings.

### 5.6 Gerar Escala

**Objetivo:** iniciar preview de escala sem escrever escala oficial.

**Usuario principal:** coordenador.

**Entrada de dados:** mes, comunidade, questionario base, parametros permitidos.

**Saida de dados:** identificador de geracao e preview com cobertura/conflitos.

**API usada:** `POST /api/mobile/v1/schedules/generate-preview`.

**Acoes primarias:** gerar preview.

**Acoes secundarias:** voltar para pendencias, ajustar filtros.

**Estados especificos:** respostas insuficientes, eventos sem binding, gerador indisponivel, dados inconsistentes.

**Criterios de aceite:**

- Dado respostas validas, quando gerar, entao cria preview sem publicar escala oficial.
- Dado respostas vinculadas a evento faltando, quando gerar, entao bloqueia com mensagem clara.
- Dado conflitos, quando gerar, entao preview retorna alertas e alternativas.

**Testes esperados:** contrato generate-preview, data doctor fixture, teste de nao escrita em escala oficial.

### 5.7 Revisar Sugestao

**Objetivo:** permitir revisao humana da escala sugerida antes de ajuste/publicacao.

**Usuario principal:** coordenador.

**Entrada de dados:** `generationId`.

**Saida de dados:** sugestoes por missa, cobertura, conflitos, score e confianca.

**API usada:** resposta de `generate-preview` e/ou `GET /api/mobile/v1/schedules/generation/{id}` se criado.

**Acoes primarias:** aprovar para ajuste/publicacao.

**Acoes secundarias:** ver motivos, regenerar, voltar.

**Estados especificos:** baixa confianca, missa descoberta, ministro indisponivel, conflito familiar.

**Criterios de aceite:**

- Dado sugestao gerada, quando revisar, entao cada atribuicao mostra motivo resumido.
- Dado missa com cobertura insuficiente, quando revisar, entao alerta aparece antes da publicacao.

**Testes esperados:** UI de alerta, contrato de explainability, fixtures com baixa cobertura.

### 5.8 Motivos/Confianca Do Algoritmo

**Objetivo:** explicar por que um ministro foi sugerido sem criar caixa-preta.

**Usuario principal:** coordenador.

**Entrada de dados:** atribuicao selecionada.

**Saida de dados:** disponibilidade considerada, restricoes, score, confianca, alertas e alternativas.

**API usada:** payload de preview.

**Acoes primarias:** aceitar explicacao e voltar.

**Acoes secundarias:** escolher alternativa quando permitido.

**Estados especificos:** explicacao incompleta, dados insuficientes, alternativa indisponivel.

**Criterios de aceite:**

- Dado atribuicao com score baixo, quando abrir motivos, entao alerta explica o risco.
- Dado alternativa sugerida, quando selecionar, entao ajuste respeita regras de conflito.

**Testes esperados:** snapshot de motivos, fixture de alternativas, unit de exibicao de confidence.

### 5.9 Ajustar Escala

**Objetivo:** editar atribuicoes dentro de limites seguros antes da publicacao.

**Usuario principal:** coordenador.

**Entrada de dados:** alteracoes de ministros/posicoes por escala.

**Saida de dados:** preview atualizado e auditoria de diferenca.

**API usada:** `PATCH /api/mobile/v1/schedules/{id}/assignments` para escala existente ou endpoint de generation draft se separado.

**Acoes primarias:** salvar ajuste.

**Acoes secundarias:** desfazer, ver conflito, comparar com sugestao.

**Estados especificos:** conflito de disponibilidade, ministro de outra comunidade, cobertura insuficiente, edicao concorrente.

**Criterios de aceite:**

- Dado coordenador trocar ministro, quando salvar, entao backend valida escopo e conflitos.
- Dado ajuste conflita com resposta do questionario, quando salvar, entao app exige confirmacao justificada ou bloqueia conforme regra.

**Testes esperados:** contrato assignments, teste concorrencia, RBAC, auditoria de diff.

### 5.10 Publicar Escala

**Objetivo:** transformar preview revisado em escala oficial e notificar ministros.

**Usuario principal:** coordenador.

**Entrada de dados:** `generationId`, confirmacao final e resumo de alertas aceitos.

**Saida de dados:** escala publicada, notificacoes agendadas/enviadas e auditoria.

**API usada:** `POST /api/mobile/v1/schedules/generation/{id}/publish`.

**Acoes primarias:** publicar escala.

**Acoes secundarias:** voltar para revisar, salvar rascunho.

**Estados especificos:** alertas bloqueantes, publicacao parcial, falha de notificacao, versao de preview desatualizada.

**Criterios de aceite:**

- Dado preview valido, quando publicar, entao escala oficial e criada uma vez com idempotencia.
- Dado alerta bloqueante, quando tentar publicar, entao app impede publicacao e aponta correcao.
- Dado falha de push, quando publicacao da escala for bem-sucedida, entao mostra aviso operacional sem desfazer escala automaticamente.

**Testes esperados:** contrato publish, idempotencia, auditoria, push failure parcial.

### 5.11 Aprendizado Apos Publicacao

**Objetivo:** registrar diferencas entre sugestao, ajustes e execucao para evolucao futura.

**Usuario principal:** coordenador.

**Entrada de dados:** diferencas, substituicoes, confirmacoes e faltas.

**Saida de dados:** aprendizado mensal consultavel.

**API usada:** P1, mas P0 deve preservar dados de auditoria no publish/adjust.

**Acoes primarias:** ver resumo quando disponivel.

**Acoes secundarias:** exportar futuramente.

**Estados especificos:** aprendizado indisponivel no P0, dados insuficientes.

**Criterios de aceite:**

- Dado ajuste feito no P0, quando publicar, entao diferenca fica registrada para uso P1.
- Dado feature ainda P1, quando tela nao existir, entao backlog tecnico nao perde eventos de auditoria.

**Testes esperados:** auditoria de ajuste/publicacao, schema de eventos.

### 5.12 Substituicoes Pendentes

**Objetivo:** permitir coordenador aprovar/rejeitar substituicoes com contexto suficiente.

**Usuario principal:** coordenador.

**Entrada de dados:** comunidade ativa, filtros por status/urgencia.

**Saida de dados:** solicitacoes com escala, solicitante, urgencia e contexto.

**API usada:**

- `GET /api/mobile/v1/substitutions`
- `PATCH /api/mobile/v1/admin/substitutions/{id}/approve`
- `PATCH /api/mobile/v1/admin/substitutions/{id}/reject`

**Acoes primarias:** aprovar ou rejeitar.

**Acoes secundarias:** abrir escala, contatar ministro quando permitido.

**Estados especificos:** nenhuma pendencia, urgencia critica, substituto indisponivel, decisao concorrente.

**Criterios de aceite:**

- Dado substituicao pendente da comunidade A, quando coordenador A abrir, entao aparece com urgencia calculada.
- Dado coordenador aprovar, quando concluir, entao escala e atualizada e solicitante recebe status.
- Dado decisao concorrente, quando aprovar, entao app mostra que solicitacao ja mudou.

**Testes esperados:** contrato approve/reject, concorrencia, auditoria, push/deep link.

### 5.13 Diretorio De Ministros

**Objetivo:** consultar ministros da comunidade para operacao e contexto de escala.

**Usuario principal:** coordenador.

**Entrada de dados:** busca, filtros de status, comunidade ativa.

**Saida de dados:** lista com dados permitidos e resumo operacional.

**API usada:** `GET /api/mobile/v1/admin/ministers`.

**Acoes primarias:** buscar ministro, abrir detalhes permitidos.

**Acoes secundarias:** convidar/aprovar quando P0 permitir.

**Estados especificos:** sem ministros, busca sem resultado, dados ocultos por permissao.

**Criterios de aceite:**

- Dado coordenador de A, quando buscar ministros, entao lista apenas A.
- Dado dado sensivel nao necessario, quando abrir detalhe, entao nao deve ser retornado no payload P0.

**Testes esperados:** RBAC/multi-comunidade, UI busca/vazio, contrato payload minimo.

### 5.14 Convites/Aprovacoes

**Objetivo:** tratar entrada de ministros na comunidade quando estiver dentro do P0 operacional.

**Usuario principal:** coordenador.

**Entrada de dados:** convite ou solicitacao pendente.

**Saida de dados:** status aprovado/rejeitado.

**API usada:** a definir em `/api/mobile/v1/admin/invitations` se escopo P0 confirmar.

**Acoes primarias:** aprovar convite/solicitacao.

**Acoes secundarias:** rejeitar com motivo, reenviar convite.

**Estados especificos:** convite expirado, email ja existente, comunidade errada.

**Criterios de aceite:**

- Dado feature fora do corte P0, quando app for implementado, entao manter no admin web sem atalho quebrado.
- Dado feature dentro do corte P0, quando aprovar, entao escopo de comunidade e papel sao registrados explicitamente.

**Testes esperados:** pendente de definicao; se entrar no P0, exigir contrato, RBAC e auditoria.

---

## 6. Sequencia Recomendada De Desenvolvimento

1. **Fundacao:** app shell, design system minimo, API client, auth interceptor, config remota e observabilidade.
2. **Auth:** login, manter conectado, refresh rotativo, sessao expirada e dispositivos.
3. **Minha Missao:** home, proxima missa, escalas do mes e cache offline basico.
4. **Questionario:** atual, resposta, confirmacao e contrato questionario-evento.
5. **Substituicao:** pedido, status, aprovacao/rejeicao pelo coordenador.
6. **Coordenador leve:** painel, respostas, cobertura, diretorio e publicacao segura.
7. **Perfil/permissoes:** foto, notificacoes, privacidade e exclusao de conta.
8. **Release gates:** OpenAPI, testes de contrato, multi-comunidade, smoke em aparelhos reais.

---

## 7. Backlog Tecnico Imediato

- Criar OpenAPI inicial para `/api/mobile/v1` cobrindo auth, session, mission, schedules, questionnaires, substitutions, devices, profile e admin mobile leve.
- Mapear tabelas e rotas atuais que alimentarao `mission/home` sem expor payload legado.
- Definir schema de `device registry` nativo e migracao das push subscriptions web.
- Definir fixture anonima de ministro, coordenador, duas comunidades, questionario com evento e substituicao pendente.
- Criar matriz automatizada de teste anti-vazamento entre comunidade A e B.
- Definir se o primeiro app implementado sera iOS-only com arquitetura replicavel ou iOS/Android em paralelo.
