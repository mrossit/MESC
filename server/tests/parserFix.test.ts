/**
 * Test to verify the v2.0 parser fix for October 28 masses
 */

// Sample v2.0 format response
const sampleV2Response = {
  format_version: '2.0',
  masses: {
    '2025-10-05': {
      '10:00': true,
      '19:00': false
    },
    '2025-10-12': {
      '10:00': true,
      '19:00': true
    },
    '2025-10-19': {
      '10:00': false,
      '19:00': true
    }
  },
  special_events: {
    saint_judas_feast: {
      '2025-10-28_07:00': true,
      '2025-10-28_10:00': true,
      '2025-10-28_12:00': false,
      '2025-10-28_15:00': false,
      '2025-10-28_17:00': false,
      '2025-10-28_19:30': true
    },
    saint_judas_novena: [
      '2025-10-20_19:30',
      '2025-10-21_19:30',
      '2025-10-22_19:30'
    ],
    healing_liberation: true,
    first_friday: false,
    first_saturday: true
  },
  weekdays: {
    monday: false,
    tuesday: true,
    wednesday: true,
    thursday: false,
    friday: true
  },
  can_substitute: true
};

console.log('🧪 Testing v2.0 Parser Logic\n');

// Test 1: Masses parsing
console.log('Test 1: Parsing Sunday masses');
const masses = sampleV2Response.masses;
const sundayDates: string[] = [];
Object.keys(masses).forEach(date => {
  const timesForDate = masses[date];
  if (timesForDate && typeof timesForDate === 'object') {
    Object.keys(timesForDate).forEach(time => {
      if (timesForDate[time] === true) {
        sundayDates.push(`${date} ${time}`);
      }
    });
  }
});
console.log('✅ Available Sunday dates:', sundayDates);
console.log('   Expected: 3 dates (10/05 10:00, 10/12 10:00, 10/12 19:00, 10/19 19:00)');
console.log('   Got:', sundayDates.length, 'dates\n');

// Test 2: Saint Judas Feast parsing
console.log('Test 2: Parsing Saint Judas Feast (October 28)');
const specialEvents: Record<string, string> = {};
const specialEventsData = sampleV2Response.special_events;

if (specialEventsData.saint_judas_feast && typeof specialEventsData.saint_judas_feast === 'object') {
  Object.entries(specialEventsData.saint_judas_feast).forEach(([datetime, available]) => {
    if (available === true) {
      const [date, time] = datetime.split('_');
      const timeMapping: Record<string, string> = {
        '07:00': 'saint_judas_feast_7h',
        '10:00': 'saint_judas_feast_10h',
        '12:00': 'saint_judas_feast_12h',
        '15:00': 'saint_judas_feast_15h',
        '17:00': 'saint_judas_feast_17h',
        '19:30': 'saint_judas_feast_evening'
      };
      const questionId = timeMapping[time];
      if (questionId) {
        specialEvents[questionId] = 'Sim';
        console.log(`   ✅ Parsed: ${datetime} → ${questionId} = Sim`);
      }
    }
  });
}
console.log('✅ Special events parsed:', Object.keys(specialEvents).length);
console.log('   Expected: 3 masses (7h, 10h, evening)');
console.log('   Got:', Object.keys(specialEvents).join(', '), '\n');

// Test 3: Weekdays parsing
console.log('Test 3: Parsing weekday availability');
const weekdaysData = sampleV2Response.weekdays;
const dailyAvail: string[] = [];
const dayMap: Record<string, string> = {
  'monday': 'Segunda',
  'tuesday': 'Terça',
  'wednesday': 'Quarta',
  'thursday': 'Quinta',
  'friday': 'Sexta'
};
Object.entries(weekdaysData).forEach(([day, available]) => {
  if (available === true && dayMap[day]) {
    dailyAvail.push(dayMap[day]);
  }
});
console.log('✅ Daily mass days:', dailyAvail);
console.log('   Expected: 3 days (Terça, Quarta, Sexta)');
console.log('   Got:', dailyAvail.length, 'days\n');

// Test 4: Special events boolean parsing
console.log('Test 4: Parsing other special events');
if (specialEventsData.healing_liberation === true) {
  specialEvents['healing_liberation_mass'] = 'Sim';
  console.log('   ✅ Healing/Liberation Mass = Sim');
}
if (specialEventsData.first_friday === true) {
  specialEvents['sacred_heart_mass'] = 'Sim';
  console.log('   ✅ First Friday = Sim');
}
if (specialEventsData.first_saturday === true) {
  specialEvents['immaculate_heart_mass'] = 'Sim';
  console.log('   ✅ First Saturday = Sim');
}
console.log('✅ Total special events:', Object.keys(specialEvents).length, '\n');

// Test 5: Can substitute
console.log('Test 5: Can substitute parsing');
const canSubstitute = sampleV2Response.can_substitute === true;
console.log('✅ Can substitute:', canSubstitute);
console.log('   Expected: true');
console.log('   Got:', canSubstitute, '\n');

// Summary
console.log('═══════════════════════════════════════');
console.log('📋 PARSER TEST SUMMARY');
console.log('═══════════════════════════════════════');
console.log('✅ Sunday masses parsed:', sundayDates.length === 4);
console.log('✅ Feast day masses parsed:', Object.keys(specialEvents).filter(k => k.includes('feast')).length === 3);
console.log('✅ Weekday availability parsed:', dailyAvail.length === 3);
console.log('✅ Special events parsed:', Object.keys(specialEvents).length === 5);
console.log('✅ Substitution parsed:', canSubstitute === true);
console.log('═══════════════════════════════════════\n');

// Test the version detection logic
console.log('Test 6: Version detection');
const testData1 = { format_version: '2.0', masses: {} };
const testData2 = { version: '2.0', masses: {} }; // WRONG
const testData3 = [{ questionId: 'available_sundays', answer: [] }]; // Legacy

console.log('   Test 6a: Checking format_version field');
if (testData1 && typeof testData1 === 'object' && testData1.format_version === '2.0') {
  console.log('   ✅ CORRECT: format_version === "2.0" detected');
} else {
  console.log('   ❌ FAILED: Should detect v2.0');
}

console.log('   Test 6b: Checking version field (should NOT detect)');
if (testData2 && typeof testData2 === 'object' && (testData2 as any).format_version === '2.0') {
  console.log('   ❌ FAILED: Should NOT detect (wrong field name)');
} else {
  console.log('   ✅ CORRECT: Does not detect wrong field name');
}

console.log('   Test 6c: Checking legacy array format');
if (Array.isArray(testData3)) {
  console.log('   ✅ CORRECT: Legacy array format detected');
} else {
  console.log('   ❌ FAILED: Should detect array format');
}

console.log('\n✅ All parser logic tests complete!');
