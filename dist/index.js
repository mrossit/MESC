var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  activityLogsRelations: () => activityLogsRelations,
  families: () => families,
  familiesRelations: () => familiesRelations,
  familyRelationships: () => familyRelationships,
  formationCategoryEnum: () => formationCategoryEnum,
  formationLessonProgress: () => formationLessonProgress,
  formationLessonProgressRelations: () => formationLessonProgressRelations,
  formationLessonSections: () => formationLessonSections,
  formationLessonSectionsRelations: () => formationLessonSectionsRelations,
  formationLessons: () => formationLessons,
  formationLessonsRelations: () => formationLessonsRelations,
  formationModules: () => formationModules,
  formationModulesRelations: () => formationModulesRelations,
  formationProgress: () => formationProgress,
  formationProgressRelations: () => formationProgressRelations,
  formationStatusEnum: () => formationStatusEnum,
  formationTracks: () => formationTracks,
  formationTracksRelations: () => formationTracksRelations,
  insertFormationLessonProgressSchema: () => insertFormationLessonProgressSchema,
  insertFormationLessonSchema: () => insertFormationLessonSchema,
  insertFormationLessonSectionSchema: () => insertFormationLessonSectionSchema,
  insertFormationTrackSchema: () => insertFormationTrackSchema,
  insertMassTimeSchema: () => insertMassTimeSchema,
  insertQuestionnaireSchema: () => insertQuestionnaireSchema,
  insertUserSchema: () => insertUserSchema,
  lessonContentTypeEnum: () => lessonContentTypeEnum,
  massTimesConfig: () => massTimesConfig,
  notificationTypeEnum: () => notificationTypeEnum,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  passwordResetRequests: () => passwordResetRequests,
  questionnaireResponses: () => questionnaireResponses,
  questionnaireResponsesRelations: () => questionnaireResponsesRelations,
  questionnaires: () => questionnaires,
  questionnairesRelations: () => questionnairesRelations,
  scheduleStatusEnum: () => scheduleStatusEnum,
  scheduleTypeEnum: () => scheduleTypeEnum,
  schedules: () => schedules,
  schedulesRelations: () => schedulesRelations,
  sessions: () => sessions,
  substitutionRequests: () => substitutionRequests,
  substitutionRequestsRelations: () => substitutionRequestsRelations,
  substitutionStatusEnum: () => substitutionStatusEnum,
  userRoleEnum: () => userRoleEnum,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  uuid,
  text,
  boolean,
  integer,
  date,
  time,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions, userRoleEnum, userStatusEnum, scheduleStatusEnum, scheduleTypeEnum, substitutionStatusEnum, notificationTypeEnum, formationCategoryEnum, formationStatusEnum, lessonContentTypeEnum, users, families, familyRelationships, questionnaires, questionnaireResponses, schedules, substitutionRequests, notifications, formationTracks, formationModules, formationProgress, formationLessons, formationLessonSections, formationLessonProgress, massTimesConfig, passwordResetRequests, activityLogs, familiesRelations, activityLogsRelations, usersRelations, questionnairesRelations, questionnaireResponsesRelations, schedulesRelations, substitutionRequestsRelations, formationModulesRelations, formationProgressRelations, formationTracksRelations, formationLessonsRelations, formationLessonSectionsRelations, formationLessonProgressRelations, notificationsRelations, insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema, insertFormationTrackSchema, insertFormationLessonSchema, insertFormationLessonSectionSchema, insertFormationLessonProgressSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    userRoleEnum = pgEnum("user_role", ["gestor", "coordenador", "ministro"]);
    userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);
    scheduleStatusEnum = pgEnum("schedule_status", ["draft", "published", "completed"]);
    scheduleTypeEnum = pgEnum("schedule_type", ["missa", "celebracao", "evento"]);
    substitutionStatusEnum = pgEnum("substitution_status", ["pending", "approved", "rejected", "cancelled"]);
    notificationTypeEnum = pgEnum("notification_type", ["schedule", "substitution", "formation", "announcement", "reminder"]);
    formationCategoryEnum = pgEnum("formation_category", ["liturgia", "espiritualidade", "pratica"]);
    formationStatusEnum = pgEnum("formation_status", ["not_started", "in_progress", "completed"]);
    lessonContentTypeEnum = pgEnum("lesson_content_type", ["text", "video", "audio", "document", "quiz", "interactive"]);
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: varchar("email", { length: 255 }).unique().notNull(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      // MESC specific fields
      name: varchar("name", { length: 255 }).notNull(),
      phone: varchar("phone", { length: 20 }),
      whatsapp: varchar("whatsapp", { length: 20 }),
      passwordHash: varchar("password_hash", { length: 255 }).notNull(),
      role: userRoleEnum("role").notNull().default("ministro"),
      status: userStatusEnum("status").notNull().default("pending"),
      requiresPasswordChange: boolean("requires_password_change").default(true),
      lastLogin: timestamp("last_login"),
      joinDate: date("join_date"),
      photoUrl: text("photo_url"),
      imageData: text("image_data"),
      // Base64 encoded image data
      imageContentType: varchar("image_content_type", { length: 50 }),
      // MIME type
      familyId: uuid("family_id").references(() => families.id),
      // Personal information
      birthDate: date("birth_date"),
      address: text("address"),
      city: varchar("city", { length: 100 }),
      zipCode: varchar("zip_code", { length: 10 }),
      maritalStatus: varchar("marital_status", { length: 20 }),
      // Sacramental data
      baptismDate: date("baptism_date"),
      baptismParish: varchar("baptism_parish", { length: 255 }),
      confirmationDate: date("confirmation_date"),
      confirmationParish: varchar("confirmation_parish", { length: 255 }),
      marriageDate: date("marriage_date"),
      marriageParish: varchar("marriage_parish", { length: 255 }),
      // Ministry preferences
      preferredPosition: integer("preferred_position"),
      preferredTimes: jsonb("preferred_times").$type(),
      availableForSpecialEvents: boolean("available_for_special_events").default(true),
      canServeAsCouple: boolean("can_serve_as_couple").default(false),
      spouseMinisterId: uuid("spouse_minister_id"),
      // Extra activities preferences
      extraActivities: jsonb("extra_activities").$type().default({
        sickCommunion: false,
        mondayAdoration: false,
        helpOtherPastorals: false,
        festiveEvents: false
      }),
      // Experience and formation
      ministryStartDate: date("ministry_start_date"),
      experience: text("experience"),
      specialSkills: text("special_skills"),
      liturgicalTraining: boolean("liturgical_training").default(false),
      // Statistics
      lastService: timestamp("last_service"),
      totalServices: integer("total_services").default(0),
      formationCompleted: boolean("formation_completed").default(false),
      // Observations
      observations: text("observations"),
      // Registration fields
      ministerType: varchar("minister_type", { length: 50 }),
      approvedAt: timestamp("approved_at"),
      approvedById: varchar("approved_by_id"),
      rejectionReason: text("rejection_reason"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    families = pgTable("families", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: varchar("name", { length: 255 }).notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    familyRelationships = pgTable("family_relationships", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      relatedUserId: varchar("related_user_id").notNull().references(() => users.id),
      relationshipType: varchar("relationship_type", { length: 50 }).notNull(),
      // spouse, parent, child, sibling
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    questionnaires = pgTable("questionnaires", {
      id: uuid("id").primaryKey().defaultRandom(),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      month: integer("month").notNull(),
      year: integer("year").notNull(),
      status: varchar("status", { length: 20 }).notNull().default("draft"),
      questions: jsonb("questions").notNull(),
      deadline: timestamp("deadline"),
      targetUserIds: jsonb("target_user_ids").$type(),
      notifiedUserIds: jsonb("notified_user_ids").$type(),
      createdById: varchar("created_by_id").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    questionnaireResponses = pgTable("questionnaire_responses", {
      id: uuid("id").primaryKey().defaultRandom(),
      questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      responses: jsonb("responses").notNull(),
      availableSundays: jsonb("available_sundays").$type(),
      preferredMassTimes: jsonb("preferred_mass_times").$type(),
      alternativeTimes: jsonb("alternative_times").$type(),
      dailyMassAvailability: jsonb("daily_mass_availability").$type(),
      specialEvents: jsonb("special_events"),
      canSubstitute: boolean("can_substitute").default(false),
      notes: text("notes"),
      // Family sharing fields
      sharedWithFamilyIds: jsonb("shared_with_family_ids").$type(),
      isSharedResponse: boolean("is_shared_response").default(false),
      sharedFromUserId: varchar("shared_from_user_id").references(() => users.id),
      submittedAt: timestamp("submitted_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    schedules = pgTable("schedules", {
      id: uuid("id").primaryKey().defaultRandom(),
      date: date("date").notNull(),
      time: time("time").notNull(),
      type: scheduleTypeEnum("type").notNull().default("missa"),
      location: varchar("location", { length: 255 }),
      ministerId: varchar("minister_id").references(() => users.id),
      status: varchar("status", { length: 20 }).notNull().default("scheduled"),
      substituteId: varchar("substitute_id").references(() => users.id),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    substitutionRequests = pgTable("substitution_requests", {
      id: uuid("id").primaryKey().defaultRandom(),
      scheduleId: uuid("schedule_id").notNull().references(() => schedules.id),
      requesterId: varchar("requester_id").notNull().references(() => users.id),
      substituteId: varchar("substitute_id").references(() => users.id),
      reason: text("reason"),
      status: substitutionStatusEnum("status").notNull().default("pending"),
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      type: notificationTypeEnum("type").notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      data: jsonb("data"),
      read: boolean("read").default(false),
      readAt: timestamp("read_at"),
      actionUrl: varchar("action_url", { length: 255 }),
      priority: varchar("priority", { length: 10 }).default("normal"),
      expiresAt: timestamp("expires_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    formationTracks = pgTable("formation_tracks", {
      id: varchar("id").primaryKey(),
      // liturgia, espiritualidade, pratica
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      category: formationCategoryEnum("category").notNull(),
      icon: varchar("icon", { length: 50 }),
      orderIndex: integer("order_index").default(0),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    formationModules = pgTable("formation_modules", {
      id: uuid("id").primaryKey().defaultRandom(),
      trackId: varchar("trackId").notNull().references(() => formationTracks.id),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      category: formationCategoryEnum("category").notNull(),
      content: text("content"),
      videoUrl: varchar("video_url", { length: 255 }),
      durationMinutes: integer("durationMinutes"),
      orderIndex: integer("order_index"),
      createdAt: timestamp("created_at").defaultNow()
    });
    formationProgress = pgTable("formation_progress", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      moduleId: uuid("moduleId").notNull().references(() => formationModules.id),
      status: formationStatusEnum("status").notNull().default("not_started"),
      progressPercentage: integer("progress_percentage").default(0),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    formationLessons = pgTable("formation_lessons", {
      id: uuid("id").primaryKey().defaultRandom(),
      moduleId: uuid("moduleId").notNull().references(() => formationModules.id),
      trackId: varchar("trackId").notNull().references(() => formationTracks.id),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      lessonNumber: integer("lessonNumber").notNull(),
      estimatedDuration: integer("estimatedDuration").default(30),
      // objectives: jsonb('objectives').$type<string[]>(), // Not in SQLite local
      isActive: boolean("is_active").default(true),
      orderIndex: integer("order_index").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    formationLessonSections = pgTable("formation_lesson_sections", {
      id: uuid("id").primaryKey().defaultRandom(),
      lessonId: uuid("lesson_id").notNull().references(() => formationLessons.id),
      type: lessonContentTypeEnum("type").notNull(),
      title: varchar("title", { length: 255 }),
      content: text("content"),
      // Text content, video embed code, etc.
      videoUrl: varchar("video_url", { length: 500 }),
      audioUrl: varchar("audio_url", { length: 500 }),
      documentUrl: varchar("document_url", { length: 500 }),
      imageUrl: varchar("image_url", { length: 500 }),
      quizData: jsonb("quiz_data"),
      // For interactive quizzes
      orderIndex: integer("order_index").default(0),
      isRequired: boolean("is_required").default(true),
      estimatedMinutes: integer("estimated_minutes").default(5),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    formationLessonProgress = pgTable("formation_lesson_progress", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      lessonId: uuid("lesson_id").notNull().references(() => formationLessons.id),
      status: formationStatusEnum("status").notNull().default("not_started"),
      progressPercentage: integer("progress_percentage").default(0),
      timeSpentMinutes: integer("time_spent_minutes").default(0),
      completedSections: jsonb("completed_sections").$type().default([]),
      lastAccessedAt: timestamp("last_accessed_at"),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    massTimesConfig = pgTable("mass_times_config", {
      id: uuid("id").primaryKey().defaultRandom(),
      dayOfWeek: integer("day_of_week").notNull(),
      time: time("time").notNull(),
      minMinisters: integer("min_ministers").notNull().default(3),
      maxMinisters: integer("max_ministers").notNull().default(6),
      isActive: boolean("is_active").default(true),
      specialEvent: boolean("special_event").default(false),
      eventName: varchar("event_name", { length: 255 }),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    passwordResetRequests = pgTable("password_reset_requests", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      requestedAt: timestamp("requested_at").defaultNow().notNull(),
      reason: text("reason"),
      status: varchar("status", { length: 20 }).notNull().default("pending"),
      // pending, approved, rejected
      processedBy: varchar("processed_by").references(() => users.id),
      processedAt: timestamp("processed_at"),
      adminNotes: text("admin_notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    activityLogs = pgTable("activity_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      action: varchar("action", { length: 100 }).notNull(),
      // login, view_schedule, respond_questionnaire, etc
      details: jsonb("details"),
      // Additional context for the action
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      sessionId: varchar("session_id", { length: 255 }),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => [
      index("idx_activity_logs_user").on(table.userId),
      index("idx_activity_logs_action").on(table.action),
      index("idx_activity_logs_created").on(table.createdAt)
    ]);
    familiesRelations = relations(families, ({ many }) => ({
      members: many(users)
    }));
    activityLogsRelations = relations(activityLogs, ({ one }) => ({
      user: one(users, {
        fields: [activityLogs.userId],
        references: [users.id]
      })
    }));
    usersRelations = relations(users, ({ many, one }) => ({
      family: one(families, {
        fields: [users.familyId],
        references: [families.id]
      }),
      questionnaires: many(questionnaires),
      questionnaireResponses: many(questionnaireResponses),
      schedules: many(schedules),
      substitutionRequests: many(substitutionRequests),
      notifications: many(notifications),
      formationProgress: many(formationProgress),
      activityLogs: many(activityLogs),
      spouse: one(users, {
        fields: [users.spouseMinisterId],
        references: [users.id]
      })
    }));
    questionnairesRelations = relations(questionnaires, ({ one, many }) => ({
      createdBy: one(users, {
        fields: [questionnaires.createdById],
        references: [users.id]
      }),
      responses: many(questionnaireResponses)
    }));
    questionnaireResponsesRelations = relations(questionnaireResponses, ({ one }) => ({
      questionnaire: one(questionnaires, {
        fields: [questionnaireResponses.questionnaireId],
        references: [questionnaires.id]
      }),
      user: one(users, {
        fields: [questionnaireResponses.userId],
        references: [users.id]
      })
    }));
    schedulesRelations = relations(schedules, ({ one, many }) => ({
      minister: one(users, {
        fields: [schedules.ministerId],
        references: [users.id]
      }),
      substitute: one(users, {
        fields: [schedules.substituteId],
        references: [users.id]
      }),
      substitutionRequests: many(substitutionRequests)
    }));
    substitutionRequestsRelations = relations(substitutionRequests, ({ one }) => ({
      schedule: one(schedules, {
        fields: [substitutionRequests.scheduleId],
        references: [schedules.id]
      }),
      requester: one(users, {
        fields: [substitutionRequests.requesterId],
        references: [users.id]
      }),
      substitute: one(users, {
        fields: [substitutionRequests.substituteId],
        references: [users.id]
      }),
      approvedByUser: one(users, {
        fields: [substitutionRequests.approvedBy],
        references: [users.id]
      })
    }));
    formationModulesRelations = relations(formationModules, ({ one, many }) => ({
      track: one(formationTracks, {
        fields: [formationModules.trackId],
        references: [formationTracks.id]
      }),
      progress: many(formationProgress),
      lessons: many(formationLessons)
    }));
    formationProgressRelations = relations(formationProgress, ({ one }) => ({
      user: one(users, {
        fields: [formationProgress.userId],
        references: [users.id]
      }),
      module: one(formationModules, {
        fields: [formationProgress.moduleId],
        references: [formationModules.id]
      })
    }));
    formationTracksRelations = relations(formationTracks, ({ many }) => ({
      modules: many(formationModules),
      lessons: many(formationLessons)
    }));
    formationLessonsRelations = relations(formationLessons, ({ one, many }) => ({
      module: one(formationModules, {
        fields: [formationLessons.moduleId],
        references: [formationModules.id]
      }),
      track: one(formationTracks, {
        fields: [formationLessons.trackId],
        references: [formationTracks.id]
      }),
      sections: many(formationLessonSections),
      progress: many(formationLessonProgress)
    }));
    formationLessonSectionsRelations = relations(formationLessonSections, ({ one }) => ({
      lesson: one(formationLessons, {
        fields: [formationLessonSections.lessonId],
        references: [formationLessons.id]
      })
    }));
    formationLessonProgressRelations = relations(formationLessonProgress, ({ one }) => ({
      user: one(users, {
        fields: [formationLessonProgress.userId],
        references: [users.id]
      }),
      lesson: one(formationLessons, {
        fields: [formationLessonProgress.lessonId],
        references: [formationLessons.id]
      })
    }));
    notificationsRelations = relations(notifications, ({ one }) => ({
      user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).pick({
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      birthDate: true,
      address: true,
      city: true,
      zipCode: true,
      maritalStatus: true,
      ministryStartDate: true,
      experience: true,
      specialSkills: true,
      liturgicalTraining: true,
      observations: true
    });
    insertQuestionnaireSchema = createInsertSchema(questionnaires).pick({
      title: true,
      description: true,
      month: true,
      year: true,
      questions: true,
      deadline: true,
      targetUserIds: true
    });
    insertMassTimeSchema = createInsertSchema(massTimesConfig).pick({
      dayOfWeek: true,
      time: true,
      minMinisters: true,
      maxMinisters: true,
      isActive: true,
      specialEvent: true,
      eventName: true
    });
    insertFormationTrackSchema = createInsertSchema(formationTracks).pick({
      id: true,
      title: true,
      description: true,
      category: true,
      icon: true,
      orderIndex: true,
      isActive: true
    });
    insertFormationLessonSchema = createInsertSchema(formationLessons).pick({
      moduleId: true,
      trackId: true,
      title: true,
      description: true,
      lessonNumber: true,
      durationMinutes: true,
      objectives: true,
      orderIndex: true,
      isActive: true
    });
    insertFormationLessonSectionSchema = createInsertSchema(formationLessonSections).pick({
      lessonId: true,
      type: true,
      title: true,
      content: true,
      videoUrl: true,
      audioUrl: true,
      documentUrl: true,
      imageUrl: true,
      quizData: true,
      orderIndex: true,
      isRequired: true,
      estimatedMinutes: true
    });
    insertFormationLessonProgressSchema = createInsertSchema(formationLessonProgress).pick({
      userId: true,
      lessonId: true,
      status: true,
      progressPercentage: true,
      timeSpentMinutes: true,
      completedSections: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
var db, pool, isProduction, isDevelopment, forceProduction;
var init_db = __esm({
  async "server/db.ts"() {
    "use strict";
    init_schema();
    isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || !!process.env.REPL_SLUG && !process.env.DATABASE_URL;
    isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
    forceProduction = !!process.env.DATABASE_URL;
    console.log(`\u{1F50D} Environment check:`, {
      NODE_ENV: process.env.NODE_ENV,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      REPL_SLUG: !!process.env.REPL_SLUG,
      DATABASE_URL: !!process.env.DATABASE_URL,
      isProduction,
      isDevelopment
    });
    if (process.env.DATABASE_URL) {
      console.log("\u{1F680} DATABASE_URL configured, using PostgreSQL database");
      console.log("\u{1F4C4} Environment:", { NODE_ENV: process.env.NODE_ENV, isProduction, isDevelopment });
      try {
        const { Pool, neonConfig } = await import("@neondatabase/serverless");
        const { drizzle } = await import("drizzle-orm/neon-serverless");
        const ws = await import("ws");
        neonConfig.webSocketConstructor = ws.default;
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        db = drizzle({ client: pool, schema: schema_exports });
        console.log("\u2705 PostgreSQL connection established successfully");
      } catch (error) {
        console.error("\u274C Failed to connect to PostgreSQL:", error);
        throw error;
      }
    } else if (isDevelopment && !isProduction) {
      console.log("\u{1F527} Development mode detected, using local SQLite database");
      const Database3 = await import("better-sqlite3");
      const { drizzle } = await import("drizzle-orm/better-sqlite3");
      const sqlite = new Database3.default("local.db");
      db = drizzle(sqlite, { schema: schema_exports });
    } else if (false) {
      console.log("\u26A0\uFE0F This code path should not be reached");
    } else {
      console.log("\u26A0\uFE0F No DATABASE_URL found and not in development mode");
      console.log("\u{1F4DD} Using SQLite fallback for compatibility");
      const Database3 = await import("better-sqlite3");
      const { drizzle } = await import("drizzle-orm/better-sqlite3");
      const sqlite = new Database3.default("local.db");
      db = drizzle(sqlite, { schema: schema_exports });
    }
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, and, desc, count, gte, or } from "drizzle-orm";
import Database2 from "better-sqlite3";
var DrizzleSQLiteFallback, DatabaseStorage, storage;
var init_storage = __esm({
  async "server/storage.ts"() {
    "use strict";
    init_schema();
    await init_db();
    DrizzleSQLiteFallback = class {
      static sqliteDb = null;
      static getSQLiteDB() {
        if (process.env.NODE_ENV === "production") {
          throw new Error("SQLite fallback not allowed in production");
        }
        if (!this.sqliteDb) {
          this.sqliteDb = new Database2("local.db");
        }
        return this.sqliteDb;
      }
      static async safeQuery(drizzleQuery, fallbackSQL, fallbackMapper = (row) => row) {
        if (process.env.NODE_ENV === "production") {
          return await drizzleQuery();
        }
        try {
          return await drizzleQuery();
        } catch (drizzleError) {
          if (drizzleError.code === "SQLITE_ERROR" || drizzleError.message?.includes("SQLITE")) {
            console.warn("[FALLBACK] Drizzle failed in dev, using SQLite directly:", drizzleError.message);
            const sqlite = this.getSQLiteDB();
            const result = sqlite.prepare(fallbackSQL).all();
            return result.map(fallbackMapper);
          }
          throw drizzleError;
        }
      }
      static async safeQueryFirst(drizzleQuery, fallbackSQL, fallbackMapper = (row) => row) {
        if (process.env.NODE_ENV === "production") {
          return await drizzleQuery();
        }
        try {
          return await drizzleQuery();
        } catch (drizzleError) {
          if (drizzleError.code === "SQLITE_ERROR" || drizzleError.message?.includes("SQLITE")) {
            console.warn("[FALLBACK] Drizzle failed, using SQLite directly:", drizzleError.message);
            const sqlite = this.getSQLiteDB();
            const result = sqlite.prepare(fallbackSQL).get();
            return result ? fallbackMapper(result) : void 0;
          }
          throw drizzleError;
        }
      }
    };
    DatabaseStorage = class {
      // User operations (mandatory for Replit Auth)
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async upsertUser(userData) {
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      // MESC specific user operations
      async createUser(userData) {
        const tempPassword = Math.random().toString(36).slice(-12);
        const bcrypt2 = await import("bcrypt");
        const passwordHash = await bcrypt2.hash(tempPassword, 10);
        const [user] = await db.insert(users).values({
          email: userData.email,
          passwordHash,
          name: userData.name || `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Usu\xE1rio",
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          phone: userData.phone || null,
          role: userData.role || "ministro",
          status: userData.status || "pending",
          birthDate: userData.birthDate || null,
          address: userData.address || null,
          city: userData.city || null,
          zipCode: userData.zipCode || null,
          maritalStatus: userData.maritalStatus || null,
          ministryStartDate: userData.ministryStartDate || null,
          experience: userData.experience || null,
          specialSkills: userData.specialSkills || null,
          liturgicalTraining: userData.liturgicalTraining || false,
          observations: userData.observations || null,
          requiresPasswordChange: true
          // Force password change for admin-created users
        }).returning();
        return user;
      }
      async updateUser(id, userData) {
        const [user] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return user;
      }
      async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
      }
      async getAllUsers() {
        return await DrizzleSQLiteFallback.safeQuery(
          () => db.select().from(users).orderBy(desc(users.createdAt)),
          "SELECT * FROM users ORDER BY createdAt DESC",
          (row) => ({
            ...row,
            requiresPasswordChange: !!row.requires_password_change,
            passwordHash: row.password_hash || row.passwordHash,
            firstName: row.first_name || row.firstName,
            lastName: row.last_name || row.lastName,
            lastLogin: row.last_login ? new Date(row.last_login) : null,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
          })
        );
      }
      async getUsersByRole(role) {
        return await db.select().from(users).where(eq(users.role, role));
      }
      // Questionnaire operations
      async createQuestionnaire(questionnaireData) {
        const [questionnaire] = await db.insert(questionnaires).values({
          title: questionnaireData.title,
          description: questionnaireData.description || null,
          month: questionnaireData.month,
          year: questionnaireData.year,
          questions: questionnaireData.questions,
          deadline: questionnaireData.deadline || null,
          targetUserIds: questionnaireData.targetUserIds || null,
          createdById: questionnaireData.createdById
        }).returning();
        return questionnaire;
      }
      async getQuestionnaires() {
        return await db.select().from(questionnaires).orderBy(desc(questionnaires.createdAt));
      }
      async getQuestionnaireById(id) {
        const [questionnaire] = await db.select().from(questionnaires).where(eq(questionnaires.id, id));
        return questionnaire;
      }
      async updateQuestionnaire(id, questionnaireData) {
        const updateData = {
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (questionnaireData.title) updateData.title = questionnaireData.title;
        if (questionnaireData.description !== void 0) updateData.description = questionnaireData.description;
        if (questionnaireData.month) updateData.month = questionnaireData.month;
        if (questionnaireData.year) updateData.year = questionnaireData.year;
        if (questionnaireData.questions) updateData.questions = questionnaireData.questions;
        if (questionnaireData.deadline !== void 0) updateData.deadline = questionnaireData.deadline;
        if (questionnaireData.targetUserIds !== void 0) updateData.targetUserIds = questionnaireData.targetUserIds;
        const [questionnaire] = await db.update(questionnaires).set(updateData).where(eq(questionnaires.id, id)).returning();
        return questionnaire;
      }
      async deleteQuestionnaire(id) {
        await db.delete(questionnaires).where(eq(questionnaires.id, id));
      }
      // Questionnaire response operations
      async submitQuestionnaireResponse(responseData) {
        const [response] = await db.insert(questionnaireResponses).values(responseData).returning();
        return response;
      }
      async getQuestionnaireResponses(questionnaireId) {
        return await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.questionnaireId, questionnaireId));
      }
      // Schedule operations
      async createSchedule(scheduleData) {
        const [schedule] = await db.insert(schedules).values(scheduleData).returning();
        return schedule;
      }
      async getSchedules() {
        return await db.select().from(schedules).orderBy(desc(schedules.createdAt));
      }
      async getScheduleById(id) {
        const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
        return schedule;
      }
      async getScheduleAssignments(scheduleId) {
        return [];
      }
      async updateSchedule(id, scheduleData) {
        const [schedule] = await db.update(schedules).set({ ...scheduleData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(schedules.id, id)).returning();
        return schedule;
      }
      async deleteSchedule(id) {
        await db.delete(schedules).where(eq(schedules.id, id));
      }
      // Substitution request operations
      async createSubstitutionRequest(requestData) {
        const [request] = await db.insert(substitutionRequests).values(requestData).returning();
        return request;
      }
      async getSubstitutionRequests(scheduleId) {
        return await db.select().from(substitutionRequests).where(eq(substitutionRequests.scheduleId, scheduleId));
      }
      async updateSubstitutionRequest(id, requestData) {
        const [request] = await db.update(substitutionRequests).set({ ...requestData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(substitutionRequests.id, id)).returning();
        return request;
      }
      async deleteSubstitutionRequest(id) {
        await db.delete(substitutionRequests).where(eq(substitutionRequests.id, id));
      }
      // Mass times operations
      async createMassTime(massTimeData) {
        const [massTime] = await db.insert(massTimesConfig).values(massTimeData).returning();
        return massTime;
      }
      async getMassTimes() {
        return await db.select().from(massTimesConfig).orderBy(massTimesConfig.dayOfWeek, massTimesConfig.time);
      }
      async updateMassTime(id, massTimeData) {
        const [massTime] = await db.update(massTimesConfig).set({ ...massTimeData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(massTimesConfig.id, id)).returning();
        return massTime;
      }
      async deleteMassTime(id) {
        await db.delete(massTimesConfig).where(eq(massTimesConfig.id, id));
      }
      // Notification operations
      async createNotification(notificationData) {
        const [notification] = await db.insert(notifications).values(notificationData).returning();
        return notification;
      }
      async getUserNotifications(userId) {
        return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
      }
      async markNotificationAsRead(id) {
        await db.update(notifications).set({ read: true, readAt: /* @__PURE__ */ new Date() }).where(eq(notifications.id, id));
      }
      // Dashboard statistics
      async getDashboardStats() {
        const [totalMinistersResult] = await db.select({ count: count() }).from(users).where(and(eq(users.status, "active"), eq(users.role, "ministro")));
        const [weeklyMassesResult] = await db.select({ count: count() }).from(massTimesConfig).where(eq(massTimesConfig.isActive, true));
        const [availableTodayResult] = await db.select({ count: count() }).from(users).where(and(
          eq(users.status, "active"),
          eq(users.role, "ministro"),
          eq(users.availableForSpecialEvents, true)
        ));
        const weekStart = /* @__PURE__ */ new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const [substitutionsResult] = await db.select({ count: count() }).from(substitutionRequests).where(and(
          eq(substitutionRequests.status, "pending"),
          gte(substitutionRequests.createdAt, weekStart)
        ));
        return {
          totalMinisters: totalMinistersResult.count,
          weeklyMasses: weeklyMassesResult.count,
          availableToday: Math.floor(availableTodayResult.count * 0.76),
          // 76% availability rate
          substitutions: substitutionsResult.count
        };
      }
      // Family relationship operations
      async getFamilyMembers(userId) {
        const relationships = await db.select().from(familyRelationships).where(eq(familyRelationships.userId, userId));
        return relationships;
      }
      async addFamilyMember(userId, relatedUserId, relationshipType) {
        const existingRelationship = await db.select().from(familyRelationships).where(and(
          eq(familyRelationships.userId, userId),
          eq(familyRelationships.relatedUserId, relatedUserId)
        ));
        if (existingRelationship.length > 0) {
          throw new Error("Relationship already exists");
        }
        const [relationship] = await db.insert(familyRelationships).values({
          userId,
          relatedUserId,
          relationshipType
        }).returning();
        const reciprocalTypes = {
          "spouse": "spouse",
          "parent": "child",
          "child": "parent",
          "sibling": "sibling"
        };
        if (reciprocalTypes[relationshipType]) {
          await db.insert(familyRelationships).values({
            userId: relatedUserId,
            relatedUserId: userId,
            relationshipType: reciprocalTypes[relationshipType]
          }).onConflictDoNothing();
        }
        return relationship;
      }
      async removeFamilyMember(relationshipId) {
        const [relationship] = await db.select().from(familyRelationships).where(eq(familyRelationships.id, relationshipId));
        if (relationship) {
          await db.delete(familyRelationships).where(and(
            eq(familyRelationships.userId, relationship.relatedUserId),
            eq(familyRelationships.relatedUserId, relationship.userId)
          ));
        }
        await db.delete(familyRelationships).where(eq(familyRelationships.id, relationshipId));
      }
      // Family questionnaire sharing methods
      async getFamilyMembersForQuestionnaire(userId, questionnaireId) {
        const relationships = await db.select().from(familyRelationships).where(eq(familyRelationships.userId, userId));
        const familyMembers = await Promise.all(
          relationships.map(async (rel) => {
            const user = await this.getUser(rel.relatedUserId);
            if (!user) return null;
            const response = await db.select().from(questionnaireResponses).where(and(
              eq(questionnaireResponses.questionnaireId, questionnaireId),
              eq(questionnaireResponses.userId, rel.relatedUserId)
            )).limit(1);
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              relationshipType: rel.relationshipType,
              hasResponded: response.length > 0,
              responseData: response[0] || null
            };
          })
        );
        return familyMembers.filter((member) => member !== null);
      }
      async checkUserMinisterialActivity(userId) {
        try {
          const responses = await db.select().from(questionnaireResponses).where(eq(questionnaireResponses.userId, userId)).limit(1);
          if (responses.length > 0) {
            return {
              isUsed: true,
              reason: "Usu\xE1rio j\xE1 respondeu question\xE1rios"
            };
          }
          const ministerAssignments = await db.select().from(schedules).where(eq(schedules.ministerId, userId)).limit(1);
          if (ministerAssignments.length > 0) {
            return {
              isUsed: true,
              reason: "Usu\xE1rio j\xE1 foi escalado para missas"
            };
          }
          const substituteAssignments = await db.select().from(schedules).where(eq(schedules.substituteId, userId)).limit(1);
          if (substituteAssignments.length > 0) {
            return {
              isUsed: true,
              reason: "Usu\xE1rio j\xE1 foi escalado como substituto"
            };
          }
          const substitutionActivity = await db.select().from(substitutionRequests).where(or(
            eq(substitutionRequests.requesterId, userId),
            eq(substitutionRequests.substituteId, userId)
          )).limit(1);
          if (substitutionActivity.length > 0) {
            return {
              isUsed: true,
              reason: "Usu\xE1rio tem solicita\xE7\xF5es de substitui\xE7\xE3o no sistema"
            };
          }
          return {
            isUsed: false,
            reason: "Usu\xE1rio nunca teve atividade ministerial no sistema"
          };
        } catch (error) {
          console.warn("Error checking user ministerial activity:", error);
          return {
            isUsed: true,
            reason: "N\xE3o foi poss\xEDvel verificar a atividade do usu\xE1rio no banco de dados"
          };
        }
      }
      // Formation track operations
      async getFormationTracks() {
        return await DrizzleSQLiteFallback.safeQuery(
          () => db.select().from(formationTracks).orderBy(formationTracks.orderIndex, formationTracks.title),
          "SELECT * FROM formation_tracks ORDER BY orderIndex, title",
          (row) => ({
            ...row,
            isActive: !!row.isActive,
            isRequired: !!row.isRequired,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
          })
        );
      }
      async getFormationTrackById(id) {
        const [track] = await db.select().from(formationTracks).where(eq(formationTracks.id, id));
        return track;
      }
      // Formation module operations
      async getFormationModules(trackId) {
        return await DrizzleSQLiteFallback.safeQuery(
          () => db.select().from(formationModules).where(eq(formationModules.trackId, trackId)).orderBy(formationModules.orderIndex, formationModules.title),
          `SELECT * FROM formation_modules WHERE trackId = '${trackId}' ORDER BY orderIndex, title`,
          (row) => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
          })
        );
      }
      async createFormationTrack(trackData) {
        const [track] = await db.insert(formationTracks).values(trackData).returning();
        return track;
      }
      async updateFormationTrack(id, trackData) {
        const [track] = await db.update(formationTracks).set({ ...trackData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(formationTracks.id, id)).returning();
        return track;
      }
      async deleteFormationTrack(id) {
        await db.delete(formationTracks).where(eq(formationTracks.id, id));
      }
      // Formation lesson operations
      async getFormationLessons(trackId, moduleId) {
        const query = db.select().from(formationLessons);
        if (trackId && moduleId) {
          return await query.where(and(eq(formationLessons.trackId, trackId), eq(formationLessons.moduleId, moduleId))).orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
        } else if (trackId) {
          return await query.where(eq(formationLessons.trackId, trackId)).orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
        } else if (moduleId) {
          return await query.where(eq(formationLessons.moduleId, moduleId)).orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
        }
        return await query.orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
      }
      async getFormationLessonById(id) {
        const [lesson] = await db.select().from(formationLessons).where(eq(formationLessons.id, id));
        return lesson;
      }
      async getFormationLessonByNumber(trackId, moduleId, lessonNumber) {
        const [lesson] = await db.select().from(formationLessons).where(and(
          eq(formationLessons.trackId, trackId),
          eq(formationLessons.moduleId, moduleId),
          eq(formationLessons.lessonNumber, lessonNumber)
        ));
        return lesson;
      }
      async getFormationLessonsByTrackAndModule(trackId, moduleId) {
        try {
          console.log(`[DEBUG] Searching lessons for trackId: ${trackId}, moduleId: ${moduleId}`);
          const rawQuery = `
        SELECT id, moduleId, trackId, title, description, lessonNumber, 
               estimatedDuration, orderIndex, createdAt, updatedAt
        FROM formation_lessons 
        WHERE trackId = ? AND moduleId = ? 
        ORDER BY lessonNumber
      `;
          console.log(`[DEBUG] Running raw SQL:`, rawQuery, [trackId, moduleId]);
          const lessons = await db.all(rawQuery, [trackId, moduleId]);
          console.log(`[DEBUG] Found ${lessons.length} lessons via raw SQL`);
          return lessons;
        } catch (error) {
          console.error("[ERROR] getFormationLessonsByTrackAndModule failed:", error);
          throw error;
        }
      }
      async createFormationLesson(lessonData) {
        const [lesson] = await db.insert(formationLessons).values(lessonData).returning();
        return lesson;
      }
      async updateFormationLesson(id, lessonData) {
        const [lesson] = await db.update(formationLessons).set({ ...lessonData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(formationLessons.id, id)).returning();
        return lesson;
      }
      async deleteFormationLesson(id) {
        await db.delete(formationLessons).where(eq(formationLessons.id, id));
      }
      // Formation lesson section operations
      async getFormationLessonSections(lessonId) {
        return await db.select().from(formationLessonSections).where(eq(formationLessonSections.lessonId, lessonId)).orderBy(formationLessonSections.orderIndex);
      }
      async getFormationLessonSectionById(id) {
        const [section] = await db.select().from(formationLessonSections).where(eq(formationLessonSections.id, id));
        return section;
      }
      async createFormationLessonSection(sectionData) {
        const [section] = await db.insert(formationLessonSections).values(sectionData).returning();
        return section;
      }
      async updateFormationLessonSection(id, sectionData) {
        const [section] = await db.update(formationLessonSections).set({ ...sectionData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(formationLessonSections.id, id)).returning();
        return section;
      }
      async deleteFormationLessonSection(id) {
        await db.delete(formationLessonSections).where(eq(formationLessonSections.id, id));
      }
      // Formation lesson progress operations
      async getFormationLessonProgress(userId, lessonId) {
        const query = db.select().from(formationLessonProgress).where(eq(formationLessonProgress.userId, userId));
        if (lessonId) {
          return await query.where(and(eq(formationLessonProgress.userId, userId), eq(formationLessonProgress.lessonId, lessonId)));
        }
        return await query.orderBy(desc(formationLessonProgress.lastAccessedAt));
      }
      async getFormationLessonProgressById(id) {
        const [progress] = await db.select().from(formationLessonProgress).where(eq(formationLessonProgress.id, id));
        return progress;
      }
      async getUserFormationProgress(userId, trackId) {
        if (trackId) {
          return await db.select().from(formationLessonProgress).innerJoin(formationLessons, eq(formationLessonProgress.lessonId, formationLessons.id)).where(and(
            eq(formationLessonProgress.userId, userId),
            eq(formationLessons.trackId, trackId)
          )).orderBy(desc(formationLessonProgress.lastAccessedAt));
        }
        return await this.getFormationLessonProgress(userId);
      }
      async createOrUpdateFormationLessonProgress(progressData) {
        const [existingProgress] = await db.select().from(formationLessonProgress).where(and(
          eq(formationLessonProgress.userId, progressData.userId),
          eq(formationLessonProgress.lessonId, progressData.lessonId)
        ));
        if (existingProgress) {
          const [progress] = await db.update(formationLessonProgress).set({
            status: progressData.status,
            progressPercentage: progressData.progressPercentage,
            timeSpentMinutes: progressData.timeSpentMinutes,
            completedSections: progressData.completedSections,
            lastAccessedAt: /* @__PURE__ */ new Date(),
            completedAt: progressData.status === "completed" ? /* @__PURE__ */ new Date() : null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(formationLessonProgress.id, existingProgress.id)).returning();
          return progress;
        } else {
          const [progress] = await db.insert(formationLessonProgress).values({
            ...progressData,
            lastAccessedAt: /* @__PURE__ */ new Date(),
            completedAt: progressData.status === "completed" ? /* @__PURE__ */ new Date() : null
          }).returning();
          return progress;
        }
      }
      async markLessonSectionCompleted(userId, lessonId, sectionId) {
        const [currentProgress] = await db.select().from(formationLessonProgress).where(and(
          eq(formationLessonProgress.userId, userId),
          eq(formationLessonProgress.lessonId, lessonId)
        ));
        const currentSections = currentProgress?.completedSections || [];
        if (!currentSections.includes(sectionId)) {
          currentSections.push(sectionId);
        }
        const totalSections = await db.select({ count: count() }).from(formationLessonSections).where(eq(formationLessonSections.lessonId, lessonId));
        const progressPercentage = Math.round(currentSections.length / (totalSections[0]?.count || 1) * 100);
        const status = progressPercentage === 100 ? "completed" : "in_progress";
        return await this.createOrUpdateFormationLessonProgress({
          userId,
          lessonId,
          status,
          progressPercentage,
          completedSections: currentSections,
          timeSpentMinutes: (currentProgress?.timeSpentMinutes || 0) + 1
        });
      }
      async markLessonCompleted(userId, lessonId) {
        const sections = await this.getFormationLessonSections(lessonId);
        const sectionIds = sections.map((s) => s.id);
        return await this.createOrUpdateFormationLessonProgress({
          userId,
          lessonId,
          status: "completed",
          progressPercentage: 100,
          completedSections: sectionIds,
          timeSpentMinutes: 0
          // Will be preserved from existing record
        });
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/utils/logger.ts
var Logger, logger;
var init_logger = __esm({
  "server/utils/logger.ts"() {
    "use strict";
    Logger = class {
      logLevel;
      constructor() {
        this.logLevel = process.env.NODE_ENV === "production" ? 1 /* WARN */ : 3 /* DEBUG */;
      }
      shouldLog(level) {
        return level <= this.logLevel;
      }
      formatMessage(level, message, context) {
        const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
        const baseMessage = `[${timestamp2}] [${level}] ${message}`;
        if (context && typeof context === "object") {
          return `${baseMessage} :: ${JSON.stringify(context)}`;
        }
        return baseMessage;
      }
      error(message, error) {
        if (this.shouldLog(0 /* ERROR */)) {
          console.error(this.formatMessage("ERROR", message, error));
        }
      }
      warn(message, context) {
        if (this.shouldLog(1 /* WARN */)) {
          console.warn(this.formatMessage("WARN", message, context));
        }
      }
      info(message, context) {
        if (this.shouldLog(2 /* INFO */)) {
          console.log(this.formatMessage("INFO", message, context));
        }
      }
      debug(message, context) {
        if (this.shouldLog(3 /* DEBUG */)) {
          console.log(this.formatMessage("DEBUG", message, context));
        }
      }
      // Método específico para desenvolvimento
      dev(message, context) {
        if (process.env.NODE_ENV === "development") {
          console.log(this.formatMessage("DEV", message, context));
        }
      }
    };
    logger = new Logger();
  }
});

// server/utils/scheduleGenerator.ts
var scheduleGenerator_exports = {};
__export(scheduleGenerator_exports, {
  ScheduleGenerator: () => ScheduleGenerator,
  generateAutomaticSchedule: () => generateAutomaticSchedule
});
import { eq as eq7, and as and5, or as or5, ne as ne2 } from "drizzle-orm";
import { format as format2, addDays, startOfMonth, endOfMonth, getDay as getDay2 } from "date-fns";
async function generateAutomaticSchedule(year, month, isPreview = false) {
  const generator = new ScheduleGenerator();
  return await generator.generateScheduleForMonth(year, month, isPreview);
}
var ScheduleGenerator;
var init_scheduleGenerator = __esm({
  "server/utils/scheduleGenerator.ts"() {
    "use strict";
    init_logger();
    init_schema();
    ScheduleGenerator = class {
      ministers = [];
      availabilityData = /* @__PURE__ */ new Map();
      massTimes = [];
      db;
      /**
       * Gera escalas automaticamente para um mês específico
       */
      async generateScheduleForMonth(year, month, isPreview = false) {
        const { db: db2 } = await init_db().then(() => db_exports);
        this.db = db2;
        logger.info(`Iniciando gera\xE7\xE3o ${isPreview ? "de preview" : "definitiva"} de escalas para ${month}/${year}`);
        console.log(`[SCHEDULE_GEN] Starting generation for ${month}/${year}, preview: ${isPreview}`);
        console.log(`[SCHEDULE_GEN] Database status:`, { hasDb: !!this.db, nodeEnv: process.env.NODE_ENV });
        try {
          await this.loadMinistersData();
          console.log(`[SCHEDULE_GEN] Ministers loaded: ${this.ministers.length}`);
          await this.loadAvailabilityData(year, month, isPreview);
          console.log(`[SCHEDULE_GEN] Availability data loaded: ${this.availabilityData.size} entries`);
          await this.loadMassTimesConfig();
          console.log(`[SCHEDULE_GEN] Mass times config loaded: ${this.massTimes.length} times`);
          const monthlyMassTimes = this.generateMonthlyMassTimes(year, month);
          console.log(`[SCHEDULE_GEN] Generated ${monthlyMassTimes.length} mass times for the month`);
          const generatedSchedules = [];
          for (const massTime of monthlyMassTimes) {
            const schedule = await this.generateScheduleForMass(massTime);
            generatedSchedules.push(schedule);
          }
          logger.info(`Geradas ${generatedSchedules.length} escalas para ${month}/${year}`);
          return generatedSchedules;
        } catch (error) {
          logger.error("Erro ao gerar escalas autom\xE1ticas:", error);
          throw new Error("Falha na gera\xE7\xE3o autom\xE1tica de escalas");
        }
      }
      /**
       * Carrega dados dos ministros do banco
       */
      async loadMinistersData() {
        if (!this.db) {
          logger.warn("Database n\xE3o dispon\xEDvel, criando dados mock para preview");
          console.log("[SCHEDULE_GEN] Creating mock ministers data for preview");
          this.ministers = [
            { id: "1", name: "Jo\xE3o Silva", role: "ministro", totalServices: 5, lastService: null, preferredTimes: ["10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.8, preferenceScore: 0.7 },
            { id: "2", name: "Maria Santos", role: "ministro", totalServices: 3, lastService: null, preferredTimes: ["08:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.9, preferenceScore: 0.8 },
            { id: "3", name: "Pedro Costa", role: "ministro", totalServices: 4, lastService: null, preferredTimes: ["19:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.7, preferenceScore: 0.6 },
            { id: "4", name: "Ana Lima", role: "ministro", totalServices: 2, lastService: null, preferredTimes: ["10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.85, preferenceScore: 0.75 },
            { id: "5", name: "Carlos Oliveira", role: "coordenador", totalServices: 6, lastService: null, preferredTimes: ["08:00", "10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.95, preferenceScore: 0.9 }
          ];
          return;
        }
        const ministersData = await this.db.select({
          id: users.id,
          name: users.name,
          role: users.role,
          totalServices: users.totalServices,
          lastService: users.lastService,
          preferredTimes: users.preferredTimes,
          canServeAsCouple: users.canServeAsCouple,
          spouseMinisterId: users.spouseMinisterId
        }).from(users).where(
          and5(
            eq7(users.status, "active"),
            ne2(users.role, "gestor")
            // Excluir gestores das escalas
          )
        );
        this.ministers = ministersData.map((m) => ({
          ...m,
          totalServices: m.totalServices || 0,
          preferredTimes: m.preferredTimes || [],
          canServeAsCouple: m.canServeAsCouple || false,
          availabilityScore: this.calculateAvailabilityScore(m),
          preferenceScore: this.calculatePreferenceScore(m)
        }));
        logger.info(`Carregados ${this.ministers.length} ministros ativos`);
      }
      /**
       * Carrega dados de disponibilidade dos questionários
       */
      async loadAvailabilityData(year, month, isPreview = false) {
        if (!this.db) {
          console.log("[SCHEDULE_GEN] Creating mock availability data for preview");
          logger.warn("Database n\xE3o dispon\xEDvel, criando dados de disponibilidade mock");
          this.availabilityData.set("1", {
            ministerId: "1",
            availableSundays: ["1", "2", "3", "4"],
            preferredMassTimes: ["10:00"],
            alternativeTimes: ["08:00", "19:00"],
            canSubstitute: true,
            dailyMassAvailability: []
          });
          this.availabilityData.set("2", {
            ministerId: "2",
            availableSundays: ["1", "2", "4"],
            preferredMassTimes: ["08:00"],
            alternativeTimes: ["10:00"],
            canSubstitute: true,
            dailyMassAvailability: []
          });
          this.availabilityData.set("3", {
            ministerId: "3",
            availableSundays: ["2", "3", "4"],
            preferredMassTimes: ["19:00"],
            alternativeTimes: ["10:00"],
            canSubstitute: false,
            dailyMassAvailability: []
          });
          this.availabilityData.set("4", {
            ministerId: "4",
            availableSundays: ["1", "3", "4"],
            preferredMassTimes: ["10:00"],
            alternativeTimes: ["08:00", "19:00"],
            canSubstitute: true,
            dailyMassAvailability: []
          });
          this.availabilityData.set("5", {
            ministerId: "5",
            availableSundays: ["1", "2", "3", "4"],
            preferredMassTimes: ["08:00", "10:00"],
            alternativeTimes: ["19:00"],
            canSubstitute: true,
            dailyMassAvailability: []
          });
          return;
        }
        const allowedStatuses = isPreview ? ["open", "sent", "active"] : ["closed"];
        const responses = await this.db.select().from(questionnaireResponses).innerJoin(questionnaires, eq7(questionnaireResponses.questionnaireId, questionnaires.id)).where(
          and5(
            eq7(questionnaires.month, month),
            eq7(questionnaires.year, year),
            or5(
              ...allowedStatuses.map((status) => eq7(questionnaires.status, status))
            )
          )
        );
        responses.forEach((r) => {
          this.availabilityData.set(r.questionnaire_responses.userId, {
            ministerId: r.questionnaire_responses.userId,
            availableSundays: r.questionnaire_responses.availableSundays || [],
            preferredMassTimes: r.questionnaire_responses.preferredMassTimes || [],
            alternativeTimes: r.questionnaire_responses.alternativeTimes || [],
            canSubstitute: r.questionnaire_responses.canSubstitute || false,
            dailyMassAvailability: r.questionnaire_responses.dailyMassAvailability || []
          });
        });
        logger.info(`Carregadas respostas de ${responses.length} ministros`);
      }
      /**
       * Carrega configuração dos horários de missa
       */
      async loadMassTimesConfig() {
        if (!this.db) {
          console.error("[SCHEDULE_GEN] Database is null/undefined in loadMassTimesConfig!");
          this.massTimes = [
            { id: "1", dayOfWeek: 0, time: "08:00", minMinisters: 3, maxMinisters: 6 },
            { id: "2", dayOfWeek: 0, time: "10:00", minMinisters: 4, maxMinisters: 8 },
            { id: "3", dayOfWeek: 0, time: "19:00", minMinisters: 3, maxMinisters: 6 }
          ];
          logger.warn("Using default mass times configuration due to missing database");
          return;
        }
        const config = await this.db.select().from(massTimesConfig).where(eq7(massTimesConfig.isActive, true));
        this.massTimes = config.map((c) => ({
          id: c.id,
          dayOfWeek: c.dayOfWeek,
          time: c.time,
          minMinisters: c.minMinisters,
          maxMinisters: c.maxMinisters
        }));
      }
      /**
       * Gera horários de missa para todas as datas do mês
       */
      generateMonthlyMassTimes(year, month) {
        const monthlyTimes = [];
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));
        let currentDate = startDate;
        while (currentDate <= endDate) {
          const dayOfWeek = getDay2(currentDate);
          const dayMassTimes = this.massTimes.filter((mt) => mt.dayOfWeek === dayOfWeek);
          dayMassTimes.forEach((massTime) => {
            monthlyTimes.push({
              ...massTime,
              date: format2(currentDate, "yyyy-MM-dd")
            });
          });
          currentDate = addDays(currentDate, 1);
        }
        return monthlyTimes.sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
      }
      /**
       * Gera escala para uma missa específica
       */
      async generateScheduleForMass(massTime) {
        logger.debug(`Gerando escala para ${massTime.date} ${massTime.time}`);
        console.log(`[SCHEDULE_GEN] Generating for mass: ${massTime.date} at ${massTime.time}`);
        const availableMinsters = this.getAvailableMinistersForMass(massTime);
        console.log(`[SCHEDULE_GEN] Available ministers for this mass: ${availableMinsters.length}`);
        const selectedMinisters = this.selectOptimalMinisters(availableMinsters, massTime);
        console.log(`[SCHEDULE_GEN] Selected ministers: ${selectedMinisters.length}`);
        const backupMinisters = this.selectBackupMinisters(availableMinsters, selectedMinisters, 2);
        const confidence = this.calculateScheduleConfidence(selectedMinisters, massTime);
        return {
          massTime,
          ministers: selectedMinisters,
          backupMinisters,
          confidence
        };
      }
      /**
       * Filtra ministros disponíveis para uma missa específica
       */
      getAvailableMinistersForMass(massTime) {
        const dayName = this.getDayName(massTime.dayOfWeek);
        const dateStr = format2(new Date(massTime.date), "dd/MM");
        return this.ministers.filter((minister) => {
          const availability = this.availabilityData.get(minister.id);
          if (!availability) {
            logger.debug(`Sem dados de disponibilidade para ministro ${minister.name} - incluindo no preview`);
            return true;
          }
          if (massTime.dayOfWeek === 0) {
            const sundayStr = `Domingo ${dateStr}`;
            if (availability.availableSundays.includes("Nenhum domingo")) {
              return false;
            }
            if (availability.availableSundays.length > 0) {
              return availability.availableSundays.includes(sundayStr);
            }
            return true;
          }
          if (availability.dailyMassAvailability.length > 0) {
            return availability.dailyMassAvailability.includes(dayName);
          }
          return true;
        });
      }
      /**
       * Seleciona ministros ideais usando algoritmo de pontuação
       */
      selectOptimalMinisters(available, massTime) {
        const scoredMinisters = available.map((minister) => ({
          minister,
          score: this.calculateMinisterScore(minister, massTime)
        }));
        scoredMinisters.sort((a, b) => b.score - a.score);
        const selected = [];
        const used = /* @__PURE__ */ new Set();
        for (const { minister } of scoredMinisters) {
          if (used.has(minister.id) || selected.length >= massTime.maxMinisters) {
            continue;
          }
          if (minister.canServeAsCouple && minister.spouseMinisterId) {
            const spouse = available.find((m) => m.id === minister.spouseMinisterId);
            if (spouse && !used.has(spouse.id) && selected.length + 1 < massTime.maxMinisters) {
              selected.push(minister, spouse);
              used.add(minister.id);
              used.add(spouse.id);
              logger.debug(`Escalado casal: ${minister.name} + ${spouse.name}`);
              continue;
            }
          }
          selected.push(minister);
          used.add(minister.id);
          if (selected.length >= massTime.minMinisters && selected.length >= 4) {
            break;
          }
        }
        return selected;
      }
      /**
       * Seleciona ministros de backup
       */
      selectBackupMinisters(available, selected, count5) {
        const selectedIds = new Set(selected.map((m) => m.id));
        const backup = available.filter((m) => !selectedIds.has(m.id)).sort((a, b) => this.calculateMinisterScore(b, null) - this.calculateMinisterScore(a, null)).slice(0, count5);
        return backup;
      }
      /**
       * Calcula pontuação de um ministro para uma missa específica
       */
      calculateMinisterScore(minister, massTime) {
        let score = 0;
        const avgServices = this.ministers.reduce((sum, m) => sum + m.totalServices, 0) / this.ministers.length;
        const serviceBalance = Math.max(0, avgServices - minister.totalServices);
        score += serviceBalance * 0.4;
        if (minister.lastService) {
          const daysSinceLastService = Math.floor(
            (Date.now() - minister.lastService.getTime()) / (1e3 * 60 * 60 * 24)
          );
          score += Math.min(daysSinceLastService / 30, 2) * 0.3;
        } else {
          score += 0.3;
        }
        if (massTime) {
          const availability2 = this.availabilityData.get(minister.id);
          if (availability2?.preferredMassTimes.includes(`${massTime.time.substring(0, 2)}h`)) {
            score += 0.2;
          }
        }
        const availability = this.availabilityData.get(minister.id);
        if (availability?.canSubstitute) {
          score += 0.1;
        }
        return score;
      }
      /**
       * Calcula confiança na escala gerada
       */
      calculateScheduleConfidence(ministers, massTime) {
        let confidence = 0;
        if (ministers.length >= massTime.minMinisters) {
          confidence += 0.5;
          if (ministers.length >= massTime.minMinisters + 1) {
            confidence += 0.1;
          }
        }
        const avgScore = ministers.reduce((sum, m) => sum + m.preferenceScore, 0) / ministers.length;
        confidence += Math.min(avgScore / 10, 0.3);
        const serviceVariance = this.calculateServiceVariance(ministers);
        confidence += Math.max(0, 0.2 - serviceVariance / 100);
        return Math.min(confidence, 1);
      }
      /**
       * Funções auxiliares
       */
      calculateAvailabilityScore(minister) {
        return minister.totalServices || 0;
      }
      calculatePreferenceScore(minister) {
        return (minister.preferredTimes?.length || 0) + (minister.canServeAsCouple ? 2 : 0);
      }
      calculateServiceVariance(ministers) {
        const services = ministers.map((m) => m.totalServices);
        const avg2 = services.reduce((sum, s) => sum + s, 0) / services.length;
        const variance = services.reduce((sum, s) => sum + Math.pow(s - avg2, 2), 0) / services.length;
        return Math.sqrt(variance);
      }
      getDayName(dayOfWeek) {
        const days = ["Domingo", "Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
        return days[dayOfWeek];
      }
    };
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
await init_storage();
import { createServer } from "http";
import cookieParser from "cookie-parser";
import crypto from "crypto";

// server/auth.ts
await init_db();
init_schema();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq as eq2 } from "drizzle-orm";
function getJWTSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("\u26A0\uFE0F  JWT_SECRET n\xE3o definido, usando valor padr\xE3o para desenvolvimento");
    return "sjt-mesc-development-secret-2025";
  }
  throw new Error("JWT_SECRET environment variable is required. Please set this environment variable for security.");
}
var JWT_SECRET = getJWTSecret();
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const secret = JWT_SECRET;
  const verifyAndCheckStatus = async (user) => {
    try {
      console.log("[AUTH] Verifying user:", user.id, user.email);
      const [currentUser] = await db.select().from(users).where(eq2(users.id, user.id)).limit(1);
      console.log("[AUTH] User from DB:", currentUser?.id, currentUser?.status);
      if (!currentUser || currentUser.status !== "active") {
        console.log("[AUTH] User blocked - Status:", currentUser?.status);
        return res.status(403).json({ message: "Conta inativa ou pendente. Entre em contato com a coordena\xE7\xE3o." });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("[AUTH] Database error:", error);
      return res.status(500).json({ message: "Erro interno de autentica\xE7\xE3o" });
    }
  };
  if (!token) {
    const cookieToken = req.cookies?.token;
    if (!cookieToken) {
      return res.status(401).json({ message: "Token de autentica\xE7\xE3o n\xE3o fornecido" });
    }
    jwt.verify(cookieToken, secret, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token inv\xE1lido ou expirado" });
      }
      await verifyAndCheckStatus(user);
    });
    return;
  }
  jwt.verify(token, secret, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token inv\xE1lido ou expirado" });
    }
    await verifyAndCheckStatus(user);
  });
}
function requireRole(roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const [currentUser] = await db.select({ role: users.role }).from(users).where(eq2(users.id, req.user.id)).limit(1);
    if (!currentUser || !roles.includes(currentUser.role)) {
      return res.status(403).json({ message: "Permiss\xE3o insuficiente para esta a\xE7\xE3o" });
    }
    next();
  };
}
async function login(email, password) {
  try {
    const [user] = await db.select().from(users).where(eq2(users.email, email)).limit(1);
    if (!user) {
      throw new Error("Usu\xE1rio ou senha errados, revise os dados e tente novamente.");
    }
    if (user.status === "pending") {
      throw new Error("Sua conta ainda n\xE3o foi aprovada. Aguarde a aprova\xE7\xE3o do coordenador.");
    }
    if (user.status === "inactive") {
      throw new Error("Usu\xE1rio inativo. Entre em contato com a coordena\xE7\xE3o.");
    }
    const passwordHash = user.passwordHash || "";
    const isValidPassword = await verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      throw new Error("Usu\xE1rio ou senha errados, revise os dados e tente novamente.");
    }
    const token = generateToken(user);
    try {
      await db.update(users).set({ lastLogin: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
    } catch (updateError) {
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    throw error;
  }
}
async function register(userData) {
  try {
    const [existingUser] = await db.select().from(users).where(eq2(users.email, userData.email)).limit(1);
    if (existingUser) {
      throw new Error("Este email j\xE1 est\xE1 cadastrado");
    }
    const passwordHash = await hashPassword(userData.password);
    const [newUser] = await db.insert(users).values({
      email: userData.email,
      passwordHash,
      name: userData.name,
      phone: userData.phone || null,
      role: userData.role || "ministro",
      status: userData.status || "pending",
      observations: userData.observations || null,
      requiresPasswordChange: false
    }).returning();
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const sqliteDb = new Database("local.db");
    const user = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      sqliteDb.close();
      throw new Error("Usu\xE1rio n\xE3o encontrado");
    }
    const userHash = user.password_hash || user.password || "";
    const isValidPassword = await verifyPassword(currentPassword, userHash);
    if (!isValidPassword) {
      sqliteDb.close();
      throw new Error("Senha atual incorreta");
    }
    const newPasswordHash = await hashPassword(newPassword);
    sqliteDb.prepare(`
      UPDATE users 
      SET password_hash = ?, password = ?, requires_password_change = 0 
      WHERE id = ?
    `).run(newPasswordHash, newPasswordHash, userId);
    sqliteDb.close();
    return { message: "Senha alterada com sucesso" };
  } catch (error) {
    throw error;
  }
}
async function resetPassword(email) {
  try {
    const [user] = await db.select().from(users).where(eq2(users.email, email)).limit(1);
    if (!user) {
      return { message: "Se o email existir em nosso sistema, voc\xEA receber\xE1 instru\xE7\xF5es para redefinir sua senha." };
    }
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const passwordHash = await hashPassword(tempPassword);
    await db.update(users).set({
      passwordHash,
      requiresPasswordChange: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, user.id));
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Senha tempor\xE1ria gerada para ${email}: ${tempPassword}`);
    }
    return { message: "Se o email existir em nosso sistema, voc\xEA receber\xE1 instru\xE7\xF5es para redefinir sua senha." };
  } catch (error) {
    throw error;
  }
}

// server/authRoutes.ts
import { Router } from "express";
await init_db();
init_schema();
import { z } from "zod";
import { eq as eq3 } from "drizzle-orm";
var router = Router();
var loginSchema = z.object({
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});
var registerSchema = z.object({
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  role: z.enum(["reitor", "coordenador", "ministro"]).optional()
});
var publicRegisterSchema = z.object({
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  observations: z.string().optional()
});
var changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres")
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      // Secure in all environments except development
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 7 dias
      path: "/"
      // Explicitly set path for clarity
    });
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inv\xE1lidos",
        errors: error.errors
      });
    }
    res.status(401).json({
      success: false,
      message: error.message || "Erro ao fazer login"
    });
  }
});
router.post("/register", async (req, res) => {
  try {
    const userData = publicRegisterSchema.parse(req.body);
    const newUser = await register({
      ...userData,
      role: "ministro",
      status: "pending"
    });
    res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso! Aguarde a aprova\xE7\xE3o do coordenador.",
      user: newUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inv\xE1lidos",
        errors: error.errors
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || "Erro ao criar usu\xE1rio"
    });
  }
});
router.post("/admin-register", authenticateToken, requireRole(["reitor", "coordenador"]), async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    if ((userData.role === "reitor" || userData.role === "coordenador") && req.user?.role !== "reitor") {
      return res.status(403).json({
        success: false,
        message: "Apenas o reitor pode criar coordenadores"
      });
    }
    const newUser = await register(userData);
    res.status(201).json({
      success: true,
      message: "Usu\xE1rio criado com sucesso",
      user: newUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inv\xE1lidos",
        errors: error.errors
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || "Erro ao criar usu\xE1rio"
    });
  }
});
router.get("/me", authenticateToken, async (req, res) => {
  try {
    if (!db) {
      res.json({
        success: true,
        user: {
          ...req.user,
          status: "active"
          // Adiciona status padrão
        }
      });
      return;
    }
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Usu\xE1rio n\xE3o autenticado"
      });
    }
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      requiresPasswordChange: users.requiresPasswordChange,
      profilePhoto: users.photoUrl,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      photoUrl: users.photoUrl
    }).from(users).where(eq3(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usu\xE1rio n\xE3o encontrado"
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Erro ao buscar dados do usu\xE1rio:", error);
    res.json({
      success: true,
      user: {
        ...req.user,
        status: "active"
        // Adiciona status padrão em caso de erro
      }
    });
  }
});
router.get("/user", authenticateToken, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar dados do usu\xE1rio"
    });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/"
  });
  res.json({
    success: true,
    message: "Logout realizado com sucesso"
  });
});
router.post("/change-password", authenticateToken, async (req, res) => {
  console.log("\u{1F50D} DEBUG: Rota /change-password foi chamada!");
  console.log("\u{1F50D} DEBUG: User autenticado:", req.user?.id);
  console.log("\u{1F50D} DEBUG: Dados recebidos no req.body:", req.body);
  console.log("\u{1F50D} DEBUG: Tipo dos dados:", typeof req.body, Object.keys(req.body));
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Usu\xE1rio n\xE3o autenticado"
      });
    }
    const result = await changePassword(req.user.id, currentPassword, newPassword);
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.log("\u274C DEBUG: Erro na rota /change-password:", error);
    if (error instanceof z.ZodError) {
      console.log("\u274C DEBUG: Erro de valida\xE7\xE3o Zod:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Dados inv\xE1lidos",
        errors: error.errors
      });
    }
    res.status(400).json({
      success: false,
      message: error.message || "Erro ao trocar senha"
    });
  }
});
var adminResetSchema = z.object({
  userId: z.string().uuid("ID de usu\xE1rio inv\xE1lido"),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres")
});
var emailResetSchema = z.object({
  email: z.string().min(1, "Email \xE9 obrigat\xF3rio")
});
router.post("/admin-reset-password", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { userId, newPassword } = adminResetSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq3(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usu\xE1rio n\xE3o encontrado"
      });
    }
    const currentUser = req.user;
    if (currentUser?.role === "coordenador" && user.role === "gestor") {
      return res.status(403).json({
        success: false,
        message: "Coordenadores n\xE3o podem resetar senha de gestores"
      });
    }
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({
      passwordHash,
      requiresPasswordChange: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(users.id, userId));
    console.log(`[ADMIN RESET] ${currentUser?.name} (${currentUser?.role}) resetou senha do usu\xE1rio ${user.name} (${user.email})`);
    return res.json({
      success: true,
      message: "Senha resetada com sucesso. O usu\xE1rio precisar\xE1 criar uma nova senha no pr\xF3ximo login."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados inv\xE1lidos",
        errors: error.errors
      });
    }
    console.error("Erro ao resetar senha administrativamente:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicita\xE7\xE3o de reset de senha"
    });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email \xE9 obrigat\xF3rio"
      });
    }
    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Por favor, forne\xE7a um endere\xE7o de email v\xE1lido"
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const result = await resetPassword(normalizedEmail);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Erro ao resetar senha por email:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicita\xE7\xE3o de reset de senha"
    });
  }
});
router.get("/check", authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: req.user
  });
});
var authRoutes_default = router;

