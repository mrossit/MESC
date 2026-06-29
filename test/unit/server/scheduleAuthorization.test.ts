import { describe, expect, it } from "vitest";
import {
  canDeleteEntireMass,
  canRearrangeMassSchedule,
  isAuxiliarOneOrTwoForMass,
} from "../../../server/utils/scheduleAuthorization";

const assignments = [
  { ministerId: "aux-1", position: 1 },
  { ministerId: "aux-2", position: 2 },
  { ministerId: "minister-3", position: 3 },
  { ministerId: null, position: 4 },
];

describe("schedule authorization", () => {
  it("allows ministers assigned as Auxiliar 1 or Auxiliar 2 for the mass", () => {
    expect(isAuxiliarOneOrTwoForMass("aux-1", assignments)).toBe(true);
    expect(isAuxiliarOneOrTwoForMass("aux-2", assignments)).toBe(true);
  });

  it("does not allow other assigned ministers or unassigned users", () => {
    expect(isAuxiliarOneOrTwoForMass("minister-3", assignments)).toBe(false);
    expect(isAuxiliarOneOrTwoForMass("other-minister", assignments)).toBe(false);
    expect(isAuxiliarOneOrTwoForMass(undefined, assignments)).toBe(false);
  });

  it("allows admins regardless of assignment", () => {
    expect(canRearrangeMassSchedule({
      role: "coordenador_comunidade",
      userId: "other-minister",
      assignments,
    })).toBe(true);
  });

  it("denies regular ministers unless they are Auxiliar 1 or 2", () => {
    expect(canRearrangeMassSchedule({
      role: "ministro",
      userId: "minister-3",
      assignments,
    })).toBe(false);

    expect(canRearrangeMassSchedule({
      role: "ministro",
      userId: "aux-1",
      assignments,
    })).toBe(true);
  });

  it("only allows coordination to delete the entire mass — never Auxiliar 1/2", () => {
    expect(canDeleteEntireMass("ministro")).toBe(false);
    expect(canDeleteEntireMass(undefined)).toBe(false);
    expect(canDeleteEntireMass("coordenador_comunidade")).toBe(true);
    expect(canDeleteEntireMass("gestor")).toBe(true);
  });
});
