/**
 * Lista de IDs de usuários com acesso a funcionalidades administrativas
 * em fase de teste/rollout (ex: import/export de escala em xlsx).
 *
 * Quando uma feature for liberada para todos os coordenadores, basta
 * remover o gating ou expandir a lista.
 */

import type { AuthRequest } from '../auth';

export const ADMIN_USER_IDS: ReadonlyArray<string> = [
  // Marco Rossit (rossit@icloud.com) — owner / superadmin
  '629a3fcc-96e2-4ac1-881f-2c8726fbd9d3',
];

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * Express middleware factory: bloqueia o request se o usuário autenticado
 * não estiver na lista de admins. Use em conjunto com `authenticateToken`.
 */
export function requireAdminUser() {
  return (req: AuthRequest, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    const userId = req.user?.id;
    if (!isAdminUser(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso restrito — funcionalidade em fase de teste'
      });
    }
    next();
  };
}
