/**
 * Export / Import de escala em formato .xlsx (Phase 1.5)
 *
 * Endpoints (todos restritos a usuários em ADMIN_USER_IDS):
 *   GET  /api/schedules/generation/:id/export-xlsx       → baixa o draft em xlsx
 *   POST /api/schedules/generation/:id/import-xlsx       → upload + diff (preview)
 *   POST /api/schedules/generation/:id/import-xlsx/apply → aplica o diff já validado
 *
 * Layout do .xlsx (uma linha por atribuição):
 *   Data | Dia da Semana | Horário | Missa | Tipo | Posição | ID Ministro | Ministro | Email
 */

import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { authenticateToken, type AuthRequest } from '../auth';
import { requireAdminUser } from '../config/admins';
import { db } from '../db';
import {
  schedules,
  users,
  scheduleGenerations,
  substitutionRequests
} from '@shared/schema';
import { logger } from '../utils/logger.js';

const router = Router();

const SHEET_NAME = 'Escala';
const COLUMN_HEADERS = [
  'Data',
  'Dia da Semana',
  'Horário',
  'Missa',
  'Tipo',
  'Posição',
  'ID Ministro',
  'Ministro',
  'Email'
] as const;

interface SavedScheduleSlot {
  date?: string;
  time?: string;
  type?: string;
  name?: string;
  location?: string | null;
  ministers?: Array<{ id?: string | null; name?: string; position?: number }>;
  backupMinisters?: Array<{ id?: string | null; name?: string; position?: number }>;
  confidence?: number;
}

interface ImportRow {
  rowIndex: number; // linha original do xlsx (1-based, com header)
  date: string;
  time: string;
  type: 'Titular' | 'Backup';
  position: number | null;
  ministerId: string | null;
  ministerName: string;
  email?: string;
}

interface ImportSlot {
  date: string;
  time: string;
  ministers: Array<{ id: string; name: string; position: number }>;
  backupMinisters: Array<{ id: string; name: string; position: number }>;
}

interface ImportDiff {
  date: string;
  time: string;
  before: { titulares: string[]; backups: string[] };
  after: { titulares: string[]; backups: string[] };
  changed: boolean;
}

const ALL_GENERATIONS_QUERY_LIMIT = 1;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB é mais que suficiente para escala
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    cb(null, ok);
  }
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function loadGeneration(generationId: string) {
  const [gen] = await db
    .select()
    .from(scheduleGenerations)
    .where(eq(scheduleGenerations.id, generationId))
    .limit(ALL_GENERATIONS_QUERY_LIMIT);
  return gen ?? null;
}

function getSavedSlots(gen: { originalSchedule: unknown; finalSchedule: unknown }): SavedScheduleSlot[] {
  const data = (gen.finalSchedule as { schedules?: SavedScheduleSlot[] } | null)
    || (gen.originalSchedule as { schedules?: SavedScheduleSlot[] } | null);
  if (!data) return [];
  if (Array.isArray(data)) return data as SavedScheduleSlot[];
  return Array.isArray((data as { schedules?: unknown }).schedules)
    ? (data as { schedules: SavedScheduleSlot[] }).schedules
    : [];
}

function dayOfWeekPt(dateStr: string): string {
  return format(new Date(dateStr + 'T12:00:00'), 'EEEE', { locale: ptBR });
}

/* -------------------------------------------------------------------------- */
/* GET export-xlsx                                                            */
/* -------------------------------------------------------------------------- */

