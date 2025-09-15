-- Script alternativo: Criar usuário coordenador no banco de produção
-- Execute este SQL na aba Database do Replit (Production Database)

-- 1. Verificar usuários existentes
SELECT email, name, role, status FROM users ORDER BY role, name;

-- 2. Criar novo usuário coordenador
-- Hash para senha 'Coord@2025': $2b$10$senha_hash_aqui
INSERT INTO users (
  id,
  email, 
  name, 
  password_hash, 
  role, 
  status, 
  requires_password_change,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'coordenador.producao@saoludastadeu.com.br',
  'Coordenador Produção',
  '$2b$10$Z3GNd4I.nuVkqdQWWsDVJOp8qbt1A6XJzyQIx35/NzzMgeEjzN2Lu', -- Senha: 123pEgou$&@
  'coordenador',
  'active',
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Verificar se foi criado
SELECT email, name, role, status FROM users WHERE email = 'coordenador.producao@saoludastadeu.com.br';