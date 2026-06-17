# PRD v2 - Publicação nas lojas e engajamento dos ministros

**Produto:** MESC - App oficial dos Ministros Extraordinários da Sagrada Comunhão
**Data:** 17/06/2026
**Status:** Proposta cirúrgica para release nas lojas
**Decisão central:** não reescrever o app inteiro antes da loja. Evoluir o produto atual com correções de alto impacto, gates de produção e empacotamento nativo controlado.

---

## 1. Objetivo

Publicar o MESC na App Store e no Google Play como app oficial, estável e desejável para os ministros, usando a novidade multi-comunidades como motivo real de adesão e teste.

O lançamento deve entregar três percepções imediatas:

1. O ministro entende rapidamente sua próxima missão.
2. O coordenador confia que questionários, eventos e escala conversam entre si.
3. A paróquia consegue crescer para novas comunidades sem misturar dados ou gerar confusão operacional.

---

## 2. Estratégia de produto

### 2.1 Não reescrever agora

A reescrita total aumenta risco de regressão, atrasa os gates de loja e pode introduzir bugs justamente em fluxos sensíveis para revisão da Apple. O app já passou por health check, backup/restore e validação multi-comunidades em staging; a melhor rota é modernizar os pontos certos.

### 2.2 O que deve mudar antes da loja

- Área do ministro com experiência mais emocional, direta e mobile-first.
- Questionário mensal com contrato rígido: perguntas personalizadas não podem ser ignoradas.
- Geração de escala usando todas as respostas e comparando sugestão vs. escala publicada.
- Multi-comunidades com escopo claro de dados, papéis e comunicação.
- Compliance de loja: exclusão de conta, privacidade, conta de reviewer, monitoramento e empacotamento nativo.

### 2.3 O que fica fora do primeiro release

- Reescrita total em React Native ou Flutter.
- Novo backend.
- Algoritmo com IA opaca ou sem explicabilidade para o coordenador.
- Redesenho completo de todas as telas administrativas.
- Uso de APIs nativas de Liquid Glass antes do wrapper iOS existir no projeto.

---

## 3. Personas prioritárias

### Ministro

Quer saber quando serve, responder disponibilidade sem medo de errar, encontrar substituição e sentir que faz parte de uma comunidade organizada.

### Coordenador de comunidade

Quer montar escala sem retrabalho, enxergar quem respondeu, tratar exceções e publicar com segurança.

### Coordenador paroquial / gestor

Quer acompanhar comunidades, padronizar processos, liberar novos grupos e evitar vazamento de dados entre comunidades.

---

## 4. Experiência do ministro

### 4.1 Centro de missão

A primeira tela do ministro deve funcionar como um painel pessoal:

- Saudação pelo primeiro nome.
- Próxima escala em destaque.
- Ações rápidas: escalas, responder questionário, substituições e oração.
- Indicadores simples: avisos novos e escalas familiares.
- Aviso discreto de beta multi-comunidades.

### 4.2 Direção visual Liquid Glass

A adoção visual deve seguir o espírito do Liquid Glass: camadas leves, transparência controlada, profundidade, interação e boa legibilidade. No app web/PWA atual, isso entra como CSS progressivo usando blur, tint, borda sutil e fallback de acessibilidade.

Regras:

- Usar vidro em painéis de navegação, cartões principais e ações rápidas.
- Não aplicar vidro em tudo.
- Evitar vidro dentro de vidro quando prejudicar hierarquia.
- Garantir contraste em claro/escuro.
- Respeitar `prefers-reduced-transparency` e `prefers-contrast`.
- Quando existir wrapper iOS nativo, reavaliar APIs nativas de Liquid Glass para iOS 26+ e eventuais refinamentos do ciclo iOS 27.

Referências de direção:

- Apple Developer - Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple Developer - Meet Liquid Glass: https://developer.apple.com/videos/play/wwdc2025/219/
- ECC liquid-glass-design: https://github.com/affaan-m/ECC/blob/main/skills/liquid-glass-design/SKILL.md

---

## 5. Questionários e eventos

### 5.1 Regra de produto

Toda pergunta personalizada que represente missa, celebração ou evento deve gerar ou se vincular a um evento/horário de escala. Nenhuma resposta capturada pode ficar invisível para o gerador.

### 5.2 Contrato mínimo

Cada pergunta personalizada precisa ter:

- `questionId` estável.
- Tipo: missa regular, evento especial, disponibilidade geral, restrição, observação ou substituição.
- Data e horário quando gerar evento.
- Comunidade vinculada.
- Regra de elegibilidade para o gerador.
- Mapeamento em `question_mass_mappings` quando representar missa/evento.

### 5.3 Aceite funcional

- O coordenador não consegue publicar questionário com pergunta de evento sem data/horário ou vínculo de comunidade.
- O preview do questionário mostra quais perguntas entrarão na escala.
- O validador aponta perguntas sem cobertura antes de gerar escala.
- O gerador considera perguntas regulares, especiais e personalizadas na mesma matriz de disponibilidade.

