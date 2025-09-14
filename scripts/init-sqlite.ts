import Database from 'better-sqlite3';

const sqlite = new Database('local.db');

// Create all tables manually
const createTables = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ministro', 'coordenador', 'gestor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'deleted')),
  mustChangePassword INTEGER DEFAULT 0,
  lastPasswordChange TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Questionnaires table
CREATE TABLE IF NOT EXISTS questionnaires (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  questions TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed', 'deleted')),
  createdById TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES users(id)
);

-- Questionnaire Responses table
CREATE TABLE IF NOT EXISTS questionnaireResponses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  userId TEXT NOT NULL,
  questionnaireId TEXT NOT NULL,
  responses TEXT NOT NULL,
  submittedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (questionnaireId) REFERENCES questionnaires(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'announcement')),
  read INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  events TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  createdById TEXT,
  publishedAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES users(id)
);

-- Schedule Events table
CREATE TABLE IF NOT EXISTS scheduleEvents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  scheduleId TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  ministers TEXT NOT NULL,
  observations TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scheduleId) REFERENCES schedules(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_questionnaires_month_year ON questionnaires(month, year);
CREATE INDEX IF NOT EXISTS idx_questionnaireResponses_userId ON questionnaireResponses(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_schedules_month_year ON schedules(month, year);
`;

try {
  console.log('🗄️  Inicializando banco de dados SQLite...\n');

  // Execute all CREATE TABLE statements
  sqlite.exec(createTables);

  console.log('✅ Tabelas criadas com sucesso!');
  console.log('\nTabelas criadas:');
  console.log('  - users');
  console.log('  - questionnaires');
  console.log('  - questionnaireResponses');
  console.log('  - notifications');
  console.log('  - schedules');
  console.log('  - scheduleEvents');

} catch (error) {
  console.error('❌ Erro ao criar tabelas:', error);
  process.exit(1);
}

sqlite.close();
console.log('\n✨ Banco de dados inicializado com sucesso!');