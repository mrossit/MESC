/**
 * Three-way merge for questionnaire question arrays.
 * Resolves concurrent edits by comparing changes against a common base version.
 */

export interface MergeableQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  required?: boolean;
  category?: string;
  editable?: boolean;
  modified?: boolean;
  order?: number;
  metadata?: Record<string, unknown>;
}

export interface MergeConflict {
  questionId: string;
  type: 'both_modified' | 'delete_modify_conflict';
  description: string;
}

export interface MergeResult {
  success: boolean;
  merged?: MergeableQuestion[];
  conflicts?: MergeConflict[];
}

function buildMap(questions: MergeableQuestion[]): Map<string, MergeableQuestion> {
  const map = new Map<string, MergeableQuestion>();
  for (const q of questions) {
    map.set(q.id, q);
  }
  return map;
}

/** Compare two questions ignoring transient fields (editable). */
function questionsEqual(a: MergeableQuestion, b: MergeableQuestion): boolean {
  const normalize = (q: MergeableQuestion) => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    required: q.required,
    category: q.category,
    order: q.order,
    metadata: q.metadata,
  });
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * Perform a three-way merge of question arrays.
 *
 * @param base     - The questions as they were when the client loaded the template (snapshot).
 * @param current  - The questions currently in the database (may have been changed by another coordinator).
 * @param incoming - The questions the client is trying to save.
 * @returns MergeResult with either the merged array or a list of conflicts.
 */
export function mergeQuestionChanges(
  base: MergeableQuestion[],
  current: MergeableQuestion[],
  incoming: MergeableQuestion[]
): MergeResult {
  const baseMap = buildMap(base);
  const currentMap = buildMap(current);
  const incomingMap = buildMap(incoming);

  // Collect all known question IDs
  const allIds = new Set<string>();
  for (const q of base) allIds.add(q.id);
  for (const q of current) allIds.add(q.id);
  for (const q of incoming) allIds.add(q.id);

  const merged: MergeableQuestion[] = [];
  const conflicts: MergeConflict[] = [];

  // Track which IDs we've processed so we can preserve ordering later
  const processedIds = new Set<string>();

  for (const id of allIds) {
    const inBase = baseMap.has(id);
    const inCurrent = currentMap.has(id);
    const inIncoming = incomingMap.has(id);

    const baseQ = baseMap.get(id);
    const currentQ = currentMap.get(id);
    const incomingQ = incomingMap.get(id);

    if (inBase && inCurrent && inIncoming) {
      // Question exists in all three
      const currentChanged = !questionsEqual(baseQ!, currentQ!);
      const incomingChanged = !questionsEqual(baseQ!, incomingQ!);

      if (!currentChanged && !incomingChanged) {
        // Neither changed it
        merged.push(currentQ!);
      } else if (currentChanged && !incomingChanged) {
        // Only current (other coordinator) changed it
        merged.push(currentQ!);
      } else if (!currentChanged && incomingChanged) {
        // Only incoming (this coordinator) changed it
        merged.push(incomingQ!);
      } else {
        // Both changed the same question
        if (questionsEqual(currentQ!, incomingQ!)) {
          // Both made the same change - no conflict
          merged.push(currentQ!);
        } else {
          conflicts.push({
            questionId: id,
            type: 'both_modified',
            description: `A pergunta "${baseQ!.question.substring(0, 50)}..." foi modificada por ambos os coordenadores.`,
          });
        }
      }
    } else if (inBase && inCurrent && !inIncoming) {
      // Incoming deleted it
      const currentChanged = !questionsEqual(baseQ!, currentQ!);
      if (currentChanged) {
        // Other coordinator modified a question that this one deleted - conflict
        conflicts.push({
          questionId: id,
          type: 'delete_modify_conflict',
          description: `A pergunta "${baseQ!.question.substring(0, 50)}..." foi modificada por outro coordenador e removida por você.`,
        });
      } else {
        // Other coordinator didn't touch it, accept deletion (omit from merged)
      }
    } else if (inBase && !inCurrent && inIncoming) {
      // Current (other coordinator) deleted it
      const incomingChanged = !questionsEqual(baseQ!, incomingQ!);
      if (incomingChanged) {
        // This coordinator modified a question that the other deleted - conflict
        conflicts.push({
          questionId: id,
          type: 'delete_modify_conflict',
          description: `A pergunta "${baseQ!.question.substring(0, 50)}..." foi removida por outro coordenador e modificada por você.`,
        });
      } else {
        // This coordinator didn't touch it, accept other's deletion (omit from merged)
      }
    } else if (inBase && !inCurrent && !inIncoming) {
      // Both deleted it - no conflict, omit
    } else if (!inBase && inCurrent && !inIncoming) {
      // Added only by other coordinator
      merged.push(currentQ!);
    } else if (!inBase && !inCurrent && inIncoming) {
      // Added only by this coordinator
      merged.push(incomingQ!);
    } else if (!inBase && inCurrent && inIncoming) {
      // Added by both (same ID) - shouldn't normally happen since IDs include timestamps
      // Keep current version
      merged.push(currentQ!);
    }

    processedIds.add(id);
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  // Preserve ordering: use current order as base, append any new incoming questions at the end
  const currentOrder = current.map(q => q.id);
  const incomingOnlyIds = incoming
    .filter(q => !baseMap.has(q.id) && !currentMap.has(q.id))
    .map(q => q.id);

  const mergedMap = buildMap(merged);
  const orderedMerged: MergeableQuestion[] = [];

  // First, follow current order for questions that survived
  for (const id of currentOrder) {
    if (mergedMap.has(id)) {
      orderedMerged.push(mergedMap.get(id)!);
      mergedMap.delete(id);
    }
  }

  // Then append new questions from incoming
  for (const id of incomingOnlyIds) {
    if (mergedMap.has(id)) {
      orderedMerged.push(mergedMap.get(id)!);
      mergedMap.delete(id);
    }
  }

  // Any remaining (shouldn't happen, but safety)
  for (const q of mergedMap.values()) {
    orderedMerged.push(q);
  }

  return { success: true, merged: orderedMerged };
}