// server/passwordResetRoutes.ts
await init_db();
init_schema();
import { Router as Router2 } from "express";
import { eq as eq4, and as and2, or as or2, desc as desc2 } from "drizzle-orm";
var router2 = Router2();
router2.post("/request-reset", async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email \xE9 obrigat\xF3rio"
      });
    }
    const [user] = await db.select().from(users).where(eq4(users.email, email)).limit(1);
    if (!user) {
      return res.json({
        success: true,
        message: "Se o email existir em nosso sistema, uma solicita\xE7\xE3o ser\xE1 enviada ao administrador."
      });
    }
    const [existingRequest] = await db.select().from(passwordResetRequests).where(
      and2(
        eq4(passwordResetRequests.userId, user.id),
        eq4(passwordResetRequests.status, "pending")
      )
    ).limit(1);
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "J\xE1 existe uma solicita\xE7\xE3o pendente para este email."
      });
    }
    await db.insert(passwordResetRequests).values({
      userId: user.id,
      reason: reason || "Usu\xE1rio esqueceu a senha",
      status: "pending"
    });
    const coordinators = await db.select().from(users).where(
      and2(
        eq4(users.status, "active"),
        // Notifica tanto coordenadores quanto gestores
        or2(
          eq4(users.role, "coordenador"),
          eq4(users.role, "gestor")
        )
      )
    );
    for (const coordinator of coordinators) {
      await db.insert(notifications).values({
        userId: coordinator.id,
        title: "Solicita\xE7\xE3o de Nova Senha",
        message: `${user.name} (${user.email}) solicitou uma nova senha. Por favor, entre em contato para auxiliar.`,
        type: "announcement",
        priority: "high",
        read: false
      });
    }
    res.json({
      success: true,
      message: "Os Coordenadores foram notificados para enviar nova senha, assim que eles receberem a mensagem responder\xE3o de imediato."
    });
  } catch (error) {
    console.error("Erro ao solicitar reset:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar solicita\xE7\xE3o"
    });
  }
});
router2.get("/pending-requests", async (req, res) => {
  try {
    const requests = await db.select({
      id: passwordResetRequests.id,
      userId: passwordResetRequests.userId,
      userName: users.name,
      userEmail: users.email,
      requestedAt: passwordResetRequests.requestedAt,
      reason: passwordResetRequests.reason,
      status: passwordResetRequests.status
    }).from(passwordResetRequests).leftJoin(users, eq4(passwordResetRequests.userId, users.id)).where(eq4(passwordResetRequests.status, "pending")).orderBy(desc2(passwordResetRequests.requestedAt));
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Erro ao buscar solicita\xE7\xF5es:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar solicita\xE7\xF5es"
    });
  }
});
router2.post("/approve-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;
    const [request] = await db.select().from(passwordResetRequests).where(eq4(passwordResetRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const hashedPassword = await hashPassword(tempPassword);
    await db.update(users).set({
      passwordHash: hashedPassword,
      requiresPasswordChange: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(users.id, request.userId));
    await db.update(passwordResetRequests).set({
      status: "approved",
      processedBy: adminId,
      processedAt: /* @__PURE__ */ new Date(),
      adminNotes: adminNotes || `Senha tempor\xE1ria: ${tempPassword}`
    }).where(eq4(passwordResetRequests.id, requestId));
    await db.insert(notifications).values({
      userId: request.userId,
      title: "Senha Resetada",
      message: `Sua senha foi resetada. Senha tempor\xE1ria: ${tempPassword}. Voc\xEA dever\xE1 alter\xE1-la no pr\xF3ximo login.`,
      type: "announcement",
      read: false
    });
    res.json({
      success: true,
      message: "Reset aprovado com sucesso",
      tempPassword
      // Retorna para o admin poder informar ao usuário
    });
  } catch (error) {
    console.error("Erro ao aprovar reset:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar aprova\xE7\xE3o"
    });
  }
});
router2.post("/reject-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;
    const [request] = await db.select().from(passwordResetRequests).where(eq4(passwordResetRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    await db.update(passwordResetRequests).set({
      status: "rejected",
      processedBy: adminId,
      processedAt: /* @__PURE__ */ new Date(),
      adminNotes
    }).where(eq4(passwordResetRequests.id, requestId));
    await db.insert(notifications).values({
      userId: request.userId,
      title: "Solicita\xE7\xE3o de Reset Negada",
      message: adminNotes || "Sua solicita\xE7\xE3o de reset de senha foi negada. Entre em contato com a coordena\xE7\xE3o.",
      type: "announcement",
      read: false
    });
    res.json({
      success: true,
      message: "Solicita\xE7\xE3o rejeitada"
    });
  } catch (error) {
    console.error("Erro ao rejeitar reset:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar rejei\xE7\xE3o"
    });
  }
});

