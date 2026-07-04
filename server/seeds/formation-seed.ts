import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "../db";
import {
  formationLessonSections,
  formationLessons,
  formationModules,
  formationTracks,
} from "@shared/schema";
import {
  buildFormationSeedRecords,
  loadMescFormationContent,
  MESC_FORMATION_TRACK_ID,
} from "../services/mescFormationContent";

const legacyFormationTrackIds = [
  "liturgy-track-1",
  "spirituality-track-1",
  "practical-track-1",
];

export async function seedFormation() {
  console.log("🌱 Sincronizando formação oficial MESC...");

  const content = await loadMescFormationContent();
  const records = buildFormationSeedRecords(content);
  const now = new Date();

  await db
    .update(formationTracks)
    .set({ isActive: false, updatedAt: now })
    .where(inArray(formationTracks.id, legacyFormationTrackIds));

  await db
    .insert(formationTracks)
    .values({
      ...records.track,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: formationTracks.id,
      set: {
        title: records.track.title,
        description: records.track.description,
        category: records.track.category,
        icon: records.track.icon,
        orderIndex: records.track.orderIndex,
        isActive: records.track.isActive,
        updatedAt: now,
      },
    });

  const moduleIds = records.modules.map((module) => module.id);
  const lessonIds = records.lessons.map((lesson) => lesson.id);
  const sectionIds = records.sections.map((section) => section.id);

  if (lessonIds.length > 0 && sectionIds.length > 0) {
    for (const lesson of records.lessons) {
      const sectionIdsForLesson = records.sections
        .filter((section) => section.lessonId === lesson.id)
        .map((section) => section.id);

      await db
        .delete(formationLessonSections)
        .where(
          and(
            eq(formationLessonSections.lessonId, lesson.id),
            notInArray(formationLessonSections.id, sectionIdsForLesson)
          )
        );
    }
  }

  if (lessonIds.length > 0) {
    const staleLessons = await db
      .select({ id: formationLessons.id })
      .from(formationLessons)
      .where(
        and(
          eq(formationLessons.trackId, MESC_FORMATION_TRACK_ID),
          notInArray(formationLessons.id, lessonIds)
        )
      );

    for (const lesson of staleLessons) {
      await db
        .delete(formationLessonSections)
        .where(eq(formationLessonSections.lessonId, lesson.id));
    }

    await db
      .delete(formationLessons)
      .where(
        and(
          eq(formationLessons.trackId, MESC_FORMATION_TRACK_ID),
          notInArray(formationLessons.id, lessonIds)
        )
      );
  }

  if (moduleIds.length > 0) {
    await db
      .delete(formationModules)
      .where(
        and(
          eq(formationModules.trackId, MESC_FORMATION_TRACK_ID),
          notInArray(formationModules.id, moduleIds)
        )
      );
  }

  for (const module of records.modules) {
    await db
      .insert(formationModules)
      .values({
        ...module,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: formationModules.id,
        set: {
          trackId: module.trackId,
          title: module.title,
          description: module.description,
          category: module.category,
          content: module.content,
          durationMinutes: module.durationMinutes,
          orderIndex: module.orderIndex,
        },
      });
  }

  for (const lesson of records.lessons) {
    await db
      .insert(formationLessons)
      .values({
        ...lesson,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: formationLessons.id,
        set: {
          moduleId: lesson.moduleId,
          trackId: lesson.trackId,
          title: lesson.title,
          description: lesson.description,
          lessonNumber: lesson.lessonNumber,
          durationMinutes: lesson.durationMinutes,
          objectives: lesson.objectives,
          isActive: lesson.isActive,
          orderIndex: lesson.orderIndex,
          updatedAt: now,
        },
      });
  }

  for (const section of records.sections) {
    await db
      .insert(formationLessonSections)
      .values({
        ...section,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: formationLessonSections.id,
        set: {
          lessonId: section.lessonId,
          type: section.type,
          title: section.title,
          content: section.content,
          orderIndex: section.orderIndex,
          isRequired: section.isRequired,
          estimatedMinutes: section.estimatedMinutes,
          updatedAt: now,
        },
      });
  }

  const stats = {
    tracks: 1,
    modules: records.modules.length,
    lessons: records.lessons.length,
    sections: records.sections.length,
  };

  console.log("✅ Formação oficial MESC sincronizada.", stats);

  return {
    success: true,
    message: "Formation content synced from MESC_Formation",
    stats,
  };
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  seedFormation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Erro ao sincronizar formação oficial MESC:", error);
      process.exit(1);
    });
}

export default seedFormation;
