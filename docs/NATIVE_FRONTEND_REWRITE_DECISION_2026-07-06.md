# Decisao - Reescrita Nativa Do Frontend MESC

**Data:** 2026-07-06  
**Status:** aprovado como nova direcao de produto e engenharia  
**Motivo:** os testes em TestFlight confirmaram que a UI atual ainda se comporta como PWA/WebView, mesmo empacotada em iOS/Android.

---

## 1. Decisao

O frontend mobile final do MESC Native nao sera mais evoluido sobre a experiencia React/Capacitor/WebView atual.

A partir desta decisao:

- o backend, banco, API mobile v1, seed, validacoes, contratos e regras de negocio continuam vivos;
- o app Capacitor atual fica como candidato temporario para validar backend, login, dados e fluxo de TestFlight;
- a UI/UX final do MVP sera reconstruida como cliente nativo;
- iOS sera implementado em SwiftUI/UIKit;
- Android sera implementado em Kotlin/Jetpack Compose;
- WebView nao sera a experiencia principal do app nativo.

Esta decisao segue o PRD v3, que ja define o MESC Native como novo produto nativo, nao como clone ou empacotamento do PWA.

---

## 2. Problemas Confirmados No TestFlight

Os testes reais apontaram problemas que nao devem ser tratados apenas com CSS:

- Liquid Glass nao aparece como efeito nativo convincente.
- Formacao ainda herda comportamento e layout de PWA, incluindo sensacao de rolagem horizontal.
- Escalas ficaram diferentes demais do modelo operacional antigo, dificultando leitura pelos ministros.
- Configuracoes ficam inacessiveis, aparecem e somem rapidamente, travando a navegacao.
- Safe area, notch, barra superior, menu lateral e bottom bar ainda revelam acoplamento de WebView.
- Permissoes nativas, notificacoes, biometria, camera e geolocalizacao ainda passam por adaptacoes em vez de fluxos nativos.

Ha tambem uma evidencia tecnica no codigo atual: `ios/App/App/AppViewController.swift` registra que o Liquid Glass da tab bar esta sendo renderizado em CSS no WebView e que uma camada nativa por cima/baixo do WebView nao funcionou corretamente. Isso confirma que a limitacao e arquitetural.

---

## 3. O Que Continua

Manter:

- API mobile v1 e OpenAPI;
- Supabase/Postgres staging nativo;
- migrations mobile;
- seed demo;
- idempotencia e anti-vazamento multi-comunidade;
- fluxo de autenticacao, refresh token e device registry;
- servicos de escala, questionario, substituicao, formacao e notificacoes;
- dados do MESC atual como fonte de importacao/saneamento;
- dominio `saojudastadeu.app`;
- paleta visual liturgica ja aprovada.

---

## 4. O Que Para

Parar como rota de produto final:

- tentar simular Liquid Glass com CSS;
- reusar telas web densas como experiencia mobile principal;
- corrigir configuracoes e formacao apenas com ajustes de rota web;
- tratar recursos nativos como se fossem APIs de navegador;
- publicar novos builds apenas para ajustes esteticos do WebView, exceto se forem correcoes bloqueantes de teste.

---

## 5. Arquitetura Nativa Alvo

### iOS

- SwiftUI como camada principal de telas.
- UIKit apenas quando for melhor para APIs especificas ou integracoes do sistema.
- URLSession/Swift Concurrency para o cliente mobile.
- Keychain para tokens e credenciais elegiveis.
- LocalAuthentication para Face ID/Touch ID.
- UserNotifications/APNs para push.
- PhotosUI/AVFoundation conforme necessidade de foto, camera e video.
- CoreLocation somente quando um fluxo do PRD justificar.
- Liquid Glass nativo com APIs do sistema quando disponiveis, com fallback para materiais nativos estaveis em versoes anteriores.
- Tokens visuais derivados do kit Apple fornecido pelo produto, combinados com a paleta liturgica MESC.

### Android

- Kotlin + Jetpack Compose.
- Material/Compose nativo adaptado para a identidade MESC.
- BiometricPrompt.
- FCM.
- CameraX/Photo Picker quando necessario.
- Location APIs somente quando aprovadas pelo fluxo.
- Efeito de vidro equivalente com blur/material nativo, sem tentar copiar literalmente iOS quando a plataforma pedir outro comportamento.

