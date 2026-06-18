# Store Release Next Steps - 18/06/2026

## Decisao de produto

Nao reescrever o app inteiro antes da loja. A rota mais segura para Apple e beta e manter a base atual, corrigir os pontos cirurgicos e publicar uma versao nativa que pareca cuidada, responsiva e confiavel.

## Essencial antes de nova rodada TestFlight

1. UI nativa iOS: manter safe area, header e bottom nav sem sobreposicao.
2. Rodape mobile: apenas a rota mais especifica pode ficar ativa.
3. Dados reais: ministros/fotos precisam vir do banco remoto correto; o SQLite local nao serve como fonte de teste.
4. Escala de junho/2026: importar a planilha oficial antes de pedir validacao dos ministros.
5. Multi-community: manter fase atual como fato novo de beta, mas sem prometer escopo completo enquanto read-scoping fino ainda nao estiver fechado.
6. Questionarios/eventos: perguntas personalizadas que representam missa/evento devem ter mapeamento explicito antes de virarem entrada do gerador.

## Diagnostico de dados

- `local.db` existe neste worktree, mas esta vazio. Se o preview/dev subir sem `DATABASE_URL`, o app fica sem ministros/escala.
- Nesta sessao local nao ha `DATABASE_URL`, `PRODUCTION_DATABASE_URL` ou `RELEASE_DATABASE_URL` carregadas. Portanto, qualquer preview local sem variaveis remotas vai parecer "sem dados".
- Supabase `mesc-staging` esta ativo e possui dados de ministros:
  - antes da importacao: `users_total=141`
  - antes da importacao: `users_active=125`
  - `users_with_photo=95`
  - antes da importacao: `schedules_june_2026=0`
- A planilha `attached_assets/Escala_SaoJudasTadeu_Junho2026.xlsx` parseia corretamente:
  - 321 escalações
  - 26 datas
  - 117 ministros distintos
- A escala oficial de junho/2026 foi importada no Supabase `mesc-staging` em 18/06/2026:
  - `users_total=151`
  - `users_active=135`
  - `schedules_june_2026=321`
  - `june_schedule_dates=26`
  - `june_null_ministers=5`, correspondendo as linhas `VACANTE` da planilha
  - 10 usuarios placeholder foram criados apenas em staging para ministros presentes na escala oficial mas ausentes da tabela `users`

## Novo gate de dados

Foi adicionado:

```bash
npm run release:check:data
```

O comando e dry-run por padrao e exige uma URL de banco alvo por uma destas variaveis:

```bash
RELEASE_DATABASE_URL
DATABASE_URL
STAGING_DATABASE_URL
PRODUCTION_DATABASE_URL
```

Dry-run contra staging/producao:

```bash
RELEASE_DATABASE_URL="$DATABASE_URL" npm run release:check:data
```

Importar usuarios do asset, quando o banco alvo estiver sem ministros/fotos:

```bash
RELEASE_DATABASE_URL="$DATABASE_URL" npm run release:check:data -- --apply-users
```

Importar a escala oficial de junho/2026:

```bash
RELEASE_DATABASE_URL="$DATABASE_URL" npm run release:check:data -- --apply-june-schedule
```

O importador aborta se houver ministro nao resolvido ou se junho/2026 ja tiver escala no banco alvo, evitando duplicacao.

O comando tambem audita candidatos obvios a dados mock/placeholder:

```bash
RELEASE_DATABASE_URL="$DATABASE_URL" npm run release:check:data
RELEASE_DATABASE_URL="$DATABASE_URL" npm run release:check:data -- --strict-mock-data
```

`--strict-mock-data` falha quando encontra usuarios com padroes obvios de teste, exemplo `test.*@test.com`, `placeholder+*@saojudastadeu.app`, `*@example.*`, `*@demo.*` ou nome contendo `teste/demo/mock/placeholder`. A limpeza em producao deve ser feita somente depois desse dry-run listar os candidatos.

## Correcoes nativas 50410

- Status bar iOS transparente com `overlaysWebView=true`, para o fundo do login continuar por tras do notch/Dynamic Island.
- Login sem `safe-area-bottom` duplicado e com camada fixa herdando o mesmo background, evitando degradê picado.
- Shell nativo com fundo continuo claro/escuro e header glass mais leve.
- Rodape mobile com altura/padding reduzidos e rota ativa calculada sem querystring/hash.
- Build nativo atualizado para `5.4.3 (50411)`.
- Correção auth nativa: chamadas manuais `fetch('/api/...')` agora recebem `Authorization: Bearer` automaticamente quando houver token salvo; cache de usuário sem token não mantém a pessoa "meio logada".

## Proximo passo recomendado

1. Confirmar que o preview/TestFlight esta apontando para o banco remoto correto; se subir sem `DATABASE_URL`, caira no `local.db` vazio.
2. Rodar o dry-run no banco real usado por `https://saojudastadeu.app`.
3. Rodar o dry-run com `--strict-mock-data`; se houver mocks, revisar a amostra antes de qualquer limpeza manual.
4. Se `schedules_2026-06=0`, aplicar `--apply-june-schedule` no banco real somente depois de revisar os 10 ministros que estavam ausentes em staging.
5. Aguardar processamento do build iOS `5.4.3 (50411)` enviado ao App Store Connect em 18/06/2026.
6. Trocar o grupo interno do TestFlight para `50411` e rodar smoke test: login, diretório, escala mensal, substituições e perfil.
