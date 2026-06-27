import { describe, expect, it } from "vitest";
import { isMissingTableError } from "../../../server/utils/databaseErrors";

describe("database error helpers", () => {
  it("detects a missing Postgres relation for the expected table", () => {
    expect(isMissingTableError({
      code: "42P01",
      message: 'relation "mass_times_config" does not exist',
    }, "mass_times_config")).toBe(true);
  });

  it("detects a missing SQLite table for the expected table", () => {
    expect(isMissingTableError({
      code: "SQLITE_ERROR",
      message: "no such table: mass_times_config",
    }, "mass_times_config")).toBe(true);
  });

  it("does not match another missing table", () => {
    expect(isMissingTableError({
      code: "42P01",
      message: 'relation "users" does not exist',
    }, "mass_times_config")).toBe(false);
  });

  it("detects missing native adoration support tables", () => {
    expect(isMissingTableError({
      code: "42P01",
      message: 'relation "adoration_draws" does not exist',
    }, "adoration_draws")).toBe(true);
  });
});
