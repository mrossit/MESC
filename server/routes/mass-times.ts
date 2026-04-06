import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../auth";
import { csrfProtection } from "../middleware/csrf";
import { insertMassTimeSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Mass times routes
router.get('/api/mass-times', authenticateToken, async (req, res) => {
  try {
    const massTimes = await storage.getMassTimes();
    res.json(massTimes);
  } catch (error) {
    console.error("Error fetching mass times:", error);
    res.status(500).json({ message: "Failed to fetch mass times" });
  }
});

router.post('/api/mass-times', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const massTimeData = insertMassTimeSchema.parse(req.body);
    const massTime = await storage.createMassTime(massTimeData);
    res.status(201).json(massTime);
  } catch (error) {
    console.error("Error creating mass time:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create mass time" });
  }
});

router.put('/api/mass-times/:id', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const massTimeData = insertMassTimeSchema.partial().parse(req.body);
    const massTime = await storage.updateMassTime(req.params.id, massTimeData);
    res.json(massTime);
  } catch (error) {
    console.error("Error updating mass time:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update mass time" });
  }
});

router.delete('/api/mass-times/:id', authenticateToken, csrfProtection, async (req, res) => {
  try {
    await storage.deleteMassTime(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting mass time:", error);
    res.status(500).json({ message: "Failed to delete mass time" });
  }
});

export default router;
