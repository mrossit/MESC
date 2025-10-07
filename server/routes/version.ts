import { Router } from 'express';

const router = Router();

// Versão do sistema - incrementar quando houver mudanças visuais importantes
const SYSTEM_VERSION = '5.4.0';
const BUILD_TIME = new Date().toISOString();

// GET /api/version - Retorna versão atual do sistema
router.get('/', (req, res) => {
  res.json({
    version: SYSTEM_VERSION,
    buildTime: BUILD_TIME,
    timestamp: Date.now()
  });
});

export default router;
