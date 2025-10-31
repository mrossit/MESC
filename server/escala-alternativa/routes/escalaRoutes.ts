import { Router } from "express";
import { 
  gerarEscalaAlternativa, 
  compararAlgoritmos,
  verificarPython 
} from "../controllers/escalaController";
import { authenticateToken, requireRole } from "../../auth";

const router = Router();

/**
 * Rotas do sistema de escala alternativa (Python)
 * Todas as rotas requerem autenticação
 */

// Verificar se Python está disponível
router.get("/check-python", authenticateToken, verificarPython);

// Gerar escala usando algoritmo alternativo Python
// Requer permissão de coordenador ou gestor
router.post(
  "/gerar", 
  authenticateToken, 
  requireRole(["coordenador", "gestor"]),
  gerarEscalaAlternativa
);

// Comparar algoritmo atual vs alternativo
// Requer permissão de gestor
router.post(
  "/comparar",
  authenticateToken,
  requireRole(["gestor"]),
  compararAlgoritmos
);

export default router;
