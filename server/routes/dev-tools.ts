import { Router } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const router = Router();

// ROTA TEMPORÁRIA PARA RESETAR SENHA (REMOVER EM PRODUÇÃO!)
router.post('/reset-password-dev', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: 'Email e newPassword são obrigatórios'
      });
    }

    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gerar novo hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar
    await db
      .update(users)
      .set({
        passwordHash,
        requiresPasswordChange: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    res.json({
      success: true,
      message: `Senha de ${email} atualizada com sucesso`,
      credentials: {
        email: user.email,
        newPassword: newPassword
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
