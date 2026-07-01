import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { BACKFILL_DDL } from './dbBackfillSql';

/**
 * One-shot, secret-guarded, ADDITIVE schema backfill + formation seed.
 *
 * Why this exists: production (Vercel + Supabase Postgres) never had the
 * formation/gamification tables created (no migration file creates
 * formation_tracks et al., and the deploy pipeline does not run migrations).
 * `/api/formation/overview` therefore 500s with 42P01 "relation does not exist".
 *
 * This runs the full schema DDL statement-by-statement, swallowing
 * duplicate-class errors, so it ONLY creates what is missing and never
 * touches existing tables/data. `drizzle-kit push` is NOT used (it is
 * destructive and already caused a data-loss incident on this base).
 *
 * Guarded by DB_BACKFILL_SECRET. Read-only `inspect` by default; writes only
 * on `?mode=apply&confirm=1`.
 */

const router = Router();

// SQLSTATE codes meaning "this object already exists" — safe to skip.
const DUPLICATE_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (constraint, type)
  '42P06', // duplicate_schema
  '42P16', // invalid_table_definition (already partitioned etc.)
  '42701', // duplicate_column
  '42P04', // duplicate_database
  '42723', // duplicate_function
]);

const REQUIRED_TABLES = [
  'formation_tracks',
  'formation_modules',
  'formation_lessons',
  'formation_lesson_sections',
  'formation_materials',
  'formation_progress',
  'formation_lesson_progress',
  'formation_certificates',
  'badges',
  'user_badges',
  'user_points',
  'point_transactions',
  'adoration_draws',
  'adoration_draw_results',
];

function errCode(e: any): string | undefined {
  return e?.code || e?.cause?.code || e?.originalError?.code;
}

function tokenOk(req: Request): boolean {
  const secret = process.env.DB_BACKFILL_SECRET;
  if (!secret) return false;
  const provided =
    (req.query.token as string) ||
    (req.headers['x-backfill-token'] as string) ||
    '';
  return provided.length > 0 && provided === secret;
}

async function listPublicTables(): Promise<string[]> {
  const result: any = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const rows: any[] = Array.isArray(result) ? result : result?.rows ?? [];
  return rows.map((r) => r.table_name as string);
}

router.get('/', async (req: Request, res: Response) => {
  if (!tokenOk(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const mode = String(req.query.mode || 'inspect');

  try {
    const existing = await listPublicTables();
    const missingBefore = REQUIRED_TABLES.filter((t) => !existing.includes(t));

    if (mode === 'inspect') {
      return res.json({
        mode,
        existingCount: existing.length,
        existing,
        missing: missingBefore,
        note:
          missingBefore.length === 0
            ? 'All required tables already present.'
            : 'Run with ?mode=apply&confirm=1 to create missing tables (additive).',
      });
    }

    if (mode === 'apply') {
      if (req.query.confirm !== '1') {
        return res
          .status(400)
          .json({ error: 'confirmation required: add &confirm=1' });
      }

      const statements = BACKFILL_DDL.split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let applied = 0;
      const skipped: number[] = [];
      const failed: Array<{ code?: string; message: string; sql: string }> = [];

      for (const stmt of statements) {
        try {
          await db.execute(sql.raw(stmt));
          applied += 1;
        } catch (e: any) {
          const code = errCode(e);
          if (code && DUPLICATE_CODES.has(code)) {
            skipped.push(1);
          } else {
            failed.push({
              code,
              message: e?.message || String(e),
              sql: stmt.slice(0, 120),
            });
          }
        }
      }

      // Seed formation content (idempotent).
      let seed: any = null;
      let seedError: string | null = null;
      try {
        const { default: seedFormation } = await import(
          '../seeds/formation-seed'
        );
        seed = await seedFormation();
      } catch (e: any) {
        seedError = e?.message || String(e);
      }

      const after = await listPublicTables();
      const stillMissing = REQUIRED_TABLES.filter((t) => !after.includes(t));

      return res.json({
        mode,
        totalStatements: statements.length,
        applied,
        skippedDuplicates: skipped.length,
        failedCount: failed.length,
        failed: failed.slice(0, 25),
        createdTables: REQUIRED_TABLES.filter(
          (t) => missingBefore.includes(t) && !stillMissing.includes(t),
        ),
        stillMissing,
        seed,
        seedError,
      });
    }

    return res.status(400).json({ error: `unknown mode: ${mode}` });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message || String(e), code: errCode(e) });
  }
});

export default router;