// server/routes/questionnaireAdmin.ts
await init_db();
init_schema();
import { Router as Router3 } from "express";
import { z as z2 } from "zod";
import { eq as eq5, and as and3, or as or3, ne } from "drizzle-orm";

// server/utils/questionnaireGenerator.ts
init_logger();
import { format, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
var MONTHLY_THEMES = {
  1: { theme: "Renova\xE7\xE3o", article: "\xE0" },
  2: { theme: "Amor", article: "ao" },
  3: { theme: "Convers\xE3o", article: "\xE0" },
  4: { theme: "Ressurrei\xE7\xE3o", article: "\xE0" },
  5: { theme: "Maria", article: "\xE0" },
  6: { theme: "Sagrado Cora\xE7\xE3o", article: "ao" },
  7: { theme: "Fam\xEDlia", article: "\xE0" },
  8: { theme: "Voca\xE7\xF5es", article: "\xE0s" },
  9: { theme: "B\xEDblia", article: "\xE0" },
  10: { theme: "Miss\xF5es", article: "\xE0s" },
  11: { theme: "Finados", article: "aos" },
  12: { theme: "Natal", article: "ao" }
};
function getFirstThursdayOfMonth(month, year) {
  const firstDay = new Date(year, month - 1, 1);
  let day = 1;
  while (new Date(year, month - 1, day).getDay() !== 4) {
    day++;
  }
  const date2 = new Date(year, month - 1, day);
  const isHoliday = isHolidayDate(date2);
  return { day, isHoliday };
}
function getFirstFridayOfMonth(month, year) {
  let day = 1;
  while (new Date(year, month - 1, day).getDay() !== 5) {
    day++;
  }
  return day;
}
function getFirstSaturdayOfMonth(month, year) {
  let day = 1;
  while (new Date(year, month - 1, day).getDay() !== 6) {
    day++;
  }
  return day;
}
function isHolidayDate(date2) {
  const month = date2.getMonth() + 1;
  const day = date2.getDate();
  const holidays = [
    { month: 1, day: 1 },
    // Ano Novo
    { month: 4, day: 21 },
    // Tiradentes
    { month: 5, day: 1 },
    // Dia do Trabalho
    { month: 9, day: 7 },
    // Independência
    { month: 10, day: 12 },
    // Nossa Senhora Aparecida
    { month: 11, day: 2 },
    // Finados
    { month: 11, day: 15 },
    // Proclamação da República
    { month: 11, day: 20 },
    // Consciência Negra
    { month: 12, day: 25 }
    // Natal
  ];
  return holidays.some((h) => h.month === month && h.day === day);
}
function getOctoberSpecialDates(year) {
  return {
    novena: { start: 19, end: 27 },
    feast: 28
  };
}
function generateQuestionnaireQuestions(month, year) {
  logger.debug(`Iniciando gera\xE7\xE3o de question\xE1rio para ${month}/${year}`);
  const questions = [];
  const monthName = format(new Date(year, month - 1), "MMMM", { locale: ptBR });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const themeInfo = MONTHLY_THEMES[month] || { theme: "do m\xEAs", article: "a" };
  logger.debug(`Tema detectado para question\xE1rio: ${themeInfo.theme}`);
  const sundayDates = [];
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  for (let day = 1; day <= daysInMonth; day++) {
    const date2 = new Date(year, month - 1, day);
    if (getDay(date2) === 0) {
      let sundayLabel = `Domingo ${format(date2, "dd/MM")}`;
      if (month === 10 && day === 12) {
        sundayLabel = `Domingo (12/10) \u2013 Missa em honra \xE0 Nossa Senhora Aparecida`;
      }
      sundayDates.push(sundayLabel);
    }
  }
  questions.push({
    id: "monthly_availability",
    type: "multiple_choice",
    question: `Neste m\xEAs de ${capitalizedMonth} dedicado ${themeInfo.article} "${themeInfo.theme}", voc\xEA tem disponibilidade para servir no seu hor\xE1rio de costume?`,
    options: ["Sim", "N\xE3o"],
    required: true,
    category: "regular",
    order: 1
  });
  questions.push({
    id: "main_service_time",
    type: "multiple_choice",
    question: "Em qual hor\xE1rio voc\xEA normalmente serve aos domingos?",
    options: ["8h", "10h", "19h"],
    required: false,
    category: "regular",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim"
    },
    order: 2
  });
  questions.push({
    id: "can_substitute",
    type: "multiple_choice",
    question: "Poder\xE1 substituir algum ministro caso algu\xE9m precise?",
    options: ["Sim", "N\xE3o"],
    required: false,
    category: "regular",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim"
    },
    order: 3
  });
  questions.push({
    id: "available_sundays",
    type: "checkbox",
    question: "Em quais domingos deste m\xEAs voc\xEA estar\xE1 dispon\xEDvel para servir no seu hor\xE1rio principal?",
    options: ["Nenhum domingo", ...sundayDates],
    required: false,
    category: "regular",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim"
    },
    order: 4
  });
  questions.push({
    id: "other_times_available",
    type: "yes_no_with_options",
    question: "Este m\xEAs voc\xEA poder\xE1 servir em outros hor\xE1rios al\xE9m do seu hor\xE1rio principal?",
    options: ["Sim", "N\xE3o"],
    required: false,
    category: "regular",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim",
      conditionalOptions: ["8h", "10h", "19h"]
    },
    order: 5
  });
  questions.push({
    id: "daily_mass_availability",
    type: "yes_no_with_options",
    question: "Este m\xEAs voc\xEA pode servir nas missas di\xE1rias das 6h30?",
    options: ["Sim", "N\xE3o", "Apenas em alguns dias"],
    required: false,
    category: "daily",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim",
      conditionalOptions: ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta"]
    },
    order: 6
  });
  const firstThursday = getFirstThursdayOfMonth(month, year);
  const healingMassTime = firstThursday.isHoliday ? "19h" : "19h30";
  questions.push({
    id: "healing_liberation_mass",
    type: "multiple_choice",
    question: `Voc\xEA pode servir na Missa por Cura e Liberta\xE7\xE3o - primeira quinta-feira (${firstThursday.day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}) \xE0s ${healingMassTime}?`,
    options: ["Sim", "N\xE3o"],
    required: false,
    category: "special_event",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim",
      eventDate: `${firstThursday.day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`,
      eventName: "Missa por Cura e Liberta\xE7\xE3o"
    },
    order: 7.1
  });
  const firstFriday = getFirstFridayOfMonth(month, year);
  questions.push({
    id: "sacred_heart_mass",
    type: "multiple_choice",
    question: `Voc\xEA pode servir na Missa votiva ao Sagrado Cora\xE7\xE3o de Jesus - primeira sexta-feira (${firstFriday.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}) \xE0s 6h30?`,
    options: ["Sim", "N\xE3o"],
    required: false,
    category: "special_event",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim",
      eventDate: `${firstFriday.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`,
      eventName: "Missa votiva ao Sagrado Cora\xE7\xE3o de Jesus"
    },
    order: 7.2
  });
  const firstSaturday = getFirstSaturdayOfMonth(month, year);
  questions.push({
    id: "immaculate_heart_mass",
    type: "multiple_choice",
    question: `Voc\xEA pode servir na Missa votiva ao Imaculado Cora\xE7\xE3o de Maria - primeiro s\xE1bado (${firstSaturday.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}) \xE0s 6h30?`,
    options: ["Sim", "N\xE3o"],
    required: false,
    category: "special_event",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim",
      eventDate: `${firstSaturday.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`,
      eventName: "Missa votiva ao Imaculado Cora\xE7\xE3o de Maria"
    },
    order: 7.3
  });
  questions.push({
    id: "adoration_monday",
    type: "multiple_choice",
    question: "Voc\xEA pode conduzir o ter\xE7o da nossa adora\xE7\xE3o - Segunda-feira 22h? (faremos revezamento de ministros que conduzem o ter\xE7o)",
    options: ["Sim, posso conduzir", "N\xE3o posso conduzir"],
    required: false,
    category: "special_event",
    metadata: {
      dependsOn: "monthly_availability",
      showIf: "Sim"
    },
    order: 8
  });
  if (month === 9) {
    questions.push({
      id: "special_event_sao_miguel",
      type: "multiple_choice",
      question: `Voc\xEA pode servir Segunda-feira dia 29/09/${year} \xE0s 19h30 - Missa em honra \xE0 S\xE3o Miguel Arcanjo?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "29/09",
        eventName: "S\xE3o Miguel Arcanjo",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9
    });
  }
  if (month === 10) {
    const octoberDates = getOctoberSpecialDates(year);
    const feastDate = new Date(year, 9, octoberDates.feast);
    const dayOfWeek = feastDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const eveningMassTime = isWeekend ? "19h" : "19h30";
    questions.push({
      id: "saint_judas_feast_7h",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s 7h?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: "Festa de S\xE3o Judas Tadeu - 7h",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.1
    });
    questions.push({
      id: "saint_judas_feast_10h",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s 10h?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: "Festa de S\xE3o Judas Tadeu - 10h",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.2
    });
    questions.push({
      id: "saint_judas_feast_12h",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s 12h?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: "Festa de S\xE3o Judas Tadeu - 12h",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.3
    });
    questions.push({
      id: "saint_judas_feast_15h",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s 15h?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: "Festa de S\xE3o Judas Tadeu - 15h",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.4
    });
    questions.push({
      id: "saint_judas_feast_17h",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s 17h?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: "Festa de S\xE3o Judas Tadeu - 17h",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.5
    });
    questions.push({
      id: "saint_judas_feast_evening",
      type: "multiple_choice",
      question: `Voc\xEA pode servir na Festa de S\xE3o Judas Tadeu - 28/10/${year} \xE0s ${eveningMassTime}?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "28/10",
        eventName: `Festa de S\xE3o Judas Tadeu - ${eveningMassTime}`,
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.6
    });
    questions.push({
      id: "saint_judas_novena",
      type: "checkbox",
      question: `Voc\xEA pode servir na Novena de S\xE3o Judas Tadeu (19 a 27/10/${year})? Marque os dias dispon\xEDveis:`,
      options: [
        "Nenhum dia",
        "Segunda 20/10 \xE0s 19h30",
        "Ter\xE7a 21/10 \xE0s 19h30",
        "Quarta 22/10 \xE0s 19h30",
        "Quinta 24/10 \xE0s 19h30",
        "Sexta 25/10 \xE0s 19h30",
        "S\xE1bado 26/10 \xE0s 19h",
        "Segunda 27/10 \xE0s 19h30"
      ],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: "19-27/10",
        eventName: "Novena de S\xE3o Judas Tadeu",
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 9.7
    });
  }
  const specialEvents = getSpecialEvents(month, year);
  const filteredEvents = specialEvents.filter((event) => {
    if (month === 10 && event.name.includes("S\xE3o Judas Tadeu")) {
      return false;
    }
    if (month === 10 && event.name === "Nossa Senhora Aparecida") {
      const date2 = new Date(year, 9, 12);
      const isOurLadySunday = getDay(date2) === 0;
      if (isOurLadySunday) {
        return false;
      }
    }
    return true;
  });
  filteredEvents.forEach((event, index2) => {
    questions.push({
      id: `special_event_${index2 + 1}`,
      type: "multiple_choice",
      question: `Voc\xEA pode servir em ${event.name} (${event.date})?`,
      options: ["Sim", "N\xE3o"],
      required: false,
      category: "special_event",
      metadata: {
        eventDate: event.date,
        eventName: event.name,
        dependsOn: "monthly_availability",
        showIf: "Sim"
      },
      order: 10 + index2
    });
  });
  questions.push({
    id: "observations",
    type: "text",
    question: "Observa\xE7\xF5es adicionais (opcional)",
    required: false,
    category: "regular",
    order: 99
  });
  logger.debug(`Total de perguntas geradas: ${questions.length}`);
  logger.debug(`Primeira pergunta: "${questions[0]?.question}"`);
  return questions;
}
function getSpecialEvents(month, year) {
  const events = [];
  const fixedHolidays = {
    "1-1": "Ano Novo",
    "4-21": "Tiradentes",
    "5-1": "Dia do Trabalho",
    "9-7": "Independ\xEAncia do Brasil",
    "10-12": "Nossa Senhora Aparecida",
    "11-2": "Finados",
    "11-15": "Proclama\xE7\xE3o da Rep\xFAblica",
    "11-20": "Consci\xEAncia Negra",
    "12-25": "Natal"
  };
  Object.entries(fixedHolidays).forEach(([dateKey, name]) => {
    const [holidayMonth, holidayDay] = dateKey.split("-").map(Number);
    if (holidayMonth === month) {
      events.push({
        name,
        date: `${holidayDay.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`
      });
    }
  });
  if (month === 10) {
    events.push({
      name: "Festa de S\xE3o Judas Tadeu",
      date: "28/10"
    });
  }
  if (month === 5) {
    events.push({
      name: "Coroa\xE7\xE3o de Nossa Senhora",
      date: "\xFAltimo domingo"
    });
  }
  if (month === 6) {
    events.push({
      name: "Festa de S\xE3o Jo\xE3o",
      date: "24/06"
    });
  }
  return events;
}

