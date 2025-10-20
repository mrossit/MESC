/**
 * Script to fix formation track IDs in production to match frontend hardcoded links
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function fixFormationIds() {
  console.log('🔧 Corrigindo IDs das trilhas de formação...\n');

  try {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // First, delete all existing tracks and related data
    console.log('🗑️  Limpando dados antigos...\n');
    await pool.query('DELETE FROM formation_lesson_sections');
    await pool.query('DELETE FROM formation_lessons');
    await pool.query('DELETE FROM formation_modules');
    await pool.query('DELETE FROM formation_tracks');
    console.log('  ✓ Dados antigos removidos\n');

    // Create tracks with fixed IDs that match frontend links
    console.log('📚 Criando trilhas com IDs corretos...\n');

    await pool.query(`
      INSERT INTO formation_tracks (id, title, description, category, icon, order_index, is_active, created_at, updated_at)
      VALUES
        ('liturgy', 'Formação Litúrgica Básica', 'Fundamentos da liturgia eucarística e orientações práticas para Ministros Extraordinários da Sagrada Comunhão', 'liturgia', 'Cross', 0, true, NOW(), NOW()),
        ('spirituality', 'Formação Espiritual', 'Aprofundamento na espiritualidade eucarística e na vida de oração do ministro', 'espiritualidade', 'Heart', 1, true, NOW(), NOW())
    `);
    console.log('  ✓ Trilha: Formação Litúrgica Básica (ID: liturgy)');
    console.log('  ✓ Trilha: Formação Espiritual (ID: spirituality)\n');

    // Create a module for liturgy track
    const moduleResult = await pool.query(`
      INSERT INTO formation_modules (id, track_id, title, description, category, order_index, duration_minutes, created_at)
      VALUES (gen_random_uuid(), 'liturgy', 'A Eucaristia na Igreja', 'Fundamentos teológicos e históricos da celebração eucarística', 'liturgia', 0, 90, NOW())
      RETURNING id
    `);
    const moduleId = moduleResult.rows[0].id;
    console.log(`📖 Módulo criado: A Eucaristia na Igreja (ID: ${moduleId})\n`);

    // Create a lesson
    const lessonResult = await pool.query(`
      INSERT INTO formation_lessons (id, module_id, track_id, title, description, lesson_number, duration_minutes, order_index, created_at)
      VALUES (gen_random_uuid(), $1, 'liturgy', 'O Sacramento da Eucaristia', 'Compreendendo a Eucaristia como fonte e ápice da vida cristã', 1, 30, 0, NOW())
      RETURNING id
    `, [moduleId]);
    const lessonId = lessonResult.rows[0].id;
    console.log(`📝 Aula criada: O Sacramento da Eucaristia (ID: ${lessonId})\n`);

    // Create sections
    await pool.query(`
      INSERT INTO formation_lesson_sections (id, lesson_id, type, title, content, order_index, estimated_minutes, created_at)
      VALUES
        (gen_random_uuid(), $1, 'text', 'Introdução', 'A Eucaristia é o sacramento central da vida cristã. Como ensina o Catecismo da Igreja Católica (CIC 1324): "A Eucaristia é fonte e ápice de toda a vida cristã".

Neste sacramento, Jesus Cristo se faz presente de modo único e especial, oferecendo-se ao Pai em sacrifício e dando-se a nós como alimento espiritual.', 0, 5, NOW()),
        (gen_random_uuid(), $1, 'text', 'A Instituição da Eucaristia', 'Na última ceia, Jesus instituiu a Eucaristia dizendo: "Isto é o meu corpo que é dado por vós; fazei isto em memória de mim" (Lc 22,19).

A Eucaristia é memorial da Páscoa de Cristo, ou seja, torna presente e atual o sacrifício único de Cristo na cruz. Não é uma simples lembrança, mas uma presença real e eficaz.', 1, 10, NOW()),
        (gen_random_uuid(), $1, 'text', 'A Presença Real', 'A Igreja professa a fé na presença real de Cristo na Eucaristia. Pelo poder do Espírito Santo e pelas palavras de Cristo, o pão e o vinho se tornam verdadeiramente o Corpo e o Sangue de Cristo.

Esta transformação é chamada de "transubstanciação". O Concílio de Trento afirma que Cristo está presente "verdadeira, real e substancialmente" na Eucaristia.', 2, 10, NOW()),
        (gen_random_uuid(), $1, 'text', 'Reflexão Final', 'Como Ministros Extraordinários da Sagrada Comunhão, somos chamados a servir com profunda reverência, reconhecendo que tocamos e distribuímos o Corpo de Cristo.

Nossa fé na presença real deve se manifestar em nossos gestos, palavras e atitudes durante o serviço litúrgico.', 3, 5, NOW())
    `, [lessonId]);
    console.log('  ✓ 4 seções criadas\n');

    // Verify
    const tracksCount = await pool.query('SELECT COUNT(*) FROM formation_tracks');
    const modulesCount = await pool.query('SELECT COUNT(*) FROM formation_modules');
    const lessonsCount = await pool.query('SELECT COUNT(*) FROM formation_lessons');
    const sectionsCount = await pool.query('SELECT COUNT(*) FROM formation_lesson_sections');

    console.log('📊 Verificação final:');
    console.log(`  • Trilhas: ${tracksCount.rows[0].count}`);
    console.log(`  • Módulos: ${modulesCount.rows[0].count}`);
    console.log(`  • Aulas: ${lessonsCount.rows[0].count}`);
    console.log(`  • Seções: ${sectionsCount.rows[0].count}\n`);

    console.log('✅ IDs corrigidos com sucesso!');
    console.log('   Links do frontend agora funcionarão:');
    console.log('   - /formation/liturgy ✓');
    console.log('   - /formation/spirituality ✓');

    await pool.end();

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  }
}

// Run
import { fileURLToPath } from 'url';
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  fixFormationIds()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { fixFormationIds };
