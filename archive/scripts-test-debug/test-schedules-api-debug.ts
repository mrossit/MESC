import fetch from 'node-fetch';

async function testSchedulesAPI() {
  try {
    console.log("🔍 Testing schedules API for October 2025...\n");

    // Test the monthly endpoint
    const monthResponse = await fetch('http://localhost:5000/api/schedules?month=10&year=2025', {
      headers: {
        'Cookie': 'connect.sid=test' // Mock auth - won't work but let's see the error
      }
    });

    if (monthResponse.ok) {
      const data = await monthResponse.json();
      console.log("📅 Monthly schedules response:");
      console.log(`Total assignments: ${data.assignments?.length || 0}\n`);

      // Group by date
      const byDate = (data.assignments || []).reduce((acc: any, a: any) => {
        const dateStr = typeof a.date === 'string' ? a.date.split('T')[0] : a.date;
        if (!acc[dateStr]) acc[dateStr] = 0;
        acc[dateStr]++;
        return acc;
      }, {});

      console.log("Assignments by date:");
      Object.entries(byDate).sort().forEach(([date, count]) => {
        console.log(`  ${date}: ${count} assignments`);
      });

      // Show first 5 assignments to see date format
      console.log("\nFirst 5 assignments (date format check):");
      (data.assignments || []).slice(0, 5).forEach((a: any) => {
        console.log(`  - Date: ${a.date} (type: ${typeof a.date})`);
      });
    } else {
      console.log("❌ Monthly endpoint returned:", monthResponse.status);
      const text = await monthResponse.text();
      console.log("Response:", text.substring(0, 200));
    }

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testSchedulesAPI();
