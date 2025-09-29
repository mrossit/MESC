import Database from 'better-sqlite3';

console.log('===== TESTE DE AMBIENTES =====');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'não definido');

// Verificar qual banco está sendo usado
const dbPath = './local.db';
const db = new Database(dbPath);

console.log('\n===== BANCO DE DADOS LOCAL.DB =====');

// Verificar usuários que poderiam ser ministros
const users = db.prepare(`
  SELECT id, name, email, role, minister_type
  FROM users
  WHERE role IN ('coordenador', 'minister', 'admin')
     OR minister_type IS NOT NULL
`).all();

console.log('\nUsuários relevantes:');
users.forEach(u => {
  console.log(`  - ${u.name} (${u.email})`);
  console.log(`    Role: ${u.role}, Minister Type: ${u.minister_type || 'não definido'}`);
});

// Verificar se há uma tabela ministers separada (legacy)
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%minister%'").all();
console.log('\nTabelas relacionadas a ministros:', tables.map(t => t.name).join(', ') || 'nenhuma encontrada');

// Verificar questionários
const questionnaires = db.prepare('SELECT * FROM questionnaires').all();
console.log('\n===== QUESTIONÁRIOS =====');
if (questionnaires.length === 0) {
  console.log('Nenhum questionário encontrado');
} else {
  questionnaires.forEach(q => {
    console.log(`  - ${q.title} (ID: ${q.id}, Status: ${q.status})`);
  });
}

// Verificar respostas
const responses = db.prepare('SELECT * FROM questionnaireResponses').all();
console.log('\n===== RESPOSTAS =====');
console.log('Total de respostas:', responses.length);

if (responses.length > 0) {
  // Agrupar por questionário
  const responsesByQuestionnaire = responses.reduce((acc: any, r: any) => {
    if (!acc[r.questionnaireId]) acc[r.questionnaireId] = [];
    acc[r.questionnaireId].push(r);
    return acc;
  }, {});

  Object.keys(responsesByQuestionnaire).forEach(qId => {
    console.log(`\nQuestionário ${qId}: ${responsesByQuestionnaire[qId].length} respostas`);
    responsesByQuestionnaire[qId].slice(0, 3).forEach((r: any) => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.userId);
      console.log(`  - Usuário: ${user?.name || 'desconhecido'} (enviado em ${r.submittedAt})`);
    });
  });
}

// Verificar configuração do servidor
console.log('\n===== CONFIGURAÇÃO DO SERVIDOR =====');
console.log('O servidor está configurado para usar:');
if (process.env.DATABASE_URL) {
  console.log('  - PostgreSQL (via DATABASE_URL)');
} else if (process.env.NODE_ENV === 'development') {
  console.log('  - SQLite local.db (desenvolvimento)');
} else {
  console.log('  - SQLite local.db (fallback para produção sem DATABASE_URL)');
}

console.log('\n===== PROBLEMA IDENTIFICADO =====');
console.log('1. O código do frontend pode estar esperando uma tabela "ministers" que não existe');
console.log('2. Os dados de ministros estão na tabela "users" com roles específicos');
console.log('3. Não há respostas de questionários no banco de dados');
console.log('4. Em produção, se não houver DATABASE_URL, o sistema usa o mesmo banco SQLite');

db.close();