---

## 6. UX P0 A Reconstruir

### App Shell

- Navegacao nativa por tabs.
- Header respeitando safe area, Dynamic Island/notch e status bar.
- Bottom bar com vidro nativo real.
- Side menu ou more menu nativo, sem sobrepor conteudo nem sumir ao tocar.
- Sheets e dialogs nativos.

### Login E Sessao

- Primeiro login com email/senha.
- Biometria apenas para desbloquear sessao/credencial elegivel.
- Token expirado ou revogado deve cair para login manual, sem loop de Face ID.
- Mensagens de erro humanas e sem stack/estado tecnico.

### Minha Missao

- Proxima escala em destaque.
- Questionario pendente.
- Avisos essenciais.
- Acoes curtas: confirmar presenca, pedir substituicao, ver detalhes.

### Escalas

Esta tela deve voltar a ser simples e operacional:

- no topo: controle segmentado Minha Escala, Mes, Escala Completa;
- abaixo do controle: calendario mensal navegavel;
- ao tocar uma data: mostrar abaixo as missas daquele dia;
- em Minha Escala: mostrar apenas as missoes do ministro;
- em Mes: mostrar a agenda do mes com leitura clara;
- em Escala Completa: permitir consulta por comunidade/mes conforme permissao;
- exportacao deve seguir o modelo da escala enviada como referencia pelo produto;
- nao alterar a logica visual basica de cores da escala antiga sem aprovacao.

### Formacao

- Lista nativa de trilhas/aulas.
- Aula com texto, anexos, quiz e video em layout responsivo nativo.
- Secao de videos.
- Area de coordenador para incluir aulas, conteudos, videos e quizzes.
- Sem rolagem horizontal para ler conteudo principal.

### Configuracoes

- Tela nativa estavel, sem fechar sozinha.
- Central de permissoes: notificacoes, biometria, camera, fotos e localizacao.
- Preferencias de notificacao por tipo: questionario, avisos, encerramento, escala publicada, substituicao, treinamento e lembrete.
- Botao de abrir Ajustes do sistema quando a permissao estiver negada.

---

## 7. Liquid Glass - Criterio Real

O Liquid Glass so sera considerado aceito quando:

- for renderizado por APIs nativas da plataforma, nao por CSS em WebView;
- aparecer claramente em bottom bar, nav bar, sheets e cards de destaque;
- respeitar modo claro, escuro, alto contraste e reducao de transparencia;
- nao prejudicar leitura;
- for validado em dispositivo real ou simulador com screenshot antes do build;
- tiver fallback elegante quando a versao do sistema nao oferecer o efeito completo.

### 7.1 Fontes Apple Confirmadas

A investigacao foi feita em duas camadas:

- documentacao oficial Apple Developer:
  - `https://developer.apple.com/documentation/technologyoverviews/liquid-glass`;
  - `https://developer.apple.com/documentation/uikit/uiglasseffect`;
  - `https://developer.apple.com/documentation/swiftui/glasseffectcontainer`;
  - `https://developer.apple.com/design/human-interface-guidelines/materials`;
- SDK local do Xcode instalado neste Mac:
  - `UIKit.framework/Headers/UIGlassEffect.h`;
  - `SwiftUICore.swiftinterface`.

O SDK confirma:

- `UIGlassEffect` e `UIGlassContainerEffect` existem a partir do iOS 26;
- `UIGlassEffect` possui estilos `regular` e `clear`, tint e interatividade;
- SwiftUI possui `.glassEffect(...)` a partir do iOS 26;
- SwiftUI possui `GlassEffectContainer` para agrupar elementos de vidro;
- iOS 15 a iOS 25 precisam de fallback com materiais nativos como `.ultraThinMaterial`.

Portanto, qualquer implementacao final de Liquid Glass para iOS deve usar APIs nativas quando o dispositivo estiver em iOS 26+, com fallback material em versoes anteriores. CSS/backdrop-filter dentro de WebView nao atende ao criterio final.

