import { getMassTimesForDate } from "../shared/constants";

// Test different dates
const testDates = [
  new Date('2025-10-01'), // Wednesday
  new Date('2025-10-04'), // Saturday (first Saturday)
  new Date('2025-10-11'), // Saturday (second Saturday - should be empty)
  new Date('2025-10-20'), // Monday during novena
  new Date('2025-10-24'), // Friday during novena
];

testDates.forEach(date => {
  const times = getMassTimesForDate(date);
  console.log(`${date.toDateString()}: ${JSON.stringify(times)}`);
});
