/**
 * Script para popular o banco de dados com conteúdo de formação litúrgica
 *
 * Baseado em:
 * - Catecismo da Igreja Católica (CIC)
 * - Material de formação para Ministros Extraordinários da Comunhão Eucarística
 * - Documentos litúrgicos da Igreja
 *
 * Estrutura:
 * - Trilha: Liturgia
 * - Módulos: Fundamentos, Eucaristia, Prática Litúrgica, Espiritualidade
 * - Lições: Subdivisões de cada módulo
 * - Seções: Conteúdo detalhado de cada lição
 */

import { db } from '../server/db';
import {
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections
} from '../shared/schema';

async function populateFormationContent() {
  console.log('🚀 Iniciando população de conteúdo de formação...\n');

  try {
    // ========================================
    // TRILHA DE LITURGIA
    // ========================================
    console.log('📚 Criando Trilha de Liturgia...');

    await db.insert(formationTracks).values({
      id: 'liturgy',
      title: 'Formação Litúrgica',
      description: 'Formação completa sobre liturgia, Eucaristia e o ministério extraordinário da Comunhão',
      category: 'liturgia',
      icon: 'Church',
      orderIndex: 1,
      isActive: true
    }).onConflictDoNothing();

    // ========================================
    // MÓDULO 1: FUNDAMENTOS DA LITURGIA
    // ========================================
    console.log('\n📖 Módulo 1: Fundamentos da Liturgia...');

    const [module1] = await db.insert(formationModules).values({
      trackId: 'liturgy',
      title: 'Fundamentos da Liturgia',
      description: 'Compreendendo o significado e a importância da liturgia na vida da Igreja',
      category: 'liturgia',
      content: 'Introdução aos fundamentos teológicos e práticos da liturgia católica, baseados no Catecismo da Igreja Católica (CIC §1066-1209)',
      durationMinutes: 120,
      orderIndex: 1
    }).returning();

    // Lição 1.1: O que é Liturgia?
    const [lesson1_1] = await db.insert(formationLessons).values({
      moduleId: module1.id,
      trackId: 'liturgy',
      title: 'O que é Liturgia?',
      description: 'Definição e significado da liturgia na vida cristã',
      lessonNumber: 1,
      durationMinutes: 30,
      objectives: [
        'Compreender o significado da palavra "liturgia"',
        'Entender a liturgia como obra da Santíssima Trindade',
        'Reconhecer a liturgia como centro da vida da Igreja'
      ],
      isActive: true,
      orderIndex: 1
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson1_1.id,
        type: 'text',
        title: 'Definição de Liturgia',
        content: `# O que significa "Liturgia"?

**Segundo o Catecismo da Igreja Católica (CIC §1069):**

A palavra "Liturgia" significa originalmente "obra pública", "serviço da parte do povo e em favor do povo". Na tradição cristã, quer significar que o povo de Deus participa na "obra de Deus".

Por meio da Liturgia, Cristo, nosso Redentor e Sumo Sacerdote, continua na sua Igreja, com ela e por ela, a obra da nossa redenção.

## A Liturgia como Obra da Santíssima Trindade

**CIC §1077-1083:**

- **Pai**: Fonte e fim da liturgia
- **Filho**: Cristo age na liturgia
- **Espírito Santo**: Prepara para acolher Cristo e atualiza o mistério de Cristo

A liturgia é a participação no ofício sacerdotal de Jesus Cristo. Nela, através de sinais sensíveis, é significada e, de modo peculiar a cada um, realizada a santificação do homem. (Sacrosanctum Concilium, n. 7)`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 15
      },
      {
        lessonId: lesson1_1.id,
        type: 'text',
        title: 'A Liturgia na Vida da Igreja',
        content: `# A Liturgia: Centro da Vida da Igreja

**CIC §1074:**

"A Liturgia é o cume para o qual se dirige a ação da Igreja e, ao mesmo tempo, a fonte de onde emana toda a sua força" (Sacrosanctum Concilium, n. 10).

## Por que a Liturgia é tão importante?

1. **Fonte de Graças**: É o meio privilegiado pelo qual Cristo comunica sua graça aos fiéis
2. **Louvor a Deus**: Dá glória a Deus de maneira perfeita
3. **Santificação dos Homens**: Santifica o povo de Deus
4. **Unidade**: Une a Igreja terrestre com a liturgia celeste

## A Liturgia e a Vida Cristã

A liturgia não é algo separado da vida, mas deve transformar nossa vida quotidiana. O que celebramos deve ser vivido no dia a dia.

**"Tomai e comei... Tomai e bebei..."** - A Eucaristia nos leva a viver o que celebramos: doar-nos pelos outros, como Cristo se doou por nós.`,
        orderIndex: 2,
        isRequired: true,
        estimatedMinutes: 15
      }
    ]);

    // Lição 1.2: História da Liturgia
    const [lesson1_2] = await db.insert(formationLessons).values({
      moduleId: module1.id,
      trackId: 'liturgy',
      title: 'História e Desenvolvimento da Liturgia',
      description: 'Das origens apostólicas até hoje',
      lessonNumber: 2,
      durationMinutes: 40,
      objectives: [
        'Conhecer as origens da liturgia cristã',
        'Compreender como a liturgia se desenvolveu ao longo dos séculos',
        'Valorizar a tradição litúrgica da Igreja'
      ],
      isActive: true,
      orderIndex: 2
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson1_2.id,
        type: 'text',
        title: 'Das Origens Apostólicas à Liturgia Atual',
        content: `# A Liturgia ao Longo da História

## 1. Período Apostólico (Século I)

Jesus instituiu a Eucaristia na Última Ceia:
> "Fazei isto em memória de Mim" (Lc 22,19)

Os primeiros cristãos reuniam-se para a "fração do pão" (At 2,42):
- Reuniões nas casas
- Leitura das Escrituras
- Orações
- Partilha do pão eucarístico

## 2. Primeiros Séculos (II-IV)

**Desenvolvimento da estrutura da Missa:**
- Liturgia da Palavra (leituras, salmos, homilia)
- Liturgia Eucarística (ofertório, consagração, comunhão)

**Catacumbas e perseguições:**
- Celebrações discretas
- Forte senso de comunidade
- Martírio e testemunho

## 3. Idade Média

- Desenvolvimento do calendário litúrgico
- Elaboração dos ritos
- Maior solenidade nas celebrações
- Uso do latim como língua universal

## 4. Concílio de Trento (Século XVI)

- Padronização da liturgia
- Missão Romano (Rito Tridentino)
- Ênfase na reverência e sacralidade

## 5. Concílio Vaticano II (1962-1965)

**Sacrosanctum Concilium** - Constituição sobre a Sagrada Liturgia:

Principais mudanças:
- Participação ativa dos fiéis
- Uso da língua vernácula (português)
- Simplificação de alguns ritos
- Ênfase na Palavra de Deus
- Valorização do canto e da música litúrgica

## Hoje

A liturgia continua sendo "fonte e cume" da vida da Igreja, mantendo sua essência apostólica enquanto se adapta às necessidades pastorais de cada época e cultura.`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 25
      },
      {
        lessonId: lesson1_2.id,
        type: 'video',
        title: 'Recursos Complementares',
        content: `# Aprofundamento

Para aprofundar seu conhecimento sobre a história da liturgia, recomendamos:

**Leituras:**
- Catecismo da Igreja Católica, §1066-1075
- Constituição Sacrosanctum Concilium (Vaticano II)

**Vídeos e Cursos:**
- Padre Paulo Ricardo: "Os Sete Sacramentos"
- Canção Nova: "História da Liturgia"

**Documentos da Igreja:**
- Instrução Geral do Missal Romano
- Documentos do Concílio Vaticano II

> "A Liturgia é considerada como o exercício da função sacerdotal de Jesus Cristo, na qual, mediante sinais sensíveis, é significada e, de modo peculiar a cada um, realizada a santificação do homem; e é exercido o culto público integral pelo Corpo Místico de Jesus Cristo, Cabeça e membros." (SC 7)`,
        videoUrl: 'https://padrepauloricardo.org/cursos/os-sete-sacramentos',
        orderIndex: 2,
        isRequired: false,
        estimatedMinutes: 15
      }
    ]);

    // ========================================
    // MÓDULO 2: A EUCARISTIA - FONTE E CUME
    // ========================================
    console.log('\n🍞 Módulo 2: A Eucaristia...');

    const [module2] = await db.insert(formationModules).values({
      trackId: 'liturgy',
      title: 'A Eucaristia - Fonte e Cume',
      description: 'O Sacramento da Eucaristia: Presença Real de Cristo',
      category: 'liturgia',
      content: 'Estudo aprofundado sobre a Eucaristia baseado no Catecismo da Igreja Católica (CIC §1322-1419)',
      durationMinutes: 180,
      orderIndex: 2
    }).returning();

    // Lição 2.1: O que é a Eucaristia?
    const [lesson2_1] = await db.insert(formationLessons).values({
      moduleId: module2.id,
      trackId: 'liturgy',
      title: 'O Sacramento da Eucaristia',
      description: 'Fundamentos teológicos e bíblicos da Eucaristia',
      lessonNumber: 1,
      durationMinutes: 45,
      objectives: [
        'Compreender a Eucaristia como Sacramento',
        'Conhecer os fundamentos bíblicos da Eucaristia',
        'Entender a Presença Real de Cristo'
      ],
      isActive: true,
      orderIndex: 1
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson2_1.id,
        type: 'text',
        title: 'A Instituição da Eucaristia',
        content: `# A Eucaristia: Dom de Cristo à Sua Igreja

## A Última Ceia

**CIC §1323:**

"Nosso Salvador, na Última Ceia, na noite em que foi entregue, instituiu o sacrifício eucarístico do seu Corpo e do seu Sangue para perpetuar pelo decorrer dos séculos, até voltar, o sacrifício da cruz, confiando à Igreja, sua esposa amada, o memorial da sua morte e ressurreição."

## Relatos Bíblicos

**Mateus 26,26-28:**
> "Enquanto comiam, Jesus tomou o pão, benzeu-o, partiu-o e o deu aos discípulos, dizendo: 'Tomai e comei, isto é o meu corpo.' A seguir, tomou o cálice, agradeceu e lho deu, dizendo: 'Bebei dele todos, pois isto é o meu sangue, o sangue da Aliança, que é derramado por muitos, para remissão dos pecados.'"

**Lucas 22,19-20:**
> "Isto é o meu corpo, que é dado por vós; fazei isto em memória de mim... Este cálice é a nova aliança no meu sangue, que é derramado por vós."

**João 6,51:**
> "Eu sou o pão vivo descido do céu. Quem comer deste pão viverá eternamente; e o pão que eu darei é a minha carne para a vida do mundo."

## Os Nomes da Eucaristia (CIC §1328-1332)

1. **Eucaristia** - Ação de graças a Deus
2. **Ceia do Senhor** - Referência à Última Ceia
3. **Fração do Pão** - Costume judaico que Jesus usou
4. **Assembleia Eucarística** - Celebração comunitária
5. **Memorial** - Da Paixão e Ressurreição
6. **Santo Sacrifício** - Sacrifício de Cristo
7. **Santa Missa** - Do latim "missio" (missão)
8. **Comunhão** - União com Cristo e com os irmãos
9. **Santa e Divina Liturgia** - Nome oriental
10. **Pão dos Anjos, Pão do Céu** - Alimento celestial`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 20
      },
      {
        lessonId: lesson2_1.id,
        type: 'text',
        title: 'A Presença Real de Cristo',
        content: `# Cristo Verdadeiramente Presente

## A Transubstanciação

**CIC §1376:**

"O Concílio de Trento resume a fé católica ao declarar: 'Pelo fato de Cristo, nosso Redentor, ter dito que aquilo que oferecia sob a espécie de pão era verdadeiramente o seu Corpo, sempre se teve na Igreja de Deus esta convicção, que o santo Concílio declara novamente: pela consagração do pão e do vinho opera-se a conversão de toda a substância do pão na substância do Corpo de Cristo Nosso Senhor, e de toda a substância do vinho na substância do seu Sangue. Esta conversão, de maneira conveniente e apropriada, é chamada pela santa Igreja Católica de transubstanciação.'"

## Cristo Totalmente Presente

**CIC §1377:**

"A presença eucarística de Cristo começa no momento da consagração e dura enquanto subsistirem as espécies eucarísticas. Cristo está todo e inteiro presente em cada uma das espécies e todo inteiro em cada uma de suas partes, de modo que a fração do pão não divide Cristo."

### Isso significa:

- Cristo está presente **corpo, sangue, alma e divindade**
- Está presente **totalmente** no pão consagrado
- Está presente **totalmente** no vinho consagrado
- Cada fragmento consagrado contém **Cristo inteiro**

## Adoração à Eucaristia

**CIC §1378:**

"O culto da Eucaristia. Na liturgia da Missa, exprimimos a nossa fé na presença real de Cristo sob as espécies de pão e de vinho, entre outras maneiras, ajoelhando-nos ou inclinando-nos profundamente em sinal de adoração ao Senhor."

**CIC §1418:**

"Por Cristo estar presente no Sacramento do Altar, é preciso honrá-lo com um culto de adoração."

## Nossa Atitude

Diante da Eucaristia, devemos ter:
- **Fé** na Presença Real
- **Adoração** ao Senhor presente
- **Reverência** ao manusear as espécies consagradas
- **Amor** em resposta ao amor de Cristo
- **Gratidão** por tão grande dom`,
        orderIndex: 2,
        isRequired: true,
        estimatedMinutes: 25
      }
    ]);

    // Lição 2.2: A Celebração Eucarística
    const [lesson2_2] = await db.insert(formationLessons).values({
      moduleId: module2.id,
      trackId: 'liturgy',
      title: 'A Celebração da Missa',
      description: 'Estrutura e significado da Celebração Eucarística',
      lessonNumber: 2,
      durationMinutes: 50,
      objectives: [
        'Conhecer a estrutura da Missa',
        'Compreender o significado de cada parte',
        'Participar ativamente da celebração'
      ],
      isActive: true,
      orderIndex: 2
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson2_2.id,
        type: 'text',
        title: 'As Duas Grandes Partes da Missa',
        content: `# Estrutura da Celebração Eucarística

**CIC §1346:**

"A Liturgia da Eucaristia desenvolve-se em conformidade com uma estrutura fundamental que se conservou através dos séculos até aos nossos dias. Desdobra-se em dois grandes momentos, que formam uma unidade fundamental:

- A convocação, a Liturgia da Palavra, com as leituras, a homilia e a oração universal;
- A Liturgia Eucarística, com a apresentação do pão e do vinho, a ação de graças consecratória e a comunhão."

## I. RITOS INICIAIS

### 1. Entrada e Saudação
- Procissão de entrada
- Sinal da Cruz
- Saudação do celebrante

### 2. Ato Penitencial
- Reconhecimento de nossa condição de pecadores
- Súplica da misericórdia divina

### 3. Glória
- Hino de louvor (domingos e solenidades)

### 4. Oração do Dia (Coleta)
- Oração própria da celebração

## II. LITURGIA DA PALAVRA

**CIC §1349:**

"A Liturgia da Palavra compreende 'os escritos dos profetas', isto é, o Antigo Testamento, e 'as memórias dos apóstolos', isto é, as suas Cartas e os Evangelhos. Depois da homilia, que exorta a acolher esta palavra como é realmente, como Palavra de Deus (1 Ts 2, 13), e a pô-la em prática, vêm as intercessões por todos os homens, segundo a palavra do Apóstolo: 'Antes de mais, recomendo insistentemente que se façam pedidos, orações, súplicas e ações de graças por todos os homens, pelos reis e por todos os que ocupam cargos elevados' (1 Tim 2, 1-2)."

### Primeira Leitura
- Geralmente do Antigo Testamento

### Salmo Responsorial
- Resposta orante à Primeira Leitura

### Segunda Leitura
- Das Cartas Apostólicas

### Aclamação ao Evangelho
- Aleluia (ou outra aclamação)

### Evangelho
- Ponto alto da Liturgia da Palavra
- Palavras e ações de Jesus

### Homilia
- Explicação das leituras
- Aplicação à vida

### Profissão de Fé (Credo)
- Resposta à Palavra proclamada

### Oração dos Fiéis
- Preces pela Igreja e pelo mundo`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 25
      },
      {
        lessonId: lesson2_2.id,
        type: 'text',
        title: 'Liturgia Eucarística',
        content: `# O Coração da Celebração

## III. LITURGIA EUCARÍSTICA

### 1. Preparação dos Dons (Ofertório)

**CIC §1350:**

"A apresentação dos dons (do ofertório): traz-se então ao altar, por vezes em procissão, o pão e o vinho, que serão oferecidos pelo sacerdote em nome de Cristo no sacrifício eucarístico, no qual se tornarão o seu Corpo e o seu Sangue. É o próprio gesto de Cristo na última ceia, 'tomando pão e o cálice'. 'Só a Igreja oferece esta oblação pura ao Criador, oferecendo-lhe, com ação de graças, o que provém da sua criação' (Sto. Ireneu, Adv. haer. 4, 18, 4). A apresentação dos dons no altar assume o gesto de Melquisedec e põe os dons do Criador nas mãos de Cristo. É Ele que, no seu sacrifício, leva à perfeição todas as tentativas humanas de oferecer sacrifícios."

- Preparação do altar
- Procissão das oferendas
- Apresentação do pão e do vinho
- Oração sobre as oferendas

### 2. Oração Eucarística (Anáfora)

**É o momento central e culminante de toda a celebração.**

**CIC §1352:**

"A anáfora: com a Oração Eucarística, oração de ação de graças e de consagração, chegamos ao coração e ao cume da celebração."

#### Partes da Oração Eucarística:

**a) Prefácio**
- Ação de graças a Deus Pai

**b) Epiclese**
- Invocação do Espírito Santo sobre os dons

**c) Narrativa da Instituição e Consagração**
- **Palavras de Cristo na Última Ceia**
- **Transubstanciação do pão e do vinho**
- **"ISTO É O MEU CORPO... ISTO É O MEU SANGUE"**

**d) Anamnese**
- Memorial da Paixão, Morte e Ressurreição

**e) Oblação**
- Oferecimento do sacrifício ao Pai

**f) Intercessões**
- Pelos vivos e pelos mortos

**g) Doxologia Final**
- "Por Cristo, com Cristo, em Cristo..."

### 3. Rito da Comunhão

**Pai Nosso**
- Oração que Jesus nos ensinou

**Abraço da Paz**
- Sinal de comunhão fraterna

**Fração do Pão**
- Partir o pão, como Cristo fez

**Comunhão**
- **"O Corpo de Cristo" - "Amém"**
- Recebimento do Corpo e Sangue de Cristo

**Ação de Graças**
- Momento de oração pessoal

## IV. RITOS FINAIS

- Avisos (se necessário)
- Bênção final
- Despedida e envio

**CIC §1355:**

"Na Comunhão, precedida pela oração do Senhor e pela fração do pão, os fiéis recebem 'o pão do céu' e 'o cálice da salvação', o Corpo e o Sangue de Cristo, que se entregou 'para a vida do mundo' (Jo 6, 51)."`,
        orderIndex: 2,
        isRequired: true,
        estimatedMinutes: 25
      }
    ]);

    // ========================================
    // MÓDULO 3: O MINISTRO EXTRAORDINÁRIO DA COMUNHÃO
    // ========================================
    console.log('\n👥 Módulo 3: Ministro Extraordinário...');

    const [module3] = await db.insert(formationModules).values({
      trackId: 'liturgy',
      title: 'O Ministro Extraordinário da Comunhão',
      description: 'Identidade, missão e prática do MESC',
      category: 'liturgia',
      content: 'Formação específica para Ministros Extraordinários da Sagrada Comunhão',
      durationMinutes: 150,
      orderIndex: 3
    }).returning();

    // Lição 3.1: Identidade e Vocação
    const [lesson3_1] = await db.insert(formationLessons).values({
      moduleId: module3.id,
      trackId: 'liturgy',
      title: 'Identidade e Vocação do MESC',
      description: 'Quem é o Ministro Extraordinário e qual sua missão',
      lessonNumber: 1,
      durationMinutes: 40,
      objectives: [
        'Compreender a vocação do MESC',
        'Conhecer os requisitos e critérios',
        'Entender a diferença entre ministro ordinário e extraordinário'
      ],
      isActive: true,
      orderIndex: 1
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson3_1.id,
        type: 'text',
        title: 'O que é um Ministro Extraordinário?',
        content: `# Ministro Extraordinário da Comunhão Eucarística

## Definição

O **Ministro Extraordinário da Comunhão Eucarística (MESC)** é um leigo ou leiga que, em razão de necessidade pastoral, recebe do bispo a missão temporária ou permanente de distribuir a Sagrada Comunhão aos fiéis.

## Por que "Extraordinário"?

### Ministros Ordinários (Habituais):
1. **Bispo**
2. **Presbítero (Padre)**
3. **Diácono**

### Ministro Extraordinário (por Necessidade):
- **Leigo instituído** pelo bispo

## Quando o MESC deve atuar?

**Documento "Redemptionis Sacramentum" (2004), n. 158:**

O Ministro Extraordinário pode distribuir a Comunhão apenas quando:

1. **Não há** ministro ordinário disponível
2. **O sacerdote está impedido** por doença ou idade avançada
3. **O número de fiéis é tão grande** que tornaria a Missa excessivamente longa

> **Importante**: O MESC não deve ser usado habitualmente quando há sacerdotes ou diáconos suficientes. Seu ministério é, de fato, "extraordinário" (excepcional), não "ordinário" (habitual).

## Requisitos para ser MESC

Segundo as normas da Igreja, o candidato deve:

1. **Ter fé madura** e vida cristã exemplar
2. **Receber formação adequada** sobre a Eucaristia
3. **Ser membro ativo** da comunidade paroquial
4. **Ter boa reputação** na comunidade
5. **Estar em comunhão** com a Igreja (casamento regularizado, etc.)
6. **Ser escolhido** pelo pároco e nomeado pelo bispo

## A Vocação do MESC

Não se trata de um "cargo" ou "posição", mas de um **serviço** à comunidade:

- **Serviço** ao Corpo de Cristo (Eucaristia)
- **Serviço** ao Corpo de Cristo (comunidade)
- **Testemunho** de fé e amor à Eucaristia

### Características do MESC:

- **Humildade**: Saber que é um instrumento
- **Reverência**: Cuidado especial com a Eucaristia
- **Discrição**: Não chamar atenção para si
- **Disponibilidade**: Estar pronto para servir
- **Formação contínua**: Sempre buscar crescer na fé`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 20
      },
      {
        lessonId: lesson3_1.id,
        type: 'text',
        title: 'Espiritualidade do MESC',
        content: `# A Espiritualidade do Ministro Extraordinário

## Não sou Digno

**Mateus 8,8:**
> "Senhor, não sou digno de que entres em minha casa..."

**Esta deve ser nossa atitude:**
- Reconhecimento da própria indignidade
- Confiança na misericórdia de Deus
- Gratidão pelo privilégio de servir

## Configuração a Cristo Servidor

**João 13,14-15:**
> "Se Eu, que sou o Senhor e Mestre, vos lavei os pés, também vós deveis lavar os pés uns dos outros. Dei-vos o exemplo para que, como Eu fiz, também vós o façais."

O MESC é chamado a:
- **Servir** como Cristo serviu
- **Amar** como Cristo amou
- **Doar-se** como Cristo se doou

## Vida Eucarística

Para distribuir bem a Eucaristia, é preciso **viver a Eucaristia**:

1. **Participação na Missa**
   - Não apenas quando estiver escalado
   - Participação ativa e consciente
   - Chegar antes, preparar-se

2. **Adoração Eucarística**
   - Visitar o Santíssimo Sacramento
   - Fazer momentos de adoração
   - Cultivar intimidade com Cristo presente

3. **Comunhão Frequente**
   - Receber Jesus com frequência
   - Preparar-se bem (confissão, jejum)
   - Fazer ação de graças depois

4. **Viver o que se Celebra**
   - "Tomai e comei" → Acolher Cristo
   - "Fazei isto" → Servir os irmãos
   - "Em memória de Mim" → Testemunhar

## Oração do MESC

*Senhor Jesus Cristo,*
*que na Eucaristia Te fazes alimento de nossas almas,*
*concede-me a graça de servir-Te dignamente neste ministério.*

*Purifica meu coração de todo pecado,*
*para que minhas mãos sejam dignas de tocar-Te,*
*e minha vida seja reflexo do Teu amor.*

*Que ao distribuir o Teu Corpo,*
*eu seja testemunha da Tua presença real*
*e instrumento da Tua graça.*

*Por Cristo, nosso Senhor. Amém.*`,
        orderIndex: 2,
        isRequired: true,
        estimatedMinutes: 20
      }
    ]);

    // Lição 3.2: Aspectos Práticos
    const [lesson3_2] = await db.insert(formationLessons).values({
      moduleId: module3.id,
      trackId: 'liturgy',
      title: 'Prática e Normas Litúrgicas',
      description: 'Como distribuir a Comunhão corretamente',
      lessonNumber: 2,
      durationMinutes: 50,
      objectives: [
        'Conhecer as normas litúrgicas para distribuição da Comunhão',
        'Aprender os gestos e posturas corretas',
        'Saber como proceder em situações especiais'
      ],
      isActive: true,
      orderIndex: 2
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson3_2.id,
        type: 'text',
        title: 'Preparação e Apresentação',
        content: `# Como se Preparar e Apresentar

## 1. Antes da Missa

### Preparação Espiritual
- **Oração pessoal**: Prepare seu coração
- **Revisão de vida**: Verifique sua consciência
- **Estado de graça**: Esteja em comunhão com Deus

### Preparação Prática
- **Chegar cedo**: Pelo menos 15 minutos antes
- **Verificar**: Confirmar sua escalação
- **Higiene**: Mãos limpas, unhas cortadas
- **Vestes**: Roupas adequadas e discretas

## 2. Durante a Missa

### Participação Ativa
- **Não é apenas "trabalho"**: Participe da Missa toda
- **Acompanhe**: As leituras, as orações, os cantos
- **Comunhão interior**: Antes de distribuir, receba

### Momento de se Apresentar

**Após o "Cordeiro de Deus":**
- Aproxime-se do altar discretamente
- Não durante a oração ou comunhão do padre
- Aguarde que o sacerdote lhe entregue o cibório ou cálice

## 3. Traje e Postura

### Vestes
- **Homens**: Calça social, camisa (evitar camiseta)
- **Mulheres**: Vestido ou conjunto discreto (evitar decotes, transparências)
- **Evitar**: Jeans, tênis, roupas chamativas
- **Alguns lugares**: Usam túnica ou veste específica

### Postura
- **Atitude reverente**: Você está servindo a Cristo
- **Gestos discretos**: Sem chamar atenção
- **Silêncio interior**: Recolhimento

## 4. Atitudes a Evitar

❌ **Conversar** com outros ministros
❌ **Olhar** para os lados, distrair-se
❌ **Pressa** excessiva
❌ **Gestos bruscos** ou descuidados
❌ **Mastigar chiclete** ou bala
❌ **Usar celular** antes ou durante

✅ **Manter** o olhar reverente
✅ **Concentrar-se** no que está fazendo
✅ **Distribuir** com calma e cuidado
✅ **Rezar** mentalmente`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 25
      },
      {
        lessonId: lesson3_2.id,
        type: 'text',
        title: 'Como Distribuir a Comunhão',
        content: `# Distribuição da Sagrada Comunhão

## 1. Recebendo o Cibório ou Cálice

### Do Sacerdote:
- Aproxime-se com reverência
- Faça uma inclinação profunda antes de receber
- Receba com as duas mãos
- Se for o cálice, segure firmemente pela haste

### Posicionamento:
- Fique em local visível e acessível
- Mantenha postura ereta mas não rígida
- Segure o cibório/cálice na altura do peito

## 2. As Palavras

### Ao apresentar a Hóstia:

**"O Corpo de Cristo"**
- Olhe para a pessoa (não para a Hóstia)
- Fale claramente, mas sem gritar
- Tom de voz reverente

### O fiel responde:

**"Amém"**
- É profissão de fé: "Sim, creio!"
- Aguarde a resposta antes de entregar

## 3. Formas de Distribuir

### Na Mão (mais comum no Brasil):

1. Fiel estende as mãos (uma sobre a outra)
2. Coloque a Hóstia **na palma da mão** (não nos dedos)
3. Não deixe cair
4. Fiel leva à boca imediatamente

### Na Boca (sempre permitido):

1. Fiel abre a boca e mostra a língua
2. Coloque a Hóstia **sobre a língua**
3. Evite tocar nos lábios da pessoa
4. Cuidado para não deixar cair

> **Importante**: O fiel tem **direito** de escolher como receber. Nunca recuse ou faça comentários!

## 4. Situações Especiais

### Se a Hóstia Cair:

1. **Recolha imediatamente** com reverência
2. Coloque em local apropriado (não no cibório com as outras)
3. Depois da Missa, dissolva em água e consuma, ou lance em lugar digno (sacrário)
4. Se cair no chão, **não pise**

### Se Sobrar Partículas nas Mãos:

- Junte com cuidado
- Consuma ou coloque no cibório
- Purifique as mãos sobre o cálice ou na piscina (pia especial)

### Comunhão de Crianças:

- Mesmas normas dos adultos
- Crianças pequenas: confirme com os pais se já fizeram Primeira Comunhão
- Em caso de dúvida, bênção: "Que Jesus te abençoe"

### Pessoas com Dificuldades:

- Idosos: tenha paciência
- Deficientes: adapte-se à necessidade
- Sempre com caridade e respeito

## 5. Após Distribuir

### Purificação:

1. Retorne ao altar
2. Entregue o cibório/cálice ao sacerdote ou diácono
3. Faça reverência
4. Retorne ao seu lugar discretamente

### Se há Partículas:

- Consuma com reverência
- Purifique os dedos
- Nunca sacuda as mãos

### Depois da Missa:

- Faça sua ação de graças
- Não saia apressadamente
- Reserve tempo para agradecer a Deus`,
        orderIndex: 2,
        isRequired: true,
        estimatedMinutes: 25
      }
    ]);

    // ========================================
    // MÓDULO 4: ESPIRITUALIDADE E PRÁTICA
    // ========================================
    console.log('\n🙏 Módulo 4: Espiritualidade e Prática...');

    const [module4] = await db.insert(formationModules).values({
      trackId: 'liturgy',
      title: 'Espiritualidade Litúrgica',
      description: 'Aprofundamento espiritual e vida litúrgica',
      category: 'espiritualidade',
      content: 'Desenvolvimento da vida espiritual centrada na Eucaristia',
      durationMinutes: 120,
      orderIndex: 4
    }).returning();

    // Lição 4.1: Ano Litúrgico
    const [lesson4_1] = await db.insert(formationLessons).values({
      moduleId: module4.id,
      trackId: 'liturgy',
      title: 'O Ano Litúrgico',
      description: 'Tempos litúrgicos e sua espiritualidade',
      lessonNumber: 1,
      durationMinutes: 35,
      objectives: [
        'Conhecer os tempos litúrgicos',
        'Compreender o sentido de cada tempo',
        'Viver a espiritualidade de cada período'
      ],
      isActive: true,
      orderIndex: 1
    }).returning();

    await db.insert(formationLessonSections).values([
      {
        lessonId: lesson4_1.id,
        type: 'text',
        title: 'Os Tempos do Ano Litúrgico',
        content: `# O Ano Litúrgico: Vivendo o Mistério de Cristo

## O que é o Ano Litúrgico?

**CIC §1168:**

"Partindo do Tríduo Pascal, como da sua fonte de luz, o tempo novo da Ressurreição enche todo o ano litúrgico com a sua claridade. Aproximando-se progressivamente, de uma e outra parte desta fonte, o ano é transfigurado pela Liturgia. É realmente 'ano de graça do Senhor'."

## Os Tempos Litúrgicos

### 1. ADVENTO (4 semanas antes do Natal)
**Cor: Roxo (ou Azul em alguns lugares)**

- **Significado**: Tempo de espera e preparação
- **Dupla dimensão**:
  - Preparação para o Natal (vinda de Jesus na história)
  - Preparação para a Segunda Vinda de Cristo
- **Espiritualidade**: Vigilância, esperança, conversão

### 2. NATAL E OITAVA
**Cor: Branco**

- **Do Natal até Batismo do Senhor**
- **Significado**: Celebração da Encarnação
- **Mistério**: Deus se faz homem
- **Espiritualidade**: Alegria, gratidão, acolhimento de Cristo

### 3. TEMPO COMUM (1ª parte)
**Cor: Verde**

- **Após Batismo do Senhor até Quarta-feira de Cinzas**
- **Significado**: Crescimento na vida cristã
- **Espiritualidade**: Perseverança, fidelidade quotidiana

### 4. QUARESMA (40 dias)
**Cor: Roxo**

- **De Quarta-feira de Cinzas até Quinta-feira Santa (exclusive)**
- **Significado**: Preparação para a Páscoa
- **Práticas**: Jejum, esmola, oração
- **Espiritualidade**: Penitência, conversão, renovação batismal

### 5. TRÍDUO PASCAL (3 dias)
**O CUME DO ANO LITÚRGICO**

**Quinta-feira Santa (à tarde)**
- Cor: Branco
- Missa da Ceia do Senhor
- Instituição da Eucaristia

**Sexta-feira Santa**
- Cor: Vermelho
- Celebração da Paixão
- Não há Missa

**Sábado Santo**
- Cor: Branco
- Vigília Pascal (à noite)
- Ressurreição do Senhor

### 6. TEMPO PASCAL (50 dias)
**Cor: Branco**

- **Do Domingo da Ressurreição até Pentecostes**
- **Significado**: Alegria da Ressurreição
- **Espiritualidade**: Vida nova em Cristo
- **Pentecostes**: Vinda do Espírito Santo (cor vermelha)

### 7. TEMPO COMUM (2ª parte)
**Cor: Verde**

- **Após Pentecostes até o Advento**
- **Inclui**: Solenidade de Cristo Rei (último domingo)
- **Significado**: Vida ordinária transfigurada pela graça
- **Espiritualidade**: Santificação do quotidiano

## Solenidades Especiais

### Corpus Christi
- Corpo e Sangue de Cristo
- Cor: Branco

### Sagrado Coração de Jesus
- Cor: Branco

### Assunção de Nossa Senhora (15/agosto)
- Cor: Branco

### Todos os Santos (1/novembro)
- Cor: Branco

### Imaculada Conceição (8/dezembro)
- Cor: Branco

## Como Viver o Ano Litúrgico?

1. **Acompanhe** as leituras diárias
2. **Vista-se** de acordo (quando apropriado)
3. **Reze** segundo o tempo litúrgico
4. **Decore** a casa conforme a liturgia
5. **Viva** a espiritualidade de cada tempo`,
        orderIndex: 1,
        isRequired: true,
        estimatedMinutes: 35
      }
    ]);

    console.log('\n✅ População de conteúdo concluída com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('   - 1 Trilha: Liturgia');
    console.log('   - 4 Módulos criados');
    console.log('   - 7 Lições criadas');
    console.log('   - 13 Seções de conteúdo');
    console.log('\n💡 Próximos passos:');
    console.log('   - Continuar adicionando mais lições');
    console.log('   - Adicionar vídeos e recursos multimídia');
    console.log('   - Criar quizzes de avaliação');
    console.log('   - Implementar trilha de Espiritualidade');

  } catch (error) {
    console.error('❌ Erro ao popular conteúdo:', error);
    throw error;
  }
}

// Executar script
populateFormationContent()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