// server/routes/questionnaireAdmin.ts
var router3 = Router3();
function getMonthName(month) {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Mar\xE7o",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];
  return months[month - 1];
}
router3.get("/current", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (template) {
      return res.json(template);
    }
    const questions = generateQuestionnaireQuestions(month, year);
    const userId = req.user?.id || "0";
    const [savedTemplate] = await db.insert(questionnaires).values({
      month,
      year,
      title: `Question\xE1rio ${getMonthName(month)} ${year}`,
      description: `Question\xE1rio de disponibilidade para ${getMonthName(month)} de ${year}`,
      questions,
      status: "active",
      createdById: userId,
      targetUserIds: [],
      notifiedUserIds: []
    }).returning();
    res.json(savedTemplate);
  } catch (error) {
    console.error("Error getting current questionnaire:", error);
    res.status(500).json({ error: "Failed to get current questionnaire" });
  }
});
router3.get("/templates/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (template) {
      const parsedQuestions = template.questions;
      const questionsWithEditFlag = parsedQuestions.map((q) => ({
        ...q,
        editable: true,
        // Permitir edição de todas as perguntas
        modified: q.modified || false
        // Flag para indicar se foi modificada
      }));
      res.json({
        ...template,
        questions: questionsWithEditFlag
      });
    } else {
      res.status(404).json({ error: "Template not found" });
    }
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});
router3.post("/templates/generate", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const schema = z2.object({
      month: z2.number().min(1).max(12),
      year: z2.number().min(2024).max(2050)
    });
    const { month, year } = schema.parse(req.body);
    const userId = req.user?.id || req.session?.userId;
    const [existingTemplate] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
      // Ignorar templates deletados
    ));
    if (existingTemplate) {
      const questionsWithEditFlag2 = existingTemplate.questions.map((q) => ({
        ...q,
        editable: true,
        modified: q.modified || false
      }));
      return res.json({
        ...existingTemplate,
        questions: questionsWithEditFlag2
      });
    }
    const questions = generateQuestionnaireQuestions(month, year);
    console.log(`[GENERATE] Gerando ${questions.length} perguntas para ${month}/${year}`);
    console.log(`[GENERATE] Primeira pergunta: ${questions[0]?.question}`);
    const questionsWithEditFlag = questions.map((q) => ({
      ...q,
      editable: true,
      modified: false
    }));
    const [savedTemplate] = await db.insert(questionnaires).values({
      month,
      year,
      title: `Question\xE1rio ${getMonthName(month)} ${year}`,
      description: `Question\xE1rio de disponibilidade para ${getMonthName(month)} de ${year}`,
      questions: questionsWithEditFlag,
      // JSONB não precisa stringify
      status: "draft",
      createdById: userId,
      targetUserIds: [],
      // JSONB não precisa stringify
      notifiedUserIds: []
      // JSONB não precisa stringify
    }).returning();
    console.log(`Template criado e salvo na base de dados: ${month}/${year}`);
    res.json({
      ...savedTemplate,
      questions: questionsWithEditFlag,
      generated: true
    });
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ error: "Failed to generate template" });
  }
});
router3.post("/templates", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const schema = z2.object({
      id: z2.string().optional(),
      month: z2.number().min(1).max(12),
      year: z2.number().min(2024).max(2050),
      questions: z2.array(z2.object({
        id: z2.string(),
        type: z2.enum(["multiple_choice", "checkbox", "text", "time_selection", "yes_no_with_options"]),
        question: z2.string(),
        options: z2.array(z2.string()).optional(),
        required: z2.boolean(),
        category: z2.enum(["regular", "daily", "special_event", "custom"]),
        editable: z2.boolean().optional(),
        modified: z2.boolean().optional(),
        metadata: z2.object({
          eventDate: z2.string().optional(),
          eventName: z2.string().optional(),
          availableTimes: z2.array(z2.string()).optional(),
          conditionalOptions: z2.array(z2.string()).optional()
        }).optional()
      }))
    });
    const data = schema.parse(req.body);
    const userId = req.user?.id || req.session?.userId;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, data.month),
      eq5(questionnaires.year, data.year)
    ));
    if (existingTemplate) {
      const [updated] = await db.update(questionnaires).set({
        questions: data.questions,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(questionnaires.id, existingTemplate.id)).returning();
      res.json({
        ...updated,
        questions: updated.questions
      });
    } else {
      const [created] = await db.insert(questionnaires).values({
        month: data.month,
        year: data.year,
        questions: data.questions,
        title: `Question\xE1rio ${getMonthName(data.month)} ${data.year}`,
        description: `Question\xE1rio de disponibilidade para ${getMonthName(data.month)} de ${data.year}`,
        status: "draft",
        createdById: userId,
        targetUserIds: [],
        notifiedUserIds: []
      }).returning();
      res.json({
        ...created,
        questions: created.questions
      });
    }
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ error: "Failed to save template" });
  }
});
router3.post("/templates/:year/:month/questions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const schema = z2.object({
      type: z2.enum(["multiple_choice", "checkbox", "text", "time_selection"]),
      question: z2.string(),
      options: z2.array(z2.string()).optional(),
      required: z2.boolean(),
      category: z2.enum(["custom"]).default("custom")
    });
    const questionData = schema.parse(req.body);
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const newQuestion = {
      id: `custom_${Date.now()}`,
      ...questionData,
      editable: true,
      modified: false
    };
    const updatedQuestions = [...template.questions, newQuestion];
    const [updated] = await db.update(questionnaires).set({
      questions: updatedQuestions,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ error: "Failed to add question" });
  }
});
router3.put("/templates/:year/:month/questions/:questionId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const questionId = req.params.questionId;
    const schema = z2.object({
      question: z2.string(),
      options: z2.array(z2.string()).optional(),
      required: z2.boolean()
    });
    const updates = schema.parse(req.body);
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const updatedQuestions = template.questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          ...updates,
          modified: true
          // Marcar como modificada quando editada
        };
      }
      return q;
    });
    const [updated] = await db.update(questionnaires).set({
      questions: updatedQuestions,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
});
router3.delete("/templates/:year/:month/questions/:questionId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const questionId = req.params.questionId;
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const updatedQuestions = template.questions.filter((q) => {
      if (q.id === questionId) {
        return q.category !== "custom";
      }
      return true;
    });
    const [updated] = await db.update(questionnaires).set({
      questions: updatedQuestions,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});
router3.post("/templates/:year/:month/send", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    console.log("[SEND] In\xEDcio do endpoint");
    console.log("[SEND] Params:", { year, month });
    console.log("[SEND] Headers:", req.headers);
    console.log("[SEND] Body raw:", req.body);
    console.log("[SEND] Body type:", typeof req.body);
    const resend = req.body?.resend === true || req.body?.resend === "true";
    console.log("[SEND] Resend extra\xEDdo:", resend);
    console.log("[SEND] Tipo do resend:", typeof resend);
    if (!db) {
      console.log("[SEND] Erro: Database indispon\xEDvel");
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!template) {
      console.log("[SEND] Erro: Template n\xE3o encontrado");
      return res.status(404).json({ error: "Template not found" });
    }
    console.log("[SEND] Template encontrado:", {
      id: template.id,
      status: template.status,
      updatedAt: template.updatedAt
    });
    if (template.status === "sent" && !resend) {
      console.log("[SEND] Erro: J\xE1 enviado e resend=false");
      return res.status(400).json({
        error: "Question\xE1rio j\xE1 foi enviado aos ministros. Use a op\xE7\xE3o de reenviar.",
        canResend: true,
        debug: { status: template.status, resend, bodyReceived: req.body }
      });
    }
    if (template.status === "closed") {
      console.log("[SEND] Erro: Question\xE1rio fechado");
      return res.status(400).json({
        error: "Question\xE1rio est\xE1 encerrado. Reabra-o antes de reenviar."
      });
    }
    console.log("[SEND] Verifica\xE7\xF5es passaram, processando envio/reenvio...");
    const updateData = {
      status: "sent",
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [updated] = await db.update(questionnaires).set(updateData).where(eq5(questionnaires.id, template.id)).returning();
    const isResend = template.status === "sent" && resend;
    const allMinisters = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(and3(
      eq5(users.role, "ministro"),
      eq5(users.status, "active")
    ));
    const monthNames2 = [
      "Janeiro",
      "Fevereiro",
      "Mar\xE7o",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    for (const minister of allMinisters) {
      if (minister.id) {
        await db.insert(notifications).values({
          userId: minister.id,
          title: isResend ? "Question\xE1rio Atualizado" : "Novo Question\xE1rio Dispon\xEDvel",
          message: isResend ? `O question\xE1rio de ${monthNames2[month - 1]} de ${year} foi atualizado. Por favor, revise e atualize suas respostas se necess\xE1rio.` : `O question\xE1rio de disponibilidade para ${monthNames2[month - 1]} de ${year} est\xE1 dispon\xEDvel. Por favor, responda o quanto antes.`,
          type: "announcement"
        });
      }
    }
    const message = isResend ? "Question\xE1rio reenviado com sucesso! As mudan\xE7as est\xE3o dispon\xEDveis para todos os ministros." : "Question\xE1rio enviado com sucesso para todos os ministros!";
    res.json({
      message,
      isResend,
      template: {
        ...updated,
        questions: updated.questions
      }
    });
  } catch (error) {
    console.error("Error sending questionnaire:", error);
    res.status(500).json({ error: "Failed to send questionnaire" });
  }
});
router3.post("/templates/:id/send", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq5(questionnaires.id, templateId));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, templateId)).returning();
    res.json({
      message: "Question\xE1rio enviado com sucesso!",
      template: {
        ...updated,
        questions: updated.questions
      }
    });
  } catch (error) {
    console.error("Error sending questionnaire:", error);
    res.status(500).json({ error: "Failed to send questionnaire" });
  }
});
router3.patch("/templates/:id/close", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq5(questionnaires.id, templateId));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (template.status !== "sent") {
      return res.status(400).json({ error: "Question\xE1rio precisa estar enviado para ser encerrado" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "closed",
      // closedAt: new Date(), // Campo não existe no schema
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error closing questionnaire:", error);
    res.status(500).json({ error: "Failed to close questionnaire" });
  }
});
router3.patch("/templates/:id/reopen", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq5(questionnaires.id, templateId));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (template.status !== "closed") {
      return res.status(400).json({ error: "Question\xE1rio precisa estar encerrado para ser reaberto" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      // closedAt: null, // Campo não existe no schema
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error reopening questionnaire:", error);
    res.status(500).json({ error: "Failed to reopen questionnaire" });
  }
});
router3.delete("/templates/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const responses = await db.select({
      id: questionnaireResponses.id,
      questionnaireId: questionnaireResponses.questionnaireId,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt
    }).from(questionnaireResponses).where(eq5(questionnaireResponses.questionnaireId, template.id));
    if (responses.length > 0) {
      const [updated] = await db.update(questionnaires).set({
        status: "deleted",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(questionnaires.id, template.id)).returning();
      res.json({
        message: "Template marcado como deletado. Respostas existentes foram preservadas.",
        template: {
          ...updated,
          questions: updated.questions
        }
      });
    } else {
      await db.delete(questionnaires).where(eq5(questionnaires.id, template.id));
      res.json({
        message: "Template deletado com sucesso!",
        deleted: true
      });
    }
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});
router3.get("/responses-status/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year)
    )).limit(1);
    if (!template) {
      return res.json({
        month,
        year,
        templateExists: false,
        totalMinisters: 0,
        respondedCount: 0,
        pendingCount: 0,
        responses: []
      });
    }
    const allMinisters = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(and3(
      or3(
        eq5(users.role, "ministro"),
        eq5(users.role, "coordenador")
      ),
      eq5(users.status, "active")
    ));
    const responses = await db.select({
      userId: questionnaireResponses.userId,
      submittedAt: questionnaireResponses.submittedAt,
      responses: questionnaireResponses.responses
    }).from(questionnaireResponses).where(eq5(questionnaireResponses.questionnaireId, template.id));
    const ministersWithResponses = allMinisters.map((minister) => {
      const response = responses.find((r) => r.userId === minister.id);
      if (response) {
        let availability = "N\xE3o informado";
        try {
          const parsedResponses = JSON.parse(response.responses);
          const monthlyAvailability = parsedResponses.find((r) => r.questionId === "monthly_availability");
          if (monthlyAvailability) {
            if (typeof monthlyAvailability.answer === "object" && monthlyAvailability.answer.answer) {
              availability = monthlyAvailability.answer.answer === "Sim" ? "Dispon\xEDvel" : "Indispon\xEDvel";
            } else if (typeof monthlyAvailability.answer === "string") {
              availability = monthlyAvailability.answer === "Sim" ? "Dispon\xEDvel" : "Indispon\xEDvel";
            }
          } else {
            const oldAvailability = parsedResponses.find((r) => r.questionId === "availability");
            if (oldAvailability) {
              availability = oldAvailability.answer === "yes" || oldAvailability.answer === "Dispon\xEDvel" ? "Dispon\xEDvel" : oldAvailability.answer === "no" || oldAvailability.answer === "Indispon\xEDvel" ? "Indispon\xEDvel" : oldAvailability.answer;
            }
          }
        } catch (e) {
          console.error("Error parsing responses:", e);
        }
        return {
          id: minister.id,
          name: minister.name,
          email: minister.email,
          phone: minister.phone,
          responded: true,
          respondedAt: response.submittedAt,
          availability
        };
      }
      return {
        id: minister.id,
        name: minister.name,
        email: minister.email,
        phone: minister.phone,
        responded: false,
        respondedAt: null,
        availability: null
      };
    });
    ministersWithResponses.sort((a, b) => {
      if (a.responded !== b.responded) {
        return a.responded ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
    const respondedCount = ministersWithResponses.filter((m) => m.responded).length;
    const totalMinisters = allMinisters.length;
    res.json({
      month,
      year,
      templateExists: true,
      templateId: template.id,
      templateStatus: template.status,
      totalMinisters,
      respondedCount,
      pendingCount: totalMinisters - respondedCount,
      responseRate: totalMinisters > 0 ? (respondedCount / totalMinisters * 100).toFixed(1) : 0,
      responses: ministersWithResponses
    });
  } catch (error) {
    console.error("Error fetching response status:", error);
    res.status(500).json({ error: "Failed to fetch response status" });
  }
});
router3.get("/responses/:templateId/:ministerId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { templateId, ministerId } = req.params;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq5(questionnaires.id, templateId)).limit(1);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const [response] = await db.select().from(questionnaireResponses).where(and3(
      eq5(questionnaireResponses.questionnaireId, templateId),
      eq5(questionnaireResponses.userId, ministerId)
    )).limit(1);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }
    const [user] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(eq5(users.id, ministerId)).limit(1);
    res.json({
      user,
      response: {
        submittedAt: response.submittedAt,
        responses: JSON.parse(response.responses),
        availabilities: response.availableSundays || []
      },
      template: {
        questions: template.questions,
        month: template.month,
        year: template.year
      }
    });
  } catch (error) {
    console.error("Error fetching detailed response:", error);
    res.status(500).json({ error: "Failed to fetch response details" });
  }
});
router3.get("/responses-summary/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and3(
      eq5(questionnaires.month, month),
      eq5(questionnaires.year, year)
    )).limit(1);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const responses = await db.select().from(questionnaireResponses).where(eq5(questionnaireResponses.questionnaireId, template.id));
    const summary = {};
    const questions = template.questions;
    responses.forEach((response) => {
      const parsedResponses = JSON.parse(response.responses);
      parsedResponses.forEach((resp) => {
        if (!summary[resp.questionId]) {
          summary[resp.questionId] = {};
        }
        if (typeof resp.answer === "object" && resp.answer.answer) {
          const mainAnswer = resp.answer.answer;
          if (!summary[resp.questionId][mainAnswer]) {
            summary[resp.questionId][mainAnswer] = 0;
          }
          summary[resp.questionId][mainAnswer]++;
          if (resp.answer.sub) {
            const subKey = `${resp.questionId}_sub`;
            if (!summary[subKey]) {
              summary[subKey] = {};
            }
            if (!summary[subKey][resp.answer.sub]) {
              summary[subKey][resp.answer.sub] = 0;
            }
            summary[subKey][resp.answer.sub]++;
          }
        } else if (Array.isArray(resp.answer)) {
          resp.answer.forEach((option) => {
            if (!summary[resp.questionId][option]) {
              summary[resp.questionId][option] = 0;
            }
            summary[resp.questionId][option]++;
          });
        } else if (typeof resp.answer === "string") {
          if (!summary[resp.questionId][resp.answer]) {
            summary[resp.questionId][resp.answer] = 0;
          }
          summary[resp.questionId][resp.answer]++;
        }
      });
    });
    res.json({
      totalResponses: responses.length,
      questions,
      summary
    });
  } catch (error) {
    console.error("Error fetching response summary:", error);
    res.status(500).json({ error: "Failed to fetch response summary" });
  }
});
var questionnaireAdmin_default = router3;