router.get(
  '/generation/:id/export-xlsx',
  authenticateToken,
  requireAdminUser(),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const gen = await loadGeneration(id);
      if (!gen) {
        return res.status(404).json({ success: false, message: 'Geração não encontrada' });
      }

      const slots = getSavedSlots(gen);

      // Pre-fetch emails dos ministros para enriquecer o xlsx
      const allMinisterIds = new Set<string>();
      for (const slot of slots) {
        for (const m of slot.ministers || []) if (m.id) allMinisterIds.add(m.id);
        for (const m of slot.backupMinisters || []) if (m.id) allMinisterIds.add(m.id);
      }
      const emailMap = new Map<string, string>();
      if (allMinisterIds.size > 0) {
        const rows = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.id, [...allMinisterIds]));
        for (const r of rows) if (r.id && r.email) emailMap.set(r.id, r.email);
      }

      // Monta linhas (uma por atribuição, ordenadas por data → hora → tipo → posição)
      const rows: (string | number)[][] = [[...COLUMN_HEADERS]];
      const sortedSlots = [...slots].sort((a, b) => {
        const ka = `${a.date ?? ''} ${a.time ?? ''}`;
        const kb = `${b.date ?? ''} ${b.time ?? ''}`;
        return ka.localeCompare(kb);
      });

      for (const slot of sortedSlots) {
        if (!slot.date || !slot.time) continue;
        const massName = slot.name || slot.type || 'Missa';
        const dow = dayOfWeekPt(slot.date);

        const titulares = (slot.ministers || []).slice().sort(
          (a, b) => (a.position ?? 999) - (b.position ?? 999)
        );
        for (const m of titulares) {
          rows.push([
            slot.date,
            dow,
            slot.time,
            massName,
            'Titular',
            m.position ?? '',
            m.id ?? '',
            m.name ?? '',
            (m.id && emailMap.get(m.id)) || ''
          ]);
        }

        const backups = (slot.backupMinisters || []).slice().sort(
          (a, b) => (a.position ?? 999) - (b.position ?? 999)
        );
        for (const m of backups) {
          rows.push([
            slot.date,
            dow,
            slot.time,
            massName,
            'Backup',
            '', // backups não têm posição firme
            m.id ?? '',
            m.name ?? '',
            (m.id && emailMap.get(m.id)) || ''
          ]);
        }
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      // Larguras razoáveis para colunas
      worksheet['!cols'] = [
        { wch: 12 }, // Data
        { wch: 16 }, // Dia da Semana
        { wch: 10 }, // Horário
        { wch: 50 }, // Missa
        { wch: 10 }, // Tipo
        { wch: 10 }, // Posição
        { wch: 38 }, // ID Ministro
        { wch: 35 }, // Ministro
        { wch: 30 }  // Email
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
      const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = `escala-${gen.month?.toString().padStart(2, '0')}-${gen.year}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      logger.error('Erro ao exportar xlsx:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao exportar escala'
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* POST import-xlsx (preview)                                                 */
/* -------------------------------------------------------------------------- */

function parseImportRows(buffer: Buffer): { rows: ImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    errors.push('Planilha vazia ou ilegível');
    return { rows: [], errors };
  }
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: ImportRow[] = [];
  raw.forEach((r, i) => {
    const rowIdx = i + 2; // +1 header, +1 1-based
    const date = String(r['Data'] ?? '').trim();
    const time = String(r['Horário'] ?? r['Horario'] ?? '').trim();
    const tipo = String(r['Tipo'] ?? '').trim();
    const ministerId = String(r['ID Ministro'] ?? r['IdMinistro'] ?? r['Id Ministro'] ?? '').trim();
    const ministerName = String(r['Ministro'] ?? '').trim();
    const email = String(r['Email'] ?? '').trim();
    const positionRaw = r['Posição'] ?? r['Posicao'] ?? '';
    const position = positionRaw === '' ? null : Number(positionRaw);

    if (!date || !time) return; // pula linhas em branco
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Linha ${rowIdx}: data inválida "${date}" — esperado YYYY-MM-DD`);
      return;
    }
    if (!/^\d{2}:\d{2}/.test(time)) {
      errors.push(`Linha ${rowIdx}: horário inválido "${time}" — esperado HH:MM`);
      return;
    }
    if (tipo !== 'Titular' && tipo !== 'Backup') {
      errors.push(`Linha ${rowIdx}: Tipo deve ser "Titular" ou "Backup", veio "${tipo}"`);
      return;
    }
    if (!ministerId && !email) {
      errors.push(`Linha ${rowIdx}: faltou ID Ministro ou Email`);
      return;
    }

    rows.push({
      rowIndex: rowIdx,
      date,
      time: time.substring(0, 5), // HH:MM
      type: tipo,
      position: tipo === 'Titular' && position !== null && !Number.isNaN(position) ? position : null,
      ministerId: ministerId || null,
      ministerName,
      email: email || undefined
    });
  });

  return { rows, errors };
}

