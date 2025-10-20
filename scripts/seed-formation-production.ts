/**
 * Script to seed formation data directly to production database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import {
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function seedFormationProduction() {
  console.log('🌱 Iniciando seed de formação no banco de produção...\n');

  try {
    // Setup connection
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });
    const db = drizzle({ client: pool });

    console.log('✅ Conectado ao banco de produção\n');
    console.log('📚 Criando trilhas de formação...\n');

    // ========================================
    // TRACKS
    // ========================================

    const trackLiturgyId = randomUUID();
    const trackSpiritualityId = randomUUID();

    const tracks = [
      {
        id: trackLiturgyId,
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
        id: trackSpiritualityId,
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

    for (const track of tracks) {
      await db.insert(formationTracks).values(track).onConflictDoNothing();
      console.log(`  ✓ Trilha criada: ${track.title}`);
    }

    console.log('\n📖 Criando módulo de Liturgia...\n');

    // ========================================
    // MODULE 1 - LITURGY: A Eucaristia na Igreja
    // ========================================

    const moduleId = randomUUID();
    const lessonId = randomUUID();

    const liturgyModule1 = {
      id: moduleId,
      trackId: trackLiturgyId,
      title: 'A Eucaristia na Igreja',
      description: 'Fundamentos teológicos e históricos da celebração eucarística',
      category: 'liturgia' as const,
      orderIndex: 0,
      durationMinutes: 90,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(formationModules).values(liturgyModule1).onConflictDoNothing();
    console.log(`  ✓ Módulo: ${liturgyModule1.title}`);

    // Lesson 1.1
    const lesson1_1 = {
      id: lessonId,
      moduleId: moduleId,
      trackId: trackLiturgyId,
      title: 'O Sacramento da Eucaristia',
      description: 'Compreendendo a Eucaristia como fonte e ápice da vida cristã',
      lessonNumber: 1,
      durationMinutes: 30,
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(formationLessons).values(lesson1_1).onConflictDoNothing();
    console.log(`    ✓ Aula: ${lesson1_1.title}`);

    // Sections for lesson 1.1
    const sections1_1 = [
      {
        id: randomUUID(),
        lessonId: lessonId,
        type: 'text' as const,
        title: 'Introdução',
        content: `A Eucaristia é o sacramento central da vida cristã. Como ensina o Catecismo da Igreja Católica (CIC 1324): "A Eucaristia é fonte e ápice de toda a vida cristã".

Neste sacramento, Jesus Cristo se faz presente de modo único e especial, oferecendo-se ao Pai em sacrifício e dando-se a nós como alimento espiritual.`,
        orderIndex: 0,
        estimatedMinutes: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        lessonId: lessonId,
        type: 'text' as const,
        title: 'A Instituição da Eucaristia',
        content: `Na última ceia, Jesus instituiu a Eucaristia dizendo: "Isto é o meu corpo que é dado por vós; fazei isto em memória de mim" (Lc 22,19).

A Eucaristia é memorial da Páscoa de Cristo, ou seja, torna presente e atual o sacrifício único de Cristo na cruz. Não é uma simples lembrança, mas uma presença real e eficaz.`,
        orderIndex: 1,
        estimatedMinutes: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        lessonId: lessonId,
        type: 'text' as const,
        title: 'A Presença Real',
        content: `A Igreja professa a fé na presença real de Cristo na Eucaristia. Pelo poder do Espírito Santo e pelas palavras de Cristo, o pão e o vinho se tornam verdadeiramente o Corpo e o Sangue de Cristo.

Esta transformação é chamada de "transubstanciação". O Concílio de Trento afirma que Cristo está presente "verdadeira, real e substancialmente" na Eucaristia.`,
        orderIndex: 2,
        estimatedMinutes: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        lessonId: lessonId,
        type: 'text' as const,
        title: 'Reflexão Final',
        content: `Como Ministros Extraordinários da Sagrada Comunhão, somos chamados a servir com profunda reverência, reconhecendo que tocamos e distribuímos o Corpo de Cristo.

Nossa fé na presença real deve se manifestar em nossos gestos, palavras e atitudes durante o serviço litúrgico.`,
        orderIndex: 3,
        estimatedMinutes: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const section of sections1_1) {
      await db.insert(formationLessonSections).values(section).onConflictDoNothing();
    }
    console.log(`      ✓ 4 seções criadas`);

    console.log('\n✅ Seed básico completado com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('  • 2 trilhas criadas');
    console.log('  • 1 módulo criado');
    console.log('  • 1 aula criada');
    console.log('  • 4 seções criadas');

    // Verify
    const tracksCount = await pool.query('SELECT COUNT(*) FROM formation_tracks');
    const modulesCount = await pool.query('SELECT COUNT(*) FROM formation_modules');
    const lessonsCount = await pool.query('SELECT COUNT(*) FROM formation_lessons');
    const sectionsCount = await pool.query('SELECT COUNT(*) FROM formation_lesson_sections');

    console.log('\n🔍 Verificação:');
    console.log(`  • Trilhas no banco: ${tracksCount.rows[0].count}`);
    console.log(`  • Módulos no banco: ${modulesCount.rows[0].count}`);
    console.log(`  • Aulas no banco: ${lessonsCount.rows[0].count}`);
    console.log(`  • Seções no banco: ${sectionsCount.rows[0].count}`);

    // Close connection
    await pool.end();

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
    throw error;
  }
}

// Run the script
import { fileURLToPath } from 'url';

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedFormationProduction()
    .then(() => {
      console.log('\n🎉 Script finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { seedFormationProduction };
