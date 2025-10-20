import { getFormationOverview } from '../server/services/formationService';

async function testFormationAPI() {
  console.log('🧪 Testing Formation API...\n');

  try {
    console.log('📊 Calling getFormationOverview()...');
    const result = await getFormationOverview();

    console.log('\n✅ Success! Overview data:');
    console.log('Tracks:', result.tracks.length);
    console.log('Total modules:', result.summary.totalModules);
    console.log('Total lessons:', result.summary.totalLessons);

    result.tracks.forEach((track, i) => {
      console.log(`\n📚 Track ${i + 1}: ${track.title}`);
      console.log(`   - Modules: ${track.stats.totalModules}`);
      console.log(`   - Lessons: ${track.stats.totalLessons}`);

      track.modules.forEach((module, j) => {
        console.log(`   📖 Module ${j + 1}: ${module.title} (${module.lessons.length} lessons)`);
      });
    });

    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFormationAPI();
