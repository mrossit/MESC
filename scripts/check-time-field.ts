import { db } from '../server/db';
import { schedules } from '../shared/schema';

async function checkTimeField() {
  try {
    const [schedule] = await db.select().from(schedules).limit(1);
    console.log('Sample schedule:', JSON.stringify(schedule, null, 2));
    console.log('Time field type:', typeof schedule?.time);
    console.log('Time field value:', schedule?.time);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkTimeField();