### 7.2 Kit Apple/Sketch Fornecido Pelo Produto

Referencia recebida:

- Sketch: `https://www.sketch.com/s/04c24d8b-38fb-4afb-8836-36617e022f02`;
- tokens locais: `/Users/rossit/Downloads/apple-ios-27-ui-kit.tokens.json`;
- assets locais: `/Users/rossit/Downloads/apple-ios-27-ui-kit_assets_2026-06-23_v13/`.

O arquivo de tokens possui grupos para:

- tipografia SF Pro: LargeTitle, Title1, Title2, Title3, Headline, Body, Callout, Subheadline, Footnote, Caption1 e Caption2;
- labels comuns e labels para Liquid Glass;
- fills, backgrounds, grouped backgrounds e separators;
- system colors;
- tokens auxiliares do kit.

Mapeamento inicial usado no corte SwiftUI:

| Uso no MESC | Token Apple de referencia | Valor base |
| --- | --- | --- |
| Titulo grande | LargeTitle Bold | 34 / weight 700 |
| Titulo de bloco | Title1 Bold | 28 / weight 700 |
| Card/linha forte | Headline | 17 / weight 600 |
| Texto operacional | Body | 17 / weight 400 |
| Controle auxiliar | Callout | 16 / weight 400 |
| Texto secundario | Subheadline/Footnote | 15/13 |
| Label light glass primary | Labels - Liquid Glass / Light / Primary | `#1A1A1A` |
| Label light glass secondary | Labels - Liquid Glass / Light / Secondary | `#727272` |
| Label dark glass primary | Labels - Liquid Glass / Dark / Primary | `#EDEDED` |
| Label dark glass secondary | Labels - Liquid Glass / Dark / Secondary | `#8A8A8A` |
| Fill light primary | Fills / Light / Primary | `#787878` alpha 0.20 |
| Fill dark primary | Fills / Dark / Primary | `#787880` alpha 0.36 |
| Separator light | Separators / Light / Non-Opaque | black alpha 0.12 |
| Separator dark | Separators / Dark / Non-Opaque | white alpha 0.12 |

Regra de aplicacao: os tokens Apple definem ritmo, legibilidade, hierarquia e materiais; a identidade MESC continua nos acentos vinho, vermelho liturgico, dourado e marfim.

---

## 8. Plano De Execucao

### Fase 0 - Congelar O WebView Como Baseline

- Manter o build atual apenas para validar backend/API/dados.
- Corrigir somente bugs bloqueantes que impedem teste de contrato.
- Nao usar o WebView como criterio final de UX.

### Fase 1 - iOS Nativo Vertical Slice

Entregar um primeiro corte SwiftUI com:

- app shell nativo;
- login visual e estado de sessao mockado/fixture;
- bottom bar Liquid Glass;
- Minha Missao;
- Escalas com calendario no topo e lista abaixo;
- Configuracoes nativas acessiveis;
- Formacao em lista/detail nativo basico.

### Fase 2 - Integracao API Real

- Conectar auth, refresh, Minha Missao, escalas, questionario, substituicao e formacao ao backend staging.
- Persistir tokens em Keychain.
- Conectar central de permissoes ao device registry.

### Fase 3 - TestFlight Nativo

- Gerar build TestFlight do cliente SwiftUI.
- Validar UX real antes de expandir coordenador/admin.
- Corrigir gaps de API descobertos pelo cliente nativo.

### Fase 4 - Android Nativo

- Implementar equivalente Compose usando os mesmos contratos.
- Ajustar interacoes conforme padroes Android, sem copiar iOS literalmente.

---

## 9. Gate De Aceite Para Retomar TestFlight Como MVP

O app so volta a ser candidato serio de MVP quando:

- configuracoes forem acessiveis e estaveis;
- escalas seguirem a estrutura aprovada;
- formacao for navegacao nativa, sem PWA reaproveitado;
- Liquid Glass nativo for visivel e consistente;
- permissoes forem chamadas pelo sistema operacional;
- login/biometria nao entrarem em loop;
- API real responder os fluxos P0;
- screenshots de iPhone real/simulador forem aprovados antes do upload.