async function resolveMinisterIds(
  rows: ImportRow[]
): Promise<{ resolved: ImportRow[]; errors: string[] }> {
  const errors: string[] = [];
  // Separa quem precisa lookup por email
  const emailLookups = rows
    .filter(r => !r.ministerId && r.email)
    .map(r => r.email!.toLowerCase());

  let emailToId: Map<string, string> = new Map();
  if (emailLookups.length > 0) {
    const found = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, emailLookups));
    emailToId = new Map(found.map(r => [r.email.toLowerCase(), r.id!]));
  }

  // Valida IDs existentes (todos rowsIds não-nulos)
  const idsToCheck = [...new Set(rows.filter(r => r.ministerId).map(r => r.ministerId!))];
  let knownIds: Set<string> = new Set();
  if (idsToCheck.length > 0) {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, idsToCheck));
    knownIds = new Set(found.map(r => r.id!));
  }

  const resolved: ImportRow[] = [];
  for (const r of rows) {
    if (r.ministerId) {
      if (!knownIds.has(r.ministerId)) {
        errors.push(`Linha ${r.rowIndex}: ID Ministro "${r.ministerId}" não existe`);
        continue;
      }
      resolved.push(r);
    } else if (r.email) {
      const id = emailToId.get(r.email.toLowerCase());
      if (!id) {
        errors.push(`Linha ${r.rowIndex}: email "${r.email}" não corresponde a nenhum ministro`);
        continue;
      }
      resolved.push({ ...r, ministerId: id });
    }
  }
  return { resolved, errors };
}

function groupIntoSlots(rows: ImportRow[]): { slots: ImportSlot[]; errors: string[] } {
  const errors: string[] = [];
  const map = new Map<string, ImportSlot>();
  for (const r of rows) {
    const key = `${r.date}_${r.time}`;
    let slot = map.get(key);
    if (!slot) {
      slot = { date: r.date, time: r.time, ministers: [], backupMinisters: [] };
      map.set(key, slot);
    }
    const entry = { id: r.ministerId!, name: r.ministerName, position: r.position ?? 0 };
    if (r.type === 'Titular') {
      // duplicado de ministro no mesmo slot?
      if (slot.ministers.some(m => m.id === entry.id)) {
        errors.push(`Linha ${r.rowIndex}: ${r.ministerName} aparece como Titular duplicado em ${r.date} ${r.time}`);
        continue;
      }
      slot.ministers.push(entry);
    } else {
      if (slot.backupMinisters.some(m => m.id === entry.id)) {
        errors.push(`Linha ${r.rowIndex}: ${r.ministerName} aparece como Backup duplicado em ${r.date} ${r.time}`);
        continue;
      }
      slot.backupMinisters.push(entry);
    }
  }

  // Renormaliza posições de titulares
  const slots = [...map.values()];
  for (const s of slots) {
    s.ministers.sort((a, b) => (a.position || 999) - (b.position || 999));
    s.ministers.forEach((m, idx) => { m.position = m.position || (idx + 1); });
  }
  return { slots, errors };
}

function buildDiff(
  before: SavedScheduleSlot[],
  after: ImportSlot[]
): ImportDiff[] {
  const beforeByKey = new Map<string, SavedScheduleSlot>();
  for (const s of before) {
    if (s.date && s.time) beforeByKey.set(`${s.date}_${s.time}`, s);
  }
  const afterByKey = new Map<string, ImportSlot>();
  for (const s of after) afterByKey.set(`${s.date}_${s.time}`, s);

  const allKeys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
  const diffs: ImportDiff[] = [];

  for (const key of [...allKeys].sort()) {
    const b = beforeByKey.get(key);
    const a = afterByKey.get(key);
    const [date, time] = key.split('_');

    const beforeTit = (b?.ministers || []).map(m => m.name || '').filter(Boolean);
    const beforeBack = (b?.backupMinisters || []).map(m => m.name || '').filter(Boolean);
    const afterTit = (a?.ministers || []).map(m => m.name || '').filter(Boolean);
    const afterBack = (a?.backupMinisters || []).map(m => m.name || '').filter(Boolean);

    const changed =
      JSON.stringify(beforeTit) !== JSON.stringify(afterTit) ||
      JSON.stringify(beforeBack) !== JSON.stringify(afterBack);

    diffs.push({
      date,
      time,
      before: { titulares: beforeTit, backups: beforeBack },
      after: { titulares: afterTit, backups: afterBack },
      changed
    });
  }
  return diffs;
}

