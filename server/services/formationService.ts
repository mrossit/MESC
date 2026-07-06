import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

type TrackRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  orderIndex: number | null;
  isRequired: number | boolean | null;
  estimatedDuration: number | null;
  icon: string | null;
  isActive: number | boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ModuleRow = {
  id: string;
  trackId: string;
  title: string;
  description: string | null;
  orderIndex: number | null;
  estimatedDuration: number | null;
  durationMinutes: number | null;
  content: string | null;
  videoUrl: string | null;
  isActive?: number | boolean | null;
};

type LessonRow = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  orderIndex: number | null;
  lessonNumber: number;
  estimatedDuration: number | null;
  contentType: string | null;
  contentUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  trackId: string | null;
};

type SectionRow = {
  id: string;
  lessonId: string;
  title: string;
  content: string | null;
  orderIndex: number | null;
  contentType: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  documentUrl: string | null;
  quizData: string | null;
  interactiveData: string | null;
};

type ProgressRow = {
  id: string;
  userId: string;
  lessonId: string;
  status?: "not_started" | "in_progress" | "completed" | null;
  isCompleted: number | boolean;
  completedAt: string | null;
  timeSpent: number | null;
  progressPercentage?: number | null;
  completedSections?: unknown;
  quizScore: number | null;
  notes: string | null;
};

type ProgressWithLessonRow = ProgressRow & {
  lessonEstimatedDuration: number | null;
  lessonModuleId: string;
  lessonNumber: number;
  lessonTrackId: string | null;
};

export type LessonProgressView = {
  status: "not_started" | "in_progress" | "completed";
  progressPercentage: number;
  timeSpent: number;
  completedSections: string[];
};

export type LessonSectionView = {
  id: string;
  title: string;
  content: string | null;
  contentType: string | null;
  orderIndex: number;
  videoUrl: string | null;
  audioUrl: string | null;
  documentUrl: string | null;
  estimatedMinutes: number | null;
  quizData?: unknown;
  interactiveData?: unknown;
};

export type LessonDetailView = {
  lesson: {
    id: string;
    moduleId: string;
    trackId: string | null;
    title: string;
    description: string | null;
    lessonNumber: number;
    estimatedDuration: number | null;
    contentType: string | null;
    contentUrl: string | null;
    videoUrl: string | null;
    documentUrl: string | null;
  };
  sections: LessonSectionView[];
  progress: LessonProgressView;
};

export type ModuleLessonView = LessonRow & {
  progress: LessonProgressView;
};

export type ModuleOverviewView = ModuleRow & {
  lessons: ModuleLessonView[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    progressPercentage: number;
  };
};

export type TrackOverviewView = TrackRow & {
  modules: ModuleOverviewView[];
  stats: {
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    progressPercentage: number;
  };
  nextLesson: ModuleLessonView | null;
};

export type FormationOverviewResponse = {
  tracks: TrackOverviewView[];
  summary: {
    totalTracks: number;
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
    percentageCompleted: number;
    lastUpdated: string;
  };
};

type QueryResult = { rows?: unknown[] } | unknown[] | null | undefined;

const parseRows = <T>(result: QueryResult): T[] => {
  if (!result) return [];
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows as T[];
  }
  return [];
};

const parseCompletedSections = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((section): section is string => typeof section === "string");
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return parseCompletedSections(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
};

const parseProgressMeta = (
  progressRow?: Pick<ProgressRow, "notes" | "completedSections" | "progressPercentage"> | null
): { completedSections: string[]; progressPercentage: number } => {
  if (!progressRow) {
    return { completedSections: [], progressPercentage: 0 };
  }

  const completedSections = parseCompletedSections(progressRow.completedSections);
  if (completedSections.length > 0 || typeof progressRow.progressPercentage === "number") {
    return {
      completedSections,
      progressPercentage: progressRow.progressPercentage ?? 0,
    };
  }

  if (!progressRow.notes) {
    return { completedSections: [], progressPercentage: 0 };
  }

  try {
    const parsed = JSON.parse(progressRow.notes);
    return {
      completedSections: Array.isArray(parsed?.completedSections) ? parsed.completedSections : [],
      progressPercentage: typeof parsed?.progressPercentage === "number" ? parsed.progressPercentage : 0,
    };
  } catch {
    return { completedSections: [], progressPercentage: 0 };
  }
};

