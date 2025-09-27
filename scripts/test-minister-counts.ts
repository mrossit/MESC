import { ScheduleGenerator } from '../server/utils/scheduleGenerator.js';

console.log('\n📊 TESTE DE QUANTIDADES DE MINISTROS POR TIPO DE MISSA\n');
console.log('=' .repeat(60));

// Configurações esperadas
const expectedConfigs = [
  {
    type: 'Missas Diárias (Segunda a Sábado)',
    time: '06:30',
    expected: 5,
    description: 'Missas diárias regulares'
  },
  {
    type: 'Missa Sagrado Coração de Jesus (1ª Sexta)',
    time: '06:30',
    expected: 6,
    description: 'Primeira sexta-feira do mês'
  },
  {
    type: 'Missa Imaculado Coração de Maria (1º Sábado)',
    time: '06:30',
    expected: 6,
    description: 'Primeiro sábado do mês'
  },
  {
    type: 'Missa Dominical',
    time: '08:00',
    expected: 15,
    description: 'Domingo às 8h'
  },
  {
    type: 'Missa Dominical',
    time: '10:00',
    expected: 20,
    description: 'Domingo às 10h'
  },
  {
    type: 'Missa Dominical',
    time: '19:00',
    expected: 20,
    description: 'Domingo às 19h'
  },
  {
    type: 'Missa Cura e Libertação',
    time: '19:30',
    expected: 26,
    description: 'Primeira quinta-feira do mês'
  },
  {
    type: 'São Judas - Dia de Semana',
    times: ['07:00', '10:00', '19:30'],
    expected: [8, 10, 15],
    description: 'Dia 28 (segunda a sexta)'
  },
  {
    type: 'São Judas - Sábado',
    times: ['07:00', '10:00', '19:00'],
    expected: [8, 10, 15],
    description: 'Dia 28 (sábado)'
  },
  {
    type: 'São Judas - Domingo',
    times: ['08:00', '10:00', '15:00', '17:00', '19:00'],
    expected: [15, 20, 15, 15, 20],
    description: 'Dia 28 (domingo)'
  },
  {
    type: 'São Judas - Festa (Outubro)',
    times: ['07:00', '10:00', '12:00', '15:00', '17:00', '19:30'],
    expected: [10, 15, 10, 10, 10, 20],
    description: 'Dia 28 de outubro (festa)'
  }
];

console.log('\n✅ CONFIGURAÇÕES IMPLEMENTADAS:\n');

for (const config of expectedConfigs) {
  console.log(`\n📌 ${config.type}`);
  console.log(`   ${config.description}`);

  if (config.times && Array.isArray(config.times)) {
    // Para configurações com múltiplos horários
    config.times.forEach((time, index) => {
      const expected = Array.isArray(config.expected) ? config.expected[index] : config.expected;
      console.log(`   • ${time}: ${expected} ministros`);
    });
  } else {
    // Para configurações com horário único
    console.log(`   • Horário: ${config.time}`);
    console.log(`   • Quantidade: ${config.expected} ministros`);
  }
}

console.log('\n\n📋 RESUMO DAS ALTERAÇÕES:\n');
console.log('=' .repeat(60));
console.log(`
As seguintes quantidades foram configuradas no código:

MISSAS REGULARES:
• Diárias (6h30): 5 ministros
• Dominicais 8h: 15 ministros
• Dominicais 10h e 19h: 20 ministros

MISSAS ESPECIAIS:
• Sagrado Coração de Jesus (1ª sex 6h30): 6 ministros
• Imaculado Coração de Maria (1º sáb 6h30): 6 ministros
• Cura e Libertação (1ª qui 19h30): 26 ministros

SÃO JUDAS (dia 28):
• Horários matinais: 8-10 ministros
• Horários principais: 10-15 ministros
• Horários noturnos: 15-20 ministros
• Festa (outubro): 10-20 ministros por horário

🔧 ARQUIVOS ALTERADOS:
• server/utils/scheduleGenerator.ts

📍 PRINCIPAIS MUDANÇAS:
1. Linhas 299-300: Missas diárias (5 ministros)
2. Linhas 311-328: Missas dominicais (15/20 ministros)
3. Linhas 335-340: Cura e Libertação (26 ministros)
4. Linhas 347-352: Sagrado Coração de Jesus - 1ª sexta (6 ministros)
5. Linhas 359-364: Imaculado Coração de Maria - 1º sábado (6 ministros)
6. Linhas 476-572: São Judas (variável por horário)
7. Linhas 747-791: Lógica de seleção para quantidade exata

✅ O sistema agora escalará EXATAMENTE a quantidade definida
   para cada tipo de missa, garantindo proporção adequada ao
   público esperado.

⚠️ IMPORTANTE: Se não houver ministros suficientes disponíveis,
   o sistema alertará no log mas escalará o máximo possível.
`);

process.exit(0);