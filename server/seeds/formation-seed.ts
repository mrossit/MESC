import { db } from '../db';
import {
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections
} from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Formation Seed Data
 * Seeds the database with initial formation tracks, modules, lessons, and sections
 * for the MESC (Ministros Extraordinários da Sagrada Comunhão) system
 */

export async function seedFormation() {
  console.log('🌱 Starting formation seed...');

  try {
    // ========================================
    // TRACKS
    // ========================================

    const tracks = [
      {
        id: 'liturgy-track-1',
        title: 'Formação Litúrgica Básica',
        description: 'Fundamentos da liturgia eucarística e orientações práticas para Ministros Extraordinários da Sagrada Comunhão',
        category: 'liturgia' as const,
        icon: 'Cross',
        orderIndex: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'spirituality-track-1',
        title: 'Formação Espiritual',
        description: 'Aprofundamento na espiritualidade eucarística e na vida de oração do ministro',
        category: 'espiritualidade' as const,
        icon: 'Heart',
        orderIndex: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    console.log('📚 Inserting tracks...');
    for (const track of tracks) {
      // Check if track already exists
      const existing = await db.select().from(formationTracks).where(eq(formationTracks.id, track.id)).limit(1);

      if (existing.length === 0) {
        await db.insert(formationTracks).values(track);
        console.log(`  ✓ Created track: ${track.title}`);
      } else {
        console.log(`  ⤷ Track already exists: ${track.title}`);
      }
    }

    // ========================================
    // MODULES & LESSONS - LITURGY TRACK
    // ========================================

    console.log('\n📖 Creating Liturgy Track modules and lessons...');

    // Module 1: A Eucaristia na Igreja
    const liturgyModule1 = {
      trackId: 'liturgy-track-1',
      title: 'A Eucaristia na Igreja',
      description: 'Fundamentos teológicos e históricos da celebração eucarística',
      category: 'liturgia' as const,
      orderIndex: 0,
      estimatedDuration: 90,
      isActive: true,
      createdAt: new Date()
    };

    const [module1] = await db.insert(formationModules)
      .values(liturgyModule1)
      .onConflictDoNothing()
      .returning();

    if (module1) {
      console.log(`  ✓ Module 1: ${liturgyModule1.title}`);

      // Lesson 1.1: Sacramento da Eucaristia
      const [lesson1_1] = await db.insert(formationLessons)
        .values({
          moduleId: module1.id,
          trackId: 'liturgy-track-1',
          title: 'O Sacramento da Eucaristia',
          description: 'Compreendendo a Eucaristia como fonte e ápice da vida cristã',
          lessonNumber: 1,
          durationMinutes: 30,
          orderIndex: 0,
          objectives: [
            'Compreender o significado teológico da Eucaristia',
            'Reconhecer a Eucaristia como memorial da Páscoa de Cristo',
            'Valorizar a presença real de Cristo no Sacramento'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson1_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_1.id,
            type: 'text',
            title: 'Introdução',
            content: `A Eucaristia é o sacramento central da vida cristã. Como ensina o Catecismo da Igreja Católica (CIC 1324): "A Eucaristia é fonte e ápice de toda a vida cristã".

Neste sacramento, Jesus Cristo se faz presente de modo único e especial, oferecendo-se ao Pai em sacrifício e dando-se a nós como alimento espiritual.`,
            orderIndex: 0,
            estimatedMinutes: 5,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: 'text',
            title: 'A Instituição da Eucaristia',
            content: `Na última ceia, Jesus instituiu a Eucaristia dizendo: "Isto é o meu corpo que é dado por vós; fazei isto em memória de mim" (Lc 22,19).

A Eucaristia é memorial da Páscoa de Cristo, ou seja, torna presente e atual o sacrifício único de Cristo na cruz. Não é uma simples lembrança, mas uma presença real e eficaz.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: 'text',
            title: 'A Presença Real',
            content: `A Igreja professa a fé na presença real de Cristo na Eucaristia. Pelo poder do Espírito Santo e pelas palavras de Cristo, o pão e o vinho se tornam verdadeiramente o Corpo e o Sangue de Cristo.

Esta transformação é chamada de "transubstanciação". O Concílio de Trento afirma que Cristo está presente "verdadeira, real e substancialmente" na Eucaristia.`,
            orderIndex: 2,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: 'text',
            title: 'Reflexão Final',
            content: `Como Ministros Extraordinários da Sagrada Comunhão, somos chamados a servir com profunda reverência, reconhecendo que tocamos e distribuímos o Corpo de Cristo.

Nossa fé na presença real deve se manifestar em nossos gestos, palavras e atitudes durante o serviço litúrgico.`,
            orderIndex: 3,
            estimatedMinutes: 5,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.1: ${lesson1_1.title} (4 sections)`);
      }

      // Lesson 1.2: A Celebração Eucarística
      const [lesson1_2] = await db.insert(formationLessons)
        .values({
          moduleId: module1.id,
          trackId: 'liturgy-track-1',
          title: 'A Celebração Eucarística',
          description: 'Estrutura e partes da Santa Missa',
          lessonNumber: 2,
          durationMinutes: 35,
          orderIndex: 1,
          objectives: [
            'Conhecer a estrutura da celebração eucarística',
            'Compreender o significado de cada parte da Missa',
            'Identificar os momentos principais da liturgia'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson1_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_2.id,
            type: 'text',
            title: 'As Duas Grandes Partes da Missa',
            content: `A celebração eucarística possui duas grandes partes que formam um único ato de culto:

1. **Liturgia da Palavra**: Onde Deus fala ao seu povo e Cristo anuncia o Evangelho
2. **Liturgia Eucarística**: Onde o povo oferece o pão e o vinho que se tornam o Corpo e Sangue de Cristo

Estas duas partes são tão intimamente ligadas que constituem um só ato de culto (IGMR 28).`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: 'text',
            title: 'Ritos Iniciais',
            content: `Os ritos iniciais preparam a assembleia para ouvir a Palavra e celebrar a Eucaristia:

- **Entrada**: Canto e procissão
- **Saudação**: O sacerdote saúda o povo
- **Ato Penitencial**: Reconhecemos nossos pecados
- **Glória**: Hino de louvor (exceto Advento e Quaresma)
- **Oração do Dia**: Coleta que une as intenções do povo`,
            orderIndex: 1,
            estimatedMinutes: 7,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: 'text',
            title: 'Liturgia da Palavra',
            content: `Na Liturgia da Palavra, Deus fala ao seu povo:

- **Primeira Leitura**: Geralmente do Antigo Testamento
- **Salmo Responsorial**: Resposta orante à Palavra
- **Segunda Leitura**: Das cartas apostólicas (domingos e solenidades)
- **Evangelho**: Ponto alto da Liturgia da Palavra
- **Homilia**: Explicação das leituras
- **Profissão de Fé**: Credo
- **Oração dos Fiéis**: Preces pela Igreja e pelo mundo`,
            orderIndex: 2,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: 'text',
            title: 'Liturgia Eucarística e Ritos Finais',
            content: `**Liturgia Eucarística:**
- **Preparação das Oferendas**: Apresentação do pão e vinho
- **Oração Eucarística**: Consagração - momento central da Missa
- **Rito da Comunhão**: Pai Nosso, sinal da paz, fração do pão, comunhão

**Ritos Finais:**
- **Avisos**: Comunicações à assembleia
- **Bênção**: Sacerdote abençoa o povo
- **Despedida**: "Ide em paz"

Como ministros, participamos especialmente do Rito da Comunhão.`,
            orderIndex: 3,
            estimatedMinutes: 10,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.2: ${lesson1_2.title} (4 sections)`);
      }

      // Lesson 1.3: História da Comunhão na Mão e na Boca
      const [lesson1_3] = await db.insert(formationLessons)
        .values({
          moduleId: module1.id,
          trackId: 'liturgy-track-1',
          title: 'Formas de Receber a Comunhão',
          description: 'História e orientações sobre as formas de distribuição da Sagrada Comunhão',
          lessonNumber: 3,
          durationMinutes: 25,
          orderIndex: 2,
          objectives: [
            'Conhecer a história das formas de comunhão',
            'Compreender as normas atuais da Igreja',
            'Respeitar as diferentes formas de piedade dos fiéis'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson1_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_3.id,
            type: 'text',
            title: 'Perspectiva Histórica',
            content: `Ao longo da história da Igreja, a forma de receber a comunhão passou por diferentes práticas:

- **Primeiros séculos**: A comunhão era recebida na mão, com grande reverência
- **Idade Média**: Estabeleceu-se a prática da comunhão na boca
- **Pós-Vaticano II**: A Igreja permitiu novamente a comunhão na mão em algumas regiões

Ambas as formas são legítimas e expressam a fé na presença real de Cristo.`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_3.id,
            type: 'text',
            title: 'Normas Atuais',
            content: `A Instrução Redemptionis Sacramentum estabelece:

**Comunhão na Boca:**
- Forma tradicional
- O fiel inclina a cabeça
- O ministro coloca a hóstia diretamente na língua

**Comunhão na Mão:**
- Permitida onde aprovada pela Conferência Episcopal
- O fiel estende as mãos (uma sobre a outra)
- Recebe a hóstia e a leva à boca imediatamente
- As mãos devem estar limpas e dignas

O fiel tem o direito de escolher a forma de receber a comunhão.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson1_3.id,
            type: 'text',
            title: 'Atitude do Ministro',
            content: `Como ministros, devemos:

1. **Respeitar**: A escolha de cada fiel sobre como receber a comunhão
2. **Estar preparados**: Para distribuir de ambas as formas com igual reverência
3. **Evitar julgamentos**: Não cabe a nós julgar a piedade alheia
4. **Manter reverência**: Em ambos os modos de distribuição
5. **Seguir as normas**: Da diocese e da paróquia

Nossa atitude deve sempre refletir a fé na presença real de Cristo.`,
            orderIndex: 2,
            estimatedMinutes: 7,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.3: ${lesson1_3.title} (3 sections)`);
      }
    }

    // Module 2: O Ministro Extraordinário
    const liturgyModule2 = {
      trackId: 'liturgy-track-1',
      title: 'O Ministro Extraordinário da Sagrada Comunhão',
      description: 'Identidade, missão e espiritualidade do ministro',
      category: 'liturgia' as const,
      orderIndex: 1,
      estimatedDuration: 75,
      isActive: true,
      createdAt: new Date()
    };

    const [module2] = await db.insert(formationModules)
      .values(liturgyModule2)
      .onConflictDoNothing()
      .returning();

    if (module2) {
      console.log(`  ✓ Module 2: ${liturgyModule2.title}`);

      // Lesson 2.1: Vocação e Missão
      const [lesson2_1] = await db.insert(formationLessons)
        .values({
          moduleId: module2.id,
          trackId: 'liturgy-track-1',
          title: 'Vocação e Missão do Ministro',
          description: 'Compreendendo o chamado para o serviço eucarístico',
          lessonNumber: 1,
          durationMinutes: 30,
          orderIndex: 0,
          objectives: [
            'Reconhecer o ministério como vocação',
            'Compreender a missão do ministro extraordinário',
            'Identificar as qualidades necessárias para o serviço'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson2_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson2_1.id,
            type: 'text',
            title: 'Um Chamado Especial',
            content: `O ministério extraordinário da Sagrada Comunhão é um verdadeiro chamado de Deus. Não se trata apenas de uma função prática, mas de uma vocação ao serviço do Corpo de Cristo.

São Paulo nos ensina: "Cada um exerça, em benefício dos outros, o dom que recebeu, como bons administradores da multiforme graça de Deus" (1Pd 4,10).

Este ministério exige:
- Fé profunda na presença real de Cristo
- Vida sacramental intensa
- Testemunho de vida cristã
- Disponibilidade para servir`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson2_1.id,
            type: 'text',
            title: 'A Missão do Ministro',
            content: `**Funções principais:**

1. **Durante a Missa:**
   - Auxiliar na distribuição da Sagrada Comunhão
   - Servir o Corpo e Sangue de Cristo aos fiéis

2. **Fora da Missa:**
   - Levar a comunhão aos enfermos e impossibilitados
   - Realizar celebrações dominicais sem presbítero (quando autorizado)
   - Expor o Santíssimo Sacramento para adoração (com autorização)

**Caráter extraordinário:**
Este ministério é "extraordinário" porque complementa o ministério ordinário do bispo, presbítero e diácono. É exercido em casos de necessidade pastoral.`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: lesson2_1.id,
            type: 'text',
            title: 'Qualidades Necessárias',
            content: `O Código de Direito Canônico (cân. 910) e as orientações litúrgicas estabelecem que o ministro deve:

**Requisitos básicos:**
- Ser católico praticante
- Estar em estado de graça
- Ter idade mínima (geralmente 16 anos)
- Ter recebido os sacramentos da iniciação cristã

**Qualidades espirituais:**
- Fé viva na Eucaristia
- Vida de oração constante
- Participação dominical na Missa
- Testemunho de vida cristã

**Qualidades humanas:**
- Maturidade e equilíbrio
- Discrição e prudência
- Pontualidade e responsabilidade
- Espírito de serviço

**Formação contínua:**
O ministro deve buscar formação permanente em liturgia, espiritualidade e doutrina católica.`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 2.1: ${lesson2_1.title} (3 sections)`);
      }

      // Lesson 2.2: Procedimentos Litúrgicos
      const [lesson2_2] = await db.insert(formationLessons)
        .values({
          moduleId: module2.id,
          trackId: 'liturgy-track-1',
          title: 'Procedimentos Litúrgicos Práticos',
          description: 'Como realizar o ministério com reverência e correção',
          lessonNumber: 2,
          durationMinutes: 45,
          orderIndex: 1,
          objectives: [
            'Conhecer os procedimentos corretos para distribuir a comunhão',
            'Aprender a postura e gestos adequados',
            'Saber lidar com situações especiais'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson2_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson2_2.id,
            type: 'text',
            title: 'Preparação Antes da Missa',
            content: `**Preparação pessoal:**
- Chegar com antecedência (15-20 minutos)
- Fazer uma oração preparatória
- Verificar a escala e seu posicionamento
- Estar em estado de graça (confissão recente)
- Vestir-se adequadamente com dignidade

**Preparação prática:**
- Higienizar bem as mãos
- Verificar se há água e toalha disponíveis
- Conhecer o número aproximado de comungantes
- Identificar qualquer orientação especial do dia`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: 'text',
            title: 'Durante a Distribuição da Comunhão',
            content: `**Momento de aproximação ao altar:**
- Aguardar o sinal do sacerdote
- Aproximar-se com reverência
- Fazer genuflexão antes de subir ao altar
- Receber a âmbula ou o cálice das mãos do sacerdote

**Fórmula sacramental:**
Ao apresentar a hóstia a cada fiel, dizer claramente:
"O Corpo de Cristo"

O fiel responde: "Amém"

Esta resposta não é uma mera formalidade, mas uma profissão de fé na presença real.

**Postura:**
- Manter postura reverente e digna
- Olhar cada comungante nos olhos
- Aguardar a resposta "Amém" antes de depositar a hóstia
- Manter atenção e cuidado com cada partícula
- Se uma hóstia cair, recolhê-la imediatamente com reverência`,
            orderIndex: 1,
            estimatedMinutes: 15,
            createdAt: new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: 'text',
            title: 'Distribuindo a Comunhão na Boca e na Mão',
            content: `**Na boca:**
1. Segurar a hóstia entre o polegar e o indicador
2. Aguardar que o fiel incline a cabeça e abra a boca
3. Colocar a hóstia delicadamente sobre a língua
4. Evitar tocar os lábios ou língua do fiel

**Na mão:**
1. O fiel deve estender as mãos (uma sobre a outra)
2. Colocar a hóstia com reverência sobre a palma da mão
3. Observar discretamente se o fiel leva a hóstia à boca imediatamente
4. Caso note algo irregular, informar discretamente o sacerdote após a Missa

**Atenção especial:**
- Crianças: Verificar se já fizeram primeira comunhão
- Quem se aproxima de braços cruzados: Dar a bênção ("Que Deus te abençoe")
- Celíacos: Podem existir hóstias especiais disponíveis`,
            orderIndex: 2,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: 'text',
            title: 'Após a Distribuição',
            content: `**Purificação dos vasos:**
- Retornar ao altar com reverência
- Se houver hóstias restantes, entregar ao sacerdote ou diácono
- Se for o cálice, o sacerdote ou diácono fará a purificação
- Nunca deixar partículas na âmbula - consumi-las com reverência

**Retorno ao lugar:**
- Fazer genuflexão ao Santíssimo
- Retornar ao seu lugar
- Fazer uma ação de graças pessoal

**Pós-Missa:**
- Ajudar na arrumação se necessário
- Fazer uma oração de agradecimento
- Lavar as mãos se tiver tocado as espécies

**Lembrete importante:**
Após distribuir a comunhão, recomenda-se não comer nem beber nada por 15 minutos, como sinal de reverência.`,
            orderIndex: 3,
            estimatedMinutes: 10,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 2.2: ${lesson2_2.title} (4 sections)`);
      }
    }

    // Module 3: Espiritualidade do Ministro
    const liturgyModule3 = {
      trackId: 'liturgy-track-1',
      title: 'Espiritualidade Eucarística',
      description: 'Vivência espiritual e compromisso do ministro',
      category: 'liturgia' as const,
      orderIndex: 2,
      estimatedDuration: 60,
      isActive: true,
      createdAt: new Date()
    };

    const [module3] = await db.insert(formationModules)
      .values(liturgyModule3)
      .onConflictDoNothing()
      .returning();

    if (module3) {
      console.log(`  ✓ Module 3: ${liturgyModule3.title}`);

      // Lesson 3.1: Vida de Oração
      const [lesson3_1] = await db.insert(formationLessons)
        .values({
          moduleId: module3.id,
          trackId: 'liturgy-track-1',
          title: 'A Vida de Oração do Ministro',
          description: 'Cultivando uma espiritualidade eucarística profunda',
          lessonNumber: 1,
          durationMinutes: 30,
          orderIndex: 0,
          objectives: [
            'Compreender a importância da oração pessoal',
            'Conhecer práticas de piedade eucarística',
            'Desenvolver uma relação pessoal com Cristo na Eucaristia'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson3_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson3_1.id,
            type: 'text',
            title: 'Fundamento da Vida Espiritual',
            content: `"Sem mim, nada podeis fazer" (Jo 15,5)

O ministério eucarístico brota de uma vida de oração intensa. Não podemos dar aos outros o que não temos. Para distribuir o Pão da Vida, precisamos primeiro nos alimentar dele.

**A oração do ministro deve incluir:**
- **Missa Dominical**: Participação ativa e consciente
- **Oração diária**: Momento pessoal com Deus
- **Leitura orante da Escritura**: Lectio Divina
- **Adoração eucarística**: Tempo de contemplação
- **Exame de consciência**: Revisão da vida diária`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson3_1.id,
            type: 'text',
            title: 'Práticas de Piedade Eucarística',
            content: `**Antes da Missa:**
- Chegar com antecedência
- Fazer uma oração preparatória
- Revisar as leituras do dia
- Pedir ao Espírito Santo que renove sua fé

**Durante a Missa:**
- Participar ativamente de cada parte
- Comungar com devoção
- Fazer ação de graças após comungar

**Adoração Eucarística:**
- Visitar o Santíssimo regularmente
- Participar de horas de adoração
- Fazer vigílias quando possível

**Devoções complementares:**
- Terço meditando os mistérios
- Leitura espiritual
- Oração da Igreja (Liturgia das Horas)`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: lesson3_1.id,
            type: 'text',
            title: 'Crescendo na Intimidade com Cristo',
            content: `A relação com Cristo eucarístico é como qualquer relacionamento: precisa ser cultivada.

**Passos para aprofundar a intimidade:**

1. **Regularidade**: Estabelecer horários fixos de oração
2. **Silêncio**: Criar momentos de escuta
3. **Confiança**: Abrir o coração como a um amigo
4. **Perseverança**: Manter a oração mesmo na aridez
5. **Ação**: Deixar a oração transformar a vida

**Frutos esperados:**
- Maior amor à Eucaristia
- Desejo de servir com generosidade
- Paz interior
- Testemunho de vida que atrai outros

"Permanecei em mim, e eu permanecerei em vós" (Jo 15,4)`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 3.1: ${lesson3_1.title} (3 sections)`);
      }

      // Lesson 3.2: Testemunho de Vida
      const [lesson3_2] = await db.insert(formationLessons)
        .values({
          moduleId: module3.id,
          trackId: 'liturgy-track-1',
          title: 'O Testemunho de Vida do Ministro',
          description: 'Vivendo coerentemente com o ministério exercido',
          lessonNumber: 2,
          durationMinutes: 30,
          orderIndex: 1,
          objectives: [
            'Compreender a responsabilidade do testemunho',
            'Identificar áreas de crescimento pessoal',
            'Comprometer-se com uma vida coerente com a fé'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (lesson3_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson3_2.id,
            type: 'text',
            title: 'A Chamada à Santidade',
            content: `"Sede santos, porque eu sou santo" (1Pd 1,16)

O ministro extraordinário não é apenas alguém que distribui a comunhão. É uma testemunha viva de Cristo. A comunidade observa nossa vida e nosso exemplo.

**O que o povo espera ver:**
- Coerência entre fé e vida
- Participação assídua na Missa
- Vida sacramental intensa
- Caridade no relacionamento com todos
- Humildade no serviço

Não precisamos ser perfeitos, mas devemos estar em caminho de conversão constante.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: lesson3_2.id,
            type: 'text',
            title: 'Áreas de Atenção Especial',
            content: `**Vida sacramental:**
- Confissão regular (recomenda-se mensal)
- Comunhão frequente e devota
- Estar em estado de graça ao ministrar

**Vida familiar:**
- Cultivar o amor conjugal (se casado)
- Educar os filhos na fé
- Fazer da família "igreja doméstica"

**Vida comunitária:**
- Participar da vida paroquial
- Colaborar nas pastorais
- Manter bom relacionamento com todos

**Vida profissional:**
- Ser honesto no trabalho
- Ser testemunha de Cristo no ambiente profissional
- Praticar a justiça e a caridade

**Vida social:**
- Evitar ambientes e situações incompatíveis com a fé
- Ser sal e luz no mundo (Mt 5,13-14)`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: lesson3_2.id,
            type: 'text',
            title: 'Lidando com as Próprias Fragilidades',
            content: `Todos temos limitações e fraquezas. O importante é reconhecê-las e buscar crescer.

**Quando cometer erros:**
1. Reconhecer humildemente
2. Buscar a confissão
3. Reparar o mal causado quando possível
4. Continuar servindo com humildade

**Evitar:**
- Hipocrisia (parecer santo sem buscar sê-lo)
- Escândalo (ações que afastam outros da fé)
- Orgulho espiritual (sentir-se superior)
- Tibieza (frieza na vida espiritual)

**Lembrar sempre:**
"Quem se gloria, glorie-se no Senhor" (1Cor 1,31)

Nossa santidade não é mérito nosso, mas dom de Deus. Servimos pela graça d'Ele.`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 3.2: ${lesson3_2.title} (3 sections)`);
      }
    }

    // ========================================
    // MODULES & LESSONS - SPIRITUALITY TRACK
    // ========================================

    console.log('\n🙏 Creating Spirituality Track modules and lessons...');

    // Module 1: Fundamentos da Vida Espiritual
    const spiritModule1 = {
      trackId: 'spirituality-track-1',
      title: 'Fundamentos da Vida Espiritual',
      description: 'Bases da espiritualidade cristã católica',
      category: 'espiritualidade' as const,
      orderIndex: 0,
      estimatedDuration: 80,
      isActive: true,
      createdAt: new Date()
    };

    const [spiritMod1] = await db.insert(formationModules)
      .values(spiritModule1)
      .onConflictDoNothing()
      .returning();

    if (spiritMod1) {
      console.log(`  ✓ Module 1: ${spiritModule1.title}`);

      // Lesson 1.1: Oração - Diálogo com Deus
      const [spiritLesson1_1] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod1.id,
          trackId: 'spirituality-track-1',
          title: 'A Oração como Diálogo com Deus',
          description: 'Compreendendo e praticando a oração cristã',
          lessonNumber: 1,
          durationMinutes: 35,
          orderIndex: 0,
          objectives: [
            'Compreender a oração como encontro pessoal com Deus',
            'Conhecer diferentes formas de oração',
            'Desenvolver uma vida de oração constante'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson1_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_1.id,
            type: 'text',
            title: 'O Que É Oração?',
            content: `"A oração é a elevação da alma a Deus ou o pedido a Deus de bens convenientes" (São João Damasceno, citado no CIC 2559).

A oração não é apenas falar com Deus, mas estar com Deus. É um relacionamento pessoal de amor, confiança e entrega.

Jesus nos ensinou a orar:
- Pelo exemplo: Passava noites em oração (Lc 6,12)
- Pelos ensinamentos: "Orai sem cessar" (1Ts 5,17)
- Pelo Pai Nosso: Modelo de toda oração cristã

A oração cristã é trinitária: dirigimo-nos ao Pai, por Cristo, no Espírito Santo.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_1.id,
            type: 'text',
            title: 'Formas de Oração',
            content: `A tradição da Igreja reconhece várias formas de oração:

**Segundo a expressão:**
- **Vocal**: Palavras pronunciadas (Pai Nosso, Ave Maria)
- **Meditativa**: Reflexão sobre a Palavra de Deus
- **Contemplativa**: Silêncio amoroso na presença de Deus

**Segundo o conteúdo:**
- **Adoração**: Reconhecer Deus como Criador
- **Louvor**: Glorificar a Deus por quem Ele é
- **Súplica**: Pedir o que necessitamos
- **Intercessão**: Pedir pelos outros
- **Ação de graças**: Agradecer os dons recebidos

Todas as formas são válidas e complementares. O importante é orar com o coração.`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_1.id,
            type: 'text',
            title: 'Dificuldades na Oração',
            content: `É normal enfrentar dificuldades na oração:

**Distrações:**
- São normais, especialmente no início
- Quando perceber, retornar suavemente à oração
- Não se culpar, mas recomeçar com paciência

**Aridez espiritual:**
- Períodos sem "sentir" a presença de Deus
- É uma prova da fé, não abandono de Deus
- Continuar orando com fidelidade

**Falta de tempo:**
- Estabelecer prioridades
- Começar com pouco tempo, mas com regularidade
- "Quem diz que não tem tempo, não tem vontade" (Santa Teresa)

**Como perseverar:**
1. Horário fixo para oração
2. Lugar apropriado e silencioso
3. Usar recursos (Bíblia, livros espirituais)
4. Pedir ajuda do Espírito Santo
5. Não desistir nas dificuldades`,
            orderIndex: 2,
            estimatedMinutes: 13,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.1: ${spiritLesson1_1.title} (3 sections)`);
      }

      // Lesson 1.2: Os Sacramentos na Vida Cristã
      const [spiritLesson1_2] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod1.id,
          trackId: 'spirituality-track-1',
          title: 'Os Sacramentos: Encontro com Cristo',
          description: 'A vida sacramental como fonte de graça',
          lessonNumber: 2,
          durationMinutes: 25,
          orderIndex: 1,
          objectives: [
            'Compreender os sacramentos como encontros com Cristo',
            'Valorizar especialmente a Eucaristia e a Reconciliação',
            'Viver intensamente a vida sacramental'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson1_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_2.id,
            type: 'text',
            title: 'Sacramentos: Sinais Eficazes da Graça',
            content: `Os sacramentos são "obras-primas de Deus" (CIC 1116). São sinais sensíveis e eficazes da graça, instituídos por Cristo e confiados à Igreja.

**Os sete sacramentos:**

**Iniciação Cristã:**
1. Batismo - Nascimento para a vida nova
2. Confirmação - Fortaleza do Espírito Santo
3. Eucaristia - Alimento da vida eterna

**Cura:**
4. Reconciliação - Perdão dos pecados
5. Unção dos Enfermos - Conforto na doença

**Serviço:**
6. Ordem - Ministério apostólico
7. Matrimônio - Comunhão de vida e amor

Cada sacramento comunica uma graça específica e nos configura a Cristo.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_2.id,
            type: 'text',
            title: 'Eucaristia e Reconciliação: Fontes de Vida',
            content: `**A Eucaristia:**
- Centro e ápice da vida cristã
- Atualização do sacrifício de Cristo
- Comunhão com o Corpo e Sangue do Senhor
- Alimento para o caminho

Para o ministro: Participar da Missa dominical com devoção, chegando cedo e preparando o coração.

**A Reconciliação:**
- Sacramento da misericórdia de Deus
- Cura as feridas do pecado
- Restaura a amizade com Deus
- Fortalece para não pecar

Recomenda-se a confissão mensal para quem exerce ministérios. É um encontro de cura e libertação.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_2.id,
            type: 'text',
            title: 'Vivendo Sacramentalmente',
            content: `**Preparação para os sacramentos:**
- Estado de graça (confissão se necessário)
- Jejum eucarístico (1 hora)
- Disposição interior de fé e amor
- Roupa adequada e digna

**Após receber os sacramentos:**
- Ação de graças
- Compromisso de conversão
- Testemunho de vida transformada

**Frutos de uma vida sacramental intensa:**
- Crescimento na santidade
- Força para vencer o pecado
- Alegria e paz interior
- Capacidade de amar e servir

Os sacramentos não são "obrigações", mas encontros de amor com Cristo!`,
            orderIndex: 2,
            estimatedMinutes: 5,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.2: ${spiritLesson1_2.title} (3 sections)`);
      }

      // Lesson 1.3: A Palavra de Deus
      const [spiritLesson1_3] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod1.id,
          trackId: 'spirituality-track-1',
          title: 'A Palavra de Deus na Vida do Ministro',
          description: 'Leitura orante da Sagrada Escritura',
          lessonNumber: 3,
          durationMinutes: 20,
          orderIndex: 2,
          objectives: [
            'Valorizar a Sagrada Escritura',
            'Aprender a fazer lectio divina',
            'Comprometer-se com a leitura diária da Palavra'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson1_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_3.id,
            type: 'text',
            title: 'A Bíblia: Palavra Viva de Deus',
            content: `"Desconhecer as Escrituras é desconhecer Cristo" (São Jerônimo).

A Bíblia não é apenas um livro antigo, mas Palavra viva e eficaz (Hb 4,12). Deus continua falando através dela hoje.

**Por que ler a Bíblia:**
- Para conhecer a Deus e seu plano de salvação
- Para conhecer Jesus Cristo mais profundamente
- Para encontrar orientação para a vida
- Para alimentar a fé e a esperança
- Para crescer na intimidade com Deus

O Concílio Vaticano II recomenda: "É preciso que os fiéis tenham amplo acesso à Sagrada Escritura" (DV 22).`,
            orderIndex: 0,
            estimatedMinutes: 7,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_3.id,
            type: 'text',
            title: 'Lectio Divina: Leitura Orante',
            content: `A lectio divina é um método antigo de leitura orante da Bíblia:

**1. LECTIO (Leitura):**
- Ler o texto com atenção
- O que o texto diz em si mesmo?

**2. MEDITATIO (Meditação):**
- Refletir sobre o texto
- O que o texto diz para mim?

**3. ORATIO (Oração):**
- Responder a Deus
- O que quero dizer a Deus?

**4. CONTEMPLATIO (Contemplação):**
- Permanecer em silêncio com Deus
- Deixar Deus transformar o coração

**5. ACTIO (Ação):**
- Compromisso concreto
- O que vou fazer?

Dedicar 10-15 minutos diários para essa prática.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson1_3.id,
            type: 'text',
            title: 'Dicas Práticas',
            content: `**Como começar:**
1. Escolher um horário diário fixo
2. Começar pelos Evangelhos (Mateus, Marcos, Lucas, João)
3. Ter uma Bíblia católica com boas notas
4. Pedir a luz do Espírito Santo antes de ler
5. Ler devagar, saboreando cada palavra

**Recursos úteis:**
- Aplicativos de Bíblia católicos
- Comentários e subsídios bíblicos
- Grupos de partilha da Palavra
- Homilias e catequeses

**Atenção:**
Sempre ler a Bíblia na fé da Igreja. Evitar interpretações particulares. Em dúvida, consultar um padre ou catequista.

"Tua palavra é lâmpada para os meus passos, luz para o meu caminho" (Sl 119,105)`,
            orderIndex: 2,
            estimatedMinutes: 3,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 1.3: ${spiritLesson1_3.title} (3 sections)`);
      }
    }

    // Module 2: Virtudes Cristãs
    const spiritModule2 = {
      trackId: 'spirituality-track-1',
      title: 'As Virtudes na Vida do Ministro',
      description: 'Cultivando as virtudes teologais e cardeais',
      category: 'espiritualidade' as const,
      orderIndex: 1,
      estimatedDuration: 70,
      isActive: true,
      createdAt: new Date()
    };

    const [spiritMod2] = await db.insert(formationModules)
      .values(spiritModule2)
      .onConflictDoNothing()
      .returning();

    if (spiritMod2) {
      console.log(`  ✓ Module 2: ${spiritModule2.title}`);

      // Lesson 2.1: Fé, Esperança e Caridade
      const [spiritLesson2_1] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod2.id,
          trackId: 'spirituality-track-1',
          title: 'Virtudes Teologais: Fé, Esperança e Caridade',
          description: 'As três virtudes que unem o homem a Deus',
          lessonNumber: 1,
          durationMinutes: 35,
          orderIndex: 0,
          objectives: [
            'Compreender as virtudes teologais',
            'Identificar como vivê-las concretamente',
            'Crescer na fé, esperança e caridade'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson2_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_1.id,
            type: 'text',
            title: 'A Fé: Dom e Resposta',
            content: `"A fé é a certeza das coisas que se esperam, a demonstração das realidades que não se veem" (Hb 11,1).

**A fé é:**
- Dom gratuito de Deus
- Resposta livre do homem
- Adesão pessoal a Deus
- Aceitação da verdade revelada

**Vivendo a fé:**
- Professar: Crer e proclamar a fé (Credo)
- Celebrar: Participar dos sacramentos
- Viver: Conformar a vida aos mandamentos
- Orar: Dialogar com Deus na oração

**Para o ministro:**
A fé na presença real de Cristo na Eucaristia deve ser viva e consciente. Cada gesto litúrgico deve expressar essa fé profunda.

"Creio, Senhor, mas aumenta a minha fé!" (Mc 9,24)`,
            orderIndex: 0,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson2_1.id,
            type: 'text',
            title: 'A Esperança: Âncora da Alma',
            content: `"A esperança não decepciona, porque o amor de Deus foi derramado em nossos corações" (Rm 5,5).

**A esperança cristã:**
- Confia nas promessas de Cristo
- Aguarda a vida eterna
- Conta com a graça do Espírito Santo
- Não é ingenuidade, mas certeza fundada em Deus

**Contra a esperança:**
- Desespero: Perder a confiança em Deus
- Presunção: Confiar apenas em si mesmo

**Vivendo a esperança:**
- Nas dificuldades: Confiar na providência
- No pecado: Crer no perdão divino
- No sofrimento: Unir-se à cruz de Cristo
- No serviço: Trabalhar pelo Reino sem desanimar

"Espera no Senhor, sê forte! Coragem! Espera no Senhor!" (Sl 27,14)`,
            orderIndex: 1,
            estimatedMinutes: 11,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson2_1.id,
            type: 'text',
            title: 'A Caridade: A Maior das Virtudes',
            content: `"Deus é amor" (1Jo 4,8). A caridade é a virtude pela qual amamos a Deus acima de tudo e ao próximo como a nós mesmos.

**Duplo mandamento:**
1. Amar a Deus de todo o coração (verticalidade)
2. Amar o próximo como a si mesmo (horizontalidade)

Não há caridade para com Deus sem caridade para com o próximo, e vice-versa.

**Expressões da caridade:**
- **Paciência**: Suportar com amor
- **Bondade**: Fazer o bem aos outros
- **Perdão**: Não guardar rancor
- **Serviço**: Doar-se generosamente
- **Verdade**: Falar com amor, mas com verdade

**Para o ministro:**
O ministério é exercício de caridade. Servimos porque amamos a Cristo presente na Eucaristia e nos irmãos.

"Permaneceis no meu amor" (Jo 15,9)`,
            orderIndex: 2,
            estimatedMinutes: 12,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 2.1: ${spiritLesson2_1.title} (3 sections)`);
      }

      // Lesson 2.2: Prudência e Justiça
      const [spiritLesson2_2] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod2.id,
          trackId: 'spirituality-track-1',
          title: 'Virtudes Cardeais: Prudência e Justiça',
          description: 'Vivendo com sabedoria e retidão',
          lessonNumber: 2,
          durationMinutes: 20,
          orderIndex: 1,
          objectives: [
            'Conhecer as virtudes da prudência e justiça',
            'Aplicá-las na vida e no ministério',
            'Crescer em sabedoria e retidão'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson2_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_2.id,
            type: 'text',
            title: 'Prudência: A Sabedoria Prática',
            content: `A prudência é a virtude que dispõe a razão a discernir, em toda circunstância, o verdadeiro bem e a escolher os meios adequados para realizá-lo.

**Atos da prudência:**
1. **Aconselhar-se**: Buscar orientação
2. **Julgar**: Discernir o que fazer
3. **Decidir**: Escolher e agir

**No ministério:**
- Saber quando falar e quando calar
- Discernir situações delicadas
- Agir com equilíbrio e bom senso
- Evitar extremos

**Pecados contra a prudência:**
- Precipitação: Agir sem pensar
- Negligência: Não dar importância devida
- Inconstância: Mudar sem motivo

"Sede prudentes como as serpentes e simples como as pombas" (Mt 10,16)`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson2_2.id,
            type: 'text',
            title: 'Justiça: Dar a Cada Um o Que Lhe É Devido',
            content: `A justiça é a vontade firme e constante de dar a Deus e ao próximo o que lhes é devido.

**Justiça para com Deus:**
- Culto de adoração (virtude da religião)
- Gratidão pelos dons recebidos
- Fidelidade às promessas feitas

**Justiça para com o próximo:**
- Respeitar os direitos de cada um
- Promover a equidade nas relações
- Não julgar precipitadamente
- Respeitar a boa fama (não caluniar)

**Justiça social:**
- Preocupação com o bem comum
- Atenção aos mais pobres e necessitados
- Compromisso com uma sociedade mais justa

**No ministério:**
- Tratar todos com igualdade e respeito
- Não fazer acepção de pessoas
- Cumprir fielmente os compromissos assumidos

"Buscai primeiro o Reino de Deus e a sua justiça" (Mt 6,33)`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 2.2: ${spiritLesson2_2.title} (2 sections)`);
      }

      // Lesson 2.3: Fortaleza e Temperança
      const [spiritLesson2_3] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod2.id,
          trackId: 'spirituality-track-1',
          title: 'Virtudes Cardeais: Fortaleza e Temperança',
          description: 'Força nas dificuldades e domínio de si mesmo',
          lessonNumber: 3,
          durationMinutes: 15,
          orderIndex: 2,
          objectives: [
            'Desenvolver a fortaleza espiritual',
            'Praticar a temperança no dia a dia',
            'Vencer as tentações e provações'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson2_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_3.id,
            type: 'text',
            title: 'Fortaleza: Firmeza nas Dificuldades',
            content: `A fortaleza assegura, nas dificuldades, a firmeza e a constância na busca do bem.

**Duas dimensões:**
1. **Resistir**: Suportar as provações sem desanimar
2. **Atacar**: Enfrentar os obstáculos com coragem

**Manifestações:**
- Paciência no sofrimento
- Perseverança na oração
- Coragem para testemunhar a fé
- Firmeza diante das tentações

**No ministério:**
- Continuar servindo mesmo quando difícil
- Não desanimar com críticas ou incompreensões
- Manter-se fiel mesmo na aridez espiritual
- Ter coragem de corrigir quando necessário

"Tudo posso naquele que me fortalece" (Fl 4,13)`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson2_3.id,
            type: 'text',
            title: 'Temperança: Equilíbrio e Moderação',
            content: `A temperança modera a atração pelos prazeres sensíveis e assegura o domínio da vontade sobre os instintos.

**Áreas de exercício:**
- **Alimentação**: Comer e beber com moderação
- **Sono**: Descanso adequado sem preguiça
- **Diversão**: Lazer saudável e equilibrado
- **Sexualidade**: Vivida conforme estado de vida
- **Consumo**: Evitar materialismo e apego

**Virtudes relacionadas:**
- Humildade: Não se exaltar
- Mansidão: Dominar a ira
- Modéstia: Apresentação digna

**No ministério:**
- Vestir-se adequadamente
- Evitar excessos antes de servir
- Manter equilíbrio entre serviço e vida pessoal
- Não buscar reconhecimento ou destaque

"Sede sóbrios e vigiai" (1Pd 5,8)`,
            orderIndex: 1,
            estimatedMinutes: 7,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 2.3: ${spiritLesson2_3.title} (2 sections)`);
      }
    }

    // Module 3: Maria e os Santos
    const spiritModule3 = {
      trackId: 'spirituality-track-1',
      title: 'Maria e os Santos: Companheiros de Jornada',
      description: 'A comunhão dos santos e a intercessão de Maria',
      category: 'espiritualidade' as const,
      orderIndex: 2,
      estimatedDuration: 50,
      isActive: true,
      createdAt: new Date()
    };

    const [spiritMod3] = await db.insert(formationModules)
      .values(spiritModule3)
      .onConflictDoNothing()
      .returning();

    if (spiritMod3) {
      console.log(`  ✓ Module 3: ${spiritModule3.title}`);

      // Lesson 3.1: Maria, Mãe da Eucaristia
      const [spiritLesson3_1] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod3.id,
          trackId: 'spirituality-track-1',
          title: 'Maria, Mãe da Eucaristia',
          description: 'A relação de Maria com a Eucaristia e seu exemplo para nós',
          lessonNumber: 1,
          durationMinutes: 25,
          orderIndex: 0,
          objectives: [
            'Compreender o papel de Maria na Eucaristia',
            'Imitar as atitudes marianas',
            'Confiar na intercessão de Nossa Senhora'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson3_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson3_1.id,
            type: 'text',
            title: 'Maria e a Eucaristia',
            content: `Maria tem uma relação única com a Eucaristia:

**Ela é:**
- **Mãe da Eucaristia**: Gerou em seu ventre o Corpo que se tornou alimento
- **Primeira sagrário**: Guardou Jesus em seu corpo
- **Modelo eucarístico**: Viveu em comunhão perfeita com Cristo

São João Paulo II ensinou: "Maria pode guiar-nos para este Santíssimo Sacramento, porque tem com Ele uma relação profunda" (Ecclesia de Eucharistia, 53).

**A Visitação:**
Quando Maria leva Jesus a Isabel, é como uma "procissão eucarística". Ela nos ensina a levar Cristo aos outros.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson3_1.id,
            type: 'text',
            title: 'Atitudes Marianas para o Ministro',
            content: `**Fé:**
"Eis aqui a serva do Senhor" (Lc 1,38)
- Crer na palavra de Deus
- Aceitar os planos divinos
- Confiar mesmo sem compreender tudo

**Humildade:**
"Fez em mim grandes coisas" (Lc 1,49)
- Reconhecer tudo como dom de Deus
- Não buscar destaque pessoal
- Servir com simplicidade

**Disponibilidade:**
"Fazei tudo o que Ele vos disser" (Jo 2,5)
- Estar pronto para servir
- Obedecer com prontidão
- Indicar sempre Jesus, não a si mesmo

**Silêncio:**
"Maria guardava todas estas coisas no coração" (Lc 2,51)
- Contemplar os mistérios de Deus
- Discrição no serviço
- Oração silenciosa`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson3_1.id,
            type: 'text',
            title: 'Devoção Mariana do Ministro',
            content: `**Práticas recomendadas:**
- **Terço diário**: Meditar os mistérios com Maria
- **Angelus**: Três vezes ao dia
- **Consagração a Maria**: Entregar-se aos cuidados maternos
- **Escapulário**: Usar como sinal de proteção
- **Sábado mariano**: Dedicar especialmente à Nossa Senhora

**Oração antes do ministério:**
"Maria, Mãe da Eucaristia,
Ensina-me a amar teu Filho presente no Sacramento.
Dá-me tuas mãos puras para distribuir a Comunhão,
Tua humildade para servir,
E teu coração para adorar.
Que eu seja, como tu, portador de Jesus para o mundo.
Amém."

"A Virgem Maria com seu exemplo nos orienta para este Santíssimo Sacramento" (CIC 2674)`,
            orderIndex: 2,
            estimatedMinutes: 5,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 3.1: ${spiritLesson3_1.title} (3 sections)`);
      }

      // Lesson 3.2: Os Santos e o Ministério
      const [spiritLesson3_2] = await db.insert(formationLessons)
        .values({
          moduleId: spiritMod3.id,
          trackId: 'spirituality-track-1',
          title: 'Os Santos: Exemplos de Santidade',
          description: 'Aprendendo com os santos que amaram a Eucaristia',
          lessonNumber: 2,
          durationMinutes: 25,
          orderIndex: 1,
          objectives: [
            'Conhecer santos eucarísticos',
            'Aprender com seus exemplos',
            'Invocar sua intercessão'
          ],
          isActive: true,
          createdAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (spiritLesson3_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson3_2.id,
            type: 'text',
            title: 'Santos Eucarísticos',
            content: `Muitos santos se destacaram por seu amor à Eucaristia:

**São Tarsício (séc. III)**
- Mártir da Eucaristia
- Morreu protegendo o Santíssimo Sacramento
- Padroeiro dos coroinhas e ministros
- Exemplo de coragem e fidelidade

**São Francisco de Assis (1182-1226)**
- Profunda reverência à Eucaristia
- Dizia: "O homem deve tremer, o mundo estremecer e o céu alegrar-se quando Cristo está no altar"
- Insistia na dignidade dos vasos sagrados e do altar

**São Tomás de Aquino (1225-1274)**
- Doutor Eucarístico
- Escreveu hinos eucarísticos (Tantum Ergo, Pange Lingua)
- Dedicou sua inteligência a explicar o mistério eucarístico

**Santa Teresa de Calcutá (1910-1997)**
- Via Jesus nos pobres e na Eucaristia
- Dizia: "A Eucaristia está ligada à Paixão e à pobreza"
- Hora diária de adoração eucarística`,
            orderIndex: 0,
            estimatedMinutes: 12,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson3_2.id,
            type: 'text',
            title: 'Mais Santos para Inspirar',
            content: `**Santa Clara de Assis**
- Adoração perpétua em seu mosteiro
- Afastou inimigos expondo o Santíssimo

**São Pedro Julião Eymard**
- Fundador dos Sacramentinos
- "Apóstolo da Eucaristia"
- Promoveu a adoração eucarística

**Santo Padre Pio**
- Missas de várias horas por seu fervor
- Estigmas como união à Paixão de Cristo
- Ação de graças prolongada após a Missa

**Santa Faustina Kowalska**
- Visões de Jesus Eucarístico
- Ensinou sobre a misericórdia de Cristo presente na Eucaristia

Cada santo nos mostra um caminho para amar mais a Eucaristia!`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: new Date()
          },
          {
            lessonId: spiritLesson3_2.id,
            type: 'text',
            title: 'Comunhão dos Santos',
            content: `A Igreja é una: os que estão no céu, no purgatório e na terra formam uma só família.

**Intercessão dos santos:**
- Não adoramos os santos, mas os veneramos
- Pedimos sua intercessão junto a Deus
- Eles são nossos irmãos mais velhos na fé

**Como invocar os santos:**
- Escolher um santo patrono pessoal
- Conhecer sua vida e virtudes
- Imitá-los no amor a Cristo
- Pedir sua intercessão nas necessidades

**Oração de invocação:**
"São Tarsício, mártir da Eucaristia,
Intercede por nós, ministros extraordinários.
Dá-nos tua coragem para defender a fé,
Teu amor ao Santíssimo Sacramento,
E tua pureza de coração.
Que sejamos dignos de servir ao Corpo de Cristo.
Amém."`,
            orderIndex: 2,
            estimatedMinutes: 3,
            createdAt: new Date()
          }
        ]);
        console.log(`    ✓ Lesson 3.2: ${spiritLesson3_2.title} (3 sections)`);
      }
    }

    console.log('\n✅ Formation seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  • 2 tracks created');
    console.log('  • 6 modules created (3 per track)');
    console.log('  • 15 lessons created');
    console.log('  • Multiple sections per lesson');

    return {
      success: true,
      message: 'Formation content seeded successfully',
      stats: {
        tracks: 2,
        modules: 6,
        lessons: 15
      }
    };

  } catch (error) {
    console.error('❌ Error seeding formation:', error);
    throw error;
  }
}

// Export for use in API or standalone execution
export default seedFormation;
