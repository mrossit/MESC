import { Router, Response } from "express";
import { db } from "../db";
import { versiculos } from "@shared/schema";
import { sql } from "drizzle-orm";

const router = Router();

// Get a random biblical verse
router.get("/random", async (_, res: Response) => {
  try {
    console.log('📖 [API /versiculos/random] Buscando versículo aleatório...');

    // Get a random verse using PostgreSQL's RANDOM() function
    const randomVerse = await db
      .select({
        id: versiculos.id,
        frase: versiculos.frase,
        referencia: versiculos.referencia
      })
      .from(versiculos)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (randomVerse.length === 0) {
      console.log('❌ [API /versiculos/random] Nenhum versículo encontrado');
      return res.status(404).json({ message: "Nenhum versículo encontrado" });
    }

    console.log(`✅ [API /versiculos/random] Versículo encontrado: ${randomVerse[0].referencia}`);

    res.json(randomVerse[0]);
  } catch (error) {
    console.error("[API /versiculos/random] Erro:", error);
    res.status(500).json({ message: "Erro ao buscar versículo" });
  }
});

// Get all verses (optional, for admin purposes)
router.get("/", async (_, res: Response) => {
  try {
    const allVerses = await db
      .select()
      .from(versiculos)
      .orderBy(versiculos.id);

    res.json(allVerses);
  } catch (error) {
    console.error("[API /versiculos] Erro:", error);
    res.status(500).json({ message: "Erro ao buscar versículos" });
  }
});

export default router;
