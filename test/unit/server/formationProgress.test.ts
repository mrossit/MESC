import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("../../../server/db", () => ({
  db: dbMock,
}));

const trackRow = {
  id: "track-liturgia",
  title: "Liturgia",
  description: null,
  category: "liturgia",
  orderIndex: 1,
  isRequired: "1",
  estimatedDuration: 0,
  icon: null,
  isActive: "1",
};

const moduleRow = {
  id: "module-ritos",
  trackId: "track-liturgia",
  title: "Ritos e cuidados",
  description: null,
  orderIndex: 1,
  estimatedDuration: 0,
  durationMinutes: 20,
  content: null,
  videoUrl: null,
  isActive: "1",
};

const lessonRow = {
  id: "lesson-altar",
  moduleId: "module-ritos",
  trackId: "track-liturgia",
  title: "Preparação do altar",
  description: null,
  orderIndex: 1,
  lessonNumber: 1,
  estimatedDuration: 20,
  contentType: "text",
  contentUrl: "",
  videoUrl: "",
  documentUrl: "",
};

function queueFormationOverviewRows(progressRows: unknown[]) {
  dbMock.execute
    .mockResolvedValueOnce({ rows: [trackRow] })
    .mockResolvedValueOnce({ rows: [moduleRow] })
    .mockResolvedValueOnce({ rows: [lessonRow] })
    .mockResolvedValueOnce({ rows: progressRows });
}

describe("formation progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.execute.mockReset();
  });

  it("does not treat string zero from the database as a completed lesson", async () => {
    queueFormationOverviewRows([
      {
        id: "progress-1",
        userId: "user-1",
        lessonId: "lesson-altar",
        status: "not_started",
        isCompleted: "0",
        completedAt: null,
        timeSpent: 0,
        progressPercentage: 0,
        completedSections: [],
        quizScore: 0,
        notes: "",
      },
    ]);

    const { getFormationOverview } = await import("../../../server/services/formationService");
    const overview = await getFormationOverview("user-1");

    const track = overview.tracks[0];
    const lesson = track.modules[0].lessons[0];

    expect(track.stats.completedLessons).toBe(0);
    expect(track.stats.progressPercentage).toBe(0);
    expect(lesson.progress.status).toBe("not_started");
    expect(lesson.progress.progressPercentage).toBe(0);
  });

  it("keeps partial progress as in progress when the database returns string zero", async () => {
    queueFormationOverviewRows([
      {
        id: "progress-1",
        userId: "user-1",
        lessonId: "lesson-altar",
        status: "in_progress",
        isCompleted: "0",
        completedAt: null,
        timeSpent: 10,
        progressPercentage: 50,
        completedSections: ["section-1"],
        quizScore: 0,
        notes: "",
      },
    ]);

    const { getFormationOverview } = await import("../../../server/services/formationService");
    const overview = await getFormationOverview("user-1");

    const track = overview.tracks[0];
    const lesson = track.modules[0].lessons[0];

    expect(track.stats.completedLessons).toBe(0);
    expect(track.stats.inProgressLessons).toBe(1);
    expect(lesson.progress.status).toBe("in_progress");
    expect(lesson.progress.progressPercentage).toBe(50);
  });

  it("treats string one from the database as a completed lesson", async () => {
    queueFormationOverviewRows([
      {
        id: "progress-1",
        userId: "user-1",
        lessonId: "lesson-altar",
        status: "completed",
        isCompleted: "1",
        completedAt: "2026-07-14T12:00:00.000Z",
        timeSpent: 20,
        progressPercentage: 100,
        completedSections: ["section-1", "section-2"],
        quizScore: 0,
        notes: "",
      },
    ]);

    const { getFormationOverview } = await import("../../../server/services/formationService");
    const overview = await getFormationOverview("user-1");

    const track = overview.tracks[0];
    const lesson = track.modules[0].lessons[0];

    expect(track.stats.completedLessons).toBe(1);
    expect(track.stats.progressPercentage).toBe(100);
    expect(lesson.progress.status).toBe("completed");
    expect(lesson.progress.progressPercentage).toBe(100);
  });

  it("marks a valid lesson section as partial progress", async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ id: "section-1" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] })
      .mockResolvedValueOnce({ rows: [] });

    const { markLessonSectionCompleted } = await import("../../../server/services/formationService");
    const progress = await markLessonSectionCompleted({
      userId: "user-1",
      lessonId: "lesson-altar",
      sectionId: "section-1",
    });

    expect(progress).toMatchObject({
      status: "in_progress",
      progressPercentage: 50,
      timeSpent: 1,
      completedSections: ["section-1"],
    });
    expect(dbMock.execute).toHaveBeenCalledTimes(4);
  });

  it("does not write progress when the section does not belong to the lesson", async () => {
    dbMock.execute.mockResolvedValueOnce({ rows: [] });

    const { markLessonSectionCompleted } = await import("../../../server/services/formationService");
    const progress = await markLessonSectionCompleted({
      userId: "user-1",
      lessonId: "lesson-altar",
      sectionId: "section-outside-lesson",
    });

    expect(progress).toBeNull();
    expect(dbMock.execute).toHaveBeenCalledTimes(1);
  });
});
