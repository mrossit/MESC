// Test production schedules API
import { getMassTimesForDate } from "../shared/constants";

console.log("🔍 Testing Production Schedules API\n");

// Test date calculations
const testDates = [
  new Date('2025-10-01'),  // Wed
  new Date('2025-10-04'),  // Sat (first)
  new Date('2025-10-11'),  // Sat (second - should be empty)
  new Date('2025-10-20'),  // Mon (novena)
  new Date('2025-10-24'),  // Fri (novena)
];

console.log("📅 Testing getMassTimesForDate in different scenarios:\n");

testDates.forEach(date => {
  const times = getMassTimesForDate(date);
  console.log(`${date.toDateString()}:`);
  console.log(`  - Day of week: ${date.getDay()}`);
  console.log(`  - Day of month: ${date.getDate()}`);
  console.log(`  - Month: ${date.getMonth() + 1}`);
  console.log(`  - Mass times: ${JSON.stringify(times)}`);
  console.log(`  - Empty array: ${times.length === 0 ? 'YES ⚠️' : 'NO'}\n`);
});

// Check if empty arrays could cause React rendering issues
console.log("\n⚠️  POTENTIAL ISSUE:");
console.log("If getMassTimesForDate() returns empty array [], React might have issues");
console.log("rendering the calendar days with no mass times.");
console.log("\n💡 SOLUTION: Check if calendar rendering handles empty arrays correctly");