---

## 6. Geração de escala v2.1

### 6.1 Objetivo

Gerar uma sugestão mensal com base em todas as respostas, restrições e histórico, permitindo que o coordenador ajuste sem perder aprendizado para o mês seguinte.

### 6.2 Critérios do algoritmo

- Compilar respostas em formato único antes de pontuar ministros.
- Respeitar disponibilidade explícita por data/horário/evento.
- Considerar preferências, família, substituição, carga mensal, intervalo desde último serviço e histórico de confiabilidade.
- Separar restrições duras de preferências flexíveis.
- Exibir motivo da escolha: disponível, preferiu horário, baixa carga, boa alternância, ajuste manual anterior etc.
- Mostrar confiança por missa/evento e alertas de baixa cobertura.

### 6.3 Aprendizado mensal

Após o coordenador publicar a escala, o sistema deve comparar:

- Sugestão inicial do algoritmo.
- Alterações feitas manualmente.
- Substituições posteriores.
- Faltas, confirmações e remoções.

O próximo mês deve usar esses sinais como pesos explicáveis, sem transformar ajuste manual isolado em regra absoluta.

### 6.4 Aceite funcional

- Gerador nunca ignora pergunta personalizada mapeada para evento.
- Sugestão mensal inclui relatório de cobertura por comunidade.
- Coordenador vê diferenças entre sugestão e publicação.
- Sistema registra motivos dos ajustes para auditoria e melhoria futura.

---

## 7. Multi-comunidades

### 7.1 Valor para lançamento

Multi-comunidades é o fato novo que justifica entusiasmo no teste: o MESC deixa de ser apenas uma escala da matriz e passa a ser a plataforma oficial para comunidades novas.

### 7.2 Requisitos mínimos

- Usuário tem comunidade principal.
- Escalas, questionários, eventos e substituições carregam `community_id`.
- Coordenador de comunidade atua apenas no próprio escopo.
- Coordenador paroquial enxerga consolidado e alterna comunidades.
- Telas do ministro deixam claro de qual comunidade é cada missão quando houver mais de uma.
- Seeds e backfill permanecem validados por script.

### 7.3 Critérios de aceite

- Nenhuma escala de outra comunidade aparece por engano para coordenador restrito.
- Ministro com vínculos familiares preserva visão familiar sem misturar comunidades indevidas.
- Relatórios e exports indicam comunidade.
- Novas comunidades podem ser cadastradas sem migração manual.

---

## 8. Compliance para App Store e Google Play

### 8.1 Antes de enviar

- Fluxo de exclusão de conta dentro do app e URL pública de exclusão. Status: implementado em Configurações > Conta e `/account-deletion`.
- Política de privacidade e formulário de dados preenchidos com precisão.
- Conta de demonstração para reviewer, com dados realistas e sem depender de WhatsApp externo.
- Sentry ou monitoramento equivalente para crash/error tracking.
- `DATABASE_URL` com SSL obrigatório quando suportado.
- Build nativo via Capacitor ou alternativa definida, com app id, ícones, splash, permissões e deep links.
- Teste de login, logout, sessão expirada, exclusão de conta e perda de conexão.

### 8.2 Riscos de rejeição

- App parecer apenas um site sem adaptação mobile.
- Ausência de exclusão de conta.
- Permissões não explicadas.
- Conteúdo que dependa de login sem credencial de reviewer.
- Bugs em cadastro/login/questionário.
- Privacidade declarada diferente do comportamento real.

---

## 9. Roadmap cirúrgico

### Fase A - Agora

- Aplicar UX inicial Liquid Glass na área do ministro.
- Documentar PRD v2 e release readiness.
- Manter gates de TypeScript e diff limpo.
- Validar visualmente a tela em desktop/mobile quando houver sessão de teste.

### Fase B - Pré-loja

- Validar em staging a exclusão de conta com usuário de teste/reviewer.
- Configurar Sentry.
- Fechar `sslmode=require` no banco de produção.
- Empacotar Capacitor iOS/Android.
- Criar usuário reviewer.
- Gerar screenshots e metadados de loja.

### Fase C - Beta público controlado

- Liberar multi-comunidades como novidade principal.
- Medir taxa de resposta ao questionário.
- Medir ministros que abriram próxima escala.
- Medir substituições resolvidas pelo app.
- Coletar ajustes manuais do coordenador para evolução do gerador.

---

## 10. Métricas de sucesso

- 80% dos ministros ativos logados até 14 dias após convite.
- 90% de respostas ao questionário antes do prazo.
- 95% das missas/eventos com cobertura adequada antes da publicação.
- Redução de ajustes manuais recorrentes no segundo mês.
- Zero incidentes de vazamento entre comunidades.
- Zero rejeições de loja por conta, privacidade ou acesso de reviewer.