const buildLessonProgressView = (
  lesson: LessonRow,
  progressRow?: ProgressRow,
  totalSections?: number
): LessonProgressView => {
  if (!progressRow) {
    return {
      status: "not_started",
      progressPercentage: 0,
      timeSpent: 0,
      completedSections: [],
    };
  }

  const meta = parseProgressMeta(progressRow);
  const isCompleted = Boolean(progressRow.isCompleted);
  const timeSpent = progressRow.timeSpent ?? 0;

  let progressPercentage = meta.progressPercentage ?? 0;
  if (!progressPercentage && !isCompleted) {
    const estimated = lesson.estimatedDuration ?? 0;
    if (estimated > 0 && timeSpent > 0) {
      progressPercentage = Math.min(99, Math.round((timeSpent / estimated) * 100));
    }
  }

  if (isCompleted) {
    progressPercentage = 100;
  } else if (totalSections && totalSections > 0) {
    progressPercentage = Math.max(
      progressPercentage,
      Math.min(99, Math.round((meta.completedSections.length / totalSections) * 100))
    );
  }

  const status: LessonProgressView["status"] = isCompleted ? "completed" : progressPercentage > 0 ? "in_progress" : "not_started";

  return {
    status,
    progressPercentage,
    timeSpent,
    completedSections: meta.completedSections,
  };
};

const groupBy = <T>(items: T[], extractKey: (item: T) => string | null | undefined): Record<string, T[]> => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = extractKey(item);
    if (!key) {
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};

export async function getFormationOverview(userId?: string): Promise<FormationOverviewResponse> {
  const [tracksResult, modulesResult, lessonsResult, progressResult] = await Promise.all([
    db.execute(sql`
      SELECT
        id,
        title,
        description,
        category,
        COALESCE(order_index, 0) AS "orderIndex",
        1 AS "isRequired",
        0 AS "estimatedDuration",
        icon,
        COALESCE(is_active, true) AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM formation_tracks
      WHERE COALESCE(is_active, true) = true
      ORDER BY COALESCE(order_index, 0), title
    `),
    db.execute(sql`
      SELECT
        id,
        track_id AS "trackId",
        title,
        description,
        COALESCE(order_index, 0) AS "orderIndex",
        0 AS "estimatedDuration",
        duration_minutes AS "durationMinutes",
        content,
        video_url AS "videoUrl",
        1 AS "isActive"
      FROM formation_modules
      ORDER BY track_id, COALESCE(order_index, 0), title
    `),
    db.execute(sql`
      SELECT
        id,
        module_id AS "moduleId",
        track_id AS "trackId",
        title,
        description,
        COALESCE(order_index, 0) AS "orderIndex",
        lesson_number AS "lessonNumber",
        duration_minutes AS "estimatedDuration",
        'text' AS "contentType",
        '' AS "contentUrl",
        '' AS "videoUrl",
        '' AS "documentUrl"
      FROM formation_lessons
      WHERE COALESCE(is_active, true) = true
      ORDER BY module_id, lesson_number
    `),
    userId
      ? db.execute(sql`
          SELECT
            id,
            user_id AS "userId",
            lesson_id AS "lessonId",
            status,
            CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
            completed_at AS "completedAt",
            time_spent_minutes AS "timeSpent",
            progress_percentage AS "progressPercentage",
            completed_sections AS "completedSections",
            0 AS "quizScore",
            '' AS notes
          FROM formation_lesson_progress
          WHERE user_id = ${userId}
        `)
      : Promise.resolve(undefined)
  ]);

  const tracks = parseRows<TrackRow>(tracksResult);
  const modules = parseRows<ModuleRow>(modulesResult);
  const lessons = parseRows<LessonRow>(lessonsResult);
  const progressRows = parseRows<ProgressRow>(progressResult);

  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]));

  const lessonsGroupedByModule = groupBy(lessons, (lesson) => lesson.moduleId);

  const moduleViews: Record<string, ModuleOverviewView[]> = {};

  modules.forEach((module) => {
    const lessonList = [...(lessonsGroupedByModule[module.id] ?? [])].sort((a, b) => a.lessonNumber - b.lessonNumber);
    const lessonsWithProgress: ModuleLessonView[] = lessonList.map((lesson) => {
      const progressRow = progressByLesson.get(lesson.id);
      const progressView = buildLessonProgressView(lesson, progressRow);
      return {
        ...lesson,
        progress: progressView,
      };
    });

    const completedLessons = lessonsWithProgress.filter((lesson) => lesson.progress.status === "completed").length;
    const inProgressLessons = lessonsWithProgress.filter((lesson) => lesson.progress.status === "in_progress").length;
    const totalLessons = lessonsWithProgress.length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const moduleView: ModuleOverviewView = {
      ...module,
      lessons: lessonsWithProgress,
      stats: {
        totalLessons,
        completedLessons,
        inProgressLessons,
        progressPercentage,
      },
    };

    if (!moduleViews[module.trackId]) {
      moduleViews[module.trackId] = [];
    }
    moduleViews[module.trackId].push(moduleView);
  });

  const trackOverviews: TrackOverviewView[] = tracks.map((track) => {
    const modulesForTrack = moduleViews[track.id] ?? [];
    const totalModules = modulesForTrack.length;
    const totalLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.totalLessons, 0);
    const completedLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.completedLessons, 0);
    const inProgressLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.inProgressLessons, 0);
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const nextLesson =
      modulesForTrack
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.progress.status !== "completed") ?? null;

    return {
      ...track,
      orderIndex: track.orderIndex ?? 0,
      isActive: Boolean(track.isActive ?? true),
      isRequired: Boolean(track.isRequired ?? true),
      modules: modulesForTrack,
      stats: {
        totalModules,
        totalLessons,
        completedLessons,
        inProgressLessons,
        progressPercentage,
      },
      nextLesson,
    };
  });

  const totals = trackOverviews.reduce(
    (acc, track) => {
      acc.totalModules += track.stats.totalModules;
      acc.totalLessons += track.stats.totalLessons;
      acc.completedLessons += track.stats.completedLessons;
      acc.inProgressLessons += track.stats.inProgressLessons;
      return acc;
    },
    {
      totalModules: 0,
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
    }
  );

  const percentageCompleted =
    totals.totalLessons > 0 ? Math.round((totals.completedLessons / totals.totalLessons) * 100) : 0;

  return {
    tracks: trackOverviews,
    summary: {
      totalTracks: trackOverviews.length,
      ...totals,
      percentageCompleted,
      lastUpdated: new Date().toISOString(),
    },
  };
}

