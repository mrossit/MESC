/**
 * Script to check formation data in production database
 */

// Production database URL
const PRODUCTION_DB_URL = 'postgresql://neondb_owner:npg_3QKylioran9V@ep-lingering-firefly-afak5e6q.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require';

async function checkFormationData() {
  console.log('🔍 Verificando dados de formação no banco de produção...\n');

  try {
    // Import dependencies
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = await import('ws');

    // Setup connection
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: PRODUCTION_DB_URL });

    console.log('✅ Conectado ao banco de produção\n');

    // Check tracks
    const tracksResult = await pool.query('SELECT COUNT(*) FROM formation_tracks');
    console.log(`📚 Trilhas de formação: ${tracksResult.rows[0].count}`);

    const tracksData = await pool.query('SELECT * FROM formation_tracks ORDER BY order_index');
    if (tracksData.rows.length > 0) {
      console.log('\nTrilhas cadastradas:');
      tracksData.rows.forEach((track: any) => {
        console.log(`   - ${track.title} (${track.category}) - Ativo: ${track.is_active}`);
      });
    }

    // Check modules
    const modulesResult = await pool.query('SELECT COUNT(*) FROM formation_modules');
    console.log(`\n📖 Módulos de formação: ${modulesResult.rows[0].count}`);

    const modulesData = await pool.query('SELECT * FROM formation_modules ORDER BY track_id, order_index LIMIT 10');
    if (modulesData.rows.length > 0) {
      console.log('\nMódulos cadastrados (primeiros 10):');
      modulesData.rows.forEach((module: any) => {
        console.log(`   - ${module.title} (Track: ${module.track_id})`);
      });
    }

    // Check lessons
    const lessonsResult = await pool.query('SELECT COUNT(*) FROM formation_lessons');
    console.log(`\n📝 Aulas de formação: ${lessonsResult.rows[0].count}`);

    const lessonsData = await pool.query('SELECT * FROM formation_lessons ORDER BY module_id, lesson_number LIMIT 10');
    if (lessonsData.rows.length > 0) {
      console.log('\nAulas cadastradas (primeiras 10):');
      lessonsData.rows.forEach((lesson: any) => {
        console.log(`   - Aula ${lesson.lesson_number}: ${lesson.title} (Módulo: ${lesson.module_id})`);
      });
    }

    // Check sections
    const sectionsResult = await pool.query('SELECT COUNT(*) FROM formation_lesson_sections');
    console.log(`\n📄 Seções de aulas: ${sectionsResult.rows[0].count}`);

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'formation%'
      ORDER BY table_name
    `);

    console.log('\n📋 Tabelas de formação:');
    tablesResult.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });

    // Close connection
    await pool.end();

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  }
}

// Run the script
import { fileURLToPath } from 'url';

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  checkFormationData()
    .then(() => {
      console.log('\n✅ Verificação concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script falhou:', error);
      process.exit(1);
    });
}

export { checkFormationData };