// server/routes/questionnaires.ts
await init_db();
init_schema();
import { Router as Router4 } from "express";
import { z as z3 } from "zod";
import { eq as eq6, and as and4, or as or4 } from "drizzle-orm";
var router4 = Router4();
var monthNames = [
  "Janeiro",
  "Fevereiro",
  "Mar\xE7o",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
function analyzeResponses(responses) {
  const availabilities = {
    sundays: [],
    massTimes: [],
    dailyMass: false,
    dailyMassDays: [],
    alternativeTimes: [],
    specialEvents: []
  };
  responses.forEach((r) => {
    const { questionId, answer } = r;
    if (questionId === "sundays_available" && Array.isArray(answer)) {
      availabilities.sundays = answer;
    }
    if (questionId === "primary_mass_time" && typeof answer === "string") {
      availabilities.massTimes.push(answer);
    }
    if (questionId === "daily_mass_availability") {
      if (answer === "Sim") {
        availabilities.dailyMass = true;
        availabilities.dailyMassDays = ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta"];
      } else if (answer === "Apenas em alguns dias") {
        availabilities.dailyMass = true;
      }
    }
    if (questionId === "daily_mass_days" && Array.isArray(answer)) {
      availabilities.dailyMassDays = answer;
    }
    if (questionId === "other_times_available") {
      if (typeof answer === "object" && answer.answer === "Sim" && answer.selectedOptions) {
        availabilities.alternativeTimes = answer.selectedOptions;
      }
    }
    if (questionId.includes("special_event_") && answer === "Sim") {
      availabilities.specialEvents.push(questionId.replace("special_event_", ""));
    }
  });
  return { availabilities };
}
router4.post("/templates", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const schema = z3.object({
      month: z3.number().min(1).max(12),
      year: z3.number().min(2024).max(2050)
    });
    const { month, year } = schema.parse(req.body);
    const userId = req.user?.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
    )).limit(1);
    const questions = generateQuestionnaireQuestions(month, year);
    if (existingTemplate) {
      const [updated] = await db.update(questionnaires).set({
        questions,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(questionnaires.id, existingTemplate.id)).returning();
      res.json({
        ...updated,
        questions: updated.questions
      });
    } else {
      const [created] = await db.insert(questionnaires).values({
        title: `Question\xE1rio ${monthNames[month - 1]} ${year}`,
        month,
        year,
        questions,
        createdById: userId
      }).returning();
      const allMinisters = await db.select({
        id: users.id,
        name: users.name,
        email: users.email
      }).from(users).where(and4(
        eq6(users.role, "ministro"),
        eq6(users.status, "active")
      ));
      for (const minister of allMinisters) {
        if (minister.id) {
          await db.insert(notifications).values({
            userId: minister.id,
            title: "Novo Question\xE1rio Dispon\xEDvel",
            message: `O question\xE1rio de disponibilidade para ${monthNames[month - 1]} de ${year} est\xE1 dispon\xEDvel. Por favor, responda o quanto antes.`,
            type: "announcement"
          });
        }
      }
      res.json({
        ...created,
        questions: created.questions
      });
    }
  } catch (error) {
    console.error("Error creating/updating questionnaire template:", error);
    res.status(500).json({ error: "Failed to create/update questionnaire template" });
  }
});
router4.get("/templates/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      const questions = generateQuestionnaireQuestions(month, year);
      return res.json({
        month,
        year,
        questions,
        generated: true
      });
    }
    try {
      const [template] = await db.select().from(questionnaires).where(and4(
        eq6(questionnaires.month, month),
        eq6(questionnaires.year, year)
      )).limit(1);
      if (!template) {
        return res.status(404).json({ error: "Question\xE1rio n\xE3o encontrado para este per\xEDodo" });
      }
      if (template.status === "draft" || template.status === "deleted") {
        return res.status(403).json({
          error: "Question\xE1rio ainda n\xE3o est\xE1 dispon\xEDvel para respostas",
          status: template.status
        });
      }
      res.json({
        ...template,
        questions: template.questions
      });
    } catch (dbError) {
      const questions = generateQuestionnaireQuestions(month, year);
      res.json({
        month,
        year,
        questions,
        generated: true
      });
    }
  } catch (error) {
    console.error("Error fetching questionnaire template:", error);
    res.status(500).json({ error: "Failed to fetch questionnaire template" });
  }
});
router4.post("/responses", authenticateToken, async (req, res) => {
  try {
    console.log("[RESPONSES] In\xEDcio do endpoint de submiss\xE3o");
    console.log("[RESPONSES] UserId:", req.user?.id);
    console.log("[RESPONSES] Body recebido:", JSON.stringify(req.body, null, 2));
    const schema = z3.object({
      questionnaireId: z3.string().optional(),
      month: z3.number().min(1).max(12),
      year: z3.number().min(2024).max(2050),
      responses: z3.array(z3.object({
        questionId: z3.string(),
        answer: z3.union([
          z3.string(),
          z3.array(z3.string()),
          z3.boolean(),
          z3.object({
            answer: z3.string(),
            selectedOptions: z3.array(z3.string()).optional()
          })
        ]),
        metadata: z3.any().optional()
      })),
      sharedWithFamilyIds: z3.array(z3.string()).optional()
    });
    let data;
    try {
      data = schema.parse(req.body);
      console.log("[RESPONSES] Dados validados com sucesso");
    } catch (validationError) {
      console.error("[RESPONSES] Erro de valida\xE7\xE3o:", validationError);
      return res.status(400).json({
        error: "Dados inv\xE1lidos",
        details: validationError instanceof Error ? validationError.message : "Erro de valida\xE7\xE3o"
      });
    }
    const userId = req.user?.id;
    if (!db) {
      return res.status(503).json({ error: "Database service temporarily unavailable. Please try again later." });
    }
    if (data.questionnaireId) {
      const [template] = await db.select().from(questionnaires).where(eq6(questionnaires.id, data.questionnaireId)).limit(1);
      if (template && template.status === "closed") {
        return res.status(400).json({ error: "Este question\xE1rio foi encerrado e n\xE3o aceita mais respostas" });
      }
    }
    console.log("[RESPONSES] Buscando usu\xE1rio para userId:", userId);
    let minister = null;
    try {
      const [foundUser] = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
      console.log("[RESPONSES] Usu\xE1rio encontrado:", foundUser);
      if (foundUser && foundUser.role === "ministro") {
        minister = {
          id: foundUser.id,
          userId: foundUser.id,
          name: foundUser.name,
          active: foundUser.status === "active"
        };
      } else if (foundUser && ["coordenador", "gestor"].includes(foundUser.role)) {
        console.log("[RESPONSES] Usu\xE1rio \xE9 coordenador/reitor, pode responder");
        minister = {
          id: foundUser.id,
          userId: foundUser.id,
          name: foundUser.name,
          active: true
        };
        console.log("[RESPONSES] Ministro tempor\xE1rio criado:", minister);
      } else {
        console.log("[RESPONSES] Usu\xE1rio n\xE3o pode responder question\xE1rio");
        return res.status(404).json({ error: "User cannot submit questionnaire responses" });
      }
    } catch (dbError) {
      console.error("[RESPONSES] Erro ao buscar ministro:", dbError);
      throw dbError;
    }
    let templateId = data.questionnaireId;
    console.log("[RESPONSES] Template ID inicial:", templateId);
    if (!templateId) {
      console.log("[RESPONSES] Buscando template para m\xEAs:", data.month, "ano:", data.year);
      const [template] = await db.select().from(questionnaires).where(and4(
        eq6(questionnaires.month, data.month),
        eq6(questionnaires.year, data.year)
      )).limit(1);
      if (template) {
        templateId = template.id;
        console.log("[RESPONSES] Template existente encontrado:", templateId);
      } else {
        console.log("[RESPONSES] Template n\xE3o encontrado, criando novo...");
        const questions = generateQuestionnaireQuestions(data.month, data.year);
        const [newTemplate] = await db.insert(questionnaires).values({
          title: `Question\xE1rio ${monthNames[data.month - 1]} ${data.year}`,
          month: data.month,
          year: data.year,
          questions,
          createdById: userId
        }).returning();
        templateId = newTemplate.id;
        console.log("[RESPONSES] Novo template criado:", templateId);
      }
    }
    console.log("[RESPONSES] Template ID final:", templateId);
    console.log("[RESPONSES] Verificando resposta existente para userId:", minister.id, "templateId:", templateId);
    const [existingResponse] = await db.select().from(questionnaireResponses).where(and4(
      eq6(questionnaireResponses.userId, minister.id),
      eq6(questionnaireResponses.questionnaireId, templateId)
    )).limit(1);
    console.log("[RESPONSES] Resposta existente encontrada?", existingResponse ? "Sim" : "N\xE3o");
    console.log("[RESPONSES] Analisando respostas");
    const { availabilities } = analyzeResponses(data.responses);
    console.log("[RESPONSES] Disponibilidades extra\xEDdas:", availabilities);
    let result;
    if (existingResponse) {
      console.log("[RESPONSES] Atualizando resposta existente:", existingResponse.id);
      try {
        const [updated] = await db.update(questionnaireResponses).set({
          questionnaireId: templateId,
          responses: JSON.stringify(data.responses),
          submittedAt: /* @__PURE__ */ new Date(),
          sharedWithFamilyIds: data.sharedWithFamilyIds || []
        }).where(eq6(questionnaireResponses.id, existingResponse.id)).returning();
        console.log("[RESPONSES] Resposta atualizada com sucesso");
        const responseData = {
          ...updated,
          responses: typeof updated.responses === "string" ? JSON.parse(updated.responses) : updated.responses
        };
        result = { responseData, isUpdate: true };
      } catch (updateError) {
        console.error("[RESPONSES] Erro ao atualizar resposta:", updateError);
        throw updateError;
      }
    } else {
      console.log("[RESPONSES] Criando nova resposta");
      try {
        const [created] = await db.insert(questionnaireResponses).values({
          userId: minister.id,
          questionnaireId: templateId,
          responses: JSON.stringify(data.responses),
          sharedWithFamilyIds: data.sharedWithFamilyIds || [],
          isSharedResponse: false
        }).returning();
        console.log("[RESPONSES] Resposta criada com sucesso");
        const responseData = {
          ...created,
          responses: typeof created.responses === "string" ? JSON.parse(created.responses) : created.responses
        };
        result = { responseData, isUpdate: false };
      } catch (insertError) {
        console.error("[RESPONSES] Erro ao criar resposta:", insertError);
        throw insertError;
      }
    }
    if (data.sharedWithFamilyIds && data.sharedWithFamilyIds.length > 0) {
      console.log("[RESPONSES] Processando compartilhamento familiar:", data.sharedWithFamilyIds);
      for (const familyUserId of data.sharedWithFamilyIds) {
        try {
          const [familyMember] = await db.select({ id: users.id, name: users.name }).from(users).where(and4(
            eq6(users.id, familyUserId),
            eq6(users.status, "active")
          )).limit(1);
          if (!familyMember) {
            console.warn(`[RESPONSES] Usu\xE1rio n\xE3o encontrado ou inativo: ${familyUserId}`);
            continue;
          }
          const [familyRelation] = await db.select().from(familyRelationships).where(or4(
            and4(
              eq6(familyRelationships.userId, minister.id),
              eq6(familyRelationships.relatedUserId, familyUserId)
            ),
            and4(
              eq6(familyRelationships.userId, familyUserId),
              eq6(familyRelationships.relatedUserId, minister.id)
            )
          )).limit(1);
          if (!familyRelation) {
            console.warn(`[RESPONSES] Sem rela\xE7\xE3o familiar v\xE1lida entre ${minister.id} e ${familyUserId}`);
            continue;
          }
          const [existingFamilyResponse] = await db.select().from(questionnaireResponses).where(and4(
            eq6(questionnaireResponses.userId, familyUserId),
            eq6(questionnaireResponses.questionnaireId, templateId)
          )).limit(1);
          if (!existingFamilyResponse) {
            await db.insert(questionnaireResponses).values({
              userId: familyUserId,
              questionnaireId: templateId,
              responses: JSON.stringify(data.responses),
              isSharedResponse: true,
              sharedFromUserId: minister.id,
              sharedWithFamilyIds: []
            });
            console.log(`[RESPONSES] Resposta compartilhada criada para ${familyMember.name} (${familyUserId})`);
          } else if (existingFamilyResponse.isSharedResponse && existingFamilyResponse.sharedFromUserId === minister.id) {
            await db.update(questionnaireResponses).set({
              responses: JSON.stringify(data.responses),
              submittedAt: /* @__PURE__ */ new Date()
            }).where(eq6(questionnaireResponses.id, existingFamilyResponse.id));
            console.log(`[RESPONSES] Resposta compartilhada atualizada para ${familyMember.name} (${familyUserId})`);
          } else {
            console.log(`[RESPONSES] ${familyMember.name} j\xE1 possui resposta pr\xF3pria, n\xE3o sobrescrevendo`);
          }
        } catch (shareError) {
          console.error(`[RESPONSES] Erro ao compartilhar com familiar ${familyUserId}:`, shareError);
        }
      }
    }
    res.json(result.responseData);
  } catch (error) {
    console.error("[RESPONSES] Erro geral no endpoint:", error);
    if (error instanceof Error) {
      console.error("[RESPONSES] Stack trace:", error.stack);
      console.error("[RESPONSES] Error message:", error.message);
      let errorMessage = "Erro ao enviar resposta do question\xE1rio";
      if (error.message.includes("database") || error.message.includes("db")) {
        errorMessage = "Erro de conex\xE3o com o banco de dados. Tente novamente.";
      } else if (error.message.includes("validation")) {
        errorMessage = "Dados inv\xE1lidos no question\xE1rio.";
      } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
        errorMessage = "Sem permiss\xE3o para enviar o question\xE1rio.";
      } else if (error.message) {
        errorMessage = `Erro: ${error.message.substring(0, 100)}`;
      }
      res.status(500).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Erro desconhecido ao processar question\xE1rio" });
    }
  }
});
router4.get("/responses/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = req.user?.id;
    if (!db) {
      return res.json(null);
    }
    try {
      const [user] = await db.select().from(users).where(eq6(users.id, userId)).limit(1);
      const minister = user && (user.role === "ministro" || user.role === "coordenador" || user.role === "gestor") ? {
        id: user.id,
        userId: user.id
      } : null;
      if (!minister) {
        return res.json(null);
      }
      console.log("[GET /responses] Buscando respostas para:", {
        userId: minister.id,
        month,
        year
      });
      const allUserResponses = await db.select({
        id: questionnaireResponses.id,
        questionnaireId: questionnaireResponses.questionnaireId,
        month: questionnaires.month,
        year: questionnaires.year
      }).from(questionnaireResponses).leftJoin(questionnaires, eq6(questionnaireResponses.questionnaireId, questionnaires.id)).where(eq6(questionnaireResponses.userId, minister.id));
      console.log("[GET /responses] Todas as respostas do usu\xE1rio:", allUserResponses);
      const [response] = await db.select({
        id: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        responses: questionnaireResponses.responses,
        submittedAt: questionnaireResponses.submittedAt,
        questionnaireTemplate: {
          id: questionnaires.id,
          month: questionnaires.month,
          year: questionnaires.year,
          questions: questionnaires.questions,
          status: questionnaires.status
        }
      }).from(questionnaireResponses).leftJoin(questionnaires, eq6(questionnaireResponses.questionnaireId, questionnaires.id)).where(and4(
        eq6(questionnaireResponses.userId, minister.id),
        eq6(questionnaires.month, month),
        eq6(questionnaires.year, year)
      )).limit(1);
      console.log("[GET /responses] Resposta encontrada:", response ? "Sim" : "N\xE3o");
      if (response) {
        console.log("[GET /responses] Tipo do campo responses:", typeof response.responses);
        const parsedResponses = typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses;
        const result = {
          id: response.id,
          userId: response.userId,
          responses: parsedResponses,
          submittedAt: response.submittedAt,
          questionnaireTemplate: response.questionnaireTemplate ? {
            ...response.questionnaireTemplate,
            questions: response.questionnaireTemplate.questions
          } : null
        };
        console.log("[GET /responses] Retornando resposta com ID:", result.id);
        res.json(result);
      } else {
        console.log("[GET /responses] Nenhuma resposta encontrada para o per\xEDodo");
        res.json(null);
      }
    } catch (dbError) {
      console.error("[GET /responses] Erro na query do banco:", dbError);
      res.json(null);
    }
  } catch (error) {
    console.error("Error fetching questionnaire response:", error);
    res.status(500).json({ error: "Failed to fetch questionnaire response" });
  }
});
router4.get("/admin/responses-status/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user.role;
    if (userRole !== "gestor" && userRole !== "coordenador") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (!db) {
      return res.json([]);
    }
    const [questionnaire] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
    )).limit(1);
    if (!questionnaire) {
      return res.json({
        month,
        year,
        templateExists: false,
        totalMinisters: 0,
        respondedCount: 0,
        pendingCount: 0,
        responseRate: "0%",
        responses: []
      });
    }
    const ministers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(and4(
      eq6(users.role, "ministro"),
      eq6(users.status, "active")
    ));
    const responses = await db.select({
      userId: questionnaireResponses.userId,
      submittedAt: questionnaireResponses.submittedAt,
      responses: questionnaireResponses.responses
    }).from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, questionnaire.id));
    const responseMap = new Map(responses.map((r) => [r.userId, r]));
    const ministerResponses = ministers.map((minister) => ({
      id: minister.id,
      name: minister.name,
      email: minister.email,
      phone: minister.phone || "",
      responded: responseMap.has(minister.id),
      respondedAt: responseMap.get(minister.id)?.submittedAt ? new Date(responseMap.get(minister.id).submittedAt).toISOString() : null,
      availability: null
      // Pode ser expandido para incluir disponibilidade
    }));
    const respondedCount = responses.length;
    const totalMinisters = ministers.length;
    const responseRate = totalMinisters > 0 ? `${Math.round(respondedCount / totalMinisters * 100)}%` : "0%";
    res.json({
      month,
      year,
      templateExists: true,
      templateId: questionnaire.id,
      templateStatus: questionnaire.status,
      totalMinisters,
      respondedCount,
      pendingCount: totalMinisters - respondedCount,
      responseRate,
      responses: ministerResponses
    });
  } catch (error) {
    console.error("Error fetching response status:", error);
    res.status(500).json({ error: "Failed to fetch response status" });
  }
});
router4.get("/admin/responses-summary/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user.role;
    if (userRole !== "gestor" && userRole !== "coordenador") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (!db) {
      return res.json({ totalResponses: 0, questions: [], summary: {} });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
    )).limit(1);
    if (!questionnaire) {
      return res.json({ totalResponses: 0, questions: [], summary: {} });
    }
    const responses = await db.select().from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, questionnaire.id));
    const summary = {};
    const questions = questionnaire.questions;
    responses.forEach((response) => {
      const userResponses = typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses;
      if (Array.isArray(userResponses)) {
        userResponses.forEach((r) => {
          if (!summary[r.questionId]) {
            summary[r.questionId] = {};
          }
          const answer = typeof r.answer === "string" ? r.answer : JSON.stringify(r.answer);
          summary[r.questionId][answer] = (summary[r.questionId][answer] || 0) + 1;
        });
      }
    });
    res.json({
      totalResponses: responses.length,
      questions,
      summary
    });
  } catch (error) {
    console.error("Error fetching response summary:", error);
    res.status(500).json({ error: "Failed to fetch response summary" });
  }
});
router4.get("/admin/responses/:templateId/:userId", authenticateToken, async (req, res) => {
  try {
    const { templateId, userId } = req.params;
    const userRole = req.user.role;
    if (userRole !== "gestor" && userRole !== "coordenador") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId)).limit(1);
    if (!questionnaire) {
      return res.status(404).json({ error: "Questionnaire not found" });
    }
    const [user] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(eq6(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const [response] = await db.select().from(questionnaireResponses).where(and4(
      eq6(questionnaireResponses.questionnaireId, templateId),
      eq6(questionnaireResponses.userId, userId)
    )).limit(1);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }
    const userResponses = typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses;
    res.json({
      user,
      response: {
        submittedAt: response.submittedAt?.toISOString(),
        responses: userResponses,
        availabilities: []
        // Pode ser expandido no futuro
      },
      template: {
        questions: questionnaire.questions,
        month: questionnaire.month,
        year: questionnaire.year
      }
    });
  } catch (error) {
    console.error("Error fetching detailed response:", error);
    res.status(500).json({ error: "Failed to fetch detailed response" });
  }
});
router4.get("/responses/all/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userRole = req.user.role;
    if (userRole !== "gestor" && userRole !== "coordenador") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (!db) {
      return res.json([]);
    }
    const responses = await db.select({
      id: questionnaireResponses.id,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email
      },
      questionnaireTemplate: {
        id: questionnaires.id,
        questions: questionnaires.questions,
        month: questionnaires.month,
        year: questionnaires.year
      }
    }).from(questionnaireResponses).leftJoin(users, eq6(questionnaireResponses.userId, users.id)).leftJoin(questionnaires, eq6(questionnaireResponses.questionnaireId, questionnaires.id)).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
    ));
    res.json(responses);
  } catch (error) {
    console.error("Error fetching all questionnaire responses:", error);
    res.status(500).json({ error: "Failed to fetch questionnaire responses" });
  }
});
router4.patch("/admin/templates/:id/close", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const userId = req.user?.id;
    const templateId = req.params.id;
    if (!req.user || !["gestor", "coordenador"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId)).limit(1);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (existingTemplate.status === "closed") {
      return res.status(400).json({ error: "Question\xE1rio j\xE1 est\xE1 encerrado" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "closed",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error("Error closing questionnaire:", error);
    res.status(500).json({ error: "Failed to close questionnaire" });
  }
});
router4.patch("/admin/templates/:id/reopen", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const userId = req.user?.id;
    const templateId = req.params.id;
    if (!req.user || !["gestor", "coordenador"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId)).limit(1);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (existingTemplate.status !== "closed") {
      return res.status(400).json({ error: "Question\xE1rio n\xE3o est\xE1 encerrado" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error("Error reopening questionnaire:", error);
    res.status(500).json({ error: "Failed to reopen questionnaire" });
  }
});
router4.get("/family-sharing/:questionnaireId", authenticateToken, async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const userId = req.user.id;
    const { storage: storage2 } = await init_storage().then(() => storage_exports);
    const familyMembers = await storage2.getFamilyMembersForQuestionnaire(userId, questionnaireId);
    res.json(familyMembers);
  } catch (error) {
    console.error("Error fetching family members for questionnaire:", error);
    res.status(500).json({ error: "Failed to fetch family members" });
  }
});
var questionnaires_default = router4;

