-- Adicionar campo extra_activities à tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS extra_activities JSONB DEFAULT '{"sickCommunion": false, "mondayAdoration": false, "helpOtherPastorals": false, "festiveEvents": false}'::jsonb;

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'extra_activities';