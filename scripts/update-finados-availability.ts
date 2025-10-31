#!/usr/bin/env tsx
/**
 * Script para atualizar disponibilidade de ministros para Missa de Finados
 * Data: 02/11/2025 às 15h30 (Cemitério)
 * 
 * Este script:
 * 1. Lê o CSV de disponibilidades
 * 2. Atualiza os questionários de Novembro/2025 com finados: true
 * 3. Gera SQL para execução manual no banco de PRODUÇÃO
 */

import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'attached_assets/availability-data - finados_1761931901561.csv');

interface FinadosAvailability {
  email: string;
  available: boolean;
}

console.log('🎯 Processando disponibilidades para Missa de Finados (02/11/2025 15h30)\n');

// Ler e parsear CSV manualmente
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');

const availabilities: FinadosAvailability[] = lines.slice(1).map(line => {
  const values = line.split(',');
  return {
    email: values[0].toLowerCase().trim(),
    available: values[1]?.toLowerCase().trim() === 'true'
  };
});

console.log(`📋 Total de ministros no CSV: ${availabilities.length}`);
availabilities.forEach(a => {
  console.log(`  ✓ ${a.email}: ${a.available ? 'DISPONÍVEL' : 'NÃO DISPONÍVEL'}`);
});

console.log('\n' + '='.repeat(80));
console.log('📝 GERANDO SQL PARA PRODUÇÃO');
console.log('='.repeat(80));

console.log(`
-- ============================================================================
-- SCRIPT PARA ATUALIZAR DISPONIBILIDADE DE FINADOS - BANCO DE PRODUÇÃO
-- Data da Missa: 02/11/2025 às 15h30 (Cemitério)
-- Data de execução: ${new Date().toISOString()}
-- ============================================================================

-- PASSO 1: Criar função auxiliar para atualizar special_events
CREATE OR REPLACE FUNCTION update_finados_availability(
  p_user_id VARCHAR,
  p_available BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_response_id UUID;
  v_current_responses JSONB;
  v_special_events JSONB;
BEGIN
  -- Buscar resposta de novembro/2025
  SELECT id, responses 
  INTO v_response_id, v_current_responses
  FROM questionnaire_responses qr
  JOIN questionnaires q ON qr.questionnaire_id = q.id
  WHERE qr.user_id = p_user_id
    AND q.month = 11
    AND q.year = 2025
  LIMIT 1;

  IF v_response_id IS NULL THEN
    RAISE NOTICE 'Ministro % não tem resposta para novembro/2025', p_user_id;
    RETURN;
  END IF;

  -- Extrair special_events do responses
  v_special_events := COALESCE(v_current_responses->'special_events', '{}'::jsonb);
  
  -- Adicionar finados
  v_special_events := jsonb_set(
    v_special_events,
    '{finados}',
    to_jsonb(p_available)
  );

  -- Atualizar responses com novo special_events
  v_current_responses := jsonb_set(
    v_current_responses,
    '{special_events}',
    v_special_events
  );

  -- Atualizar resposta
  UPDATE questionnaire_responses
  SET 
    responses = v_current_responses,
    special_events = jsonb_set(
      COALESCE(special_events, '{}'::jsonb),
      '{finados}',
      to_jsonb(p_available)
    ),
    updated_at = NOW()
  WHERE id = v_response_id;

  RAISE NOTICE 'Ministro % atualizado com finados = %', p_user_id, p_available;
END;
$$ LANGUAGE plpgsql;

-- PASSO 2: Atualizar cada ministro
`);

// Gerar chamadas para cada ministro
availabilities.forEach(({ email, available }) => {
  console.log(`
-- Atualizar: ${email}
DO $$
DECLARE
  v_user_id VARCHAR;
BEGIN
  -- Buscar ID do ministro pelo email
  SELECT id INTO v_user_id FROM users WHERE LOWER(email) = '${email}';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'AVISO: Ministro com email ${email} não encontrado!';
  ELSE
    PERFORM update_finados_availability(v_user_id, ${available});
  END IF;
END $$;
`);
});

console.log(`
-- PASSO 3: Verificar resultados
SELECT 
  u.name,
  u.email,
  qr.responses->'special_events'->>'finados' as finados_disponivel,
  qr.special_events->>'finados' as finados_legacy
FROM questionnaire_responses qr
JOIN users u ON qr.user_id = u.id
JOIN questionnaires q ON qr.questionnaire_id = q.id
WHERE q.month = 11 AND q.year = 2025
  AND u.email IN (${availabilities.map(a => `'${a.email}'`).join(', ')})
ORDER BY u.name;

-- PASSO 4: Limpar função auxiliar (opcional)
-- DROP FUNCTION IF EXISTS update_finados_availability(VARCHAR, BOOLEAN);

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
`);

console.log('\n' + '='.repeat(80));
console.log('✅ INSTRUÇÕES DE USO');
console.log('='.repeat(80));
console.log(`
1. Copie todo o SQL gerado acima
2. Acesse o painel do Neon (banco de produção)
3. Cole e execute o SQL no SQL Editor
4. Verifique os resultados com a query SELECT no final
5. Pronto! As disponibilidades de Finados estarão atualizadas

⚠️  IMPORTANTE:
- Este script atualiza APENAS os ministros listados no CSV
- Ministros não listados NÃO terão finados adicionado (permanecerão sem disponibilidade)
- A missa aparecerá automaticamente nos questionários futuros
`);

console.log('\n📊 RESUMO:');
console.log(`  - Total de ministros a atualizar: ${availabilities.length}`);
console.log(`  - Disponíveis para Finados: ${availabilities.filter(a => a.available).length}`);
console.log(`  - Não disponíveis: ${availabilities.filter(a => !a.available).length}`);
