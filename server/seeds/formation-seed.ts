import { createHash } from 'crypto';
import { db } from '../db';
import {
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections
} from '@shared/schema';
import { eq } from 'drizzle-orm';

const TRACK_ID = 'mesc-formacao';

const manifest = {
  "titulo": "Formação dos Ministros Extraordinários da Sagrada Comunhão",
  "subtitulo": "Santuário São Judas Tadeu",
  "versao": "2026.1 (renovado)",
  "descricao": "Substrato de conteúdo do app MESC. Reúne formação espiritual/teológica, postura do ministro, serviço operacional na Missa, cuidado com o Santíssimo, referência litúrgica ilustrada e a vida do grupo.",
  "modulos": [
    {
      "id": "00-identidade",
      "titulo": "Identidade do Ministério",
      "icone": "✝",
      "resumo": "Quem somos, o chamado ao serviço, a humildade e a hierarquia.",
      "conteudo": "conteudo/00-identidade.md",
      "secoes": [
        "O chamado: aceitei, e agora?",
        "Humildade e serviço",
        "Apresentação do ministério",
        "Hierarquia",
        "Adoração ao Santíssimo"
      ]
    },
    {
      "id": "01-formacao",
      "titulo": "Formação Espiritual e Teológica",
      "icone": "📖",
      "resumo": "O Calvário e a Missa, o simbolismo da Liturgia e o bom serviço litúrgico (Escola de Liturgia).",
      "conteudo": "conteudo/01-formacao-teologica.md",
      "secoes": [
        "Aula 1 — O Calvário e a Missa",
        "Aula 2 — O simbolismo na Liturgia",
        "Aula 3 — O bom serviço litúrgico"
      ]
    },
    {
      "id": "02-ministro",
      "titulo": "O Ministro: Postura e Apresentação",
      "icone": "🕊",
      "resumo": "Como se apresentar, posturas e gestos na Missa, silêncio e pontualidade.",
      "conteudo": "conteudo/02-postura-do-ministro.md",
      "secoes": [
        "Apresentação e uniforme",
        "Posturas e gestos na Missa",
        "Sacristia e silêncio",
        "Pontuais e invisíveis"
      ]
    },
    {
      "id": "03-servico",
      "titulo": "Serviço na Missa (passo a passo)",
      "icone": "🍞",
      "resumo": "Horários, escala, funções 1–16, partículas, credência, saídas e como ministrar a comunhão.",
      "conteudo": "conteudo/03-servico-na-missa.md",
      "dados": [
        "dados/funcoes_escala.json",
        "dados/missas_e_particulas.json",
        "dados/checklists.json"
      ],
      "secoes": [
        "Horários e chegada",
        "Como sou escalado",
        "Funções da escala",
        "Ministros e partículas",
        "Credência e altar",
        "Saídas do altar e da Capela",
        "Como ministrar a comunhão",
        "Mapas de posição"
      ]
    },
    {
      "id": "04-santissimo",
      "titulo": "O Santíssimo: Recolher, Expor, Purificar",
      "icone": "☀",
      "resumo": "Reverência, materiais, jaculatórias e o passo a passo na Capela.",
      "conteudo": "conteudo/04-santissimo.md",
      "dados": [
        "dados/oracoes.json",
        "dados/checklists.json"
      ],
      "secoes": [
        "Reverência ao Santíssimo",
        "Materiais para recolher",
        "Orações e jaculatórias",
        "Recolher passo a passo",
        "Purificação",
        "Exposição"
      ]
    },
    {
      "id": "05-referencia",
      "titulo": "Referência Litúrgica Ilustrada",
      "icone": "📿",
      "resumo": "Cores e tempos, espaço celebrativo, vestes e objetos litúrgicos, montagem do cálice.",
      "conteudo": "conteudo/05-referencia-liturgica.md",
      "dados": [
        "dados/cores_e_tempos.json",
        "dados/glossario_liturgico.json"
      ],
      "secoes": [
        "Cores litúrgicas",
        "Espaço celebrativo",
        "Vestes litúrgicas",
        "Objetos litúrgicos",
        "Montagem do cálice"
      ]
    },
    {
      "id": "06-enfermos",
      "titulo": "Comunhão aos Enfermos",
      "icone": "🤝",
      "resumo": "Como funciona a comunhão aos doentes e idosos e a preparação necessária.",
      "conteudo": "conteudo/06-enfermos-e-grupo.md",
      "secoes": [
        "Comunhão aos enfermos",
        "Contribuição mensal",
        "Preceitos do ministro"
      ]
    }
  ]
} as const;

