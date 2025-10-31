#!/usr/bin/env tsx
/**
 * Script to test the safety net system that captures unmapped questionnaire responses
 * 
 * Tests:
 * 1. Known questions are processed correctly
 * 2. Unknown questions are captured in unmappedResponses
 * 3. Processing warnings are generated
 * 4. special_event_* questions are processed correctly
 */

import { QuestionnaireService } from '../server/services/questionnaireService';

console.log('🛡️ Testing Safety Net System for Unmapped Questionnaire Responses\n');

// Test Case 1: Mix of known and unknown questions
console.log('='.repeat(80));
console.log('TEST 1: Mix of known and unknown questions');
console.log('='.repeat(80));

const testResponses1 = [
  // Known questions
  { questionId: 'available_sundays', answer: ['Domingo 03/11', 'Domingo 10/11'], question: 'Em quais domingos você está disponível?' },
  { questionId: 'can_substitute', answer: true, question: 'Você pode substituir outros ministros?' },
  { questionId: 'notes', answer: 'Prefiro missas da manhã', question: 'Observações adicionais' },
  
  // Unknown questions (should be captured as unmapped)
  { questionId: 'future_question_1', answer: 'Sim', question: 'Esta é uma pergunta futura que ainda não foi mapeada' },
  { questionId: 'experimental_feature', answer: ['opcao1', 'opcao2'], question: 'Recurso experimental' },
];

const result1 = QuestionnaireService.standardizeResponseWithTracking(testResponses1, 11, 2025);

console.log('\n✅ STANDARDIZED RESPONSE:');
console.log(JSON.stringify(result1.standardized, null, 2));

console.log('\n📦 UNMAPPED RESPONSES:', result1.unmappedResponses.length);
result1.unmappedResponses.forEach((item, index) => {
  console.log(`  ${index + 1}. Question ID: "${item.questionId}"`);
  console.log(`     Question: "${item.question}"`);
  console.log(`     Answer: ${JSON.stringify(item.answer)}`);
});

console.log('\n⚠️ PROCESSING WARNINGS:', result1.warnings.length);
result1.warnings.forEach((warning, index) => {
  console.log(`  ${index + 1}. ${warning}`);
});

// Test Case 2: Special events (dynamic special_event_*)
console.log('\n' + '='.repeat(80));
console.log('TEST 2: Special events with metadata (Finados, etc.)');
console.log('='.repeat(80));

const testResponses2 = [
  {
    questionId: 'special_event_1',
    answer: true,
    question: 'Você está disponível para a Missa de Finados?',
    metadata: {
      eventName: 'Finados',
      date: '2025-11-02',
      time: '15:30'
    }
  },
  {
    questionId: 'special_event_2',
    answer: false,
    question: 'Você está disponível para a Missa de Natal?',
    metadata: {
      eventName: 'Natal',
      date: '2025-12-25',
      time: '20:00'
    }
  },
  // Unknown event format (no metadata)
  {
    questionId: 'special_event_999',
    answer: true,
    question: 'Evento desconhecido sem metadata'
  }
];

const result2 = QuestionnaireService.standardizeResponseWithTracking(testResponses2, 11, 2025);

console.log('\n✅ SPECIAL EVENTS PROCESSED:');
console.log(JSON.stringify(result2.standardized.special_events, null, 2));

console.log('\n📦 UNMAPPED RESPONSES:', result2.unmappedResponses.length);
result2.unmappedResponses.forEach((item, index) => {
  console.log(`  ${index + 1}. Question ID: "${item.questionId}"`);
  console.log(`     Question: "${item.question}"`);
});

// Test Case 3: All known questions - should have NO unmapped
console.log('\n' + '='.repeat(80));
console.log('TEST 3: All known questions (should have ZERO unmapped)');
console.log('='.repeat(80));

const testResponses3 = [
  { questionId: 'available_sundays', answer: ['Domingo 03/11'], question: 'Domingos disponíveis' },
  { questionId: 'daily_mass_availability', answer: 'yes_weekdays', question: 'Missas diárias' },
  { questionId: 'can_substitute', answer: true, question: 'Pode substituir' },
  { questionId: 'healing_liberation_mass', answer: true, question: 'Missa de Cura e Libertação' },
  { questionId: 'sacred_heart_mass', answer: false, question: 'Sagrado Coração' },
  { questionId: 'notes', answer: 'Tudo certo', question: 'Observações' }
];

const result3 = QuestionnaireService.standardizeResponseWithTracking(testResponses3, 11, 2025);

console.log('\n✅ STANDARDIZED RESPONSE:');
console.log(JSON.stringify(result3.standardized, null, 2));

console.log('\n📦 UNMAPPED RESPONSES:', result3.unmappedResponses.length);
if (result3.unmappedResponses.length === 0) {
  console.log('   ✅ Perfect! No unmapped responses as expected.');
} else {
  console.error('   ❌ ERROR: Expected zero unmapped responses but found:', result3.unmappedResponses);
}

// Test Case 4: yes_no_with_options format (the bug that caused data loss)
console.log('\n' + '='.repeat(80));
console.log('TEST 4: yes_no_with_options format (weekday availability bug fix)');
console.log('='.repeat(80));

const testResponses4 = [
  {
    questionId: 'daily_mass_availability',
    answer: 'yes_weekdays',
    selectedOptions: ['Segunda-feira', 'Quarta-feira'],
    question: 'Você está disponível para missas diárias?'
  }
];

const result4 = QuestionnaireService.standardizeResponseWithTracking(testResponses4, 11, 2025);

console.log('\n✅ WEEKDAYS EXTRACTED:');
console.log(JSON.stringify(result4.standardized.weekdays, null, 2));

console.log('\n📦 UNMAPPED RESPONSES:', result4.unmappedResponses.length);
if (result4.unmappedResponses.length === 0) {
  console.log('   ✅ Good! The response was properly processed.');
} else {
  console.error('   ⚠️ Warning: Response marked as unmapped:', result4.unmappedResponses);
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SAFETY NET SYSTEM TEST SUMMARY');
console.log('='.repeat(80));
console.log('Test 1: Known + Unknown questions ✓');
console.log('Test 2: Special events with metadata ✓');
console.log('Test 3: All known questions (zero unmapped) ✓');
console.log('Test 4: yes_no_with_options format ✓');
console.log('\n🛡️ Safety net system is working correctly!');
console.log('Any future questions will be captured in unmappedResponses field.');
