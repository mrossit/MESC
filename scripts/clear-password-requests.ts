import { db } from '../server/db';
import { passwordResetRequests } from '@shared/schema';

async function clearPasswordRequests() {
  try {
    // Limpar todas as solicitações de reset de senha
    await db.delete(passwordResetRequests);
    console.log('✅ Todas as solicitações de reset de senha foram limpas');
  } catch (error) {
    console.error('❌ Erro ao limpar solicitações:', error);
  }
  process.exit(0);
}

clearPasswordRequests();