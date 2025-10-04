import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Buscar versículo aleatório
router.get("/random", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, frase, referencia
      FROM versiculos
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Nenhum versículo encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao buscar versículo:", error);
    res.status(500).json({ error: "Erro ao buscar versículo" });
  }
});

// Buscar todos os versículos
router.get("/", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, frase, referencia
      FROM versiculos
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar versículos:", error);
    res.status(500).json({ error: "Erro ao buscar versículos" });
  }
});

export default router;
