# MESC Native - Importacao Segura De Dados Atuais

**Data:** 2026-06-24
**Escopo:** equalizar o staging nativo com exports do MESC atual sem tocar no banco do Replit.

---

## Objetivo

Usar dados reais/exportados do MESC atual para deixar o TestFlight mais fiel:

- ministros e coordenadores reais;
- questionarios historicos;
- respostas de questionario;
- escalas historicas;
- diagnostico de lacunas cadastrais.

O comando e dry-run por padrao e so escreve com confirmacao explicita.

---

## Comando De Auditoria

Sem banco, apenas lendo os assets locais:

```bash
npm run db:doctor:native-current-data
```

Com banco nativo staging, ainda em dry-run:

```bash
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:doctor:native-current-data -- --community-slug=mobile-demo-matriz
```

---

## Importar No Supabase Nativo Staging

Somente para o projeto `mesc-native-staging` (`sdochgpfjosmhrbztthr`):

```bash
CONFIRM_NATIVE_CURRENT_DATA_IMPORT=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:doctor:native-current-data -- --write --community-slug=mobile-demo-matriz
```

Guardas existentes:

- recusa escrita sem `CONFIRM_NATIVE_CURRENT_DATA_IMPORT=true`;
- recusa host do banco atual/Replit, salvo `ALLOW_CURRENT_MESC_DB=true`;
- recusa banco que nao pareca ser `sdochgpfjosmhrbztthr`, salvo `ALLOW_OTHER_NATIVE_DB=true`.

Por padrao, fotos antigas, relacoes familiares/conjugais e notificacoes historicas nao sao trazidas: elas podem conter blobs grandes, referencias que precisam de saneamento ou avisos velhos que nao devem parecer pendencias novas. Para trazer tambem as fotos de perfil, use `--include-photos` depois de validar volume e qualidade dos arquivos.

### Segunda Fase: Vínculos E Histórico De Comunicação

Depois do dry-run, a segunda fase pode ser aplicada junto com o mesmo import:

```bash
CONFIRM_NATIVE_CURRENT_DATA_IMPORT=true \
DATABASE_URL="$NATIVE_DATABASE_URL" \
npm run db:doctor:native-current-data -- \
  --write \
  --community-slug=mobile-demo-matriz \
  --include-family-links \
  --include-historical-notifications
```

Esta fase preserva dados úteis ao PRD sem fazer uma cópia cega do banco legado:

- importa `family_relationships` somente depois de validar referências e reciprocidade de casais;
- cria grupos familiares determinísticos e associa seus membros, para que o app possa oferecer compartilhamento de questionário;
- inicia cada grupo com `prefer_serve_together=false`: servir em conjunto exige confirmação pastoral no novo app, não uma inferência da migração;
- sincroniza o vínculo de casal quando o par é recíproco;
- reconcilia automaticamente IDs diferentes pelo e-mail normalizado antes de gravar referências; isso protege cargas em que o ambiente nativo já tenha criado uma identidade para a mesma pessoa;
- guarda notificações antigas apenas na caixa in-app, marcadas como lidas e identificadas como histórico; nunca registra push, sessão, token de dispositivo ou assinatura web;
- continua excluindo `activity_logs` com IP/user-agent, sessões, refresh tokens, pedidos de redefinição de senha e blobs de foto.

---

## Assets Padrao

- `attached_assets/users (2)_1759268600377.json`;
- `attached_assets/questionnaires (1)_1759268600377.json`;
- `attached_assets/questionnaire_responses (1)_1759268600377.json`;
- `attached_assets/schedules_1759268600377.json`;
- `attached_assets/mass_times_config (1)_1759268600376.json` para auditoria historica.
- `attached_assets/notifications_1759268600377.json` para histórico in-app opcional;
- `attached_assets/family_relationships (1)_1759268600375.json` para vínculos familiares opcionais.

Arquivos alternativos podem ser passados com:

```bash
npm run db:doctor:native-current-data -- \
  --users-file=attached_assets/users.json \
  --questionnaires-file=attached_assets/questionnaires.json \
  --responses-file=attached_assets/questionnaire_responses.json \
  --schedules-file=attached_assets/schedules.json \
  --mass-times-file=attached_assets/mass_times_config.json
```

---

## Diagnostico Atual Dos Assets

Dry-run local em 2026-06-24:

- 120 usuarios exportados;
- 107 respostas de questionario;
- 62 escalas historicas;
- 11 horarios antigos em `mass_times_config`;
- 0 respostas apontando para usuario ausente no export;
- 0 respostas apontando para questionario ausente no export;
- 0 escalas apontando para usuario ausente no export.

Lacunas cadastrais dos ministros ativos devem ser usadas para decidir quais campos viram obrigatorios ou pendentes no app nativo antes de liberar o uso real.

## Importacao Aplicada Em Staging Nativo

Em 25/07/2026, os exports atuais foram incorporados ao Supabase `mesc-native-staging` com upsert idempotente e escopo na Comunidade Matriz:

- 120 cadastros legados, sem blobs de foto e sem relacoes familiares/conjugais;
- 2 questionarios historicos;
- 107 respostas historicas;
- 62 escalas historicas.

Em 26/07/2026, a segunda fase de vínculos familiares foi aplicada após reconciliação por e-mail, pois os mesmos 120 cadastros usam IDs internos diferentes no ambiente nativo:

- 18 núcleos familiares sintéticos e determinísticos, todos iniciando com preferência de servir separadamente;
- 46 relações familiares preservadas;
- 42 cadastros associados a um núcleo familiar;
- 36 vínculos de casal recíprocos;
- 0 relações com usuário ausente.

As 77 notificações disponíveis no export não foram carregadas neste momento porque são comunicados de setembro de 2025. O importador continua pronto para trazê-las como histórico lido, mas elas não devem aparecer como pendências novas no piloto atual.

### Limite Dos Exports Históricos

Os arquivos locais disponíveis são um retrato de setembro/outubro de 2025. Eles são adequados para validar a migração e preservar histórico, mas não devem ser tratados como o estado vivo de produção em 2026. Antes do go-live, deve ser feito novo export controlado do banco atual, usando este mesmo contrato e os mesmos checks de integridade; não se deve clonar o banco ou suas sessões para o Supabase nativo.

## Novo Export Do Banco Vivo

O script abaixo prepara um pacote privado do banco atual para a próxima equalização. Ele exige confirmação explícita, grava os arquivos com permissões locais restritas e recusa usar o Supabase nativo como origem por engano:

```bash
CONFIRM_CURRENT_MESC_EXPORT=true \
CURRENT_MESC_DATABASE_URL="$CURRENT_MESC_DATABASE_URL" \
npm run db:export:current-mesc -- \
  --output-dir=data-exports/mesc-current-YYYY-MM-DD
```

O pacote contém somente tabelas que preservam valor de produto: cadastros, questionários/respostas, escalas, confirmações, substituições, notificações, famílias, configuração de missas e progresso de formação. Ele exclui deliberadamente sessões, tokens de refresh, chaves de push, IP, user-agent, identificador de dispositivo e blobs de foto.

Depois do export, o `manifest.json` traz contagem, colunas e checksum de cada arquivo. O diretório `data-exports/` é ignorado pelo Git e deve ser removido da máquina após a importação e a conferência. A carga de cadastros, questionários, escalas, relações e notificações continua sendo feita pelo importador nativo, com reconciliação de identidade por e-mail quando os IDs internos forem diferentes. Confirmações, substituições e progresso de formação permanecem no pacote para auditoria e só entram após a validação de suas referências de escala e módulo na nova base.

Depois da aplicacao, as verificacoes de chaves estrangeiras entre respostas/escalas, usuarios e questionarios permaneceram sem referencias ausentes. Os dados demo continuam disponiveis para o smoke do TestFlight.
