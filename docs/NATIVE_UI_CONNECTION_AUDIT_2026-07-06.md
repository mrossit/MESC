# MESC Native - Auditoria De Conexao Da UI SwiftUI

Data: 2026-07-06

## Reconectado Neste Bloco

- Missao: botoes de confirmar presenca e pedir substituicao agora chamam `/api/mobile/v1/schedules/:id/confirm` e `/api/mobile/v1/substitutions`.
- Missao: painel "Pendencias e avisos" deixou de usar linhas estaticas e passou a renderizar `pendingActions` e `notices` vindos de `/mission/home`.
- Escalas: missoes do ministro exibem estado de confirmacao, acao de confirmar e acao de troca quando o contrato retorna `canConfirm` ou `canRequestSubstitution`.
- Escalas: exportacao gera um HTML local no modelo oficial, agrupando a escala completa publicada por data, hora, local e posicoes P1-P28, e abre o compartilhamento nativo do iOS.
- Ajustes: notificacoes push, preferencias por tipo e biometria passaram a sincronizar com `/devices/current`.
- Notificacoes: central nativa carrega `/notifications`, exibe badge de nao lidas, permite marcar uma ou todas como lidas e navega por deep link interno ao abrir um aviso ou push.
- Ajustes: camera/fotos/localizacao nao exibem mais toggles falsos; aparecem como permissoes sob demanda.
- Formacao: cards de fallback estaticos foram removidos; a tela agora mostra estado de erro real, biblioteca de videos baseada nas aulas carregadas e acesso explicito ao estudio atual para coordenadores/gestores.
- Perfil: ganhou resumo real do mes, comunidade e notificacoes a partir dos dados carregados.

## Ainda Desligado Ou Parcial

- Biometria: a tela registra preferencia/capacidade no device registry, mas o fluxo final de desbloqueio por LocalAuthentication ainda precisa voltar ao login nativo sem salvar senha.
- Formacao autoral: o app nativo ainda nao tem contrato mobile para criar/editar trilhas, modulos, aulas, secoes, videos e quizzes; por ora o coordenador abre o estudio web atual.
- Perfil: falta edicao nativa completa, foto por camera/fotos e saneamento de cadastro ministerial.
- Escalas: exportacao nativa cobre HTML compartilhavel; PDF/Excel oficiais ainda dependem de contrato/exportador dedicado no backend mobile.
- Substituicoes: o ministro ja consegue pedir troca; falta tela nativa completa para ver pedidos abertos e aceitar substituicoes de outros ministros.
- Coordenador: painel nativo de escala, questionario, respostas e algoritmo ainda precisa ser trazido do contrato mobile admin para SwiftUI.
- Android: a paridade Jetpack Compose ainda nao foi iniciada neste corte.