// server/routes/scheduleGeneration.ts
import { Router as Router5 } from "express";
import { z as z4 } from "zod";
init_scheduleGenerator();
init_logger();
await init_db();
init_schema();
import { and as and6, gte as gte3, lte as lte3, eq as eq8, sql as sql4, ne as ne3 } from "drizzle-orm";
import { ptBR as ptBR2 } from "date-fns/locale";
import { format as format3 } from "date-fns";
var router5 = Router5();
var generateScheduleSchema = z4.object({
  year: z4.number().min(2024).max(2030),
  month: z4.number().min(1).max(12),
  saveToDatabase: z4.boolean().default(false),
  replaceExisting: z4.boolean().default(false)
});
var saveSchedulesSchema = z4.object({
  schedules: z4.array(z4.object({
    date: z4.string(),
    time: z4.string(),
    type: z4.string().default("missa"),
    location: z4.string().optional(),
    ministerId: z4.string(),
    notes: z4.string().optional()
  })),
  replaceExisting: z4.boolean().default(false)
});
router5.post("/generate", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { year, month, saveToDatabase, replaceExisting } = generateScheduleSchema.parse(req.body);
    logger.info(`Iniciando gera\xE7\xE3o autom\xE1tica de escalas para ${month}/${year} por usu\xE1rio ${req.user?.id}`);
    if (!replaceExisting && db) {
      const existingSchedules = await db.select({ id: schedules.id }).from(schedules).where(sql4`EXTRACT(MONTH FROM date) = ${month} AND EXTRACT(YEAR FROM date) = ${year}`).limit(1);
      if (existingSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `J\xE1 existem escalas cadastradas para ${month}/${year}. Use replaceExisting: true para substituir.`,
          hasExistingSchedules: true
        });
      }
    }
    console.log("[ROUTE] Calling generateAutomaticSchedule with:", { year, month, saveToDatabase, isPreview: false });
    const generatedSchedules = await generateAutomaticSchedule(year, month, false);
    console.log("[ROUTE] Generated schedules count:", generatedSchedules.length);
    let savedCount = 0;
    if (saveToDatabase && db) {
      savedCount = await saveGeneratedSchedules(generatedSchedules, replaceExisting);
    }
    const response = {
      success: true,
      message: `Escalas geradas com sucesso para ${month}/${year}`,
      data: {
        month,
        year,
        totalSchedules: generatedSchedules.length,
        savedToDatabase: saveToDatabase,
        savedCount,
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        schedulesByWeek: groupSchedulesByWeek(generatedSchedules),
        qualityMetrics: calculateQualityMetrics(generatedSchedules),
        schedules: formatSchedulesForAPI(generatedSchedules)
      }
    };
    logger.info(`Gera\xE7\xE3o conclu\xEDda: ${generatedSchedules.length} escalas, confidence m\xE9dia: ${response.data.averageConfidence}`);
    res.json(response);
  } catch (error) {
    logger.error("Erro ao gerar escalas autom\xE1ticas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
router5.post("/save-generated", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { schedules: schedulesToSave, replaceExisting } = saveSchedulesSchema.parse(req.body);
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o de banco de dados indispon\xEDvel"
      });
    }
    if (replaceExisting && schedulesToSave.length > 0) {
      const sortedSchedules = [...schedulesToSave].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = sortedSchedules[0].date;
      const lastDate = sortedSchedules[sortedSchedules.length - 1].date;
      await db.delete(schedules).where(
        and6(
          gte3(schedules.date, firstDate),
          lte3(schedules.date, lastDate)
        )
      );
      logger.info(`Removidas escalas existentes entre ${firstDate} e ${lastDate}`);
    }
    const schedulesToInsert = schedulesToSave.map((s) => ({
      date: s.date,
      time: s.time,
      type: s.type,
      location: s.location || null,
      ministerId: s.ministerId,
      notes: s.notes || null,
      status: "scheduled"
    }));
    const saved = await db.insert(schedules).values(schedulesToInsert).returning();
    logger.info(`Salvas ${saved.length} escalas no banco de dados`);
    res.json({
      success: true,
      message: `${saved.length} escalas salvas com sucesso`,
      data: {
        savedCount: saved.length,
        schedules: saved
      }
    });
  } catch (error) {
    logger.error("Erro ao salvar escalas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao salvar escalas"
    });
  }
});
router5.get("/preview/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Ano e m\xEAs devem ser v\xE1lidos"
      });
    }
    console.log("[PREVIEW ROUTE] Calling generateAutomaticSchedule with:", { year, month, isPreview: true });
    const generatedSchedules = await generateAutomaticSchedule(year, month, true);
    console.log("[PREVIEW ROUTE] Generated schedules count:", generatedSchedules.length);
    res.json({
      success: true,
      data: {
        month,
        year,
        totalSchedules: generatedSchedules.length,
        averageConfidence: calculateAverageConfidence(generatedSchedules),
        schedules: formatSchedulesForAPI(generatedSchedules),
        qualityMetrics: calculateQualityMetrics(generatedSchedules)
      }
    });
  } catch (error) {
    logger.error("Erro ao gerar preview:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar preview"
    });
  }
});
router5.get("/debug/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { ScheduleGenerator: ScheduleGenerator2 } = await Promise.resolve().then(() => (init_scheduleGenerator(), scheduleGenerator_exports));
    const generator = new ScheduleGenerator2();
    const ministersData = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
      totalServices: users.totalServices
    }).from(users).where(
      and6(
        eq8(users.status, "active"),
        ne3(users.role, "gestor")
      )
    );
    const massTimesData = await db.select().from(massTimesConfig).where(eq8(massTimesConfig.isActive, true));
    const responsesData = await db.select().from(questionnaireResponses).innerJoin(questionnaires, eq8(questionnaireResponses.questionnaireId, questionnaires.id)).where(
      and6(
        eq8(questionnaires.month, month),
        eq8(questionnaires.year, year)
      )
    );
    res.json({
      success: true,
      debug: {
        environment: process.env.NODE_ENV,
        database: !!db,
        month,
        year,
        ministers: {
          total: ministersData.length,
          list: ministersData
        },
        massTimes: {
          total: massTimesData.length,
          list: massTimesData
        },
        questionnaireResponses: {
          total: responsesData.length,
          hasData: responsesData.length > 0
        }
      }
    });
  } catch (error) {
    logger.error("Erro no debug:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});
router5.get("/quality-metrics/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o de banco de dados indispon\xEDvel"
      });
    }
    const existingSchedules = await db.select().from(schedules).leftJoin(users, eq8(schedules.ministerId, users.id)).where(
      and6(
        sql4`EXTRACT(MONTH FROM ${schedules.date}) = ${month}`,
        sql4`EXTRACT(YEAR FROM ${schedules.date}) = ${year}`
      )
    );
    const metrics = {
      totalSchedules: existingSchedules.length,
      uniqueMinisters: new Set(existingSchedules.map((s) => s.schedules.ministerId)).size,
      averageSchedulesPerMinister: existingSchedules.length / new Set(existingSchedules.map((s) => s.schedules.ministerId)).size,
      distributionBalance: calculateDistributionBalance(existingSchedules),
      coverageByDay: calculateCoverageByDay(existingSchedules),
      substitutionRate: 0
      // TODO: calcular com base em substituições
    };
    res.json({
      success: true,
      data: {
        month,
        year,
        metrics,
        schedules: existingSchedules.length
      }
    });
  } catch (error) {
    logger.error("Erro ao calcular m\xE9tricas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao calcular m\xE9tricas"
    });
  }
});
async function saveGeneratedSchedules(generatedSchedules, replaceExisting) {
  if (!db) return 0;
  let savedCount = 0;
  for (const schedule of generatedSchedules) {
    if (!schedule.massTime.date) continue;
    if (replaceExisting) {
      await db.delete(schedules).where(
        and6(
          eq8(schedules.date, schedule.massTime.date),
          eq8(schedules.time, schedule.massTime.time)
        )
      );
    }
    for (const minister of schedule.ministers) {
      await db.insert(schedules).values({
        date: schedule.massTime.date,
        time: schedule.massTime.time,
        type: "missa",
        location: null,
        ministerId: minister.id,
        status: "scheduled",
        notes: `Gerado automaticamente - Confian\xE7a: ${Math.round(schedule.confidence * 100)}%`
      });
      savedCount++;
    }
  }
  return savedCount;
}
function calculateAverageConfidence(schedules3) {
  if (schedules3.length === 0) return 0;
  const sum = schedules3.reduce((acc, s) => acc + s.confidence, 0);
  return Math.round(sum / schedules3.length * 100) / 100;
}
function groupSchedulesByWeek(schedules3) {
  const weeks = {};
  schedules3.forEach((schedule) => {
    if (schedule.massTime.date) {
      const date2 = new Date(schedule.massTime.date);
      const weekKey = `Semana ${Math.ceil(date2.getDate() / 7)}`;
      if (!weeks[weekKey]) weeks[weekKey] = [];
      weeks[weekKey].push(schedule);
    }
  });
  return weeks;
}
function calculateQualityMetrics(schedules3) {
  const totalMinisters = new Set(schedules3.flatMap((s) => s.ministers.map((m) => m.id))).size;
  const totalSchedules = schedules3.reduce((acc, s) => acc + s.ministers.length, 0);
  return {
    uniqueMinistersUsed: totalMinisters,
    averageMinistersPerMass: Math.round(totalSchedules / schedules3.length * 10) / 10,
    highConfidenceSchedules: schedules3.filter((s) => s.confidence >= 0.8).length,
    lowConfidenceSchedules: schedules3.filter((s) => s.confidence < 0.5).length,
    balanceScore: calculateBalanceScore(schedules3)
  };
}
function calculateBalanceScore(schedules3) {
  const ministerCounts = {};
  schedules3.forEach((schedule) => {
    schedule.ministers.forEach((minister) => {
      ministerCounts[minister.id] = (ministerCounts[minister.id] || 0) + 1;
    });
  });
  const counts = Object.values(ministerCounts);
  const avg2 = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg2, 2), 0) / counts.length;
  return Math.max(0, 1 - Math.sqrt(variance) / avg2);
}
function formatSchedulesForAPI(schedules3) {
  return schedules3.map((schedule) => ({
    date: schedule.massTime.date,
    time: schedule.massTime.time,
    dayOfWeek: schedule.massTime.dayOfWeek,
    ministers: schedule.ministers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      totalServices: m.totalServices,
      availabilityScore: Math.round(m.availabilityScore * 100) / 100
    })),
    backupMinisters: schedule.backupMinisters.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role
    })),
    confidence: Math.round(schedule.confidence * 100) / 100,
    qualityScore: calculateScheduleQuality(schedule)
  }));
}
function calculateScheduleQuality(schedule) {
  if (schedule.confidence >= 0.8) return "Excelente";
  if (schedule.confidence >= 0.6) return "Bom";
  if (schedule.confidence >= 0.4) return "Regular";
  return "Baixa";
}
function calculateDistributionBalance(schedules3) {
  const ministerCounts = {};
  schedules3.forEach((s) => {
    const ministerId = s.schedules.ministerId;
    if (ministerId) {
      ministerCounts[ministerId] = (ministerCounts[ministerId] || 0) + 1;
    }
  });
  const counts = Object.values(ministerCounts);
  if (counts.length === 0) return 0;
  const avg2 = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg2, 2), 0) / counts.length;
  return Math.max(0, 1 - Math.sqrt(variance) / avg2);
}
function calculateCoverageByDay(schedules3) {
  const coverage = {};
  schedules3.forEach((s) => {
    const date2 = s.schedules.date;
    if (date2) {
      const day = format3(new Date(date2), "EEEE", { locale: ptBR2 });
      coverage[day] = (coverage[day] || 0) + 1;
    }
  });
  return coverage;
}
var scheduleGeneration_default = router5;

