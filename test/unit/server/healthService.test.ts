import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(
  (): {
    execute?: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  } => ({
    execute: vi.fn(),
    get: vi.fn(),
  })
);

vi.mock("../../../server/db", () => ({
  db: dbMock,
}));

describe("healthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.execute = vi.fn().mockResolvedValue({ rows: [{ ready: 1 }] });
    dbMock.get = vi.fn().mockReturnValue({ ready: 1 });
  });

  it("returns a shallow healthy status without checking the database", async () => {
    const { getHealthStatus } = await import("../../../server/services/healthService");

    const health = await getHealthStatus();

    expect(health.status).toBe("ok");
    expect(health.database).toBeUndefined();
    expect(dbMock.execute).not.toHaveBeenCalled();
    expect(dbMock.get).not.toHaveBeenCalled();
  });

  it("checks the database for readiness", async () => {
    const { getHealthStatus } = await import("../../../server/services/healthService");

    const health = await getHealthStatus({ includeDatabase: true });

    expect(health.status).toBe("ok");
    expect(health.database?.status).toBe("ok");
    expect(dbMock.execute).toHaveBeenCalledOnce();
    expect(dbMock.get).not.toHaveBeenCalled();
  });

  it("uses the SQLite get fallback when execute is unavailable", async () => {
    dbMock.execute = undefined;
    const { getHealthStatus } = await import("../../../server/services/healthService");

    const health = await getHealthStatus({ includeDatabase: true });

    expect(health.status).toBe("ok");
    expect(health.database?.status).toBe("ok");
    expect(dbMock.get).toHaveBeenCalledOnce();
  });

  it("marks readiness as degraded when the database check fails", async () => {
    dbMock.execute?.mockRejectedValueOnce(new Error("connection failed"));
    const { getHealthStatus } = await import("../../../server/services/healthService");

    const health = await getHealthStatus({ includeDatabase: true });

    expect(health.status).toBe("degraded");
    expect(health.database?.status).toBe("error");
    expect(health.database?.message).toContain("connection failed");
  });
});