export async function getLessonDetail(params: {
  userId?: string;
  trackId: string;
  moduleId: string;
  lessonNumber: number;
}): Promise<LessonDetailView | null> {
  const { userId, trackId, moduleId, lessonNumber } = params;

  const lessonResult = await db.execute(sql`
    SELECT
      id,
      module_id AS "moduleId",
      track_id AS "trackId",
      title,
      description,
      COALESCE(order_index, 0) AS "orderIndex",
      lesson_number AS "lessonNumber",
      duration_minutes AS "estimatedDuration",
      'text' AS "contentType",
      '' AS "contentUrl",
      '' AS "videoUrl",
      '' AS "documentUrl"
    FROM formation_lessons
    WHERE module_id = ${moduleId}
      AND lesson_number = ${lessonNumber}
      AND COALESCE(is_active, true) = true
    LIMIT 1
  `);

  const lessonRow = parseRows<LessonRow>(lessonResult)[0];
  if (!lessonRow) {
    return null;
  }

  const sectionsResult = await db.execute(sql`
    SELECT
      id,
      lesson_id AS "lessonId",
      title,
      content,
      COALESCE(order_index, 0) AS "orderIndex",
      type AS "contentType",
      video_url AS "videoUrl",
      audio_url AS "audioUrl",
      document_url AS "documentUrl",
      quiz_data AS "quizData",
      '' AS "interactiveData"
    FROM formation_lesson_sections
    WHERE lesson_id = ${lessonRow.id}
    ORDER BY COALESCE(order_index, 0), title
  `);

  const sections = parseRows<SectionRow>(sectionsResult);
  const sectionsCount = sections.length || 1;

  const sectionViews: LessonSectionView[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: section.content,
    contentType: section.contentType,
    orderIndex: section.orderIndex ?? 0,
    videoUrl: section.videoUrl,
    audioUrl: section.audioUrl,
    documentUrl: section.documentUrl,
    estimatedMinutes: lessonRow.estimatedDuration
      ? Math.max(1, Math.round(lessonRow.estimatedDuration / sectionsCount))
      : null,
    quizData: section.quizData ? JSON.parse(section.quizData) : undefined,
    interactiveData: section.interactiveData ? JSON.parse(section.interactiveData) : undefined,
  }));

  let progressView: LessonProgressView = {
    status: "not_started",
    progressPercentage: 0,
    timeSpent: 0,
    completedSections: [],
  };

  if (userId) {
    const progressResult = await db.execute(sql`
      SELECT
        id,
        user_id AS "userId",
        lesson_id AS "lessonId",
        status,
        CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
        completed_at AS "completedAt",
        time_spent_minutes AS "timeSpent",
        progress_percentage AS "progressPercentage",
        completed_sections AS "completedSections",
        0 AS "quizScore",
        '' AS notes
      FROM formation_lesson_progress
      WHERE user_id = ${userId} AND lesson_id = ${lessonRow.id}
      LIMIT 1
    `);
    const progressRow = parseRows<ProgressRow>(progressResult)[0];
    progressView = buildLessonProgressView(lessonRow, progressRow, sections.length);
  }

  return {
    lesson: {
      id: lessonRow.id,
      moduleId: lessonRow.moduleId,
      trackId: lessonRow.trackId,
      title: lessonRow.title,
      description: lessonRow.description,
      lessonNumber: lessonRow.lessonNumber,
      estimatedDuration: lessonRow.estimatedDuration,
      contentType: lessonRow.contentType,
      contentUrl: lessonRow.contentUrl,
      videoUrl: lessonRow.videoUrl,
      documentUrl: lessonRow.documentUrl,
    },
    sections: sectionViews,
    progress: progressView,
  };
}

