#!/usr/bin/env node

/**
 * Script de debug para API de santos
 * Testa diretamente a função implementada
 */

// Simular a data
const today = new Date();
const day = String(today.getDate()).padStart(2, '0');
const month = String(today.getMonth() + 1).padStart(2, '0');
const feastDay = `${month}-${day}`;

console.log('=== DEBUG: API de Santos ===');
console.log(`Data: ${day}/${month}/${today.getFullYear()}`);
console.log(`feastDay: ${feastDay}`);
console.log('');

// Simular santos padrão
const defaultSaints = {
  '10-25': {
    id: 'default-10-25',
    name: 'Santo Antônio de Santana Galvão (Frei Galvão)',
    feastDay: '10-25',
  },
  '10-26': {
    id: 'default-10-26',
    name: 'Santo Evaristo',
    feastDay: '10-26',
  }
};

console.log('Santos padrão disponíveis:', Object.keys(defaultSaints));
console.log('');

const defaultSaint = defaultSaints[feastDay];
if (defaultSaint) {
  console.log('✅ Santo encontrado para hoje:', defaultSaint.name);
  console.log('Dados:', JSON.stringify(defaultSaint, null, 2));
} else {
  console.log('❌ Nenhum santo padrão para', feastDay);
  console.log('');
  console.log('Testando santo genérico...');

  function getMonthName(month) {
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return monthNames[month - 1] || 'desconhecido';
  }

  const genericSaint = {
    id: `generic-${feastDay}`,
    name: `Santo do Dia ${day}/${month}`,
    feastDay,
    biography: `Hoje, dia ${day} de ${getMonthName(parseInt(month))}, a Igreja celebra a memória dos santos e santas deste dia.`,
  };

  console.log('✅ Santo genérico criado:', genericSaint.name);
  console.log('Dados:', JSON.stringify(genericSaint, null, 2));
}