router.post(
  '/generation/:id/import-xlsx',
  authenticateToken,
  requireAdminUser(),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Arquivo .xlsx não enviado' });
      }

      const gen = await loadGeneration(id);
      if (!gen) {
        return res.status(404).json({ success: false, message: 'Geração não encontrada' });
      }

      const { rows, errors: parseErrors } = parseImportRows(req.file.buffer);
      if (rows.length === 0 && parseErrors.length > 0) {
        return res.status(400).json({ success: false, message: 'Planilha sem linhas válidas', errors: parseErrors });
      }

      const { resolved, errors: resolveErrors } = await resolveMinisterIds(rows);
      const { slots: importedSlots, errors: groupErrors } = groupIntoSlots(resolved);

      const allErrors = [...parseErrors, ...resolveErrors, ...groupErrors];
      const before = getSavedSlots(gen);
      const diffs = buildDiff(before, importedSlots);

      // Token simples para "validate-only → apply" (json string com hash leve)
      // Usuário precisa enviar essas slots de volta no apply.
      res.json({
        success: true,
        data: {
          generationId: id,
          totalRows: rows.length,
          totalSlots: importedSlots.length,
          changedSlotsCount: diffs.filter(d => d.changed).length,
          errors: allErrors,
          diffs,
          // Mandamos os slots de volta para o cliente reenviar no apply, evitando
          // estado intermediário no servidor.
          importedSlots
        }
      });
    } catch (error) {
      logger.error('Erro ao importar xlsx (preview):', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao processar planilha'
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* POST import-xlsx/apply                                                     */
/* -------------------------------------------------------------------------- */

router.post(
  '/generation/:id/import-xlsx/apply',
  authenticateToken,
  requireAdminUser(),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const importedSlots = req.body?.importedSlots as ImportSlot[] | undefined;
      if (!Array.isArray(importedSlots) || importedSlots.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum slot recebido para aplicar' });
      }

      const gen = await loadGeneration(id);
      if (!gen) {
        return res.status(404).json({ success: false, message: 'Geração não encontrada' });
      }
      if (gen.status !== 'draft') {
        return res.status(400).json({ success: false, message: 'Só é possível importar em escalas em draft' });
      }

      const before = getSavedSlots(gen);
      const beforeByKey = new Map<string, SavedScheduleSlot>();
      for (const s of before) if (s.date && s.time) beforeByKey.set(`${s.date}_${s.time}`, s);

      // Mescla: para cada slot na planilha, substitui o slot correspondente.
      // Slots não presentes na planilha permanecem intocados.
      const merged: SavedScheduleSlot[] = before.map(s => ({ ...s }));
      for (const slot of importedSlots) {
        const key = `${slot.date}_${slot.time}`;
        const idx = merged.findIndex(s => s.date === slot.date && s.time === slot.time);
        const baseline = beforeByKey.get(key);
        const newSlot: SavedScheduleSlot = {
          date: slot.date,
          time: slot.time,
          type: baseline?.type,
          name: baseline?.name,
          location: baseline?.location ?? null,
          confidence: baseline?.confidence ?? 1,
          ministers: slot.ministers.map((m, i) => ({ id: m.id, name: m.name, position: m.position || (i + 1) })),
          backupMinisters: slot.backupMinisters.map((m, i) => ({
            id: m.id,
            name: m.name,
            position: m.position || (slot.ministers.length + i + 1)
          }))
        };
        if (idx >= 0) merged[idx] = newSlot;
        else merged.push(newSlot);
      }

      // Persiste:
      // 1) Atualiza original_schedule.schedules na schedule_generations
      // 2) Reescreve as linhas em schedules (e substitution_requests filhas) para
      //    cada slot importado.
      await db.transaction(async (tx: typeof db) => {
        const newJson = {
          ...(gen.originalSchedule as Record<string, unknown> | null) ?? {},
          month: gen.month,
          year: gen.year,
          totalMasses: merged.length,
          schedules: merged,
          generatedAt: new Date().toISOString(),
          importedAt: new Date().toISOString()
        };
        await tx
          .update(scheduleGenerations)
          .set({ originalSchedule: newJson })
          .where(eq(scheduleGenerations.id, id));

        for (const slot of importedSlots) {
          // Limpa substitution_requests filhas dos schedules deste slot
          const oldIds = await tx
            .select({ id: schedules.id })
            .from(schedules)
            .where(and(eq(schedules.date, slot.date), eq(schedules.time, slot.time)));
          if (oldIds.length > 0) {
            const idsArr = oldIds.map(r => r.id);
            await tx
              .delete(substitutionRequests)
              .where(inArray(substitutionRequests.scheduleId, idsArr));
            await tx
              .delete(schedules)
              .where(and(eq(schedules.date, slot.date), eq(schedules.time, slot.time)));
          }

          // Insere os novos titulares
          for (let i = 0; i < slot.ministers.length; i++) {
            const m = slot.ministers[i];
            await tx.insert(schedules).values({
              date: slot.date,
              time: slot.time,
              type: 'missa',
              location: null,
              ministerId: m.id,
              position: m.position || i + 1,
              status: 'scheduled',
              notes: 'Importado via xlsx'
            });
          }
        }
      });

      res.json({ success: true, message: `Escala atualizada: ${importedSlots.length} slot(s)` });
    } catch (error) {
      logger.error('Erro ao aplicar import xlsx:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao aplicar import'
      });
    }
  }
);

export default router;