async function ensureLessonProgressRecord(userId: string, lessonId: string): Promise<ProgressRow | null> {
  const result = await db.execute(sql`
    SELECT
    id,
    user_id AS "userId",
    lesson_id AS "lessonId",
    status,
    CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
    completed_at AS "completedAt",
    time_spent_minutes AS "timeSpent",
    progress_percentage AS "progressPercentage",
    completed_sections AS "completedSections",
    0 AS "quizScore",
    '' AS notes
  FROM formation_lesson_progress
  WHERE user_id = ${userId} AND lesson_id = ${lessonId}
  LIMIT 1
  `);
  return parseRows<ProgressRow>(result)[0] ?? null;
}

async function countLessonSections(lessonId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::integer AS count
    FROM formation_lesson_sections
    WHERE lesson_id = ${lessonId}
  `);
  const row = parseRows<{ count: number }>(result)[0];
  return row?.count ?? 0;
}

export async function markLessonSectionCompleted(params: {
  userId: string;
  lessonId: string;
  sectionId: string;
}): Promise<LessonProgressView> {
  const { userId, lessonId, sectionId } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const meta = parseProgressMeta(existing);

  if (!meta.completedSections.includes(sectionId)) {
    meta.completedSections.push(sectionId);
  }

  const totalSections = await countLessonSections(lessonId);
  if (totalSections > 0) {
    meta.progressPercentage = Math.min(100, Math.round((meta.completedSections.length / totalSections) * 100));
  }

  const now = new Date();
  const status = meta.progressPercentage >= 100 ? "completed" : "in_progress";
  const completedAt = status === "completed" ? now : existing?.completedAt ?? null;

  if (existing) {
    await db.execute(sql`
      UPDATE formation_lesson_progress
      SET
        status = ${status},
        progress_percentage = ${meta.progressPercentage},
        completed_sections = ${JSON.stringify(meta.completedSections)}::jsonb,
        time_spent_minutes = COALESCE(time_spent_minutes, 0) + 1,
        last_accessed_at = ${now},
        completed_at = ${completedAt},
        updated_at = ${now}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO formation_lesson_progress (
        id,
        user_id,
        lesson_id,
        status,
        progress_percentage,
        time_spent_minutes,
        completed_sections,
        last_accessed_at,
        completed_at,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        ${status},
        ${meta.progressPercentage},
        ${1},
        ${JSON.stringify(meta.completedSections)}::jsonb,
        ${now},
        ${completedAt},
        ${now},
        ${now}
      )
    `);
  }

  if (meta.progressPercentage >= 100) {
    return await markLessonCompleted({ userId, lessonId });
  }

  return buildLessonProgressView(
    {
      id: lessonId,
      moduleId: "",
      title: "",
      description: null,
      orderIndex: 0,
      lessonNumber: 0,
      estimatedDuration: null,
      contentType: null,
      contentUrl: null,
      videoUrl: null,
      documentUrl: null,
      trackId: null,
    },
    {
      id: existing?.id ?? "",
      userId,
      lessonId,
      status,
      isCompleted: status === "completed",
      completedAt: completedAt ? String(completedAt) : null,
      timeSpent: (existing?.timeSpent ?? 0) + 1,
      progressPercentage: meta.progressPercentage,
      completedSections: meta.completedSections,
      quizScore: existing?.quizScore ?? null,
      notes: null,
    },
    totalSections
  );
}

export async function markLessonCompleted(params: {
  userId: string;
  lessonId: string;
}): Promise<LessonProgressView> {
  const { userId, lessonId } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const totalSections = await countLessonSections(lessonId);
  const sectionRows = totalSections > 0
    ? parseRows<{ id: string }>(
        await db.execute(sql`
          SELECT id FROM formation_lesson_sections WHERE lesson_id = ${lessonId}
        `)
      )
    : [];
  const meta = {
    completedSections: Array.from(
      new Set([
        ...parseProgressMeta(existing).completedSections,
        ...sectionRows.map((row) => row.id).filter((id): id is string => typeof id === "string"),
      ])
    ),
    progressPercentage: 100,
  };

  const now = new Date();

  if (existing) {
    await db.execute(sql`
      UPDATE formation_lesson_progress
      SET
        status = 'completed',
        progress_percentage = 100,
        completed_sections = ${JSON.stringify(meta.completedSections)}::jsonb,
        last_accessed_at = ${now},
        completed_at = COALESCE(completed_at, ${now}),
        updated_at = ${now}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO formation_lesson_progress (
        id,
        user_id,
        lesson_id,
        status,
        progress_percentage,
        time_spent_minutes,
        completed_sections,
        last_accessed_at,
        completed_at,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        'completed',
        ${100},
        ${0},
        ${JSON.stringify(meta.completedSections)}::jsonb,
        ${now},
        ${now},
        ${now},
        ${now}
      )
    `);
  }

  return {
    status: "completed",
    progressPercentage: 100,
    timeSpent: existing?.timeSpent ?? 0,
    completedSections: meta.completedSections,
  };
}

export async function upsertLessonProgressEntry(params: {
  userId: string;
  lessonId: string;
  isCompleted?: boolean;
  timeSpent?: number;
  progressPercentage?: number;
  completedSections?: string[];
  quizScore?: number | null;
  notes?: string | null;
}): Promise<LessonProgressView> {
  const { userId, lessonId, isCompleted, timeSpent, progressPercentage, completedSections, quizScore, notes } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const meta = parseProgressMeta(existing);

  if (Array.isArray(completedSections)) {
    meta.completedSections = Array.from(new Set(completedSections));
  }
  if (typeof progressPercentage === "number") {
    meta.progressPercentage = progressPercentage;
  }
  if (notes) {
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed?.completedSections)) {
        meta.completedSections = parsed.completedSections;
      }
      if (typeof parsed?.progressPercentage === "number") {
        meta.progressPercentage = parsed.progressPercentage;
      }
    } catch {
      // ignore invalid notes payload
    }
  }

  const finalIsCompleted = Boolean(isCompleted ?? existing?.isCompleted ?? false);
  if (finalIsCompleted) {
    meta.progressPercentage = 100;
  }

  const now = new Date();
  const status: NonNullable<ProgressRow["status"]> = finalIsCompleted
    ? "completed"
    : meta.progressPercentage > 0
    ? "in_progress"
    : "not_started";
  const payload = {
    status,
    completedAt: finalIsCompleted ? now : existing?.completedAt ?? null,
    timeSpent: timeSpent ?? existing?.timeSpent ?? 0,
    quizScore: quizScore ?? existing?.quizScore ?? null,
    progressPercentage: meta.progressPercentage,
    completedSections: meta.completedSections,
    updatedAt: now,
  };

  if (existing) {
    await db.execute(sql`
      UPDATE formation_lesson_progress
      SET
        status = ${payload.status},
        progress_percentage = ${payload.progressPercentage},
        time_spent_minutes = ${payload.timeSpent},
        completed_sections = ${JSON.stringify(payload.completedSections)}::jsonb,
        last_accessed_at = ${now},
        completed_at = ${payload.completedAt},
        updated_at = ${payload.updatedAt}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO formation_lesson_progress (
        id,
        user_id,
        lesson_id,
        status,
        progress_percentage,
        time_spent_minutes,
        completed_sections,
        last_accessed_at,
        completed_at,
        created_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        ${payload.status},
        ${payload.progressPercentage},
        ${payload.timeSpent},
        ${JSON.stringify(payload.completedSections)}::jsonb,
        ${now},
        ${payload.completedAt},
        ${now},
        ${now}
      )
    `);
  }

  return buildLessonProgressView(
    {
      id: lessonId,
      moduleId: "",
      title: "",
      description: null,
      orderIndex: 0,
      lessonNumber: 0,
      estimatedDuration: null,
      contentType: null,
      contentUrl: null,
      videoUrl: null,
      documentUrl: null,
      trackId: null,
    },
    {
      id: existing?.id ?? "",
      userId,
      lessonId,
      status: payload.status,
      isCompleted: payload.status === "completed" ? 1 : 0,
      completedAt: payload.completedAt ? String(payload.completedAt) : null,
      timeSpent: payload.timeSpent,
      progressPercentage: payload.progressPercentage,
      completedSections: payload.completedSections,
      quizScore: payload.quizScore,
      notes: null,
    }
  );
}

export async function listLessonProgressEntries(params: {
  userId: string;
  trackId?: string;
}): Promise<Array<{ lessonId: string; progress: LessonProgressView }>> {
  const { userId, trackId } = params;
  const query = trackId
    ? sql<ProgressWithLessonRow>`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.lesson_id AS "lessonId",
          p.status,
          CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
          p.completed_at AS "completedAt",
          p.time_spent_minutes AS "timeSpent",
          p.progress_percentage AS "progressPercentage",
          p.completed_sections AS "completedSections",
          0 AS "quizScore",
          '' AS notes,
          l.duration_minutes AS "lessonEstimatedDuration",
          l.module_id AS "lessonModuleId",
          l.lesson_number AS "lessonNumber",
          l.track_id AS "lessonTrackId"
        FROM formation_lesson_progress p
        INNER JOIN formation_lessons l ON l.id = p.lesson_id
        WHERE p.user_id = ${userId} AND l.track_id = ${trackId}
        ORDER BY p.updated_at DESC
      `
    : sql<ProgressWithLessonRow>`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.lesson_id AS "lessonId",
          p.status,
          CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
          p.completed_at AS "completedAt",
          p.time_spent_minutes AS "timeSpent",
          p.progress_percentage AS "progressPercentage",
          p.completed_sections AS "completedSections",
          0 AS "quizScore",
          '' AS notes,
          l.duration_minutes AS "lessonEstimatedDuration",
          l.module_id AS "lessonModuleId",
          l.lesson_number AS "lessonNumber",
          l.track_id AS "lessonTrackId"
        FROM formation_lesson_progress p
        INNER JOIN formation_lessons l ON l.id = p.lesson_id
        WHERE p.user_id = ${userId}
        ORDER BY p.updated_at DESC
      `;

  const result = await db.execute(query);
  const rows = parseRows<ProgressWithLessonRow>(result);

  return rows.map((row) => ({
    lessonId: row.lessonId,
    progress: buildLessonProgressView(
      {
        id: row.lessonId,
        moduleId: row.lessonModuleId,
        title: "",
        description: null,
        orderIndex: 0,
        lessonNumber: row.lessonNumber,
        estimatedDuration: row.lessonEstimatedDuration,
        contentType: null,
        contentUrl: null,
        videoUrl: null,
        documentUrl: null,
        trackId: row.lessonTrackId,
      },
      row
    ),
  }));
}
