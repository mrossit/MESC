-- Insert initial data for formation tracks and modules

-- Formation Tracks
INSERT OR IGNORE INTO formation_tracks (id, title, description, category, order_index, is_required) VALUES
('liturgy-track-1', 'Formação Litúrgica Básica', 'Curso fundamental sobre liturgia e celebração eucarística', 'liturgia', 1, 1),
('spirituality-track-1', 'Espiritualidade do Ministro', 'Desenvolvimento da vida espiritual do ministro extraordinário', 'espiritualidade', 2, 1),
('practical-track-1', 'Práticas Ministeriais', 'Orientações práticas para o exercício do ministério', 'pratica', 3, 1);

-- Formation Modules for Liturgy Track
INSERT OR IGNORE INTO formation_modules (id, track_id, title, description, order_index) VALUES
('liturgy-module-1', 'liturgy-track-1', 'Fundamentos da Liturgia', 'Introdução aos conceitos básicos da liturgia católica', 1),
('liturgy-module-2', 'liturgy-track-1', 'A Santa Missa', 'Compreensão profunda da celebração eucarística', 2),
('liturgy-module-3', 'liturgy-track-1', 'Ministério da Comunhão', 'Papel específico do Ministro Extraordinário da Sagrada Comunhão', 3),
('liturgy-module-4', 'liturgy-track-1', 'Liturgia das Horas', 'Oração oficial da Igreja ao longo do dia', 4);

-- Formation Modules for Spirituality Track
INSERT OR IGNORE INTO formation_modules (id, track_id, title, description, order_index) VALUES
('spirit-module-1', 'spirituality-track-1', 'Vocação e Missão', 'Compreendendo o chamado ao ministério', 1),
('spirit-module-2', 'spirituality-track-1', 'Vida de Oração', 'Desenvolvimento da oração pessoal', 2),
('spirit-module-3', 'spirituality-track-1', 'Testemunho de Vida', 'Vivendo como exemplo cristão', 3);

-- Formation Modules for Practical Track  
INSERT OR IGNORE INTO formation_modules (id, track_id, title, description, order_index) VALUES
('practical-module-1', 'practical-track-1', 'Protocolo Litúrgico', 'Normas e procedimentos durante a celebração', 1),
('practical-module-2', 'practical-track-1', 'Situações Especiais', 'Como agir em circunstâncias particulares', 2),
('practical-module-3', 'practical-track-1', 'Relacionamento e Comunicação', 'Interação com fiéis e clero', 3);

-- Formation Lessons for Liturgy Module 1 (Fundamentos da Liturgia)
INSERT OR IGNORE INTO formation_lessons (id, module_id, title, description, order_index, content_type) VALUES
('lesson-1-1', 'liturgy-module-1', 'O que é Liturgia?', 'Definição e importância da liturgia na vida da Igreja', 1, 'text'),
('lesson-1-2', 'liturgy-module-1', 'História da Liturgia', 'Desenvolvimento histórico das práticas litúrgicas', 2, 'text'),
('lesson-1-3', 'liturgy-module-1', 'Símbolos e Sinais', 'Compreendendo os símbolos litúrgicos', 3, 'text');

-- Formation Lessons for Liturgy Module 2 (A Santa Missa)
INSERT OR IGNORE INTO formation_lessons (id, module_id, title, description, order_index, content_type) VALUES
('lesson-2-1', 'liturgy-module-2', 'Estrutura da Missa', 'As partes da celebração eucarística', 1, 'text'),
('lesson-2-2', 'liturgy-module-2', 'Ritos Iniciais', 'Compreendendo o início da celebração', 2, 'text'),
('lesson-2-3', 'liturgy-module-2', 'Liturgia da Palavra', 'A importância das leituras e homilia', 3, 'text'),
('lesson-2-4', 'liturgy-module-2', 'Liturgia Eucarística', 'O coração da celebração', 4, 'text');

-- Formation Lessons for Liturgy Module 3 (Ministério da Comunhão)
INSERT OR IGNORE INTO formation_lessons (id, module_id, title, description, order_index, content_type) VALUES
('lesson-3-1', 'liturgy-module-3', 'Vocação do Ministro', 'O chamado ao serviço da comunhão', 1, 'text'),
('lesson-3-2', 'liturgy-module-3', 'Preparação Pessoal', 'Como se preparar espiritualmente', 2, 'text'),
('lesson-3-3', 'liturgy-module-3', 'Distribuição da Comunhão', 'Procedimentos práticos', 3, 'text'),
('lesson-3-4', 'liturgy-module-3', 'Comunhão aos Enfermos', 'Levando a comunhão aos doentes', 4, 'text');

-- Mass Times Configuration (example schedule)
INSERT OR IGNORE INTO mass_times_config (id, day_of_week, time, location, is_active, ministers_needed) VALUES
('mass-sat-1900', 6, '19:00', 'Igreja Principal', 1, 2),
('mass-sun-0700', 0, '07:00', 'Igreja Principal', 1, 2),
('mass-sun-0900', 0, '09:00', 'Igreja Principal', 1, 3),
('mass-sun-1100', 0, '11:00', 'Igreja Principal', 1, 3),
('mass-sun-1900', 0, '19:00', 'Igreja Principal', 1, 2),
('mass-tue-1900', 2, '19:00', 'Capela', 1, 1),
('mass-thu-1900', 4, '19:00', 'Capela', 1, 1);

-- Notification Templates (basic examples)
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES
('notif-1', NULL, 'announcement', 'Bem-vindo ao Sistema MESC', 'Sistema de gerenciamento para Ministros Extraordinários da Sagrada Comunhão', 0, CURRENT_TIMESTAMP);