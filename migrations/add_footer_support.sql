-- Migração: Suporte para Fixed Footer
-- Adiciona campos e tabelas necessárias para o menu inferior

-- Adicionar campo last_seen_schedules na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_schedules TIMESTAMP;

-- Comentário explicativo
COMMENT ON COLUMN users.last_seen_schedules IS 'Última vez que o usuário visualizou a página de escalas (para badge de unread)';

-- Criar tabela de logs de navegação (opcional, para analytics)
CREATE TABLE IF NOT EXISTS navigation_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_navigation_logs_user_id ON navigation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_navigation_logs_route ON navigation_logs(route);
CREATE INDEX IF NOT EXISTS idx_navigation_logs_timestamp ON navigation_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_schedules ON users(last_seen_schedules);

-- Comentários
COMMENT ON TABLE navigation_logs IS 'Logs de navegação do usuário para analytics do Fixed Footer';
COMMENT ON COLUMN navigation_logs.user_id IS 'ID do usuário (PID)';
COMMENT ON COLUMN navigation_logs.route IS 'Rota acessada (home, escala, substituicoes, perfil)';
COMMENT ON COLUMN navigation_logs.timestamp IS 'Timestamp da navegação';
COMMENT ON COLUMN navigation_logs.user_agent IS 'User agent do navegador';
COMMENT ON COLUMN navigation_logs.ip IS 'Endereço IP do usuário';