// server/routes/upload.ts
await init_db();
init_schema();
import { Router as Router6 } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq as eq9 } from "drizzle-orm";
var router6 = Router6();
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem s\xE3o permitidos (JPEG, PNG, WebP, HEIC)"));
    }
  }
});
var handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error("Multer error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "A imagem deve ter no m\xE1ximo 5MB" });
    }
    if (err.message && err.message.includes("Apenas arquivos de imagem s\xE3o permitidos")) {
      return res.status(400).json({ error: "Apenas arquivos de imagem s\xE3o permitidos (JPEG, PNG, WebP, HEIC)" });
    }
    if (err.message && err.message.includes("Only image files are allowed")) {
      return res.status(400).json({ error: "Apenas arquivos de imagem s\xE3o permitidos (JPEG, PNG, WebP, HEIC)" });
    }
    return res.status(400).json({ error: "Erro no upload do arquivo. Verifique o formato e tamanho da imagem." });
  }
  next();
};
router6.post("/profile-photo", authenticateToken, upload.single("photo"), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }
    const userId = req.user.id;
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: "Arquivo corrompido ou vazio" });
    }
    const processedImageBuffer = await sharp(req.file.buffer).rotate().resize(300, 300, {
      fit: "cover",
      position: "center"
    }).jpeg({ quality: 80 }).toBuffer();
    if (!processedImageBuffer || processedImageBuffer.length === 0) {
      return res.status(400).json({ error: "Erro ao processar imagem. Tente uma imagem diferente." });
    }
    const imageData = processedImageBuffer.toString("base64");
    const contentType = "image/jpeg";
    const timestamp2 = Date.now();
    const photoUrl = `/api/users/${userId}/photo?v=${timestamp2}`;
    if (!db) {
      return res.status(500).json({ error: "Erro interno: banco de dados n\xE3o dispon\xEDvel" });
    }
    await db.update(users).set({
      photoUrl,
      imageData,
      imageContentType: contentType
    }).where(eq9(users.id, userId));
    res.json({
      success: true,
      photoUrl,
      message: "Foto de perfil atualizada com sucesso!"
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    if (error instanceof Error) {
      if (error.message.includes("Input file is missing")) {
        return res.status(400).json({ error: "Arquivo de imagem inv\xE1lido ou corrompido" });
      }
      if (error.message.includes("Input file contains unsupported image format")) {
        return res.status(400).json({ error: "Formato de imagem n\xE3o suportado. Use JPEG, PNG, WebP ou HEIC." });
      }
      if (error.message.includes("Apenas arquivos de imagem s\xE3o permitidos")) {
        return res.status(400).json({ error: "Apenas arquivos de imagem s\xE3o permitidos (JPEG, PNG, WebP, HEIC)" });
      }
    }
    res.status(500).json({ error: "Erro interno ao processar a foto. Tente novamente." });
  }
});
router6.delete("/profile-photo", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!db) {
      return res.status(500).json({ error: "Erro interno: banco de dados n\xE3o dispon\xEDvel" });
    }
    await db.update(users).set({
      photoUrl: null,
      imageData: null,
      imageContentType: null
    }).where(eq9(users.id, userId));
    res.json({
      success: true,
      message: "Foto de perfil removida com sucesso!"
    });
  } catch (error) {
    console.error("Error removing profile photo:", error);
    res.status(500).json({ error: "Erro interno ao remover a foto. Tente novamente." });
  }
});
var upload_default = router6;

// server/routes/notifications.ts
import { Router as Router7 } from "express";
import { z as z5 } from "zod";
await init_db();
await init_storage();
init_schema();
import { eq as eq10, and as and7 } from "drizzle-orm";
var router7 = Router7();
var createNotificationSchema = z5.object({
  title: z5.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  message: z5.string().min(1, "Mensagem \xE9 obrigat\xF3ria"),
  type: z5.enum(["info", "warning", "success", "error"]).default("info"),
  recipientIds: z5.array(z5.string()).optional(),
  // IDs específicos ou vazio para todos
  recipientRole: z5.enum(["ministro", "coordenador", "gestor", "all"]).optional()
});
function mapNotificationType(frontendType) {
  switch (frontendType) {
    case "info":
      return "announcement";
    case "warning":
      return "reminder";
    case "success":
      return "announcement";
    case "error":
      return "reminder";
    default:
      return "announcement";
  }
}
router7.get("/", authenticateToken, async (req, res) => {
  try {
    const notifications2 = await storage.getUserNotifications(req.user.id);
    res.json(notifications2);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notifica\xE7\xF5es" });
  }
});
router7.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const allNotifications = await storage.getUserNotifications(req.user.id);
    const count5 = allNotifications.filter((n) => !n.read).length;
    res.json({ count: count5 });
  } catch (error) {
    res.status(500).json({ error: "Erro ao contar notifica\xE7\xF5es" });
  }
});
router7.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await db.select().from(notifications).where(and7(
      eq10(notifications.id, id),
      eq10(notifications.userId, req.user.id)
    )).limit(1);
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notifica\xE7\xE3o n\xE3o encontrada" });
    }
    await storage.markNotificationAsRead(id);
    res.json({ message: "Notifica\xE7\xE3o marcada como lida" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisi\xE7\xE3o" });
  }
});
router7.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    const userNotifications = await storage.getUserNotifications(req.user.id);
    const unreadNotifications = userNotifications.filter((n) => !n.read);
    await Promise.all(unreadNotifications.map((n) => storage.markNotificationAsRead(n.id)));
    res.json({ message: "Todas as notifica\xE7\xF5es foram marcadas como lidas" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisi\xE7\xE3o" });
  }
});
router7.post("/mass-invite", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { massId, date: date2, time: time2, location, message, urgencyLevel } = req.body;
    console.log("Recebido pedido de notifica\xE7\xE3o para missa:", { massId, date: date2, time: time2, location, urgencyLevel });
    const title = urgencyLevel === "critical" ? "\u{1F534} URGENTE: Convoca\xE7\xE3o para Missa" : urgencyLevel === "high" ? "\u26A0\uFE0F IMPORTANTE: Ministros Necess\xE1rios" : "\u{1F4E2} Convite para Servir na Missa";
    const ministers = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(
      eq10(users.status, "active")
    );
    console.log(`Encontrados ${ministers.length} usu\xE1rios ativos`);
    const mappedType = urgencyLevel === "critical" || urgencyLevel === "high" ? "reminder" : "announcement";
    const notificationPromises = ministers.map(
      (minister) => storage.createNotification({
        userId: minister.id,
        title,
        message: message || `Precisamos de ministros para a missa de ${date2} \xE0s ${time2} na ${location}. Por favor, confirme sua disponibilidade.`,
        type: mappedType,
        read: false
      })
    );
    const results = await Promise.all(notificationPromises);
    console.log(`Criadas ${results.length} notifica\xE7\xF5es`);
    console.log(`[Activity Log] mass_invite_sent: Enviou convite para missa de ${date2} \xE0s ${time2}`, {
      userId: req.user.id,
      massId,
      date: date2,
      time: time2,
      location,
      recipientCount: ministers.length,
      urgencyLevel
    });
    res.json({
      message: "Convite enviado com sucesso",
      recipientCount: ministers.length
    });
  } catch (error) {
    console.error("Erro ao enviar convite para missa:", error);
    res.status(500).json({ error: "Erro ao enviar convite", details: error instanceof Error ? error.message : "Unknown error" });
  }
});
router7.post("/", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const data = createNotificationSchema.parse(req.body);
    let recipientUserIds = [];
    if (data.recipientIds && data.recipientIds.length > 0) {
      recipientUserIds = data.recipientIds;
    } else if (data.recipientRole) {
      let recipients;
      if (data.recipientRole === "all") {
        recipients = await db.select({ id: users.id }).from(users).where(eq10(users.status, "active"));
      } else {
        recipients = await db.select({ id: users.id }).from(users).where(and7(
          eq10(users.role, data.recipientRole),
          eq10(users.status, "active")
        ));
      }
      recipientUserIds = recipients.map((r) => r.id);
    } else {
      const recipients = await db.select({ id: users.id }).from(users).where(and7(
        eq10(users.role, "ministro"),
        eq10(users.status, "active")
      ));
      recipientUserIds = recipients.map((r) => r.id);
    }
    if (!recipientUserIds.includes(req.user.id)) {
      recipientUserIds.push(req.user.id);
    }
    const mappedType = mapNotificationType(data.type);
    const notificationPromises = recipientUserIds.map(
      (userId) => storage.createNotification({
        userId,
        title: data.title,
        message: data.message,
        type: mappedType,
        read: false
      })
    );
    await Promise.all(notificationPromises);
    console.log(`[Activity Log] notification_sent: Enviou comunicado: ${data.title}`, {
      userId: req.user.id,
      recipientCount: recipientUserIds.length,
      type: data.type
    });
    res.json({
      message: "Notifica\xE7\xE3o enviada com sucesso",
      recipientCount: recipientUserIds.length
    });
  } catch (error) {
    console.error("Erro ao criar notifica\xE7\xE3o:", error);
    if (error instanceof z5.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      res.status(500).json({ error: "Erro ao criar notifica\xE7\xE3o" });
    }
  }
});
router7.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(req.user.id);
    const isCoordinator = user && ["coordenador", "gestor"].includes(user.role);
    let notification;
    if (isCoordinator) {
      notification = await db.select().from(notifications).where(eq10(notifications.id, id)).limit(1);
    } else {
      notification = await db.select().from(notifications).where(and7(
        eq10(notifications.id, id),
        eq10(notifications.userId, req.user.id)
      )).limit(1);
    }
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notifica\xE7\xE3o n\xE3o encontrada" });
    }
    await db.delete(notifications).where(eq10(notifications.id, id));
    console.log(`[Activity Log] notification_deleted: Excluiu notifica\xE7\xE3o: ${notification[0].title}`, {
      userId: req.user.id,
      notificationId: id,
      isAdminDelete: isCoordinator && notification[0].userId !== req.user.id
    });
    res.json({ message: "Notifica\xE7\xE3o exclu\xEDda com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir notifica\xE7\xE3o" });
  }
});
var notifications_default = router7;

// server/routes/reports.ts
await init_db();
init_schema();
import { Router as Router8 } from "express";
import { eq as eq11, sql as sql5, and as and8, gte as gte4, lte as lte4, desc as desc5, asc, count as count3, avg } from "drizzle-orm";

// server/utils/activityLogger.ts
await init_db();
init_schema();
async function logActivity(userId, action, details, req) {
  try {
    const activityData = {
      userId,
      action,
      details: details ? JSON.stringify(details) : null,
      createdAt: /* @__PURE__ */ new Date()
    };
    if (req) {
      activityData.ipAddress = req.ip || req.socket.remoteAddress;
      activityData.userAgent = req.get("user-agent");
      activityData.sessionId = req.session?.id;
    }
    await db.insert(activityLogs).values(activityData);
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
function createActivityLogger(req) {
  return (action, details) => {
    const userId = req.user?.id;
    if (userId) {
      return logActivity(userId, action, details, req);
    }
  };
}

// server/routes/reports.ts
var router8 = Router8();
router8.get("/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "availability" });
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const availabilityData = await db.select({
      userId: questionnaireResponses.userId,
      userName: users.name,
      totalResponses: count3(questionnaireResponses.id),
      availableDays: sql5`
          COALESCE(
            SUM(
              jsonb_array_length(
                COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
              )
            ), 0
          )
        `.as("available_days")
    }).from(questionnaireResponses).leftJoin(users, eq11(users.id, questionnaireResponses.userId)).where(
      and8(
        startDate ? gte4(questionnaireResponses.submittedAt, new Date(startDate)) : sql5`true`,
        endDate ? lte4(questionnaireResponses.submittedAt, new Date(endDate)) : sql5`true`
      )
    ).groupBy(questionnaireResponses.userId, users.name).orderBy(desc5(sql5`available_days`)).limit(Number(limit));
    res.json({
      topAvailable: availabilityData,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching availability metrics:", error);
    res.status(500).json({ error: "Failed to fetch availability metrics" });
  }
});
router8.get("/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "substitutions" });
  try {
    const { startDate, endDate } = req.query;
    const mostRequests = await db.select({
      userId: substitutionRequests.requesterId,
      userName: users.name,
      totalRequests: count3(substitutionRequests.id),
      approvedRequests: sql5`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as("approved_requests"),
      pendingRequests: sql5`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'pending' THEN 1 END)
        `.as("pending_requests")
    }).from(substitutionRequests).leftJoin(users, eq11(users.id, substitutionRequests.requesterId)).where(
      and8(
        startDate ? gte4(substitutionRequests.createdAt, new Date(startDate)) : sql5`true`,
        endDate ? lte4(substitutionRequests.createdAt, new Date(endDate)) : sql5`true`
      )
    ).groupBy(substitutionRequests.requesterId, users.name).orderBy(desc5(count3(substitutionRequests.id))).limit(10);
    const reliableServers = await db.select({
      userId: schedules.ministerId,
      userName: users.name,
      totalAssignments: count3(schedules.id),
      substitutionRequests: sql5`
          (SELECT COUNT(*) FROM ${substitutionRequests}
           WHERE ${substitutionRequests.requesterId} = ${schedules.ministerId}
           ${startDate ? sql5`AND ${substitutionRequests.createdAt} >= ${new Date(startDate)}` : sql5``}
           ${endDate ? sql5`AND ${substitutionRequests.createdAt} <= ${new Date(endDate)}` : sql5``})
        `.as("substitution_requests")
    }).from(schedules).leftJoin(users, eq11(users.id, schedules.ministerId)).where(
      and8(
        schedules.status ? eq11(schedules.status, "published") : sql5`true`,
        startDate ? gte4(schedules.createdAt, new Date(startDate)) : sql5`true`,
        endDate ? lte4(schedules.createdAt, new Date(endDate)) : sql5`true`
      )
    ).groupBy(schedules.ministerId, users.name).having(sql5`COUNT(${schedules.id}) > 0`).orderBy(asc(sql5`substitution_requests`), desc5(count3(schedules.id))).limit(10);
    res.json({
      mostRequests,
      reliableServers,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching substitution metrics:", error);
    res.status(500).json({ error: "Failed to fetch substitution metrics" });
  }
});
router8.get("/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "engagement" });
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const mostActive = await db.select({
      userId: activityLogs.userId,
      userName: users.name,
      totalActions: count3(activityLogs.id),
      lastActivity: sql5`MAX(${activityLogs.createdAt})`.as("last_activity"),
      uniqueDays: sql5`
          COUNT(DISTINCT DATE(${activityLogs.createdAt}))
        `.as("unique_days")
    }).from(activityLogs).leftJoin(users, eq11(users.id, activityLogs.userId)).where(
      and8(
        startDate ? gte4(activityLogs.createdAt, new Date(startDate)) : sql5`true`,
        endDate ? lte4(activityLogs.createdAt, new Date(endDate)) : sql5`true`
      )
    ).groupBy(activityLogs.userId, users.name).orderBy(desc5(count3(activityLogs.id))).limit(Number(limit));
    const responseRates = await db.select({
      totalMinisters: count3(users.id),
      respondedMinisters: sql5`
          COUNT(DISTINCT ${questionnaireResponses.userId})
        `.as("responded_ministers"),
      responseRate: sql5`
          ROUND(
            COUNT(DISTINCT ${questionnaireResponses.userId})::numeric /
            NULLIF(COUNT(DISTINCT ${users.id}), 0) * 100,
            2
          )
        `.as("response_rate")
    }).from(users).leftJoin(
      questionnaireResponses,
      and8(
        eq11(users.id, questionnaireResponses.userId),
        startDate ? gte4(questionnaireResponses.submittedAt, new Date(startDate)) : sql5`true`,
        endDate ? lte4(questionnaireResponses.submittedAt, new Date(endDate)) : sql5`true`
      )
    ).where(eq11(users.status, "active"));
    res.json({
      mostActive,
      responseRates: responseRates[0],
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    res.status(500).json({ error: "Failed to fetch engagement metrics" });
  }
});
router8.get("/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "formation" });
  try {
    const { limit = 10 } = req.query;
    const topPerformers = await db.select({
      userId: formationProgress.userId,
      userName: users.name,
      completedModules: sql5`
          COUNT(CASE WHEN ${formationProgress.status} = 'completed' THEN 1 END)
        `.as("completed_modules"),
      inProgressModules: sql5`
          COUNT(CASE WHEN ${formationProgress.status} = 'in_progress' THEN 1 END)
        `.as("in_progress_modules"),
      avgProgress: avg(formationProgress.progressPercentage)
    }).from(formationProgress).leftJoin(users, eq11(users.id, formationProgress.userId)).groupBy(formationProgress.userId, users.name).orderBy(desc5(sql5`completed_modules`)).limit(Number(limit));
    const formationStats = await db.select({
      totalModules: sql5`
          (SELECT COUNT(*) FROM formation_modules)
        `.as("total_modules"),
      totalEnrolled: count3(sql5`DISTINCT ${formationProgress.userId}`),
      avgCompletionRate: avg(formationProgress.progressPercentage)
    }).from(formationProgress);
    res.json({
      topPerformers,
      stats: formationStats[0]
    });
  } catch (error) {
    console.error("Error fetching formation metrics:", error);
    res.status(500).json({ error: "Failed to fetch formation metrics" });
  }
});
router8.get("/families", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "families" });
  try {
    const activeFamilies = await db.select({
      familyId: families.id,
      familyName: families.name,
      totalMembers: count3(users.id),
      activeMembers: sql5`
          COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)
        `.as("active_members"),
      totalServices: sql5`
          COALESCE(SUM(${users.totalServices}), 0)
        `.as("total_services")
    }).from(families).leftJoin(users, eq11(users.familyId, families.id)).groupBy(families.id, families.name).having(sql5`COUNT(${users.id}) > 1`).orderBy(desc5(sql5`active_members`), desc5(sql5`total_services`)).limit(10);
    res.json({
      activeFamilies
    });
  } catch (error) {
    console.error("Error fetching family metrics:", error);
    res.status(500).json({ error: "Failed to fetch family metrics" });
  }
});
router8.get("/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity2 = createActivityLogger(req);
  await logActivity2("view_reports", { type: "summary" });
  try {
    const now = /* @__PURE__ */ new Date();
    const startOfMonth2 = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth2 = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const activeMinistersCount = await db.select({ count: count3() }).from(users).where(eq11(users.status, "active"));
    const monthSubstitutions = await db.select({
      total: count3(),
      approved: sql5`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as("approved")
    }).from(substitutionRequests).where(
      and8(
        gte4(substitutionRequests.createdAt, startOfMonth2),
        lte4(substitutionRequests.createdAt, endOfMonth2)
      )
    );
    const formationThisMonth = await db.select({ count: count3() }).from(formationProgress).where(
      and8(
        eq11(formationProgress.status, "completed"),
        formationProgress.completedAt ? gte4(formationProgress.completedAt, startOfMonth2) : sql5`false`,
        formationProgress.completedAt ? lte4(formationProgress.completedAt, endOfMonth2) : sql5`false`
      )
    );
    const avgAvailability = await db.select({
      avgDays: sql5`
          AVG(
            jsonb_array_length(
              COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
            )
          )
        `.as("avg_days")
    }).from(questionnaireResponses).where(
      and8(
        gte4(questionnaireResponses.submittedAt, startOfMonth2),
        lte4(questionnaireResponses.submittedAt, endOfMonth2)
      )
    );
    res.json({
      activeMinisters: activeMinistersCount[0]?.count || 0,
      monthSubstitutions: {
        total: monthSubstitutions[0]?.total || 0,
        approved: monthSubstitutions[0]?.approved || 0
      },
      formationCompleted: formationThisMonth[0]?.count || 0,
      avgAvailabilityDays: Math.round(avgAvailability[0]?.avgDays || 0),
      period: {
        month: now.toLocaleString("pt-BR", { month: "long" }),
        year: now.getFullYear()
      }
    });
  } catch (error) {
    console.error("Error fetching summary metrics:", error);
    res.status(500).json({ error: "Failed to fetch summary metrics" });
  }
});
var reports_default = router8;

