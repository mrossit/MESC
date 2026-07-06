import { describe, expect, it } from "vitest";
import { getVisibleFormationTracks } from "../../../client/src/lib/formationVisibility";

describe("formation visibility", () => {
  it("shows not-started active modules to ministers", () => {
    const tracks = [
      {
        id: "mesc-formation-2026",
        modules: [
          { id: "module-open", isActive: true, stats: { progressPercentage: 0 } },
          { id: "module-complete", isActive: true, stats: { progressPercentage: 100 } },
          { id: "module-hidden", isActive: false, stats: { progressPercentage: 0 } },
        ],
      },
    ];

    const visible = getVisibleFormationTracks(tracks, false);

    expect(visible).toHaveLength(1);
    expect(visible[0].modules.map((module) => module.id)).toEqual([
      "module-open",
      "module-complete",
    ]);
  });

  it("removes tracks with no active modules", () => {
    const tracks = [
      {
        id: "empty-track",
        modules: [{ id: "inactive", isActive: false }],
      },
    ];

    expect(getVisibleFormationTracks(tracks, false)).toEqual([]);
  });
});
