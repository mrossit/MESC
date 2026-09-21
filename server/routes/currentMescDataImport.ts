import { timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { importCurrentMescProductionData } from "../services/currentMescProductionImport";

const router = Router();

function validToken(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function authorized(req: Request) {
  const expected = process.env.NATIVE_CURRENT_DATA_IMPORT_TOKEN;
  const provided = String(req.headers["x-native-current-data-import-token"] ?? "");
  if (process.env.ENABLE_NATIVE_CURRENT_DATA_IMPORT !== "true" || !expected) return false;
  return validToken(provided, expected);
}

router.post("/", async (req: Request, res: Response) => {
  if (!authorized(req)) return res.status(404).json({ error: "not_found" });

  const mode = req.query.mode === "apply" ? "apply" : "dry-run";
  if (mode === "apply" && req.query.confirm !== "copy-current-data") {
    return res.status(400).json({ error: "confirmation_required" });
  }

  try {
    const result = await importCurrentMescProductionData(mode);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "native_current_data_import_failed",
      message: error instanceof Error ? error.message : "Unknown import error",
    });
  }
});

export default router;
