-- CORREÇÃO COMPLETA DE TODAS AS INCOMPATIBILIDADES DE SCHEMA
-- Corrigir TODAS as tabelas para camelCase (padrão Drizzle)

-- 1. FAMILIES table
ALTER TABLE families RENAME COLUMN created_at TO createdAt;
ALTER TABLE families RENAME COLUMN updated_at TO updatedAt;

-- 2. FAMILY_RELATIONSHIPS table (não tem timestamps - OK)
ALTER TABLE family_relationships RENAME COLUMN from_user_id TO fromUserId;
ALTER TABLE family_relationships RENAME COLUMN to_user_id TO toUserId;
ALTER TABLE family_relationships RENAME COLUMN relationship_type TO relationshipType;

-- 3. SUBSTITUTION_REQUESTS table  
ALTER TABLE substitution_requests RENAME COLUMN requester_id TO requesterId;
ALTER TABLE substitution_requests RENAME COLUMN substitute_id TO substituteId;
ALTER TABLE substitution_requests RENAME COLUMN schedule_date TO scheduleDate;
ALTER TABLE substitution_requests RENAME COLUMN created_at TO createdAt;
ALTER TABLE substitution_requests RENAME COLUMN updated_at TO updatedAt;

-- 4. ACTIVITY_LOGS table
ALTER TABLE activity_logs RENAME COLUMN user_id TO userId;
ALTER TABLE activity_logs RENAME COLUMN entity_type TO entityType;
ALTER TABLE activity_logs RENAME COLUMN entity_id TO entityId;
ALTER TABLE activity_logs RENAME COLUMN ip_address TO ipAddress;
ALTER TABLE activity_logs RENAME COLUMN user_agent TO userAgent;
ALTER TABLE activity_logs RENAME COLUMN created_at TO createdAt;

-- 5. FORMATION_LESSON_PROGRESS table
ALTER TABLE formation_lesson_progress RENAME COLUMN user_id TO userId;
ALTER TABLE formation_lesson_progress RENAME COLUMN lesson_id TO lessonId;
ALTER TABLE formation_lesson_progress RENAME COLUMN is_completed TO isCompleted;
ALTER TABLE formation_lesson_progress RENAME COLUMN completed_at TO completedAt;
ALTER TABLE formation_lesson_progress RENAME COLUMN time_spent TO timeSpent;
ALTER TABLE formation_lesson_progress RENAME COLUMN quiz_score TO quizScore;
ALTER TABLE formation_lesson_progress RENAME COLUMN created_at TO createdAt;
ALTER TABLE formation_lesson_progress RENAME COLUMN updated_at TO updatedAt;

-- 6. FORMATION_LESSON_SECTIONS table
ALTER TABLE formation_lesson_sections RENAME COLUMN lesson_id TO lessonId;
ALTER TABLE formation_lesson_sections RENAME COLUMN order_index TO orderIndex;
ALTER TABLE formation_lesson_sections RENAME COLUMN content_type TO contentType;
ALTER TABLE formation_lesson_sections RENAME COLUMN video_url TO videoUrl;
ALTER TABLE formation_lesson_sections RENAME COLUMN audio_url TO audioUrl;
ALTER TABLE formation_lesson_sections RENAME COLUMN document_url TO documentUrl;
ALTER TABLE formation_lesson_sections RENAME COLUMN quiz_data TO quizData;
ALTER TABLE formation_lesson_sections RENAME COLUMN interactive_data TO interactiveData;
ALTER TABLE formation_lesson_sections RENAME COLUMN created_at TO createdAt;
ALTER TABLE formation_lesson_sections RENAME COLUMN updated_at TO updatedAt;

-- 7. FORMATION_LESSONS table
ALTER TABLE formation_lessons RENAME COLUMN module_id TO moduleId;
ALTER TABLE formation_lessons RENAME COLUMN order_index TO orderIndex;
ALTER TABLE formation_lessons RENAME COLUMN estimated_duration TO estimatedDuration;
ALTER TABLE formation_lessons RENAME COLUMN content_type TO contentType;
ALTER TABLE formation_lessons RENAME COLUMN content_url TO contentUrl;
ALTER TABLE formation_lessons RENAME COLUMN video_url TO videoUrl;
ALTER TABLE formation_lessons RENAME COLUMN document_url TO documentUrl;
ALTER TABLE formation_lessons RENAME COLUMN created_at TO createdAt;
ALTER TABLE formation_lessons RENAME COLUMN updated_at TO updatedAt;

-- 8. Verificar outras tabelas que podem estar faltando campos
ALTER TABLE mass_times_config ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE mass_times_config ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sessions ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sessions ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE password_reset_requests ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE password_reset_requests ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Exibir resultado final
SELECT 'VERIFICAÇÃO FINAL - Todas as tabelas agora devem ter camelCase:';

SELECT 'families:';
PRAGMA table_info(families);

SELECT 'family_relationships:'; 
PRAGMA table_info(family_relationships);

SELECT 'formation_lesson_progress:';
PRAGMA table_info(formation_lesson_progress);

SELECT 'formation_lessons:';
PRAGMA table_info(formation_lessons);