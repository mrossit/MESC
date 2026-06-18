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
- Supabase `mesc-staging` esta ativo e possui dados de ministros:
  - `users_total=141`
  - `users_active=125`
  - `users_with_photo=95`
  - `schedules_june_2026=0`
- A planilha `attached_assets/Escala_SaoJudasTadeu_Junho2026.xlsx` parseia corretamente:
  - 321 escalações
  - 26 datas
  - 117 ministros distintos

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

## Proximo passo recomendado

1. Rodar o dry-run no banco real usado por `https://saojudastadeu.app`.
2. Se `schedules_2026-06=0`, aplicar `--apply-june-schedule`.
3. Aguardar processamento do build iOS `5.4.3 (50409)` no App Store Connect.
4. Trocar o grupo interno do TestFlight para `50409` e rodar smoke test: diretório, escala mensal, substituições e perfil.
