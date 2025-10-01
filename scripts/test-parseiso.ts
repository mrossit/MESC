import { parseISO, isSameDay } from 'date-fns';

console.log("🔍 Testing parseISO behavior...\n");

// Simulate what comes from API
const apiDate = "2025-10-01";  // This is what Drizzle returns

// Parse it
const parsed = parseISO(apiDate);
console.log(`API date string: "${apiDate}"`);
console.log(`Parsed date: ${parsed}`);
console.log(`Parsed ISO: ${parsed.toISOString()}`);
console.log(`Parsed getDate(): ${parsed.getDate()}`);
console.log(`Parsed getMonth(): ${parsed.getMonth() + 1}`);

console.log("\n---\n");

// Test what the calendar is passing
const calendarDate = new Date(2025, 9, 1); // October 1st (month is 0-indexed)
console.log(`Calendar date (new Date(2025, 9, 1)):`);
console.log(`  toString: ${calendarDate}`);
console.log(`  toISOString: ${calendarDate.toISOString()}`);
console.log(`  getDate(): ${calendarDate.getDate()}`);
console.log(`  getMonth(): ${calendarDate.getMonth() + 1}`);

console.log("\n---\n");

// Test comparison
console.log(`isSameDay(parsed, calendarDate): ${isSameDay(parsed, calendarDate)}`);

console.log("\n---\n");

// Test the split scenario
const apiDateWithTime = "2025-10-01T00:00:00.000Z";
const splitParsed = parseISO(apiDateWithTime.split('T')[0]);
console.log(`API date with time: "${apiDateWithTime}"`);
console.log(`Split and parsed: ${splitParsed.toISOString()}`);
console.log(`isSameDay with calendar: ${isSameDay(splitParsed, calendarDate)}`);
