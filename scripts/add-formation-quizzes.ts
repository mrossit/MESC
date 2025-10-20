import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addFormationQuizzes() {
  console.log('🎯 Adicionando quizzes às lições de formação...\n');

  try {
    // Quiz para a lição "O Sacramento da Eucaristia" do módulo "A Eucaristia na Igreja"
    const eucharistLesson = await db.execute(sql`
      SELECT l.id, l.title, m.title as module_title
      FROM formation_lessons l
      JOIN formation_modules m ON l.module_id = m.id
      WHERE l.title = 'O Sacramento da Eucaristia'
      AND m.title = 'A Eucaristia na Igreja'
      LIMIT 1
    `);

    if (eucharistLesson.rows.length > 0) {
      const lessonId = (eucharistLesson.rows[0] as any).id;
      console.log(`📝 Lição encontrada: ${(eucharistLesson.rows[0] as any).title}`);

      const quizData = {
        title: "Avaliação: A Sagrada Eucaristia",
        description: "Teste seus conhecimentos sobre o Sacramento da Eucaristia",
        passingScore: 70,
        questions: [
          {
            id: "q1",
            question: "Quando Jesus instituiu o Sacramento da Eucaristia?",
            options: [
              "No Monte das Oliveiras",
              "Na Última Ceia, na noite em que foi entregue",
              "Após a Ressurreição",
              "No dia de Pentecostes"
            ],
            correctAnswer: 1,
            explanation: "Jesus instituiu a Eucaristia na Última Ceia, na noite em que foi entregue, como memorial de sua paixão, morte e ressurreição (1 Cor 11,23-25)."
          },
          {
            id: "q2",
            question: "O que significa a Presença Real de Cristo na Eucaristia?",
            options: [
              "Cristo está presente apenas simbolicamente",
              "Cristo está presente espiritualmente, mas não fisicamente",
              "Cristo está verdadeira, real e substancialmente presente",
              "A Eucaristia é apenas uma lembrança de Cristo"
            ],
            correctAnswer: 2,
            explanation: "A Igreja ensina que Jesus Cristo está verdadeira, real e substancialmente presente na Eucaristia sob as espécies do pão e do vinho. Esta é uma verdade de fé que devemos acolher com profunda reverência."
          },
          {
            id: "q3",
            question: "O que acontece quando recebemos a Sagrada Comunhão?",
            options: [
              "Apenas lembramos de Jesus",
              "Participamos do Corpo e Sangue de Cristo e nos unimos a Ele",
              "Recebemos apenas uma bênção",
              "É apenas um ritual sem efeito espiritual"
            ],
            correctAnswer: 1,
            explanation: "Ao recebermos a Sagrada Comunhão, participamos do Corpo e Sangue de Cristo, unindo-nos intimamente a Ele e tornando-nos membros de seu Corpo Místico, que é a Igreja."
          },
          {
            id: "q4",
            question: "Qual é o significado das palavras 'Fazei isto em memória de mim'?",
            options: [
              "Devemos apenas lembrar de Jesus",
              "Cristo institui o Sacramento e ordena sua perpétua celebração",
              "É apenas uma sugestão, não um mandamento",
              "Refere-se apenas à oração"
            ],
            correctAnswer: 1,
            explanation: "As palavras 'Fazei isto em memória de mim' instituem o Sacramento da Eucaristia e ordenam sua perpétua celebração na Igreja até o fim dos tempos."
          },
          {
            id: "q5",
            question: "Por que a Eucaristia é chamada de 'fonte e ápice' da vida cristã?",
            options: [
              "Porque é o primeiro sacramento que recebemos",
              "Porque é o sacramento mais importante e central da fé",
              "Porque é celebrada aos domingos",
              "Porque é fácil de receber"
            ],
            correctAnswer: 1,
            explanation: "A Eucaristia é o centro e ápice da vida cristã porque nela Cristo está realmente presente e nos une a Si e à comunidade dos fiéis, fortalecendo nossa fé e missão."
          }
        ]
      };

      // Adicionar seção de quiz à lição
      await db.execute(sql`
        INSERT INTO formation_lesson_sections (
          lesson_id,
          type,
          title,
          content,
          quiz_data,
          order_index,
          is_required,
          estimated_minutes
        ) VALUES (
          ${lessonId},
          'quiz',
          'Quiz de Avaliação',
          'Teste seus conhecimentos sobre a Sagrada Eucaristia. É necessário obter pelo menos 70% de acerto para concluir esta aula.',
          ${JSON.stringify(quizData)}::jsonb,
          10,
          true,
          10
        )
        ON CONFLICT DO NOTHING
      `);

      console.log('✅ Quiz adicionado à lição "O Sacramento da Eucaristia"');
    } else {
      console.log('⚠️  Lição não encontrada');
    }

    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addFormationQuizzes();
