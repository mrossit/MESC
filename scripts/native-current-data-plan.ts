import { createHash } from "node:crypto";

export type NativeCurrentDataRow = Record<string, unknown>;

export type NativeFamilyRow = {
  id: string;
  name: string;
  prefer_serve_together: boolean;
};

export type NativeUserFamilyLink = {
  id: string;
  family_id: string;
  can_serve_as_couple: boolean;
  spouse_minister_id?: string;
};

export type NativeFamilyImportPlan = {
  families: NativeFamilyRow[];
  userLinks: NativeUserFamilyLink[];
  relationshipRows: NativeCurrentDataRow[];
};

export type LegacyUserIdMap = ReadonlyMap<string, string>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stableUuid(input: string) {
  const hash = createHash("sha256").update(input).digest("hex");
  const variant = ((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function relationshipKey(userId: string, relatedUserId: string) {
  return `${userId}\u0000${relatedUserId}`;
}

function graphComponents(rows: NativeCurrentDataRow[]) {
  const links = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    const values = links.get(from) ?? new Set<string>();
    values.add(to);
    links.set(from, values);
  };

  for (const row of rows) {
    const userId = stringValue(row.user_id);
    const relatedUserId = stringValue(row.related_user_id);
    if (!userId || !relatedUserId) throw new Error("Relacao familiar sem usuario ou familiar relacionado.");
    if (userId === relatedUserId) throw new Error("Relacao familiar nao pode apontar para o mesmo usuario.");
    add(userId, relatedUserId);
    add(relatedUserId, userId);
  }

  const visited = new Set<string>();
  return [...links.keys()]
    .sort()
    .flatMap((firstId) => {
      if (visited.has(firstId)) return [];
      const queue = [firstId];
      const members: string[] = [];
      visited.add(firstId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        members.push(current);
        for (const relatedId of links.get(current) ?? []) {
          if (!visited.has(relatedId)) {
            visited.add(relatedId);
            queue.push(relatedId);
          }
        }
      }

      return [members.sort()];
    });
}

/**
 * Converts legacy relationship rows into groups that the native scheduler understands.
 * The source has no stable families table, so IDs are derived from the members and stay
 * repeatable across imports. Groups start as separate-service until the family confirms
 * a shared scheduling preference in the native app.
 */
export function buildNativeFamilyImportPlan(rows: NativeCurrentDataRow[]): NativeFamilyImportPlan {
  const directionalRelationships = new Set<string>();
  const spouseLinks = new Map<string, string>();

  for (const row of rows) {
    const userId = stringValue(row.user_id);
    const relatedUserId = stringValue(row.related_user_id);
    const relationshipType = stringValue(row.relationship_type).toLowerCase();
    if (!userId || !relatedUserId || !relationshipType) {
      throw new Error("Relacao familiar sem usuario, familiar relacionado ou tipo.");
    }

    const directionalKey = relationshipKey(userId, relatedUserId);
    if (directionalRelationships.has(directionalKey)) {
      throw new Error("Relacao familiar duplicada para o mesmo par de usuarios.");
    }
    directionalRelationships.add(directionalKey);

    if (relationshipType === "spouse") {
      const existing = spouseLinks.get(userId);
      if (existing && existing !== relatedUserId) {
        throw new Error("Usuario com mais de um conjuge no export legado.");
      }
      spouseLinks.set(userId, relatedUserId);
    }
  }

  for (const [userId, spouseId] of spouseLinks) {
    if (spouseLinks.get(spouseId) !== userId) {
      throw new Error("Vinculo de casal sem reciprocidade no export legado.");
    }
  }

  const families = graphComponents(rows)
    .map((memberIds) => ({
      id: stableUuid(`mesc-native-family-v1:${memberIds.join(",")}`),
      members: memberIds,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const userLinks = families.flatMap((family) => family.members.map((userId) => {
    const spouseId = spouseLinks.get(userId);
    return {
      id: userId,
      family_id: family.id,
      can_serve_as_couple: Boolean(spouseId),
      ...(spouseId ? { spouse_minister_id: spouseId } : {}),
    };
  }));

  return {
    families: families.map((family, index) => ({
      id: family.id,
      name: `Nucleo familiar importado ${index + 1}`,
      // Legacy relations do not encode consent to schedule together.
      prefer_serve_together: false,
    })),
    userLinks,
    relationshipRows: rows,
  };
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Historical notices remain visible in the inbox but are marked read. They must never
 * be mistaken for fresh push work after a migration from the legacy PWA.
 */
export function normalizeHistoricalNotification(row: NativeCurrentDataRow): NativeCurrentDataRow {
  const createdAt = stringValue(row.created_at);
  return {
    ...row,
    data: {
      ...jsonObject(row.data),
      migration: {
        source: "legacy-pwa-export",
        historical: true,
        sourceRead: row.read === true,
      },
    },
    read: true,
    read_at: stringValue(row.read_at) || createdAt || null,
  };
}

function remapId(value: unknown, userIds: LegacyUserIdMap) {
  return typeof value === "string" ? userIds.get(value) ?? value : value;
}

function remapIdArray(value: unknown, userIds: LegacyUserIdMap) {
  return Array.isArray(value) ? value.map((id) => remapId(id, userIds)) : value;
}

/**
 * A previous import or identity provider may have assigned different native IDs to
 * the same e-mail address. Keep every dependent legacy row attached to that person.
 */
export function remapLegacyUserReferences(
  row: NativeCurrentDataRow,
  userIds: LegacyUserIdMap,
  options: { remapRowId?: boolean } = {},
): NativeCurrentDataRow {
  const mapped = { ...row };
  for (const field of [
    "user_id",
    "minister_id",
    "substitute_id",
    "created_by_id",
    "shared_from_user_id",
    "spouse_minister_id",
    "related_user_id",
  ]) {
    if (field in mapped) mapped[field] = remapId(mapped[field], userIds);
  }
  if (options.remapRowId && "id" in mapped) mapped.id = remapId(mapped.id, userIds);
  for (const field of ["target_user_ids", "notified_user_ids", "shared_with_family_ids"]) {
    if (field in mapped) mapped[field] = remapIdArray(mapped[field], userIds);
  }
  return mapped;
}
