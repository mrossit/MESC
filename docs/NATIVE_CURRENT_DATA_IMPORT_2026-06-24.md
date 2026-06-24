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

---

## Assets Padrao

- `attached_assets/users (2)_1759268600377.json`;
- `attached_assets/questionnaires (1)_1759268600377.json`;
- `attached_assets/questionnaire_responses (1)_1759268600377.json`;
- `attached_assets/schedules_1759268600377.json`;
- `attached_assets/mass_times_config (1)_1759268600376.json` para auditoria historica.

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