// server/routes.ts
init_schema();
init_logger();
await init_db();
import { z as z6 } from "zod";
import { eq as eq12, count as count4, or as or6 } from "drizzle-orm";
function handleApiError(error, operation) {
  if (error instanceof z6.ZodError) {
    return {
      status: 400,
      message: `Dados inv\xE1lidos para ${operation}`,
      errors: error.errors
    };
  }
  if (error.code === "23505") {
    return {
      status: 409,
      message: `J\xE1 existe um registro com estes dados para ${operation}`
    };
  }
  if (error.code === "23503") {
    return {
      status: 400,
      message: `Refer\xEAncia inv\xE1lida encontrada para ${operation}`
    };
  }
  if (error.message && error.message.includes("n\xE3o encontrado")) {
    return {
      status: 404,
      message: error.message
    };
  }
  if (error.message && error.message.includes("n\xE3o autorizado")) {
    return {
      status: 403,
      message: error.message
    };
  }
  logger.error(`Error in ${operation}:`, error);
  return {
    status: 500,
    message: `Erro interno do servidor durante ${operation}`
  };
}
async function registerRoutes(app2) {
  app2.use(cookieParser());
  app2.use("/api/auth", authRoutes_default);
  app2.use("/api/password-reset", router2);
  app2.use("/api/questionnaires", questionnaires_default);
  app2.use("/api/questionnaires/admin", questionnaireAdmin_default);
  app2.use("/api/schedules", scheduleGeneration_default);
  app2.use("/api/upload", upload_default);
  app2.use("/api/notifications", notifications_default);
  app2.use("/api/reports", reports_default);
  app2.get("/api/auth/user", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usu\xE1rio atual");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar perfil");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.put("/api/profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const profileData = {
        name: req.body.name,
        phone: req.body.phone,
        ministryStartDate: req.body.ministryStartDate,
        baptismDate: req.body.baptismDate,
        baptismParish: req.body.baptismParish,
        confirmationDate: req.body.confirmationDate,
        confirmationParish: req.body.confirmationParish,
        marriageDate: req.body.marriageDate,
        marriageParish: req.body.marriageParish,
        maritalStatus: req.body.maritalStatus
      };
      Object.keys(profileData).forEach((key) => {
        if (profileData[key] === void 0) {
          delete profileData[key];
        }
      });
      const updatedUser = await storage.updateUser(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar perfil");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/profile/family", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { relatedUserId, relationshipType } = req.body;
      if (!relatedUserId || !relationshipType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (relatedUserId === userId) {
        return res.status(400).json({ error: "Cannot add yourself as a family member" });
      }
      const relatedUser = await storage.getUser(relatedUserId);
      if (!relatedUser) {
        return res.status(404).json({ error: "Related user not found" });
      }
      const relationship = await storage.addFamilyMember(userId, relatedUserId, relationshipType);
      res.json({
        message: "Family member added successfully",
        relationship: {
          id: relationship.id,
          relationshipType: relationship.relationshipType,
          user: {
            id: relatedUser.id,
            name: relatedUser.name,
            email: relatedUser.email,
            photoUrl: relatedUser.photoUrl
          }
        }
      });
    } catch (error) {
      if (error.message === "Relationship already exists") {
        return res.status(409).json({ error: "This family relationship already exists" });
      }
      const errorResponse = handleApiError(error, "adicionar familiar");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/profile/family", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const relationships = await storage.getFamilyMembers(userId);
      const familyMembers = await Promise.all(
        relationships.map(async (rel) => {
          const user = await storage.getUser(rel.relatedUserId);
          return {
            id: rel.id,
            relationshipType: rel.relationshipType,
            user: user ? {
              id: user.id,
              name: user.name,
              email: user.email,
              photoUrl: user.photoUrl
            } : null
          };
        })
      );
      res.json(familyMembers.filter((m) => m.user !== null));
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar familiares");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.delete("/api/profile/family/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeFamilyMember(id);
      res.json({ message: "Family member removed successfully" });
    } catch (error) {
      const errorResponse = handleApiError(error, "remover familiar");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/active", authenticateToken, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const activeUsers = users2.filter((u) => u.status === "active");
      res.json(activeUsers);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usu\xE1rios ativos");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/pending", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const pendingUsers = users2.filter((u) => u.status === "pending");
      res.json(pendingUsers);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usu\xE1rios pendentes");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar estat\xEDsticas do dashboard");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store"
      });
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar lista de usu\xE1rios");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/:id", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/:id/photo", authenticateToken, async (req, res) => {
    try {
      const userId = req.params.id;
      const [user] = await db.select({
        imageData: users.imageData,
        imageContentType: users.imageContentType
      }).from(users).where(eq12(users.id, userId));
      if (!user || !user.imageData) {
        return res.status(404).json({ error: "Photo not found" });
      }
      const imageBuffer = Buffer.from(user.imageData, "base64");
      const imageHash = crypto.createHash("md5").update(user.imageData).digest("hex");
      res.set({
        "Content-Type": user.imageContentType || "image/jpeg",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
        // Cache por 1 hora apenas
        "ETag": `"${userId}-${imageHash}"`,
        // ETag baseado no hash completo da imagem
        "Last-Modified": (/* @__PURE__ */ new Date()).toUTCString()
        // Adicionar data de modificação
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving profile photo:", error);
      res.status(500).json({ error: "Failed to load photo" });
    }
  });
  app2.post("/api/users", authenticateToken, requireRole(["gestor"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const safeUserData = {
        ...userData,
        role: userData.role || "ministro",
        // padrão ministro
        status: "pending"
        // sempre pending para aprovação
      };
      const user = await storage.createUser(safeUserData);
      res.status(201).json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.put("/api/users/:id", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const { role, status, ...safeUserData } = userData;
      const user = await storage.updateUser(req.params.id, safeUserData);
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.patch("/api/users/:id/status", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const statusUpdateSchema = z6.object({
        status: z6.enum(["active", "inactive", "pending"], {
          errorMap: () => ({ message: "Status deve ser: active, inactive ou pending" })
        })
      });
      const { status } = statusUpdateSchema.parse(req.body);
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel alterar seu pr\xF3prio status" });
      }
      if (status !== "active") {
        const targetUser = await storage.getUser(req.params.id);
        if (targetUser?.role === "gestor") {
          const allUsers = await storage.getAllUsers();
          const activeGestoresCount = allUsers.filter((u) => u.role === "gestor" && u.status === "active").length;
          if (activeGestoresCount <= 1) {
            return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel inativar o \xFAltimo gestor ativo do sistema" });
          }
        }
      }
      const user = await storage.updateUser(req.params.id, { status });
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: error.errors
        });
      }
      const errorResponse = handleApiError(error, "atualizar status do usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.patch("/api/users/:id/role", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const roleUpdateSchema = z6.object({
        role: z6.enum(["gestor", "coordenador", "ministro"], {
          errorMap: () => ({ message: "Papel deve ser: gestor, coordenador ou ministro" })
        })
      });
      const { role } = roleUpdateSchema.parse(req.body);
      if (req.user?.id === req.params.id) {
        if (req.user?.role === "coordenador") {
          if (role === "coordenador") {
            return res.status(400).json({ message: "Voc\xEA j\xE1 \xE9 um coordenador" });
          }
        } else {
          return res.status(400).json({ message: "Gestores n\xE3o podem alterar seu pr\xF3prio papel" });
        }
      }
      const targetUser = await storage.getUser(req.params.id);
      if (role !== "gestor" && targetUser?.role === "gestor") {
        const allUsers = await storage.getAllUsers();
        const activeGestoresCount = allUsers.filter(
          (u) => u.role === "gestor" && u.status === "active" && u.id !== req.params.id
          // Excluir o usuário que será modificado da contagem
        ).length;
        if (activeGestoresCount < 1) {
          return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel remover o \xFAltimo gestor ativo do sistema" });
        }
      }
      const user = await storage.updateUser(req.params.id, { role });
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z6.ZodError) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: error.errors
        });
      }
      const errorResponse = handleApiError(error, "atualizar papel do usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.patch("/api/users/:id/block", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel bloquear sua pr\xF3pria conta" });
      }
      const targetUser = await storage.getUser(req.params.id);
      if (targetUser?.role === "gestor") {
        const allUsers = await storage.getAllUsers();
        const activeGestoresCount = allUsers.filter((u) => u.role === "gestor" && u.status === "active").length;
        if (activeGestoresCount <= 1) {
          return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel bloquear o \xFAltimo gestor ativo do sistema" });
        }
      }
      const user = await storage.updateUser(req.params.id, { status: "inactive" });
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      res.json(user);
    } catch (error) {
      const errorResponse = handleApiError(error, "bloquear usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/:id/check-usage", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      const activityCheck = await storage.checkUserMinisterialActivity(userId);
      res.json({
        isUsed: activityCheck.isUsed,
        reason: activityCheck.reason
      });
    } catch (error) {
      console.error("Error checking user usage:", error);
      res.status(500).json({ message: "Erro ao verificar uso do usu\xE1rio" });
    }
  });
  app2.get("/api/diagnostic/:userId", authenticateToken, requireRole(["gestor"]), async (req, res) => {
    try {
      const userId = req.params.userId;
      const diagnostics = {
        userExists: false,
        canQueryUser: false,
        canQueryQuestionnaireResponses: false,
        canQueryScheduleAssignments: false,
        canQuerySubstitutionRequests: false,
        ministerialActivityCheck: null,
        userError: null,
        questionnaireError: null,
        scheduleError: null,
        substitutionError: null,
        storageError: null,
        questionnaireCount: 0,
        scheduleMinisterCount: 0,
        scheduleSubstituteCount: 0,
        substitutionRequestCount: 0
      };
      try {
        const user = await storage.getUser(userId);
        diagnostics.userExists = !!user;
        diagnostics.canQueryUser = true;
      } catch (e) {
        diagnostics.userError = `Error querying user: ${e}`;
      }
      try {
        const [questionnaireCheck] = await db.select({ count: count4() }).from(questionnaireResponses).where(eq12(questionnaireResponses.userId, userId));
        diagnostics.canQueryQuestionnaireResponses = true;
        diagnostics.questionnaireCount = questionnaireCheck?.count || 0;
      } catch (e) {
        diagnostics.questionnaireError = `Error querying questionnaire responses: ${e}`;
      }
      try {
        const [scheduleMinisterCheck] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.ministerId, userId));
        diagnostics.canQueryScheduleAssignments = true;
        diagnostics.scheduleMinisterCount = scheduleMinisterCheck?.count || 0;
        const [scheduleSubstituteCheck] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.substituteId, userId));
        diagnostics.scheduleSubstituteCount = scheduleSubstituteCheck?.count || 0;
      } catch (e) {
        diagnostics.scheduleError = `Error querying schedule assignments: ${e}`;
      }
      try {
        const [substitutionCheck] = await db.select({ count: count4() }).from(substitutionRequests).where(or6(
          eq12(substitutionRequests.requesterId, userId),
          eq12(substitutionRequests.substituteId, userId)
        ));
        diagnostics.canQuerySubstitutionRequests = true;
        diagnostics.substitutionRequestCount = substitutionCheck?.count || 0;
      } catch (e) {
        diagnostics.substitutionError = `Error querying substitution requests: ${e}`;
      }
      try {
        const result = await storage.checkUserMinisterialActivity(userId);
        diagnostics.ministerialActivityCheck = result.isUsed;
      } catch (e) {
        diagnostics.storageError = `Error in checkUserMinisterialActivity: ${e}`;
      }
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: `Diagnostic failed: ${error}` });
    }
  });
  app2.delete("/api/users/:id", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user;
      if (currentUser?.id === userId) {
        return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel excluir sua pr\xF3pria conta" });
      }
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      let hasMinisterialActivity = false;
      let activityCheckReason = "";
      try {
        const activityCheck = await storage.checkUserMinisterialActivity(userId);
        hasMinisterialActivity = activityCheck.isUsed;
        activityCheckReason = activityCheck.reason;
        if (!hasMinisterialActivity) {
          console.log("Storage returned no activity, performing double-check via direct DB queries...");
          const [questionnaireCount] = await db.select({ count: count4() }).from(questionnaireResponses).where(eq12(questionnaireResponses.userId, userId));
          const [scheduleMinisterCount] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.ministerId, userId));
          const [scheduleSubstituteCount] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.substituteId, userId));
          const [substitutionCount] = await db.select({ count: count4() }).from(substitutionRequests).where(or6(
            eq12(substitutionRequests.requesterId, userId),
            eq12(substitutionRequests.substituteId, userId)
          ));
          const directQuestionnaireActivity = (questionnaireCount?.count || 0) > 0;
          const directScheduleMinisterActivity = (scheduleMinisterCount?.count || 0) > 0;
          const directScheduleSubstituteActivity = (scheduleSubstituteCount?.count || 0) > 0;
          const directSubstitutionActivity = (substitutionCount?.count || 0) > 0;
          const directHasActivity = directQuestionnaireActivity || directScheduleMinisterActivity || directScheduleSubstituteActivity || directSubstitutionActivity;
          if (directHasActivity) {
            console.warn("DISCREPANCY DETECTED: Storage said no activity but direct query found activity", {
              storageResult: activityCheck,
              directChecks: {
                questionnaires: directQuestionnaireActivity,
                scheduleMinister: directScheduleMinisterActivity,
                scheduleSubstitute: directScheduleSubstituteActivity,
                substitutions: directSubstitutionActivity
              }
            });
            hasMinisterialActivity = true;
            const activities = [];
            if (directQuestionnaireActivity) activities.push("question\xE1rios respondidos");
            if (directScheduleMinisterActivity) activities.push("escalas como ministro");
            if (directScheduleSubstituteActivity) activities.push("escalas como substituto");
            if (directSubstitutionActivity) activities.push("solicita\xE7\xF5es de substitui\xE7\xE3o");
            activityCheckReason = `ATEN\xC7\xC3O: Discrep\xE2ncia detectada entre m\xE9todos. Verifica\xE7\xE3o direta encontrou: ${activities.join(", ")}`;
          }
        }
      } catch (storageError) {
        console.error("Storage method failed, trying direct DB queries:", storageError);
        try {
          const [questionnaireCount] = await db.select({ count: count4() }).from(questionnaireResponses).where(eq12(questionnaireResponses.userId, userId));
          const [scheduleMinisterCount] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.ministerId, userId));
          const [scheduleSubstituteCount] = await db.select({ count: count4() }).from(schedules).where(eq12(schedules.substituteId, userId));
          const [substitutionCount] = await db.select({ count: count4() }).from(substitutionRequests).where(or6(
            eq12(substitutionRequests.requesterId, userId),
            eq12(substitutionRequests.substituteId, userId)
          ));
          const questionnaireActivity = (questionnaireCount?.count || 0) > 0;
          const scheduleMinisterActivity = (scheduleMinisterCount?.count || 0) > 0;
          const scheduleSubstituteActivity = (scheduleSubstituteCount?.count || 0) > 0;
          const substitutionActivity = (substitutionCount?.count || 0) > 0;
          hasMinisterialActivity = questionnaireActivity || scheduleMinisterActivity || scheduleSubstituteActivity || substitutionActivity;
          if (hasMinisterialActivity) {
            const activities = [];
            if (questionnaireActivity) activities.push("question\xE1rios respondidos");
            if (scheduleMinisterActivity) activities.push("escalas como ministro");
            if (scheduleSubstituteActivity) activities.push("escalas como substituto");
            if (substitutionActivity) activities.push("solicita\xE7\xF5es de substitui\xE7\xE3o");
            activityCheckReason = `Usu\xE1rio tem atividade no sistema: ${activities.join(", ")}`;
          } else {
            activityCheckReason = "Nenhuma atividade ministerial encontrada - usu\xE1rio pode ser exclu\xEDdo";
          }
        } catch (directError) {
          console.error("Direct DB query also failed:", directError);
          return res.status(500).json({
            message: "Erro interno ao verificar atividades do usu\xE1rio. Por seguran\xE7a, a exclus\xE3o foi bloqueada.",
            shouldBlock: true,
            code: "DATABASE_CONNECTIVITY_ERROR"
          });
        }
      }
      if (hasMinisterialActivity) {
        return res.status(409).json({
          message: activityCheckReason.includes("N\xE3o foi poss\xEDvel verificar") ? "Erro ao verificar uso do usu\xE1rio no banco de dados. N\xE3o \xE9 poss\xEDvel determinar se o usu\xE1rio pode ser exclu\xEDdo com seguran\xE7a." : activityCheckReason || "Usu\xE1rio n\xE3o pode ser exclu\xEDdo pois j\xE1 foi utilizado no sistema",
          shouldBlock: true,
          code: activityCheckReason.includes("N\xE3o foi poss\xEDvel verificar") ? "USAGE_CHECK_FAILED" : "USER_HAS_ACTIVITY"
        });
      }
      if (currentUser?.role === "coordenador" && targetUser.role === "gestor") {
        return res.status(403).json({
          message: "Coordenadores n\xE3o podem excluir gestores",
          shouldBlock: true
        });
      }
      if (targetUser.role === "gestor") {
        const allUsers = await storage.getAllUsers();
        const activeGestores = allUsers.filter((u) => u.role === "gestor" && u.status === "active");
        if (activeGestores.length <= 1) {
          return res.status(409).json({
            message: "N\xE3o \xE9 poss\xEDvel excluir o \xFAltimo gestor ativo do sistema",
            shouldBlock: true
          });
        }
      }
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      let errorMessage = "Failed to delete user";
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        errorMessage = `Failed to delete user: ${error.message}`;
      }
      res.status(500).json({
        message: errorMessage,
        debug: process.env.NODE_ENV === "development" ? error : void 0
      });
    }
  });
  app2.get("/api/questionnaires", authenticateToken, async (req, res) => {
    try {
      const questionnaires2 = await storage.getQuestionnaires();
      res.json(questionnaires2);
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      res.status(500).json({ message: "Failed to fetch questionnaires" });
    }
  });
  app2.post("/api/questionnaires", authenticateToken, async (req, res) => {
    try {
      const questionnaireData = insertQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.createQuestionnaire({
        ...questionnaireData,
        createdById: req.user?.id || "0"
      });
      res.status(201).json(questionnaire);
    } catch (error) {
      console.error("Error creating questionnaire:", error);
      if (error instanceof z6.ZodError) {
        return res.status(400).json({ message: "Invalid questionnaire data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create questionnaire" });
    }
  });
  app2.get("/api/questionnaires/:id/responses", authenticateToken, async (req, res) => {
    try {
      const responses = await storage.getQuestionnaireResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching questionnaire responses:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire responses" });
    }
  });
  app2.post("/api/questionnaires/:id/responses", authenticateToken, async (req, res) => {
    try {
      const responseData = {
        questionnaireId: req.params.id,
        userId: req.user?.id || "0",
        responses: req.body.responses,
        availableSundays: req.body.availableSundays,
        preferredMassTimes: req.body.preferredMassTimes,
        canSubstitute: req.body.canSubstitute,
        notes: req.body.notes
      };
      const response = await storage.submitQuestionnaireResponse(responseData);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error submitting questionnaire response:", error);
      res.status(500).json({ message: "Failed to submit questionnaire response" });
    }
  });
  app2.get("/api/schedules", authenticateToken, async (req, res) => {
    try {
      const schedules3 = await storage.getSchedules();
      res.json(schedules3);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });
  app2.post("/api/schedules", authenticateToken, async (req, res) => {
    try {
      const scheduleData = {
        ...req.body,
        createdById: req.user?.id
      };
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });
  app2.get("/api/schedules/:id/assignments", authenticateToken, async (req, res) => {
    try {
      const assignments = await storage.getScheduleAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching schedule assignments:", error);
      res.status(500).json({ message: "Failed to fetch schedule assignments" });
    }
  });
  app2.get("/api/mass-times", authenticateToken, async (req, res) => {
    try {
      const massTimes = await storage.getMassTimes();
      res.json(massTimes);
    } catch (error) {
      console.error("Error fetching mass times:", error);
      res.status(500).json({ message: "Failed to fetch mass times" });
    }
  });
  app2.post("/api/mass-times", authenticateToken, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.parse(req.body);
      const massTime = await storage.createMassTime(massTimeData);
      res.status(201).json(massTime);
    } catch (error) {
      console.error("Error creating mass time:", error);
      if (error instanceof z6.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mass time" });
    }
  });
  app2.put("/api/mass-times/:id", authenticateToken, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.partial().parse(req.body);
      const massTime = await storage.updateMassTime(req.params.id, massTimeData);
      res.json(massTime);
    } catch (error) {
      console.error("Error updating mass time:", error);
      if (error instanceof z6.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update mass time" });
    }
  });
  app2.delete("/api/mass-times/:id", authenticateToken, async (req, res) => {
    try {
      await storage.deleteMassTime(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mass time:", error);
      res.status(500).json({ message: "Failed to delete mass time" });
    }
  });
  app2.get("/api/formation/tracks", authenticateToken, async (req, res) => {
    try {
      const tracks = await storage.getFormationTracks();
      res.json(tracks);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar trilhas de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/tracks/:id", authenticateToken, async (req, res) => {
    try {
      const track = await storage.getFormationTrackById(req.params.id);
      if (!track) {
        return res.status(404).json({ message: "Trilha de forma\xE7\xE3o n\xE3o encontrada" });
      }
      res.json(track);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar trilha de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/modules/:trackId", authenticateToken, async (req, res) => {
    try {
      const { trackId } = req.params;
      const trackIdMap = {
        "liturgy": "liturgy-track-1",
        "spirituality": "spirituality-track-1",
        "practical": "practical-track-1",
        "liturgia": "liturgy-track-1",
        "espiritualidade": "spirituality-track-1",
        "pratica": "practical-track-1"
      };
      const fullTrackId = trackIdMap[trackId] || trackId;
      const modules = await storage.getFormationModules(fullTrackId);
      res.json(modules);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar m\xF3dulos de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/lessons", authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId } = req.query;
      const lessons = await storage.getFormationLessons(trackId, moduleId);
      res.json(lessons);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aulas de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/lessons/:id", authenticateToken, async (req, res) => {
    try {
      const lesson = await storage.getFormationLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Aula n\xE3o encontrada" });
      }
      res.json(lesson);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/lessons/:trackId/:moduleId", authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId } = req.params;
      console.log(`[DEBUG ROUTE] trackId: ${trackId}, moduleId: ${moduleId}`);
      const lessons = await storage.getFormationLessonsByTrackAndModule(trackId, moduleId);
      console.log(`[DEBUG ROUTE] lessons result:`, lessons);
      if (!lessons || lessons.length === 0) {
        return res.status(404).json({ message: "Aulas n\xE3o encontradas para este m\xF3dulo" });
      }
      res.json(lessons);
    } catch (error) {
      console.error(`[DEBUG ROUTE ERROR]`, error);
      const errorResponse = handleApiError(error, "buscar aulas do m\xF3dulo");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/:trackId/:moduleId/:lessonNumber", authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId, lessonNumber } = req.params;
      const lesson = await storage.getFormationLessonByNumber(trackId, moduleId, parseInt(lessonNumber));
      if (!lesson) {
        return res.status(404).json({ message: "Aula n\xE3o encontrada" });
      }
      const sections = await storage.getFormationLessonSections(lesson.id);
      const userId = req.user?.id;
      let progress = null;
      if (userId) {
        const progressData = await storage.getFormationLessonProgress(userId, lesson.id);
        progress = progressData[0] || null;
      }
      res.json({
        lesson,
        sections,
        progress
      });
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aula completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/lessons/:id/sections", authenticateToken, async (req, res) => {
    try {
      const sections = await storage.getFormationLessonSections(req.params.id);
      res.json(sections);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar se\xE7\xF5es da aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/formation/progress", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const { trackId } = req.query;
      const progress = await storage.getUserFormationProgress(userId, trackId);
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar progresso de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/progress", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const progressData = insertFormationLessonProgressSchema.parse({
        ...req.body,
        userId
      });
      const progress = await storage.createOrUpdateFormationLessonProgress(progressData);
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar progresso de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:lessonId/sections/:sectionId/complete", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const { lessonId, sectionId } = req.params;
      const progress = await storage.markLessonSectionCompleted(userId, lessonId, sectionId);
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar se\xE7\xE3o como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:lessonId/complete", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const { lessonId } = req.params;
      const progress = await storage.markLessonCompleted(userId, lessonId);
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar aula como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/tracks", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const trackData = insertFormationTrackSchema.parse(req.body);
      const track = await storage.createFormationTrack(trackData);
      res.status(201).json(track);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar trilha de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const lessonData = insertFormationLessonSchema.parse(req.body);
      const lesson = await storage.createFormationLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:id/sections", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const sectionData = insertFormationLessonSectionSchema.parse({
        ...req.body,
        lessonId: req.params.id
      });
      const section = await storage.createFormationLessonSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar se\xE7\xE3o da aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) {
      return next();
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
process.on("uncaughtException", (error) => {
  log(`Uncaught Exception: ${error.message}`);
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(express2.static(path3.join(process.cwd(), "public")));
app.use("/uploads", express2.static(path3.join(process.cwd(), "uploads")));
app.use((req, res, next) => {
  const start = Date.now();
  const originalPath = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (originalPath.startsWith("/api")) {
      const logLine = `${req.method} ${originalPath} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
  next();
});
(async () => {
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  const server = await registerRoutes(app);
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error ${status} on ${req.method} ${req.path}: ${message}`);
    console.error("Request error:", {
      method: req.method,
      path: req.path,
      status,
      message,
      stack: err.stack
    });
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });
  const isDevelopment2 = process.env.NODE_ENV === "development";
  console.log(`Environment: ${process.env.NODE_ENV}, isDevelopment: ${isDevelopment2}`);
  if (isDevelopment2) {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
      console.log("Static file serving configured for production");
    } catch (error) {
      console.error("Failed to configure static file serving:", error);
      process.exit(1);
    }
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.on("error", (error) => {
    console.error("Server error:", error);
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    console.log(`Server successfully started on http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
})();
