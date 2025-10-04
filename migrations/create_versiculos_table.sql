-- Criar tabela de versículos bíblicos
CREATE TABLE IF NOT EXISTS versiculos (
  id SERIAL PRIMARY KEY,
  frase TEXT NOT NULL,
  referencia VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca mais rápida
CREATE INDEX IF NOT EXISTS idx_versiculos_referencia ON versiculos(referencia);
