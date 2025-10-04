-- Migração corrigida: Adicionar tracking de conexões
-- A tabela sessions já existe (express-session), vamos criar user_connections

-- Criar tabela específica para tracking de conexões
CREATE TABLE IF NOT EXISTS user_connections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  ip VARCHAR(45),
  user_agent TEXT,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Atualizar campos users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_last_activity ON user_connections(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON user_connections(user_id, last_activity_at) WHERE disconnected_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status) WHERE status = 'active';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_connections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_connections_updated_at_trigger ON user_connections;
CREATE TRIGGER user_connections_updated_at_trigger
BEFORE UPDATE ON user_connections
FOR EACH ROW
EXECUTE FUNCTION update_user_connections_timestamp();

-- View otimizada para status online
CREATE OR REPLACE VIEW users_online_status AS
SELECT
  u.id as user_id,
  u.name as nome,
  u.email,
  u.phone as whatsapp,
  u.profile_image_url as avatar_url,
  u.last_seen,
  u.status,
  CASE
    WHEN uc.last_activity_at >= (CURRENT_TIMESTAMP - INTERVAL '2 minutes') THEN 'online'
    WHEN uc.last_activity_at >= (CURRENT_TIMESTAMP - INTERVAL '5 minutes') THEN 'away'
    ELSE 'offline'
  END as computed_status,
  uc.last_activity_at,
  uc.id as connection_id
FROM users u
LEFT JOIN LATERAL (
  SELECT id, last_activity_at
  FROM user_connections
  WHERE user_id = u.id AND disconnected_at IS NULL
  ORDER BY last_activity_at DESC
  LIMIT 1
) uc ON true
WHERE u.status = 'active';

COMMENT ON TABLE user_connections IS 'Tracking de conexões de usuários para determinar status online/offline';
COMMENT ON VIEW users_online_status IS 'View de status online dos usuários ativos';
