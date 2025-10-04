-- Criar tabela de versículos bíblicos para incentivo aos ministros
CREATE TABLE IF NOT EXISTS versiculos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  frase TEXT NOT NULL,
  referencia VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_versiculos_id ON versiculos(id);

-- Comentários
COMMENT ON TABLE versiculos IS 'Versículos bíblicos de incentivo para ministros da Eucaristia';
COMMENT ON COLUMN versiculos.frase IS 'Texto do versículo bíblico';
COMMENT ON COLUMN versiculos.referencia IS 'Referência bíblica (livro, capítulo e versículo)';
