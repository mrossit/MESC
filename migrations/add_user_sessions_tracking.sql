-- Migração: Adicionar campos de tracking de sessão e última atividade
-- Data: 2025-10-04

-- Adicionar campos à tabela users se não existirem
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20); -- Formato E.164: +5511999999999
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar tabela de sessões para tracking detalhado
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip VARCHAR(45), -- IPv6 compatível
  user_agent TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_active_status ON users(status, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, last_activity_at) WHERE ended_at IS NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at_trigger ON sessions;
CREATE TRIGGER sessions_updated_at_trigger
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_sessions_timestamp();

-- Função para determinar status online baseado em última atividade
CREATE OR REPLACE FUNCTION is_user_online(user_last_activity TIMESTAMP)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_last_activity >= (CURRENT_TIMESTAMP - INTERVAL '2 minutes');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View para facilitar consulta de usuários online
CREATE OR REPLACE VIEW users_online_status AS
SELECT
  u.id as user_id,
  u.name as nome,
  u.email,
  u.whatsapp,
  u.avatar_url,
  u.last_seen,
  u.status,
  u.ativo,
  CASE
    WHEN s.last_activity_at >= (CURRENT_TIMESTAMP - INTERVAL '2 minutes') THEN 'online'
    WHEN s.last_activity_at >= (CURRENT_TIMESTAMP - INTERVAL '5 minutes') THEN 'away'
    ELSE 'offline'
  END as computed_status,
  s.last_activity_at,
  s.session_id
FROM users u
LEFT JOIN LATERAL (
  SELECT session_id, last_activity_at
  FROM sessions
  WHERE user_id = u.id AND ended_at IS NULL
  ORDER BY last_activity_at DESC
  LIMIT 1
) s ON true
WHERE u.ativo = true;

COMMENT ON TABLE sessions IS 'Tracking de sessões de usuários para determinar status online/offline';
COMMENT ON VIEW users_online_status IS 'View materializada de status online dos usuários ativos';
