-- Script para atualizar senha do usuário rossit@icloud.com no banco de produção
-- Execute este SQL na aba Database do Replit (Production Database)

-- 1. Verificar se o usuário existe
SELECT email, name, role, status FROM users WHERE email = 'rossit@icloud.com';

-- 2. Atualizar a senha para '123pEgou$&@' (hash bcrypt com salt 10)
-- Hash gerado para a senha '123pEgou$&@': $2b$10$Z3GNd4I.nuVkqdQWWsDVJOp8qbt1A6XJzyQIx35/NzzMgeEjzN2Lu
UPDATE users 
SET 
  password_hash = '$2b$10$Z3GNd4I.nuVkqdQWWsDVJOp8qbt1A6XJzyQIx35/NzzMgeEjzN2Lu',
  requires_password_change = false,
  updated_at = NOW()
WHERE email = 'rossit@icloud.com';

-- 3. Verificar a atualização
SELECT email, name, role, status, requires_password_change FROM users WHERE email = 'rossit@icloud.com';