const moduleMarkdown: Record<string, string> = {
  "00-identidade": "---\nmodulo: \"00-identidade\"\ntitulo: \"Identidade do Ministério\"\n---\n\n# Identidade do Ministério\n\n## O chamado: aceitei, e agora? Como será?\n\nFomos convidados a sermos Ministros Extraordinários da Sagrada Comunhão. Entramos para um ministério que tem normas e preceitos, mas, antes de tudo, um chamado. É natural sentir nervosismo no começo — e o caminho para superá-lo é a **humildade**.\n\nComo ensina o Pe. Flávio, ser ministro não me torna melhor do que ninguém. Esta função é um **serviço**: a própria palavra *Liturgia* quer dizer \"serviço\". Ter humildade é também olhar com sinceridade para o meu comportamento e corrigir o que for inadequado.\n\n## Humildade e serviço\n\nO ministro está a serviço da assembleia, do celebrante e, sobretudo, de Jesus Eucarístico. Por isso somos chamados a sermos **\"pontuais e invisíveis\"**: presentes, atentos e discretos, sem desviar para nós a atenção que pertence ao mistério celebrado.\n\nTrabalhamos em grupo. Independentemente da função de cada um na escala, todos ajudam na preparação — montar a credência, levar a água às jarras, o ambão, a sineta, a montagem do cálice. Assim o serviço fica leve e não pesa sobre um só. Temos a consciência de que **somos um grupo**.\n\n## Apresentação do ministério\n\nFazemos parte do **Setor Liturgia**. A coordenação atual:\n\n- **Coordenador do Setor:** Diácono Émerson\n- **Coordenadores dos Ministros a nível Paroquial:** Priscila e Marco\n- **Coordenação dos Ministros do Santuário:** Ana Paula\n- **Comunidade São Marcos:** Luís e Renata\n- **Comunidade São Josemaria Escrivá:** Lizandra e Rodrigo\n- **Coordenação dos Acólitos a nível Paroquial:** João Gabriel\n\n> Os nomes acima refletem a coordenação no momento da última revisão e devem ser atualizados conforme as mudanças do grupo.\n\n## Hierarquia\n\n**Na paróquia:**\n\n- Reitor: Pe. Flávio\n- Setor Liturgia: Diácono Émerson\n- Coordenação dos Ministros (paroquial, santuário e comunidades)\n\n**Na Missa, entre os ministros:** Coordenador de Liturgia do dia → Auxiliar 1 → Auxiliar 2. Temos a obrigação de respeitar os auxiliares, pois são eles que recebem as informações de qualquer alteração — venha ela do Coordenador de Liturgia, do Diácono ou do Padre.\n\nO **padre é o celebrante** e determina tudo na Missa. Somos ajudantes; não tomamos decisões que não nos cabem. Em caso de dúvida, a Liturgia do dia entra em contato com a coordenação.\n\n## Adoração ao Santíssimo\n\nNosso horário de Adoração é às **segundas-feiras, das 22:00 às 00:00** (turnos das 22:00–23:00 e 23:00–00:00).\n\n> \"Fomos criados para o louvor de Sua glória\" (Efésios 1, 11-12). \"Fazei tudo para a glória de Deus\" (1Cor 10, 31).\n\nSe você não estiver na escala, deve participar da Missa de domingo no seu horário — é um preceito de ser católico.\n",
  "01-formacao": "---\nmodulo: \"01-formacao\"\ntitulo: \"Formação Espiritual e Teológica\"\nfonte: \"Escola de Liturgia — Prof. Michel Pagiossi Silva (Imersão Litúrgica)\"\n---\n\n# Formação Espiritual e Teológica\n\n> Conteúdo formativo baseado na Imersão Litúrgica do Prof. Michel Pagiossi (Escola de Liturgia), organizado em três aulas: o Calvário e a Missa, o simbolismo na Liturgia e o bom serviço litúrgico.\n\n---\n\n## Aula 1 — Encontrando o Tesouro: o Calvário e a Missa\n\n### O homem, o pecado original e a espera\n\nNo início, Deus criou o homem em estado de justiça original, em amizade harmoniosa com Ele. Esse estado foi perturbado pelo pecado original, que trouxe a queda. O principal castigo foi a inimizade com Deus — privação da santidade e da justiça originais. Segundo o Catecismo (CIC 76), o pecado original é uma condição com a qual nascemos, \"contraída\", não \"cometida\", transmitida pela natureza humana \"não por imitação, mas por propagação\".\n\nA esperança, porém, nunca se perdeu. Em Gênesis 3, 15 Deus promete a vitória final sobre o pecado. A Santa Missa é uma **extensão do evento do Calvário**, como os ramos se estendem do tronco. No Calvário, Cristo entregou-se obedientemente ao Pai até a morte de cruz (Fl 2, 8); na Missa, participamos desse sacrifício e continuamos a obra redentora de Cristo.\n\n### Existência do Sacrifício da Missa\n\nO Sacrifício da Cruz é único, eterno, universal e perpétuo — mas o ato em si foi transitório. Por isso é conveniente e necessário prolongá-lo como **ato de culto** permanente. Embora o Sacrifício seja universal, ele precisa ser **aplicado a cada homem** de maneira imediata e individual, sobretudo pelos Sacramentos, canais divinamente instituídos que operam *ex opere operato*. O Sacrifício do Altar, de caráter propiciatório e impetratório, toma os méritos da Cruz, oferece-os ao Pai e d'Ele recebe os frutos da redenção.\n\n**Provas de sua existência:**\n\n- **Melquisedeque** — o Messias será sacerdote \"segundo a ordem de Melquisedeque\" (Sl 109, 4), cuja oblação é de pão e vinho (Gn 14, 18).\n- **Malaquias** — prediz uma oblação pura oferecida \"do nascente ao poente\" entre as nações (Ml 1, 10-11); no original, *minchach* = sacrifício incruento.\n- **Nosso Senhor** — \"Fazei isto em memória de mim\" (Lc 22, 19) institui a Eucaristia. Os termos *datur* (\"é dado\") e *effundetur* (\"será derramado\") enfatizam a natureza sacrificial.\n- **São Paulo** — em 1Cor 10 distingue os sacrifícios pagãos da Eucaristia, ressaltando a comunhão exclusiva com Cristo.\n\n### Essência do Sacrifício da Missa\n\nA Ceia, a morte de Jesus e a Missa formam **um só sacrifício**. Na Ceia, Nosso Senhor se oferece no pão e no vinho (oblação real, sacramental e figurativa). Na Cruz, a imolação e a oblação são reais. Na Missa, é essencialmente o mesmo Sacrifício da Cruz — o mesmo Sacerdote, a mesma Vítima — com diferença apenas acidental: já não Nosso Senhor diretamente, mas seu Ministro, que oferece uma vítima já imolada e agora gloriosa. Por isso o Concílio Vaticano II prefere o termo **\"Mistério Pascal\"**.\n\n### Frutos do Sacrifício\n\nA Missa é um sacrifício:\n\n- **Latrêutico** — ato supremo de adoração.\n- **Eucarístico** — hino de ação de graças pela ação de Deus na história.\n- **Satisfatório** — purificação e santificação de quem participa com fé e amor; pode aplicar-se também às almas do Purgatório.\n- **Impetratório / de súplica** — intercessão de Cristo ao Pai por nossas necessidades.\n\nEmbora a Missa tenha **valor infinito** (pela dignidade de Cristo que a oferece), a aplicação desse valor é finita, limitada pela nossa capacidade de receber a graça.\n\n### Associação dos fiéis ao Sacrifício\n\nPelo Batismo, todos os fiéis participam do **sacerdócio comum** (distinto do ministerial ordenado). Somos chamados a unir nossos próprios sacrifícios ao de Cristo. Isso exige disposição interior e intenção consciente: não somos meros espectadores, mas **co-participantes**, chamados a oferecer-nos com Ele por amor a Deus e à salvação do mundo.\n\n---\n\n## Aula 2 — Abrindo o Tesouro: o simbolismo na Liturgia\n\nA liturgia católica é uma tapeçaria de símbolos — pontes entre o divino e o humano. O simbolismo não é ornamento, mas linguagem pela qual a Igreja comunica a fé. Compreender os gestos, objetos, cores e movimentos nos permite viver a liturgia com mais intensidade.\n\n### Acessórios do altar\n\n- **Altar** — coração da celebração; mesa do Senhor e monte do Calvário (refeição e sacrifício).\n- **Velas** — luz suave que cria ambiente sagrado; refletem Cristo, luz do mundo (cada uma pode evocar um dos sete sacramentos).\n- **Tabernáculo** — guarda a Eucaristia; símbolo do Santo dos Santos, presença real de Cristo na Nova Aliança.\n- **Idiomas (latim, grego, hebraico)** — afirmam a universalidade e continuidade da Igreja (*Kyrie eleison*, *Hosana*).\n\n### Dos Ritos Iniciais ao fim da Liturgia da Palavra\n\nA **procissão de entrada** (cruz à frente) simboliza os mártires entrando no Santuário Celeste. A **Antífona de Entrada** evoca os clamores dos profetas. No **Confiteor** reconhecemos nossa indignidade; no **Kyrie**, pedimos misericórdia ao Senhor do Tempo, em três súplicas à Trindade (tríplice miséria: ignorância, culpa e pena). No **Glória**, cantamos com os anjos o nascimento místico do Senhor (omitido em ofícios fúnebres e de penitência). A **Oração do Dia** resume o espírito da Igreja.\n\nNa **Liturgia da Palavra**, sentamo-nos para ouvir. A Primeira Leitura recorda os profetas e João Batista; o **Aleluia** é exultação espiritual. No **Evangelho**, o sacerdote faz quatro sinais da cruz — no livro, na fronte, nos lábios e no peito (conhecer, professar e amar a Palavra). A **Homilia** atualiza a Palavra; o **Credo** é nossa adesão (curvamo-nos ao mencionar a Encarnação); a **Oração dos Fiéis** apresenta os pedidos da congregação.\n\n### Liturgia Sacrificial aos Ritos Finais\n\nTudo no altar remonta à Santa Ceia. No **ofertório**, o canto exprime a alegria dos oferentes e o sacerdote pede que Deus aceite a oblação. A gota de água no vinho representa a humanidade misturada ao Sangue Redentor; o **Lavabo** evoca o lava-pés. No **Sanctus** (\"Corações ao alto!\") cantamos com os anjos; o Hosana lembra a entrada em Jerusalém.\n\nO **Cânon** é a oração mais importante: reza-se pelos vivos, defuntos, pela Igreja terrestre e celeste. O sacerdote se dobra sobre o altar para consagrar (o altar é o próprio Cristo); as elevações recordam Cristo elevado na Cruz. A **fração da Hóstia** lembra Nosso Senhor perfurado pela lança; a junção do pedaço com o Sangue simboliza a Ressurreição. Canta-se o **\"Cordeiro de Deus\"** (visão da Jerusalém Celeste). O **Pai-Nosso** prepara para a Comunhão.\n\nNa **Comunhão**, vivemos o véu eucarístico — como os discípulos de Emaús, sabemos pela fé que Ele está presente. A oração pós-comunhão evoca os 40 dias com os Apóstolos; a **bênção final** representa Pentecostes; o **\"Ite\"** é o envio. Como diz São Roberto Belarmino, nenhum gesto do sacerdote é mera gesticulação: estender os braços após a consagração significa Cristo com os braços abertos na Cruz.\n\n---\n\n## Aula 3 — Partilhando o Tesouro: o bom serviço litúrgico\n\n### A Liturgia como joia da Igreja\n\nSegundo o Pe. Reüs, \"a liturgia é a casa de ouro, de perfeita harmonia, a glória da Igreja\". É o \"diadema e o diamante\": coroa a Igreja com a majestade de Deus e reflete a luz divina em todas as direções. Mais do que ritos e cerimônias, é a manifestação tangível da divindade na vida da Igreja — a ser vivida e experimentada, não apenas compreendida.\n\n### As rubricas e o Direito Litúrgico\n\nAs **rubricas** (do latim *ruber*, vermelho) são as instruções que orientam a oração e a conduta na celebração. Em escala maior, constituem o **Direito Litúrgico** — não imposição arbitrária, mas expressão do cuidado pastoral da Igreja em salvaguardar a pureza do culto e promover a participação dos fiéis.\n\n### Zelo pela unidade e cuidado na celebração\n\nA liturgia é celebração comunitária do Corpo de Cristo, não prática individualista. Por isso a Igreja zela pela unidade — sem rejeitar a diversidade legítima, mas reconhecendo que quem legisla é o Magistério. Como adverte a instrução *Redemptionis Sacramentum*, muitos abusos nascem da ignorância sobre o significado dos ritos; daí a necessidade de **formação litúrgica sólida**. Seguir as rubricas com cuidado não é legalismo, mas amor e respeito pelo Mistério Pascal — uma estrutura que liberta os fiéis para se concentrarem no mistério divino.\n\n### A Autoridade Papal e a \"Ars Celebrandi\"\n\nComo Vigário de Cristo, o Papa tem o dever de supervisionar o culto litúrgico (cf. Mt 16, 18), em colaboração com a Congregação para o Culto Divino. A **\"ars celebrandi\"** é a arte de celebrar dignamente os ritos, revelando e honrando o mistério da Eucaristia — exige dos ministros compreensão profunda e respeito reverente por cada gesto, palavra e símbolo.\n\n### Formação litúrgica permanente\n\nA formação é um processo **contínuo e vitalício**, jornada espiritual que exige humildade — a disposição de admitir que nunca compreenderemos completamente os mistérios de Deus. É mais do que aprendizagem: é conversão do coração.\n\n> Monsenhor Fulton Sheen convida-nos a visualizar: *\"o Sumo Sacerdote, Cristo, saindo da sacristia do Céu para o altar do Calvário... O Calvário é a Sua Catedral; a rocha do Calvário é a pedra do altar; o rubor do sol poente, a lâmpada do Santuário... Ele está de pé, como sacerdote, e prostrado, como vítima. A Sua Missa vai começar.\"*\n\nSomos chamados a salvaguardar e fazer brilhar a preciosa joia da Eucaristia, o diadema da Igreja. Cada Missa é uma nova oportunidade de comunhão mais profunda com Deus. **Você virá conosco?**\n",
  "02-ministro": "---\nmodulo: \"02-ministro\"\ntitulo: \"O Ministro: Postura e Apresentação\"\n---\n\n# O Ministro: Postura e Apresentação\n\n## Apresentação e uniforme\n\nA apresentação é parte do nosso serviço — **\"somos vitrines\"**. Por isso, atenção ao uniforme e à higiene pessoal.\n\n- **Jaleco** branco (não bege), bem passado e limpo. Não é um casaquinho curto. Vestir **somente na Sacristia** e não sair da igreja com ele — exceto os ministros que levam comunhão aos enfermos.\n- **Homens:** calça preta, sapato preto (não tênis), camisa branca e gravata preta.\n- **Mulheres:** calça preta (não leggins), sapato ou sandália preta sem plataforma, com salto seguro; camisa ou camiseta branca lisa, sem desenhos; **cabelos presos**.\n- Mãos limpas e higienizadas; atenção a anéis e brincos; maquiagem leve.\n\n> Veja o checklist interativo \"Apresentação e uniforme\" no módulo de Serviço.\n\n## Posturas e gestos na Missa\n\nNo altar, **seguimos o padre**. A regra geral é discrição e unidade nos gestos.\n\n- Sempre que descer ou subir ao altar, faça **reverência à mesa** (não à cruz) — ela é a mesa do sacrifício. O mesmo vale para a Capela.\n- Sentados antes da Missa: cuidado com conversas, mãos no cabelo, nos óculos etc.\n- Só **sentamos depois que o padre sentar**; só **levantamos quando o padre levantar** (inclusive no Evangelho).\n- Na proclamação do Evangelho, fazemos apenas as **três cruzes** — na fronte, nos lábios e no peito.\n- Acompanhamos os gestos do padre (Ato Penitencial, Glória); combinem todos o mesmo movimento.\n- Durante a **Consagração** e o **Pai-Nosso**, não responder em voz alta — atrapalha o padre.\n- Quando o padre elevar o cálice e proclamar \"Por Cristo, com Cristo e em Cristo\", **somente ele** levanta as mãos.\n- Na bênção final, **ajoelhar**; ao \"Ide em paz\", já estar de pé (inclusive quem está na Capela).\n- Ao se sentar no altar, não cruzar as pernas; se possível, mãos sobre os joelhos.\n\n## Sacristia e silêncio\n\nTodos os trabalhos começam na Sacristia. Nós nos empolgamos em conversas sem perceber que o tom sobe — e muitas vezes há pessoas chegando com dores e sofrimentos; nossas risadas passam a impressão de que estamos alheios.\n\nSilêncio especialmente **na chegada** e **ao fim da Missa**, quando o padre inicia os atendimentos. Por isso, após a Missa, só permanecem na Sacristia os **nrs 1, 2 e 3**; os demais, após retirar o material da credência e do altar, dirigem-se à Capela — sem esperar serem convidados a se retirar.\n\nNa **roda** de orientações, reza-se apenas uma oração de proteção do servir (uma Ave-Maria *ou* um Pai-Nosso *ou* um Vinde Espírito Santo). As entregas são feitas na Capela, enquanto recolhemos Jesus.\n\n## Pontuais e invisíveis\n\nOrientações gerais do Pe. Flávio:\n\n- **Pontualidade:** chegar 1 hora antes (missas diárias 45 min; Cura e Libertação 1h30).\n- **Começamos juntos e terminamos juntos** (salvo urgência ou trabalho).\n- Nas escalas, misturar ministros novos com antigos, para que os mais experientes **orientem** (não \"deem ordens\").\n- Não sair do lugar durante a Missa sem necessidade — desvia a atenção da assembleia.\n- Não correr na igreja nem demonstrar agitação; observar sempre os auxiliares.\n- Ensaiar o toque do carrilhão.\n- Reverência sempre ao passar pelo altar e voltada para o altar.\n",
  "03-servico": "---\nmodulo: \"03-servico\"\ntitulo: \"Serviço na Missa (passo a passo)\"\ndados:\n  - \"dados/funcoes_escala.json\"\n  - \"dados/missas_e_particulas.json\"\n  - \"dados/checklists.json\"\n---\n\n# Serviço na Missa (passo a passo)\n\n## Horários e chegada\n\n**Domingos:** 08:00, 10:00 e 19:00. **Missas diárias:** 06:30 (das 06:30 às 07:00).\n\n**Missas de São Judas Tadeu (dia 28 de cada mês):**\n\n- Dia de semana: 07:00, 15:00 e 19:30\n- Sábado: 07:00, 15:00 e 19:00\n- Domingo: 08:00, 10:00, 15:00 e 19:00\n\n**Missas especiais:** Cura e Libertação (1ª quinta, 19:30); Sagrado Coração de Jesus (1ª sexta, 06:30); Sagrado Coração de Maria (1º sábado, 06:30).\n\nComo ministros, chegamos **1 hora antes** do início da Missa e entramos pelo **portão da Sacristia** (missas diárias: 45 min; Cura e Libertação: 1h30).\n\n## Como sou escalado\n\nTodo mês é enviado um formulário (Google Forms) no grupo de Ministros. Cada um responde a sua disponibilidade — **casais respondem juntos** (um responde e marca o cônjuge), com sim/não para cada missa, sem justificativa. Pede-se a gentileza de servir **um domingo sim, outro não**, para que todos possam participar.\n\nColocar disponibilidade não significa ser escalado em todas as missas marcadas. E, se algum ministro pedir troca por imprevisto, você pode se oferecer para cobrir.\n\n## Funções da escala\n\nCada número da escala tem responsabilidades próprias. Em missas maiores (10h, 19h, Cura e Libertação), os Auxiliares 1 e 2 distribuem funções adicionais. Os dados completos estão em **`dados/funcoes_escala.json`** (e aparecem como cards interativos no app). Resumo:\n\n| Nº | Função | Em poucas palavras |\n|----|--------|--------------------|\n| 1 | Auxiliar 1 | Líder do horário; comanda e distribui funções; define partículas e âmbulas. |\n| 2 | Auxiliar 2 | Apoia o nr 1 no controle; coloca a folha de música para o padre. |\n| 3 | Recolher o Santíssimo | Recolhe o Santíssimo; prepara material da Capela; guarda material com 1 e 2. |\n| 4 | Recolher o Santíssimo | Recolhe junto ao 3; distribui os pãezinhos às crianças. |\n| 5 e 6 | Velas | Castiçais, velas e cruz; acende ~15 min antes; recolhe ao fim. |\n| 7 e 8 | Fila do padre / Adoração | Cuidam da fila do padre; turnos de Adoração (manhã e noite). |\n| 9, 10, 11, 12 | Purificação e Exposição | Purificam âmbulas, recolhem material e expõem o Santíssimo. |\n| 12 | (também) | Fecha o portão da Sacristia; guarda a chave do Sacrário. |\n| 13, 14, 15 | Mezanino | Sobem ao mezanino no \"Cordeiro de Deus\" para distribuir a comunhão. |\n| 16 | Liturgia (10h) | Entra como 16º ministro nas missas cheias. |\n\n> Independente da função, **todos ajudam** a montar a credência. Somos um grupo.\n\n## Ministros e partículas\n\n| Missa | Ministros | Eucaristias |\n|-------|-----------|-------------|\n| Domingo 08:00 | 15 | 1200 |\n| Domingo 10:00 | 18 | 1400 |\n| Domingo 19:00 | 20 | 1400 |\n| Cura e Libertação | 26 | 2500 |\n\n**Cálculo das partículas:** segue a capacidade da igreja (1200 lugares). Como a missa das 10h é mais cheia, consagra-se mais; às 19h conta-se com 1200. Os Auxiliares 1 e 2 confirmam a quantidade do dia. *(Use a calculadora no app para uma estimativa rápida.)*\n\n## Credência e altar\n\n- Não mudar o que o padre e o diácono estão acostumados — **\"não inventamos a roda\"**.\n- Seguir a sequência de montagem da credência; deixar só o material que será usado.\n- Ser dinâmico: se precisar, além dos auxiliares 1 e 2, os demais ajudam.\n- **Véu nas âmbulas:** somente nas missas com o Pe. Flávio.\n- Os acendedores recarregáveis foram escolhidos pensando no melhor para o serviço.\n\n## Saídas do altar e da Capela\n\n- Normalmente, **após o Pai-Nosso**, os ministros que pegam as âmbulas saem do altar **pela parte da frente**.\n- Os ministros do lado da credência saem juntos pela cortina.\n- Os do lado do ambão saem na ordem **07, 08**, seguidos dos ministros do mezanino.\n- Os do mezanino saem juntos, em fila curta.\n- Os que vão para a igreja saem em ordem de número e juntos.\n- **Cura e Libertação:** todos saem do altar **após a Consagração** (e não após o Pai-Nosso).\n- Ao retornar à Capela, deixe a âmbula e o mini sanguíneo no altar, comungue e retorne. Se o padre estiver em oração ou já disse \"Oremos\", só entre depois que terminar. Se ele for asperge ou dar a bênção, ajoelhe-se onde estiver.\n\n## Como ministrar a comunhão\n\nA partir da orientação do Pe. Flávio, **voltamos a ministrar a Eucaristia na boca** — estejamos preparados para as formas:\n\n- Pegar a hóstia com as pontas dos dedos e, junto à âmbula, elevá-la à boca do fiel, com cuidado para **não derrubar**. Se cair, **consumir** e limpar o chão imediatamente com o sanguíneo, para que não fique nenhuma partícula.\n- Dizer **\"O Corpo de Cristo\"**.\n- Observar se o fiel realmente **consome** a hóstia (vale também para quem comunga na mão). Na dúvida, pare a fila, vá atrás do fiel e peça gentilmente que comungue na sua frente.\n- Respeitar as demais formas: de joelhos diante do ministro ou na mão.\n- **Não cabe ao ministro negar a comunhão** nem julgar quem pode ou não comungar.\n- Posicione-se de modo que as pessoas venham até você e façam a volta sem esbarrar na próxima. Vire-se para distribuir somente depois que o padre descer a escada.\n\n## Mapas de posição\n\nO app exibe os mapas de posição da igreja:\n\n- **Missa de Domingo** — `assets/mapa-missa-domingo.png`\n- **Cura e Libertação** — `assets/mapa-missa-cura.png`\n\nA ordem de saída da Capela e a distribuição por posição são definidas pela coordenação a cada escala (o mapa original com nomes serve de modelo).\n",
  "04-santissimo": "---\nmodulo: \"04-santissimo\"\ntitulo: \"O Santíssimo: Recolher, Expor, Purificar\"\ndados:\n  - \"dados/oracoes.json\"\n  - \"dados/checklists.json\"\n---\n\n# O Santíssimo: Recolher, Expor, Purificar\n\n> Este é o coração do nosso serviço. Tudo aqui se faz com **zelo, silêncio e reverência** — estamos com Jesus Eucarístico.\n\n## Reverência ao Santíssimo\n\nSempre que formos verificar o Sacrário — seja para ver a reserva eucarística, seja para retirar o cibório — fazemos uma **genuflexão com o joelho direito no chão**, ao abrir e ao fechar. Fazemos a mesma genuflexão ao entrar e sair da Capela.\n\nPessoas com dificuldades motoras fazem uma **reverência profunda** e falam com Jesus.\n\n## Materiais para recolher\n\nSeparados pelos nrs 03 e 04 (checklist completo no app):\n\n- Âmbula bojuda com o véu\n- Almofada\n- Véu para o ostensório\n- Corporal para a almofada\n- Mini lavabo\n- Manustérgio\n\n## Orações e jaculatórias\n\nOs nrs 03 e 04 rezam, ao recolher, as orações da Capela; os demais acompanham durante a procissão. (Texto completo em `dados/oracoes.json`.)\n\n1. **Jaculatória de louvor (3x):** \"Graças e louvores sejam dados a todo momento ao Santíssimo e Diviníssimo Sacramento.\" Seguida do \"Glória ao Pai...\".\n2. **Oração do Anjo de Portugal (3x):** \"Meu Deus, eu creio, adoro, espero e amo-Vos. Peço-Vos perdão por aqueles que não creem, não adoram, não esperam e não Vos amam.\"\n3. **Oração de reparação:** \"Santíssima Trindade... ofereço-Vos o preciosíssimo Corpo, Sangue, Alma e Divindade de Jesus Cristo... peço-Vos a conversão dos pobres pecadores. Amém.\"\n4. **Encerramento na Capela:** \"Estivemos e continuaremos reunidos em nome do Pai, do Filho e do Espírito Santo. Amém.\"\n\n> *Jaculatória* vem de *jaculum* (latim, \"jato\"): é um jato que lançamos a Deus do fundo do coração.\n\n## Recolher passo a passo\n\n1. Combinem **antes** quem ajuda e quem faz o quê — para não ficar dúvida na hora.\n2. Preparem no altar os materiais (almofada, corporais, véus).\n3. Ajoelhem-se e rezem a jaculatória de louvor (3x) e o \"Glória ao Pai\".\n4. Levantem e iniciem o recolhimento, rezando a Oração do Anjo de Portugal; a pessoa da vela vai à frente, começando a procissão à Capela.\n5. Ao retirar o trono, **troque o corporal** (não fique esperando pelo outro).\n6. Façam a genuflexão; abram o Sacrário, guardem a âmbula com Jesus e retirem o cibório com a reserva, a ser distribuída nas âmbulas que já estão no altar.\n7. **Fechem a porta do Sacrário** ao retirar a reserva — deixar aberto passa sensação de descuido.\n8. Distribuam as âmbulas metade para cada lado, com o cibório ao centro, facilitando a distribuição.\n9. Rezem a oração de reparação e encerrem de joelhos: \"Estivemos e continuaremos reunidos...\".\n10. Deixem a **chave do Sacrário** com o nr responsável / no armário da Sacristia.\n11. Ao encerrar, saiam da Capela em **silêncio** e vão para os seus lugares — sem \"passear\" pela igreja nem conversar na porta da Capela.\n\n## Purificação\n\nResponsáveis: nrs 9, 10, 11 e 12 (preparo no checklist do app).\n\n- Todo serviço com as âmbulas é feito **sobre o corporal**. Com os corporais novos e compridos, não é preciso colocar sanguíneo por baixo.\n- Combinar quem coloca as comunhões no cibório, quem purifica e quem guarda nas caixas.\n- Ao abrir o cibório, **purificar a tampa** (pode ser no final, mas não esquecer).\n- Secar o mini lavabo com o sanguíneo após o uso.\n- **Não usamos mais álcool** para higienizar âmbulas (deixava ofuscadas e com aparência de meladas). A cada dois meses, dar uma polida para manter o brilho.\n- Os homens levam as caixas para a Sacristia; as mulheres, por usarem salto, evitam.\n\n## Exposição\n\nPara expor o Santíssimo, **esperar por todos os ministros** e dar tempo para a igreja silenciar — salvo nas missas de São Judas Tadeu e de Cura e Libertação.\n\nNas missas das 08h, os nrs 7 e 8 ficam em Adoração das 07:00 às 07:30, quando o Santíssimo é recolhido. À noite, após a exposição, entram em Adoração até as 21:00, quando chega o Adorador.\n",
  "05-referencia": "---\nmodulo: \"05-referencia\"\ntitulo: \"Referência Litúrgica Ilustrada\"\ndados:\n  - \"dados/cores_e_tempos.json\"\n  - \"dados/glossario_liturgico.json\"\n---\n\n# Referência Litúrgica Ilustrada\n\n> Glossário de consulta rápida. No app, cada termo vira um card pesquisável, com ilustração quando disponível.\n\n## Cores litúrgicas\n\nAs cores litúrgicas exprimem o tempo e o mistério celebrado (dados em `dados/cores_e_tempos.json`):\n\n- **Branco** — pureza. Natal, Páscoa, festas do Senhor (exceto Paixão), de Maria, dos Anjos e Santos não-mártires.\n- **Vermelho** — fogo da caridade. Paixão, Pentecostes, Apóstolos e Evangelistas, Santos Mártires.\n- **Verde** — esperança. Tempo Comum (maior parte do ano).\n- **Roxo** — penitência. Advento e missas pelos mortos.\n- **Preto** — luto. Pode ser usado nas missas pelos mortos.\n- **Rosa** — alegria. III Domingo do Advento e IV Domingo da Quaresma.\n\n## Espaço celebrativo\n\n- **Nave** — corpo principal da igreja, onde se reúne a assembleia.\n- **Presbitério** — área elevada do altar, de onde se preside.\n- **Altar** — mesa da Ceia Eucarística; representa o próprio Jesus. É a mesa do sacrifício (fazemos reverência a ele).\n- **Credência** — mesa auxiliar dos objetos litúrgicos.\n- **Capela do Santíssimo** — reserva e exposição do Santíssimo fora da Missa.\n- **Sacrário / Tabernáculo** — guarda a Eucaristia; presença real de Cristo.\n\n## Vestes litúrgicas\n\nAmito, Alva (Túnica), Sobrepeliz, Cíngulo, Estola Sacerdotal, Estola Diaconal/Dalmática, Casula (Gregoriana, Gótica, Romana), Véu Umeral, Pluvial (Capa de Asperges) e as vestes episcopais (solidéu, mitra, báculo, cruz peitoral). Definições e orações de revestimento em `dados/glossario_liturgico.json`.\n\n## Objetos litúrgicos\n\nCálice, Patena, Hóstia, Corporal, Sanguíneo (Purificatório), Pala, Alfaias, Âmbula (Cibório), Véu do Cibório, Galhetas, Lavabo, Manustérgio, Sineta (Carrilhão), Turíbulo, Naveta, Caldeirinha e Aspersório, Cruz Processional / Crucifixo do Altar, Castiçal e Vela, Missal Romano, Lecionário, Ostensório e Luneta. Todas as definições estão no glossário em dados.\n\n## Montagem do cálice\n\n1. Cálice.\n2. Colocar o sanguíneo sobre o cálice, com leve pressão ao centro.\n3. Colocar a patena sobre o cálice e o sanguíneo.\n4. Colocar a hóstia que será consagrada sobre a patena.\n5. Colocar a pala.\n6. Colocar o corporal.\n7. Colocar o véu do cálice.\n\n> **Turíbulo — quando se usa:** procissão de entrada; ao incensar o altar no início; na proclamação do Evangelho; no ofertório (oferendas, altar, cruz, bispo, celebrantes e povo); à elevação após a consagração; e na exposição do Santíssimo (incensado de joelhos). Fonte: Cerimonial dos Bispos, n. 86–94.\n",
  "06-enfermos": "---\nmodulo: \"06-enfermos\"\ntitulo: \"Comunhão aos Enfermos e Vida do Grupo\"\n---\n\n# Comunhão aos Enfermos e Vida do Grupo\n\n## Comunhão aos enfermos\n\nTemos uma equipe de **Ministros dos Enfermos**, que levam a comunhão a doentes e idosos — mas existe uma preparação.\n\nA responsável é a **Nerci**, coordenadora da Pastoral dos Doentes e Idosos. Quando alguém pedir para levar a comunhão, falamos com ela, para que junto com o **Pe. Wilson** seja feita uma visita ao doente; depois ele libera que seja levada.\n\nSó vamos a **hospitais** para os nossos paroquianos. Se pedirem para levar a um parente ou amigo, orientamos que o pedido seja feito **na paróquia à qual a pessoa pertence**.\n\n> Lembrete: apenas os ministros que levam comunhão aos enfermos saem da igreja de jaleco.\n\n## Contribuição mensal\n\nArrecadamos mensalmente de **R$ 5,00 a R$ 10,00** por ministro. A reserva é usada para reposição de materiais, presentes dos padres e do diácono, envio de coroas, etc.\n\n**PIX (chave e-mail):** ana.soares.paula@outlook.com\n\n> Dado de contribuição sujeito a atualização pela coordenação.\n\n## Preceitos do ministro\n\nEntramos para um ministério que tem **normas e preceitos**. Quem não estiver na escala deve participar da Missa de domingo no seu horário — é um preceito de ser católico. E a Adoração ao Santíssimo, às segundas-feiras das 22:00 às 00:00, é parte da nossa vida de oração como grupo.\n"
};

