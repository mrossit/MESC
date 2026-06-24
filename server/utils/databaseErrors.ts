export function isMissingTableError(error: unknown, tableName: string): boolean {
  const candidate = error as { code?: string; message?: string; table?: string };
  const message = String(candidate?.message ?? "");

  if (candidate?.code === "42P01") {
    return candidate.table === tableName || message.includes(`"${tableName}"`);
  }

  if (candidate?.code === "SQLITE_ERROR") {
    return message.includes(`no such table: ${tableName}`);
  }

  return false;
}