const formationData = {
  "funcoesEscala": {
    "descricao": "Funções da escala dos Ministros Extraordinários da Sagrada Comunhão (MESC) no Santuário São Judas Tadeu. Cada número da escala corresponde a um conjunto de responsabilidades. Em missas maiores (10h, 19h, Cura e Libertação) os Auxiliares 1 e 2 distribuem funções adicionais conforme a necessidade.",
    "fase_legenda": {
      "preparacao": "Antes da Missa",
      "durante": "Durante a Missa",
      "encerramento": "Após a Comunhão / fim da Missa"
    },
    "funcoes": [
      {
        "numero": 1,
        "papel": "Auxiliar 1",
        "categoria": "auxiliar",
        "resumo": "Líder do horário da Missa.",
        "responsabilidades": [
          "Comanda todos os ministros e distribui as funções do dia.",
          "É o elo com a Liturgia e com os acólitos.",
          "Decide o número de partículas a consagrar e quantas âmbulas serão montadas.",
          "Pode alterar posições para o melhor andamento do serviço.",
          "Junto com o nr 02, é o único que pode sair do altar em caso de necessidade.",
          "Faz o checklist de tudo antes da Missa."
        ],
        "fases": [
          "preparacao",
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 2,
        "papel": "Auxiliar 2",
        "categoria": "auxiliar",
        "resumo": "Serve diretamente com o Auxiliar 1 no controle da Missa.",
        "responsabilidades": [
          "Ajuda o nr 01 no controle da Missa.",
          "Coloca a folha de música para o padre.",
          "Apoia na distribuição de funções e no checklist."
        ],
        "fases": [
          "preparacao",
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 3,
        "papel": "Recolher o Santíssimo",
        "categoria": "santissimo",
        "resumo": "Recolhe o Santíssimo e prepara o material da Capela.",
        "responsabilidades": [
          "Prepara e recolhe o Santíssimo: separa almofada e corporal para embalar o ostensório, corporal e véu para embalar a âmbula.",
          "Prepara o material levado à Capela: caixas, âmbulas, corporal, manustérgio, sanguíneos, véu e toalhas (guardar no armário da Capela).",
          "Faz a jaculatória e as orações de recolhimento junto ao nr 04.",
          "Ao término da Missa, fica com os nrs 1 e 2 para guardar o material na Sacristia."
        ],
        "fases": [
          "preparacao",
          "encerramento"
        ]
      },
      {
        "numero": 4,
        "papel": "Recolher o Santíssimo",
        "categoria": "santissimo",
        "resumo": "Recolhe o Santíssimo junto ao nr 03.",
        "responsabilidades": [
          "Prepara e recolhe o Santíssimo junto ao nr 03.",
          "Reza a jaculatória e as orações da Capela.",
          "Distribui os pãezinhos para as crianças na escada em frente ao altar.",
          "A purificação deve ser feita sobre o corporal; deixar os mini sanguíneos junto no altar."
        ],
        "fases": [
          "preparacao",
          "encerramento"
        ]
      },
      {
        "numero": 5,
        "papel": "Velas",
        "categoria": "velas",
        "resumo": "Responsável pelas velas, castiçais e cruz do altar.",
        "responsabilidades": [
          "Coloca simetricamente no altar os castiçais, as velas e a cruz.",
          "Acende as velas cerca de 15 minutos antes da Missa.",
          "Ao final da Missa, recolhe e guarda as velas (caixa no armário da Sacristia).",
          "Após o término, troca as velas e prepara para a exposição do Santíssimo."
        ],
        "fases": [
          "preparacao",
          "encerramento"
        ]
      },
      {
        "numero": 6,
        "papel": "Velas",
        "categoria": "velas",
        "resumo": "Responsável pelas velas junto ao nr 05.",
        "responsabilidades": [
          "Coloca simetricamente castiçais, velas e cruz no altar.",
          "Recolhe e guarda as velas ao final da Missa.",
          "Após recolher o Santíssimo, pode voltar para a troca das velas."
        ],
        "fases": [
          "preparacao",
          "encerramento"
        ]
      },
      {
        "numero": 7,
        "papel": "Fila do padre / Adoração",
        "categoria": "apoio",
        "resumo": "Cuida da fila de atendimento do padre.",
        "responsabilidades": [
          "Responsável por cuidar da fila de atendimento do padre.",
          "Nas missas das 08h, fica em Adoração ao Santíssimo das 07:00 às 07:30, quando o Santíssimo é recolhido.",
          "À noite, após a exposição do Santíssimo, entra em Adoração até as 21:00, quando chega o Adorador."
        ],
        "fases": [
          "preparacao",
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 8,
        "papel": "Fila do padre / Adoração",
        "categoria": "apoio",
        "resumo": "Cuida da fila de atendimento do padre junto ao nr 07.",
        "responsabilidades": [
          "Responsável por cuidar da fila de atendimento do padre.",
          "Mesmos turnos de Adoração do nr 07."
        ],
        "fases": [
          "preparacao",
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 9,
        "papel": "Purificação e Exposição",
        "categoria": "purificacao",
        "resumo": "Purifica as âmbulas e expõe o Santíssimo.",
        "responsabilidades": [
          "Após a Missa, purifica as âmbulas com zelo e em silêncio.",
          "Prepara o material para purificar: caixas de madeira com a quantidade de âmbulas definida pelos auxiliares, corporal, manustérgios, véu e sanguíneos.",
          "Recolhe todo o material da Capela e, junto aos nrs 13, 14 e 15, leva para a Sacristia.",
          "Expõe o Santíssimo na presença de todos."
        ],
        "fases": [
          "encerramento"
        ]
      },
      {
        "numero": 10,
        "papel": "Purificação e Exposição",
        "categoria": "purificacao",
        "resumo": "Purificação junto aos nrs 9, 11 e 12.",
        "responsabilidades": [
          "Combina entre os colegas quem coloca as comunhões no cibório, quem purifica e quem guarda nas caixas.",
          "Cuida com respeito e silêncio das âmbulas e manustérgios."
        ],
        "fases": [
          "encerramento"
        ]
      },
      {
        "numero": 11,
        "papel": "Purificação e Exposição",
        "categoria": "purificacao",
        "resumo": "Purificação junto aos nrs 9, 10 e 12.",
        "responsabilidades": [
          "Purifica âmbulas e recolhe o material da Capela.",
          "Os homens levam as caixas para a Sacristia."
        ],
        "fases": [
          "encerramento"
        ]
      },
      {
        "numero": 12,
        "papel": "Purificação e Exposição",
        "categoria": "purificacao",
        "resumo": "Purificação; fecha o portão da Sacristia.",
        "responsabilidades": [
          "Purifica âmbulas e recolhe o material da Capela.",
          "Responsável por fechar o portão da Sacristia antes de recolher o Santíssimo.",
          "Guardar a chave do Sacrário no armário da Sacristia; conferir o jaleco antes de ir embora."
        ],
        "fases": [
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 13,
        "papel": "Mezanino",
        "categoria": "mezanino",
        "resumo": "Serve a comunhão no mezanino.",
        "responsabilidades": [
          "Sai na hora do 'Cordeiro de Deus' e sobe ao mezanino para distribuir a comunhão.",
          "Ao final, ajuda a levar o material para a Sacristia."
        ],
        "fases": [
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 14,
        "papel": "Mezanino",
        "categoria": "mezanino",
        "resumo": "Serve a comunhão no mezanino junto ao nr 13.",
        "responsabilidades": [
          "Sai na hora do 'Cordeiro de Deus' e sobe ao mezanino.",
          "Ajuda a levar o material para a Sacristia."
        ],
        "fases": [
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 15,
        "papel": "Mezanino",
        "categoria": "mezanino",
        "resumo": "Serve a comunhão no mezanino junto aos nrs 13 e 14.",
        "responsabilidades": [
          "Sai na hora do 'Cordeiro de Deus' e sobe ao mezanino.",
          "Ajuda a levar o material para a Sacristia."
        ],
        "fases": [
          "durante",
          "encerramento"
        ]
      },
      {
        "numero": 16,
        "papel": "Liturgia (missas cheias)",
        "categoria": "extra",
        "resumo": "Nas missas das 10h, a Liturgia entra como 16º ministro.",
        "responsabilidades": [
          "Nas missas das 10h, quem estiver na Liturgia do dia entra como 16º ministro, por causa do aglomerado nos corredores em frente à Capela.",
          "Em missas maiores, os Auxiliares 1 e 2 distribuem demais funções conforme a necessidade."
        ],
        "fases": [
          "durante"
        ]
      }
    ],
    "observacao_geral": "Independente da função, todos ajudam a montar a credência (água nas jarras, taças, ambão, sineta, montagem do cálice). Os auxiliares coordenam para que o trabalho fique leve e não pese sobre um só — somos um grupo."
  },
  "missasEParticulas": {
    "capacidade_igreja": 1200,
    "regra_calculo_particulas": "O número de partículas a consagrar segue a capacidade da igreja (1200 lugares). A missa das 10h costuma ser a mais cheia, por isso consagra-se mais; às 19h conta-se com 1200. Os Auxiliares 1 e 2 confirmam a quantidade do dia.",
    "horarios": {
      "domingo": [
        "08:00",
        "10:00",
        "19:00"
      ],
      "diaria": [
        "06:30 (06:30 às 07:00)"
      ],
      "sao_judas_tadeu_dia_28": {
        "dia_de_semana": [
          "07:00",
          "15:00",
          "19:30"
        ],
        "sabado": [
          "07:00",
          "15:00",
          "19:00"
        ],
        "domingo": [
          "08:00",
          "10:00",
          "15:00",
          "19:00"
        ]
      },
      "cura_e_libertacao": "1ª quinta-feira do mês — 19:30",
      "sagrado_coracao_de_jesus": "1ª sexta-feira do mês — 06:30",
      "sagrado_coracao_de_maria": "1º sábado do mês — 06:30"
    },
    "adoracao_ao_santissimo": "Segundas-feiras, das 22:00 às 23:00 e das 23:00 às 00:00.",
    "antecedencia_chegada": {
      "missa_comum": "1 hora antes",
      "missa_diaria": "45 minutos antes",
      "cura_e_libertacao": "1h30 antes"
    },
    "escala_por_missa": [
      {
        "missa": "Domingo 08:00",
        "ministros": 15,
        "eucaristias": 1200,
        "mapa": "assets/mapa-missa-domingo.png",
        "observacao": "Escala base de 15 ministros."
      },
      {
        "missa": "Domingo 10:00",
        "ministros": 18,
        "eucaristias": 1400,
        "mapa": "assets/mapa-missa-domingo.png",
        "observacao": "Missa mais cheia; a Liturgia entra como 16º ministro."
      },
      {
        "missa": "Domingo 19:00",
        "ministros": 20,
        "eucaristias": 1400,
        "mapa": "assets/mapa-missa-domingo.png",
        "observacao": "Auxiliares distribuem funções adicionais."
      },
      {
        "missa": "Cura e Libertação",
        "ministros": 26,
        "eucaristias": 2500,
        "mapa": "assets/mapa-missa-cura.png",
        "observacao": "Todos saem do altar após a Consagração (e não após o Pai Nosso)."
      }
    ]
  },
  "checklists": {
    "checklists": [
      {
        "id": "apresentacao_uniforme",
        "titulo": "Apresentação e uniforme",
        "descricao": "Conferir antes de sair de casa e na Sacristia. \"Somos vitrines\".",
        "itens": [
          "Jaleco branco (não bege), bem passado e limpo — vestir somente na Sacristia",
          "Calça preta (homens e mulheres; não usar leggins)",
          "Sapato/sandália preta, sem plataforma, salto seguro",
          "Homens: camisa branca e gravata preta",
          "Mulheres: camisa ou camiseta branca lisa (sem desenhos)",
          "Mulheres: cabelos presos (elástico/presilha)",
          "Mãos limpas e higienizadas; atenção a anéis e brincos",
          "Maquiagem leve"
        ]
      },
      {
        "id": "recolher_santissimo",
        "titulo": "Materiais para recolher o Santíssimo",
        "descricao": "Separar antes pelos nrs 03 e 04.",
        "itens": [
          "Âmbula bojuda com o véu",
          "Almofada",
          "Véu para o ostensório",
          "Corporal para a almofada",
          "Mini lavabo",
          "Manustérgio"
        ]
      },
      {
        "id": "preparo_purificacao",
        "titulo": "Preparo da purificação na Capela",
        "descricao": "Preparado pelos nrs 9, 10, 11 e 12 junto aos que recolhem.",
        "itens": [
          "Caixas de madeira com a quantidade de âmbulas definida pelos auxiliares",
          "Corporal (novos e compridos — não precisa colocar sanguíneo por baixo)",
          "Manustérgios",
          "Véu",
          "Sanguíneos",
          "Purificar a tampa do cibório ao abri-lo (pode ser no final, mas não esquecer)",
          "Secar o mini lavabo com o sanguíneo após o uso"
        ]
      },
      {
        "id": "cuidados_materiais",
        "titulo": "Cuidados com os materiais litúrgicos",
        "descricao": "Conservação das alfaias e objetos sagrados.",
        "itens": [
          "Sempre com as mãos limpas",
          "Lavar as mãos após preparar a credência e a Capela (suor e poeira escurecem os manustérgios)",
          "Cuidado com galhetas, cálice, patena e âmbulas",
          "Não usar mais álcool para higienizar âmbulas (deixa ofuscadas/meladas)",
          "Polir as âmbulas a cada dois meses para manter o brilho"
        ]
      },
      {
        "id": "credencia_altar",
        "titulo": "Credência e montagem do altar",
        "descricao": "Todos ajudam; auxiliares coordenam.",
        "itens": [
          "Seguir a sequência de montagem da credência já conhecida",
          "Deixar somente o material que realmente será usado",
          "Não mudar o que o padre e o diácono estão acostumados",
          "Véu nas âmbulas: somente nas missas com o Pe. Flávio",
          "Ser dinâmico; quem não for auxiliar também ajuda",
          "Observar sempre o que o padre está necessitando"
        ]
      }
    ]
  },
  "oracoes": {
    "nota": "A jaculatória recebe esse nome porque parece um jato ('jaculum', em latim, quer dizer 'jato') que lançamos a Deus do fundo do coração. As orações abaixo são rezadas pelos nrs 03 e 04 ao recolher o Santíssimo, com os demais acompanhando durante a procissão à Capela.",
    "oracoes": [
      {
        "id": "jaculatoria_louvores",
        "titulo": "Jaculatória de louvor (3x)",
        "repeticoes": 3,
        "texto": "Graças e louvores sejam dados a todo momento ao Santíssimo e Diviníssimo Sacramento.",
        "complemento": "Glória ao Pai, ao Filho e ao Espírito Santo, como era no princípio, agora e sempre. Amém."
      },
      {
        "id": "oracao_anjo_portugal",
        "titulo": "Oração do Anjo de Portugal (3x)",
        "repeticoes": 3,
        "texto": "Meu Deus, eu creio, adoro, espero e amo-Vos. Peço-Vos perdão por aqueles que não creem, não adoram, não esperam e não Vos amam."
      },
      {
        "id": "oracao_reparacao",
        "titulo": "Oração de reparação (Santíssima Trindade)",
        "repeticoes": 1,
        "texto": "Santíssima Trindade, Pai, Filho e Espírito Santo, adoro-Vos profundamente e ofereço-Vos o preciosíssimo Corpo, Sangue, Alma e Divindade de Jesus Cristo, presente em todos os sacrários da terra, em reparação dos ultrajes, sacrilégios e indiferenças com que Ele mesmo é ofendido. E pelos méritos infinitos do Seu Santíssimo Coração e do Coração Imaculado de Maria, peço-Vos a conversão dos pobres pecadores. Amém."
      },
      {
        "id": "encerramento_capela",
        "titulo": "Encerramento na Capela",
        "repeticoes": 1,
        "texto": "Estivemos e continuaremos reunidos em nome do Pai, do Filho e do Espírito Santo. Amém."
      }
    ],
    "oracao_na_roda": "No momento da roda de orientações, reza-se UMA oração de proteção do servir: uma Ave-Maria, OU um Pai-Nosso, OU um Vinde Espírito Santo. As entregas (padre, assembleia, intenções) são feitas na Capela, enquanto se recolhe Jesus."
  },
  "coresETempos": {
    "cores_liturgicas": [
      {
        "cor": "Branco",
        "hex": "#f6f3ea",
        "simbolismo": "Pureza",
        "uso": "Tempos do Natal e da Páscoa; comemorações de Nosso Senhor (exceto as da Paixão), da Virgem Maria, dos Anjos e dos Santos não-mártires."
      },
      {
        "cor": "Vermelho",
        "hex": "#a1241f",
        "simbolismo": "Fogo da caridade",
        "uso": "Paixão do Senhor, Domingo de Pentecostes, festas dos Apóstolos e Evangelistas, celebrações dos Santos Mártires."
      },
      {
        "cor": "Verde",
        "hex": "#3f7d4e",
        "simbolismo": "Esperança",
        "uso": "Maior parte do ano, no Tempo Comum."
      },
      {
        "cor": "Roxo",
        "hex": "#5b3a72",
        "simbolismo": "Penitência",
        "uso": "Advento, e nos ofícios e missas pelos mortos."
      },
      {
        "cor": "Preto",
        "hex": "#1c1c1c",
        "simbolismo": "Luto",
        "uso": "Pode ser usado nas missas pelos mortos."
      },
      {
        "cor": "Rosa",
        "hex": "#d98aa6",
        "simbolismo": "Alegria",
        "uso": "Pode ser usado no III Domingo do Advento e no IV Domingo da Quaresma."
      }
    ]
  },
  "glossarioLiturgico": {
    "espaco_celebrativo": [
      {
        "termo": "Nave",
        "definicao": "Corpo principal da igreja, onde se reúne a assembleia."
      },
      {
        "termo": "Presbitério",
        "definicao": "Área elevada onde fica o altar e de onde se preside a celebração."
      },
      {
        "termo": "Altar",
        "definicao": "Mesa onde se realiza a Ceia Eucarística; representa o próprio Jesus na Liturgia. É a mesa do sacrifício — por isso fazemos reverência a ele, e não à cruz."
      },
      {
        "termo": "Credência",
        "definicao": "Mesa auxiliar onde ficam dispostos os objetos litúrgicos usados na celebração."
      },
      {
        "termo": "Capela do Santíssimo",
        "definicao": "Local onde o Santíssimo Sacramento é reservado e exposto fora da Missa."
      },
      {
        "termo": "Sacrário / Tabernáculo",
        "definicao": "Guarda a Eucaristia fora da Missa. Símbolo do Santo dos Santos, lugar da presença real de Cristo na Nova Aliança."
      }
    ],
    "vestes": [
      {
        "termo": "Amito",
        "definicao": "Vestido antes da alva, sobre os ombros. Oração: 'Colocai, Senhor, na minha cabeça o elmo da salvação para que possa repelir os golpes de Satanás.'"
      },
      {
        "termo": "Alva (Túnica)",
        "definicao": "Veste longa e branca usada por todos os ministros sagrados; representa a nova veste imaculada recebida no Batismo e a pureza de coração."
      },
      {
        "termo": "Sobrepeliz",
        "definicao": "Pode ser usada no lugar da túnica quando o ministro está de batina; não dispensa a estola e não substitui a alva quando se usa casula (Cerimonial dos Bispos, n.65)."
      },
      {
        "termo": "Cíngulo",
        "definicao": "Cordão usado como cinto sobre a alva, na cintura. Simboliza o autocontrole (fruto do Espírito). Acompanha sempre quem porta a alva."
      },
      {
        "termo": "Estola Sacerdotal",
        "definicao": "Elemento distintivo do ministro ordenado; faixa de tecido cuja cor segue o tempo litúrgico. Usada sempre na celebração dos sacramentos."
      },
      {
        "termo": "Estola Diaconal / Dalmática",
        "definicao": "Estola usada pelo diácono (atravessada) e a dalmática, veste própria do diácono."
      },
      {
        "termo": "Casula",
        "definicao": "Veste externa do sacerdote na Missa. Formas: Gregoriana, Gótica e Romana."
      },
      {
        "termo": "Véu Umeral",
        "definicao": "Usado pelo sacerdote ou diácono ao portar o Santíssimo Sacramento; protege a realidade sagrada, expressando que não se toca diretamente com as mãos."
      },
      {
        "termo": "Pluvial (Capa de Asperges)",
        "definicao": "Capa usada em procissões, bênçãos e aspersões."
      },
      {
        "termo": "Vestes Episcopais",
        "definicao": "Próprias do bispo: solidéu, mitra, báculo e cruz peitoral. Batinas: sacerdotal, episcopal, cardealícia e papal."
      }
    ],
    "objetos": [
      {
        "termo": "Cálice",
        "definicao": "Taça onde se coloca o vinho que vai ser consagrado."
      },
      {
        "termo": "Patena",
        "definicao": "Prato onde são colocadas as hóstias para a consagração."
      },
      {
        "termo": "Hóstia",
        "definicao": "Pão eucarístico. A palavra significa 'vítima que será sacrificada'."
      },
      {
        "termo": "Corporal",
        "definicao": "Pano quadrangular de linho com uma cruz no centro; sobre ele se coloca o cálice, a patena e a âmbula para a consagração."
      },
      {
        "termo": "Sanguíneo (Purificatório)",
        "definicao": "Pequeno pano usado pelo celebrante para enxugar a boca, os dedos e o interior do cálice após a consagração."
      },
      {
        "termo": "Pala",
        "definicao": "Cobertura quadrangular para o cálice."
      },
      {
        "termo": "Alfaias",
        "definicao": "Designam todos os objetos usados no culto, como os paramentos litúrgicos (corporal, sanguíneo, pala)."
      },
      {
        "termo": "Âmbula (Cibório)",
        "definicao": "Vaso sagrado que guarda as hóstias consagradas para a distribuição e a reserva eucarística."
      },
      {
        "termo": "Véu do Cibório",
        "definicao": "Véu que cobre o cibório/âmbula contendo o Santíssimo."
      },
      {
        "termo": "Galhetas",
        "definicao": "Recipientes onde se coloca a água e o vinho usados na Celebração Eucarística."
      },
      {
        "termo": "Lavabo (Jarra e Bacia)",
        "definicao": "Conjunto para o lava-mãos do celebrante durante o ofertório."
      },
      {
        "termo": "Manustérgio",
        "definicao": "Toalha usada para purificar/secar as mãos antes, durante e depois do ato litúrgico."
      },
      {
        "termo": "Sineta (Carrilhão)",
        "definicao": "Sininhos tocados pelo acólito no momento da consagração."
      },
      {
        "termo": "Turíbulo",
        "definicao": "Incensário. Usado na procissão de entrada, ao incensar o altar, na proclamação do Evangelho, no ofertório, à elevação após a consagração e na exposição do Santíssimo (incensado de joelhos)."
      },
      {
        "termo": "Naveta",
        "definicao": "Objeto usado para guardar o incenso antes de queimá-lo no turíbulo."
      },
      {
        "termo": "Caldeirinha e Aspersório",
        "definicao": "Recipiente da água benta e o instrumento usado para asperjir."
      },
      {
        "termo": "Cruz Processional / Crucifixo do Altar",
        "definicao": "Cruz conduzida na procissão e o crucifixo disposto junto ao altar."
      },
      {
        "termo": "Castiçal e Vela",
        "definicao": "Suporte e vela que iluminam o altar; sinal de Cristo, luz do mundo."
      },
      {
        "termo": "Missal Romano",
        "definicao": "Livro com as orações e textos da celebração da Missa."
      },
      {
        "termo": "Lecionário",
        "definicao": "Livro com as leituras bíblicas proclamadas na Liturgia da Palavra."
      },
      {
        "termo": "Ostensório",
        "definicao": "Peça onde o Santíssimo é exposto para a adoração. Composto pela luneta, o ostensório e o trono do ostensório."
      },
      {
        "termo": "Luneta",
        "definicao": "Suporte que segura a Hóstia consagrada no centro do ostensório."
      }
    ],
    "montagem_calice": [
      "1. Cálice.",
      "2. Colocar o sanguíneo sobre o cálice, fazendo leve pressão ao centro.",
      "3. Colocar a patena sobre o cálice e o sanguíneo.",
      "4. Colocar a hóstia que vai ser consagrada sobre a patena.",
      "5. Colocar a pala.",
      "6. Colocar o corporal.",
      "7. Colocar o véu do cálice."
    ]
  }
} as const;

type LessonSectionSeed = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  estimatedMinutes: number;
};

type LessonSeed = {
  id: string;
  title: string;
  description: string;
  lessonNumber: number;
  durationMinutes: number;
  objectives: string[];
  orderIndex: number;
  sections: LessonSectionSeed[];
};

type ModuleSeed = {
  id: string;
  manifestId: string;
  title: string;
  description: string;
  content: string;
  durationMinutes: number;
  orderIndex: number;
  lessons: LessonSeed[];
};

function deterministicUuid(seed: string): string {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

function splitMarkdownBySecondLevelHeadings(markdown: string): string[] {
  const withoutFrontMatter = stripFrontMatter(markdown);
  const headingMatches = [...withoutFrontMatter.matchAll(/^## .+$/gm)];

  if (headingMatches.length === 0) {
    return [withoutFrontMatter];
  }

  return headingMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < headingMatches.length
      ? headingMatches[index + 1].index ?? withoutFrontMatter.length
      : withoutFrontMatter.length;

    return withoutFrontMatter.slice(start, end).trim();
  });
}

function estimateMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(10, Math.max(3, Math.ceil(words / 95)));
}

function lessonObjectives(title: string): string[] {
  return [
    `Compreender: ${title}.`,
    'Aplicar as orientações no serviço do Santuário São Judas Tadeu.',
  ];
}

function checklistById(id: string) {
  const checklist = formationData.checklists.checklists.find((item) => item.id === id);
  if (!checklist) {
    throw new Error(`Checklist not found: ${id}`);
  }
  return checklist;
}

function renderChecklist(id: string): { title: string; content: string; estimatedMinutes: number } {
  const checklist = checklistById(id);
  return {
    title: checklist.titulo,
    content: [
      `**${checklist.titulo}**`,
      '',
      checklist.descricao,
      '',
      ...checklist.itens.map((item) => `- ${item}`),
    ].join('\n'),
    estimatedMinutes: Math.min(8, Math.max(3, Math.ceil(checklist.itens.length / 2))),
  };
}

function renderFuncoesEscala(): { title: string; content: string; estimatedMinutes: number } {
  const rows = formationData.funcoesEscala.funcoes.map((funcao) => [
    `### Nº ${funcao.numero} — ${funcao.papel}`,
    '',
    `**Resumo:** ${funcao.resumo}`,
    `**Fases:** ${funcao.fases.map((fase) => formationData.funcoesEscala.fase_legenda[fase as keyof typeof formationData.funcoesEscala.fase_legenda]).join(', ')}`,
    '',
    ...funcao.responsabilidades.map((responsabilidade) => `- ${responsabilidade}`),
  ].join('\n')).join('\n\n');

  return {
    title: 'Funções 1-16 da escala',
    content: [
      formationData.funcoesEscala.descricao,
      '',
      rows,
      '',
      `> ${formationData.funcoesEscala.observacao_geral}`,
    ].join('\n'),
    estimatedMinutes: 10,
  };
}

function renderHorariosMissas(): { title: string; content: string; estimatedMinutes: number } {
  const horarios = formationData.missasEParticulas.horarios;
  return {
    title: 'Horários e antecedência de chegada',
    content: [
      '| Situação | Horários / orientação |',
      '|---|---|',
      `| Domingo | ${horarios.domingo.join(', ')} |`,
      `| Missa diária | ${horarios.diaria.join(', ')} |`,
      `| São Judas Tadeu - dia de semana | ${horarios.sao_judas_tadeu_dia_28.dia_de_semana.join(', ')} |`,
      `| São Judas Tadeu - sábado | ${horarios.sao_judas_tadeu_dia_28.sabado.join(', ')} |`,
      `| São Judas Tadeu - domingo | ${horarios.sao_judas_tadeu_dia_28.domingo.join(', ')} |`,
      `| Cura e Libertação | ${horarios.cura_e_libertacao} |`,
      `| Sagrado Coração de Jesus | ${horarios.sagrado_coracao_de_jesus} |`,
      `| Sagrado Coração de Maria | ${horarios.sagrado_coracao_de_maria} |`,
      '',
      '| Chegada | Antecedência |',
      '|---|---|',
      `| Missa comum | ${formationData.missasEParticulas.antecedencia_chegada.missa_comum} |`,
      `| Missa diária | ${formationData.missasEParticulas.antecedencia_chegada.missa_diaria} |`,
      `| Cura e Libertação | ${formationData.missasEParticulas.antecedencia_chegada.cura_e_libertacao} |`,
      '',
      `**Adoração ao Santíssimo:** ${formationData.missasEParticulas.adoracao_ao_santissimo}`,
    ].join('\n'),
    estimatedMinutes: 6,
  };
}

function renderMissasEParticulas(): { title: string; content: string; estimatedMinutes: number } {
  const rows = formationData.missasEParticulas.escala_por_missa.map((item) =>
    `| ${item.missa} | ${item.ministros} | ${item.eucaristias} | ${item.observacao} |`
  );

  return {
    title: 'Escala por missa e cálculo de partículas',
    content: [
      '| Missa | Ministros | Eucaristias | Observação |',
      '|---|---:|---:|---|',
      ...rows,
      '',
      `**Capacidade da igreja:** ${formationData.missasEParticulas.capacidade_igreja} lugares.`,
      '',
      `**Regra de cálculo:** ${formationData.missasEParticulas.regra_calculo_particulas}`,
    ].join('\n'),
    estimatedMinutes: 7,
  };
}

function renderOracoes(): { title: string; content: string; estimatedMinutes: number } {
  const prayers = formationData.oracoes.oracoes.map((oracao) => [
    `### ${oracao.titulo}`,
    '',
    `**Repetições:** ${oracao.repeticoes}`,
    '',
    oracao.texto,
    'complemento' in oracao ? `\n${oracao.complemento}` : '',
  ].filter(Boolean).join('\n'));

  return {
    title: 'Orações da Capela',
    content: [
      formationData.oracoes.nota,
      '',
      ...prayers,
      '',
      `**Oração na roda:** ${formationData.oracoes.oracao_na_roda}`,
    ].join('\n\n'),
    estimatedMinutes: 8,
  };
}

function renderCoresLiturgicas(): { title: string; content: string; estimatedMinutes: number } {
  return {
    title: 'Tabela de cores litúrgicas',
    content: [
      '| Cor | Simbolismo | Uso |',
      '|---|---|---|',
      ...formationData.coresETempos.cores_liturgicas.map((cor) => `| ${cor.cor} | ${cor.simbolismo} | ${cor.uso} |`),
    ].join('\n'),
    estimatedMinutes: 6,
  };
}

function renderGlossary(category: 'espaco_celebrativo' | 'vestes' | 'objetos', title: string): { title: string; content: string; estimatedMinutes: number } {
  return {
    title,
    content: formationData.glossarioLiturgico[category]
      .map((item) => `- **${item.termo}:** ${item.definicao}`)
      .join('\n'),
    estimatedMinutes: category === 'objetos' ? 10 : 7,
  };
}

function renderMontagemCalice(): { title: string; content: string; estimatedMinutes: number } {
  return {
    title: 'Passo a passo da montagem do cálice',
    content: formationData.glossarioLiturgico.montagem_calice.join('\n'),
    estimatedMinutes: 4,
  };
}

const extraSectionsByModuleAndLesson: Record<string, Record<string, Array<{ title: string; content: string; estimatedMinutes: number }>>> = {
  '03-servico': {
    'Horários e chegada': [renderHorariosMissas()],
    'Funções da escala': [renderFuncoesEscala()],
    'Ministros e partículas': [renderMissasEParticulas()],
    'Credência e altar': [renderChecklist('credencia_altar')],
    'Mapas de posição': [{
      title: 'Mapas disponíveis no material da formação',
      content: 'Há mapas de posição no material original para **Missa de Domingo** e **Cura e Libertação**. Eles servem como referência de distribuição e saída, mas a posição final é definida pela coordenação em cada escala.',
      estimatedMinutes: 3,
    }],
  },
  '04-santissimo': {
    'Materiais para recolher': [renderChecklist('recolher_santissimo')],
    'Orações e jaculatórias': [renderOracoes()],
    'Purificação': [renderChecklist('preparo_purificacao'), renderChecklist('cuidados_materiais')],
  },
  '05-referencia': {
    'Cores litúrgicas': [renderCoresLiturgicas()],
    'Espaço celebrativo': [renderGlossary('espaco_celebrativo', 'Glossário do espaço celebrativo')],
    'Vestes litúrgicas': [renderGlossary('vestes', 'Glossário das vestes litúrgicas')],
    'Objetos litúrgicos': [renderGlossary('objetos', 'Glossário dos objetos litúrgicos')],
    'Montagem do cálice': [renderMontagemCalice()],
  },
};

function buildModules(): ModuleSeed[] {
  return manifest.modulos.map((module, moduleIndex) => {
    const markdown = moduleMarkdown[module.id];
    const markdownSections = splitMarkdownBySecondLevelHeadings(markdown);

    const lessons = module.secoes.map((sectionTitle, lessonIndex) => {
      const baseContent = markdownSections[lessonIndex] ?? sectionTitle;
      const baseSection: LessonSectionSeed = {
        id: deterministicUuid(`formation-section:${module.id}:${lessonIndex}:0`),
        title: sectionTitle,
        content: baseContent,
        orderIndex: 0,
        estimatedMinutes: estimateMinutes(baseContent),
      };

      const extras = extraSectionsByModuleAndLesson[module.id]?.[sectionTitle] ?? [];
      const sections = [
        baseSection,
        ...extras.map((extra, extraIndex) => ({
          id: deterministicUuid(`formation-section:${module.id}:${lessonIndex}:${extraIndex + 1}`),
          title: extra.title,
          content: extra.content,
          orderIndex: extraIndex + 1,
          estimatedMinutes: extra.estimatedMinutes,
        })),
      ];

      return {
        id: deterministicUuid(`formation-lesson:${module.id}:${lessonIndex}`),
        title: sectionTitle,
        description: `Conteúdo do módulo "${module.titulo}": ${sectionTitle}.`,
        lessonNumber: lessonIndex + 1,
        durationMinutes: sections.reduce((total, section) => total + section.estimatedMinutes, 0),
        objectives: lessonObjectives(sectionTitle),
        orderIndex: lessonIndex,
        sections,
      };
    });

    return {
      id: deterministicUuid(`formation-module:${module.id}`),
      manifestId: module.id,
      title: module.titulo,
      description: module.resumo,
      content: markdown,
      durationMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
      orderIndex: moduleIndex,
      lessons,
    };
  });
}

const modules = buildModules();
const sectionCount = modules.reduce(
  (moduleTotal, module) => moduleTotal + module.lessons.reduce((lessonTotal, lesson) => lessonTotal + lesson.sections.length, 0),
  0,
);

export async function seedFormation() {
  console.log('Starting real MESC formation seed...');

  try {
    const now = new Date();
    const track = {
      id: TRACK_ID,
      title: manifest.titulo,
      description: manifest.descricao,
      category: 'liturgia' as const,
      icon: 'Cross',
      orderIndex: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const existingTrack = await db
      .select({ id: formationTracks.id })
      .from(formationTracks)
      .where(eq(formationTracks.id, TRACK_ID))
      .limit(1);

    if (existingTrack.length === 0) {
      await db.insert(formationTracks).values(track).onConflictDoNothing();
      console.log(`Created track: ${track.title}`);
    } else {
      console.log(`Track already exists: ${track.title}`);
    }

    for (const module of modules) {
      await db.insert(formationModules).values({
        id: module.id,
        trackId: TRACK_ID,
        title: module.title,
        description: module.description,
        category: 'liturgia' as const,
        content: module.content,
        videoUrl: null,
        durationMinutes: module.durationMinutes,
        orderIndex: module.orderIndex,
        createdAt: now,
      }).onConflictDoNothing();

      for (const lesson of module.lessons) {
        await db.insert(formationLessons).values({
          id: lesson.id,
          moduleId: module.id,
          trackId: TRACK_ID,
          title: lesson.title,
          description: lesson.description,
          lessonNumber: lesson.lessonNumber,
          durationMinutes: lesson.durationMinutes,
          objectives: lesson.objectives,
          isActive: true,
          orderIndex: lesson.orderIndex,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing();

        await db.insert(formationLessonSections).values(lesson.sections.map((section) => ({
          id: section.id,
          lessonId: lesson.id,
          type: 'text' as const,
          title: section.title,
          content: section.content,
          imageUrl: null,
          quizData: null,
          orderIndex: section.orderIndex,
          isRequired: true,
          estimatedMinutes: section.estimatedMinutes,
          createdAt: now,
          updatedAt: now,
        }))).onConflictDoNothing();
      }
    }

    console.log('Formation seed completed successfully.');
    console.log(`Stats: 1 track, ${modules.length} modules, ${modules.reduce((total, module) => total + module.lessons.length, 0)} lessons, ${sectionCount} sections.`);

    return {
      success: true,
      message: `Real MESC formation content seeded successfully (1 track, ${modules.length} modules, ${modules.reduce((total, module) => total + module.lessons.length, 0)} lessons, ${sectionCount} sections)`,
      stats: {
        tracks: 1,
        modules: modules.length,
        lessons: modules.reduce((total, module) => total + module.lessons.length, 0),
      },
    };
  } catch (error) {
    console.error('Error seeding formation:', error);
    throw error;
  }
}

export default seedFormation;
