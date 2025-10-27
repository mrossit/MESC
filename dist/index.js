var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
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
  activeSessions: () => activeSessions,
  activeSessionsRelations: () => activeSessionsRelations,
  activityLogs: () => activityLogs,
  activityLogsRelations: () => activityLogsRelations,
  celebrationRankEnum: () => celebrationRankEnum,
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
  liturgicalCelebrations: () => liturgicalCelebrations,
  liturgicalColorEnum: () => liturgicalColorEnum,
  liturgicalCycleEnum: () => liturgicalCycleEnum,
  liturgicalMassOverrides: () => liturgicalMassOverrides,
  liturgicalSeasons: () => liturgicalSeasons,
  liturgicalYears: () => liturgicalYears,
  massExecutionLogs: () => massExecutionLogs,
  massExecutionLogsRelations: () => massExecutionLogsRelations,
  massTimesConfig: () => massTimesConfig,
  ministerCheckIns: () => ministerCheckIns,
  ministerCheckInsRelations: () => ministerCheckInsRelations,
  notificationTypeEnum: () => notificationTypeEnum,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  passwordResetRequests: () => passwordResetRequests,
  pushSubscriptions: () => pushSubscriptions,
  questionnaireResponses: () => questionnaireResponses,
  questionnaireResponsesRelations: () => questionnaireResponsesRelations,
  questionnaires: () => questionnaires,
  questionnairesRelations: () => questionnairesRelations,
  saints: () => saints,
  scheduleStatusEnum: () => scheduleStatusEnum,
  scheduleTypeEnum: () => scheduleTypeEnum,
  schedules: () => schedules,
  schedulesRelations: () => schedulesRelations,
  sessions: () => sessions,
  standbyMinisters: () => standbyMinisters,
  standbyMinistersRelations: () => standbyMinistersRelations,
  substitutionRequests: () => substitutionRequests,
  substitutionRequestsRelations: () => substitutionRequestsRelations,
  substitutionStatusEnum: () => substitutionStatusEnum,
  urgencyLevelEnum: () => urgencyLevelEnum,
  userRoleEnum: () => userRoleEnum,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
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
var sessions, userRoleEnum, userStatusEnum, scheduleStatusEnum, scheduleTypeEnum, substitutionStatusEnum, urgencyLevelEnum, notificationTypeEnum, formationCategoryEnum, formationStatusEnum, lessonContentTypeEnum, liturgicalCycleEnum, liturgicalColorEnum, celebrationRankEnum, users, families, familyRelationships, questionnaires, questionnaireResponses, schedules, massExecutionLogs, standbyMinisters, ministerCheckIns, substitutionRequests, notifications, pushSubscriptions, formationTracks, formationModules, formationProgress, formationLessons, formationLessonSections, formationLessonProgress, massTimesConfig, passwordResetRequests, activeSessions, activityLogs, liturgicalYears, liturgicalSeasons, liturgicalCelebrations, liturgicalMassOverrides, saints, familiesRelations, activeSessionsRelations, activityLogsRelations, usersRelations, questionnairesRelations, questionnaireResponsesRelations, schedulesRelations, massExecutionLogsRelations, standbyMinistersRelations, ministerCheckInsRelations, substitutionRequestsRelations, formationModulesRelations, formationProgressRelations, formationTracksRelations, formationLessonsRelations, formationLessonSectionsRelations, formationLessonProgressRelations, notificationsRelations, insertUserSchema, insertQuestionnaireSchema, insertMassTimeSchema, insertFormationTrackSchema, insertFormationLessonSchema, insertFormationLessonSectionSchema, insertFormationLessonProgressSchema;
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
    substitutionStatusEnum = pgEnum("substitution_status", ["available", "pending", "approved", "rejected", "cancelled", "auto_approved"]);
    urgencyLevelEnum = pgEnum("urgency_level", ["low", "medium", "high", "critical"]);
    notificationTypeEnum = pgEnum("notification_type", ["schedule", "substitution", "formation", "announcement", "reminder"]);
    formationCategoryEnum = pgEnum("formation_category", ["liturgia", "espiritualidade", "pratica"]);
    formationStatusEnum = pgEnum("formation_status", ["not_started", "in_progress", "completed"]);
    lessonContentTypeEnum = pgEnum("lesson_content_type", ["text", "video", "audio", "document", "quiz", "interactive"]);
    liturgicalCycleEnum = pgEnum("liturgical_cycle", ["A", "B", "C"]);
    liturgicalColorEnum = pgEnum("liturgical_color", ["white", "red", "green", "purple", "rose", "black"]);
    celebrationRankEnum = pgEnum("celebration_rank", ["SOLEMNITY", "FEAST", "MEMORIAL", "OPTIONAL_MEMORIAL", "FERIAL"]);
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
      preferredPositions: jsonb("preferred_positions").$type().default([]),
      avoidPositions: jsonb("avoid_positions").$type().default([]),
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
      // Display name for schedules (optional custom name shown in schedule lists)
      scheduleDisplayName: varchar("schedule_display_name", { length: 100 }),
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
      preferServeTogether: boolean("prefer_serve_together").default(true),
      // Default: families prefer to serve together
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
      position: integer("position").default(0),
      // Order position for ministers at same date/time
      status: varchar("status", { length: 20 }).notNull().default("scheduled"),
      substituteId: varchar("substitute_id").references(() => users.id),
      notes: text("notes"),
      onSiteAdjustments: jsonb("on_site_adjustments").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    massExecutionLogs = pgTable("mass_execution_logs", {
      id: uuid("id").primaryKey().defaultRandom(),
      scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
      auxiliaryId: varchar("auxiliary_id").notNull().references(() => users.id),
      changesMade: jsonb("changes_made").$type(),
      comments: text("comments"),
      massQuality: integer("mass_quality"),
      // 1-5 stars
      attendance: jsonb("attendance").$type(),
      incidents: jsonb("incidents").$type(),
      highlights: text("highlights"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("idx_mass_execution_logs_schedule").on(table.scheduleId),
      index("idx_mass_execution_logs_auxiliary").on(table.auxiliaryId)
    ]);
    standbyMinisters = pgTable("standby_ministers", {
      id: uuid("id").primaryKey().defaultRandom(),
      scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
      ministerId: varchar("minister_id").notNull().references(() => users.id),
      confirmedAvailable: boolean("confirmed_available").default(false),
      checkInTime: timestamp("check_in_time"),
      calledAt: timestamp("called_at"),
      calledBy: varchar("called_by").references(() => users.id),
      respondedAt: timestamp("responded_at"),
      response: varchar("response", { length: 50 }),
      // 'available', 'unavailable', 'on_way', 'arrived'
      responseMessage: text("response_message"),
      assignedPosition: integer("assigned_position"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("idx_standby_ministers_schedule").on(table.scheduleId),
      index("idx_standby_ministers_minister").on(table.ministerId),
      index("idx_standby_ministers_called").on(table.calledAt)
    ]);
    ministerCheckIns = pgTable("minister_check_ins", {
      id: uuid("id").primaryKey().defaultRandom(),
      scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
      ministerId: varchar("minister_id").notNull().references(() => users.id),
      position: integer("position").notNull(),
      checkedInAt: timestamp("checked_in_at").defaultNow(),
      checkedInBy: varchar("checked_in_by").references(() => users.id),
      // Auxiliary who checked them in
      status: varchar("status", { length: 20 }).default("present"),
      // present, late, absent
      notes: text("notes")
    }, (table) => [
      index("idx_minister_check_ins_schedule").on(table.scheduleId),
      index("idx_minister_check_ins_minister").on(table.ministerId)
    ]);
    substitutionRequests = pgTable("substitution_requests", {
      id: uuid("id").primaryKey().defaultRandom(),
      scheduleId: uuid("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
      requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      substituteId: varchar("substitute_id").references(() => users.id, { onDelete: "set null" }),
      reason: text("reason"),
      // Opcional - ministro pode ou não informar motivo
      status: substitutionStatusEnum("status").notNull().default("available"),
      urgency: urgencyLevelEnum("urgency").notNull().default("medium"),
      approvedBy: varchar("approved_by").references(() => users.id),
      approvedAt: timestamp("approved_at"),
      responseMessage: text("response_message"),
      // Mensagem do substituto ao aceitar/rejeitar
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_substitution_requester").on(table.requesterId),
      index("idx_substitution_substitute").on(table.substituteId),
      index("idx_substitution_status").on(table.status),
      index("idx_substitution_schedule").on(table.scheduleId)
    ]);
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
    pushSubscriptions = pgTable("push_subscriptions", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      endpoint: text("endpoint").notNull(),
      p256dhKey: text("p256dh_key").notNull(),
      authKey: text("auth_key").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint)
    ]);
    formationTracks = pgTable("formation_tracks", {
      id: varchar("id").primaryKey(),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      category: formationCategoryEnum("category").notNull(),
      orderIndex: integer("order_index").default(0),
      icon: varchar("icon", { length: 128 }),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    formationModules = pgTable("formation_modules", {
      id: uuid("id").primaryKey().defaultRandom(),
      trackId: varchar("track_id").notNull().references(() => formationTracks.id),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      category: formationCategoryEnum("category"),
      content: text("content"),
      videoUrl: varchar("video_url", { length: 512 }),
      durationMinutes: integer("duration_minutes"),
      orderIndex: integer("order_index").default(0),
      createdAt: timestamp("created_at").defaultNow()
    });
    formationProgress = pgTable("formation_progress", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id),
      moduleId: uuid("module_id").notNull().references(() => formationModules.id),
      status: formationStatusEnum("status").notNull().default("not_started"),
      progressPercentage: integer("progress_percentage").default(0),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    formationLessons = pgTable("formation_lessons", {
      id: uuid("id").primaryKey().defaultRandom(),
      moduleId: uuid("module_id").notNull().references(() => formationModules.id),
      trackId: varchar("track_id"),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      lessonNumber: integer("lesson_number").notNull(),
      durationMinutes: integer("duration_minutes"),
      objectives: jsonb("objectives"),
      isActive: boolean("is_active").default(true),
      orderIndex: integer("order_index").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    formationLessonSections = pgTable("formation_lesson_sections", {
      id: uuid("id").primaryKey().defaultRandom(),
      lessonId: uuid("lesson_id").notNull().references(() => formationLessons.id),
      type: lessonContentTypeEnum("type").default("text"),
      title: varchar("title", { length: 255 }).notNull(),
      content: text("content"),
      videoUrl: varchar("video_url", { length: 512 }),
      audioUrl: varchar("audio_url", { length: 512 }),
      documentUrl: varchar("document_url", { length: 512 }),
      imageUrl: varchar("image_url", { length: 512 }),
      quizData: jsonb("quiz_data"),
      orderIndex: integer("order_index").default(0),
      isRequired: boolean("is_required").default(true),
      estimatedMinutes: integer("estimated_minutes"),
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
      completedSections: jsonb("completed_sections"),
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
    activeSessions = pgTable("active_sessions", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      sessionToken: varchar("session_token", { length: 100 }).notNull().unique(),
      createdAt: timestamp("created_at").defaultNow(),
      lastActivityAt: timestamp("last_activity_at").defaultNow(),
      expiresAt: timestamp("expires_at").notNull(),
      ipAddress: varchar("ip_address", { length: 45 }),
      userAgent: text("user_agent"),
      isActive: boolean("is_active").default(true)
    }, (table) => [
      index("idx_active_sessions_user").on(table.userId),
      index("idx_active_sessions_active").on(table.isActive),
      index("idx_active_sessions_expires").on(table.expiresAt),
      index("idx_active_sessions_activity").on(table.lastActivityAt)
    ]);
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
    liturgicalYears = pgTable("liturgical_years", {
      id: uuid("id").primaryKey().defaultRandom(),
      year: integer("year").notNull().unique(),
      // Civil year when liturgical year starts
      cycle: liturgicalCycleEnum("cycle").notNull(),
      // A, B, or C
      startDate: date("start_date").notNull(),
      // First Sunday of Advent
      endDate: date("end_date").notNull(),
      // Saturday before next Advent
      easterDate: date("easter_date").notNull(),
      // Calculated Easter Sunday
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_liturgical_years_year").on(table.year)
    ]);
    liturgicalSeasons = pgTable("liturgical_seasons", {
      id: uuid("id").primaryKey().defaultRandom(),
      yearId: uuid("year_id").notNull().references(() => liturgicalYears.id),
      name: varchar("name", { length: 100 }).notNull(),
      // Advent, Christmas, Lent, Easter, Ordinary Time
      color: liturgicalColorEnum("color").notNull(),
      startDate: date("start_date").notNull(),
      endDate: date("end_date").notNull(),
      orderIndex: integer("order_index").default(0),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("idx_liturgical_seasons_year").on(table.yearId),
      index("idx_liturgical_seasons_dates").on(table.startDate, table.endDate)
    ]);
    liturgicalCelebrations = pgTable("liturgical_celebrations", {
      id: uuid("id").primaryKey().defaultRandom(),
      date: date("date").notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      rank: celebrationRankEnum("rank").notNull(),
      color: liturgicalColorEnum("color").notNull(),
      isMovable: boolean("is_movable").default(false),
      // True for Easter-dependent dates
      specialMassConfig: jsonb("special_mass_config").$type(),
      saintOfTheDay: varchar("saint_of_the_day", { length: 255 }),
      readings: jsonb("readings"),
      notes: text("notes"),
      yearId: uuid("year_id").references(() => liturgicalYears.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_liturgical_celebrations_date").on(table.date),
      index("idx_liturgical_celebrations_rank").on(table.rank),
      index("idx_liturgical_celebrations_year").on(table.yearId)
    ]);
    liturgicalMassOverrides = pgTable("liturgical_mass_overrides", {
      id: uuid("id").primaryKey().defaultRandom(),
      celebrationId: uuid("celebration_id").references(() => liturgicalCelebrations.id),
      date: date("date").notNull(),
      time: time("time").notNull(),
      minMinisters: integer("min_ministers").notNull(),
      maxMinisters: integer("max_ministers").notNull(),
      description: varchar("description", { length: 255 }),
      reason: text("reason"),
      createdBy: varchar("created_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_liturgical_mass_overrides_date").on(table.date),
      index("idx_liturgical_mass_overrides_celebration").on(table.celebrationId)
    ]);
    saints = pgTable("saints", {
      id: uuid("id").primaryKey().defaultRandom(),
      name: varchar("name", { length: 255 }).notNull(),
      feastDay: varchar("feast_day", { length: 10 }).notNull(),
      // MM-DD format
      title: varchar("title", { length: 255 }),
      // e.g., "Apóstolo", "Mártir", "Doutor da Igreja"
      patronOf: text("patron_of"),
      // What they're patron saint of
      biography: text("biography"),
      imageUrl: varchar("image_url", { length: 500 }),
      isBrazilian: boolean("is_brazilian").default(false),
      rank: celebrationRankEnum("rank").notNull().default("OPTIONAL_MEMORIAL"),
      liturgicalColor: liturgicalColorEnum("liturgical_color").notNull().default("white"),
      // Liturgical texts
      collectPrayer: text("collect_prayer"),
      // Oração Coleta
      firstReading: jsonb("first_reading").$type(),
      responsorialPsalm: jsonb("responsorial_psalm").$type(),
      gospel: jsonb("gospel").$type(),
      prayerOfTheFaithful: text("prayer_of_the_faithful"),
      communionAntiphon: text("communion_antiphon"),
      // Additional information
      attributes: jsonb("attributes").$type(),
      // Common symbols, attributes
      quotes: jsonb("quotes").$type(),
      // Famous quotes by/about the saint
      relatedSaints: jsonb("related_saints").$type(),
      // Related saint IDs
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      index("idx_saints_feast_day").on(table.feastDay),
      index("idx_saints_name").on(table.name),
      index("idx_saints_brazilian").on(table.isBrazilian)
    ]);
    familiesRelations = relations(families, ({ many }) => ({
      members: many(users)
    }));
    activeSessionsRelations = relations(activeSessions, ({ one }) => ({
      user: one(users, {
        fields: [activeSessions.userId],
        references: [users.id]
      })
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
      activeSessions: many(activeSessions),
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
      substitutionRequests: many(substitutionRequests),
      massExecutionLogs: many(massExecutionLogs),
      standbyMinisters: many(standbyMinisters),
      ministerCheckIns: many(ministerCheckIns)
    }));
    massExecutionLogsRelations = relations(massExecutionLogs, ({ one }) => ({
      schedule: one(schedules, {
        fields: [massExecutionLogs.scheduleId],
        references: [schedules.id]
      }),
      auxiliary: one(users, {
        fields: [massExecutionLogs.auxiliaryId],
        references: [users.id]
      })
    }));
    standbyMinistersRelations = relations(standbyMinisters, ({ one }) => ({
      schedule: one(schedules, {
        fields: [standbyMinisters.scheduleId],
        references: [schedules.id]
      }),
      minister: one(users, {
        fields: [standbyMinisters.ministerId],
        references: [users.id]
      }),
      callerUser: one(users, {
        fields: [standbyMinisters.calledBy],
        references: [users.id]
      })
    }));
    ministerCheckInsRelations = relations(ministerCheckIns, ({ one }) => ({
      schedule: one(schedules, {
        fields: [ministerCheckIns.scheduleId],
        references: [schedules.id]
      }),
      minister: one(users, {
        fields: [ministerCheckIns.ministerId],
        references: [users.id]
      }),
      checkedInByUser: one(users, {
        fields: [ministerCheckIns.checkedInBy],
        references: [users.id]
      })
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
      lessons: many(formationLessons),
      progress: many(formationProgress)
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
      isActive: true,
      orderIndex: true
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
      completedSections: true,
      lastAccessedAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
var db, pool, isProduction, isDevelopment;
var init_db = __esm({
  async "server/db.ts"() {
    "use strict";
    init_schema();
    isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || !!process.env.REPL_SLUG && !process.env.DATABASE_URL;
    isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
    if (process.env.DATABASE_URL) {
      if (isDevelopment) {
        console.log("\u{1F680} Using PostgreSQL database");
      }
      try {
        const { Pool, neonConfig } = await import("@neondatabase/serverless");
        const { drizzle } = await import("drizzle-orm/neon-serverless");
        const ws = await import("ws");
        neonConfig.webSocketConstructor = ws.default;
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        db = drizzle({ client: pool, schema: schema_exports });
        if (isDevelopment) {
          console.log("\u2705 PostgreSQL connected");
        }
      } catch (error) {
        console.error("\u274C Failed to connect to PostgreSQL:", error);
        throw error;
      }
    } else if (isDevelopment && !isProduction) {
      if (isDevelopment) {
        console.log("\u{1F527} Using local SQLite database");
      }
      const Database2 = await import("better-sqlite3");
      const { drizzle } = await import("drizzle-orm/better-sqlite3");
      const sqlite = new Database2.default("local.db");
      db = drizzle(sqlite, { schema: schema_exports });
    } else {
      console.warn("\u26A0\uFE0F No DATABASE_URL found - using SQLite fallback");
      const Database2 = await import("better-sqlite3");
      const { drizzle } = await import("drizzle-orm/better-sqlite3");
      const sqlite = new Database2.default("local.db");
      db = drizzle(sqlite, { schema: schema_exports });
    }
  }
});

// server/utils/nameFormatter.ts
function formatName(name) {
  if (!name) return "";
  const normalized = name.trim().replace(/\s+/g, " ");
  const words = normalized.toLowerCase().split(" ");
  const formattedWords = words.map((word, index2) => {
    if (!word) return "";
    if (index2 === 0) {
      return capitalizeWord(word);
    }
    if (LOWERCASE_PREFIXES.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return capitalizeWord(word);
  });
  return formattedWords.join(" ");
}
function capitalizeWord(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
var LOWERCASE_PREFIXES;
var init_nameFormatter = __esm({
  "server/utils/nameFormatter.ts"() {
    "use strict";
    LOWERCASE_PREFIXES = [
      "da",
      "de",
      "do",
      "das",
      "dos",
      "e",
      "a",
      "o",
      "as",
      "os",
      "em",
      "na",
      "no",
      "nas",
      "nos",
      "com",
      "para",
      "por"
    ];
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, and, desc, count, sql as sql2, gte, lte, or, inArray } from "drizzle-orm";
import Database from "better-sqlite3";
var DrizzleSQLiteFallback, DatabaseStorage, storage;
var init_storage = __esm({
  async "server/storage.ts"() {
    "use strict";
    init_schema();
    await init_db();
    init_nameFormatter();
    DrizzleSQLiteFallback = class {
      static sqliteDb = null;
      static getSQLiteDB() {
        if (process.env.NODE_ENV === "production") {
          throw new Error("SQLite fallback not allowed in production");
        }
        if (!this.sqliteDb) {
          this.sqliteDb = new Database("local.db");
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
            const sqlite = this.getSQLiteDB();
            const result = sqlite.prepare(fallbackSQL).get();
            return result ? fallbackMapper(result) : void 0;
          }
          throw drizzleError;
        }
      }
    };
    DatabaseStorage = class {
      pushSubscriptionsEnsured = false;
      async ensurePushSubscriptionTable() {
        if (this.pushSubscriptionsEnsured || process.env.DATABASE_URL) {
          this.pushSubscriptionsEnsured = true;
          return;
        }
        try {
          await db.all?.("SELECT 1 FROM push_subscriptions LIMIT 1");
        } catch (error) {
          try {
            const sqlite = DrizzleSQLiteFallback.getSQLiteDB();
            sqlite.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id TEXT NOT NULL,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh_key TEXT NOT NULL,
            auth_key TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
          )`).run();
            sqlite.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint)`).run();
          } catch (sqliteError) {
            console.error("[SQLite] Failed to ensure push_subscriptions table:", sqliteError);
          }
        }
        this.pushSubscriptionsEnsured = true;
      }
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
        const crypto3 = __require("crypto");
        const tempPassword = crypto3.randomBytes(12).toString("base64").slice(0, 12) + "!Aa1";
        const bcrypt2 = await import("bcrypt");
        const passwordHash = await bcrypt2.hash(tempPassword, 10);
        const rawName = userData.name || `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Usu\xE1rio";
        const formattedName = formatName(rawName);
        const [user] = await db.insert(users).values({
          email: userData.email,
          passwordHash,
          name: formattedName,
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
        const updateData = { ...userData };
        if (updateData.name) {
          updateData.name = formatName(updateData.name);
        }
        const [user] = await db.update(users).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return user;
      }
      async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
      }
      async getAllUsers() {
        return await db.select().from(users).orderBy(desc(users.createdAt));
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
      async getSchedulesSummary(month, year) {
        const currentYear = year || (/* @__PURE__ */ new Date()).getFullYear();
        const currentMonth = month || (/* @__PURE__ */ new Date()).getMonth() + 1;
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const endDate = month === 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const assignments = await db.select().from(schedules).where(and(
          gte(schedules.date, startDate),
          sql2`${schedules.date} < ${endDate}`
        ));
        if (assignments.length === 0) {
          return [];
        }
        const summary = {
          id: `schedule-${currentYear}-${currentMonth}`,
          title: `Escala de ${this.getMonthName(currentMonth)}/${currentYear}`,
          month: currentMonth,
          year: currentYear,
          status: "published",
          // Assumir publicada se há atribuições
          createdBy: "system",
          createdAt: assignments[0]?.createdAt || /* @__PURE__ */ new Date(),
          publishedAt: assignments[0]?.createdAt || /* @__PURE__ */ new Date(),
          totalAssignments: assignments.length
        };
        return [summary];
      }
      getMonthName(month) {
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
        return months[month - 1] || "M\xEAs";
      }
      formatMassTime(time2) {
        if (!time2) return "";
        const timeStr = typeof time2 === "string" ? time2 : time2.toString();
        const [hours, minutes] = timeStr.split(":").map(Number);
        if (minutes === 0 || minutes === void 0) {
          return `${hours}h`;
        }
        return `${hours}h${String(minutes).padStart(2, "0")}`;
      }
      async getSchedulesByDate(date2) {
        const dateOnly = date2.split("T")[0];
        const assignments = await db.select({
          id: schedules.id,
          date: schedules.date,
          time: schedules.time,
          type: schedules.type,
          ministerId: schedules.ministerId,
          position: schedules.position,
          status: schedules.status,
          notes: schedules.notes,
          ministerName: users.name
        }).from(schedules).leftJoin(users, eq(schedules.ministerId, users.id)).where(eq(schedules.date, dateOnly)).orderBy(schedules.time, schedules.position);
        return assignments.map((a) => ({
          id: a.id,
          date: a.date,
          massTime: this.formatMassTime(a.time),
          type: a.type,
          ministerId: a.ministerId,
          ministerName: a.ministerName,
          position: a.position,
          status: a.status,
          confirmed: a.status === "approved",
          notes: a.notes
        }));
      }
      async getMonthAssignments(month, year) {
        const currentYear = year || (/* @__PURE__ */ new Date()).getFullYear();
        const currentMonth = month || (/* @__PURE__ */ new Date()).getMonth() + 1;
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const endDate = month === 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const scheduleId = `schedule-${currentYear}-${currentMonth}`;
        const rawAssignments = await db.select({
          id: schedules.id,
          ministerId: schedules.ministerId,
          ministerName: users.name,
          date: schedules.date,
          massTime: schedules.time,
          position: schedules.position,
          status: schedules.status
        }).from(schedules).leftJoin(users, eq(schedules.ministerId, users.id)).where(and(
          gte(schedules.date, startDate),
          lte(schedules.date, endDate)
        )).orderBy(schedules.date, schedules.time, schedules.position);
        return rawAssignments.map((a) => ({
          id: a.id,
          scheduleId,
          ministerId: a.ministerId,
          ministerName: a.ministerName,
          date: a.date,
          massTime: this.formatMassTime(a.massTime),
          position: a.position,
          confirmed: a.status === "approved"
        }));
      }
      async getMonthSubstitutions(month, year) {
        return [];
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
      async createPushSubscription(subscription) {
        await this.ensurePushSubscriptionTable();
        const [created] = await db.insert(pushSubscriptions).values(subscription).returning();
        return created;
      }
      async getPushSubscriptionByEndpoint(endpoint) {
        await this.ensurePushSubscriptionTable();
        const result = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1);
        return result[0];
      }
      async upsertPushSubscription(userId, subscription) {
        await this.ensurePushSubscriptionTable();
        const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint)).limit(1);
        if (existing.length > 0) {
          const [updated] = await db.update(pushSubscriptions).set({
            userId,
            authKey: subscription.keys.auth,
            p256dhKey: subscription.keys.p256dh,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(pushSubscriptions.id, existing[0].id)).returning();
          return updated;
        }
        const [created] = await db.insert(pushSubscriptions).values({
          userId,
          endpoint: subscription.endpoint,
          authKey: subscription.keys.auth,
          p256dhKey: subscription.keys.p256dh
        }).returning();
        return created;
      }
      async removePushSubscription(userId, endpoint) {
        await this.ensurePushSubscriptionTable();
        await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
      }
      async removePushSubscriptionByEndpoint(endpoint) {
        await this.ensurePushSubscriptionTable();
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
      async getPushSubscriptionsByUserIds(userIds) {
        await this.ensurePushSubscriptionTable();
        if (!userIds || userIds.length === 0) {
          return [];
        }
        const uniqueIds = Array.from(new Set(userIds));
        return await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, uniqueIds));
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
      async getFamilyPreference(userId) {
        const user = await this.getUser(userId);
        if (!user || !user.familyId) {
          return null;
        }
        const [family] = await db.select().from(families).where(eq(families.id, user.familyId));
        if (!family) {
          return null;
        }
        return {
          name: family.name,
          preferServeTogether: family.preferServeTogether ?? true
        };
      }
      async updateFamilyPreference(userId, preferServeTogether) {
        const user = await this.getUser(userId);
        if (!user || !user.familyId) {
          throw new Error("User has no family");
        }
        await db.update(families).set({ preferServeTogether }).where(eq(families.id, user.familyId));
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
      async getFormationOverview(userId) {
        const [tracks, modules, lessons] = await Promise.all([
          db.select().from(formationTracks).orderBy(formationTracks.orderIndex, formationTracks.title),
          db.select().from(formationModules).orderBy(formationModules.trackId, formationModules.orderIndex),
          db.select().from(formationLessons).orderBy(formationLessons.trackId, formationLessons.moduleId, formationLessons.lessonNumber)
        ]);
        const progressRecords = userId ? await db.select().from(formationLessonProgress).where(eq(formationLessonProgress.userId, userId)) : [];
        const progressMap = new Map(
          progressRecords.map((record) => [record.lessonId, record])
        );
        const lessonsByModule = /* @__PURE__ */ new Map();
        for (const lesson of lessons) {
          const lessonWithProgress = {
            ...lesson,
            progress: progressMap.get(lesson.id) ?? null
          };
          if (!lessonsByModule.has(lesson.moduleId)) {
            lessonsByModule.set(lesson.moduleId, []);
          }
          lessonsByModule.get(lesson.moduleId).push(lessonWithProgress);
        }
        const modulesByTrack = /* @__PURE__ */ new Map();
        for (const module of modules) {
          const moduleLessons = [...lessonsByModule.get(module.id) ?? []].sort(
            (a, b) => a.lessonNumber - b.lessonNumber
          );
          const completedLessons = moduleLessons.filter(
            (lesson) => lesson.progress?.status === "completed"
          ).length;
          const inProgressLessons = moduleLessons.filter(
            (lesson) => lesson.progress?.status === "in_progress"
          ).length;
          const totalLessons = moduleLessons.length;
          const progressPercentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
          const moduleEntry = {
            ...module,
            lessons: moduleLessons,
            stats: {
              totalLessons,
              completedLessons,
              inProgressLessons,
              progressPercentage
            }
          };
          if (!modulesByTrack.has(module.trackId)) {
            modulesByTrack.set(module.trackId, []);
          }
          modulesByTrack.get(module.trackId).push(moduleEntry);
        }
        const trackOverviews = tracks.map((track) => {
          const trackModules = modulesByTrack.get(track.id) ?? [];
          const totalModules = trackModules.length;
          const totalLessons = trackModules.reduce((acc, module) => acc + module.stats.totalLessons, 0);
          const completedLessons = trackModules.reduce(
            (acc, module) => acc + module.stats.completedLessons,
            0
          );
          const inProgressLessons = trackModules.reduce(
            (acc, module) => acc + module.stats.inProgressLessons,
            0
          );
          const progressPercentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
          const nextLesson = trackModules.flatMap((module) => module.lessons).find((lesson) => lesson.progress?.status !== "completed") ?? null;
          return {
            ...track,
            modules: trackModules,
            stats: {
              totalModules,
              totalLessons,
              completedLessons,
              inProgressLessons,
              progressPercentage
            },
            nextLesson
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
            inProgressLessons: 0
          }
        );
        const percentageCompleted = totals.totalLessons > 0 ? Math.round(totals.completedLessons / totals.totalLessons * 100) : 0;
        return {
          tracks: trackOverviews,
          summary: {
            totalTracks: trackOverviews.length,
            ...totals,
            percentageCompleted,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/utils/logger.ts
var SENSITIVE_KEYS, Logger, logger;
var init_logger = __esm({
  "server/utils/logger.ts"() {
    "use strict";
    SENSITIVE_KEYS = [
      "password",
      "passwordHash",
      "currentPassword",
      "newPassword",
      "tempPassword",
      "temporaryPassword",
      "token",
      "jwt",
      "secret",
      "apiKey",
      "privateKey",
      "authorization"
    ];
    Logger = class {
      logLevel;
      constructor() {
        this.logLevel = process.env.NODE_ENV === "production" ? 1 /* WARN */ : 3 /* DEBUG */;
      }
      shouldLog(level) {
        return level <= this.logLevel;
      }
      /**
       * Sanitiza dados sensíveis antes de logar
       */
      sanitize(data) {
        if (data === null || data === void 0) {
          return data;
        }
        if (typeof data !== "object") {
          return data;
        }
        if (Array.isArray(data)) {
          return data.map((item) => this.sanitize(item));
        }
        const sanitized = {};
        for (const key of Object.keys(data)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()));
          if (isSensitive) {
            sanitized[key] = "[REDACTED]";
          } else if (typeof data[key] === "object" && data[key] !== null) {
            sanitized[key] = this.sanitize(data[key]);
          } else {
            sanitized[key] = data[key];
          }
        }
        return sanitized;
      }
      formatMessage(level, message, context) {
        const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
        const baseMessage = `[${timestamp2}] [${level}] ${message}`;
        if (context && typeof context === "object") {
          const sanitizedContext = this.sanitize(context);
          return `${baseMessage} :: ${JSON.stringify(sanitizedContext)}`;
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

// server/utils/saintNameMatching.ts
import { eq as eq9 } from "drizzle-orm";
async function loadAllSaintsData() {
  if (saintsCache) {
    return saintsCache;
  }
  console.time("[PERF] Load all saints data");
  const allSaints = await db.select().from(saints);
  console.timeEnd("[PERF] Load all saints data");
  saintsCache = /* @__PURE__ */ new Map();
  for (const saint of allSaints) {
    const feastDay = saint.feastDay;
    if (!saintsCache.has(feastDay)) {
      saintsCache.set(feastDay, []);
    }
    saintsCache.get(feastDay).push(saint);
  }
  console.log(`[SAINT_CACHE] Loaded ${allSaints.length} saints indexed by ${saintsCache.size} feast days`);
  return saintsCache;
}
async function calculateSaintNameMatchBonus(ministerName, date2, saintsData) {
  try {
    const [year, month, day] = date2.split("-");
    const feastDay = `${month}-${day}`;
    const cache = saintsData || await loadAllSaintsData();
    const saintsForDay = cache.get(feastDay) || [];
    if (saintsForDay.length === 0) {
      return 0;
    }
    const normalizedMinisterName = ministerName.toLowerCase().trim();
    const ministerNameParts = normalizedMinisterName.split(" ");
    let bestMatchScore = 0;
    for (const saint of saintsForDay) {
      const saintName = saint.name.toLowerCase();
      const saintNameParts = saintName.split(" ");
      let matchScore = 0;
      let matchedParts = 0;
      for (const ministerPart of ministerNameParts) {
        if (ministerPart.length < 3) continue;
        for (const saintPart of saintNameParts) {
          if (saintPart.length < 3) continue;
          if (ministerPart === saintPart) {
            matchScore += 1;
            matchedParts++;
          } else if (ministerPart.includes(saintPart) || saintPart.includes(ministerPart)) {
            matchScore += 0.5;
            matchedParts++;
          } else if (calculateSimilarity(ministerPart, saintPart) > 0.7) {
            matchScore += 0.3;
            matchedParts++;
          }
        }
      }
      const normalizedScore = matchScore / Math.max(ministerNameParts.length, saintNameParts.length);
      let rankMultiplier = 1;
      switch (saint.rank) {
        case "SOLEMNITY":
          rankMultiplier = 1.5;
          break;
        case "FEAST":
          rankMultiplier = 1.3;
          break;
        case "MEMORIAL":
          rankMultiplier = 1.2;
          break;
      }
      const finalScore = Math.min(normalizedScore * rankMultiplier, 1);
      bestMatchScore = Math.max(bestMatchScore, finalScore);
      if (finalScore > 0.3) {
        console.log(
          `[SAINT_MATCH] "${ministerName}" matches "${saint.name}" (${saint.rank}): score ${finalScore.toFixed(2)}`
        );
      }
    }
    return bestMatchScore;
  } catch (error) {
    console.error("[SAINT_MATCH] Error calculating saint name match:", error);
    return 0;
  }
}
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) {
    return 1;
  }
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}
var saintsCache;
var init_saintNameMatching = __esm({
  async "server/utils/saintNameMatching.ts"() {
    "use strict";
    await init_db();
    init_schema();
    saintsCache = null;
  }
});

// server/utils/octoberMassValidator.ts
function validateOctoberMasses(masses) {
  const errors = [];
  masses.forEach((mass) => {
    if (!mass.date) return;
    const date2 = new Date(mass.date);
    const month = date2.getMonth() + 1;
    if (month !== 10) return;
    const dayOfWeek = date2.getDay();
    const dayOfMonth = date2.getDate();
    if (dayOfWeek === 6) {
      if (dayOfMonth > 7 && mass.time === "06:30" && mass.type === "missa_diaria") {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || "unknown",
          error: `Regular Saturday ${dayOfMonth} should have NO morning mass (only 1st Saturday has 6:30)`,
          severity: "ERROR"
        });
      }
      if ((dayOfMonth === 11 || dayOfMonth === 18) && mass.time === "06:30") {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || "unknown",
          error: `October ${dayOfMonth} is a regular Saturday - should have NO mass`,
          severity: "ERROR"
        });
      }
    }
    if (dayOfMonth >= 20 && dayOfMonth <= 27) {
      if (mass.time === "06:30") {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || "unknown",
          error: `October ${dayOfMonth} during novena should NOT have 6:30 morning mass (only evening novena)`,
          severity: "ERROR"
        });
      }
      if (mass.type === "missa_sao_judas") {
        if (dayOfWeek === 6 && mass.time !== "19:00") {
          errors.push({
            date: mass.date,
            time: mass.time,
            type: mass.type,
            error: `Novena Saturday (${dayOfMonth}) should be at 19:00, not ${mass.time}`,
            severity: "WARNING"
          });
        }
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && mass.time !== "19:30") {
          errors.push({
            date: mass.date,
            time: mass.time,
            type: mass.type,
            error: `Novena weekday (${dayOfMonth}) should be at 19:30, not ${mass.time}`,
            severity: "WARNING"
          });
        }
      }
    }
    if (dayOfMonth === 28 && mass.type === "missa_diaria") {
      errors.push({
        date: mass.date,
        time: mass.time,
        type: mass.type,
        error: `October 28 (St Jude Feast) should NOT have regular daily mass`,
        severity: "ERROR"
      });
    }
    if (dayOfWeek === 6 && dayOfMonth <= 7) {
      if (mass.time === "06:30" && mass.type !== "missa_imaculado_coracao") {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || "unknown",
          error: `1st Saturday should be Immaculate Heart mass, not ${mass.type}`,
          severity: "WARNING"
        });
      }
    }
  });
  return errors;
}
function validateAndLogOctoberMasses(masses, year) {
  const octoberMasses = masses.filter((m) => {
    if (!m.date) return false;
    const date2 = new Date(m.date);
    return date2.getMonth() + 1 === 10 && date2.getFullYear() === year;
  });
  if (octoberMasses.length === 0) {
    console.log("[OCT_VALIDATION] No October masses to validate");
    return true;
  }
  console.log(`
[OCT_VALIDATION] \u{1F4CB} Validating ${octoberMasses.length} October masses...`);
  const errors = validateOctoberMasses(octoberMasses);
  if (errors.length === 0) {
    console.log("[OCT_VALIDATION] \u2705 All October masses are VALID!");
    return true;
  }
  console.log(`[OCT_VALIDATION] \u274C Found ${errors.length} validation issues:
`);
  const errorList = errors.filter((e) => e.severity === "ERROR");
  const warningList = errors.filter((e) => e.severity === "WARNING");
  if (errorList.length > 0) {
    console.log(`[OCT_VALIDATION] \u{1F6A8} ERRORS (${errorList.length}):`);
    errorList.forEach((err, idx) => {
      console.log(`[OCT_VALIDATION]   ${idx + 1}. ${err.date} ${err.time} (${err.type})`);
      console.log(`[OCT_VALIDATION]      ${err.error}`);
    });
    console.log("");
  }
  if (warningList.length > 0) {
    console.log(`[OCT_VALIDATION] \u26A0\uFE0F  WARNINGS (${warningList.length}):`);
    warningList.forEach((err, idx) => {
      console.log(`[OCT_VALIDATION]   ${idx + 1}. ${err.date} ${err.time} (${err.type})`);
      console.log(`[OCT_VALIDATION]      ${err.error}`);
    });
    console.log("");
  }
  return errorList.length === 0;
}
function printOctoberScheduleComparison(masses, year) {
  const octoberMasses = masses.filter((m) => {
    if (!m.date) return false;
    const date2 = new Date(m.date);
    return date2.getMonth() + 1 === 10 && date2.getFullYear() === year;
  });
  console.log("\n[OCT_VALIDATION] \u{1F4C5} OCTOBER SCHEDULE COMPARISON:");
  console.log("[OCT_VALIDATION] ================================================\n");
  const massesByDate = /* @__PURE__ */ new Map();
  octoberMasses.forEach((mass) => {
    if (!mass.date) return;
    if (!massesByDate.has(mass.date)) {
      massesByDate.set(mass.date, []);
    }
    massesByDate.get(mass.date).push(mass);
  });
  const sortedDates = Array.from(massesByDate.keys()).sort();
  sortedDates.forEach((date2) => {
    const masses2 = massesByDate.get(date2).sort((a, b) => a.time.localeCompare(b.time));
    const dateObj = new Date(date2);
    const day = dateObj.getDate();
    const dayOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b"][dateObj.getDay()];
    console.log(`[OCT_VALIDATION] Oct ${day.toString().padStart(2, "0")} (${dayOfWeek}):`);
    if (masses2.length === 0) {
      console.log(`[OCT_VALIDATION]   (no masses)`);
    } else {
      masses2.forEach((mass) => {
        const typeLabel = mass.type || "unknown";
        console.log(`[OCT_VALIDATION]   ${mass.time} - ${typeLabel}`);
      });
    }
  });
  console.log("\n[OCT_VALIDATION] ================================================\n");
}
var init_octoberMassValidator = __esm({
  "server/utils/octoberMassValidator.ts"() {
    "use strict";
  }
});

// server/utils/scheduleGenerator.ts
var scheduleGenerator_exports = {};
__export(scheduleGenerator_exports, {
  ScheduleGenerator: () => ScheduleGenerator,
  generateAutomaticSchedule: () => generateAutomaticSchedule
});
import { eq as eq10, and as and7, or as or5, sql as sql4, ne as ne2 } from "drizzle-orm";
import { format as format2, addDays, startOfMonth, endOfMonth, getDay as getDay2, getDate, isSaturday, isFriday, isThursday } from "date-fns";
async function generateAutomaticSchedule(year, month, isPreview = false) {
  const generator = new ScheduleGenerator();
  return await generator.generateScheduleForMonth(year, month, isPreview);
}
var ScheduleGenerator;
var init_scheduleGenerator = __esm({
  async "server/utils/scheduleGenerator.ts"() {
    "use strict";
    init_logger();
    init_schema();
    await init_saintNameMatching();
    init_octoberMassValidator();
    console.log("\u{1F680} [SCHEDULE_GENERATOR] M\xD3DULO CARREGADO - VERS\xC3O COM FAIR ALGORITHM! Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
    ScheduleGenerator = class {
      ministers = [];
      availabilityData = /* @__PURE__ */ new Map();
      massTimes = [];
      db;
      dailyAssignments = /* @__PURE__ */ new Map();
      // Rastrear ministros já escalados por dia
      saintBonusCache = /* @__PURE__ */ new Map();
      // Cache de bônus de santo: "ministerId:date" -> score
      saintsData = null;
      // Cache de santos: "MM-DD" -> saints[]
      familyGroups = /* @__PURE__ */ new Map();
      // Family ID -> list of minister IDs
      familyPreferences = /* @__PURE__ */ new Map();
      // Family ID -> prefer_serve_together
      /**
       * Gera escalas automaticamente para um mês específico
       */
      async generateScheduleForMonth(year, month, isPreview = false) {
        const startTime = Date.now();
        console.log(`
${"=".repeat(60)}`);
        console.log(`=== \u{1F680} GENERATION START ===`);
        console.log(`${"=".repeat(60)}`);
        console.log(`Month: ${month}, Year: ${year}, IsPreview: ${isPreview}`);
        console.log(`Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
        console.log(`Environment: ${process.env.NODE_ENV || "unknown"}`);
        console.log(`${"=".repeat(60)}
`);
        console.time("[PERF] Total generation time");
        console.time("[PERF] Database initialization");
        const { db: db2 } = await init_db().then(() => db_exports);
        this.db = db2;
        console.timeEnd("[PERF] Database initialization");
        console.log(`\u2705 Database initialized in ${Date.now() - startTime}ms`);
        this.dailyAssignments = /* @__PURE__ */ new Map();
        this.saintBonusCache = /* @__PURE__ */ new Map();
        logger.info(`Iniciando gera\xE7\xE3o ${isPreview ? "de preview" : "definitiva"} de escalas para ${month}/${year}`);
        try {
          console.time("[PERF] Step 1: Load ministers");
          console.log(`
[STEP 1] \u{1F4CB} Loading ministers data...`);
          await this.loadMinistersData();
          console.timeEnd("[PERF] Step 1: Load ministers");
          console.log(`
[VALIDATION] Ministers loaded:`, {
            count: this.ministers.length,
            hasData: this.ministers.length > 0,
            sample: this.ministers.slice(0, 3).map((m) => ({ id: m.id, name: m.name, role: m.role }))
          });
          if (!this.ministers || this.ministers.length === 0) {
            const error = new Error("\u274C CRITICAL: No ministers found in database! Cannot generate schedules without ministers.");
            console.error(`
${"!".repeat(60)}`);
            console.error(error.message);
            console.error(`${"!".repeat(60)}
`);
            throw error;
          }
          console.time("[PERF] Step 2: Load availability");
          console.log(`
[STEP 2] \u{1F4DD} Loading availability/questionnaire data for ${month}/${year}...`);
          await this.loadAvailabilityData(year, month, isPreview);
          console.timeEnd("[PERF] Step 2: Load availability");
          console.log(`
[VALIDATION] Questionnaire responses loaded:`, {
            count: this.availabilityData.size,
            hasData: this.availabilityData.size > 0,
            ministerIds: Array.from(this.availabilityData.keys()).slice(0, 5)
          });
          if (!this.availabilityData || this.availabilityData.size === 0) {
            const warning = `\u26A0\uFE0F  WARNING: No questionnaire responses found for ${month}/${year}! Schedules will use default availability.`;
            console.warn(`
${warning}`);
            if (!isPreview) {
              const error = new Error(`\u274C CRITICAL: No questionnaire responses for ${month}/${year}. Cannot generate final schedules without responses!`);
              console.error(`
${"!".repeat(60)}`);
              console.error(error.message);
              console.error(`${"!".repeat(60)}
`);
              throw error;
            }
          }
          console.time("[PERF] Step 3: Load mass times config");
          console.log(`
[STEP 3] \u26EA Loading mass times configuration...`);
          await this.loadMassTimesConfig();
          console.timeEnd("[PERF] Step 3: Load mass times config");
          console.log(`
[VALIDATION] Mass times config:`, {
            count: this.massTimes.length,
            hasData: this.massTimes.length > 0,
            sample: this.massTimes.slice(0, 2)
          });
          if (!this.massTimes || this.massTimes.length === 0) {
            const error = new Error("\u274C CRITICAL: No mass times configuration found! Cannot generate schedules without mass config.");
            console.error(`
${"!".repeat(60)}`);
            console.error(error.message);
            console.error(`${"!".repeat(60)}
`);
            throw error;
          }
          console.time("[PERF] Generate monthly mass times");
          console.log(`
[STEP 4] \u{1F4C5} Generating monthly mass times for ${month}/${year}...`);
          const monthlyMassTimes = this.generateMonthlyMassTimes(year, month);
          console.timeEnd("[PERF] Generate monthly mass times");
          console.log(`
[VALIDATION] Monthly masses generated:`, {
            count: monthlyMassTimes.length,
            types: [...new Set(monthlyMassTimes.map((m) => m.type))],
            dateRange: monthlyMassTimes.length > 0 ? {
              first: monthlyMassTimes[0]?.date,
              last: monthlyMassTimes[monthlyMassTimes.length - 1]?.date
            } : null
          });
          if (!monthlyMassTimes || monthlyMassTimes.length === 0) {
            const error = new Error(`\u274C CRITICAL: Failed to generate monthly mass times for ${month}/${year}!`);
            console.error(`
${"!".repeat(60)}`);
            console.error(error.message);
            console.error(`${"!".repeat(60)}
`);
            throw error;
          }
          if (month === 10) {
            console.log(`
[SCHEDULE_GEN] \u{1F50D} Validating October mass schedule...`);
            printOctoberScheduleComparison(monthlyMassTimes, year);
            const isValid = validateAndLogOctoberMasses(monthlyMassTimes, year);
            if (!isValid) {
              console.log(`[SCHEDULE_GEN] \u26A0\uFE0F October validation found errors, but continuing with generation...`);
            }
          }
          console.time("[PERF] Load all saints data");
          try {
            this.saintsData = await loadAllSaintsData();
            console.log(`[SCHEDULE_GEN] \u2705 Saints data loaded successfully`);
          } catch (error) {
            console.log(`[SCHEDULE_GEN] \u26A0\uFE0F Saints table not found, skipping saint name bonuses`);
            this.saintsData = null;
          }
          console.timeEnd("[PERF] Load all saints data");
          if (this.saintsData) {
            console.time("[PERF] Pre-calculate saint bonuses");
            console.log(`[SCHEDULE_GEN] Step 2.6: Pre-calculating saint name bonuses...`);
            await this.preCalculateSaintBonuses(monthlyMassTimes);
            console.timeEnd("[PERF] Pre-calculate saint bonuses");
            console.log(`[SCHEDULE_GEN] Saint bonuses calculated: ${this.saintBonusCache.size} entries`);
          } else {
            console.log(`[SCHEDULE_GEN] Skipping saint bonuses (saints table not available)`);
          }
          console.time("[PERF] Algorithm distribution");
          const generatedSchedules = [];
          for (const massTime of monthlyMassTimes) {
            const schedule = await this.generateScheduleForMass(massTime);
            generatedSchedules.push(schedule);
          }
          console.timeEnd("[PERF] Algorithm distribution");
          console.time("[PERF] Analyze incomplete schedules");
          const incompleteSchedules = generatedSchedules.filter(
            (s) => s.ministers.length < s.massTime.minMinisters
          );
          console.timeEnd("[PERF] Analyze incomplete schedules");
          if (incompleteSchedules.length > 0) {
            console.log(`
[SCHEDULE_GEN] \u26A0\uFE0F ATEN\xC7\xC3O: ${incompleteSchedules.length} escalas incompletas detectadas:`);
            console.log(`[SCHEDULE_GEN] =========================================================`);
            incompleteSchedules.forEach((s) => {
              const shortage = s.massTime.minMinisters - s.ministers.length;
              console.log(`[SCHEDULE_GEN] \u{1F6A8} ${s.massTime.date} ${s.massTime.time} (${s.massTime.type})`);
              console.log(`[SCHEDULE_GEN]    Ministros: ${s.ministers.length}/${s.massTime.minMinisters} (faltam ${shortage})`);
              console.log(`[SCHEDULE_GEN]    Confian\xE7a: ${(s.confidence * 100).toFixed(0)}%`);
            });
            const byType = incompleteSchedules.reduce((acc, s) => {
              const type = s.massTime.type || "outros";
              if (!acc[type]) acc[type] = { count: 0, totalShortage: 0 };
              acc[type].count++;
              acc[type].totalShortage += s.massTime.minMinisters - s.ministers.length;
              return acc;
            }, {});
            console.log(`
[SCHEDULE_GEN] \u{1F4CA} RESUMO POR TIPO DE MISSA:`);
            Object.entries(byType).forEach(([type, data]) => {
              console.log(`[SCHEDULE_GEN]    ${type}: ${data.count} escalas incompletas, faltam ${data.totalShortage} ministros no total`);
            });
            console.log(`[SCHEDULE_GEN] =========================================================
`);
            logger.warn(`${incompleteSchedules.length} escalas incompletas detectadas para ${month}/${year}`);
          } else {
            console.log(`[SCHEDULE_GEN] \u2705 Todas as escalas atingiram o n\xFAmero m\xEDnimo de ministros!`);
          }
          console.timeEnd("[PERF] Total generation time");
          const totalTime = Date.now() - startTime;
          console.log(`
${"=".repeat(60)}`);
          console.log(`=== \u2705 GENERATION SUCCESS ===`);
          console.log(`${"=".repeat(60)}`);
          console.log(`Month/Year: ${month}/${year}`);
          console.log(`Total Time: ${totalTime}ms (${(totalTime / 1e3).toFixed(2)}s)`);
          console.log(`Target: <5000ms | Status: ${totalTime < 5e3 ? "\u2705 PASS" : "\u26A0\uFE0F  SLOW"}`);
          console.log(`
\u{1F4CA} DATA SUMMARY:`);
          console.log(`  Ministers loaded: ${this.ministers.length}`);
          console.log(`  Questionnaire responses: ${this.availabilityData.size}`);
          console.log(`  Mass times config: ${this.massTimes.length}`);
          console.log(`  Monthly masses generated: ${monthlyMassTimes?.length || 0}`);
          console.log(`  Schedules generated: ${generatedSchedules.length}`);
          console.log(`  Incomplete schedules: ${incompleteSchedules?.length || 0}`);
          console.log(`  Saint bonuses calculated: ${this.saintBonusCache.size}`);
          console.log(`
\u{1F3AF} FAIRNESS REPORT:`);
          const distributionMap = /* @__PURE__ */ new Map();
          this.ministers.forEach((m) => {
            const count8 = m.monthlyAssignmentCount || 0;
            if (!distributionMap.has(count8)) {
              distributionMap.set(count8, []);
            }
            distributionMap.get(count8).push(m);
          });
          console.log(`  Assignment Distribution:`);
          for (let i = 0; i <= 4; i++) {
            const ministersWithCount = distributionMap.get(i) || [];
            const percentage = (ministersWithCount.length / this.ministers.length * 100).toFixed(1);
            console.log(`    ${i} assignments: ${ministersWithCount.length} ministers (${percentage}%)`);
          }
          const unused = distributionMap.get(0) || [];
          const maxUsed = distributionMap.get(4) || [];
          const fairnessScore = ((this.ministers.length - unused.length) / this.ministers.length * 100).toFixed(1);
          console.log(`
  Fairness Metrics:`);
          console.log(`    \u2705 Unused ministers: ${unused.length}/${this.ministers.length} (${(unused.length / this.ministers.length * 100).toFixed(1)}%)`);
          console.log(`    \u2705 Ministers at max (4): ${maxUsed.length}/${this.ministers.length}`);
          console.log(`    \u2705 Fairness score: ${fairnessScore}% (${100 - unused.length / this.ministers.length * 100 > 70 ? "PASS" : "FAIL"})`);
          const bugsFound = [];
          const ministersOver4 = this.ministers.filter((m) => (m.monthlyAssignmentCount || 0) > 4);
          if (ministersOver4.length > 0) {
            console.log(`
  \u{1F4CA} Ministers with 5+ assignments (mostly daily masses):`);
            console.log(`    \u2139\uFE0F  ${ministersOver4.length} ministers served 5+ times (expected for daily mass volunteers)`);
          }
          if (unused.length > this.ministers.length * 0.5) {
            bugsFound.push(`\u274C More than 50% unused (${unused.length}/${this.ministers.length})`);
          }
          if (bugsFound.length > 0) {
            console.log(`
  \u{1F6A8} POTENTIAL ISSUES:`);
            bugsFound.forEach((bug) => console.log(`    ${bug}`));
          } else {
            console.log(`
  \u2705 NO CRITICAL ISSUES DETECTED!`);
          }
          console.log(`${"=".repeat(60)}
`);
          logger.info(`Geradas ${generatedSchedules.length} escalas para ${month}/${year} em ${totalTime}ms`);
          return generatedSchedules;
        } catch (error) {
          const totalTime = Date.now() - startTime;
          console.log(`
${"!".repeat(60)}`);
          console.log(`=== \u274C GENERATION FAILED ===`);
          console.log(`${"!".repeat(60)}`);
          console.log(`Month/Year: ${month}/${year}`);
          console.log(`Failed After: ${totalTime}ms (${(totalTime / 1e3).toFixed(2)}s)`);
          console.log(`
\u{1F50D} ERROR DETAILS:`);
          console.log(`  Type: ${typeof error}`);
          console.log(`  Name: ${error?.name || "Unknown"}`);
          console.log(`  Message: ${error?.message || "No message"}`);
          console.log(`
\u{1F4CA} DATA STATE WHEN FAILED:`);
          console.log(`  Ministers loaded: ${this.ministers?.length || 0}`);
          console.log(`  Questionnaire responses: ${this.availabilityData?.size || 0}`);
          console.log(`  Mass times config: ${this.massTimes?.length || 0}`);
          console.log(`
\u{1F4DA} STACK TRACE:`);
          console.log(error?.stack || "No stack trace available");
          console.log(`${"!".repeat(60)}
`);
          console.timeEnd("[PERF] Total generation time");
          logger.error("Erro ao gerar escalas autom\xE1ticas:", error);
          throw error;
        }
      }
      /**
       * Carrega dados dos ministros do banco
       */
      async loadMinistersData() {
        if (!this.db) {
          const isProduction2 = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || !!process.env.REPL_SLUG && !process.env.DATABASE_URL;
          if (isProduction2) {
            throw new Error("Banco de dados indispon\xEDvel. N\xE3o \xE9 poss\xEDvel gerar escalas sem dados reais dos ministros.");
          }
          logger.warn("Database n\xE3o dispon\xEDvel, criando dados mock para preview em desenvolvimento");
          console.log("[SCHEDULE_GEN] Creating mock ministers data for development preview only");
          this.ministers = [
            { id: "1", name: "Jo\xE3o Silva", role: "ministro", totalServices: 5, lastService: null, preferredTimes: ["10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.8, preferenceScore: 0.7, monthlyAssignmentCount: 0, lastAssignedDate: void 0 },
            { id: "2", name: "Maria Santos", role: "ministro", totalServices: 3, lastService: null, preferredTimes: ["08:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.9, preferenceScore: 0.8, monthlyAssignmentCount: 0, lastAssignedDate: void 0 },
            { id: "3", name: "Pedro Costa", role: "ministro", totalServices: 4, lastService: null, preferredTimes: ["19:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.7, preferenceScore: 0.6, monthlyAssignmentCount: 0, lastAssignedDate: void 0 },
            { id: "4", name: "Ana Lima", role: "ministro", totalServices: 2, lastService: null, preferredTimes: ["10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.85, preferenceScore: 0.75, monthlyAssignmentCount: 0, lastAssignedDate: void 0 },
            { id: "5", name: "Carlos Oliveira", role: "coordenador", totalServices: 6, lastService: null, preferredTimes: ["08:00", "10:00"], canServeAsCouple: false, spouseMinisterId: null, availabilityScore: 0.95, preferenceScore: 0.9, monthlyAssignmentCount: 0, lastAssignedDate: void 0 }
          ];
          return;
        }
        console.log(`[SCHEDULE_GEN] About to query ministers data...`);
        let ministersData;
        try {
          console.log(`[SCHEDULE_GEN] Tentando query simples first...`);
          const simpleQuery = await this.db.select({ id: users.id, name: users.name }).from(users).limit(1);
          console.log(`[SCHEDULE_GEN] Simple query OK, found ${simpleQuery.length} users`);
          ministersData = await this.db.select({
            id: users.id,
            name: users.name,
            role: users.role,
            totalServices: users.totalServices,
            lastService: users.lastService,
            preferredTimes: users.preferredTimes,
            canServeAsCouple: users.canServeAsCouple,
            spouseMinisterId: users.spouseMinisterId,
            familyId: users.familyId
          }).from(users).where(
            and7(
              or5(
                eq10(users.status, "active"),
                sql4`${users.status} IS NULL`
                // Incluir usuários com status null
              ),
              ne2(users.role, "gestor")
              // Excluir gestores das escalas
            )
          );
          console.log(`[SCHEDULE_GEN] Query successful, found ${ministersData.length} ministers`);
        } catch (queryError) {
          console.error(`[SCHEDULE_GEN] \u274C QUERY ERROR:`, queryError);
          console.error(`[SCHEDULE_GEN] \u274C QUERY ERROR STACK:`, queryError.stack);
          throw new Error(`Erro na consulta de ministros: ${queryError.message || queryError}`);
        }
        this.ministers = ministersData.map((m) => ({
          ...m,
          totalServices: m.totalServices || 0,
          preferredTimes: m.preferredTimes || [],
          canServeAsCouple: m.canServeAsCouple || false,
          familyId: m.familyId || null,
          availabilityScore: this.calculateAvailabilityScore(m),
          preferenceScore: this.calculatePreferenceScore(m),
          // 🔥 FAIR ALGORITHM: Initialize monthly counters
          monthlyAssignmentCount: 0,
          lastAssignedDate: void 0
        }));
        await this.loadFamilyData();
        console.log(`[FAIR_ALGORITHM] \u2705 Initialized ${this.ministers.length} ministers with monthlyAssignmentCount = 0`);
        logger.info(`Carregados ${this.ministers.length} ministros ativos`);
      }
      /**
       * 👨‍👩‍👧‍👦 FAMILY SYSTEM: Load family relationships and preferences
       *
       * Groups ministers by family and loads their preferences.
       * When preferServeTogether is true (default), families are assigned to serve together.
       * When preferServeTogether is false, family members can serve on different days.
       */
      async loadFamilyData() {
        this.familyGroups.clear();
        this.familyPreferences.clear();
        for (const minister of this.ministers) {
          if (minister.familyId) {
            if (!this.familyGroups.has(minister.familyId)) {
              this.familyGroups.set(minister.familyId, []);
            }
            this.familyGroups.get(minister.familyId).push(minister.id);
          }
        }
        const uniqueFamilyIds = Array.from(this.familyGroups.keys());
        if (uniqueFamilyIds.length > 0) {
          const familiesData = await this.db.select({
            id: families.id,
            name: families.name,
            preferServeTogether: families.preferServeTogether
          }).from(families).where(sql4`${families.id} = ANY(${uniqueFamilyIds})`);
          for (const family of familiesData) {
            this.familyPreferences.set(family.id, family.preferServeTogether ?? true);
          }
        }
        const familyCount = this.familyGroups.size;
        const membersCount = Array.from(this.familyGroups.values()).reduce((sum, members) => sum + members.length, 0);
        console.log(`[FAMILY_SYSTEM] \u2705 Loaded ${familyCount} families with ${membersCount} total members`);
        for (const [familyId, memberIds] of this.familyGroups.entries()) {
          const memberNames = memberIds.map((id) => this.ministers.find((m) => m.id === id)?.name).filter(Boolean).join(", ");
          const preferTogether = this.familyPreferences.get(familyId) ?? true;
          const preferenceText = preferTogether ? "(prefer together)" : "(prefer separate)";
          console.log(`[FAMILY_SYSTEM] Family ${familyId.substring(0, 8)}: ${memberNames} ${preferenceText}`);
        }
      }
      /**
       * 🔄 COMPATIBILITY LAYER: Adapter for October 2025 questionnaire format
       *
       * October 2025 uses array format: [{questionId: "...", answer: "..."}]
       * Future questionnaires will use different formats
       *
       * This adapter reads the existing October data WITHOUT modifying the database
       */
      adaptQuestionnaireResponse(response, questionnaireYear, questionnaireMonth) {
        console.log(`[COMPATIBILITY_LAYER] Adapting response for ${questionnaireMonth}/${questionnaireYear}`);
        let availableSundays = [];
        let preferredMassTimes = [];
        let alternativeTimes = [];
        let dailyMassAvailability = [];
        let canSubstitute = false;
        let specialEvents = {};
        const weekdayMasses = [];
        let responsesData = response.responses;
        if (typeof responsesData === "string") {
          try {
            responsesData = JSON.parse(responsesData);
          } catch (parseError) {
            console.error(`[COMPATIBILITY_LAYER] \u274C Failed to parse responses JSON for user ${response.userId}:`, parseError);
            responsesData = null;
          }
        }
        const isV2Format = responsesData && typeof responsesData === "object" && responsesData.format_version === "2.0";
        if (isV2Format) {
          console.log(`[COMPATIBILITY_LAYER] \u{1F3AF} Processing v2.0 STANDARDIZED format for ${questionnaireMonth}/${questionnaireYear}`);
          try {
            const data = responsesData;
            const sundayDates = [];
            const masses = data.masses || {};
            const normalizeTimeValue = (time2) => {
              if (!time2) return time2;
              if (/^\d{1,2}:\d{2}$/.test(time2)) {
                const [hours, minutes] = time2.split(":");
                return `${hours.padStart(2, "0")}:${minutes}`;
              }
              if (/^\d{1,2}h/.test(time2)) {
                const [hours, minutesPart] = time2.split("h");
                const hoursPad = hours.padStart(2, "0");
                const minutes = minutesPart ? minutesPart.padStart(2, "0") : "00";
                return `${hoursPad}:${minutes}`;
              }
              return time2;
            };
            Object.entries(masses).forEach(([date2, times]) => {
              if (times && typeof times === "object") {
                Object.entries(times).forEach(([time2, available]) => {
                  const isAvailable = available === true || available === "Sim" || available === "sim" || available === "true" || available === 1;
                  if (!isAvailable) return;
                  const normalizedTime = normalizeTimeValue(time2);
                  const dateTimeKey = `${date2} ${normalizedTime}`;
                  const dayOfWeek = (/* @__PURE__ */ new Date(`${date2}T00:00:00`)).getDay();
                  if (dayOfWeek === 0) {
                    sundayDates.push(dateTimeKey);
                  } else {
                    weekdayMasses.push(dateTimeKey);
                  }
                });
              }
            });
            availableSundays = sundayDates;
            const timeCount = {};
            Object.values(masses).forEach((timesForDate) => {
              if (timesForDate && typeof timesForDate === "object") {
                Object.entries(timesForDate).forEach(([time2, available]) => {
                  if (available === true || available === "Sim" || available === "sim" || available === "true" || available === 1) {
                    timeCount[time2] = (timeCount[time2] || 0) + 1;
                  }
                });
              }
            });
            preferredMassTimes = Object.keys(timeCount).sort((a, b) => timeCount[b] - timeCount[a]);
            const weekdayAvailabilitySet = /* @__PURE__ */ new Set();
            const addWeekdayAvailability = (identifier) => {
              if (!identifier) return;
              const normalized = identifier.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const map = {
                "mon": "Segunda",
                "monday": "Segunda",
                "segunda": "Segunda",
                "segunda-feira": "Segunda",
                "seg": "Segunda",
                "tue": "Ter\xE7a",
                "tuesday": "Ter\xE7a",
                "terca": "Ter\xE7a",
                "ter\xE7a": "Ter\xE7a",
                "terca-feira": "Ter\xE7a",
                "ter\xE7a-feira": "Ter\xE7a",
                "ter": "Ter\xE7a",
                "wed": "Quarta",
                "wednesday": "Quarta",
                "quarta": "Quarta",
                "quarta-feira": "Quarta",
                "qua": "Quarta",
                "thu": "Quinta",
                "thursday": "Quinta",
                "quinta": "Quinta",
                "quinta-feira": "Quinta",
                "qui": "Quinta",
                "fri": "Sexta",
                "friday": "Sexta",
                "sexta": "Sexta",
                "sexta-feira": "Sexta",
                "sex": "Sexta",
                "sat": "S\xE1bado",
                "saturday": "S\xE1bado",
                "sabado": "S\xE1bado",
                "s\xE1bado": "S\xE1bado",
                "sab": "S\xE1bado"
              };
              if (map[normalized]) {
                weekdayAvailabilitySet.add(map[normalized]);
                return;
              }
              if (["all", "todos", "todas", "weekdays", "all_weekdays", "todos_os_dias"].includes(normalized)) {
                ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"].forEach((label) => weekdayAvailabilitySet.add(label));
              }
            };
            const processWeekdayStructure = (value, keyHint) => {
              if (Array.isArray(value)) {
                value.forEach((entry) => addWeekdayAvailability(entry));
                return;
              }
              if (typeof value === "boolean") {
                if (value === true && keyHint) addWeekdayAvailability(keyHint);
                return;
              }
              if (typeof value === "string") {
                const normalizedValue = value.trim().toLowerCase();
                if (["true", "sim", "yes", "1"].includes(normalizedValue)) {
                  if (keyHint) {
                    addWeekdayAvailability(keyHint);
                  }
                } else {
                  addWeekdayAvailability(value);
                }
                return;
              }
              if (value && typeof value === "object") {
                if (Array.isArray(value.selectedOptions)) {
                  value.selectedOptions.forEach((entry) => addWeekdayAvailability(entry));
                }
                if (Array.isArray(value.options)) {
                  value.options.forEach((entry) => addWeekdayAvailability(entry));
                }
                Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                  processWeekdayStructure(nestedValue, nestedKey);
                });
              }
            };
            const weekdaysData = data.weekdays;
            if (weekdaysData !== void 0 && weekdaysData !== null) {
              processWeekdayStructure(weekdaysData);
            }
            const legacyWeekdayKeys = [
              "weekday_06:30",
              "weekday_6:30",
              "weekday_0630",
              "weekday0630"
            ];
            legacyWeekdayKeys.forEach((key) => {
              const value = data?.[key] ?? data?.availability?.[key];
              if (value !== void 0) {
                processWeekdayStructure(value);
              }
            });
            const orderedWeekdayLabels = ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
            dailyMassAvailability = orderedWeekdayLabels.filter((label) => weekdayAvailabilitySet.has(label));
            const specialEventsData = data.special_events || {};
            Object.assign(specialEvents, specialEventsData);
            canSubstitute = data.can_substitute === true;
            console.log(`[COMPATIBILITY_LAYER] \u2705 v2.0 parsed: ${availableSundays.length} sunday slots, ${weekdayMasses.length} weekday slots, ${Object.keys(specialEvents).length} special events`);
          } catch (error) {
            console.error(`[COMPATIBILITY_LAYER] \u274C Error parsing v2.0:`, error);
          }
        } else if (questionnaireMonth === 10 && questionnaireYear === 2025 && Array.isArray(responsesData)) {
          try {
            console.log(`[COMPATIBILITY_LAYER] \u2705 October 2025 using LEGACY array format`);
            const responsesArray = responsesData;
            responsesArray.forEach((item) => {
              switch (item.questionId) {
                case "available_sundays":
                  availableSundays = Array.isArray(item.answer) ? item.answer : [];
                  break;
                case "main_service_time":
                  preferredMassTimes = item.answer ? [item.answer] : [];
                  break;
                case "other_times_available":
                  if (item.answer && item.answer !== "N\xE3o") {
                    if (typeof item.answer === "object" && item.answer.selectedOptions) {
                      alternativeTimes = item.answer.selectedOptions;
                    } else if (Array.isArray(item.answer)) {
                      alternativeTimes = item.answer;
                    } else if (typeof item.answer === "string") {
                      alternativeTimes = [item.answer];
                    }
                  }
                  break;
                case "can_substitute":
                  canSubstitute = item.answer === "Sim" || item.answer === true;
                  break;
                case "daily_mass_availability":
                  if (item.answer && item.answer !== "N\xE3o posso" && item.answer !== "N\xE3o") {
                    if (typeof item.answer === "object" && item.answer.selectedOptions) {
                      dailyMassAvailability = item.answer.selectedOptions;
                    } else if (item.answer === "Sim") {
                      dailyMassAvailability = ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
                    } else if (Array.isArray(item.answer)) {
                      dailyMassAvailability = item.answer;
                    } else if (typeof item.answer === "string") {
                      dailyMassAvailability = [item.answer];
                    }
                  }
                  break;
                // Novena de São Judas
                case "saint_judas_novena":
                  if (Array.isArray(item.answer)) {
                    specialEvents[item.questionId] = item.answer;
                  } else if (item.answer === "Nenhum dia") {
                    specialEvents[item.questionId] = [];
                  } else {
                    specialEvents[item.questionId] = item.answer ? [item.answer] : [];
                  }
                  break;
                // Special event masses
                case "healing_liberation_mass":
                case "sacred_heart_mass":
                case "immaculate_heart_mass":
                case "saint_judas_feast_7h":
                case "saint_judas_feast_10h":
                case "saint_judas_feast_12h":
                case "saint_judas_feast_15h":
                case "saint_judas_feast_17h":
                case "saint_judas_feast_evening":
                case "adoration_monday":
                  specialEvents[item.questionId] = item.answer;
                  break;
              }
            });
            console.log(`[COMPATIBILITY_LAYER] \u2705 October 2025 format parsed successfully`);
            console.log(`[COMPATIBILITY_LAYER]    - Sundays: ${availableSundays.length}`);
            console.log(`[COMPATIBILITY_LAYER]    - Preferred times: ${preferredMassTimes.length}`);
            console.log(`[COMPATIBILITY_LAYER]    - Can substitute: ${canSubstitute}`);
          } catch (error) {
            console.error(`[COMPATIBILITY_LAYER] \u274C Error parsing October 2025 format:`, error);
          }
        } else {
          console.log(`[COMPATIBILITY_LAYER] \u26A0\uFE0F Unknown format for ${questionnaireMonth}/${questionnaireYear}`);
          console.log(`[COMPATIBILITY_LAYER] \u2139\uFE0F Add new format parser here when questionnaire structure changes`);
        }
        if (!availableSundays.length && response.availableSundays) {
          availableSundays = typeof response.availableSundays === "string" ? JSON.parse(response.availableSundays) : response.availableSundays;
          console.log(`[COMPATIBILITY_LAYER] \u2139\uFE0F Used fallback availableSundays field`);
        }
        if (!preferredMassTimes.length && response.preferredMassTimes) {
          preferredMassTimes = typeof response.preferredMassTimes === "string" ? JSON.parse(response.preferredMassTimes) : response.preferredMassTimes;
          console.log(`[COMPATIBILITY_LAYER] \u2139\uFE0F Used fallback preferredMassTimes field`);
        }
        return {
          availableSundays,
          preferredMassTimes,
          alternativeTimes,
          dailyMassAvailability,
          canSubstitute,
          specialEvents,
          weekdayMasses
        };
      }
      /**
       * Carrega dados de disponibilidade dos questionários
       */
      async loadAvailabilityData(year, month, isPreview = false) {
        if (!this.db) {
          const isProduction2 = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || !!process.env.REPL_SLUG && !process.env.DATABASE_URL;
          if (isProduction2) {
            throw new Error("Banco de dados indispon\xEDvel. N\xE3o \xE9 poss\xEDvel gerar escalas sem dados reais de disponibilidade.");
          }
          console.log("[SCHEDULE_GEN] Creating mock availability data for development preview only");
          logger.warn("Database n\xE3o dispon\xEDvel, criando dados de disponibilidade mock apenas para desenvolvimento");
          this.availabilityData.set("1", {
            ministerId: "1",
            availableSundays: ["1", "2", "3", "4"],
            preferredMassTimes: ["10:00"],
            alternativeTimes: ["08:00", "19:00"],
            canSubstitute: true,
            dailyMassAvailability: [],
            weekdayMasses: []
          });
          this.availabilityData.set("2", {
            ministerId: "2",
            availableSundays: ["1", "2", "4"],
            preferredMassTimes: ["08:00"],
            alternativeTimes: ["10:00"],
            canSubstitute: true,
            dailyMassAvailability: [],
            weekdayMasses: []
          });
          this.availabilityData.set("3", {
            ministerId: "3",
            availableSundays: ["2", "3", "4"],
            preferredMassTimes: ["19:00"],
            alternativeTimes: ["10:00"],
            canSubstitute: false,
            dailyMassAvailability: [],
            weekdayMasses: []
          });
          this.availabilityData.set("4", {
            ministerId: "4",
            availableSundays: ["1", "3", "4"],
            preferredMassTimes: ["10:00"],
            alternativeTimes: ["08:00", "19:00"],
            canSubstitute: true,
            dailyMassAvailability: [],
            weekdayMasses: []
          });
          this.availabilityData.set("5", {
            ministerId: "5",
            availableSundays: ["1", "2", "3", "4"],
            preferredMassTimes: ["08:00", "10:00"],
            alternativeTimes: ["19:00"],
            canSubstitute: true,
            dailyMassAvailability: [],
            weekdayMasses: []
          });
          return;
        }
        const allowedStatuses = isPreview ? ["open", "sent", "active", "closed"] : ["closed"];
        const [targetQuestionnaire] = await this.db.select().from(questionnaires).where(
          and7(
            eq10(questionnaires.month, month),
            eq10(questionnaires.year, year)
          )
        ).limit(1);
        if (!targetQuestionnaire) {
          console.log(`[SCHEDULE_GEN] Nenhum question\xE1rio encontrado para ${month}/${year}`);
          return;
        }
        console.log(`[SCHEDULE_GEN] Question\xE1rio encontrado: ${targetQuestionnaire.title} (Status: ${targetQuestionnaire.status})`);
        if (!allowedStatuses.includes(targetQuestionnaire.status)) {
          console.log(`[SCHEDULE_GEN] Question\xE1rio com status ${targetQuestionnaire.status} n\xE3o permitido para ${isPreview ? "preview" : "gera\xE7\xE3o definitiva"}`);
          if (!isPreview) {
            throw new Error(`Question\xE1rio precisa estar fechado para gera\xE7\xE3o definitiva. Status atual: ${targetQuestionnaire.status}`);
          }
          return;
        }
        const responses = await this.db.select().from(questionnaireResponses).where(eq10(questionnaireResponses.questionnaireId, targetQuestionnaire.id));
        console.log(`[SCHEDULE_GEN] \u{1F50D} DEBUGGING: Encontradas ${responses.length} respostas no banco`);
        console.log(`[SCHEDULE_GEN] \u{1F504} Using COMPATIBILITY LAYER for ${year}/${month}`);
        responses.forEach((r, index2) => {
          const adapted = this.adaptQuestionnaireResponse(r, year, month);
          let availableSundays = adapted.availableSundays;
          let preferredMassTimes = adapted.preferredMassTimes;
          let alternativeTimes = adapted.alternativeTimes;
          let dailyMassAvailability = adapted.dailyMassAvailability;
          let canSubstitute = adapted.canSubstitute;
          let specialEvents = adapted.specialEvents;
          const normalizedSundays = this.normalizeSundayFormat(availableSundays, month, year);
          const normalizedPreferredTimes = this.normalizeTimeFormat(preferredMassTimes);
          const normalizedAlternativeTimes = this.normalizeTimeFormat(alternativeTimes);
          const normalizedSpecialEvents = this.normalizeSpecialEvents(specialEvents);
          const processedData = {
            ministerId: r.userId,
            availableSundays: normalizedSundays,
            preferredMassTimes: normalizedPreferredTimes,
            alternativeTimes: normalizedAlternativeTimes,
            canSubstitute,
            dailyMassAvailability,
            specialEvents: normalizedSpecialEvents,
            weekdayMasses: adapted.weekdayMasses
          };
          console.log(`[SCHEDULE_GEN] \u{1F4BE} DADOS PROCESSADOS para ${r.userId}:`, processedData);
          this.availabilityData.set(r.userId, processedData);
          const minister = this.ministers.find((m) => m.id === r.userId);
          if (minister) {
            minister.questionnaireResponse = {
              responses: r.responses
            };
          }
        });
        console.log(`[SCHEDULE_GEN] \u2705 Carregadas respostas de ${responses.length} ministros no availabilityData`);
        console.log(`[SCHEDULE_GEN] \u{1F4CA} AvailabilityData size: ${this.availabilityData.size}`);
        logger.info(`Carregadas respostas de ${responses.length} ministros`);
      }
      /**
       * 🔧 NORMALIZAÇÃO: Converte domingos de formato texto para números (1-5)
       * Exemplos de entrada:
       *   - "Domingo 05/10" → "1" (se 05/10 for o primeiro domingo)
       *   - "Domingo (12/10) – Missa em honra à Nossa Senhora Aparecida" → "2"
       */
      normalizeSundayFormat(sundays, month, year) {
        if (!sundays || sundays.length === 0) return [];
        if (sundays.every((s) => /^[1-5]$/.test(s))) {
          return sundays;
        }
        if (sundays.includes("Nenhum domingo")) {
          return sundays;
        }
        const normalized = [];
        for (const sunday of sundays) {
          const dateMatch = sunday.match(/(\d{1,2})\/(\d{1,2})/);
          if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const monthFromText = parseInt(dateMatch[2]);
            if (monthFromText === month || monthFromText === 10) {
              const sundayOfMonth = Math.ceil(day / 7);
              normalized.push(sundayOfMonth.toString());
              console.log(`[NORMALIZE] "${sunday}" \u2192 domingo ${sundayOfMonth} do m\xEAs`);
            }
          } else {
            console.log(`[NORMALIZE] \u26A0\uFE0F N\xE3o foi poss\xEDvel normalizar: "${sunday}"`);
            normalized.push(sunday);
          }
        }
        return normalized;
      }
      /**
       * 🔧 NORMALIZAÇÃO: Padroniza horários para formato "Xh" (8h, 10h, 19h)
       * Aceita: "8h", "08:00", "8:00", "08h00"
       */
      normalizeTimeFormat(times) {
        if (!times || times.length === 0) return [];
        return times.map((time2) => {
          if (typeof time2 !== "string") {
            console.log(`[NORMALIZE] \u26A0\uFE0F Hor\xE1rio n\xE3o \xE9 string: ${time2} (tipo: ${typeof time2})`);
            return String(time2);
          }
          if (/^\d{1,2}h$/.test(time2)) {
            return time2;
          }
          const hourMatch = time2.match(/^(\d{1,2})/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            return `${hour}h`;
          }
          return time2;
        });
      }
      /**
       * 🔧 NORMALIZAÇÃO: Converte valores booleanos em strings para eventos especiais
       * false → "Não", true → "Sim"
       */
      normalizeSpecialEvents(events) {
        if (!events || typeof events !== "object") return events;
        const normalized = {};
        for (const [key, value] of Object.entries(events)) {
          if (typeof value === "boolean") {
            normalized[key] = value ? "Sim" : "N\xE3o";
          } else {
            normalized[key] = value;
          }
        }
        return normalized;
      }
      /**
       * Pré-calcula bônus de santo para todas as combinações ministro-data
       * OPTIMIZED: Uses pre-loaded saints data to avoid database queries in loops
       */
      async preCalculateSaintBonuses(massTimes) {
        const uniqueDates = /* @__PURE__ */ new Set();
        for (const massTime of massTimes) {
          if (massTime.date) {
            uniqueDates.add(massTime.date);
          }
        }
        console.log(`[SAINT_BONUS] Calculando b\xF4nus de santo para ${this.ministers.length} ministros \xD7 ${uniqueDates.size} datas...`);
        console.log(`[SAINT_BONUS] \u{1F680} OPTIMIZATION: Using pre-loaded saints data (no DB queries in loops)`);
        for (const minister of this.ministers) {
          if (!minister.id || !minister.name) continue;
          for (const date2 of uniqueDates) {
            try {
              const bonus = await calculateSaintNameMatchBonus(minister.name, date2, this.saintsData);
              if (bonus > 0) {
                const cacheKey = `${minister.id}:${date2}`;
                this.saintBonusCache.set(cacheKey, bonus);
                console.log(`[SAINT_BONUS] \u2B50 ${minister.name} em ${date2}: b\xF4nus ${bonus.toFixed(2)}`);
              }
            } catch (error) {
              console.error(`[SAINT_BONUS] Erro ao calcular b\xF4nus para ${minister.name} em ${date2}:`, error);
            }
          }
        }
        console.log(`[SAINT_BONUS] \u2705 ${this.saintBonusCache.size} b\xF4nus de santo calculados`);
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
        const config = await this.db.select().from(massTimesConfig).where(eq10(massTimesConfig.isActive, true));
        this.massTimes = config.map((c) => ({
          id: c.id,
          dayOfWeek: c.dayOfWeek,
          time: c.time,
          minMinisters: c.minMinisters,
          maxMinisters: c.maxMinisters
        }));
      }
      /**
       * Gera horários de missa para todas as datas do mês seguindo as regras estabelecidas
       */
      generateMonthlyMassTimes(year, month) {
        const monthlyTimes = [];
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));
        console.log(`[SCHEDULE_GEN] \u{1F550} Gerando hor\xE1rios para ${month}/${year} com REGRAS ANTI-CONFLITO!`);
        let currentDate = startDate;
        while (currentDate <= endDate) {
          const dayOfWeek = getDay2(currentDate);
          const dateStr = format2(currentDate, "yyyy-MM-dd");
          const dayOfMonth = getDate(currentDate);
          const isDayOfSaintJudas = dayOfMonth === 28;
          console.log(`[SCHEDULE_GEN] \u{1F50D} DEBUGGING ${dateStr}: dayOfMonth=${dayOfMonth}, isDayOfSaintJudas=${isDayOfSaintJudas}, dayOfWeek=${dayOfWeek}`);
          const isRegularSaturday = dayOfWeek === 6;
          const isOctoberNovena = month === 10 && dayOfMonth >= 20 && dayOfMonth <= 27 && dayOfWeek !== 0;
          if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isDayOfSaintJudas && !isOctoberNovena) {
            monthlyTimes.push({
              id: `daily-${dateStr}`,
              dayOfWeek,
              time: "06:30",
              date: dateStr,
              minMinisters: 5,
              // AJUSTADO: 5 ministros para missas diárias
              maxMinisters: 5,
              // AJUSTADO: Exatamente 5 ministros
              type: "missa_diaria"
            });
            console.log(`[SCHEDULE_GEN] \u2705 Missa di\xE1ria adicionada: ${dateStr} 06:30 (5 ministros)`);
          } else if (isDayOfSaintJudas) {
            console.log(`[SCHEDULE_GEN] \u{1F6AB} Dia ${dateStr} \xE9 S\xE3o Judas - SUPRIMINDO missa di\xE1ria`);
          } else if (isRegularSaturday) {
            console.log(`[SCHEDULE_GEN] \u{1F6AB} S\xE1bado regular ${dateStr} - SEM missa di\xE1ria (apenas 1\xBA s\xE1bado tem missa)`);
          } else if (isOctoberNovena) {
            console.log(`[SCHEDULE_GEN] \u{1F6AB} Dia de novena ${dateStr} - SEM missa da manh\xE3 (apenas novena \xE0 noite)`);
          }
          if (dayOfWeek === 0) {
            const sundayConfigs = [
              { time: "08:00", minMinisters: 15, maxMinisters: 15 },
              // 15 ministros às 8h
              { time: "10:00", minMinisters: 20, maxMinisters: 20 },
              // 20 ministros às 10h
              { time: "19:00", minMinisters: 20, maxMinisters: 20 }
              // 20 ministros às 19h
            ];
            sundayConfigs.forEach((config) => {
              monthlyTimes.push({
                id: `sunday-${dateStr}-${config.time}`,
                dayOfWeek,
                time: config.time,
                date: dateStr,
                minMinisters: config.minMinisters,
                maxMinisters: config.maxMinisters,
                type: "missa_dominical"
              });
              console.log(`[SCHEDULE_GEN] \u2705 Missa dominical: ${dateStr} ${config.time} (${config.minMinisters} ministros)`);
            });
          }
          if (isThursday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 4)) {
            monthlyTimes.push({
              id: `healing-${dateStr}`,
              dayOfWeek,
              time: "19:30",
              // TODO: Verificar se é feriado para usar 19h
              date: dateStr,
              minMinisters: 26,
              // AJUSTADO: 26 ministros para Cura e Libertação
              maxMinisters: 26,
              // AJUSTADO: Exatamente 26 ministros
              type: "missa_cura_libertacao"
            });
            console.log(`[SCHEDULE_GEN] \u2705 Missa Cura e Liberta\xE7\xE3o: ${dateStr} 19:30 (26 ministros)`);
          }
          if (isFriday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 5)) {
            monthlyTimes.push({
              id: `sacred-heart-${dateStr}`,
              dayOfWeek,
              time: "06:30",
              date: dateStr,
              minMinisters: 6,
              // AJUSTADO: 6 ministros para missas especiais às 6h30
              maxMinisters: 6,
              // AJUSTADO: Exatamente 6 ministros
              type: "missa_sagrado_coracao"
            });
            console.log(`[SCHEDULE_GEN] \u2705 Missa Sagrado Cora\xE7\xE3o de Jesus (1\xAA sexta): ${dateStr} 06:30 (6 ministros)`);
          }
          if (isSaturday(currentDate) && this.isFirstOccurrenceInMonth(currentDate, 6)) {
            monthlyTimes.push({
              id: `immaculate-heart-${dateStr}`,
              dayOfWeek,
              time: "06:30",
              date: dateStr,
              minMinisters: 6,
              // AJUSTADO: 6 ministros para missas especiais às 6h30
              maxMinisters: 6,
              // AJUSTADO: Exatamente 6 ministros
              type: "missa_imaculado_coracao"
            });
            console.log(`[SCHEDULE_GEN] \u2705 Missa Imaculado Cora\xE7\xE3o de Maria (1\xBA s\xE1bado): ${dateStr} 06:30 (6 ministros)`);
          }
          if (month === 10 && dayOfMonth >= 19 && dayOfMonth <= 27) {
            const novenaDayNumber = dayOfMonth - 18;
            if (dayOfWeek === 0) {
              console.log(`[SCHEDULE_GEN] \u{1F64F} Novena S\xE3o Judas (${novenaDayNumber}\xBA dia): ${dateStr} - UNIFICADA com missa dominical \xE0s 19:00`);
            } else {
              let novenaTime = "19:30";
              if (dayOfWeek === 6) {
                novenaTime = "19:00";
              }
              monthlyTimes.push({
                id: `novena-sao-judas-${dateStr}`,
                dayOfWeek,
                time: novenaTime,
                date: dateStr,
                minMinisters: 26,
                maxMinisters: 26,
                type: "missa_sao_judas"
              });
              console.log(`[SCHEDULE_GEN] \u{1F64F} Novena S\xE3o Judas (${novenaDayNumber}\xBA dia): ${dateStr} ${novenaTime} (26 ministros)`);
              if (dayOfWeek === 6) {
                console.log(`[SCHEDULE_GEN] \u{1F6AB} S\xE1bado ${dateStr} est\xE1 na novena - apenas missa \xE0s ${novenaTime}!`);
              }
            }
          }
          if (dayOfMonth === 28) {
            const stJudeMasses = this.generateStJudeMasses(currentDate);
            monthlyTimes.push(...stJudeMasses);
          }
          currentDate = addDays(currentDate, 1);
        }
        const filteredTimes = this.resolveTimeConflicts(monthlyTimes);
        console.log(`[SCHEDULE_GEN] \u2705 Total de ${monthlyTimes.length} hor\xE1rios \u2192 ${filteredTimes.length} ap\xF3s filtro de conflitos!`);
        return filteredTimes.sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
      }
      /**
       * Resolve conflitos de horário: missa especial substitui missa normal
       */
      resolveTimeConflicts(massTimes) {
        console.log(`[SCHEDULE_GEN] \u{1F527} Resolvendo conflitos entre ${massTimes.length} missas...`);
        const filteredMasses = massTimes.filter((mass) => {
          const dateParts = mass.date?.split("-");
          if (!dateParts || dateParts.length !== 3) return true;
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[2]);
          const massDate = new Date(year, month - 1, day);
          const dayOfWeek = massDate.getDay();
          if (mass.date && mass.date.endsWith("-28") && mass.type === "missa_diaria") {
            console.log(`[SCHEDULE_GEN] \u{1F6AB} REMOVENDO missa di\xE1ria do dia 28: ${mass.date} ${mass.time}`);
            return false;
          }
          if (month === 10 && dayOfWeek === 6 && day !== 4 && day !== 25) {
            console.log(`[SCHEDULE_GEN] \u{1F6AB} REMOVENDO missa de s\xE1bado regular em outubro: ${mass.date} ${mass.time} (${mass.type})`);
            return false;
          }
          if (month === 10 && day >= 19 && day <= 27 && dayOfWeek !== 0) {
            const hour = parseInt(mass.time.split(":")[0]);
            const isMorningMass = hour < 12;
            if (isMorningMass && mass.type !== "missa_sao_judas" && mass.type !== "missa_sao_judas_festa") {
              console.log(`[SCHEDULE_GEN] \u{1F6AB} REMOVENDO missa matutina durante novena: ${mass.date} ${mass.time} (${mass.type})`);
              return false;
            }
          }
          return true;
        });
        console.log(`[SCHEDULE_GEN] \u{1F4CA} Filtros aplicados: ${massTimes.length} \u2192 ${filteredMasses.length} missas`);
        const timeSlots = /* @__PURE__ */ new Map();
        for (const mass of filteredMasses) {
          const key = `${mass.date}-${mass.time}`;
          if (!timeSlots.has(key)) {
            timeSlots.set(key, []);
          }
          timeSlots.get(key).push(mass);
        }
        const resolvedTimes = [];
        for (const [key, conflicts] of timeSlots) {
          if (conflicts.length === 1) {
            resolvedTimes.push(conflicts[0]);
          } else {
            console.log(`[SCHEDULE_GEN] \u26A0\uFE0F CONFLITO em ${key}: ${conflicts.map((m) => m.type).join(" vs ")}`);
            const priorityOrder = [
              "missa_sao_judas_festa",
              "missa_sao_judas",
              "missa_cura_libertacao",
              "missa_sagrado_coracao",
              "missa_imaculado_coracao",
              "missa_dominical",
              "missa_diaria"
            ];
            let selected = conflicts[0];
            for (const mass of conflicts) {
              const currentPriority = priorityOrder.indexOf(mass.type || "missa_diaria");
              const selectedPriority = priorityOrder.indexOf(selected.type || "missa_diaria");
              if (currentPriority < selectedPriority) {
                selected = mass;
              }
            }
            console.log(`[SCHEDULE_GEN] \u2705 RESOLVIDO: ${selected.type} prevaleceu em ${key}`);
            resolvedTimes.push(selected);
          }
        }
        return resolvedTimes;
      }
      /**
       * Verifica se é a primeira ocorrência do dia da semana no mês
       */
      isFirstOccurrenceInMonth(date2, targetDayOfWeek) {
        const startOfMonthDate = startOfMonth(date2);
        let firstOccurrence = startOfMonthDate;
        while (getDay2(firstOccurrence) !== targetDayOfWeek) {
          firstOccurrence = addDays(firstOccurrence, 1);
        }
        return format2(date2, "yyyy-MM-dd") === format2(firstOccurrence, "yyyy-MM-dd");
      }
      /**
       * Gera horários das missas de São Judas (dia 28) com regras complexas
       */
      generateStJudeMasses(date2) {
        const masses = [];
        const dayOfWeek = getDay2(date2);
        const dateStr = format2(date2, "yyyy-MM-dd");
        const month = date2.getMonth() + 1;
        console.log(`[SCHEDULE_GEN] \u{1F64F} Gerando missas de S\xE3o Judas para ${dateStr} (${dayOfWeek})`);
        if (month === 10) {
          const festConfigs = [
            { time: "07:00", minMinisters: 10, maxMinisters: 10 },
            { time: "10:00", minMinisters: 15, maxMinisters: 15 },
            { time: "12:00", minMinisters: 10, maxMinisters: 10 },
            { time: "15:00", minMinisters: 10, maxMinisters: 10 },
            { time: "17:00", minMinisters: 10, maxMinisters: 10 },
            { time: "19:30", minMinisters: 20, maxMinisters: 20 }
          ];
          festConfigs.forEach((config) => {
            masses.push({
              id: `st-jude-feast-${dateStr}-${config.time}`,
              dayOfWeek,
              time: config.time,
              date: dateStr,
              minMinisters: config.minMinisters,
              maxMinisters: config.maxMinisters,
              type: "missa_sao_judas_festa"
            });
            console.log(`[SCHEDULE_GEN] \u{1F64F} Festa S\xE3o Judas: ${dateStr} ${config.time} (${config.minMinisters} ministros)`);
          });
        } else {
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const weekdayConfigs = [
              { time: "07:00", minMinisters: 8, maxMinisters: 8 },
              { time: "10:00", minMinisters: 10, maxMinisters: 10 },
              { time: "19:30", minMinisters: 15, maxMinisters: 15 }
            ];
            weekdayConfigs.forEach((config) => {
              masses.push({
                id: `st-jude-weekday-${dateStr}-${config.time}`,
                dayOfWeek,
                time: config.time,
                date: dateStr,
                minMinisters: config.minMinisters,
                maxMinisters: config.maxMinisters,
                type: "missa_sao_judas"
              });
            });
          } else if (dayOfWeek === 6) {
            const saturdayConfigs = [
              { time: "07:00", minMinisters: 8, maxMinisters: 8 },
              { time: "10:00", minMinisters: 10, maxMinisters: 10 },
              { time: "19:00", minMinisters: 15, maxMinisters: 15 }
            ];
            saturdayConfigs.forEach((config) => {
              masses.push({
                id: `st-jude-saturday-${dateStr}-${config.time}`,
                dayOfWeek,
                time: config.time,
                date: dateStr,
                minMinisters: config.minMinisters,
                maxMinisters: config.maxMinisters,
                type: "missa_sao_judas"
              });
            });
          } else if (dayOfWeek === 0) {
            const sundayConfigs = [
              { time: "08:00", minMinisters: 15, maxMinisters: 15 },
              { time: "10:00", minMinisters: 20, maxMinisters: 20 },
              { time: "15:00", minMinisters: 15, maxMinisters: 15 },
              { time: "17:00", minMinisters: 15, maxMinisters: 15 },
              { time: "19:00", minMinisters: 20, maxMinisters: 20 }
            ];
            sundayConfigs.forEach((config) => {
              masses.push({
                id: `st-jude-sunday-${dateStr}-${config.time}`,
                dayOfWeek,
                time: config.time,
                date: dateStr,
                minMinisters: config.minMinisters,
                maxMinisters: config.maxMinisters,
                type: "missa_sao_judas"
              });
            });
          }
        }
        console.log(`[SCHEDULE_GEN] \u{1F64F} S\xE3o Judas: ${masses.length} missas geradas`);
        return masses;
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
        console.log("[SCHEDULE_GEN] \u2705 DEBUGGING: Atribuindo posi\xE7\xF5es aos ministros!");
        const ministersWithPositions = selectedMinisters.map((minister, index2) => {
          const ministerWithPosition = {
            ...minister,
            position: index2 + 1
            // Atribuir posições sequenciais
          };
          console.log(`[SCHEDULE_GEN] \u2705 Ministro ${minister.name} recebeu posi\xE7\xE3o ${index2 + 1}`);
          return ministerWithPosition;
        });
        const backupWithPositions = backupMinisters.map((minister, index2) => ({
          ...minister,
          position: selectedMinisters.length + index2 + 1
        }));
        console.log("[SCHEDULE_GEN] \u{1F6A8} RETORNANDO RESULTADO COM POSI\xC7\xD5ES! ministersWithPositions:", ministersWithPositions.length);
        console.log("[SCHEDULE_GEN] \u{1F6A8} Primeiro ministro com posi\xE7\xE3o:", JSON.stringify(ministersWithPositions[0], null, 2));
        const result = {
          massTime,
          ministers: ministersWithPositions,
          backupMinisters: backupWithPositions,
          confidence
        };
        console.log("[SCHEDULE_GEN] \u{1F6A8} RESULTADO FINAL:", JSON.stringify(result, null, 2).substring(0, 500));
        return result;
      }
      /**
       * Filtra ministros disponíveis para uma missa específica
       */
      getAvailableMinistersForMass(massTime) {
        const dayName = this.getDayName(massTime.dayOfWeek);
        const dateStr = format2(new Date(massTime.date), "dd/MM");
        const hour = parseInt(massTime.time.substring(0, 2));
        const timeStr = hour + "h";
        console.log(`
[AVAILABILITY_CHECK] \u{1F50D} ========================================`);
        console.log(`[AVAILABILITY_CHECK] Verificando disponibilidade para:`);
        console.log(`[AVAILABILITY_CHECK]   Data: ${massTime.date}`);
        console.log(`[AVAILABILITY_CHECK]   Hora: ${massTime.time}`);
        console.log(`[AVAILABILITY_CHECK]   Tipo: ${massTime.type}`);
        console.log(`[AVAILABILITY_CHECK]   Dia da semana: ${dayName} (${massTime.dayOfWeek})`);
        console.log(`[AVAILABILITY_CHECK] \u{1F4CA} Total ministros: ${this.ministers.length}, AvailabilityData size: ${this.availabilityData.size}`);
        const availableList = this.ministers.filter((minister) => {
          if (!minister.id) return false;
          const availability = this.availabilityData.get(minister.id);
          console.log(`[AVAILABILITY_CHECK] \u{1F464} Verificando ${minister.name} (${minister.id})`);
          console.log(`[AVAILABILITY_CHECK] \u{1F4CB} Dados de disponibilidade:`, availability);
          if (!availability) {
            if (this.availabilityData.size === 0) {
              console.log(`[AVAILABILITY_CHECK] \u2705 Modo preview: incluindo ${minister.name} sem dados de disponibilidade`);
              logger.debug(`Modo preview: incluindo ${minister.name} sem dados de disponibilidade`);
              return true;
            }
            console.log(`[AVAILABILITY_CHECK] \u274C ${minister.name} n\xE3o respondeu ao question\xE1rio - excluindo`);
            logger.debug(`${minister.name} n\xE3o respondeu ao question\xE1rio - excluindo`);
            return false;
          }
          const isAvailableForType = massTime.type ? this.isAvailableForSpecialMass(minister.id, massTime.type, massTime.time, massTime.date) : true;
          console.log(`[AVAILABILITY_CHECK] ${minister.name} dispon\xEDvel para tipo ${massTime.type}? ${isAvailableForType}`);
          if (massTime.type && !isAvailableForType) {
            console.log(`[AVAILABILITY_CHECK] \u274C ${minister.name} REJEITADO por tipo de missa`);
            return false;
          }
          if (massTime.dayOfWeek === 0) {
            console.log(`[AVAILABILITY_CHECK] Verificando domingo ${massTime.date} ${massTime.time}`);
            const dateTimeKey = `${massTime.date} ${massTime.time}`;
            const dateOnlyKey = massTime.date;
            if (availability.availableSundays?.includes("Nenhum domingo")) {
              logger.debug(`${minister.name} marcou "Nenhum domingo" - excluindo`);
              return false;
            }
            let availableForSunday = false;
            if (availability.availableSundays && availability.availableSundays.length > 0) {
              console.log(`[AVAILABILITY_CHECK] ${minister.name} dispon\xEDvel em: ${availability.availableSundays.join(", ")}`);
              availableForSunday = availability.availableSundays.some((entry) => {
                if (entry.includes(" ")) {
                  return entry === dateTimeKey;
                }
                if (entry === dateOnlyKey) {
                  return true;
                }
                if (entry.includes(dateStr)) {
                  return true;
                }
                return false;
              });
              console.log(`[AVAILABILITY_CHECK] Verificando ${dateTimeKey}: ${availableForSunday ? "\u2705 SIM" : "\u274C N\xC3O"}`);
              if (!availableForSunday) {
                const date2 = new Date(massTime.date);
                const dayOfMonth = date2.getDate();
                const sundayOfMonth = Math.ceil(dayOfMonth / 7);
                availableForSunday = availability.availableSundays.includes(sundayOfMonth.toString());
                if (!availableForSunday) {
                  const possibleFormats = [
                    `Domingo ${dateStr}`,
                    // "Domingo 05/10"
                    dateStr,
                    // "05/10"
                    `${dateStr.split("/")[0]}/10`,
                    // "05/10" para outubro
                    parseInt(dateStr.split("/")[0]).toString()
                    // "5" ao invés de "05"
                  ];
                  for (const format10 of possibleFormats) {
                    if (availability.availableSundays.some(
                      (sunday) => sunday.includes(format10) || sunday === format10
                    )) {
                      availableForSunday = true;
                      console.log(`[AVAILABILITY_CHECK] Match encontrado no formato legado: ${format10}`);
                      break;
                    }
                  }
                }
              }
            }
            if (!availableForSunday) {
              if (availability.preferredMassTimes?.includes(timeStr) || availability.preferredMassTimes?.includes(massTime.time)) {
                logger.debug(`${minister.name} tem prefer\xEAncia pelo hor\xE1rio ${timeStr}, considerando dispon\xEDvel`);
                return true;
              }
              console.log(`[AVAILABILITY_CHECK] \u274C ${minister.name} N\xC3O dispon\xEDvel para ${dateTimeKey}`);
              return false;
            }
            if (availability.preferredMassTimes && availability.preferredMassTimes.length > 0) {
              const hasPreferredTime = availability.preferredMassTimes.some((time2) => {
                const timeValue = String(time2);
                return timeValue === massTime.time || timeValue === timeStr || timeValue.includes(hour.toString());
              });
              console.log(`[AVAILABILITY_CHECK] ${minister.name} - Hor\xE1rios preferidos: ${availability.preferredMassTimes.join(", ")}`);
              console.log(`[AVAILABILITY_CHECK] ${minister.name} - Verificando ${massTime.time}: preferido=${hasPreferredTime}`);
              if (!hasPreferredTime) {
                logger.debug(`${minister.name} dispon\xEDvel mas sem prefer\xEAncia forte para ${timeStr}`);
              }
            }
            console.log(`[AVAILABILITY_CHECK] \u2705 ${minister.name} DISPON\xCDVEL para domingo ${massTime.date} ${massTime.time}`);
            return true;
          }
          if (massTime.dayOfWeek >= 1 && massTime.dayOfWeek <= 6) {
            if (massTime.type && massTime.type !== "missa_diaria") {
              console.log(`[AVAILABILITY_CHECK] \u23ED\uFE0F  ${minister.name}: Missa especial em dia de semana (${massTime.type}), pulando verifica\xE7\xE3o de dailyMassAvailability`);
              return true;
            }
            console.log(`[AVAILABILITY_CHECK] Verificando disponibilidade di\xE1ria para ${minister.name}`);
            const weekdayDateTimeKey = `${massTime.date} ${massTime.time}`;
            if (availability.weekdayMasses && availability.weekdayMasses.length > 0) {
              const hasSpecificAvailability = availability.weekdayMasses.includes(weekdayDateTimeKey);
              console.log(`[AVAILABILITY_CHECK] ${minister.name}: weekdayMasses entries = ${availability.weekdayMasses.length}, procurando ${weekdayDateTimeKey} -> ${hasSpecificAvailability}`);
              if (hasSpecificAvailability) {
                console.log(`[AVAILABILITY_CHECK] \u2705 ${minister.name} possui disponibilidade espec\xEDfica para ${weekdayDateTimeKey}`);
                return true;
              }
            }
            if (!availability.dailyMassAvailability || availability.dailyMassAvailability.length === 0) {
              console.log(`[AVAILABILITY_CHECK] \u274C ${minister.name} n\xE3o tem dailyMassAvailability`);
              return false;
            }
            const weekdayNames = ["Domingo", "Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
            const weekdayNamesAlt = ["Domingo", "Segunda-feira", "Ter\xE7a-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "S\xE1bado"];
            const currentDayName = weekdayNames[massTime.dayOfWeek];
            const currentDayNameAlt = weekdayNamesAlt[massTime.dayOfWeek];
            const isAvailableForDay = availability.dailyMassAvailability.some((day) => {
              const dayLower = day.toLowerCase();
              return dayLower === currentDayName.toLowerCase() || dayLower === currentDayNameAlt.toLowerCase() || dayLower.includes(currentDayName.toLowerCase());
            });
            console.log(`[AVAILABILITY_CHECK] ${minister.name}: dailyMassAvailability = ${availability.dailyMassAvailability.join(", ")}`);
            console.log(`[AVAILABILITY_CHECK] ${minister.name}: Procurando por "${currentDayName}" ou "${currentDayNameAlt}"`);
            console.log(`[AVAILABILITY_CHECK] ${minister.name} ${isAvailableForDay ? "\u2705 DISPON\xCDVEL" : "\u274C N\xC3O dispon\xEDvel"} para ${dayName} (${massTime.date})`);
            return isAvailableForDay;
          }
          console.log(`[AVAILABILITY_CHECK] \u2705 ${minister.name} dispon\xEDvel (outros casos)`);
          return true;
        });
        console.log(`
[AVAILABILITY_CHECK] \u{1F4CB} RESULTADO: ${availableList.length} ministros dispon\xEDveis de ${this.ministers.length} total`);
        if (availableList.length > 0) {
          console.log(`[AVAILABILITY_CHECK] Ministros dispon\xEDveis: ${availableList.map((m) => m.name).join(", ")}`);
        }
        console.log(`[AVAILABILITY_CHECK] ========================================
`);
        return availableList;
      }
      /**
       * Verifica se o ministro está disponível para um tipo específico de missa
       * Agora suporta verificação por horário específico para missas de São Judas
       */
      isAvailableForSpecialMass(ministerId, massType, massTime, massDate) {
        const availability = this.availabilityData.get(ministerId);
        if (!availability) {
          console.log(`[SPECIAL_MASS] \u274C ${ministerId}: No availability data for ${massType}`);
          return false;
        }
        if (massType === "missa_sao_judas_festa") {
          console.log(`[SPECIAL_MASS] \u{1F50D} Checking ${ministerId} for ${massType} at ${massDate} ${massTime}`);
        }
        if (massType === "missa_diaria") {
          if (availability.dailyMassAvailability?.includes("N\xE3o posso")) {
            console.log(`[SCHEDULE_GEN] ${ministerId} marcou "N\xE3o posso" para missas di\xE1rias`);
            return false;
          }
          const hasAnyDailyAvailability = availability.dailyMassAvailability && availability.dailyMassAvailability.length > 0;
          console.log(`[SCHEDULE_GEN] ${ministerId} tem disponibilidade di\xE1ria: ${hasAnyDailyAvailability}`);
          return hasAnyDailyAvailability;
        }
        const massTypeMapping = {
          "missa_cura_libertacao": "healing_liberation",
          // v2.0: healing_liberation (não healing_liberation_mass!)
          "missa_sagrado_coracao": "first_friday",
          // v2.0: first_friday (não sacred_heart_mass!)
          "missa_imaculado_coracao": "first_saturday",
          // v2.0: first_saturday (não immaculate_heart_mass!)
          "missa_sao_judas": "saint_judas_novena"
        };
        if (massType === "missa_sao_judas_festa" && massTime && massDate) {
          const specialEvents2 = availability.specialEvents;
          console.log(`[SPECIAL_MASS] \u{1F4E6} Special events for ${ministerId}:`, typeof specialEvents2, specialEvents2 ? Object.keys(specialEvents2) : "null");
          if (specialEvents2 && typeof specialEvents2 === "object") {
            console.log(`[SPECIAL_MASS] \u{1F511} saint_judas_feast exists:`, !!specialEvents2.saint_judas_feast, typeof specialEvents2.saint_judas_feast);
            if (specialEvents2.saint_judas_feast && typeof specialEvents2.saint_judas_feast === "object") {
              const datetimeKey = `${massDate}_${massTime}`;
              console.log(`[SPECIAL_MASS] \u2705 Checking key: ${datetimeKey}`);
              let response = specialEvents2.saint_judas_feast[datetimeKey];
              if (response === void 0) {
                const nestedByDate = specialEvents2.saint_judas_feast[massDate];
                if (nestedByDate && typeof nestedByDate === "object") {
                  const normalizedTime = massTime.padStart(5, "0");
                  response = nestedByDate[massTime] ?? nestedByDate[normalizedTime];
                }
              }
              console.log(`[SPECIAL_MASS] \u{1F4CD} Response value:`, response, typeof response);
              const isAvailable = response === true || response === "Sim" || response === "sim" || response === "true" || response === 1;
              console.log(`[SCHEDULE_GEN] \u{1F50D} ${ministerId} para ${massType} (${datetimeKey}): ${response} = ${isAvailable}`);
              if (isAvailable) {
                return true;
              }
            }
            const timeToQuestionKey = {
              "07:00": "saint_judas_feast_7h",
              "10:00": "saint_judas_feast_10h",
              "12:00": "saint_judas_feast_12h",
              "15:00": "saint_judas_feast_15h",
              "17:00": "saint_judas_feast_17h",
              "19:30": "saint_judas_feast_evening"
            };
            const questionKey2 = timeToQuestionKey[massTime];
            if (questionKey2) {
              const response = specialEvents2[questionKey2];
              const isAvailable = response === "Sim" || response === "sim" || response === true || response === "true" || response === 1;
              console.log(`[SCHEDULE_GEN] \u{1F50D} ${ministerId} para ${massType} (legacy ${questionKey2}): ${response} = ${isAvailable}`);
              return isAvailable;
            }
          }
        }
        const questionKey = massTypeMapping[massType];
        if (!questionKey) {
          return true;
        }
        const specialEvents = availability.specialEvents;
        if (specialEvents && typeof specialEvents === "object") {
          const response = specialEvents[questionKey];
          if (questionKey === "saint_judas_novena" && Array.isArray(response)) {
            console.log(`[NOVENA_CHECK] \u{1F50D} Checking novena availability for minister ${ministerId}`);
            console.log(`[NOVENA_CHECK] \u{1F4C5} Mass date: ${massDate}, time: ${massTime}`);
            console.log(`[NOVENA_CHECK] \u{1F4CB} Novena responses: ${JSON.stringify(response)}`);
            if (massDate && massTime) {
              const isAvailable2 = response.some((dateTimeStr) => {
                const massDateTime = `${massDate}_${massTime}`;
                if (dateTimeStr === massDateTime) {
                  console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" \u2705 EXACT MATCH (v2.0 format)`);
                  return true;
                }
                const legacyMatch = dateTimeStr.match(/(\d{1,2})\/10/);
                if (legacyMatch) {
                  const dayOfMonth = parseInt(massDate.split("-")[2]);
                  const responseDay = parseInt(legacyMatch[1]);
                  const matches = responseDay === dayOfMonth;
                  console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" \u2192 day ${responseDay} ${matches ? "\u2705 MATCH (legacy)" : "\u274C"}`);
                  return matches;
                }
                console.log(`[NOVENA_CHECK]    - "${dateTimeStr}" \u274C no match`);
                return false;
              });
              console.log(`[SCHEDULE_GEN] \u{1F50D} ${ministerId} novena ${massDate} ${massTime}: ${isAvailable2 ? "\u2705 AVAILABLE" : "\u274C NOT AVAILABLE"}`);
              return isAvailable2;
            }
            return response.length > 0 && !response.includes("Nenhum dia");
          }
          const isAvailable = response === "Sim" || response === "sim" || response === true || response === "true" || response === 1;
          console.log(`[SCHEDULE_GEN] \u{1F50D} ${ministerId} para ${massType} (${questionKey}): ${response} = ${isAvailable}`);
          return isAvailable;
        }
        console.log(`[SCHEDULE_GEN] \u2139\uFE0F Usando disponibilidade geral para ${massType}`);
        return false;
      }
      /**
       * 🔥 FAIR ALGORITHM: Seleciona ministros garantindo distribuição justa
       * - Hard limit: 4 assignments per month
       * - Prevents same minister serving twice on same day
       * - 👨‍👩‍👧‍👦 GROUPS families together when prefer_serve_together is true
       * - Sorts by assignment count (least assigned first)
       * - Ensures everyone gets at least 1 before anyone gets 3
       */
      selectOptimalMinisters(available, massTime) {
        const targetCount = massTime.minMinisters;
        const MAX_MONTHLY_ASSIGNMENTS = 4;
        const isDailyMass = massTime.type === "missa_diaria";
        console.log(`
[FAIR_ALGORITHM] ========================================`);
        console.log(`[FAIR_ALGORITHM] Selecting for ${massTime.date} ${massTime.time} (${massTime.type})`);
        console.log(`[FAIR_ALGORITHM] Target: ${targetCount} ministers`);
        console.log(`[FAIR_ALGORITHM] Available pool: ${available.length} ministers`);
        console.log(`[FAIR_ALGORITHM] Is daily mass (no monthly limit): ${isDailyMass}`);
        const eligible = available.filter((minister) => {
          if (!minister.id) return false;
          const assignmentCount = minister.monthlyAssignmentCount || 0;
          const alreadyServedToday = minister.lastAssignedDate === massTime.date;
          if (!isDailyMass && assignmentCount >= MAX_MONTHLY_ASSIGNMENTS) {
            console.log(`[FAIR_ALGORITHM] \u274C ${minister.name}: LIMIT REACHED (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
            return false;
          }
          if (alreadyServedToday) {
            console.log(`[FAIR_ALGORITHM] \u274C ${minister.name}: ALREADY SERVED TODAY (${massTime.date})`);
            return false;
          }
          if (isDailyMass) {
            console.log(`[FAIR_ALGORITHM] \u2705 ${minister.name}: Eligible for DAILY MASS (${assignmentCount} total assignments)`);
          } else {
            console.log(`[FAIR_ALGORITHM] \u2705 ${minister.name}: Eligible (${assignmentCount}/${MAX_MONTHLY_ASSIGNMENTS} assignments)`);
          }
          return true;
        });
        console.log(`[FAIR_ALGORITHM] Eligible after filters: ${eligible.length}/${available.length}`);
        if (eligible.length === 0) {
          logger.error(`[FAIR_ALGORITHM] \u274C NO ELIGIBLE MINISTERS for ${massTime.date} ${massTime.time}!`);
          return [];
        }
        const sorted = [...eligible].sort((a, b) => {
          const countA = a.monthlyAssignmentCount || 0;
          const countB = b.monthlyAssignmentCount || 0;
          if (countA !== countB) {
            return countA - countB;
          }
          const lastServiceA = a.lastService ? a.lastService.getTime() : 0;
          const lastServiceB = b.lastService ? b.lastService.getTime() : 0;
          if (lastServiceA !== lastServiceB) {
            return lastServiceA - lastServiceB;
          }
          return a.totalServices - b.totalServices;
        });
        console.log(`[FAIR_ALGORITHM] \u{1F4CA} Sorted by assignment count:`);
        sorted.slice(0, 10).forEach((m) => {
          console.log(`  ${m.name}: ${m.monthlyAssignmentCount || 0} assignments this month`);
        });
        const selected = [];
        const used = /* @__PURE__ */ new Set();
        const processedFamilies = /* @__PURE__ */ new Set();
        console.log(`
[FAMILY_SYSTEM] \u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466} Phase 1: Processing families that prefer to serve together...`);
        for (const minister of sorted) {
          if (!minister.id || used.has(minister.id)) continue;
          if (selected.length >= targetCount) break;
          if (minister.familyId && this.familyGroups.has(minister.familyId)) {
            const familyId = minister.familyId;
            if (processedFamilies.has(familyId)) continue;
            const preferTogether = this.familyPreferences.get(familyId) ?? true;
            if (preferTogether) {
              const familyMemberIds = this.familyGroups.get(familyId);
              const availableFamilyMembers = sorted.filter(
                (m) => m.id && familyMemberIds.includes(m.id) && !used.has(m.id)
              );
              if (availableFamilyMembers.length > 0) {
                const familyNames = availableFamilyMembers.map((m) => m.name).join(" & ");
                let addedCount = 0;
                for (const familyMember of availableFamilyMembers) {
                  if (selected.length >= targetCount) break;
                  selected.push(familyMember);
                  used.add(familyMember.id);
                  familyMember.monthlyAssignmentCount = (familyMember.monthlyAssignmentCount || 0) + 1;
                  familyMember.lastAssignedDate = massTime.date;
                  addedCount++;
                }
                console.log(`[FAMILY_SYSTEM] \u2705 Assigned family together: ${familyNames} (${addedCount} members)`);
                processedFamilies.add(familyId);
              }
            }
          }
        }
        console.log(`
[FAIR_ALGORITHM] Phase 2: Filling remaining spots with individual ministers...`);
        console.log(`[FAIR_ALGORITHM] Current: ${selected.length}/${targetCount} ministers selected`);
        for (const minister of sorted) {
          if (!minister.id) continue;
          if (selected.length >= targetCount) break;
          if (used.has(minister.id)) continue;
          if (minister.familyId && this.familyGroups.has(minister.familyId)) {
            const familyId = minister.familyId;
            const preferTogether = this.familyPreferences.get(familyId) ?? true;
            if (preferTogether && !processedFamilies.has(familyId)) {
              console.log(`[FAMILY_SYSTEM] \u23ED\uFE0F  Skipping ${minister.name}: Family prefers to serve together`);
              continue;
            }
            if (!preferTogether) {
              console.log(`[FAMILY_SYSTEM] \u2705 ${minister.name}: Family prefers separate service, can serve individually`);
            }
          }
          selected.push(minister);
          used.add(minister.id);
          minister.monthlyAssignmentCount = (minister.monthlyAssignmentCount || 0) + 1;
          minister.lastAssignedDate = massTime.date;
          console.log(`[FAIR_ALGORITHM] \u2705 Selected ${minister.name} (now ${minister.monthlyAssignmentCount}/${MAX_MONTHLY_ASSIGNMENTS})`);
        }
        if (selected.length < targetCount) {
          const shortage = targetCount - selected.length;
          logger.warn(`\u26A0\uFE0F [FAIR_ALGORITHM] INCOMPLETE: ${selected.length}/${targetCount} (short by ${shortage})`);
          console.log(`[FAIR_ALGORITHM] \u26A0\uFE0F INCOMPLETE: ${selected.length}/${targetCount}`);
          console.log(`[FAIR_ALGORITHM] Reason: Only ${eligible.length} eligible ministers available`);
          selected.forEach((m) => {
            m.scheduleIncomplete = true;
            m.requiredCount = targetCount;
            m.actualCount = selected.length;
          });
        } else {
          console.log(`[FAIR_ALGORITHM] \u2705 SUCCESS: Selected ${selected.length}/${targetCount} ministers`);
        }
        const distributionMap = /* @__PURE__ */ new Map();
        this.ministers.forEach((m) => {
          const count8 = m.monthlyAssignmentCount || 0;
          distributionMap.set(count8, (distributionMap.get(count8) || 0) + 1);
        });
        console.log(`[FAIR_ALGORITHM] \u{1F4CA} Current monthly distribution:`);
        for (let i = 0; i <= MAX_MONTHLY_ASSIGNMENTS; i++) {
          const ministersWithCount = distributionMap.get(i) || 0;
          console.log(`  ${i} assignments: ${ministersWithCount} ministers`);
        }
        console.log(`[FAIR_ALGORITHM] ========================================
`);
        return selected;
      }
      /**
       * Seleciona ministros de backup
       */
      selectBackupMinisters(available, selected, count8) {
        const selectedIds = new Set(selected.map((m) => m.id).filter((id) => id !== null));
        const backup = available.filter((m) => m.id && !selectedIds.has(m.id)).sort((a, b) => this.calculateMinisterScore(b, null) - this.calculateMinisterScore(a, null)).slice(0, count8);
        return backup;
      }
      /**
       * Calcula pontuação de um ministro para uma missa específica
       */
      calculateMinisterScore(minister, massTime) {
        let score = 0;
        const avgServices = this.ministers.length > 0 ? this.ministers.reduce((sum, m) => sum + m.totalServices, 0) / this.ministers.length : 0;
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
        if (massTime && minister.id) {
          const availability = this.availabilityData.get(minister.id);
          const timeHour = `${massTime.time.substring(0, 2)}h`;
          if (availability?.preferredMassTimes.includes(timeHour)) {
            score += 0.5;
          } else if (availability?.preferredMassTimes && availability.preferredMassTimes.length > 0) {
            score -= 0.3;
          }
        }
        if (minister.id) {
          const availability = this.availabilityData.get(minister.id);
          if (availability?.canSubstitute) {
            score += 0.1;
          }
        }
        if (massTime && massTime.date && minister.id) {
          const dayAssignments = this.dailyAssignments.get(massTime.date);
          if (dayAssignments && dayAssignments.has(minister.id)) {
            score -= 0.8;
            console.log(`[SCHEDULE_GEN] \u26A0\uFE0F Penalidade aplicada a ${minister.name} - j\xE1 escalado hoje (${massTime.date})`);
          }
        }
        if (massTime && massTime.date && minister.id) {
          const cacheKey = `${minister.id}:${massTime.date}`;
          const saintBonus = this.saintBonusCache.get(cacheKey) || 0;
          if (saintBonus > 0) {
            const bonusPoints = saintBonus * 0.2;
            score += bonusPoints;
            console.log(`[SCHEDULE_GEN] \u2B50 B\xF4nus de santo para ${minister.name} em ${massTime.date}: +${bonusPoints.toFixed(2)} (score total: ${score.toFixed(2)})`);
          }
        }
        return score;
      }
      /**
       * Calcula confiança na escala gerada
       */
      calculateScheduleConfidence(ministers, massTime) {
        let confidence = 0;
        const fillRate = massTime.minMinisters > 0 ? ministers.length / massTime.minMinisters : 0;
        if (fillRate >= 1) {
          confidence += 0.6;
          if (ministers.length > massTime.minMinisters) {
            confidence += 0.05;
          }
        } else {
          confidence += fillRate * 0.3;
          console.log(`[CONFIDENCE] \u26A0\uFE0F Escala incompleta: ${ministers.length}/${massTime.minMinisters} (${(fillRate * 100).toFixed(0)}%)`);
        }
        if (ministers.length > 0) {
          const avgScore = ministers.reduce((sum, m) => sum + m.preferenceScore, 0) / ministers.length;
          confidence += Math.min(avgScore / 10, 0.25);
        }
        const serviceVariance = this.calculateServiceVariance(ministers);
        confidence += Math.max(0, 0.15 - serviceVariance / 100);
        if (fillRate < 1) {
          confidence = Math.min(confidence, 0.5);
        }
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
        if (services.length === 0) return 0;
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

// server/websocket.ts
var websocket_exports = {};
__export(websocket_exports, {
  getWebSocketServer: () => getWebSocketServer,
  initializeWebSocket: () => initializeWebSocket,
  notifyCriticalMass: () => notifyCriticalMass,
  notifySubstitutionRequest: () => notifySubstitutionRequest
});
import { WebSocketServer, WebSocket } from "ws";
import { eq as eq19, and as and15, gte as gte8, lte as lte8, sql as sql11, or as or7 } from "drizzle-orm";
import { format as format7, addDays as addDays4 } from "date-fns";
function initializeWebSocket(httpServer) {
  wss = new WebSocketServer({
    server: httpServer,
    path: "/ws"
  });
  wss.on("connection", (ws, req) => {
    ws.isAlive = true;
    clients.add(ws);
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "AUTH") {
          ws.userId = data.userId;
          ws.userRole = data.userRole;
          if (ws.userRole === "coordenador" || ws.userRole === "gestor") {
            const alerts = await getCriticalAlerts();
            ws.send(JSON.stringify({
              type: "ALERT_UPDATE",
              data: alerts,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }));
          }
        }
      } catch (error) {
        console.error("[WS] Error processing message:", error);
      }
    });
    ws.on("close", () => {
      clients.delete(ws);
    });
    ws.on("error", (error) => {
      console.error("[WS] WebSocket error:", error);
      clients.delete(ws);
    });
  });
  const heartbeatInterval = setInterval(() => {
    wss?.clients.forEach((ws) => {
      const client = ws;
      if (client.isAlive === false) {
        clients.delete(client);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 3e4);
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });
  setInterval(async () => {
    await broadcastCriticalAlerts();
  }, 3e4);
  if (process.env.NODE_ENV === "development") {
    console.log("\u{1F50C} WebSocket server initialized");
  }
  return wss;
}
async function getCriticalAlerts() {
  const now = /* @__PURE__ */ new Date();
  const next12Hours = addDays4(now, 0.5);
  const next48Hours = addDays4(now, 2);
  const criticalMasses = await db.select({
    date: schedules.date,
    time: schedules.time,
    vacancies: sql11`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`
  }).from(schedules).where(
    and15(
      gte8(schedules.date, format7(now, "yyyy-MM-dd")),
      lte8(schedules.date, format7(next12Hours, "yyyy-MM-dd"))
    )
  ).groupBy(schedules.date, schedules.time).having(sql11`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`);
  const criticalWithHours = criticalMasses.map((m) => ({
    ...m,
    hoursUntil: Math.round((new Date(m.date).getTime() - now.getTime()) / (1e3 * 60 * 60)),
    massTime: m.time
  }));
  const urgentSubstitutions = await db.select({
    id: substitutionRequests.id,
    scheduleId: substitutionRequests.scheduleId,
    requesterId: substitutionRequests.requesterId,
    requesterName: users.name,
    reason: substitutionRequests.reason,
    status: substitutionRequests.status,
    massDate: schedules.date,
    massTime: schedules.time
  }).from(substitutionRequests).innerJoin(users, eq19(substitutionRequests.requesterId, users.id)).innerJoin(schedules, eq19(substitutionRequests.scheduleId, schedules.id)).where(
    and15(
      or7(
        eq19(substitutionRequests.status, "pending"),
        eq19(substitutionRequests.status, "available")
      ),
      gte8(schedules.date, format7(now, "yyyy-MM-dd")),
      lte8(schedules.date, format7(next48Hours, "yyyy-MM-dd"))
    )
  ).orderBy(schedules.date);
  return {
    criticalMasses: criticalWithHours,
    urgentSubstitutions: urgentSubstitutions.map((s) => ({
      ...s,
      hoursUntil: Math.round((new Date(s.massDate).getTime() - now.getTime()) / (1e3 * 60 * 60))
    })),
    totalCritical: criticalWithHours.length + urgentSubstitutions.length
  };
}
async function broadcastCriticalAlerts() {
  try {
    const alerts = await getCriticalAlerts();
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client.userRole === "coordenador" || client.userRole === "gestor")) {
        client.send(JSON.stringify({
          type: "ALERT_UPDATE",
          data: alerts,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
      }
    });
  } catch (error) {
    console.error("[WS] Error broadcasting critical alerts:", error);
  }
}
function notifySubstitutionRequest(substitutionData) {
  const message = {
    type: "SUBSTITUTION_REQUEST",
    data: substitutionData,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client.userRole === "coordenador" || client.userRole === "gestor")) {
      client.send(JSON.stringify(message));
    }
  });
}
function notifyCriticalMass(massData) {
  const message = {
    type: "CRITICAL_MASS",
    data: massData,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client.userRole === "coordenador" || client.userRole === "gestor")) {
      client.send(JSON.stringify(message));
    }
  });
}
function getWebSocketServer() {
  return wss;
}
var wss, clients;
var init_websocket = __esm({
  async "server/websocket.ts"() {
    "use strict";
    await init_db();
    init_schema();
    wss = null;
    clients = /* @__PURE__ */ new Set();
  }
});

// server/seeds/formation-seed.ts
var formation_seed_exports = {};
__export(formation_seed_exports, {
  default: () => formation_seed_default,
  seedFormation: () => seedFormation
});
import { eq as eq22 } from "drizzle-orm";
async function seedFormation() {
  console.log("\u{1F331} Starting formation seed...");
  try {
    const tracks = [
      {
        id: "liturgy-track-1",
        title: "Forma\xE7\xE3o Lit\xFArgica B\xE1sica",
        description: "Fundamentos da liturgia eucar\xEDstica e orienta\xE7\xF5es pr\xE1ticas para Ministros Extraordin\xE1rios da Sagrada Comunh\xE3o",
        category: "liturgia",
        icon: "Cross",
        orderIndex: 0,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "spirituality-track-1",
        title: "Forma\xE7\xE3o Espiritual",
        description: "Aprofundamento na espiritualidade eucar\xEDstica e na vida de ora\xE7\xE3o do ministro",
        category: "espiritualidade",
        icon: "Heart",
        orderIndex: 1,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    ];
    console.log("\u{1F4DA} Inserting tracks...");
    for (const track of tracks) {
      const existing = await db.select().from(formationTracks).where(eq22(formationTracks.id, track.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(formationTracks).values(track);
        console.log(`  \u2713 Created track: ${track.title}`);
      } else {
        console.log(`  \u2937 Track already exists: ${track.title}`);
      }
    }
    console.log("\n\u{1F4D6} Creating Liturgy Track modules and lessons...");
    const liturgyModule1 = {
      trackId: "liturgy-track-1",
      title: "A Eucaristia na Igreja",
      description: "Fundamentos teol\xF3gicos e hist\xF3ricos da celebra\xE7\xE3o eucar\xEDstica",
      category: "liturgia",
      orderIndex: 0,
      estimatedDuration: 90,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [module1] = await db.insert(formationModules).values(liturgyModule1).onConflictDoNothing().returning();
    if (module1) {
      console.log(`  \u2713 Module 1: ${liturgyModule1.title}`);
      const [lesson1_1] = await db.insert(formationLessons).values({
        moduleId: module1.id,
        trackId: "liturgy-track-1",
        title: "O Sacramento da Eucaristia",
        description: "Compreendendo a Eucaristia como fonte e \xE1pice da vida crist\xE3",
        lessonNumber: 1,
        durationMinutes: 30,
        orderIndex: 0,
        objectives: [
          "Compreender o significado teol\xF3gico da Eucaristia",
          "Reconhecer a Eucaristia como memorial da P\xE1scoa de Cristo",
          "Valorizar a presen\xE7a real de Cristo no Sacramento"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson1_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_1.id,
            type: "text",
            title: "Introdu\xE7\xE3o",
            content: `A Eucaristia \xE9 o sacramento central da vida crist\xE3. Como ensina o Catecismo da Igreja Cat\xF3lica (CIC 1324): "A Eucaristia \xE9 fonte e \xE1pice de toda a vida crist\xE3".

Neste sacramento, Jesus Cristo se faz presente de modo \xFAnico e especial, oferecendo-se ao Pai em sacrif\xEDcio e dando-se a n\xF3s como alimento espiritual.`,
            orderIndex: 0,
            estimatedMinutes: 5,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: "text",
            title: "A Institui\xE7\xE3o da Eucaristia",
            content: `Na \xFAltima ceia, Jesus instituiu a Eucaristia dizendo: "Isto \xE9 o meu corpo que \xE9 dado por v\xF3s; fazei isto em mem\xF3ria de mim" (Lc 22,19).

A Eucaristia \xE9 memorial da P\xE1scoa de Cristo, ou seja, torna presente e atual o sacrif\xEDcio \xFAnico de Cristo na cruz. N\xE3o \xE9 uma simples lembran\xE7a, mas uma presen\xE7a real e eficaz.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: "text",
            title: "A Presen\xE7a Real",
            content: `A Igreja professa a f\xE9 na presen\xE7a real de Cristo na Eucaristia. Pelo poder do Esp\xEDrito Santo e pelas palavras de Cristo, o p\xE3o e o vinho se tornam verdadeiramente o Corpo e o Sangue de Cristo.

Esta transforma\xE7\xE3o \xE9 chamada de "transubstancia\xE7\xE3o". O Conc\xEDlio de Trento afirma que Cristo est\xE1 presente "verdadeira, real e substancialmente" na Eucaristia.`,
            orderIndex: 2,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_1.id,
            type: "text",
            title: "Reflex\xE3o Final",
            content: `Como Ministros Extraordin\xE1rios da Sagrada Comunh\xE3o, somos chamados a servir com profunda rever\xEAncia, reconhecendo que tocamos e distribu\xEDmos o Corpo de Cristo.

Nossa f\xE9 na presen\xE7a real deve se manifestar em nossos gestos, palavras e atitudes durante o servi\xE7o lit\xFArgico.`,
            orderIndex: 3,
            estimatedMinutes: 5,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.1: ${lesson1_1.title} (4 sections)`);
      }
      const [lesson1_2] = await db.insert(formationLessons).values({
        moduleId: module1.id,
        trackId: "liturgy-track-1",
        title: "A Celebra\xE7\xE3o Eucar\xEDstica",
        description: "Estrutura e partes da Santa Missa",
        lessonNumber: 2,
        durationMinutes: 35,
        orderIndex: 1,
        objectives: [
          "Conhecer a estrutura da celebra\xE7\xE3o eucar\xEDstica",
          "Compreender o significado de cada parte da Missa",
          "Identificar os momentos principais da liturgia"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson1_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_2.id,
            type: "text",
            title: "As Duas Grandes Partes da Missa",
            content: `A celebra\xE7\xE3o eucar\xEDstica possui duas grandes partes que formam um \xFAnico ato de culto:

1. **Liturgia da Palavra**: Onde Deus fala ao seu povo e Cristo anuncia o Evangelho
2. **Liturgia Eucar\xEDstica**: Onde o povo oferece o p\xE3o e o vinho que se tornam o Corpo e Sangue de Cristo

Estas duas partes s\xE3o t\xE3o intimamente ligadas que constituem um s\xF3 ato de culto (IGMR 28).`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: "text",
            title: "Ritos Iniciais",
            content: `Os ritos iniciais preparam a assembleia para ouvir a Palavra e celebrar a Eucaristia:

- **Entrada**: Canto e prociss\xE3o
- **Sauda\xE7\xE3o**: O sacerdote sa\xFAda o povo
- **Ato Penitencial**: Reconhecemos nossos pecados
- **Gl\xF3ria**: Hino de louvor (exceto Advento e Quaresma)
- **Ora\xE7\xE3o do Dia**: Coleta que une as inten\xE7\xF5es do povo`,
            orderIndex: 1,
            estimatedMinutes: 7,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: "text",
            title: "Liturgia da Palavra",
            content: `Na Liturgia da Palavra, Deus fala ao seu povo:

- **Primeira Leitura**: Geralmente do Antigo Testamento
- **Salmo Responsorial**: Resposta orante \xE0 Palavra
- **Segunda Leitura**: Das cartas apost\xF3licas (domingos e solenidades)
- **Evangelho**: Ponto alto da Liturgia da Palavra
- **Homilia**: Explica\xE7\xE3o das leituras
- **Profiss\xE3o de F\xE9**: Credo
- **Ora\xE7\xE3o dos Fi\xE9is**: Preces pela Igreja e pelo mundo`,
            orderIndex: 2,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_2.id,
            type: "text",
            title: "Liturgia Eucar\xEDstica e Ritos Finais",
            content: `**Liturgia Eucar\xEDstica:**
- **Prepara\xE7\xE3o das Oferendas**: Apresenta\xE7\xE3o do p\xE3o e vinho
- **Ora\xE7\xE3o Eucar\xEDstica**: Consagra\xE7\xE3o - momento central da Missa
- **Rito da Comunh\xE3o**: Pai Nosso, sinal da paz, fra\xE7\xE3o do p\xE3o, comunh\xE3o

**Ritos Finais:**
- **Avisos**: Comunica\xE7\xF5es \xE0 assembleia
- **B\xEAn\xE7\xE3o**: Sacerdote aben\xE7oa o povo
- **Despedida**: "Ide em paz"

Como ministros, participamos especialmente do Rito da Comunh\xE3o.`,
            orderIndex: 3,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.2: ${lesson1_2.title} (4 sections)`);
      }
      const [lesson1_3] = await db.insert(formationLessons).values({
        moduleId: module1.id,
        trackId: "liturgy-track-1",
        title: "Formas de Receber a Comunh\xE3o",
        description: "Hist\xF3ria e orienta\xE7\xF5es sobre as formas de distribui\xE7\xE3o da Sagrada Comunh\xE3o",
        lessonNumber: 3,
        durationMinutes: 25,
        orderIndex: 2,
        objectives: [
          "Conhecer a hist\xF3ria das formas de comunh\xE3o",
          "Compreender as normas atuais da Igreja",
          "Respeitar as diferentes formas de piedade dos fi\xE9is"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson1_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson1_3.id,
            type: "text",
            title: "Perspectiva Hist\xF3rica",
            content: `Ao longo da hist\xF3ria da Igreja, a forma de receber a comunh\xE3o passou por diferentes pr\xE1ticas:

- **Primeiros s\xE9culos**: A comunh\xE3o era recebida na m\xE3o, com grande rever\xEAncia
- **Idade M\xE9dia**: Estabeleceu-se a pr\xE1tica da comunh\xE3o na boca
- **P\xF3s-Vaticano II**: A Igreja permitiu novamente a comunh\xE3o na m\xE3o em algumas regi\xF5es

Ambas as formas s\xE3o leg\xEDtimas e expressam a f\xE9 na presen\xE7a real de Cristo.`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_3.id,
            type: "text",
            title: "Normas Atuais",
            content: `A Instru\xE7\xE3o Redemptionis Sacramentum estabelece:

**Comunh\xE3o na Boca:**
- Forma tradicional
- O fiel inclina a cabe\xE7a
- O ministro coloca a h\xF3stia diretamente na l\xEDngua

**Comunh\xE3o na M\xE3o:**
- Permitida onde aprovada pela Confer\xEAncia Episcopal
- O fiel estende as m\xE3os (uma sobre a outra)
- Recebe a h\xF3stia e a leva \xE0 boca imediatamente
- As m\xE3os devem estar limpas e dignas

O fiel tem o direito de escolher a forma de receber a comunh\xE3o.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson1_3.id,
            type: "text",
            title: "Atitude do Ministro",
            content: `Como ministros, devemos:

1. **Respeitar**: A escolha de cada fiel sobre como receber a comunh\xE3o
2. **Estar preparados**: Para distribuir de ambas as formas com igual rever\xEAncia
3. **Evitar julgamentos**: N\xE3o cabe a n\xF3s julgar a piedade alheia
4. **Manter rever\xEAncia**: Em ambos os modos de distribui\xE7\xE3o
5. **Seguir as normas**: Da diocese e da par\xF3quia

Nossa atitude deve sempre refletir a f\xE9 na presen\xE7a real de Cristo.`,
            orderIndex: 2,
            estimatedMinutes: 7,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.3: ${lesson1_3.title} (3 sections)`);
      }
    }
    const liturgyModule2 = {
      trackId: "liturgy-track-1",
      title: "O Ministro Extraordin\xE1rio da Sagrada Comunh\xE3o",
      description: "Identidade, miss\xE3o e espiritualidade do ministro",
      category: "liturgia",
      orderIndex: 1,
      estimatedDuration: 75,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [module2] = await db.insert(formationModules).values(liturgyModule2).onConflictDoNothing().returning();
    if (module2) {
      console.log(`  \u2713 Module 2: ${liturgyModule2.title}`);
      const [lesson2_1] = await db.insert(formationLessons).values({
        moduleId: module2.id,
        trackId: "liturgy-track-1",
        title: "Voca\xE7\xE3o e Miss\xE3o do Ministro",
        description: "Compreendendo o chamado para o servi\xE7o eucar\xEDstico",
        lessonNumber: 1,
        durationMinutes: 30,
        orderIndex: 0,
        objectives: [
          "Reconhecer o minist\xE9rio como voca\xE7\xE3o",
          "Compreender a miss\xE3o do ministro extraordin\xE1rio",
          "Identificar as qualidades necess\xE1rias para o servi\xE7o"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson2_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson2_1.id,
            type: "text",
            title: "Um Chamado Especial",
            content: `O minist\xE9rio extraordin\xE1rio da Sagrada Comunh\xE3o \xE9 um verdadeiro chamado de Deus. N\xE3o se trata apenas de uma fun\xE7\xE3o pr\xE1tica, mas de uma voca\xE7\xE3o ao servi\xE7o do Corpo de Cristo.

S\xE3o Paulo nos ensina: "Cada um exer\xE7a, em benef\xEDcio dos outros, o dom que recebeu, como bons administradores da multiforme gra\xE7a de Deus" (1Pd 4,10).

Este minist\xE9rio exige:
- F\xE9 profunda na presen\xE7a real de Cristo
- Vida sacramental intensa
- Testemunho de vida crist\xE3
- Disponibilidade para servir`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson2_1.id,
            type: "text",
            title: "A Miss\xE3o do Ministro",
            content: `**Fun\xE7\xF5es principais:**

1. **Durante a Missa:**
   - Auxiliar na distribui\xE7\xE3o da Sagrada Comunh\xE3o
   - Servir o Corpo e Sangue de Cristo aos fi\xE9is

2. **Fora da Missa:**
   - Levar a comunh\xE3o aos enfermos e impossibilitados
   - Realizar celebra\xE7\xF5es dominicais sem presb\xEDtero (quando autorizado)
   - Expor o Sant\xEDssimo Sacramento para adora\xE7\xE3o (com autoriza\xE7\xE3o)

**Car\xE1ter extraordin\xE1rio:**
Este minist\xE9rio \xE9 "extraordin\xE1rio" porque complementa o minist\xE9rio ordin\xE1rio do bispo, presb\xEDtero e di\xE1cono. \xC9 exercido em casos de necessidade pastoral.`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson2_1.id,
            type: "text",
            title: "Qualidades Necess\xE1rias",
            content: `O C\xF3digo de Direito Can\xF4nico (c\xE2n. 910) e as orienta\xE7\xF5es lit\xFArgicas estabelecem que o ministro deve:

**Requisitos b\xE1sicos:**
- Ser cat\xF3lico praticante
- Estar em estado de gra\xE7a
- Ter idade m\xEDnima (geralmente 16 anos)
- Ter recebido os sacramentos da inicia\xE7\xE3o crist\xE3

**Qualidades espirituais:**
- F\xE9 viva na Eucaristia
- Vida de ora\xE7\xE3o constante
- Participa\xE7\xE3o dominical na Missa
- Testemunho de vida crist\xE3

**Qualidades humanas:**
- Maturidade e equil\xEDbrio
- Discri\xE7\xE3o e prud\xEAncia
- Pontualidade e responsabilidade
- Esp\xEDrito de servi\xE7o

**Forma\xE7\xE3o cont\xEDnua:**
O ministro deve buscar forma\xE7\xE3o permanente em liturgia, espiritualidade e doutrina cat\xF3lica.`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 2.1: ${lesson2_1.title} (3 sections)`);
      }
      const [lesson2_2] = await db.insert(formationLessons).values({
        moduleId: module2.id,
        trackId: "liturgy-track-1",
        title: "Procedimentos Lit\xFArgicos Pr\xE1ticos",
        description: "Como realizar o minist\xE9rio com rever\xEAncia e corre\xE7\xE3o",
        lessonNumber: 2,
        durationMinutes: 45,
        orderIndex: 1,
        objectives: [
          "Conhecer os procedimentos corretos para distribuir a comunh\xE3o",
          "Aprender a postura e gestos adequados",
          "Saber lidar com situa\xE7\xF5es especiais"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson2_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson2_2.id,
            type: "text",
            title: "Prepara\xE7\xE3o Antes da Missa",
            content: `**Prepara\xE7\xE3o pessoal:**
- Chegar com anteced\xEAncia (15-20 minutos)
- Fazer uma ora\xE7\xE3o preparat\xF3ria
- Verificar a escala e seu posicionamento
- Estar em estado de gra\xE7a (confiss\xE3o recente)
- Vestir-se adequadamente com dignidade

**Prepara\xE7\xE3o pr\xE1tica:**
- Higienizar bem as m\xE3os
- Verificar se h\xE1 \xE1gua e toalha dispon\xEDveis
- Conhecer o n\xFAmero aproximado de comungantes
- Identificar qualquer orienta\xE7\xE3o especial do dia`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: "text",
            title: "Durante a Distribui\xE7\xE3o da Comunh\xE3o",
            content: `**Momento de aproxima\xE7\xE3o ao altar:**
- Aguardar o sinal do sacerdote
- Aproximar-se com rever\xEAncia
- Fazer genuflex\xE3o antes de subir ao altar
- Receber a \xE2mbula ou o c\xE1lice das m\xE3os do sacerdote

**F\xF3rmula sacramental:**
Ao apresentar a h\xF3stia a cada fiel, dizer claramente:
"O Corpo de Cristo"

O fiel responde: "Am\xE9m"

Esta resposta n\xE3o \xE9 uma mera formalidade, mas uma profiss\xE3o de f\xE9 na presen\xE7a real.

**Postura:**
- Manter postura reverente e digna
- Olhar cada comungante nos olhos
- Aguardar a resposta "Am\xE9m" antes de depositar a h\xF3stia
- Manter aten\xE7\xE3o e cuidado com cada part\xEDcula
- Se uma h\xF3stia cair, recolh\xEA-la imediatamente com rever\xEAncia`,
            orderIndex: 1,
            estimatedMinutes: 15,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: "text",
            title: "Distribuindo a Comunh\xE3o na Boca e na M\xE3o",
            content: `**Na boca:**
1. Segurar a h\xF3stia entre o polegar e o indicador
2. Aguardar que o fiel incline a cabe\xE7a e abra a boca
3. Colocar a h\xF3stia delicadamente sobre a l\xEDngua
4. Evitar tocar os l\xE1bios ou l\xEDngua do fiel

**Na m\xE3o:**
1. O fiel deve estender as m\xE3os (uma sobre a outra)
2. Colocar a h\xF3stia com rever\xEAncia sobre a palma da m\xE3o
3. Observar discretamente se o fiel leva a h\xF3stia \xE0 boca imediatamente
4. Caso note algo irregular, informar discretamente o sacerdote ap\xF3s a Missa

**Aten\xE7\xE3o especial:**
- Crian\xE7as: Verificar se j\xE1 fizeram primeira comunh\xE3o
- Quem se aproxima de bra\xE7os cruzados: Dar a b\xEAn\xE7\xE3o ("Que Deus te aben\xE7oe")
- Cel\xEDacos: Podem existir h\xF3stias especiais dispon\xEDveis`,
            orderIndex: 2,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson2_2.id,
            type: "text",
            title: "Ap\xF3s a Distribui\xE7\xE3o",
            content: `**Purifica\xE7\xE3o dos vasos:**
- Retornar ao altar com rever\xEAncia
- Se houver h\xF3stias restantes, entregar ao sacerdote ou di\xE1cono
- Se for o c\xE1lice, o sacerdote ou di\xE1cono far\xE1 a purifica\xE7\xE3o
- Nunca deixar part\xEDculas na \xE2mbula - consumi-las com rever\xEAncia

**Retorno ao lugar:**
- Fazer genuflex\xE3o ao Sant\xEDssimo
- Retornar ao seu lugar
- Fazer uma a\xE7\xE3o de gra\xE7as pessoal

**P\xF3s-Missa:**
- Ajudar na arruma\xE7\xE3o se necess\xE1rio
- Fazer uma ora\xE7\xE3o de agradecimento
- Lavar as m\xE3os se tiver tocado as esp\xE9cies

**Lembrete importante:**
Ap\xF3s distribuir a comunh\xE3o, recomenda-se n\xE3o comer nem beber nada por 15 minutos, como sinal de rever\xEAncia.`,
            orderIndex: 3,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 2.2: ${lesson2_2.title} (4 sections)`);
      }
    }
    const liturgyModule3 = {
      trackId: "liturgy-track-1",
      title: "Espiritualidade Eucar\xEDstica",
      description: "Viv\xEAncia espiritual e compromisso do ministro",
      category: "liturgia",
      orderIndex: 2,
      estimatedDuration: 60,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [module3] = await db.insert(formationModules).values(liturgyModule3).onConflictDoNothing().returning();
    if (module3) {
      console.log(`  \u2713 Module 3: ${liturgyModule3.title}`);
      const [lesson3_1] = await db.insert(formationLessons).values({
        moduleId: module3.id,
        trackId: "liturgy-track-1",
        title: "A Vida de Ora\xE7\xE3o do Ministro",
        description: "Cultivando uma espiritualidade eucar\xEDstica profunda",
        lessonNumber: 1,
        durationMinutes: 30,
        orderIndex: 0,
        objectives: [
          "Compreender a import\xE2ncia da ora\xE7\xE3o pessoal",
          "Conhecer pr\xE1ticas de piedade eucar\xEDstica",
          "Desenvolver uma rela\xE7\xE3o pessoal com Cristo na Eucaristia"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson3_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson3_1.id,
            type: "text",
            title: "Fundamento da Vida Espiritual",
            content: `"Sem mim, nada podeis fazer" (Jo 15,5)

O minist\xE9rio eucar\xEDstico brota de uma vida de ora\xE7\xE3o intensa. N\xE3o podemos dar aos outros o que n\xE3o temos. Para distribuir o P\xE3o da Vida, precisamos primeiro nos alimentar dele.

**A ora\xE7\xE3o do ministro deve incluir:**
- **Missa Dominical**: Participa\xE7\xE3o ativa e consciente
- **Ora\xE7\xE3o di\xE1ria**: Momento pessoal com Deus
- **Leitura orante da Escritura**: Lectio Divina
- **Adora\xE7\xE3o eucar\xEDstica**: Tempo de contempla\xE7\xE3o
- **Exame de consci\xEAncia**: Revis\xE3o da vida di\xE1ria`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson3_1.id,
            type: "text",
            title: "Pr\xE1ticas de Piedade Eucar\xEDstica",
            content: `**Antes da Missa:**
- Chegar com anteced\xEAncia
- Fazer uma ora\xE7\xE3o preparat\xF3ria
- Revisar as leituras do dia
- Pedir ao Esp\xEDrito Santo que renove sua f\xE9

**Durante a Missa:**
- Participar ativamente de cada parte
- Comungar com devo\xE7\xE3o
- Fazer a\xE7\xE3o de gra\xE7as ap\xF3s comungar

**Adora\xE7\xE3o Eucar\xEDstica:**
- Visitar o Sant\xEDssimo regularmente
- Participar de horas de adora\xE7\xE3o
- Fazer vig\xEDlias quando poss\xEDvel

**Devo\xE7\xF5es complementares:**
- Ter\xE7o meditando os mist\xE9rios
- Leitura espiritual
- Ora\xE7\xE3o da Igreja (Liturgia das Horas)`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson3_1.id,
            type: "text",
            title: "Crescendo na Intimidade com Cristo",
            content: `A rela\xE7\xE3o com Cristo eucar\xEDstico \xE9 como qualquer relacionamento: precisa ser cultivada.

**Passos para aprofundar a intimidade:**

1. **Regularidade**: Estabelecer hor\xE1rios fixos de ora\xE7\xE3o
2. **Sil\xEAncio**: Criar momentos de escuta
3. **Confian\xE7a**: Abrir o cora\xE7\xE3o como a um amigo
4. **Perseveran\xE7a**: Manter a ora\xE7\xE3o mesmo na aridez
5. **A\xE7\xE3o**: Deixar a ora\xE7\xE3o transformar a vida

**Frutos esperados:**
- Maior amor \xE0 Eucaristia
- Desejo de servir com generosidade
- Paz interior
- Testemunho de vida que atrai outros

"Permanecei em mim, e eu permanecerei em v\xF3s" (Jo 15,4)`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 3.1: ${lesson3_1.title} (3 sections)`);
      }
      const [lesson3_2] = await db.insert(formationLessons).values({
        moduleId: module3.id,
        trackId: "liturgy-track-1",
        title: "O Testemunho de Vida do Ministro",
        description: "Vivendo coerentemente com o minist\xE9rio exercido",
        lessonNumber: 2,
        durationMinutes: 30,
        orderIndex: 1,
        objectives: [
          "Compreender a responsabilidade do testemunho",
          "Identificar \xE1reas de crescimento pessoal",
          "Comprometer-se com uma vida coerente com a f\xE9"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (lesson3_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: lesson3_2.id,
            type: "text",
            title: "A Chamada \xE0 Santidade",
            content: `"Sede santos, porque eu sou santo" (1Pd 1,16)

O ministro extraordin\xE1rio n\xE3o \xE9 apenas algu\xE9m que distribui a comunh\xE3o. \xC9 uma testemunha viva de Cristo. A comunidade observa nossa vida e nosso exemplo.

**O que o povo espera ver:**
- Coer\xEAncia entre f\xE9 e vida
- Participa\xE7\xE3o ass\xEDdua na Missa
- Vida sacramental intensa
- Caridade no relacionamento com todos
- Humildade no servi\xE7o

N\xE3o precisamos ser perfeitos, mas devemos estar em caminho de convers\xE3o constante.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson3_2.id,
            type: "text",
            title: "\xC1reas de Aten\xE7\xE3o Especial",
            content: `**Vida sacramental:**
- Confiss\xE3o regular (recomenda-se mensal)
- Comunh\xE3o frequente e devota
- Estar em estado de gra\xE7a ao ministrar

**Vida familiar:**
- Cultivar o amor conjugal (se casado)
- Educar os filhos na f\xE9
- Fazer da fam\xEDlia "igreja dom\xE9stica"

**Vida comunit\xE1ria:**
- Participar da vida paroquial
- Colaborar nas pastorais
- Manter bom relacionamento com todos

**Vida profissional:**
- Ser honesto no trabalho
- Ser testemunha de Cristo no ambiente profissional
- Praticar a justi\xE7a e a caridade

**Vida social:**
- Evitar ambientes e situa\xE7\xF5es incompat\xEDveis com a f\xE9
- Ser sal e luz no mundo (Mt 5,13-14)`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: lesson3_2.id,
            type: "text",
            title: "Lidando com as Pr\xF3prias Fragilidades",
            content: `Todos temos limita\xE7\xF5es e fraquezas. O importante \xE9 reconhec\xEA-las e buscar crescer.

**Quando cometer erros:**
1. Reconhecer humildemente
2. Buscar a confiss\xE3o
3. Reparar o mal causado quando poss\xEDvel
4. Continuar servindo com humildade

**Evitar:**
- Hipocrisia (parecer santo sem buscar s\xEA-lo)
- Esc\xE2ndalo (a\xE7\xF5es que afastam outros da f\xE9)
- Orgulho espiritual (sentir-se superior)
- Tibieza (frieza na vida espiritual)

**Lembrar sempre:**
"Quem se gloria, glorie-se no Senhor" (1Cor 1,31)

Nossa santidade n\xE3o \xE9 m\xE9rito nosso, mas dom de Deus. Servimos pela gra\xE7a d'Ele.`,
            orderIndex: 2,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 3.2: ${lesson3_2.title} (3 sections)`);
      }
    }
    console.log("\n\u{1F64F} Creating Spirituality Track modules and lessons...");
    const spiritModule1 = {
      trackId: "spirituality-track-1",
      title: "Fundamentos da Vida Espiritual",
      description: "Bases da espiritualidade crist\xE3 cat\xF3lica",
      category: "espiritualidade",
      orderIndex: 0,
      estimatedDuration: 80,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [spiritMod1] = await db.insert(formationModules).values(spiritModule1).onConflictDoNothing().returning();
    if (spiritMod1) {
      console.log(`  \u2713 Module 1: ${spiritModule1.title}`);
      const [spiritLesson1_1] = await db.insert(formationLessons).values({
        moduleId: spiritMod1.id,
        trackId: "spirituality-track-1",
        title: "A Ora\xE7\xE3o como Di\xE1logo com Deus",
        description: "Compreendendo e praticando a ora\xE7\xE3o crist\xE3",
        lessonNumber: 1,
        durationMinutes: 35,
        orderIndex: 0,
        objectives: [
          "Compreender a ora\xE7\xE3o como encontro pessoal com Deus",
          "Conhecer diferentes formas de ora\xE7\xE3o",
          "Desenvolver uma vida de ora\xE7\xE3o constante"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson1_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_1.id,
            type: "text",
            title: "O Que \xC9 Ora\xE7\xE3o?",
            content: `"A ora\xE7\xE3o \xE9 a eleva\xE7\xE3o da alma a Deus ou o pedido a Deus de bens convenientes" (S\xE3o Jo\xE3o Damasceno, citado no CIC 2559).

A ora\xE7\xE3o n\xE3o \xE9 apenas falar com Deus, mas estar com Deus. \xC9 um relacionamento pessoal de amor, confian\xE7a e entrega.

Jesus nos ensinou a orar:
- Pelo exemplo: Passava noites em ora\xE7\xE3o (Lc 6,12)
- Pelos ensinamentos: "Orai sem cessar" (1Ts 5,17)
- Pelo Pai Nosso: Modelo de toda ora\xE7\xE3o crist\xE3

A ora\xE7\xE3o crist\xE3 \xE9 trinit\xE1ria: dirigimo-nos ao Pai, por Cristo, no Esp\xEDrito Santo.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_1.id,
            type: "text",
            title: "Formas de Ora\xE7\xE3o",
            content: `A tradi\xE7\xE3o da Igreja reconhece v\xE1rias formas de ora\xE7\xE3o:

**Segundo a express\xE3o:**
- **Vocal**: Palavras pronunciadas (Pai Nosso, Ave Maria)
- **Meditativa**: Reflex\xE3o sobre a Palavra de Deus
- **Contemplativa**: Sil\xEAncio amoroso na presen\xE7a de Deus

**Segundo o conte\xFAdo:**
- **Adora\xE7\xE3o**: Reconhecer Deus como Criador
- **Louvor**: Glorificar a Deus por quem Ele \xE9
- **S\xFAplica**: Pedir o que necessitamos
- **Intercess\xE3o**: Pedir pelos outros
- **A\xE7\xE3o de gra\xE7as**: Agradecer os dons recebidos

Todas as formas s\xE3o v\xE1lidas e complementares. O importante \xE9 orar com o cora\xE7\xE3o.`,
            orderIndex: 1,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_1.id,
            type: "text",
            title: "Dificuldades na Ora\xE7\xE3o",
            content: `\xC9 normal enfrentar dificuldades na ora\xE7\xE3o:

**Distra\xE7\xF5es:**
- S\xE3o normais, especialmente no in\xEDcio
- Quando perceber, retornar suavemente \xE0 ora\xE7\xE3o
- N\xE3o se culpar, mas recome\xE7ar com paci\xEAncia

**Aridez espiritual:**
- Per\xEDodos sem "sentir" a presen\xE7a de Deus
- \xC9 uma prova da f\xE9, n\xE3o abandono de Deus
- Continuar orando com fidelidade

**Falta de tempo:**
- Estabelecer prioridades
- Come\xE7ar com pouco tempo, mas com regularidade
- "Quem diz que n\xE3o tem tempo, n\xE3o tem vontade" (Santa Teresa)

**Como perseverar:**
1. Hor\xE1rio fixo para ora\xE7\xE3o
2. Lugar apropriado e silencioso
3. Usar recursos (B\xEDblia, livros espirituais)
4. Pedir ajuda do Esp\xEDrito Santo
5. N\xE3o desistir nas dificuldades`,
            orderIndex: 2,
            estimatedMinutes: 13,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.1: ${spiritLesson1_1.title} (3 sections)`);
      }
      const [spiritLesson1_2] = await db.insert(formationLessons).values({
        moduleId: spiritMod1.id,
        trackId: "spirituality-track-1",
        title: "Os Sacramentos: Encontro com Cristo",
        description: "A vida sacramental como fonte de gra\xE7a",
        lessonNumber: 2,
        durationMinutes: 25,
        orderIndex: 1,
        objectives: [
          "Compreender os sacramentos como encontros com Cristo",
          "Valorizar especialmente a Eucaristia e a Reconcilia\xE7\xE3o",
          "Viver intensamente a vida sacramental"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson1_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_2.id,
            type: "text",
            title: "Sacramentos: Sinais Eficazes da Gra\xE7a",
            content: `Os sacramentos s\xE3o "obras-primas de Deus" (CIC 1116). S\xE3o sinais sens\xEDveis e eficazes da gra\xE7a, institu\xEDdos por Cristo e confiados \xE0 Igreja.

**Os sete sacramentos:**

**Inicia\xE7\xE3o Crist\xE3:**
1. Batismo - Nascimento para a vida nova
2. Confirma\xE7\xE3o - Fortaleza do Esp\xEDrito Santo
3. Eucaristia - Alimento da vida eterna

**Cura:**
4. Reconcilia\xE7\xE3o - Perd\xE3o dos pecados
5. Un\xE7\xE3o dos Enfermos - Conforto na doen\xE7a

**Servi\xE7o:**
6. Ordem - Minist\xE9rio apost\xF3lico
7. Matrim\xF4nio - Comunh\xE3o de vida e amor

Cada sacramento comunica uma gra\xE7a espec\xEDfica e nos configura a Cristo.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_2.id,
            type: "text",
            title: "Eucaristia e Reconcilia\xE7\xE3o: Fontes de Vida",
            content: `**A Eucaristia:**
- Centro e \xE1pice da vida crist\xE3
- Atualiza\xE7\xE3o do sacrif\xEDcio de Cristo
- Comunh\xE3o com o Corpo e Sangue do Senhor
- Alimento para o caminho

Para o ministro: Participar da Missa dominical com devo\xE7\xE3o, chegando cedo e preparando o cora\xE7\xE3o.

**A Reconcilia\xE7\xE3o:**
- Sacramento da miseric\xF3rdia de Deus
- Cura as feridas do pecado
- Restaura a amizade com Deus
- Fortalece para n\xE3o pecar

Recomenda-se a confiss\xE3o mensal para quem exerce minist\xE9rios. \xC9 um encontro de cura e liberta\xE7\xE3o.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_2.id,
            type: "text",
            title: "Vivendo Sacramentalmente",
            content: `**Prepara\xE7\xE3o para os sacramentos:**
- Estado de gra\xE7a (confiss\xE3o se necess\xE1rio)
- Jejum eucar\xEDstico (1 hora)
- Disposi\xE7\xE3o interior de f\xE9 e amor
- Roupa adequada e digna

**Ap\xF3s receber os sacramentos:**
- A\xE7\xE3o de gra\xE7as
- Compromisso de convers\xE3o
- Testemunho de vida transformada

**Frutos de uma vida sacramental intensa:**
- Crescimento na santidade
- For\xE7a para vencer o pecado
- Alegria e paz interior
- Capacidade de amar e servir

Os sacramentos n\xE3o s\xE3o "obriga\xE7\xF5es", mas encontros de amor com Cristo!`,
            orderIndex: 2,
            estimatedMinutes: 5,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.2: ${spiritLesson1_2.title} (3 sections)`);
      }
      const [spiritLesson1_3] = await db.insert(formationLessons).values({
        moduleId: spiritMod1.id,
        trackId: "spirituality-track-1",
        title: "A Palavra de Deus na Vida do Ministro",
        description: "Leitura orante da Sagrada Escritura",
        lessonNumber: 3,
        durationMinutes: 20,
        orderIndex: 2,
        objectives: [
          "Valorizar a Sagrada Escritura",
          "Aprender a fazer lectio divina",
          "Comprometer-se com a leitura di\xE1ria da Palavra"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson1_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson1_3.id,
            type: "text",
            title: "A B\xEDblia: Palavra Viva de Deus",
            content: `"Desconhecer as Escrituras \xE9 desconhecer Cristo" (S\xE3o Jer\xF4nimo).

A B\xEDblia n\xE3o \xE9 apenas um livro antigo, mas Palavra viva e eficaz (Hb 4,12). Deus continua falando atrav\xE9s dela hoje.

**Por que ler a B\xEDblia:**
- Para conhecer a Deus e seu plano de salva\xE7\xE3o
- Para conhecer Jesus Cristo mais profundamente
- Para encontrar orienta\xE7\xE3o para a vida
- Para alimentar a f\xE9 e a esperan\xE7a
- Para crescer na intimidade com Deus

O Conc\xEDlio Vaticano II recomenda: "\xC9 preciso que os fi\xE9is tenham amplo acesso \xE0 Sagrada Escritura" (DV 22).`,
            orderIndex: 0,
            estimatedMinutes: 7,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_3.id,
            type: "text",
            title: "Lectio Divina: Leitura Orante",
            content: `A lectio divina \xE9 um m\xE9todo antigo de leitura orante da B\xEDblia:

**1. LECTIO (Leitura):**
- Ler o texto com aten\xE7\xE3o
- O que o texto diz em si mesmo?

**2. MEDITATIO (Medita\xE7\xE3o):**
- Refletir sobre o texto
- O que o texto diz para mim?

**3. ORATIO (Ora\xE7\xE3o):**
- Responder a Deus
- O que quero dizer a Deus?

**4. CONTEMPLATIO (Contempla\xE7\xE3o):**
- Permanecer em sil\xEAncio com Deus
- Deixar Deus transformar o cora\xE7\xE3o

**5. ACTIO (A\xE7\xE3o):**
- Compromisso concreto
- O que vou fazer?

Dedicar 10-15 minutos di\xE1rios para essa pr\xE1tica.`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson1_3.id,
            type: "text",
            title: "Dicas Pr\xE1ticas",
            content: `**Como come\xE7ar:**
1. Escolher um hor\xE1rio di\xE1rio fixo
2. Come\xE7ar pelos Evangelhos (Mateus, Marcos, Lucas, Jo\xE3o)
3. Ter uma B\xEDblia cat\xF3lica com boas notas
4. Pedir a luz do Esp\xEDrito Santo antes de ler
5. Ler devagar, saboreando cada palavra

**Recursos \xFAteis:**
- Aplicativos de B\xEDblia cat\xF3licos
- Coment\xE1rios e subs\xEDdios b\xEDblicos
- Grupos de partilha da Palavra
- Homilias e catequeses

**Aten\xE7\xE3o:**
Sempre ler a B\xEDblia na f\xE9 da Igreja. Evitar interpreta\xE7\xF5es particulares. Em d\xFAvida, consultar um padre ou catequista.

"Tua palavra \xE9 l\xE2mpada para os meus passos, luz para o meu caminho" (Sl 119,105)`,
            orderIndex: 2,
            estimatedMinutes: 3,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 1.3: ${spiritLesson1_3.title} (3 sections)`);
      }
    }
    const spiritModule2 = {
      trackId: "spirituality-track-1",
      title: "As Virtudes na Vida do Ministro",
      description: "Cultivando as virtudes teologais e cardeais",
      category: "espiritualidade",
      orderIndex: 1,
      estimatedDuration: 70,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [spiritMod2] = await db.insert(formationModules).values(spiritModule2).onConflictDoNothing().returning();
    if (spiritMod2) {
      console.log(`  \u2713 Module 2: ${spiritModule2.title}`);
      const [spiritLesson2_1] = await db.insert(formationLessons).values({
        moduleId: spiritMod2.id,
        trackId: "spirituality-track-1",
        title: "Virtudes Teologais: F\xE9, Esperan\xE7a e Caridade",
        description: "As tr\xEAs virtudes que unem o homem a Deus",
        lessonNumber: 1,
        durationMinutes: 35,
        orderIndex: 0,
        objectives: [
          "Compreender as virtudes teologais",
          "Identificar como viv\xEA-las concretamente",
          "Crescer na f\xE9, esperan\xE7a e caridade"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson2_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_1.id,
            type: "text",
            title: "A F\xE9: Dom e Resposta",
            content: `"A f\xE9 \xE9 a certeza das coisas que se esperam, a demonstra\xE7\xE3o das realidades que n\xE3o se veem" (Hb 11,1).

**A f\xE9 \xE9:**
- Dom gratuito de Deus
- Resposta livre do homem
- Ades\xE3o pessoal a Deus
- Aceita\xE7\xE3o da verdade revelada

**Vivendo a f\xE9:**
- Professar: Crer e proclamar a f\xE9 (Credo)
- Celebrar: Participar dos sacramentos
- Viver: Conformar a vida aos mandamentos
- Orar: Dialogar com Deus na ora\xE7\xE3o

**Para o ministro:**
A f\xE9 na presen\xE7a real de Cristo na Eucaristia deve ser viva e consciente. Cada gesto lit\xFArgico deve expressar essa f\xE9 profunda.

"Creio, Senhor, mas aumenta a minha f\xE9!" (Mc 9,24)`,
            orderIndex: 0,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson2_1.id,
            type: "text",
            title: "A Esperan\xE7a: \xC2ncora da Alma",
            content: `"A esperan\xE7a n\xE3o decepciona, porque o amor de Deus foi derramado em nossos cora\xE7\xF5es" (Rm 5,5).

**A esperan\xE7a crist\xE3:**
- Confia nas promessas de Cristo
- Aguarda a vida eterna
- Conta com a gra\xE7a do Esp\xEDrito Santo
- N\xE3o \xE9 ingenuidade, mas certeza fundada em Deus

**Contra a esperan\xE7a:**
- Desespero: Perder a confian\xE7a em Deus
- Presun\xE7\xE3o: Confiar apenas em si mesmo

**Vivendo a esperan\xE7a:**
- Nas dificuldades: Confiar na provid\xEAncia
- No pecado: Crer no perd\xE3o divino
- No sofrimento: Unir-se \xE0 cruz de Cristo
- No servi\xE7o: Trabalhar pelo Reino sem desanimar

"Espera no Senhor, s\xEA forte! Coragem! Espera no Senhor!" (Sl 27,14)`,
            orderIndex: 1,
            estimatedMinutes: 11,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson2_1.id,
            type: "text",
            title: "A Caridade: A Maior das Virtudes",
            content: `"Deus \xE9 amor" (1Jo 4,8). A caridade \xE9 a virtude pela qual amamos a Deus acima de tudo e ao pr\xF3ximo como a n\xF3s mesmos.

**Duplo mandamento:**
1. Amar a Deus de todo o cora\xE7\xE3o (verticalidade)
2. Amar o pr\xF3ximo como a si mesmo (horizontalidade)

N\xE3o h\xE1 caridade para com Deus sem caridade para com o pr\xF3ximo, e vice-versa.

**Express\xF5es da caridade:**
- **Paci\xEAncia**: Suportar com amor
- **Bondade**: Fazer o bem aos outros
- **Perd\xE3o**: N\xE3o guardar rancor
- **Servi\xE7o**: Doar-se generosamente
- **Verdade**: Falar com amor, mas com verdade

**Para o ministro:**
O minist\xE9rio \xE9 exerc\xEDcio de caridade. Servimos porque amamos a Cristo presente na Eucaristia e nos irm\xE3os.

"Permaneceis no meu amor" (Jo 15,9)`,
            orderIndex: 2,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 2.1: ${spiritLesson2_1.title} (3 sections)`);
      }
      const [spiritLesson2_2] = await db.insert(formationLessons).values({
        moduleId: spiritMod2.id,
        trackId: "spirituality-track-1",
        title: "Virtudes Cardeais: Prud\xEAncia e Justi\xE7a",
        description: "Vivendo com sabedoria e retid\xE3o",
        lessonNumber: 2,
        durationMinutes: 20,
        orderIndex: 1,
        objectives: [
          "Conhecer as virtudes da prud\xEAncia e justi\xE7a",
          "Aplic\xE1-las na vida e no minist\xE9rio",
          "Crescer em sabedoria e retid\xE3o"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson2_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_2.id,
            type: "text",
            title: "Prud\xEAncia: A Sabedoria Pr\xE1tica",
            content: `A prud\xEAncia \xE9 a virtude que disp\xF5e a raz\xE3o a discernir, em toda circunst\xE2ncia, o verdadeiro bem e a escolher os meios adequados para realiz\xE1-lo.

**Atos da prud\xEAncia:**
1. **Aconselhar-se**: Buscar orienta\xE7\xE3o
2. **Julgar**: Discernir o que fazer
3. **Decidir**: Escolher e agir

**No minist\xE9rio:**
- Saber quando falar e quando calar
- Discernir situa\xE7\xF5es delicadas
- Agir com equil\xEDbrio e bom senso
- Evitar extremos

**Pecados contra a prud\xEAncia:**
- Precipita\xE7\xE3o: Agir sem pensar
- Neglig\xEAncia: N\xE3o dar import\xE2ncia devida
- Inconst\xE2ncia: Mudar sem motivo

"Sede prudentes como as serpentes e simples como as pombas" (Mt 10,16)`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson2_2.id,
            type: "text",
            title: "Justi\xE7a: Dar a Cada Um o Que Lhe \xC9 Devido",
            content: `A justi\xE7a \xE9 a vontade firme e constante de dar a Deus e ao pr\xF3ximo o que lhes \xE9 devido.

**Justi\xE7a para com Deus:**
- Culto de adora\xE7\xE3o (virtude da religi\xE3o)
- Gratid\xE3o pelos dons recebidos
- Fidelidade \xE0s promessas feitas

**Justi\xE7a para com o pr\xF3ximo:**
- Respeitar os direitos de cada um
- Promover a equidade nas rela\xE7\xF5es
- N\xE3o julgar precipitadamente
- Respeitar a boa fama (n\xE3o caluniar)

**Justi\xE7a social:**
- Preocupa\xE7\xE3o com o bem comum
- Aten\xE7\xE3o aos mais pobres e necessitados
- Compromisso com uma sociedade mais justa

**No minist\xE9rio:**
- Tratar todos com igualdade e respeito
- N\xE3o fazer acep\xE7\xE3o de pessoas
- Cumprir fielmente os compromissos assumidos

"Buscai primeiro o Reino de Deus e a sua justi\xE7a" (Mt 6,33)`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 2.2: ${spiritLesson2_2.title} (2 sections)`);
      }
      const [spiritLesson2_3] = await db.insert(formationLessons).values({
        moduleId: spiritMod2.id,
        trackId: "spirituality-track-1",
        title: "Virtudes Cardeais: Fortaleza e Temperan\xE7a",
        description: "For\xE7a nas dificuldades e dom\xEDnio de si mesmo",
        lessonNumber: 3,
        durationMinutes: 15,
        orderIndex: 2,
        objectives: [
          "Desenvolver a fortaleza espiritual",
          "Praticar a temperan\xE7a no dia a dia",
          "Vencer as tenta\xE7\xF5es e prova\xE7\xF5es"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson2_3) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson2_3.id,
            type: "text",
            title: "Fortaleza: Firmeza nas Dificuldades",
            content: `A fortaleza assegura, nas dificuldades, a firmeza e a const\xE2ncia na busca do bem.

**Duas dimens\xF5es:**
1. **Resistir**: Suportar as prova\xE7\xF5es sem desanimar
2. **Atacar**: Enfrentar os obst\xE1culos com coragem

**Manifesta\xE7\xF5es:**
- Paci\xEAncia no sofrimento
- Perseveran\xE7a na ora\xE7\xE3o
- Coragem para testemunhar a f\xE9
- Firmeza diante das tenta\xE7\xF5es

**No minist\xE9rio:**
- Continuar servindo mesmo quando dif\xEDcil
- N\xE3o desanimar com cr\xEDticas ou incompreens\xF5es
- Manter-se fiel mesmo na aridez espiritual
- Ter coragem de corrigir quando necess\xE1rio

"Tudo posso naquele que me fortalece" (Fl 4,13)`,
            orderIndex: 0,
            estimatedMinutes: 8,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson2_3.id,
            type: "text",
            title: "Temperan\xE7a: Equil\xEDbrio e Modera\xE7\xE3o",
            content: `A temperan\xE7a modera a atra\xE7\xE3o pelos prazeres sens\xEDveis e assegura o dom\xEDnio da vontade sobre os instintos.

**\xC1reas de exerc\xEDcio:**
- **Alimenta\xE7\xE3o**: Comer e beber com modera\xE7\xE3o
- **Sono**: Descanso adequado sem pregui\xE7a
- **Divers\xE3o**: Lazer saud\xE1vel e equilibrado
- **Sexualidade**: Vivida conforme estado de vida
- **Consumo**: Evitar materialismo e apego

**Virtudes relacionadas:**
- Humildade: N\xE3o se exaltar
- Mansid\xE3o: Dominar a ira
- Mod\xE9stia: Apresenta\xE7\xE3o digna

**No minist\xE9rio:**
- Vestir-se adequadamente
- Evitar excessos antes de servir
- Manter equil\xEDbrio entre servi\xE7o e vida pessoal
- N\xE3o buscar reconhecimento ou destaque

"Sede s\xF3brios e vigiai" (1Pd 5,8)`,
            orderIndex: 1,
            estimatedMinutes: 7,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 2.3: ${spiritLesson2_3.title} (2 sections)`);
      }
    }
    const spiritModule3 = {
      trackId: "spirituality-track-1",
      title: "Maria e os Santos: Companheiros de Jornada",
      description: "A comunh\xE3o dos santos e a intercess\xE3o de Maria",
      category: "espiritualidade",
      orderIndex: 2,
      estimatedDuration: 50,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    const [spiritMod3] = await db.insert(formationModules).values(spiritModule3).onConflictDoNothing().returning();
    if (spiritMod3) {
      console.log(`  \u2713 Module 3: ${spiritModule3.title}`);
      const [spiritLesson3_1] = await db.insert(formationLessons).values({
        moduleId: spiritMod3.id,
        trackId: "spirituality-track-1",
        title: "Maria, M\xE3e da Eucaristia",
        description: "A rela\xE7\xE3o de Maria com a Eucaristia e seu exemplo para n\xF3s",
        lessonNumber: 1,
        durationMinutes: 25,
        orderIndex: 0,
        objectives: [
          "Compreender o papel de Maria na Eucaristia",
          "Imitar as atitudes marianas",
          "Confiar na intercess\xE3o de Nossa Senhora"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson3_1) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson3_1.id,
            type: "text",
            title: "Maria e a Eucaristia",
            content: `Maria tem uma rela\xE7\xE3o \xFAnica com a Eucaristia:

**Ela \xE9:**
- **M\xE3e da Eucaristia**: Gerou em seu ventre o Corpo que se tornou alimento
- **Primeira sagr\xE1rio**: Guardou Jesus em seu corpo
- **Modelo eucar\xEDstico**: Viveu em comunh\xE3o perfeita com Cristo

S\xE3o Jo\xE3o Paulo II ensinou: "Maria pode guiar-nos para este Sant\xEDssimo Sacramento, porque tem com Ele uma rela\xE7\xE3o profunda" (Ecclesia de Eucharistia, 53).

**A Visita\xE7\xE3o:**
Quando Maria leva Jesus a Isabel, \xE9 como uma "prociss\xE3o eucar\xEDstica". Ela nos ensina a levar Cristo aos outros.`,
            orderIndex: 0,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson3_1.id,
            type: "text",
            title: "Atitudes Marianas para o Ministro",
            content: `**F\xE9:**
"Eis aqui a serva do Senhor" (Lc 1,38)
- Crer na palavra de Deus
- Aceitar os planos divinos
- Confiar mesmo sem compreender tudo

**Humildade:**
"Fez em mim grandes coisas" (Lc 1,49)
- Reconhecer tudo como dom de Deus
- N\xE3o buscar destaque pessoal
- Servir com simplicidade

**Disponibilidade:**
"Fazei tudo o que Ele vos disser" (Jo 2,5)
- Estar pronto para servir
- Obedecer com prontid\xE3o
- Indicar sempre Jesus, n\xE3o a si mesmo

**Sil\xEAncio:**
"Maria guardava todas estas coisas no cora\xE7\xE3o" (Lc 2,51)
- Contemplar os mist\xE9rios de Deus
- Discri\xE7\xE3o no servi\xE7o
- Ora\xE7\xE3o silenciosa`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson3_1.id,
            type: "text",
            title: "Devo\xE7\xE3o Mariana do Ministro",
            content: `**Pr\xE1ticas recomendadas:**
- **Ter\xE7o di\xE1rio**: Meditar os mist\xE9rios com Maria
- **Angelus**: Tr\xEAs vezes ao dia
- **Consagra\xE7\xE3o a Maria**: Entregar-se aos cuidados maternos
- **Escapul\xE1rio**: Usar como sinal de prote\xE7\xE3o
- **S\xE1bado mariano**: Dedicar especialmente \xE0 Nossa Senhora

**Ora\xE7\xE3o antes do minist\xE9rio:**
"Maria, M\xE3e da Eucaristia,
Ensina-me a amar teu Filho presente no Sacramento.
D\xE1-me tuas m\xE3os puras para distribuir a Comunh\xE3o,
Tua humildade para servir,
E teu cora\xE7\xE3o para adorar.
Que eu seja, como tu, portador de Jesus para o mundo.
Am\xE9m."

"A Virgem Maria com seu exemplo nos orienta para este Sant\xEDssimo Sacramento" (CIC 2674)`,
            orderIndex: 2,
            estimatedMinutes: 5,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 3.1: ${spiritLesson3_1.title} (3 sections)`);
      }
      const [spiritLesson3_2] = await db.insert(formationLessons).values({
        moduleId: spiritMod3.id,
        trackId: "spirituality-track-1",
        title: "Os Santos: Exemplos de Santidade",
        description: "Aprendendo com os santos que amaram a Eucaristia",
        lessonNumber: 2,
        durationMinutes: 25,
        orderIndex: 1,
        objectives: [
          "Conhecer santos eucar\xEDsticos",
          "Aprender com seus exemplos",
          "Invocar sua intercess\xE3o"
        ],
        isActive: true,
        createdAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing().returning();
      if (spiritLesson3_2) {
        await db.insert(formationLessonSections).values([
          {
            lessonId: spiritLesson3_2.id,
            type: "text",
            title: "Santos Eucar\xEDsticos",
            content: `Muitos santos se destacaram por seu amor \xE0 Eucaristia:

**S\xE3o Tars\xEDcio (s\xE9c. III)**
- M\xE1rtir da Eucaristia
- Morreu protegendo o Sant\xEDssimo Sacramento
- Padroeiro dos coroinhas e ministros
- Exemplo de coragem e fidelidade

**S\xE3o Francisco de Assis (1182-1226)**
- Profunda rever\xEAncia \xE0 Eucaristia
- Dizia: "O homem deve tremer, o mundo estremecer e o c\xE9u alegrar-se quando Cristo est\xE1 no altar"
- Insistia na dignidade dos vasos sagrados e do altar

**S\xE3o Tom\xE1s de Aquino (1225-1274)**
- Doutor Eucar\xEDstico
- Escreveu hinos eucar\xEDsticos (Tantum Ergo, Pange Lingua)
- Dedicou sua intelig\xEAncia a explicar o mist\xE9rio eucar\xEDstico

**Santa Teresa de Calcut\xE1 (1910-1997)**
- Via Jesus nos pobres e na Eucaristia
- Dizia: "A Eucaristia est\xE1 ligada \xE0 Paix\xE3o e \xE0 pobreza"
- Hora di\xE1ria de adora\xE7\xE3o eucar\xEDstica`,
            orderIndex: 0,
            estimatedMinutes: 12,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson3_2.id,
            type: "text",
            title: "Mais Santos para Inspirar",
            content: `**Santa Clara de Assis**
- Adora\xE7\xE3o perp\xE9tua em seu mosteiro
- Afastou inimigos expondo o Sant\xEDssimo

**S\xE3o Pedro Juli\xE3o Eymard**
- Fundador dos Sacramentinos
- "Ap\xF3stolo da Eucaristia"
- Promoveu a adora\xE7\xE3o eucar\xEDstica

**Santo Padre Pio**
- Missas de v\xE1rias horas por seu fervor
- Estigmas como uni\xE3o \xE0 Paix\xE3o de Cristo
- A\xE7\xE3o de gra\xE7as prolongada ap\xF3s a Missa

**Santa Faustina Kowalska**
- Vis\xF5es de Jesus Eucar\xEDstico
- Ensinou sobre a miseric\xF3rdia de Cristo presente na Eucaristia

Cada santo nos mostra um caminho para amar mais a Eucaristia!`,
            orderIndex: 1,
            estimatedMinutes: 10,
            createdAt: /* @__PURE__ */ new Date()
          },
          {
            lessonId: spiritLesson3_2.id,
            type: "text",
            title: "Comunh\xE3o dos Santos",
            content: `A Igreja \xE9 una: os que est\xE3o no c\xE9u, no purgat\xF3rio e na terra formam uma s\xF3 fam\xEDlia.

**Intercess\xE3o dos santos:**
- N\xE3o adoramos os santos, mas os veneramos
- Pedimos sua intercess\xE3o junto a Deus
- Eles s\xE3o nossos irm\xE3os mais velhos na f\xE9

**Como invocar os santos:**
- Escolher um santo patrono pessoal
- Conhecer sua vida e virtudes
- Imit\xE1-los no amor a Cristo
- Pedir sua intercess\xE3o nas necessidades

**Ora\xE7\xE3o de invoca\xE7\xE3o:**
"S\xE3o Tars\xEDcio, m\xE1rtir da Eucaristia,
Intercede por n\xF3s, ministros extraordin\xE1rios.
D\xE1-nos tua coragem para defender a f\xE9,
Teu amor ao Sant\xEDssimo Sacramento,
E tua pureza de cora\xE7\xE3o.
Que sejamos dignos de servir ao Corpo de Cristo.
Am\xE9m."`,
            orderIndex: 2,
            estimatedMinutes: 3,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]);
        console.log(`    \u2713 Lesson 3.2: ${spiritLesson3_2.title} (3 sections)`);
      }
    }
    console.log("\n\u2705 Formation seed completed successfully!");
    console.log("\n\u{1F4CA} Summary:");
    console.log("  \u2022 2 tracks created");
    console.log("  \u2022 6 modules created (3 per track)");
    console.log("  \u2022 15 lessons created");
    console.log("  \u2022 Multiple sections per lesson");
    return {
      success: true,
      message: "Formation content seeded successfully",
      stats: {
        tracks: 2,
        modules: 6,
        lessons: 15
      }
    };
  } catch (error) {
    console.error("\u274C Error seeding formation:", error);
    throw error;
  }
}
var formation_seed_default;
var init_formation_seed = __esm({
  async "server/seeds/formation-seed.ts"() {
    "use strict";
    await init_db();
    init_schema();
    formation_seed_default = seedFormation;
  }
});

// server/index.ts
import express2 from "express";
import cors from "cors";
import helmet from "helmet";

// server/routes.ts
await init_storage();
import { createServer } from "http";
import cookieParser from "cookie-parser";
import crypto2 from "crypto";

// server/auth.ts
await init_db();
init_schema();
init_nameFormatter();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq as eq2 } from "drizzle-orm";
function getJWTSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      `\u{1F534} CRITICAL: JWT_SECRET environment variable is required!
Please set JWT_SECRET in your .env file with a strong random value.
Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
  return process.env.JWT_SECRET;
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
      const [currentUser] = await db.select().from(users).where(eq2(users.id, user.id)).limit(1);
      if (!currentUser || currentUser.status !== "active") {
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
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
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
    const normalizedEmail = userData.email.trim().toLowerCase();
    const [existingUser] = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
    if (existingUser) {
      throw new Error("Este email j\xE1 est\xE1 cadastrado");
    }
    const passwordHash = await hashPassword(userData.password);
    const formattedName = formatName(userData.name);
    const [newUser] = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash,
      name: formattedName,
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
    const [user] = await db.select().from(users).where(eq2(users.id, userId)).limit(1);
    if (!user) {
      throw new Error("Usu\xE1rio n\xE3o encontrado");
    }
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Senha atual incorreta");
    }
    const newPasswordHash = await hashPassword(newPassword);
    await db.update(users).set({
      passwordHash: newPasswordHash,
      requiresPasswordChange: false,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, userId));
    return { message: "Senha alterada com sucesso" };
  } catch (error) {
    throw error;
  }
}
async function resetPassword(email) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq2(users.email, normalizedEmail)).limit(1);
    if (!user) {
      return { message: "Se o email existir em nosso sistema, voc\xEA receber\xE1 instru\xE7\xF5es para redefinir sua senha." };
    }
    const crypto3 = await import("crypto");
    const tempPassword = crypto3.randomBytes(12).toString("base64").slice(0, 12) + "!Aa1";
    const passwordHash = await hashPassword(tempPassword);
    await db.update(users).set({
      passwordHash,
      requiresPasswordChange: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, user.id));
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV ONLY] Senha tempor\xE1ria para ${email}: ${tempPassword}`);
    }
    return { message: "Se o email existir em nosso sistema, voc\xEA receber\xE1 instru\xE7\xF5es para redefinir sua senha." };
  } catch (error) {
    throw error;
  }
}

// server/authRoutes.ts
import { Router as Router2 } from "express";
await init_db();
init_schema();
import { z } from "zod";
import { eq as eq4 } from "drizzle-orm";

// server/routes/session.ts
await init_db();
init_schema();
import { Router } from "express";
import { eq as eq3, and as and2, sql as sql3 } from "drizzle-orm";
import { nanoid } from "nanoid";
var router = Router();
var INACTIVITY_TIMEOUT_MINUTES = 10;
var SESSION_EXPIRES_HOURS = 12;
router.post("/verify", async (req, res) => {
  return res.json({
    expired: false,
    minutesInactive: 0,
    minutesRemaining: 10
  });
});
router.post("/heartbeat", async (req, res) => {
  res.json({ success: true, timestamp: /* @__PURE__ */ new Date() });
});
async function createSession(userId, ipAddress, userAgent) {
  const sessionToken = nanoid(64);
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRES_HOURS);
  try {
    await db.update(activeSessions).set({ isActive: false }).where(
      and2(
        eq3(activeSessions.userId, userId),
        eq3(activeSessions.isActive, true)
      )
    );
    await db.insert(activeSessions).values({
      userId,
      sessionToken,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });
    console.log(`[SESSION] \u2705 Created - User ${userId}`);
    return sessionToken;
  } catch (error) {
    console.error("[SESSION] Error creating:", error);
    throw new Error("Erro ao criar sess\xE3o");
  }
}
router.post("/destroy", async (req, res) => {
  const sessionToken = req.cookies?.session_token || req.body.sessionToken;
  if (sessionToken) {
    try {
      await db.update(activeSessions).set({ isActive: false }).where(eq3(activeSessions.sessionToken, sessionToken));
      console.log("[SESSION] \u{1F6AA} Destroyed - Token:", sessionToken.substring(0, 10) + "...");
    } catch (error) {
      console.error("[SESSION] Error destroying:", error);
    }
  }
  res.clearCookie("session_token");
  res.json({ success: true });
});
router.get("/cleanup", async (req, res) => {
  try {
    const inactiveResult = await db.update(activeSessions).set({ isActive: false }).where(
      and2(
        eq3(activeSessions.isActive, true),
        sql3`EXTRACT(EPOCH FROM (NOW() - ${activeSessions.lastActivityAt})) / 60 > ${INACTIVITY_TIMEOUT_MINUTES}`
      )
    ).returning({ id: activeSessions.id });
    const deleteResult = await db.delete(activeSessions).where(
      and2(
        eq3(activeSessions.isActive, false),
        sql3`${activeSessions.createdAt} < NOW() - INTERVAL '30 days'`
      )
    ).returning({ id: activeSessions.id });
    console.log(`[SESSION] \u{1F9F9} Cleanup: ${inactiveResult.length} expired, ${deleteResult.length} deleted`);
    res.json({
      success: true,
      expired: inactiveResult.length,
      deleted: deleteResult.length
    });
  } catch (error) {
    console.error("[SESSION] Error in cleanup:", error);
    res.status(500).json({ success: false, message: "Erro ao limpar sess\xF5es" });
  }
});
var session_default = router;

// server/middleware/auditLogger.ts
await init_db();
init_schema();
init_logger();
function sanitizeAuditData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }
  const sensitiveFields = [
    "password",
    "passwordHash",
    "currentPassword",
    "newPassword",
    "token",
    "jwt",
    "secret",
    "apiKey",
    "privateKey"
  ];
  const sanitized = {};
  for (const key of Object.keys(data)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof data[key] === "object" && data[key] !== null) {
      sanitized[key] = sanitizeAuditData(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}
async function logAudit(action, metadata = {}) {
  try {
    const sanitizedMetadata = sanitizeAuditData(metadata);
    logger.info(`[AUDIT] ${action}`, sanitizedMetadata);
    await db.insert(activityLogs).values({
      userId: metadata.userId || null,
      action,
      details: JSON.stringify(sanitizedMetadata),
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      createdAt: /* @__PURE__ */ new Date()
    });
  } catch (error) {
    logger.error("[AUDIT] Failed to log audit entry", { error, action });
  }
}
function auditLog(action, extractMetadata) {
  return async (req, res, next) => {
    const startTime = Date.now();
    const baseMetadata = {
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      method: req.method,
      path: req.path
    };
    const customMetadata = extractMetadata ? extractMetadata(req) : {};
    res.on("finish", async () => {
      const duration = Date.now() - startTime;
      const fullMetadata = {
        ...baseMetadata,
        ...customMetadata,
        statusCode: res.statusCode,
        duration
      };
      if (res.statusCode < 400) {
        await logAudit(action, fullMetadata);
      }
    });
    next();
  };
}
function auditPersonalDataAccess(dataType) {
  return auditLog(
    dataType === "religious" ? "RELIGIOUS_DATA_ACCESS" /* RELIGIOUS_DATA_ACCESS */ : "PERSONAL_DATA_ACCESS" /* PERSONAL_DATA_ACCESS */,
    (req) => ({
      dataType,
      query: sanitizeAuditData(req.query),
      params: sanitizeAuditData(req.params)
    })
  );
}
async function auditLoginAttempt(email, success, req, reason) {
  await logAudit(
    success ? "LOGIN" /* LOGIN */ : "LOGIN_FAILED" /* LOGIN_FAILED */,
    {
      email,
      success,
      reason,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    }
  );
}

// server/authRoutes.ts
var router2 = Router2();
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
router2.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    await auditLoginAttempt(email, true, req);
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1e3,
      // 12 horas
      path: "/"
    });
    const sessionToken = await createSession(
      result.user.id,
      req.ip || req.socket.remoteAddress,
      req.get("user-agent")
    );
    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1e3,
      // 12 horas
      path: "/"
    });
    res.json({
      success: true,
      token: result.token,
      sessionToken,
      // Retorna para o frontend armazenar em localStorage
      user: result.user
    });
  } catch (error) {
    const email = req.body?.email;
    if (email) {
      await auditLoginAttempt(email, false, req, error.message || "Credenciais inv\xE1lidas");
    }
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
router2.post("/register", async (req, res) => {
  try {
    const userData = publicRegisterSchema.parse(req.body);
    const newUser = await register({
      ...userData,
      role: "ministro",
      status: "pending"
    });
    await logAudit("USER_CREATE" /* USER_CREATE */, {
      userId: newUser.id,
      email: userData.email,
      name: userData.name,
      role: "ministro",
      status: "pending",
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
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
router2.post("/admin-register", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    if ((userData.role === "gestor" || userData.role === "coordenador") && req.user?.role !== "gestor" && req.user?.role !== "reitor") {
      return res.status(403).json({
        success: false,
        message: "Apenas gestores podem criar coordenadores ou outros gestores"
      });
    }
    if (req.user?.role === "coordenador" && userData.role !== "ministro") {
      return res.status(403).json({
        success: false,
        message: "Coordenadores s\xF3 podem criar ministros"
      });
    }
    const newUser = await register(userData);
    await logAudit("USER_CREATE" /* USER_CREATE */, {
      userId: req.user?.id,
      targetUserId: newUser.id,
      targetResource: "user",
      changes: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        createdBy: req.user?.email
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
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
router2.get("/me", authenticateToken, async (req, res) => {
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
    }).from(users).where(eq4(users.id, userId)).limit(1);
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
router2.get("/user", authenticateToken, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar dados do usu\xE1rio"
    });
  }
});
router2.post("/logout", authenticateToken, async (req, res) => {
  if (req.user?.id) {
    await logAudit("LOGOUT" /* LOGOUT */, {
      userId: req.user.id,
      email: req.user.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
  }
  const sessionToken = req.cookies?.session_token;
  if (sessionToken) {
    try {
      const { activeSessions: activeSessions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await db.update(activeSessions2).set({ isActive: false }).where(eq4(activeSessions2.sessionToken, sessionToken));
      console.log("[AUTH] Sess\xE3o marcada como inativa no logout");
    } catch (error) {
      console.error("[AUTH] Erro ao inativar sess\xE3o:", error);
    }
  }
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/"
  });
  res.clearCookie("session_token", {
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
router2.post("/change-password", authenticateToken, async (req, res) => {
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
    await logAudit("PASSWORD_CHANGE" /* PASSWORD_CHANGE */, {
      userId: req.user.id,
      email: req.user.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
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
router2.post("/admin-reset-password", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { userId, newPassword } = adminResetSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq4(users.id, userId)).limit(1);
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
    }).where(eq4(users.id, userId));
    await logAudit("USER_UPDATE" /* USER_UPDATE */, {
      userId: currentUser?.id,
      targetUserId: userId,
      targetResource: "user",
      action: "admin_password_reset",
      changes: {
        resetBy: currentUser?.email,
        targetUser: user.email,
        requiresPasswordChange: true
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
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
router2.post("/reset-password", async (req, res) => {
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
    await logAudit("PASSWORD_RESET_REQUEST" /* PASSWORD_RESET_REQUEST */, {
      email: normalizedEmail,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
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
router2.get("/check", authenticateToken, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: req.user
  });
});
var authRoutes_default = router2;

// server/passwordResetRoutes.ts
await init_db();
init_schema();
import { Router as Router3 } from "express";
import { eq as eq5, and as and3, or as or2, desc as desc2 } from "drizzle-orm";
var router3 = Router3();
router3.post("/request-reset", async (req, res) => {
  try {
    const { email, reason } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email \xE9 obrigat\xF3rio"
      });
    }
    const [user] = await db.select().from(users).where(eq5(users.email, email)).limit(1);
    if (!user) {
      return res.json({
        success: true,
        message: "Se o email existir em nosso sistema, uma solicita\xE7\xE3o ser\xE1 enviada ao administrador."
      });
    }
    const [existingRequest] = await db.select().from(passwordResetRequests).where(
      and3(
        eq5(passwordResetRequests.userId, user.id),
        eq5(passwordResetRequests.status, "pending")
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
      and3(
        eq5(users.status, "active"),
        // Notifica tanto coordenadores quanto gestores
        or2(
          eq5(users.role, "coordenador"),
          eq5(users.role, "gestor")
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
router3.get("/pending-requests", async (req, res) => {
  try {
    const requests = await db.select({
      id: passwordResetRequests.id,
      userId: passwordResetRequests.userId,
      userName: users.name,
      userEmail: users.email,
      requestedAt: passwordResetRequests.requestedAt,
      reason: passwordResetRequests.reason,
      status: passwordResetRequests.status
    }).from(passwordResetRequests).leftJoin(users, eq5(passwordResetRequests.userId, users.id)).where(eq5(passwordResetRequests.status, "pending")).orderBy(desc2(passwordResetRequests.requestedAt));
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Erro ao buscar solicita\xE7\xF5es:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar solicita\xE7\xF5es"
    });
  }
});
router3.post("/approve-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;
    const [request] = await db.select().from(passwordResetRequests).where(eq5(passwordResetRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    const crypto3 = __require("crypto");
    const tempPassword = crypto3.randomBytes(12).toString("base64").slice(0, 12) + "!Aa1";
    const hashedPassword = await hashPassword(tempPassword);
    await db.update(users).set({
      passwordHash: hashedPassword,
      requiresPasswordChange: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(users.id, request.userId));
    await db.update(passwordResetRequests).set({
      status: "approved",
      processedBy: adminId,
      processedAt: /* @__PURE__ */ new Date(),
      adminNotes: adminNotes || "Senha resetada pelo administrador"
    }).where(eq5(passwordResetRequests.id, requestId));
    await db.insert(notifications).values({
      userId: request.userId,
      title: "Senha Resetada",
      message: "Sua senha foi resetada pelo administrador. Entre em contato para receber sua senha tempor\xE1ria. Voc\xEA dever\xE1 alter\xE1-la no pr\xF3ximo login.",
      type: "announcement",
      priority: "high",
      read: false
    });
    res.json({
      success: true,
      message: "Reset aprovado. Copie a senha e informe ao usu\xE1rio.",
      tempPassword,
      // Mostrar apenas uma vez
      warning: "Esta senha ser\xE1 mostrada apenas agora. Copie antes de fechar."
    });
  } catch (error) {
    console.error("Erro ao aprovar reset:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar aprova\xE7\xE3o"
    });
  }
});
router3.post("/reject-reset/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, adminNotes } = req.body;
    const [request] = await db.select().from(passwordResetRequests).where(eq5(passwordResetRequests.id, requestId)).limit(1);
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
    }).where(eq5(passwordResetRequests.id, requestId));
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

// server/middleware/csrf.ts
import crypto from "crypto";
function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}
function csrfTokenGenerator(req, res, next) {
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
  }
  next();
}
function csrfProtection(req, res, next) {
  next();
}
function getCsrfToken(req, res) {
  if (!req.session) {
    res.status(500).json({
      error: "Sess\xE3o n\xE3o dispon\xEDvel"
    });
    return;
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.json({
    csrfToken: req.session.csrfToken
  });
}

// server/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 5,
  // Máximo 5 tentativas por email/IP
  // CRÍTICO: Rate limit por EMAIL, não apenas IP
  // Desabilita todas as validações pois usamos chave customizada baseada em email
  validate: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (email) {
      return `auth:${email.toLowerCase()}:${ip}`;
    }
    return `auth:ip:${ip}`;
  },
  message: {
    error: "Muitas tentativas de autentica\xE7\xE3o. Tente novamente em 15 minutos."
  },
  standardHeaders: true,
  // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false,
  // Desabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: false,
  // Contar mesmo se request for bem-sucedido
  handler: (req, res) => {
    const email = req.body?.email;
    res.status(429).json({
      error: "Muitas tentativas de autentica\xE7\xE3o",
      message: email ? `Muitas tentativas de login para ${email}. Aguarde 15 minutos e tente novamente.` : "Voc\xEA excedeu o limite de tentativas. Por favor, aguarde 15 minutos e tente novamente.",
      retryAfter: "15 minutes",
      accountLocked: !!email
      // Indicar se a conta específica está bloqueada
    });
  }
});
var apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1e3,
  // 1 minuto
  max: 100,
  // Máximo 100 requests por minuto por IP
  // Desabilita validações pois usamos trust proxy no Replit
  validate: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return `api:${ip}`;
  },
  message: {
    error: "Muitas requisi\xE7\xF5es. Tente novamente em breve."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit excedido",
      message: "Voc\xEA excedeu o limite de requisi\xE7\xF5es por minuto. Por favor, aguarde um momento.",
      retryAfter: "1 minute"
    });
  }
});
var passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 3,
  // Máximo 3 tentativas por hora por email
  // Rate limit por EMAIL para prevenir spam de reset
  // Desabilita todas as validações pois usamos chave customizada baseada em email
  validate: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (email) {
      return `password-reset:${email.toLowerCase()}`;
    }
    return `password-reset:ip:${ip}`;
  },
  message: {
    error: "Muitas tentativas de recupera\xE7\xE3o de senha."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Não contar se request falhar
  handler: (req, res) => {
    res.status(429).json({
      error: "Limite de recupera\xE7\xE3o de senha excedido",
      message: "Voc\xEA excedeu o limite de tentativas de recupera\xE7\xE3o de senha. Aguarde 1 hora.",
      retryAfter: "1 hour"
    });
  }
});

// server/middleware/noCacheHeaders.ts
function noCacheHeaders(req, res, next) {
  if (req.path.startsWith("/api")) {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store"
    });
  }
  next();
}

// server/routes/questionnaireAdmin.ts
await init_db();
init_schema();
import { Router as Router4 } from "express";
import { z as z2 } from "zod";
import { eq as eq6, and as and4, or as or3, ne } from "drizzle-orm";

// server/utils/questionnaireGenerator.ts
init_logger();
import { format, getDaysInMonth, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// shared/constants/liturgicalThemes.ts
var LITURGICAL_THEMES = {
  1: {
    name: "Sant\xEDssimo Nome de Jesus",
    dedication: "ao Sant\xEDssimo Nome de Jesus",
    // masculine singular
    color: "white",
    colorHex: "#FFFFFF",
    description: "Celebra\xE7\xE3o do Nome de Jesus e o in\xEDcio do ano lit\xFArgico",
    patron: "Jesus Cristo"
  },
  2: {
    name: "Sagrada Fam\xEDlia",
    dedication: "\xE0 Sagrada Fam\xEDlia",
    // feminine singular
    color: "white",
    colorHex: "#FFFFFF",
    description: "Devo\xE7\xE3o \xE0 Sagrada Fam\xEDlia - Jesus, Maria e Jos\xE9",
    patron: "Sagrada Fam\xEDlia"
  },
  3: {
    name: "S\xE3o Jos\xE9",
    dedication: "a S\xE3o Jos\xE9",
    // masculine without article
    color: "white",
    colorHex: "#FFFFFF",
    description: "M\xEAs dedicado ao protetor da Igreja, S\xE3o Jos\xE9",
    patron: "S\xE3o Jos\xE9"
  },
  4: {
    name: "Eucaristia e Esp\xEDrito Santo",
    dedication: "\xE0 Eucaristia e ao Esp\xEDrito Santo",
    // feminine + masculine
    color: "white",
    colorHex: "#FFFFFF",
    description: "Celebra\xE7\xE3o da P\xE1scoa, Eucaristia e Esp\xEDrito Santo",
    patron: "Esp\xEDrito Santo"
  },
  5: {
    name: "Virgem Maria",
    dedication: "\xE0 Virgem Maria",
    // feminine singular
    color: "blue",
    colorHex: "#4A90E2",
    description: "M\xEAs mariano - devo\xE7\xE3o especial \xE0 Virgem Maria",
    patron: "Nossa Senhora"
  },
  6: {
    name: "Sagrado Cora\xE7\xE3o de Jesus",
    dedication: "ao Sagrado Cora\xE7\xE3o de Jesus",
    // masculine singular
    color: "red",
    colorHex: "#E53935",
    description: "Devo\xE7\xE3o ao Sagrado Cora\xE7\xE3o de Jesus e seu amor infinito",
    patron: "Sagrado Cora\xE7\xE3o"
  },
  7: {
    name: "Precios\xEDssimo Sangue de Cristo",
    dedication: "ao Precios\xEDssimo Sangue de Cristo",
    // masculine singular
    color: "red",
    colorHex: "#C62828",
    description: "Venera\xE7\xE3o do Precios\xEDssimo Sangue derramado por nossa salva\xE7\xE3o",
    patron: "Sangue de Cristo"
  },
  8: {
    name: "Voca\xE7\xF5es",
    dedication: "\xE0s Voca\xE7\xF5es",
    // feminine plural
    color: "green",
    colorHex: "#43A047",
    description: "Reflex\xE3o sobre voca\xE7\xF5es sacerdotais e religiosas",
    patron: "S\xE3o Jo\xE3o Maria Vianney"
  },
  9: {
    name: "B\xEDblia",
    dedication: "\xE0 B\xEDblia",
    // feminine singular
    color: "green",
    colorHex: "#388E3C",
    description: "M\xEAs da B\xEDblia - medita\xE7\xE3o e estudo da Palavra de Deus",
    patron: "S\xE3o Jer\xF4nimo"
  },
  10: {
    name: "Ros\xE1rio",
    dedication: "ao Santo Ros\xE1rio",
    // masculine singular
    color: "blue",
    colorHex: "#1976D2",
    description: "M\xEAs do Ros\xE1rio e devo\xE7\xE3o \xE0 Nossa Senhora",
    patron: "Nossa Senhora do Ros\xE1rio"
  },
  11: {
    name: "Almas do Purgat\xF3rio",
    dedication: "\xE0s Almas do Purgat\xF3rio",
    // feminine plural
    color: "purple",
    colorHex: "#7B1FA2",
    description: "Ora\xE7\xF5es pelas almas do purgat\xF3rio e medita\xE7\xE3o sobre a eternidade",
    patron: "Almas do Purgat\xF3rio"
  },
  12: {
    name: "Advento e Natal",
    dedication: "ao Advento e ao Natal do Senhor",
    // both masculine
    color: "purple/white",
    colorHex: "#673AB7",
    description: "Prepara\xE7\xE3o para o Natal e celebra\xE7\xE3o do nascimento de Jesus",
    patron: "Menino Jesus"
  }
};
function getLiturgicalTheme(month) {
  return LITURGICAL_THEMES[month] || null;
}

// server/utils/questionnaireGenerator.ts
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
  const theme = LITURGICAL_THEMES[month];
  const themeName = theme ? theme.name : "do m\xEAs";
  const themeDedication = theme ? theme.dedication : "ao m\xEAs";
  logger.debug(`Tema detectado para question\xE1rio: ${themeName}`);
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
    question: `Neste m\xEAs de ${capitalizedMonth} dedicado ${themeDedication}, voc\xEA tem disponibilidade para servir no seu hor\xE1rio de costume?`,
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
var router4 = Router4();
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
router4.get("/current", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
router4.get("/templates/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
router4.post("/templates/generate", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const schema = z2.object({
      month: z2.number().min(1).max(12),
      year: z2.number().min(2024).max(2050)
    });
    const { month, year } = schema.parse(req.body);
    const userId = req.user?.id || req.session?.userId;
    const [existingTemplate] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
router4.post("/templates", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
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
    const [existingTemplate] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, data.month),
      eq6(questionnaires.year, data.year)
    ));
    if (existingTemplate) {
      const [updated] = await db.update(questionnaires).set({
        questions: data.questions,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(questionnaires.id, existingTemplate.id)).returning();
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
router4.post("/templates/:year/:month/questions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
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
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
    }).where(eq6(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ error: "Failed to add question" });
  }
});
router4.put("/templates/:year/:month/questions/:questionId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
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
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
    }).where(eq6(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
});
router4.delete("/templates/:year/:month/questions/:questionId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const questionId = req.params.questionId;
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
    }).where(eq6(questionnaires.id, template.id)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
});
router4.post("/templates/:year/:month/send", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
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
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
    const [updated] = await db.update(questionnaires).set(updateData).where(eq6(questionnaires.id, template.id)).returning();
    const isResend = template.status === "sent" && resend;
    const allMinisters = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(and4(
      eq6(users.role, "ministro"),
      eq6(users.status, "active")
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
router4.post("/templates/:id/send", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(questionnaires.id, templateId)).returning();
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
router4.patch("/templates/:id/close", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId));
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
    }).where(eq6(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error closing questionnaire:", error);
    res.status(500).json({ error: "Failed to close questionnaire" });
  }
});
router4.patch("/templates/:id/reopen", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId));
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
    }).where(eq6(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: Array.isArray(updated.questions) ? updated.questions : JSON.parse(updated.questions)
    });
  } catch (error) {
    console.error("Error reopening questionnaire:", error);
    res.status(500).json({ error: "Failed to reopen questionnaire" });
  }
});
router4.delete("/templates/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
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
    }).from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, template.id));
    if (responses.length > 0) {
      const [updated] = await db.update(questionnaires).set({
        status: "deleted",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(questionnaires.id, template.id)).returning();
      res.json({
        message: "Template marcado como deletado. Respostas existentes foram preservadas.",
        template: {
          ...updated,
          questions: updated.questions
        }
      });
    } else {
      await db.delete(questionnaires).where(eq6(questionnaires.id, template.id));
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
router4.get("/responses-status/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
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
    }).from(users).where(and4(
      or3(
        eq6(users.role, "ministro"),
        eq6(users.role, "coordenador")
      ),
      eq6(users.status, "active")
    ));
    const responses = await db.select({
      userId: questionnaireResponses.userId,
      submittedAt: questionnaireResponses.submittedAt,
      responses: questionnaireResponses.responses
    }).from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, template.id));
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
router4.get("/responses/:templateId/:ministerId", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { templateId, ministerId } = req.params;
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(eq6(questionnaires.id, templateId)).limit(1);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const [response] = await db.select().from(questionnaireResponses).where(and4(
      eq6(questionnaireResponses.questionnaireId, templateId),
      eq6(questionnaireResponses.userId, ministerId)
    )).limit(1);
    if (!response) {
      return res.status(404).json({ error: "Response not found" });
    }
    const [user] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(eq6(users.id, ministerId)).limit(1);
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
router4.get("/responses-summary/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [template] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year)
    )).limit(1);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const responses = await db.select().from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, template.id));
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
router4.post("/open", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const schema = z2.object({
      month: z2.number().min(1).max(12),
      year: z2.number().min(2024).max(2050)
    });
    const { month, year } = schema.parse(req.body);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, month),
      eq6(questionnaires.year, year),
      ne(questionnaires.status, "deleted")
    ));
    if (!questionnaire) {
      return res.status(404).json({
        error: "Question\xE1rio n\xE3o encontrado",
        message: `Nenhum question\xE1rio encontrado para ${getMonthName(month)}/${year}. Crie um primeiro.`
      });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      // 'sent' is the open status
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(questionnaires.id, questionnaire.id)).returning();
    res.json({
      message: `Question\xE1rio de ${getMonthName(month)}/${year} aberto com sucesso`,
      questionnaire: {
        ...updated,
        questions: updated.questions
      }
    });
  } catch (error) {
    console.error("Error opening questionnaire:", error);
    res.status(500).json({ error: "Failed to open questionnaire" });
  }
});
router4.get("/current-status", authenticateToken, async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentHour = now.getHours();
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, currentMonth),
      eq6(questionnaires.year, currentYear),
      ne(questionnaires.status, "deleted")
    ));
    const shouldAutoClose = currentDay >= 25;
    const isAfter23 = currentHour >= 23;
    let autoCloseTriggered = false;
    if (questionnaire && questionnaire.status === "sent" && shouldAutoClose && isAfter23) {
      const [updated] = await db.update(questionnaires).set({
        status: "closed",
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(questionnaires.id, questionnaire.id)).returning();
      autoCloseTriggered = true;
      return res.json({
        currentDay,
        currentMonth,
        currentYear,
        shouldAutoClose,
        autoCloseTriggered,
        questionnaire: {
          id: updated.id,
          month: updated.month,
          year: updated.year,
          status: updated.status,
          title: updated.title
        },
        message: "Question\xE1rio fechado automaticamente (dia 25 ou posterior)"
      });
    }
    res.json({
      currentDay,
      currentMonth,
      currentYear,
      shouldAutoClose,
      isAfter23,
      autoCloseTriggered: false,
      questionnaire: questionnaire ? {
        id: questionnaire.id,
        month: questionnaire.month,
        year: questionnaire.year,
        status: questionnaire.status,
        title: questionnaire.title
      } : null,
      message: shouldAutoClose ? isAfter23 ? "Per\xEDodo de auto-fechamento (ap\xF3s 23h do dia 25)" : "Aguardando 23h para auto-fechamento" : `Auto-fechamento programado para dia 25 (hoje \xE9 dia ${currentDay})`
    });
  } catch (error) {
    console.error("Error checking current status:", error);
    res.status(500).json({ error: "Failed to check current status" });
  }
});
router4.get("/stats", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({
        error: "Par\xE2metros obrigat\xF3rios ausentes",
        message: "Os par\xE2metros month e year s\xE3o obrigat\xF3rios"
      });
    }
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(and4(
      eq6(questionnaires.month, monthNum),
      eq6(questionnaires.year, yearNum),
      ne(questionnaires.status, "deleted")
    ));
    if (!questionnaire) {
      return res.json({
        month: monthNum,
        year: yearNum,
        exists: false,
        status: null,
        totalActiveUsers: 0,
        totalResponses: 0,
        responseRate: 0,
        pendingResponses: 0,
        availableCount: 0,
        unavailableCount: 0,
        message: "Question\xE1rio n\xE3o encontrado"
      });
    }
    const activeUsers = await db.select({
      id: users.id
    }).from(users).where(and4(
      or3(
        eq6(users.role, "ministro"),
        eq6(users.role, "coordenador")
      ),
      eq6(users.status, "active")
    ));
    const totalActiveUsers = activeUsers.length;
    const responses = await db.select({
      id: questionnaireResponses.id,
      userId: questionnaireResponses.userId,
      responses: questionnaireResponses.responses,
      submittedAt: questionnaireResponses.submittedAt
    }).from(questionnaireResponses).where(eq6(questionnaireResponses.questionnaireId, questionnaire.id));
    const totalResponses = responses.length;
    const responseRate = totalActiveUsers > 0 ? parseFloat((totalResponses / totalActiveUsers * 100).toFixed(2)) : 0;
    const pendingResponses = totalActiveUsers - totalResponses;
    let availableCount = 0;
    let unavailableCount = 0;
    responses.forEach((response) => {
      try {
        const parsedResponses = typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses;
        const monthlyAvailability = parsedResponses.find((r) => r.questionId === "monthly_availability");
        if (monthlyAvailability) {
          const answer = typeof monthlyAvailability.answer === "object" ? monthlyAvailability.answer.answer : monthlyAvailability.answer;
          if (answer === "Sim" || answer === "yes") {
            availableCount++;
          } else if (answer === "N\xE3o" || answer === "no") {
            unavailableCount++;
          }
        } else {
          const oldAvailability = parsedResponses.find((r) => r.questionId === "availability");
          if (oldAvailability) {
            if (oldAvailability.answer === "yes" || oldAvailability.answer === "Dispon\xEDvel") {
              availableCount++;
            } else if (oldAvailability.answer === "no" || oldAvailability.answer === "Indispon\xEDvel") {
              unavailableCount++;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing response:", e);
      }
    });
    res.json({
      month: monthNum,
      year: yearNum,
      monthName: getMonthName(monthNum),
      exists: true,
      questionnaireId: questionnaire.id,
      status: questionnaire.status,
      title: questionnaire.title,
      totalActiveUsers,
      totalResponses,
      responseRate,
      responseRateFormatted: `${responseRate}%`,
      pendingResponses,
      availableCount,
      unavailableCount,
      notRespondedCount: pendingResponses,
      lastUpdated: questionnaire.updatedAt,
      createdAt: questionnaire.createdAt
    });
  } catch (error) {
    console.error("Error fetching questionnaire stats:", error);
    res.status(500).json({ error: "Failed to fetch questionnaire stats" });
  }
});
var questionnaireAdmin_default = router4;

// server/routes/questionnaires.ts
await init_db();
init_schema();
import { Router as Router5 } from "express";
import { z as z3 } from "zod";
import { eq as eq8, and as and6, or as or4 } from "drizzle-orm";

// server/utils/csvExporter.ts
await init_db();
init_schema();
import { eq as eq7, and as and5 } from "drizzle-orm";
function convertResponsesToCSV(data) {
  if (data.length === 0) {
    return "Sem dados para exportar";
  }
  const allQuestions = /* @__PURE__ */ new Set();
  data.forEach((entry) => {
    entry.responses.forEach((response) => {
      allQuestions.add(response.questionId);
    });
  });
  const headers = [
    "ID do Ministro",
    "Nome do Ministro",
    "Email do Ministro",
    "T\xEDtulo do Question\xE1rio",
    "Data de Envio",
    ...Array.from(allQuestions)
  ];
  const rows = data.map((entry) => {
    const responseMap = new Map(
      entry.responses.map((r) => [r.questionId, formatAnswer(r.answer, r.questionType)])
    );
    return [
      entry.ministerId,
      entry.ministerName,
      entry.ministerEmail,
      entry.questionnaireTitle,
      entry.submittedAt ? new Date(entry.submittedAt).toLocaleString("pt-BR") : "N\xE3o enviado",
      ...Array.from(allQuestions).map((questionId) => responseMap.get(questionId) || "")
    ];
  });
  const csvContent = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((row) => row.map(escapeCSVField).join(","))
  ].join("\n");
  return "\uFEFF" + csvContent;
}
function createDetailedCSV(data) {
  if (data.length === 0) {
    return "Sem dados para exportar";
  }
  const questionMap = /* @__PURE__ */ new Map();
  data.forEach((entry) => {
    entry.responses.forEach((response) => {
      if (!questionMap.has(response.questionId)) {
        questionMap.set(response.questionId, response.questionText);
      }
    });
  });
  const headers = [
    "Nome do Ministro",
    "Email",
    "Data de Envio",
    ...Array.from(questionMap.values())
  ];
  const rows = data.map((entry) => {
    const responseMap = new Map(
      entry.responses.map((r) => [r.questionId, formatAnswer(r.answer, r.questionType)])
    );
    return [
      entry.ministerName,
      entry.ministerEmail,
      entry.submittedAt ? new Date(entry.submittedAt).toLocaleString("pt-BR") : "N\xE3o enviado",
      ...Array.from(questionMap.keys()).map((questionId) => responseMap.get(questionId) || "N\xE3o respondido")
    ];
  });
  const csvContent = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((row) => row.map(escapeCSVField).join(","))
  ].join("\n");
  return "\uFEFF" + csvContent;
}
function formatAnswer(answer, questionType) {
  if (answer === null || answer === void 0) {
    return "";
  }
  switch (questionType) {
    case "multiple_choice":
    case "checkbox":
      if (Array.isArray(answer)) {
        return answer.join("; ");
      }
      return String(answer);
    case "yes_no":
      return answer === true ? "Sim" : answer === false ? "N\xE3o" : String(answer);
    case "yes_no_with_options":
      if (typeof answer === "object" && answer !== null) {
        const mainAnswer = answer.answer === "Sim" ? "Sim" : "N\xE3o";
        if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
          return `${mainAnswer}: ${answer.selectedOptions.join("; ")}`;
        }
        return mainAnswer;
      }
      return String(answer);
    case "text":
    case "textarea":
    default:
      return String(answer);
  }
}
function escapeCSVField(field) {
  const str = String(field);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
async function getQuestionnaireResponsesForExport(questionnaireId) {
  if (!db) {
    throw new Error("Database not available");
  }
  const [questionnaire] = await db.select().from(questionnaires).where(eq7(questionnaires.id, questionnaireId)).limit(1);
  if (!questionnaire) {
    throw new Error("Questionnaire not found");
  }
  const responsesWithUsers = await db.select({
    response: questionnaireResponses,
    user: users
  }).from(questionnaireResponses).innerJoin(users, eq7(questionnaireResponses.userId, users.id)).where(eq7(questionnaireResponses.questionnaireId, questionnaireId));
  const exportData = responsesWithUsers.map(({ response, user }) => {
    const formattedResponses = [];
    if (response.availableSundays && response.availableSundays.length > 0) {
      formattedResponses.push({
        questionId: "available_sundays",
        questionText: "Domingos Dispon\xEDveis",
        questionType: "checkbox",
        answer: response.availableSundays
      });
    }
    if (response.preferredMassTimes && response.preferredMassTimes.length > 0) {
      formattedResponses.push({
        questionId: "preferred_mass_times",
        questionText: "Hor\xE1rios Preferidos",
        questionType: "checkbox",
        answer: response.preferredMassTimes
      });
    }
    if (response.alternativeTimes && response.alternativeTimes.length > 0) {
      formattedResponses.push({
        questionId: "alternative_times",
        questionText: "Hor\xE1rios Alternativos",
        questionType: "checkbox",
        answer: response.alternativeTimes
      });
    }
    if (response.dailyMassAvailability && response.dailyMassAvailability.length > 0) {
      formattedResponses.push({
        questionId: "daily_mass",
        questionText: "Missas Di\xE1rias",
        questionType: "checkbox",
        answer: response.dailyMassAvailability
      });
    }
    if (response.specialEvents) {
      formattedResponses.push({
        questionId: "special_events",
        questionText: "Eventos Especiais",
        questionType: "text",
        answer: response.specialEvents
      });
    }
    if (response.canSubstitute !== null && response.canSubstitute !== void 0) {
      formattedResponses.push({
        questionId: "can_substitute",
        questionText: "Pode Substituir",
        questionType: "yes_no",
        answer: response.canSubstitute
      });
    }
    if (response.notes) {
      formattedResponses.push({
        questionId: "notes",
        questionText: "Observa\xE7\xF5es",
        questionType: "text",
        answer: response.notes
      });
    }
    if (formattedResponses.length === 0 && response.responses) {
      if (Array.isArray(response.responses)) {
        response.responses.forEach((r) => {
          const { questionId, answer } = r;
          const questionTextMap = {
            "monthly_availability": "Disponibilidade Mensal",
            "main_service_time": "Hor\xE1rio Principal de Servi\xE7o",
            "can_substitute": "Pode Substituir",
            "available_sundays": "Domingos Dispon\xEDveis",
            "other_times_available": "Outros Hor\xE1rios Dispon\xEDveis",
            "preferred_mass_times": "Hor\xE1rios Preferidos",
            "alternative_times": "Hor\xE1rios Alternativos",
            "daily_mass": "Missas Di\xE1rias",
            "daily_mass_availability": "Disponibilidade para Missas Di\xE1rias",
            "special_events": "Eventos Especiais",
            "notes": "Observa\xE7\xF5es",
            "observations": "Observa\xE7\xF5es"
          };
          let questionType = "text";
          if (Array.isArray(answer)) {
            questionType = "checkbox";
          } else if (typeof answer === "boolean" || answer === "Sim" || answer === "N\xE3o") {
            questionType = "yes_no";
          } else if (typeof answer === "object" && answer.answer) {
            questionType = "yes_no_with_options";
          }
          formattedResponses.push({
            questionId,
            questionText: questionTextMap[questionId] || questionId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            questionType,
            answer
          });
        });
      } else if (typeof response.responses === "object") {
        const responseObj = response.responses;
        if (responseObj.availability && typeof responseObj.availability === "object") {
          const avail = responseObj.availability;
          if (avail.sundays && Array.isArray(avail.sundays)) {
            formattedResponses.push({
              questionId: "available_sundays",
              questionText: "Domingos Dispon\xEDveis",
              questionType: "checkbox",
              answer: avail.sundays
            });
          }
          if (avail.preferences && Array.isArray(avail.preferences)) {
            formattedResponses.push({
              questionId: "preferred_mass_times",
              questionText: "Hor\xE1rios Preferidos",
              questionType: "checkbox",
              answer: avail.preferences
            });
          }
        }
        Object.entries(responseObj).forEach(([key, value]) => {
          if (key !== "availability" && value !== null && value !== void 0) {
            if (!formattedResponses.find((r) => r.questionId === key)) {
              formattedResponses.push({
                questionId: key,
                questionText: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                questionType: "text",
                answer: value
              });
            }
          }
        });
      }
    }
    return {
      ministerId: user.id,
      ministerName: user.name,
      ministerEmail: user.email,
      questionnaireTitle: questionnaire.title,
      submittedAt: response.submittedAt,
      responses: formattedResponses
    };
  });
  const respondedUserIds = new Set(responsesWithUsers.map((r) => r.user.id));
  if (questionnaire.targetUserIds && Array.isArray(questionnaire.targetUserIds)) {
    const nonRespondents = await db.select().from(users).where(eq7(users.role, "ministro"));
    nonRespondents.filter((user) => !respondedUserIds.has(user.id)).forEach((user) => {
      exportData.push({
        ministerId: user.id,
        ministerName: user.name,
        ministerEmail: user.email,
        questionnaireTitle: questionnaire.title,
        submittedAt: null,
        responses: []
      });
    });
  }
  return exportData;
}
async function getMonthlyResponsesForExport(month, year) {
  if (!db) {
    throw new Error("Database not available");
  }
  const [questionnaire] = await db.select().from(questionnaires).where(and5(
    eq7(questionnaires.month, month),
    eq7(questionnaires.year, year)
  )).limit(1);
  if (!questionnaire) {
    throw new Error(`No questionnaire found for ${month}/${year}`);
  }
  return getQuestionnaireResponsesForExport(questionnaire.id);
}

// server/services/questionnaireService.ts
var QuestionnaireService = class {
  /**
   * Standardize ALL responses to v2.0 format before saving
   */
  static standardizeResponse(rawResponse, month, year) {
    if (rawResponse.format_version === "2.0") {
      return this.validateV2Format(rawResponse);
    }
    const standardized = {
      format_version: "2.0",
      masses: {},
      special_events: {},
      weekdays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      },
      family: {},
      can_substitute: false
    };
    if (Array.isArray(rawResponse)) {
      this.parseLegacyArrayFormat(rawResponse, standardized, month, year);
    } else if (typeof rawResponse === "object") {
      if (rawResponse.responses && Array.isArray(rawResponse.responses)) {
        this.parseLegacyArrayFormat(rawResponse.responses, standardized, month, year);
      } else {
        Object.assign(standardized, rawResponse);
      }
    }
    return standardized;
  }
  /**
   * Parse legacy array format: [{questionId, answer}, ...]
   */
  static parseLegacyArrayFormat(responses, standardized, month, year) {
    const currentYear = year || (/* @__PURE__ */ new Date()).getFullYear();
    const currentMonth = month || (/* @__PURE__ */ new Date()).getMonth() + 1;
    for (const item of responses) {
      const { questionId, answer } = item;
      if (questionId === "available_sundays" && Array.isArray(answer)) {
        this.parseAvailableSundays(answer, standardized, currentYear, currentMonth);
      }
      if (questionId === "main_service_time" || questionId === "primary_mass_time") {
        standardized._preferredTime = this.normalizeTime(answer);
      }
      if (questionId.startsWith("saint_judas_feast_")) {
        const feastDate = this.getSaintJudasFeastDate(currentYear, currentMonth);
        const time2 = this.extractTimeFromQuestionId(questionId);
        const value = this.normalizeValue(answer);
        if (!standardized.special_events.saint_judas_feast) {
          standardized.special_events.saint_judas_feast = {};
        }
        standardized.special_events.saint_judas_feast[`${feastDate}_${time2}`] = value;
      }
      if (questionId === "saint_judas_novena") {
        standardized.special_events.saint_judas_novena = this.parseNovenaArray(answer);
      }
      if (questionId === "healing_liberation_mass") {
        standardized.special_events.healing_liberation = this.normalizeValue(answer);
      }
      if (questionId === "sacred_heart_mass") {
        standardized.special_events.first_friday = this.normalizeValue(answer);
      }
      if (questionId === "immaculate_heart_mass") {
        standardized.special_events.first_saturday = this.normalizeValue(answer);
      }
      if (questionId === "daily_mass_availability" || questionId === "daily_mass") {
        this.parseDailyMassAvailability(answer, standardized);
      }
      if (questionId === "daily_mass_days" && Array.isArray(answer)) {
        this.parseDailyMassDays(answer, standardized);
      }
      if (questionId === "can_substitute") {
        standardized.can_substitute = this.normalizeValue(answer);
      }
      if ((questionId === "notes" || questionId === "observations") && typeof answer === "string") {
        standardized.notes = answer;
      }
      if (questionId === "family_serve_preference") {
        if (!standardized.family) standardized.family = {};
        standardized.family.serve_preference = this.normalizeFamilyPreference(answer);
      }
    }
    if (standardized._preferredTime) {
      const preferredTime = standardized._preferredTime;
      for (const date2 in standardized.masses) {
        if (!standardized.masses[date2][preferredTime]) {
          const hasAnyTime = Object.values(standardized.masses[date2]).some((v) => v === true);
          if (!hasAnyTime) {
            standardized.masses[date2][preferredTime] = true;
          }
        }
      }
      delete standardized._preferredTime;
    }
  }
  /**
   * Parse available_sundays array like ["Domingo 05/10", "Domingo 12/10"]
   */
  static parseAvailableSundays(sundays, standardized, year, month) {
    for (const sunday of sundays) {
      const dayMatch = sunday.match(/(\d{1,2})\/(\d{1,2})/);
      if (dayMatch) {
        const day = dayMatch[1].padStart(2, "0");
        const monthNum = dayMatch[2].padStart(2, "0");
        const isoDate = `${year}-${monthNum}-${day}`;
        if (!standardized.masses[isoDate]) {
          standardized.masses[isoDate] = {};
        }
        standardized.masses[isoDate]["08:00"] = false;
        standardized.masses[isoDate]["10:00"] = false;
        standardized.masses[isoDate]["19:00"] = false;
        standardized.masses[isoDate]["19:30"] = false;
      }
    }
  }
  /**
   * Parse novena array like ["Terça 20/10 às 19h30", "Quinta 22/10 às 19h30"]
   */
  static parseNovenaArray(novenaAnswers) {
    if (!Array.isArray(novenaAnswers)) {
      return [];
    }
    const validDays = novenaAnswers.filter(
      (day) => typeof day === "string" && !day.includes("Nenhum dia") && day.trim() !== ""
    );
    return validDays.map((day) => {
      const dateMatch = day.match(/(\d{1,2})\/(\d{1,2})/);
      const timeMatch = day.match(/(\d{1,2})h(\d{2})?/);
      if (dateMatch && timeMatch) {
        const dayNum = dateMatch[1].padStart(2, "0");
        const monthNum = dateMatch[2].padStart(2, "0");
        const hour = timeMatch[1].padStart(2, "0");
        const minute = timeMatch[2] || "00";
        const year = (/* @__PURE__ */ new Date()).getFullYear();
        return `${year}-${monthNum}-${dayNum}_${hour}:${minute}`;
      }
      return day;
    });
  }
  /**
   * Parse daily mass availability
   */
  static parseDailyMassAvailability(answer, standardized) {
    if (!standardized.weekdays) {
      standardized.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }
    if (answer === "Sim" || answer === true) {
      standardized.weekdays.monday = true;
      standardized.weekdays.tuesday = true;
      standardized.weekdays.wednesday = true;
      standardized.weekdays.thursday = true;
      standardized.weekdays.friday = true;
    } else if (answer === "Apenas em alguns dias") {
    }
  }
  /**
   * Parse specific daily mass days
   */
  static parseDailyMassDays(days, standardized) {
    if (!standardized.weekdays) {
      standardized.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }
    const dayMapping = {
      "Segunda": "monday",
      "Segunda-feira": "monday",
      "Ter\xE7a": "tuesday",
      "Ter\xE7a-feira": "tuesday",
      "Quarta": "wednesday",
      "Quarta-feira": "wednesday",
      "Quinta": "thursday",
      "Quinta-feira": "thursday",
      "Sexta": "friday",
      "Sexta-feira": "friday"
    };
    for (const day of days) {
      const normalizedDay = dayMapping[day];
      if (normalizedDay) {
        standardized.weekdays[normalizedDay] = true;
      }
    }
  }
  /**
   * Get Saint Judas feast date (October 28)
   */
  static getSaintJudasFeastDate(year, month) {
    return `${year}-10-28`;
  }
  /**
   * Extract time from questionId
   */
  static extractTimeFromQuestionId(questionId) {
    const timeMapping = {
      "saint_judas_feast_7h": "07:00",
      "saint_judas_feast_10h": "10:00",
      "saint_judas_feast_12h": "12:00",
      "saint_judas_feast_15h": "15:00",
      "saint_judas_feast_17h": "17:00",
      "saint_judas_feast_evening": "19:30"
    };
    return timeMapping[questionId] || "06:30";
  }
  /**
   * Normalize time format to 24h HH:MM
   */
  static normalizeTime(time2) {
    if (typeof time2 !== "string") {
      return "10:00";
    }
    const match = time2.match(/(\d{1,2})(?:h|:)?(\d{2})?/);
    if (match) {
      const hour = match[1].padStart(2, "0");
      const minute = match[2] || "00";
      return `${hour}:${minute}`;
    }
    return time2;
  }
  /**
   * Normalize all values to boolean
   */
  static normalizeValue(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase().trim();
      return normalized === "sim" || normalized === "yes" || normalized === "true" || normalized === "s";
    }
    if (Array.isArray(value)) {
      return value.length > 0 && !value.some(
        (v) => typeof v === "string" && (v.includes("Nenhum") || v.includes("N\xE3o posso"))
      );
    }
    return false;
  }
  /**
   * Normalize family serve preference
   */
  static normalizeFamilyPreference(value) {
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized.includes("juntos") || normalized === "together") {
        return "together";
      }
      if (normalized.includes("separado") || normalized === "separately") {
        return "separately";
      }
    }
    return "flexible";
  }
  /**
   * Validate v2.0 format structure
   */
  static validateV2Format(response) {
    if (!response.masses) response.masses = {};
    if (!response.special_events) response.special_events = {};
    if (!response.weekdays) {
      response.weekdays = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false
      };
    }
    if (typeof response.can_substitute !== "boolean") {
      response.can_substitute = false;
    }
    return response;
  }
  /**
   * Extract legacy structured data for backward compatibility
   * This maintains compatibility with existing extractQuestionnaireData() expectations
   */
  static extractStructuredData(standardized) {
    const availableSundays = [];
    Object.entries(standardized.masses).forEach(([date2, times]) => {
      Object.entries(times).forEach(([time2, available]) => {
        if (available === true) {
          availableSundays.push(`${date2} ${time2}`);
        }
      });
    });
    const timeCounts = {};
    Object.values(standardized.masses).forEach((massDay) => {
      Object.entries(massDay).forEach(([time2, available]) => {
        if (available) {
          timeCounts[time2] = (timeCounts[time2] || 0) + 1;
        }
      });
    });
    const preferredMassTimes = Object.keys(timeCounts).sort((a, b) => timeCounts[b] - timeCounts[a]);
    const dailyMassAvailability = [];
    if (standardized.weekdays) {
      const dayMap = {
        monday: "Segunda-feira",
        tuesday: "Ter\xE7a-feira",
        wednesday: "Quarta-feira",
        thursday: "Quinta-feira",
        friday: "Sexta-feira"
      };
      Object.entries(standardized.weekdays).forEach(([day, available]) => {
        if (available) {
          dailyMassAvailability.push(dayMap[day]);
        }
      });
    }
    return {
      availableSundays: availableSundays.length > 0 ? availableSundays : null,
      preferredMassTimes: preferredMassTimes.length > 0 ? preferredMassTimes : null,
      alternativeTimes: null,
      // Not used in v2.0
      dailyMassAvailability: dailyMassAvailability.length > 0 ? dailyMassAvailability : null,
      specialEvents: standardized.special_events,
      canSubstitute: standardized.can_substitute,
      notes: standardized.notes || null
    };
  }
};

// server/routes/questionnaires.ts
var router5 = Router5();
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
router5.post("/templates", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
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
    const [existingTemplate] = await db.select().from(questionnaires).where(and6(
      eq8(questionnaires.month, month),
      eq8(questionnaires.year, year)
    )).limit(1);
    const questions = generateQuestionnaireQuestions(month, year);
    if (existingTemplate) {
      const [updated] = await db.update(questionnaires).set({
        questions,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq8(questionnaires.id, existingTemplate.id)).returning();
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
      }).from(users).where(and6(
        eq8(users.role, "ministro"),
        eq8(users.status, "active")
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
router5.get("/templates/:year/:month", authenticateToken, async (req, res) => {
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
      const [template] = await db.select().from(questionnaires).where(and6(
        eq8(questionnaires.month, month),
        eq8(questionnaires.year, year)
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
router5.post("/responses", authenticateToken, async (req, res) => {
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
      sharedWithFamilyIds: z3.array(z3.string()).optional(),
      familyServePreference: z3.enum(["together", "separately"]).optional()
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
      const [template] = await db.select().from(questionnaires).where(eq8(questionnaires.id, data.questionnaireId)).limit(1);
      if (template && template.status === "closed") {
        return res.status(400).json({ error: "Este question\xE1rio foi encerrado e n\xE3o aceita mais respostas" });
      }
    }
    console.log("[RESPONSES] Buscando usu\xE1rio para userId:", userId);
    let minister = null;
    try {
      const [foundUser] = await db.select().from(users).where(eq8(users.id, userId)).limit(1);
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
      const [template] = await db.select().from(questionnaires).where(and6(
        eq8(questionnaires.month, data.month),
        eq8(questionnaires.year, data.year)
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
    const [existingResponse] = await db.select().from(questionnaireResponses).where(and6(
      eq8(questionnaireResponses.userId, minister.id),
      eq8(questionnaireResponses.questionnaireId, templateId)
    )).limit(1);
    console.log("[RESPONSES] Resposta existente encontrada?", existingResponse ? "Sim" : "N\xE3o");
    console.log("[RESPONSES] Standardizing responses to v2.0 format");
    const standardizedResponse = QuestionnaireService.standardizeResponse(
      data.responses,
      data.month,
      data.year
    );
    console.log("[RESPONSES] Standardized response:", JSON.stringify(standardizedResponse, null, 2));
    console.log("[RESPONSES] Extracting structured data");
    const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);
    console.log("[RESPONSES] Dados extra\xEDdos:", extractedData);
    let result;
    if (existingResponse) {
      console.log("[RESPONSES] Atualizando resposta existente:", existingResponse.id);
      try {
        const [updated] = await db.update(questionnaireResponses).set({
          questionnaireId: templateId,
          responses: JSON.stringify(standardizedResponse),
          // SAVE STANDARDIZED V2.0 FORMAT
          availableSundays: extractedData.availableSundays,
          preferredMassTimes: extractedData.preferredMassTimes,
          alternativeTimes: extractedData.alternativeTimes,
          dailyMassAvailability: extractedData.dailyMassAvailability,
          specialEvents: extractedData.specialEvents,
          canSubstitute: extractedData.canSubstitute,
          notes: extractedData.notes,
          submittedAt: /* @__PURE__ */ new Date(),
          sharedWithFamilyIds: data.sharedWithFamilyIds || []
        }).where(eq8(questionnaireResponses.id, existingResponse.id)).returning();
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
          responses: JSON.stringify(standardizedResponse),
          // SAVE STANDARDIZED V2.0 FORMAT
          availableSundays: extractedData.availableSundays,
          preferredMassTimes: extractedData.preferredMassTimes,
          alternativeTimes: extractedData.alternativeTimes,
          dailyMassAvailability: extractedData.dailyMassAvailability,
          specialEvents: extractedData.specialEvents,
          canSubstitute: extractedData.canSubstitute,
          notes: extractedData.notes,
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
    if (data.familyServePreference && data.sharedWithFamilyIds && data.sharedWithFamilyIds.length > 0) {
      try {
        console.log("[RESPONSES] Salvando prefer\xEAncia familiar:", data.familyServePreference);
        const { storage: storage2 } = await init_storage().then(() => storage_exports);
        const preferTogether = data.familyServePreference === "together";
        await storage2.updateFamilyPreference(minister.id, preferTogether);
        console.log("[RESPONSES] Prefer\xEAncia familiar salva com sucesso");
      } catch (prefError) {
        console.error("[RESPONSES] Erro ao salvar prefer\xEAncia familiar:", prefError);
      }
    }
    if (data.sharedWithFamilyIds && data.sharedWithFamilyIds.length > 0) {
      console.log("[RESPONSES] Processando compartilhamento familiar:", data.sharedWithFamilyIds);
      for (const familyUserId of data.sharedWithFamilyIds) {
        try {
          const [familyMember] = await db.select({ id: users.id, name: users.name }).from(users).where(and6(
            eq8(users.id, familyUserId),
            eq8(users.status, "active")
          )).limit(1);
          if (!familyMember) {
            console.warn(`[RESPONSES] Usu\xE1rio n\xE3o encontrado ou inativo: ${familyUserId}`);
            continue;
          }
          const [familyRelation] = await db.select().from(familyRelationships).where(or4(
            and6(
              eq8(familyRelationships.userId, minister.id),
              eq8(familyRelationships.relatedUserId, familyUserId)
            ),
            and6(
              eq8(familyRelationships.userId, familyUserId),
              eq8(familyRelationships.relatedUserId, minister.id)
            )
          )).limit(1);
          if (!familyRelation) {
            console.warn(`[RESPONSES] Sem rela\xE7\xE3o familiar v\xE1lida entre ${minister.id} e ${familyUserId}`);
            continue;
          }
          const [existingFamilyResponse] = await db.select().from(questionnaireResponses).where(and6(
            eq8(questionnaireResponses.userId, familyUserId),
            eq8(questionnaireResponses.questionnaireId, templateId)
          )).limit(1);
          if (!existingFamilyResponse) {
            await db.insert(questionnaireResponses).values({
              userId: familyUserId,
              questionnaireId: templateId,
              responses: JSON.stringify(standardizedResponse),
              // SAVE STANDARDIZED V2.0 FORMAT
              availableSundays: extractedData.availableSundays,
              preferredMassTimes: extractedData.preferredMassTimes,
              alternativeTimes: extractedData.alternativeTimes,
              dailyMassAvailability: extractedData.dailyMassAvailability,
              specialEvents: extractedData.specialEvents,
              canSubstitute: extractedData.canSubstitute,
              notes: extractedData.notes,
              isSharedResponse: true,
              sharedFromUserId: minister.id,
              sharedWithFamilyIds: []
            });
            console.log(`[RESPONSES] Resposta compartilhada criada para ${familyMember.name} (${familyUserId})`);
          } else if (existingFamilyResponse.isSharedResponse && existingFamilyResponse.sharedFromUserId === minister.id) {
            await db.update(questionnaireResponses).set({
              responses: JSON.stringify(standardizedResponse),
              // SAVE STANDARDIZED V2.0 FORMAT
              availableSundays: extractedData.availableSundays,
              preferredMassTimes: extractedData.preferredMassTimes,
              alternativeTimes: extractedData.alternativeTimes,
              dailyMassAvailability: extractedData.dailyMassAvailability,
              specialEvents: extractedData.specialEvents,
              canSubstitute: extractedData.canSubstitute,
              notes: extractedData.notes,
              submittedAt: /* @__PURE__ */ new Date()
            }).where(eq8(questionnaireResponses.id, existingFamilyResponse.id));
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
router5.get("/responses/:year/:month", authenticateToken, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const userId = req.user?.id;
    if (!db) {
      return res.json(null);
    }
    try {
      const [user] = await db.select().from(users).where(eq8(users.id, userId)).limit(1);
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
      }).from(questionnaireResponses).leftJoin(questionnaires, eq8(questionnaireResponses.questionnaireId, questionnaires.id)).where(eq8(questionnaireResponses.userId, minister.id));
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
      }).from(questionnaireResponses).leftJoin(questionnaires, eq8(questionnaireResponses.questionnaireId, questionnaires.id)).where(and6(
        eq8(questionnaireResponses.userId, minister.id),
        eq8(questionnaires.month, month),
        eq8(questionnaires.year, year)
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
router5.get("/admin/responses-status/:year/:month", authenticateToken, async (req, res) => {
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
    const [questionnaire] = await db.select().from(questionnaires).where(and6(
      eq8(questionnaires.month, month),
      eq8(questionnaires.year, year)
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
    }).from(users).where(and6(
      eq8(users.role, "ministro"),
      eq8(users.status, "active")
    ));
    const responses = await db.select({
      userId: questionnaireResponses.userId,
      submittedAt: questionnaireResponses.submittedAt,
      responses: questionnaireResponses.responses
    }).from(questionnaireResponses).where(eq8(questionnaireResponses.questionnaireId, questionnaire.id));
    const responseMap = new Map(responses.map((r) => [r.userId, r]));
    const ministerResponses = ministers.map((minister) => {
      const response = responseMap.get(minister.id);
      return {
        id: minister.id,
        name: minister.name,
        email: minister.email,
        phone: minister.phone || "",
        responded: responseMap.has(minister.id),
        respondedAt: response && response.submittedAt ? new Date(response.submittedAt).toISOString() : null,
        availability: null
        // Pode ser expandido para incluir disponibilidade
      };
    });
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
router5.get("/admin/responses-summary/:year/:month", authenticateToken, async (req, res) => {
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
    const [questionnaire] = await db.select().from(questionnaires).where(and6(
      eq8(questionnaires.month, month),
      eq8(questionnaires.year, year)
    )).limit(1);
    if (!questionnaire) {
      return res.json({ totalResponses: 0, questions: [], summary: {} });
    }
    const responses = await db.select().from(questionnaireResponses).where(eq8(questionnaireResponses.questionnaireId, questionnaire.id));
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
router5.get("/admin/responses/:templateId/:userId", authenticateToken, async (req, res) => {
  try {
    const { templateId, userId } = req.params;
    const userRole = req.user.role;
    if (userRole !== "gestor" && userRole !== "coordenador") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const [questionnaire] = await db.select().from(questionnaires).where(eq8(questionnaires.id, templateId)).limit(1);
    if (!questionnaire) {
      return res.status(404).json({ error: "Questionnaire not found" });
    }
    const [user] = await db.select({
      name: users.name,
      email: users.email,
      phone: users.phone
    }).from(users).where(eq8(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const [response] = await db.select().from(questionnaireResponses).where(and6(
      eq8(questionnaireResponses.questionnaireId, templateId),
      eq8(questionnaireResponses.userId, userId)
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
router5.get("/responses/all/:year/:month", authenticateToken, async (req, res) => {
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
    }).from(questionnaireResponses).leftJoin(users, eq8(questionnaireResponses.userId, users.id)).leftJoin(questionnaires, eq8(questionnaireResponses.questionnaireId, questionnaires.id)).where(and6(
      eq8(questionnaires.month, month),
      eq8(questionnaires.year, year)
    ));
    res.json(responses);
  } catch (error) {
    console.error("Error fetching all questionnaire responses:", error);
    res.status(500).json({ error: "Failed to fetch questionnaire responses" });
  }
});
router5.patch("/admin/templates/:id/close", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const userId = req.user?.id;
    const templateId = req.params.id;
    if (!req.user || !["gestor", "coordenador"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(eq8(questionnaires.id, templateId)).limit(1);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (existingTemplate.status === "closed") {
      return res.status(400).json({ error: "Question\xE1rio j\xE1 est\xE1 encerrado" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "closed",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq8(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error("Error closing questionnaire:", error);
    res.status(500).json({ error: "Failed to close questionnaire" });
  }
});
router5.patch("/admin/templates/:id/reopen", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const userId = req.user?.id;
    const templateId = req.params.id;
    if (!req.user || !["gestor", "coordenador"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (!db) {
      return res.status(503).json({ error: "Database service unavailable" });
    }
    const [existingTemplate] = await db.select().from(questionnaires).where(eq8(questionnaires.id, templateId)).limit(1);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }
    if (existingTemplate.status !== "closed") {
      return res.status(400).json({ error: "Question\xE1rio n\xE3o est\xE1 encerrado" });
    }
    const [updated] = await db.update(questionnaires).set({
      status: "sent",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq8(questionnaires.id, templateId)).returning();
    res.json({
      ...updated,
      questions: updated.questions
    });
  } catch (error) {
    console.error("Error reopening questionnaire:", error);
    res.status(500).json({ error: "Failed to reopen questionnaire" });
  }
});
router5.get("/family-sharing/:questionnaireId", authenticateToken, async (req, res) => {
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
router5.get("/:questionnaireId/export/csv", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { format: format10 = "detailed" } = req.query;
    const exportData = await getQuestionnaireResponsesForExport(questionnaireId);
    const csvContent = format10 === "detailed" ? createDetailedCSV(exportData) : convertResponsesToCSV(exportData);
    const [questionnaire] = await db.select().from(questionnaires).where(eq8(questionnaires.id, questionnaireId)).limit(1);
    const filename = questionnaire ? `respostas_${questionnaire.title.replace(/\s+/g, "_")}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv` : `respostas_questionario_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting questionnaire responses:", error);
    res.status(500).json({ error: "Failed to export questionnaire responses" });
  }
});
router5.get("/export/:year/:month/csv", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { format: format10 = "detailed" } = req.query;
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid month or year" });
    }
    const exportData = await getMonthlyResponsesForExport(month, year);
    const csvContent = format10 === "detailed" ? createDetailedCSV(exportData) : convertResponsesToCSV(exportData);
    const monthName = monthNames[month - 1];
    const filename = `respostas_${monthName}_${year}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting monthly responses:", error);
    const message = error instanceof Error ? error.message : "Failed to export monthly responses";
    res.status(500).json({ error: message });
  }
});
router5.post("/admin/reprocess-responses", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Database not available" });
    }
    const { questionnaireId } = req.body;
    console.log(`[REPROCESS] \u{1F504} Iniciando reprocessamento...`);
    console.log(`[REPROCESS] QuestionnaireId recebido:`, questionnaireId);
    if (questionnaireId) {
      const [questionnaire] = await db.select().from(questionnaires).where(eq8(questionnaires.id, questionnaireId)).limit(1);
      if (!questionnaire) {
        console.log(`[REPROCESS] \u274C Question\xE1rio ${questionnaireId} n\xE3o encontrado!`);
        return res.status(404).json({ error: "Question\xE1rio n\xE3o encontrado" });
      }
      console.log(`[REPROCESS] \u2705 Question\xE1rio encontrado: ${questionnaire.title} (${questionnaire.month}/${questionnaire.year})`);
    }
    const allResponses = questionnaireId ? await db.select().from(questionnaireResponses).where(eq8(questionnaireResponses.questionnaireId, questionnaireId)) : await db.select().from(questionnaireResponses);
    console.log(`[REPROCESS] \u{1F4DD} Encontradas ${allResponses.length} respostas para reprocessar...`);
    let updated = 0;
    let errors = 0;
    for (const response of allResponses) {
      try {
        const responsesArray = typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses;
        const [questionnaire] = await db.select().from(questionnaires).where(eq8(questionnaires.id, response.questionnaireId)).limit(1);
        const standardizedResponse = QuestionnaireService.standardizeResponse(
          responsesArray,
          questionnaire?.month,
          questionnaire?.year
        );
        const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);
        console.log(`[REPROCESS] Resposta ${response.id}:`, {
          availableSundays: extractedData.availableSundays?.length || 0,
          dailyMass: extractedData.dailyMassAvailability?.length || 0,
          specialEvents: extractedData.specialEvents ? Object.keys(extractedData.specialEvents).length : 0
        });
        await db.update(questionnaireResponses).set({
          responses: JSON.stringify(standardizedResponse),
          // SAVE STANDARDIZED V2.0 FORMAT
          availableSundays: extractedData.availableSundays,
          preferredMassTimes: extractedData.preferredMassTimes,
          alternativeTimes: extractedData.alternativeTimes,
          dailyMassAvailability: extractedData.dailyMassAvailability,
          specialEvents: extractedData.specialEvents,
          canSubstitute: extractedData.canSubstitute,
          notes: extractedData.notes
        }).where(eq8(questionnaireResponses.id, response.id));
        updated++;
      } catch (error) {
        console.error(`[REPROCESS] Erro ao processar resposta ${response.id}:`, error.message);
        errors++;
      }
    }
    console.log(`[REPROCESS] \u2705 Conclu\xEDdo: ${updated} atualizadas, ${errors} erros`);
    res.json({
      success: true,
      message: `Reprocessadas ${updated} respostas com sucesso`,
      data: {
        total: allResponses.length,
        updated,
        errors
      }
    });
  } catch (error) {
    console.error("[REPROCESS] Erro geral:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao reprocessar respostas"
    });
  }
});
var questionnaires_default = router5;

// server/routes/scheduleGeneration.ts
import { Router as Router6 } from "express";
import { z as z4 } from "zod";
await init_scheduleGenerator();
init_logger();
await init_db();
init_schema();
import { and as and8, gte as gte3, lte as lte3, eq as eq11, sql as sql5, ne as ne3, desc as desc4, inArray as inArray2 } from "drizzle-orm";
import { ptBR as ptBR2 } from "date-fns/locale";
import { format as format3 } from "date-fns";
var router6 = Router6();
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
    ministerId: z4.string().nullable(),
    // Permite null para posições VACANTE
    position: z4.number().optional(),
    // Order position for ministers at same date/time
    notes: z4.string().optional()
  })),
  replaceExisting: z4.boolean().default(false)
});
router6.post("/generate", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { year, month, saveToDatabase, replaceExisting } = generateScheduleSchema.parse(req.body);
    logger.info(`Iniciando gera\xE7\xE3o autom\xE1tica de escalas para ${month}/${year} por usu\xE1rio ${req.user?.id}`);
    if (db) {
      const [targetQuestionnaire] = await db.select().from(questionnaires).where(
        and8(
          eq11(questionnaires.month, month),
          eq11(questionnaires.year, year)
        )
      ).limit(1);
      if (!targetQuestionnaire) {
        logger.warn(`Tentativa de gerar escalas sem question\xE1rio: ${month}/${year}`);
        return res.status(400).json({
          success: false,
          message: `N\xE3o h\xE1 question\xE1rio criado para ${month}/${year}. Crie um question\xE1rio antes de gerar escalas.`,
          errorCode: "NO_QUESTIONNAIRE"
        });
      }
      const responses = await db.select().from(questionnaireResponses).where(eq11(questionnaireResponses.questionnaireId, targetQuestionnaire.id));
      if (responses.length === 0) {
        logger.warn(`Tentativa de gerar escalas sem respostas: ${month}/${year}`);
        return res.status(400).json({
          success: false,
          message: "N\xE3o h\xE1 respostas do question\xE1rio para este m\xEAs. Aguarde os ministros responderem antes de gerar escalas.",
          errorCode: "NO_RESPONSES",
          questionnaireStatus: targetQuestionnaire.status
        });
      }
      logger.info(`Valida\xE7\xE3o OK: question\xE1rio ${targetQuestionnaire.id} com ${responses.length} respostas`);
    }
    if (!replaceExisting && db) {
      const existingSchedules = await db.select({ id: schedules.id }).from(schedules).where(sql5`EXTRACT(MONTH FROM date) = ${month} AND EXTRACT(YEAR FROM date) = ${year}`).limit(1);
      if (existingSchedules.length > 0) {
        return res.status(400).json({
          success: false,
          message: `J\xE1 existem escalas cadastradas para ${month}/${year}. Use replaceExisting: true para substituir.`,
          hasExistingSchedules: true
        });
      }
    }
    console.log("[ROUTE] \u23F3 INICIANDO generateAutomaticSchedule com:", { year, month, saveToDatabase, isPreview: false });
    let generatedSchedules;
    try {
      generatedSchedules = await generateAutomaticSchedule(year, month, false);
      console.log("[ROUTE] \u2705 Generated schedules count:", generatedSchedules.length);
    } catch (genError) {
      console.error("[ROUTE] \u274C ERRO NA FUN\xC7\xC3O generateAutomaticSchedule:", genError);
      console.error("[ROUTE] \u274C genError.message:", genError.message);
      console.error("[ROUTE] \u274C genError.stack:", genError.stack);
      throw genError;
    }
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
    console.log("[RESPONSE_DEBUG] Estrutura da resposta:", {
      success: response.success,
      totalSchedules: response.data.totalSchedules,
      schedulesCount: response.data.schedules?.length,
      hasQualityMetrics: !!response.data.qualityMetrics,
      qualityMetricsKeys: response.data.qualityMetrics ? Object.keys(response.data.qualityMetrics) : []
    });
    res.json(response);
  } catch (error) {
    console.error("\u274C [ROUTE] ERRO DETALHADO NO GENERATE:", error);
    console.error("\u274C [ROUTE] ERRO STACK:", error.stack);
    console.error("\u274C [ROUTE] ERRO NAME:", error.name);
    console.error("\u274C [ROUTE] ERRO MESSAGE:", error.message);
    logger.error("Erro ao gerar escalas autom\xE1ticas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Falha na gera\xE7\xE3o autom\xE1tica de escalas",
      errorDetails: {
        message: error.message,
        name: error.name,
        stack: error.stack
      }
    });
  }
});
router6.post("/emergency-save", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    console.log("=== EMERGENCY SAVE START ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Schedules count:", req.body.schedules?.length);
    console.log("Month:", req.body.month, "Year:", req.body.year);
    const { schedules: schedulesInput, month, year } = req.body;
    if (!schedulesInput || !Array.isArray(schedulesInput)) {
      return res.status(400).json({
        success: false,
        message: "Schedules array is required"
      });
    }
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o de banco de dados indispon\xEDvel"
      });
    }
    console.log("First schedule sample:", JSON.stringify(schedulesInput[0], null, 2));
    const results = [];
    const errors = [];
    if (month && year) {
      try {
        console.log(`=== DELETING EXISTING SCHEDULES FOR ${month}/${year} ===`);
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        console.log(`Date range: ${startDate} to ${endDate}`);
        const existingSchedules = await db.select({ id: schedules.id }).from(schedules).where(
          and8(
            gte3(schedules.date, startDate),
            lte3(schedules.date, endDate)
          )
        );
        console.log(`Found ${existingSchedules.length} existing schedules to delete`);
        if (existingSchedules.length > 0) {
          const scheduleIds = existingSchedules.map((s) => s.id);
          const deletedSubstitutions = await db.delete(substitutionRequests).where(
            inArray2(substitutionRequests.scheduleId, scheduleIds)
          );
          console.log(`Deleted substitution requests`);
          const deletedSchedules = await db.delete(schedules).where(
            and8(
              gte3(schedules.date, startDate),
              lte3(schedules.date, endDate)
            )
          );
          console.log(`Deleted ${existingSchedules.length} schedules`);
        }
      } catch (deleteErr) {
        console.error("Error deleting existing schedules:", deleteErr);
      }
    }
    for (let i = 0; i < schedulesInput.length; i++) {
      const schedule = schedulesInput[i];
      try {
        if (!schedule.date || !schedule.time) {
          throw new Error(`Missing required fields: date=${schedule.date}, time=${schedule.time}`);
        }
        if (schedule.ministerId) {
          const [ministerExists] = await db.select({ id: users.id }).from(users).where(eq11(users.id, schedule.ministerId)).limit(1);
          if (!ministerExists) {
            throw new Error(`Minister ID ${schedule.ministerId} does not exist in database`);
          }
        }
        const recordToInsert = {
          date: schedule.date,
          time: schedule.time,
          type: schedule.type || "missa",
          location: schedule.location || null,
          ministerId: schedule.ministerId || null,
          position: schedule.position !== void 0 ? schedule.position : i + 1,
          status: "scheduled",
          notes: schedule.notes || null
          // NOT including fields that don't exist in DB: on_site_adjustments, mass_type, month, year
        };
        const [inserted] = await db.insert(schedules).values(recordToInsert).returning();
        results.push({
          success: true,
          id: inserted.id,
          index: i
        });
      } catch (err) {
        console.error(`[${i}] \u274C Failed to insert schedule:`, err);
        console.error(`[${i}] Error type:`, typeof err);
        console.error(`[${i}] Error message:`, err?.message);
        console.error(`[${i}] Error code:`, err?.code);
        console.error(`[${i}] Error stack:`, err?.stack);
        console.error(`[${i}] Full error object:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));
        errors.push({
          success: false,
          error: err?.message || String(err),
          code: err?.code,
          detail: err?.detail,
          constraint: err?.constraint,
          errorType: err?.name,
          fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
          index: i,
          schedule: {
            date: schedule.date,
            time: schedule.time,
            ministerId: schedule.ministerId,
            position: schedule.position
          }
        });
      }
    }
    const savedCount = results.filter((r) => r.success).length;
    const failedCount = errors.length;
    console.log(`=== EMERGENCY SAVE COMPLETE ===`);
    console.log(`Saved: ${savedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
      console.log("First 5 errors:", JSON.stringify(errors.slice(0, 5), null, 2));
    }
    res.json({
      success: failedCount === 0,
      message: failedCount === 0 ? `${savedCount} escalas salvas com sucesso via emergency save` : `Salvos: ${savedCount}, Falhas: ${failedCount}`,
      data: {
        savedCount,
        failedCount,
        results,
        errors: errors.length > 0 ? errors.slice(0, 10) : void 0,
        // Return only first 10 errors to avoid huge response
        errorSummary: errors.length > 0 ? {
          total: errors.length,
          sampleError: errors[0],
          uniqueErrors: [...new Set(errors.map((e) => e.error))],
          uniqueCodes: [...new Set(errors.map((e) => e.code))],
          uniqueConstraints: [...new Set(errors.map((e) => e.constraint))]
        } : void 0
      }
    });
  } catch (error) {
    console.error("=== EMERGENCY SAVE CRITICAL ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Erro cr\xEDtico no emergency save",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
router6.post("/inspect-save-data", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { schedules: schedulesInput } = req.body;
    if (!schedulesInput || !Array.isArray(schedulesInput)) {
      return res.status(400).json({
        success: false,
        message: "Schedules array is required"
      });
    }
    const analysis = {
      total: schedulesInput.length,
      sample: schedulesInput.slice(0, 3),
      ministerIds: [...new Set(schedulesInput.map((s) => s.ministerId).filter(Boolean))],
      uniqueDates: [...new Set(schedulesInput.map((s) => s.date))],
      uniqueTimes: [...new Set(schedulesInput.map((s) => s.time))],
      missingDate: schedulesInput.filter((s) => !s.date).length,
      missingTime: schedulesInput.filter((s) => !s.time).length,
      missingMinisterId: schedulesInput.filter((s) => !s.ministerId).length,
      dataTypes: {
        date: typeof schedulesInput[0]?.date,
        time: typeof schedulesInput[0]?.time,
        ministerId: typeof schedulesInput[0]?.ministerId,
        position: typeof schedulesInput[0]?.position
      }
    };
    if (db && analysis.ministerIds.length > 0) {
      const existingMinisters = await db.select({ id: users.id }).from(users).where(inArray2(users.id, analysis.ministerIds.slice(0, 50)));
      analysis.ministerIdsInDb = existingMinisters.length;
      analysis.ministerIdsRequested = analysis.ministerIds.length;
      const existingIds = new Set(existingMinisters.map((m) => m.id));
      analysis.missingMinisterIds = analysis.ministerIds.filter((id) => !existingIds.has(id)).slice(0, 10);
    }
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});
router6.post("/save-generated", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    console.log("=== SAVE-GENERATED START ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Schedules count:", req.body.schedules?.length);
    console.log("Replace existing:", req.body.replaceExisting);
    const { schedules: schedulesToSave, replaceExisting } = saveSchedulesSchema.parse(req.body);
    console.log("Parsed schedules:", schedulesToSave.length);
    console.log("First schedule sample:", schedulesToSave[0]);
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o de banco de dados indispon\xEDvel"
      });
    }
    if (replaceExisting && schedulesToSave.length > 0) {
      console.log("=== CASCADE DELETION START ===");
      const sortedSchedules = [...schedulesToSave].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = sortedSchedules[0].date;
      const lastDate = sortedSchedules[sortedSchedules.length - 1].date;
      console.log(`Date range: ${firstDate} to ${lastDate}`);
      const existingSchedules = await db.select({ id: schedules.id }).from(schedules).where(
        and8(
          gte3(schedules.date, firstDate),
          lte3(schedules.date, lastDate)
        )
      );
      console.log(`Found ${existingSchedules.length} existing schedules to delete`);
      if (existingSchedules.length > 0) {
        const scheduleIds = existingSchedules.map((s) => s.id);
        console.log(`Schedule IDs to delete:`, scheduleIds.slice(0, 5), "...");
        const deletedSubstitutions = await db.delete(substitutionRequests).where(
          inArray2(substitutionRequests.scheduleId, scheduleIds)
        );
        console.log(`Deleted substitution requests:`, deletedSubstitutions);
        logger.info(`Removed substitution requests for ${scheduleIds.length} schedules`);
      }
      const deletedSchedules = await db.delete(schedules).where(
        and8(
          gte3(schedules.date, firstDate),
          lte3(schedules.date, lastDate)
        )
      );
      console.log(`Deleted schedules:`, deletedSchedules);
      logger.info(`Removidas escalas existentes entre ${firstDate} e ${lastDate}`);
      console.log("=== CASCADE DELETION COMPLETE ===");
    }
    const groupedByDateTime = {};
    schedulesToSave.forEach((s, idx) => {
      const key = `${s.date}_${s.time}`;
      if (!groupedByDateTime[key]) {
        groupedByDateTime[key] = [];
      }
      groupedByDateTime[key].push({ ...s, _index: idx });
    });
    const schedulesToInsert = schedulesToSave.map((s, globalIndex) => {
      const key = `${s.date}_${s.time}`;
      const group = groupedByDateTime[key];
      let positionInGroup = 1;
      for (let i = 0; i < group.length; i++) {
        if (group[i]._index === globalIndex) {
          positionInGroup = i + 1;
          break;
        }
      }
      return {
        date: s.date,
        time: s.time,
        type: s.type,
        location: s.location || null,
        ministerId: s.ministerId,
        // Drizzle will map this to minister_id
        position: s.position ?? positionInGroup,
        // Use provided position or calculated group position
        notes: s.notes || null,
        status: "scheduled"
        // NOT including fields that don't exist in DB: on_site_adjustments, mass_type, month, year
      };
    });
    console.log("=== INSERTING SCHEDULES ===");
    console.log(`Inserting ${schedulesToInsert.length} schedules`);
    console.log("Sample schedule to insert:", schedulesToInsert[0]);
    const saved = await db.insert(schedules).values(schedulesToInsert).returning();
    console.log(`Successfully inserted ${saved.length} schedules`);
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
    console.error("=== SAVE-GENERATED ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Error constraint:", error.constraint);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    logger.error("Erro ao salvar escalas:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao salvar escalas",
      errorCode: error.code,
      errorDetail: error.detail,
      constraint: error.constraint
    });
  }
});
router6.get("/preview/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Ano e m\xEAs devem ser v\xE1lidos"
      });
    }
    console.log("[PREVIEW ROUTE] \u{1F680} Starting schedule preview with 30s timeout");
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("\u23F1\uFE0F Schedule generation timed out after 30 seconds. This indicates a performance issue that needs to be fixed."));
      }, 3e4);
    });
    console.log("[PREVIEW ROUTE] Calling generateAutomaticSchedule with:", { year, month, isPreview: true });
    const generatedSchedules = await Promise.race([
      generateAutomaticSchedule(year, month, true),
      // Preview aceita questionários abertos
      timeoutPromise
    ]);
    console.log("[PREVIEW ROUTE] \u2705 Generated schedules count:", generatedSchedules.length);
    const correctedSchedules = generatedSchedules.filter((schedule) => {
      const isDay28 = schedule.massTime.date?.endsWith("-28");
      const isDailyMass = schedule.massTime.type === "missa_diaria";
      if (isDay28 && isDailyMass) {
        console.log(`[PREVIEW_FILTER] \u{1F6AB} Removendo missa di\xE1ria do dia 28: ${schedule.massTime.date} ${schedule.massTime.time}`);
        return false;
      }
      return true;
    });
    console.log(`[PREVIEW_FILTER] Filtro aplicado: ${generatedSchedules.length} \u2192 ${correctedSchedules.length} escalas`);
    res.json({
      success: true,
      data: {
        month,
        year,
        totalSchedules: correctedSchedules.length,
        averageConfidence: calculateAverageConfidence(correctedSchedules),
        schedules: formatSchedulesForAPI(correctedSchedules),
        qualityMetrics: calculateQualityMetrics(correctedSchedules)
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
router6.get("/debug/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const { ScheduleGenerator: ScheduleGenerator2 } = await init_scheduleGenerator().then(() => scheduleGenerator_exports);
    const generator = new ScheduleGenerator2();
    const ministersData = await db.select({
      id: users.id,
      name: users.name,
      role: users.role,
      status: users.status,
      totalServices: users.totalServices
    }).from(users).where(
      and8(
        eq11(users.status, "active"),
        ne3(users.role, "gestor")
      )
    );
    const massTimesData = await db.select().from(massTimesConfig).where(eq11(massTimesConfig.isActive, true));
    const responsesData = await db.select().from(questionnaireResponses).innerJoin(questionnaires, eq11(questionnaireResponses.questionnaireId, questionnaires.id)).where(
      and8(
        eq11(questionnaires.month, month),
        eq11(questionnaires.year, year)
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
router6.get("/quality-metrics/:year/:month", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Servi\xE7o de banco de dados indispon\xEDvel"
      });
    }
    const existingSchedules = await db.select().from(schedules).leftJoin(users, eq11(schedules.ministerId, users.id)).where(
      and8(
        sql5`EXTRACT(MONTH FROM ${schedules.date}) = ${month}`,
        sql5`EXTRACT(YEAR FROM ${schedules.date}) = ${year}`
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
      const existingSchedules = await db.select({ id: schedules.id }).from(schedules).where(
        and8(
          eq11(schedules.date, schedule.massTime.date),
          eq11(schedules.time, schedule.massTime.time)
        )
      );
      if (existingSchedules.length > 0) {
        const scheduleIds = existingSchedules.map((s) => s.id);
        await db.delete(substitutionRequests).where(
          inArray2(substitutionRequests.scheduleId, scheduleIds)
        );
      }
      await db.delete(schedules).where(
        and8(
          eq11(schedules.date, schedule.massTime.date),
          eq11(schedules.time, schedule.massTime.time)
        )
      );
    }
    for (let i = 0; i < schedule.ministers.length; i++) {
      const minister = schedule.ministers[i];
      await db.insert(schedules).values({
        date: schedule.massTime.date,
        time: schedule.massTime.time,
        type: "missa",
        location: null,
        ministerId: minister.id,
        // Pode ser null para VACANTE
        position: minister.position || i + 1,
        // Usar position do ministro ou index + 1
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
      if (minister.id !== null) {
        ministerCounts[minister.id] = (ministerCounts[minister.id] || 0) + 1;
      }
    });
  });
  const counts = Object.values(ministerCounts);
  const avg2 = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg2, 2), 0) / counts.length;
  return Math.max(0, 1 - Math.sqrt(variance) / avg2);
}
function formatSchedulesForAPI(schedules3) {
  console.log(`[API_FILTER] \u{1F525} EXECUTANDO FILTRO! Total schedules: ${schedules3.length}`);
  const filteredSchedules = schedules3.filter((schedule) => {
    const isDay28 = schedule.massTime.date?.endsWith("-28");
    const isDailyMass = schedule.massTime.type === "missa_diaria";
    console.log(`[API_FILTER] \u{1F50D} Checking: ${schedule.massTime.date} ${schedule.massTime.time} type=${schedule.massTime.type}`);
    if (isDay28 && isDailyMass) {
      console.log(`[API_FILTER] \u{1F6AB} REMOVENDO missa di\xE1ria do dia 28: ${schedule.massTime.date} ${schedule.massTime.time}`);
      return false;
    }
    return true;
  });
  console.log(`[API_FILTER] \u{1F4CA} Filtro final: ${schedules3.length} \u2192 ${filteredSchedules.length} escalas`);
  return filteredSchedules.map((schedule) => ({
    date: schedule.massTime.date,
    time: schedule.massTime.time,
    dayOfWeek: schedule.massTime.dayOfWeek,
    type: schedule.massTime.type || "missa",
    // Incluir tipo da missa
    ministers: schedule.ministers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      totalServices: m.totalServices,
      availabilityScore: Math.round(m.availabilityScore * 100) / 100,
      position: m.position
    })),
    backupMinisters: schedule.backupMinisters.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      position: m.position
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
router6.get("/by-date/:date", authenticateToken, async (req, res) => {
  try {
    const { date: date2 } = req.params;
    const dateOnly = date2.split("T")[0];
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    const assignments = await db.select({
      id: schedules.id,
      date: schedules.date,
      time: schedules.time,
      type: schedules.type,
      ministerId: schedules.ministerId,
      position: schedules.position,
      status: schedules.status,
      notes: schedules.notes,
      ministerName: users.name
    }).from(schedules).leftJoin(users, eq11(schedules.ministerId, users.id)).where(eq11(schedules.date, dateOnly)).orderBy(schedules.time, schedules.position);
    const formattedAssignments = assignments.map((a) => ({
      id: a.id,
      date: a.date,
      massTime: a.time,
      // Frontend expects 'massTime' field
      type: a.type,
      ministerId: a.ministerId,
      position: a.position,
      status: a.status,
      notes: a.notes,
      ministerName: a.ministerName,
      confirmed: a.status === "scheduled"
      // Map status to confirmed boolean
    }));
    if (formattedAssignments.length === 0) {
      return res.json({
        message: "Nenhuma escala publicada para esta data",
        assignments: []
      });
    }
    res.json({ assignments: formattedAssignments });
  } catch (error) {
    logger.error("Error fetching schedule by date:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});
router6.get("/:date/:time", authenticateToken, async (req, res) => {
  try {
    const { date: date2, time: time2 } = req.params;
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    const scheduledMinisters = await db.select({
      id: schedules.id,
      ministerId: schedules.ministerId,
      ministerName: users.name,
      status: schedules.status,
      notes: schedules.notes,
      type: schedules.type,
      location: schedules.location,
      position: schedules.position
    }).from(schedules).leftJoin(users, eq11(schedules.ministerId, users.id)).where(and8(
      eq11(schedules.date, date2),
      eq11(schedules.time, time2)
    )).orderBy(schedules.position);
    res.json({
      date: date2,
      time: time2,
      ministers: scheduledMinisters
    });
  } catch (error) {
    logger.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});
router6.post("/add-minister", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const schema = z4.object({
      date: z4.string(),
      time: z4.string(),
      ministerId: z4.string().nullable(),
      // Permite null para posições VACANTE
      position: z4.number().optional(),
      // NOVO: aceita posição opcional
      type: z4.string().default("missa"),
      location: z4.string().optional(),
      notes: z4.string().optional(),
      skipDuplicateCheck: z4.boolean().optional()
      // NOVO: flag para permitir substituição durante edição
    });
    const data = schema.parse(req.body);
    logger.info(`[ADD_MINISTER] \u{1F4E5} Recebido: date=${data.date}, time=${data.time}, ministerId=${data.ministerId}, position=${data.position}, skipDuplicateCheck=${data.skipDuplicateCheck}`);
    if (!db) {
      return res.status(503).json({ message: "Database unavailable" });
    }
    if (!data.skipDuplicateCheck) {
      logger.info(`[ADD_MINISTER] \u{1F50D} Verificando duplica\xE7\xE3o: date=${data.date}, time=${data.time}, ministerId=${data.ministerId}`);
      const [existing] = await db.select().from(schedules).where(and8(
        eq11(schedules.date, data.date),
        eq11(schedules.time, data.time),
        eq11(schedules.ministerId, data.ministerId)
      )).limit(1);
      if (existing) {
        logger.warn(`[ADD_MINISTER] \u26A0\uFE0F Ministro ${data.ministerId} j\xE1 escalado neste hor\xE1rio (ID do registro existente: ${existing.id})`);
        return res.status(400).json({ message: "Ministro j\xE1 escalado neste hor\xE1rio" });
      }
      logger.info(`[ADD_MINISTER] \u2705 Nenhuma duplica\xE7\xE3o encontrada, prosseguindo...`);
    } else {
      logger.info(`[ADD_MINISTER] \u23E9 Pulando verifica\xE7\xE3o de duplica\xE7\xE3o (modo edi\xE7\xE3o)`);
    }
    let newPosition;
    if (data.position !== void 0) {
      newPosition = data.position;
      logger.info(`[ADD_MINISTER] \u2705 Usando posi\xE7\xE3o fornecida: ${newPosition}`);
    } else {
      const existingMinisters = await db.select({ position: schedules.position }).from(schedules).where(and8(
        eq11(schedules.date, data.date),
        eq11(schedules.time, data.time)
      )).orderBy(desc4(schedules.position));
      newPosition = existingMinisters.length > 0 && existingMinisters[0].position ? existingMinisters[0].position + 1 : 1;
      logger.info(`[ADD_MINISTER] \u{1F522} Posi\xE7\xE3o calculada automaticamente: ${newPosition} (ministros existentes: ${existingMinisters.length})`);
    }
    const [newSchedule] = await db.insert(schedules).values({
      date: data.date,
      time: data.time,
      type: data.type,
      location: data.location,
      ministerId: data.ministerId,
      position: newPosition,
      notes: data.notes,
      status: "scheduled"
    }).returning();
    logger.info(`[ADD_MINISTER] \u2705 Ministro adicionado com sucesso: id=${newSchedule.id}, position=${newSchedule.position}`);
    res.json(newSchedule);
  } catch (error) {
    logger.error("[ADD_MINISTER] \u274C Erro ao adicionar ministro:", error);
    logger.error("[ADD_MINISTER] \u274C Stack:", error.stack);
    res.status(500).json({ message: error.message || "Erro ao adicionar ministro na escala" });
  }
});
router6.delete("/:id", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    await db.delete(schedules).where(eq11(schedules.id, id));
    res.json({ success: true, message: "Ministro removido da escala" });
  } catch (error) {
    logger.error("Error removing minister from schedule:", error);
    res.status(500).json({ error: "Failed to remove minister from schedule" });
  }
});
router6.patch("/batch-update", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  try {
    console.log("[batch-update] Request body:", req.body);
    const schema = z4.object({
      date: z4.string(),
      time: z4.string(),
      ministers: z4.array(z4.string().nullable())
      // Array de IDs de ministros (null = VACANTE)
    });
    const { date: date2, time: time2, ministers } = schema.parse(req.body);
    console.log("[batch-update] Parsed data:", { date: date2, time: time2, ministers });
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    console.log("[batch-update] Fetching existing schedules for:", { date: date2, time: time2 });
    const existingSchedules = await db.select().from(schedules).where(and8(
      eq11(schedules.date, date2),
      eq11(schedules.time, time2)
    ));
    console.log("[batch-update] Found existing schedules:", existingSchedules.length);
    for (let i = 0; i < ministers.length; i++) {
      const ministerId = ministers[i];
      const position = i + 1;
      if (existingSchedules[i]) {
        console.log("[batch-update] Updating schedule:", existingSchedules[i].id);
        await db.update(schedules).set({
          ministerId,
          position
        }).where(eq11(schedules.id, existingSchedules[i].id));
      } else {
        console.log("[batch-update] Creating new schedule at position:", position);
        await db.insert(schedules).values({
          date: date2,
          time: time2,
          ministerId,
          position,
          type: "missa",
          status: "scheduled"
        });
      }
    }
    if (existingSchedules.length > ministers.length) {
      const schedulesToDelete = existingSchedules.slice(ministers.length);
      console.log("[batch-update] Removing excess schedules:", schedulesToDelete.length);
      for (const schedule of schedulesToDelete) {
        const hasSubstitutions = await db.select().from(substitutionRequests).where(eq11(substitutionRequests.scheduleId, schedule.id)).limit(1);
        if (hasSubstitutions.length > 0) {
          console.log("[batch-update] Schedule has substitutions, setting ministerId to null:", schedule.id);
          await db.update(schedules).set({ ministerId: null }).where(eq11(schedules.id, schedule.id));
        } else {
          console.log("[batch-update] Deleting schedule:", schedule.id);
          await db.delete(schedules).where(eq11(schedules.id, schedule.id));
        }
      }
    }
    console.log("[batch-update] Success! Updated schedule");
    res.json({ success: true, message: "Escala atualizada com sucesso" });
  } catch (error) {
    console.error("[batch-update] Error:", error);
    logger.error("Error batch updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule", details: error.message });
  }
});
var scheduleGeneration_default = router6;

// server/routes/smartScheduleGeneration.ts
await init_db();
init_schema();
import { Router as Router7 } from "express";
await init_scheduleGenerator();
import { eq as eq12, and as and9, gte as gte4, lte as lte4, ne as ne4 } from "drizzle-orm";

// server/utils/liturgicalCalculations.ts
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  return new Date(year, month - 1, day);
}
function getLiturgicalCycle(year) {
  const remainder = year % 3;
  if (remainder === 0) return "A";
  if (remainder === 1) return "B";
  return "C";
}
function getAdventStart(year) {
  const christmas = new Date(year, 11, 25);
  const dayOfWeek = christmas.getDay();
  const daysToSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const daysBack = 28 + daysToSunday;
  const adventStart = new Date(year, 11, 25 - daysBack);
  return adventStart;
}
function getMovableFeasts(year) {
  const easter = calculateEaster(year);
  return {
    ashWednesday: addDays2(easter, -46),
    palmSunday: addDays2(easter, -7),
    holyThursday: addDays2(easter, -3),
    goodFriday: addDays2(easter, -2),
    holySaturday: addDays2(easter, -1),
    easterSunday: easter,
    divineMercySunday: addDays2(easter, 7),
    ascension: addDays2(easter, 39),
    // or 43 in some regions
    pentecost: addDays2(easter, 49),
    trinitySunday: addDays2(easter, 56),
    corpusChristi: addDays2(easter, 60)
    // or next Sunday in some regions
  };
}
function getLiturgicalSeasons(year) {
  const adventStart = getAdventStart(year);
  const christmas = new Date(year, 11, 25);
  const epiphany = new Date(year + 1, 0, 6);
  const baptismOfTheLord = getNextSunday(epiphany);
  const movableFeasts = getMovableFeasts(year + 1);
  const ashWednesday = movableFeasts.ashWednesday;
  const easterSunday = movableFeasts.easterSunday;
  const pentecost = movableFeasts.pentecost;
  const nextAdventStart = getAdventStart(year + 1);
  return [
    {
      name: "Advent",
      color: "purple",
      startDate: adventStart,
      endDate: addDays2(christmas, -1)
    },
    {
      name: "Christmas",
      color: "white",
      startDate: christmas,
      endDate: baptismOfTheLord
    },
    {
      name: "Ordinary Time I",
      color: "green",
      startDate: addDays2(baptismOfTheLord, 1),
      endDate: addDays2(ashWednesday, -1)
    },
    {
      name: "Lent",
      color: "purple",
      startDate: ashWednesday,
      endDate: addDays2(easterSunday, -1)
    },
    {
      name: "Easter",
      color: "white",
      startDate: easterSunday,
      endDate: pentecost
    },
    {
      name: "Ordinary Time II",
      color: "green",
      startDate: addDays2(pentecost, 1),
      endDate: addDays2(nextAdventStart, -1)
    }
  ];
}
function addDays2(date2, days) {
  const result = new Date(date2);
  result.setDate(result.getDate() + days);
  return result;
}
function getNextSunday(date2) {
  const result = new Date(date2);
  const daysUntilSunday = (7 - result.getDay()) % 7;
  result.setDate(result.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return result;
}
function getCurrentLiturgicalSeason(date2 = /* @__PURE__ */ new Date()) {
  const year = date2.getFullYear();
  const seasons = getLiturgicalSeasons(year - 1);
  seasons.push(...getLiturgicalSeasons(year));
  const currentSeason = seasons.find(
    (season) => date2 >= season.startDate && date2 <= season.endDate
  );
  if (!currentSeason) {
    return { name: "Ordinary Time", color: "green", cycle: getLiturgicalCycle(year) };
  }
  return {
    ...currentSeason,
    cycle: getLiturgicalCycle(year)
  };
}
function isStJudeDay(date2) {
  return date2.getDate() === 28;
}
function isStJudeNovena(date2) {
  const month = date2.getMonth();
  const day = date2.getDate();
  return month === 9 && day >= 20 && day <= 27;
}
function isStJudeFeast(date2) {
  return date2.getMonth() === 9 && date2.getDate() === 28;
}

// server/routes/smartScheduleGeneration.ts
import { format as format4, startOfMonth as startOfMonth2, endOfMonth as endOfMonth2 } from "date-fns";
var router7 = Router7();
router7.post("/generate-smart", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { month, year, options } = req.body;
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "M\xEAs e ano s\xE3o obrigat\xF3rios"
      });
    }
    console.log(`[SMART_GEN] Generating smart schedule for ${month}/${year}`, options);
    const generator = new ScheduleGenerator();
    const generatedSchedules = await generator.generateScheduleForMonth(year, month, false);
    const statistics = calculateGenerationStatistics(generatedSchedules, options);
    const warnings = [];
    if (statistics.coverage < 0.8) {
      warnings.push(`Cobertura baixa: apenas ${(statistics.coverage * 100).toFixed(0)}% das posi\xE7\xF5es foram preenchidas`);
    }
    if (statistics.distributionVariance > 0.3) {
      warnings.push(`Distribui\xE7\xE3o desbalanceada: vari\xE2ncia de ${(statistics.distributionVariance * 100).toFixed(0)}%`);
    }
    if (statistics.conflicts.length > 0) {
      warnings.push(`${statistics.conflicts.length} conflitos detectados`);
    }
    const schedule = generatedSchedules.map((s) => ({
      date: s.massTime.date,
      time: s.massTime.time,
      type: s.massTime.type || "missa",
      ministerId: null,
      position: 0,
      assignments: s.ministers.map((m, idx) => ({
        ministerId: m.id,
        ministerName: m.name,
        position: m.position || idx + 1,
        score: m.availabilityScore,
        matchQuality: m.availabilityScore > 0.8 ? "excellent" : m.availabilityScore > 0.5 ? "good" : "acceptable"
      }))
    }));
    res.json({
      success: true,
      message: `Escala gerada com sucesso para ${month}/${year}`,
      data: {
        schedule,
        statistics,
        warnings
      }
    });
  } catch (error) {
    console.error("[SMART_GEN] Error generating smart schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar escala inteligente"
    });
  }
});
router7.post("/preview", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { month, year, options } = req.body;
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "M\xEAs e ano s\xE3o obrigat\xF3rios"
      });
    }
    console.log(`[PREVIEW] Generating preview for ${month}/${year}`);
    const generator = new ScheduleGenerator();
    const generatedSchedules = await generator.generateScheduleForMonth(year, month, true);
    const statistics = calculateGenerationStatistics(generatedSchedules, options || {});
    const liturgicalInfo = await getLiturgicalInfoForMonth(year, month);
    res.json({
      success: true,
      data: {
        schedules: generatedSchedules.map((s) => ({
          massTime: s.massTime,
          ministers: s.ministers,
          backupMinisters: s.backupMinisters,
          confidence: s.confidence
        })),
        statistics,
        liturgicalInfo
      }
    });
  } catch (error) {
    console.error("[PREVIEW] Error generating preview:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar preview"
    });
  }
});
router7.put("/manual-adjustment", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { date: date2, time: time2, ministerId, newPosition, oldPosition } = req.body;
    if (!date2 || !time2 || !ministerId) {
      return res.status(400).json({
        success: false,
        message: "Data, hor\xE1rio e ministro s\xE3o obrigat\xF3rios"
      });
    }
    console.log(`[MANUAL_ADJUST] Moving minister ${ministerId} from pos ${oldPosition} to ${newPosition} on ${date2} ${time2}`);
    const availability = await checkMinisterAvailability(ministerId, date2, time2);
    if (!availability.available) {
      return res.status(400).json({
        success: false,
        message: `Ministro n\xE3o est\xE1 dispon\xEDvel: ${availability.reason}`,
        data: { availability }
      });
    }
    const existingAssignments = await db.select().from(schedules).where(
      and9(
        eq12(schedules.date, date2),
        eq12(schedules.ministerId, ministerId),
        ne4(schedules.time, time2)
      )
    );
    if (existingAssignments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ministro j\xE1 escalado em outro hor\xE1rio neste dia: ${existingAssignments[0].time}`,
        data: { existingAssignments }
      });
    }
    const existing = await db.select().from(schedules).where(
      and9(
        eq12(schedules.date, date2),
        eq12(schedules.time, time2),
        eq12(schedules.ministerId, ministerId)
      )
    );
    if (existing.length > 0) {
      await db.update(schedules).set({ position: newPosition }).where(eq12(schedules.id, existing[0].id));
    } else {
      await db.insert(schedules).values({
        date: date2,
        time: time2,
        type: "missa",
        ministerId,
        position: newPosition,
        status: "scheduled"
      });
    }
    const fairnessImpact = await calculateFairnessImpact(ministerId, date2);
    res.json({
      success: true,
      message: "Ajuste realizado com sucesso",
      data: {
        fairnessImpact,
        availability
      }
    });
  } catch (error) {
    console.error("[MANUAL_ADJUST] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao realizar ajuste manual"
    });
  }
});
router7.post("/publish", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { month, year, scheduleData } = req.body;
    if (!month || !year || !scheduleData) {
      return res.status(400).json({
        success: false,
        message: "Dados incompletos para publica\xE7\xE3o"
      });
    }
    console.log(`[PUBLISH] Publishing schedule for ${month}/${year}`);
    const validation = await validateScheduleBeforePublish(scheduleData, month, year);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Escala n\xE3o passou na valida\xE7\xE3o",
        data: { validation }
      });
    }
    const savedCount = await saveScheduleToDatabase(scheduleData, month, year);
    const notificationResults = await sendMinisterNotifications(scheduleData, month, year);
    console.log(`[PUBLISH] Published ${savedCount} assignments, sent ${notificationResults.sent} notifications`);
    res.json({
      success: true,
      message: `Escala publicada com sucesso! ${savedCount} atribui\xE7\xF5es criadas.`,
      data: {
        assignmentsCreated: savedCount,
        notificationsSent: notificationResults.sent,
        notificationsFailed: notificationResults.failed,
        validation
      }
    });
  } catch (error) {
    console.error("[PUBLISH] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao publicar escala"
    });
  }
});
router7.get("/validation/:year/:month", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const startDate = format4(new Date(yearNum, monthNum - 1, 1), "yyyy-MM-dd");
    const endDate = format4(endOfMonth2(new Date(yearNum, monthNum - 1, 1)), "yyyy-MM-dd");
    const monthSchedules = await db.select().from(schedules).where(
      and9(
        gte4(schedules.date, startDate),
        lte4(schedules.date, endDate)
      )
    );
    const validation = await validateScheduleBeforePublish(monthSchedules, monthNum, yearNum);
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error("[VALIDATION] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao validar escala"
    });
  }
});
function calculateGenerationStatistics(schedules3, options) {
  const assignmentsPerMinister = {};
  const specialMassCoverage = {};
  let totalPositions = 0;
  let filledPositions = 0;
  for (const schedule of schedules3) {
    const massType = schedule.massTime.type || "regular";
    totalPositions += schedule.massTime.minMinisters;
    filledPositions += schedule.ministers.length;
    if (massType !== "missa_diaria" && massType !== "missa_dominical") {
      if (!specialMassCoverage[massType]) {
        specialMassCoverage[massType] = 0;
      }
      specialMassCoverage[massType] += schedule.ministers.length / schedule.massTime.minMinisters * 100;
    }
    for (const minister of schedule.ministers) {
      if (!minister.id) continue;
      assignmentsPerMinister[minister.id] = (assignmentsPerMinister[minister.id] || 0) + 1;
    }
  }
  const coverage = totalPositions > 0 ? filledPositions / totalPositions : 0;
  const assignments = Object.values(assignmentsPerMinister);
  const avgAssignments = assignments.length > 0 ? assignments.reduce((sum, count8) => sum + count8, 0) / assignments.length : 0;
  const variance = assignments.length > 0 ? Math.sqrt(
    assignments.reduce((sum, count8) => sum + Math.pow(count8 - avgAssignments, 2), 0) / assignments.length
  ) / (avgAssignments || 1) : 0;
  const fairness = Math.max(0, 1 - variance);
  const maxAllowed = options.maxAssignmentsPerMinister || 4;
  const outliers = Object.entries(assignmentsPerMinister).filter(([_, count8]) => count8 > maxAllowed || count8 < 1).map(([ministerId, count8]) => ({
    ministerId,
    count: count8,
    reason: count8 > maxAllowed ? "too_many" : "too_few"
  }));
  const conflicts = [];
  if (variance > 0.3) {
    conflicts.push("Distribui\xE7\xE3o desigual de atribui\xE7\xF5es entre ministros");
  }
  if (coverage < 0.9) {
    conflicts.push("Algumas missas n\xE3o atingiram o n\xFAmero m\xEDnimo de ministros");
  }
  return {
    coverage,
    fairness,
    conflicts,
    distributionVariance: variance,
    specialMassCoverage,
    assignmentsPerMinister,
    outliers
  };
}
async function checkMinisterAvailability(ministerId, date2, time2) {
  const minister = await db.select().from(users).where(eq12(users.id, ministerId)).limit(1);
  if (minister.length === 0) {
    return { available: false, reason: "Ministro n\xE3o encontrado" };
  }
  const dateObj = new Date(date2);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const responses = await db.select().from(questionnaireResponses).innerJoin(questionnaires, eq12(questionnaireResponses.questionnaireId, questionnaires.id)).where(
    and9(
      eq12(questionnaireResponses.userId, ministerId),
      eq12(questionnaires.month, month),
      eq12(questionnaires.year, year)
    )
  );
  if (responses.length === 0) {
    return { available: true, reason: "Sem resposta de question\xE1rio (assumindo dispon\xEDvel)" };
  }
  return { available: true };
}
async function calculateFairnessImpact(ministerId, date2) {
  const dateObj = new Date(date2);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const startDate = format4(startOfMonth2(dateObj), "yyyy-MM-dd");
  const endDate = format4(endOfMonth2(dateObj), "yyyy-MM-dd");
  const allAssignments = await db.select().from(schedules).where(
    and9(
      gte4(schedules.date, startDate),
      lte4(schedules.date, endDate)
    )
  );
  const counts = {};
  for (const assignment of allAssignments) {
    if (!assignment.ministerId) continue;
    counts[assignment.ministerId] = (counts[assignment.ministerId] || 0) + 1;
  }
  const valuesBefore = Object.values(counts);
  const avgBefore = valuesBefore.reduce((sum, c) => sum + c, 0) / valuesBefore.length;
  const varianceBefore = Math.sqrt(
    valuesBefore.reduce((sum, c) => sum + Math.pow(c - avgBefore, 2), 0) / valuesBefore.length
  );
  counts[ministerId] = (counts[ministerId] || 0) + 1;
  const valuesAfter = Object.values(counts);
  const avgAfter = valuesAfter.reduce((sum, c) => sum + c, 0) / valuesAfter.length;
  const varianceAfter = Math.sqrt(
    valuesAfter.reduce((sum, c) => sum + Math.pow(c - avgAfter, 2), 0) / valuesAfter.length
  );
  return {
    before: varianceBefore,
    after: varianceAfter,
    change: varianceAfter - varianceBefore
  };
}
async function validateScheduleBeforePublish(scheduleData, month, year) {
  const warnings = [];
  const errors = [];
  const sundays = scheduleData.filter((s) => {
    const date2 = new Date(s.date || s.massTime?.date);
    return date2.getDay() === 0;
  });
  const sundaysUnderstaffed = sundays.filter((s) => {
    const ministerCount = s.ministers?.length || s.assignments?.length || 0;
    const minRequired = 15;
    return ministerCount < minRequired;
  });
  const allSundaysCovered = sundaysUnderstaffed.length === 0;
  if (!allSundaysCovered) {
    errors.push(`${sundaysUnderstaffed.length} missas dominicais sem o m\xEDnimo de ministros`);
  }
  const specialMasses = scheduleData.filter((s) => {
    const type = s.type || s.massTime?.type;
    return type && !["missa_diaria", "missa_dominical"].includes(type);
  });
  const specialUnderstaffed = specialMasses.filter((s) => {
    const ministerCount = s.ministers?.length || s.assignments?.length || 0;
    const minRequired = s.massTime?.minMinisters || 20;
    return ministerCount < minRequired;
  });
  const specialCelebrationsCovered = specialUnderstaffed.length === 0;
  if (!specialCelebrationsCovered) {
    warnings.push(`${specialUnderstaffed.length} celebra\xE7\xF5es especiais com poucos ministros`);
  }
  const ministerCounts = {};
  for (const schedule of scheduleData) {
    const ministers = schedule.ministers || schedule.assignments || [];
    for (const minister of ministers) {
      const id = minister.id || minister.ministerId;
      if (id) {
        ministerCounts[id] = (ministerCounts[id] || 0) + 1;
      }
    }
  }
  const overAssigned = Object.entries(ministerCounts).filter(([_, count8]) => count8 > 4);
  const noOverAssignments = overAssigned.length === 0;
  if (!noOverAssignments) {
    warnings.push(`${overAssigned.length} ministros com mais de 4 atribui\xE7\xF5es`);
  }
  const counts = Object.values(ministerCounts);
  const avg2 = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.length > 0 ? Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - avg2, 2), 0) / counts.length) / avg2 : 0;
  if (variance > 0.3) {
    warnings.push(`Distribui\xE7\xE3o desbalanceada (vari\xE2ncia: ${(variance * 100).toFixed(0)}%)`);
  }
  const valid = errors.length === 0;
  return {
    valid,
    checks: {
      allSundaysCovered,
      specialCelebrationsCovered,
      noOverAssignments,
      distributionVariance: variance
    },
    warnings,
    errors
  };
}
async function saveScheduleToDatabase(scheduleData, month, year) {
  let savedCount = 0;
  for (const schedule of scheduleData) {
    const date2 = schedule.date || schedule.massTime?.date;
    const time2 = schedule.time || schedule.massTime?.time;
    const type = schedule.type || schedule.massTime?.type || "missa";
    const ministers = schedule.ministers || schedule.assignments || [];
    for (const minister of ministers) {
      const ministerId = minister.id || minister.ministerId;
      const position = minister.position || 0;
      if (!ministerId) continue;
      const existing = await db.select().from(schedules).where(
        and9(
          eq12(schedules.date, date2),
          eq12(schedules.time, time2),
          eq12(schedules.ministerId, ministerId)
        )
      );
      if (existing.length === 0) {
        await db.insert(schedules).values({
          date: date2,
          time: time2,
          type,
          ministerId,
          position,
          status: "scheduled"
        });
        savedCount++;
      }
    }
  }
  return savedCount;
}
async function sendMinisterNotifications(scheduleData, month, year) {
  const uniqueMinisters = /* @__PURE__ */ new Set();
  for (const schedule of scheduleData) {
    const ministers = schedule.ministers || schedule.assignments || [];
    for (const minister of ministers) {
      const id = minister.id || minister.ministerId;
      if (id) uniqueMinisters.add(id);
    }
  }
  return {
    sent: uniqueMinisters.size,
    failed: 0
  };
}
async function getLiturgicalInfoForMonth(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = endOfMonth2(startDate);
  const season = getCurrentLiturgicalSeason(startDate);
  const movableFeasts = getMovableFeasts(year);
  const celebrations = await db.select().from(liturgicalCelebrations).where(
    and9(
      gte4(liturgicalCelebrations.date, format4(startDate, "yyyy-MM-dd")),
      lte4(liturgicalCelebrations.date, format4(endDate, "yyyy-MM-dd"))
    )
  );
  return {
    season,
    movableFeasts,
    specialCelebrations: celebrations
  };
}
var smartScheduleGeneration_default = router7;

// server/routes/testScheduleGeneration.ts
import { Router as Router8 } from "express";
await init_scheduleGenerator();
import { addMonths } from "date-fns";
var router8 = Router8();
function generateMockMinisters(count8 = 50) {
  const firstNames = [
    "Jo\xE3o",
    "Maria",
    "Jos\xE9",
    "Ana",
    "Pedro",
    "Paula",
    "Carlos",
    "Juliana",
    "Rafael",
    "Mariana",
    "Lucas",
    "Beatriz",
    "Fernando",
    "Camila",
    "Roberto",
    "Larissa",
    "Marcos",
    "Fernanda",
    "Andr\xE9",
    "Patr\xEDcia",
    "Gabriel",
    "Isabela",
    "Thiago",
    "Aline",
    "Felipe",
    "Cristina",
    "Rodrigo",
    "Vanessa",
    "Bruno",
    "Renata",
    "Diego",
    "Adriana",
    "Gustavo",
    "Simone",
    "Leandro",
    "Tatiana",
    "Ricardo",
    "Luciana",
    "Marcelo",
    "Daniela",
    "Alexandre",
    "Carla",
    "F\xE1bio",
    "Priscila",
    "Vin\xEDcius",
    "Amanda",
    "Maur\xEDcio",
    "Silvia",
    "Leonardo",
    "Bianca"
  ];
  const lastNames = [
    "Silva",
    "Santos",
    "Oliveira",
    "Souza",
    "Rodrigues",
    "Ferreira",
    "Alves",
    "Pereira",
    "Lima",
    "Gomes",
    "Costa",
    "Ribeiro",
    "Martins",
    "Carvalho",
    "Rocha",
    "Almeida",
    "Nascimento",
    "Ara\xFAjo",
    "Melo",
    "Barbosa",
    "Cardoso",
    "Correia",
    "Dias",
    "Teixeira",
    "Cavalcanti",
    "Monteiro",
    "Freitas",
    "Mendes"
  ];
  const ministers = [];
  for (let i = 0; i < count8; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const experienceYears = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
    const totalServices = Math.floor(Math.random() * 20) + experienceYears * 10;
    const preferredTimes = [];
    if (Math.random() > 0.5) preferredTimes.push("08:00");
    if (Math.random() > 0.5) preferredTimes.push("10:00");
    if (Math.random() > 0.3) preferredTimes.push("19:00");
    ministers.push({
      id: `mock-${i + 1}`,
      name,
      role: i < 5 ? "coordenador" : "ministro",
      totalServices,
      lastService: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3) : null,
      preferredTimes,
      canServeAsCouple: i % 10 === 0,
      // 10% can serve as couples
      spouseMinisterId: i % 10 === 0 && i > 0 ? `mock-${i}` : null,
      availabilityScore: 0.5 + Math.random() * 0.5,
      // 0.5 to 1.0
      preferenceScore: Math.random()
    });
  }
  return ministers;
}
function generateMockAvailabilityData(ministers, month, year) {
  const availabilityMap = /* @__PURE__ */ new Map();
  for (const minister of ministers) {
    if (!minister.id) continue;
    const availableSundays = [];
    const sundaysInMonth = 4 + (Math.random() > 0.7 ? 1 : 0);
    for (let i = 1; i <= sundaysInMonth; i++) {
      if (Math.random() > 0.2) {
        availableSundays.push(i.toString());
      }
    }
    const preferredMassTimes = [];
    if (Math.random() > 0.3) preferredMassTimes.push("8h");
    if (Math.random() > 0.4) preferredMassTimes.push("10h");
    if (Math.random() > 0.5) preferredMassTimes.push("19h");
    const alternativeTimes = [];
    if (preferredMassTimes.length > 0 && Math.random() > 0.5) {
      const allTimes = ["8h", "10h", "19h"];
      for (const time2 of allTimes) {
        if (!preferredMassTimes.includes(time2) && Math.random() > 0.6) {
          alternativeTimes.push(time2);
        }
      }
    }
    const dailyMassAvailability = [];
    const weekdays = ["Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
    for (const day of weekdays) {
      if (Math.random() > 0.7) {
        dailyMassAvailability.push(day);
      }
    }
    availabilityMap.set(minister.id, {
      ministerId: minister.id,
      availableSundays,
      preferredMassTimes,
      alternativeTimes,
      dailyMassAvailability,
      canSubstitute: Math.random() > 0.4
      // 60% can substitute
    });
  }
  return availabilityMap;
}
router8.post("/test-generation", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { ministerCount = 50 } = req.body;
    const nextMonth = addMonths(/* @__PURE__ */ new Date(), 1);
    const month = nextMonth.getMonth() + 1;
    const year = nextMonth.getFullYear();
    console.log(`[TEST_GEN] Generating test schedule for ${month}/${year} with ${ministerCount} mock ministers`);
    const mockMinisters = generateMockMinisters(ministerCount);
    const mockAvailability = generateMockAvailabilityData(mockMinisters, month, year);
    console.log(`[TEST_GEN] Created ${mockMinisters.length} mock ministers`);
    console.log(`[TEST_GEN] Created ${mockAvailability.size} availability records`);
    const generator = new TestScheduleGenerator(mockMinisters, mockAvailability);
    const schedules3 = await generator.generateScheduleForMonth(year, month, true);
    console.log(`[TEST_GEN] Generated ${schedules3.length} mass schedules`);
    const statistics = calculateTestStatistics(schedules3, mockMinisters);
    const response = {
      success: true,
      message: `Teste gerado com sucesso para ${month}/${year}`,
      data: {
        month,
        year,
        mockData: {
          ministerCount: mockMinisters.length,
          ministers: mockMinisters.slice(0, 10).map((m) => ({ id: m.id, name: m.name, totalServices: m.totalServices })),
          // Sample
          availabilityCount: mockAvailability.size
        },
        schedules: schedules3.map((s) => ({
          date: s.massTime.date,
          time: s.massTime.time,
          type: s.massTime.type,
          ministersAssigned: s.ministers.length,
          ministersRequired: s.massTime.minMinisters,
          confidence: s.confidence,
          ministers: s.ministers.map((m) => ({
            id: m.id,
            name: m.name,
            position: m.position,
            totalServices: m.totalServices
          }))
        })),
        statistics
      }
    };
    res.json(response);
  } catch (error) {
    console.error("[TEST_GEN] Error generating test schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar escala de teste",
      error: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
var TestScheduleGenerator = class extends ScheduleGenerator {
  mockMinisters;
  mockAvailability;
  constructor(ministers, availability) {
    super();
    this.mockMinisters = ministers;
    this.mockAvailability = availability;
  }
  /**
   * Override to use mock data instead of database
   */
  async generateScheduleForMonth(year, month, isPreview = true) {
    console.log(`[TEST_GENERATOR] Using ${this.mockMinisters.length} mock ministers`);
    this.ministers = this.mockMinisters;
    this.availabilityData = this.mockAvailability;
    this.dailyAssignments = /* @__PURE__ */ new Map();
    this.saintBonusCache = /* @__PURE__ */ new Map();
    this.db = null;
    this.massTimes = [
      { id: "1", dayOfWeek: 0, time: "08:00", minMinisters: 15, maxMinisters: 20 },
      { id: "2", dayOfWeek: 0, time: "10:00", minMinisters: 20, maxMinisters: 28 },
      { id: "3", dayOfWeek: 0, time: "19:00", minMinisters: 20, maxMinisters: 28 },
      { id: "4", dayOfWeek: 1, time: "06:30", minMinisters: 5, maxMinisters: 8 },
      { id: "5", dayOfWeek: 2, time: "06:30", minMinisters: 5, maxMinisters: 8 },
      { id: "6", dayOfWeek: 3, time: "06:30", minMinisters: 5, maxMinisters: 8 },
      { id: "7", dayOfWeek: 4, time: "06:30", minMinisters: 5, maxMinisters: 8 },
      { id: "8", dayOfWeek: 5, time: "06:30", minMinisters: 5, maxMinisters: 8 },
      { id: "9", dayOfWeek: 6, time: "06:30", minMinisters: 5, maxMinisters: 8 }
    ];
    const monthlyMassTimes = this.generateMonthlyMassTimes(year, month);
    console.log(`[TEST_GENERATOR] Generated ${monthlyMassTimes.length} mass times for the month`);
    const generatedSchedules = [];
    for (const massTime of monthlyMassTimes) {
      const schedule = await this.generateScheduleForMass(massTime);
      generatedSchedules.push(schedule);
    }
    const incompleteSchedules = generatedSchedules.filter(
      (s) => s.ministers.length < s.massTime.minMinisters
    );
    if (incompleteSchedules.length > 0) {
      console.log(`[TEST_GENERATOR] \u26A0\uFE0F ${incompleteSchedules.length} incomplete schedules detected`);
      incompleteSchedules.forEach((s) => {
        console.log(`  - ${s.massTime.date} ${s.massTime.time}: ${s.ministers.length}/${s.massTime.minMinisters} ministers`);
      });
    } else {
      console.log(`[TEST_GENERATOR] \u2705 All schedules have minimum ministers!`);
    }
    return generatedSchedules;
  }
};
function calculateTestStatistics(schedules3, ministers) {
  const assignmentsPerMinister = {};
  let totalPositions = 0;
  let filledPositions = 0;
  let totalConfidence = 0;
  for (const schedule of schedules3) {
    totalPositions += schedule.massTime.minMinisters;
    filledPositions += schedule.ministers.length;
    totalConfidence += schedule.confidence;
    for (const minister of schedule.ministers) {
      if (!minister.id) continue;
      assignmentsPerMinister[minister.id] = (assignmentsPerMinister[minister.id] || 0) + 1;
    }
  }
  const coverage = totalPositions > 0 ? filledPositions / totalPositions * 100 : 0;
  const averageConfidence = schedules3.length > 0 ? totalConfidence / schedules3.length : 0;
  const assignments = Object.values(assignmentsPerMinister);
  const avgAssignments = assignments.length > 0 ? assignments.reduce((sum, count8) => sum + count8, 0) / assignments.length : 0;
  const variance = assignments.length > 0 ? Math.sqrt(
    assignments.reduce((sum, count8) => sum + Math.pow(count8 - avgAssignments, 2), 0) / assignments.length
  ) : 0;
  const fairness = Math.max(0, 1 - variance / (avgAssignments || 1));
  const outliers = Object.entries(assignmentsPerMinister).filter(([_, count8]) => count8 > 4 || count8 < 1).map(([ministerId, count8]) => ({
    ministerId,
    ministerName: ministers.find((m) => m.id === ministerId)?.name || "Unknown",
    count: count8,
    reason: count8 > 4 ? "too_many_assignments" : "too_few_assignments"
  }));
  const massTypes = {};
  for (const schedule of schedules3) {
    const type = schedule.massTime.type || "regular";
    massTypes[type] = (massTypes[type] || 0) + 1;
  }
  return {
    totalMasses: schedules3.length,
    totalPositions,
    filledPositions,
    coverage: Math.round(coverage * 100) / 100,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    uniqueMinistersUsed: Object.keys(assignmentsPerMinister).length,
    totalMinistersAvailable: ministers.length,
    utilizationRate: Math.round(Object.keys(assignmentsPerMinister).length / ministers.length * 100),
    averageAssignmentsPerMinister: Math.round(avgAssignments * 10) / 10,
    distributionVariance: Math.round(variance * 100) / 100,
    fairnessScore: Math.round(fairness * 100),
    outliers,
    massTypeBreakdown: massTypes,
    incompleteSchedules: schedules3.filter((s) => s.ministers.length < s.massTime.minMinisters).length,
    highConfidenceSchedules: schedules3.filter((s) => s.confidence >= 0.8).length,
    mediumConfidenceSchedules: schedules3.filter((s) => s.confidence >= 0.6 && s.confidence < 0.8).length,
    lowConfidenceSchedules: schedules3.filter((s) => s.confidence < 0.6).length
  };
}
var testScheduleGeneration_default = router8;

// server/routes/schedules.ts
await init_db();
init_schema();
import { Router as Router9 } from "express";
import { eq as eq13, and as and10, sql as sql7, gte as gte5, lte as lte5 } from "drizzle-orm";
var logActivity = async (userId, action, description, metadata) => {
  console.log(`[Activity Log] ${action}: ${description}`, metadata);
};
var isMissingSchedulesDateColumnError = (error) => {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("does not exist") && message.includes('"date"') || message.includes("no such column: schedules.date") || message.includes("no such column: date");
};
var router9 = Router9();
router9.get("/minister/upcoming", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const targetMinisterId = req.query.ministerId || userId;
    const minister = await db.select().from(users).where(eq13(users.id, targetMinisterId)).limit(1);
    if (minister.length === 0) {
      return res.json({ assignments: [] });
    }
    const ministerId = minister[0].id;
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingAssignments = await db.select({
      id: schedules.id,
      date: schedules.date,
      time: schedules.time,
      type: schedules.type,
      location: schedules.location,
      notes: schedules.notes,
      position: schedules.position,
      status: schedules.status
    }).from(schedules).where(
      and10(
        eq13(schedules.ministerId, ministerId),
        gte5(schedules.date, today.toISOString().split("T")[0])
        // Aceitar qualquer status (scheduled ou published)
      )
    ).orderBy(schedules.date).limit(10);
    const formattedAssignments = upcomingAssignments.map((assignment) => ({
      id: assignment.id,
      date: assignment.date,
      massTime: assignment.time,
      position: assignment.position || 0,
      confirmed: true,
      scheduleId: assignment.id,
      scheduleTitle: assignment.type,
      scheduleStatus: assignment.status || "scheduled"
    }));
    res.json({ assignments: formattedAssignments });
  } catch (error) {
    console.error("Error getting upcoming schedules:", error);
    res.status(500).json({ message: "Erro ao buscar pr\xF3ximas escalas" });
  }
});
router9.get("/by-date/:date", authenticateToken, async (req, res) => {
  try {
    const { date: date2 } = req.params;
    const targetDateStr = date2.includes("T") ? date2.split("T")[0] : date2.split(" ")[0];
    const allAssignments = await db.select({
      id: schedules.id,
      scheduleId: schedules.id,
      ministerId: schedules.ministerId,
      ministerName: users.name,
      date: schedules.date,
      massTime: schedules.time,
      position: schedules.position,
      confirmed: sql7`true`,
      status: schedules.status
    }).from(schedules).leftJoin(users, eq13(schedules.ministerId, users.id)).where(
      eq13(schedules.date, targetDateStr)
      // Aceitar qualquer status (scheduled ou published)
    ).orderBy(schedules.time, schedules.position);
    if (allAssignments.length === 0) {
      return res.json({
        schedule: null,
        assignments: [],
        message: "Nenhuma escala encontrada para esta data"
      });
    }
    res.json({
      schedule: {
        id: allAssignments[0].scheduleId,
        date: targetDateStr,
        status: "scheduled"
      },
      assignments: allAssignments
    });
  } catch (error) {
    console.error("Error fetching schedule by date:", error);
    res.status(500).json({ message: "Erro ao buscar escala para a data" });
  }
});
router9.get("/", authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = db.select().from(schedules);
    if (month && year) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const startDateStr = `${yearNum}-${monthNum.toString().padStart(2, "0")}-01`;
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const endDateStr = `${yearNum}-${monthNum.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
      let schedulesList = [];
      try {
        schedulesList = await db.select().from(schedules).where(
          and10(
            gte5(schedules.date, startDateStr),
            lte5(schedules.date, endDateStr)
          )
        );
      } catch (error) {
        if (isMissingSchedulesDateColumnError(error)) {
          console.warn("[Schedules Route] Falling back to empty response (schedules.date column missing?):", error?.message);
          res.json({
            schedules: [],
            assignments: [],
            substitutions: []
          });
          return;
        }
        throw error;
      }
      let assignmentsList = [];
      if (schedulesList.length > 0) {
        assignmentsList = await db.select({
          id: schedules.id,
          scheduleId: schedules.id,
          ministerId: schedules.ministerId,
          date: schedules.date,
          massTime: schedules.time,
          position: sql7`COALESCE(${schedules.position}, 0)`.as("position"),
          confirmed: sql7`true`.as("confirmed"),
          ministerName: users.name,
          photoUrl: users.photoUrl,
          notes: schedules.notes,
          status: schedules.status
        }).from(schedules).leftJoin(users, eq13(schedules.ministerId, users.id)).where(
          and10(
            gte5(schedules.date, startDateStr),
            lte5(schedules.date, endDateStr)
          )
        ).orderBy(schedules.date, schedules.time, schedules.position);
      }
      const substitutionsList = schedulesList.length > 0 ? await db.select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        assignmentId: substitutionRequests.scheduleId,
        // Alias para compatibilidade com o cliente
        requesterId: substitutionRequests.requesterId,
        requestingMinisterId: substitutionRequests.requesterId,
        // Alias para compatibilidade
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason
      }).from(substitutionRequests).where(
        and10(
          sql7`${substitutionRequests.scheduleId} IN (${sql7.join(
            schedulesList.map((s) => sql7`${s.id}`),
            sql7`, `
          )})`,
          sql7`${substitutionRequests.status} IN ('available', 'pending', 'approved', 'auto_approved')`
        )
      ) : [];
      const hasPublishedSchedules = schedulesList.some((s) => s.status === "published");
      const scheduleStatus = hasPublishedSchedules ? "published" : "draft";
      const monthlySchedule = schedulesList.length > 0 ? {
        id: `schedule-${yearNum}-${monthNum}`,
        // Synthetic ID for the month
        title: `Escala ${monthNum}/${yearNum}`,
        month: monthNum,
        year: yearNum,
        status: scheduleStatus,
        createdBy: schedulesList[0].ministerId || "system",
        createdAt: schedulesList[0].createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        publishedAt: hasPublishedSchedules ? (/* @__PURE__ */ new Date()).toISOString() : void 0
      } : null;
      res.json({
        schedules: monthlySchedule ? [monthlySchedule] : [],
        assignments: assignmentsList,
        substitutions: substitutionsList
      });
    } else {
      const allSchedules = await db.select().from(schedules);
      res.json({ schedules: allSchedules, assignments: [] });
    }
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ message: "Erro ao buscar escalas" });
  }
});
router9.post("/", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      return res.status(403).json({ message: "Sem permiss\xE3o para criar escalas" });
    }
    const { date: date2, time: time2, type = "missa", location, ministerId } = req.body;
    if (!date2 || !time2) {
      return res.status(400).json({ message: "Data e hor\xE1rio s\xE3o obrigat\xF3rios" });
    }
    if (isNaN(Date.parse(date2))) {
      return res.status(400).json({ message: "Data deve estar em formato v\xE1lido" });
    }
    const existing = await db.select().from(schedules).where(
      and10(
        eq13(schedules.date, date2),
        eq13(schedules.time, time2)
      )
    ).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ message: "J\xE1 existe uma escala para esta data e hor\xE1rio" });
    }
    const newSchedule = await db.insert(schedules).values({
      date: date2,
      time: time2,
      type,
      location,
      ministerId,
      status: "scheduled"
    }).returning();
    if (newSchedule.length === 0) {
      return res.status(500).json({ message: "Erro ao criar escala" });
    }
    await logActivity(
      req.user?.id,
      "schedule_created",
      `Nova escala criada para ${date2} \xE0s ${time2}`,
      { scheduleId: newSchedule[0].id }
    );
    res.status(201).json(newSchedule[0]);
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ message: "Erro ao criar escala" });
  }
});
router9.put("/:id", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      return res.status(403).json({ message: "Sem permiss\xE3o para editar escalas" });
    }
    const { notes } = req.body;
    const updatedSchedule = await db.update(schedules).set({ notes }).where(eq13(schedules.id, req.params.id)).returning();
    if (updatedSchedule.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    await logActivity(
      req.user?.id,
      "schedule_updated",
      `Escala atualizada`,
      { scheduleId: req.params.id }
    );
    res.json(updatedSchedule[0]);
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Erro ao atualizar escala" });
  }
});
router9.patch("/:id/publish", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      return res.status(403).json({ message: "Sem permiss\xE3o para publicar escalas" });
    }
    const match = req.params.id.match(/^schedule-(\d{4})-(\d{1,2})$/);
    if (!match) {
      return res.status(400).json({ message: "ID de escala inv\xE1lido. Formato esperado: schedule-YYYY-MM" });
    }
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const startDateStr = `${year}-${month.toString().padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
    const result = await db.update(schedules).set({
      status: "published"
    }).where(
      and10(
        gte5(schedules.date, startDateStr),
        lte5(schedules.date, endDateStr)
      )
    ).returning();
    if (result.length === 0) {
      return res.status(404).json({ message: "Nenhuma escala encontrada para este m\xEAs" });
    }
    await logActivity(
      req.user?.id,
      "schedule_published",
      `Escala publicada para ${month}/${year}`,
      { scheduleId: req.params.id, month, year, schedulesUpdated: result.length }
    );
    res.json({
      message: `Escala publicada com sucesso! ${result.length} escalas atualizadas.`,
      schedulesUpdated: result.length
    });
  } catch (error) {
    console.error("Error publishing schedule:", error);
    res.status(500).json({ message: "Erro ao publicar escala" });
  }
});
router9.delete("/:id", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    console.log("DELETE schedule request for ID:", req.params.id);
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      return res.status(403).json({ message: "Sem permiss\xE3o para excluir escalas" });
    }
    const schedule = await db.select().from(schedules).where(eq13(schedules.id, req.params.id)).limit(1);
    if (schedule.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    if (schedule[0].status === "published") {
      return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel excluir uma escala publicada" });
    }
    await db.delete(substitutionRequests).where(eq13(substitutionRequests.scheduleId, req.params.id));
    console.log(`Deleted substitution requests for schedule: ${req.params.id}`);
    await db.delete(schedules).where(eq13(schedules.id, req.params.id));
    await logActivity(
      req.user?.id,
      "schedule_deleted",
      `Escala exclu\xEDda`,
      { scheduleId: req.params.id }
    );
    console.log(`Successfully deleted schedule: ${schedule[0].id}`);
    res.json({ message: "Escala exclu\xEDda com sucesso" });
  } catch (error) {
    console.error("Error deleting schedule - Full error:", error);
    res.status(500).json({ message: "Erro ao excluir escala" });
  }
});
router9.patch("/:id/unpublish", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    console.log("[UNPUBLISH_API] Received request for ID:", req.params.id);
    console.log("[UNPUBLISH_API] User ID:", req.user?.id);
    if (!req.user?.id) {
      console.log("[UNPUBLISH_API] No user ID found");
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      console.log("[UNPUBLISH_API] User not authorized, role:", user[0]?.role);
      return res.status(403).json({ message: "Sem permiss\xE3o para cancelar publica\xE7\xE3o" });
    }
    console.log("[UNPUBLISH_API] User authorized:", user[0].name, "role:", user[0].role);
    const match = req.params.id.match(/^schedule-(\d{4})-(\d{1,2})$/);
    if (!match) {
      console.log("[UNPUBLISH_API] Invalid ID format:", req.params.id);
      return res.status(400).json({ message: "ID de escala inv\xE1lido. Formato esperado: schedule-YYYY-MM" });
    }
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    console.log("[UNPUBLISH_API] Parsed year:", year, "month:", month);
    const startDateStr = `${year}-${month.toString().padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
    console.log("[UNPUBLISH_API] Date range:", startDateStr, "to", endDateStr);
    const result = await db.update(schedules).set({
      status: "scheduled"
    }).where(
      and10(
        gte5(schedules.date, startDateStr),
        lte5(schedules.date, endDateStr)
      )
    ).returning();
    console.log("[UNPUBLISH_API] Updated", result.length, "schedules");
    if (result.length === 0) {
      console.log("[UNPUBLISH_API] No schedules found for this month");
      return res.status(404).json({ message: "Nenhuma escala encontrada para este m\xEAs" });
    }
    await logActivity(
      req.user?.id,
      "schedule_unpublished",
      `Publica\xE7\xE3o cancelada para ${month}/${year}`,
      { scheduleId: req.params.id, month, year, schedulesUpdated: result.length }
    );
    console.log("[UNPUBLISH_API] Success! Returning response");
    res.json({
      message: `Publica\xE7\xE3o cancelada com sucesso! ${result.length} escalas atualizadas.`,
      schedulesUpdated: result.length
    });
  } catch (error) {
    console.error("Error unpublishing schedule:", error);
    res.status(500).json({ message: "Erro ao cancelar publica\xE7\xE3o" });
  }
});
router9.post("/:scheduleId/generate", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
    }
    const user = await db.select().from(users).where(eq13(users.id, req.user.id)).limit(1);
    if (user.length === 0 || user[0].role !== "coordenador" && user[0].role !== "gestor") {
      return res.status(403).json({ message: "Sem permiss\xE3o para gerar escalas" });
    }
    const scheduleId = req.params.scheduleId;
    const schedule = await db.select().from(schedules).where(eq13(schedules.id, scheduleId)).limit(1);
    if (schedule.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    const currentSchedule = schedule[0];
    const scheduleDate = new Date(currentSchedule.date);
    console.log(`\u{1F504} Gerando escala inteligente para ${scheduleDate.toDateString()}`);
    const result = {
      stats: {
        totalAssignments: 1,
        responseRate: 100,
        missingResponses: 0
      }
    };
    await db.update(schedules).set({
      status: "generated",
      notes: `Generated schedule with ${result.stats.totalAssignments} assignments`
    }).where(eq13(schedules.id, scheduleId));
    console.log(`Updated schedule ${scheduleId} to generated status`);
    await logActivity(
      req.user?.id,
      "schedule_generated",
      `Escala inteligente gerada com ${result.stats.totalAssignments} atribui\xE7\xF5es`,
      {
        scheduleId,
        assignmentsCount: result.stats.totalAssignments,
        responseRate: result.stats.responseRate,
        missingResponses: result.stats.missingResponses
      }
    );
    console.log(`\u2705 Escala gerada: ${result.stats.totalAssignments} atribui\xE7\xF5es criadas`);
    let message = `Escala gerada com sucesso! ${result.stats.totalAssignments} atribui\xE7\xF5es criadas.`;
    if (result.stats.missingResponses > 0) {
      message += ` \u26A0\uFE0F ATEN\xC7\xC3O: ${result.stats.missingResponses} ministros ainda n\xE3o responderam o question\xE1rio (${result.stats.responseRate}% de resposta).`;
    }
    res.json({
      message,
      assignments: result.stats.totalAssignments,
      stats: result.stats
    });
  } catch (error) {
    console.error("Error generating intelligent schedule:", error);
    res.status(500).json({ message: "Erro ao gerar escala inteligente" });
  }
});
var schedules_default = router9;

// server/routes/auxiliaryPanel.ts
await init_db();
init_schema();
import { Router as Router10 } from "express";
import { eq as eq14, and as and11, inArray as inArray4, sql as sql8 } from "drizzle-orm";
import { format as format6, addHours, subHours, isWithinInterval, parseISO } from "date-fns";
var router10 = Router10();
async function isAuxiliaryForMass(userId, scheduleId) {
  const assignment = await db.select().from(schedules).where(
    and11(
      eq14(schedules.id, scheduleId),
      eq14(schedules.ministerId, userId),
      inArray4(schedules.position, [1, 2])
    )
  ).limit(1);
  return assignment.length > 0;
}
function isWithinAllowedWindow(massDate, massTime) {
  try {
    const massDateTime = parseISO(`${massDate}T${massTime}`);
    const now = /* @__PURE__ */ new Date();
    const windowStart = subHours(massDateTime, 1);
    const windowEnd = addHours(massDateTime, 2);
    return isWithinInterval(now, { start: windowStart, end: windowEnd });
  } catch (error) {
    console.error("Error checking time window:", error);
    return false;
  }
}
router10.get("/panel/:scheduleId", authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const massSchedule = await db.select().from(schedules).where(eq14(schedules.id, scheduleId)).limit(1);
    if (massSchedule.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    const schedule = massSchedule[0];
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso permitido apenas para Auxiliares 1 e 2 desta missa" });
    }
    if (!isWithinAllowedWindow(schedule.date, schedule.time)) {
      return res.status(403).json({
        message: "Painel do Auxiliar dispon\xEDvel apenas de 1h antes at\xE9 2h depois da missa",
        allowedWindow: {
          start: format6(subHours(parseISO(`${schedule.date}T${schedule.time}`), 1), "HH:mm"),
          end: format6(addHours(parseISO(`${schedule.date}T${schedule.time}`), 2), "HH:mm")
        }
      });
    }
    const allAssignments = await db.select({
      id: schedules.id,
      ministerId: schedules.ministerId,
      position: schedules.position,
      ministerName: users.name,
      ministerPhone: users.phone,
      ministerWhatsapp: users.whatsapp,
      onSiteAdjustments: schedules.onSiteAdjustments
    }).from(schedules).leftJoin(users, eq14(schedules.ministerId, users.id)).where(
      and11(
        eq14(schedules.date, schedule.date),
        eq14(schedules.time, schedule.time),
        eq14(schedules.status, "scheduled")
      )
    ).orderBy(schedules.position);
    const checkIns = await db.select().from(ministerCheckIns).where(eq14(ministerCheckIns.scheduleId, scheduleId));
    const standbyList = await db.select({
      id: standbyMinisters.id,
      ministerId: standbyMinisters.ministerId,
      ministerName: users.name,
      ministerPhone: users.phone,
      ministerWhatsapp: users.whatsapp,
      confirmedAvailable: standbyMinisters.confirmedAvailable,
      calledAt: standbyMinisters.calledAt,
      response: standbyMinisters.response,
      assignedPosition: standbyMinisters.assignedPosition
    }).from(standbyMinisters).leftJoin(users, eq14(standbyMinisters.ministerId, users.id)).where(eq14(standbyMinisters.scheduleId, scheduleId));
    const executionLog = await db.select().from(massExecutionLogs).where(eq14(massExecutionLogs.scheduleId, scheduleId)).limit(1);
    const massDateTime = parseISO(`${schedule.date}T${schedule.time}`);
    const now = /* @__PURE__ */ new Date();
    const minutesUntilMass = Math.floor((massDateTime.getTime() - now.getTime()) / (1e3 * 60));
    let currentPhase;
    if (minutesUntilMass > 30) {
      currentPhase = "pre-mass";
    } else if (minutesUntilMass > -30) {
      currentPhase = "during-mass";
    } else {
      currentPhase = "post-mass";
    }
    res.json({
      success: true,
      data: {
        massInfo: {
          id: scheduleId,
          date: schedule.date,
          time: schedule.time,
          type: schedule.type,
          location: schedule.location
        },
        currentPhase,
        minutesUntilMass,
        assignments: allAssignments.map((a) => ({
          id: a.id,
          ministerId: a.ministerId,
          ministerName: a.ministerName,
          phone: a.ministerPhone,
          whatsapp: a.ministerWhatsapp,
          position: a.position,
          onSiteAdjustments: a.onSiteAdjustments,
          checkInStatus: checkIns.find((c) => c.ministerId === a.ministerId)?.status || "not-checked-in",
          checkInTime: checkIns.find((c) => c.ministerId === a.ministerId)?.checkedInAt
        })),
        standbyMinisters: standbyList,
        executionLog: executionLog.length > 0 ? executionLog[0] : null,
        statistics: {
          totalPositions: allAssignments.length,
          checkedIn: checkIns.filter((c) => c.status === "present").length,
          absent: checkIns.filter((c) => c.status === "absent").length,
          standbyCalled: standbyList.filter((s) => s.calledAt !== null).length
        }
      }
    });
  } catch (error) {
    console.error("[AUXILIARY_PANEL] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao carregar painel do auxiliar"
    });
  }
});
router10.get("/standby/:scheduleId", authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
    }
    const massInfo = await db.select().from(schedules).where(eq14(schedules.id, scheduleId)).limit(1);
    if (massInfo.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    const { date: date2, time: time2 } = massInfo[0];
    const availableStandby = await db.select({
      ministerId: users.id,
      ministerName: users.name,
      phone: users.phone,
      whatsapp: users.whatsapp,
      totalServices: users.totalServices,
      lastService: users.lastService
    }).from(users).where(
      and11(
        eq14(users.status, "active"),
        eq14(users.role, "ministro")
      )
    ).limit(20);
    const assignedMinisters = await db.select({ ministerId: schedules.ministerId }).from(schedules).where(
      and11(
        eq14(schedules.date, date2),
        eq14(schedules.time, time2)
      )
    );
    const assignedIds = new Set(assignedMinisters.map((a) => a.ministerId).filter(Boolean));
    const standbyOptions = availableStandby.filter((m) => !assignedIds.has(m.ministerId));
    res.json({
      success: true,
      data: standbyOptions.slice(0, 10)
      // Top 10 most suitable
    });
  } catch (error) {
    console.error("[AUXILIARY_STANDBY] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao buscar ministros suplentes"
    });
  }
});
router10.post("/check-in", authenticateToken, async (req, res) => {
  try {
    const { scheduleId, ministerId, status, notes } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
    }
    const assignment = await db.select().from(schedules).where(
      and11(
        eq14(schedules.id, scheduleId),
        eq14(schedules.ministerId, ministerId)
      )
    ).limit(1);
    if (assignment.length === 0) {
      return res.status(404).json({ message: "Ministro n\xE3o encontrado nesta escala" });
    }
    const position = assignment[0].position || 0;
    const existingCheckIn = await db.select().from(ministerCheckIns).where(
      and11(
        eq14(ministerCheckIns.scheduleId, scheduleId),
        eq14(ministerCheckIns.ministerId, ministerId)
      )
    ).limit(1);
    if (existingCheckIn.length > 0) {
      await db.update(ministerCheckIns).set({
        status,
        notes,
        checkedInAt: /* @__PURE__ */ new Date()
      }).where(eq14(ministerCheckIns.id, existingCheckIn[0].id));
    } else {
      await db.insert(ministerCheckIns).values({
        scheduleId,
        ministerId,
        position,
        status,
        notes,
        checkedInBy: userId
      });
    }
    res.json({
      success: true,
      message: `Ministro marcado como ${status}`
    });
  } catch (error) {
    console.error("[AUXILIARY_CHECKIN] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao registrar presen\xE7a"
    });
  }
});
router10.put("/redistribute", authenticateToken, async (req, res) => {
  try {
    const { scheduleId, changes } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
    }
    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: "Formato de mudan\xE7as inv\xE1lido" });
    }
    const appliedChanges = [];
    for (const change of changes) {
      const { ministerId, fromPosition, toPosition, reason } = change;
      await db.update(schedules).set({ position: toPosition }).where(
        and11(
          eq14(schedules.id, scheduleId),
          eq14(schedules.ministerId, ministerId),
          eq14(schedules.position, fromPosition)
        )
      );
      appliedChanges.push({
        type: "position_change",
        ministerId,
        fromPosition,
        toPosition,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        details: reason
      });
    }
    const existingLog = await db.select().from(massExecutionLogs).where(eq14(massExecutionLogs.scheduleId, scheduleId)).limit(1);
    if (existingLog.length > 0) {
      const currentChanges = existingLog[0].changesMade || [];
      await db.update(massExecutionLogs).set({
        changesMade: [...currentChanges, ...appliedChanges]
      }).where(eq14(massExecutionLogs.id, existingLog[0].id));
    } else {
      await db.insert(massExecutionLogs).values({
        scheduleId,
        auxiliaryId: userId,
        changesMade: appliedChanges
      });
    }
    res.json({
      success: true,
      message: `${appliedChanges.length} mudan\xE7as aplicadas com sucesso`
    });
  } catch (error) {
    console.error("[AUXILIARY_REDISTRIBUTE] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao redistribuir posi\xE7\xF5es"
    });
  }
});
router10.post("/call-standby", authenticateToken, async (req, res) => {
  try {
    const { scheduleId, ministerId, position } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
    }
    const massInfo = await db.select().from(schedules).where(eq14(schedules.id, scheduleId)).limit(1);
    if (massInfo.length === 0) {
      return res.status(404).json({ message: "Escala n\xE3o encontrada" });
    }
    const { date: date2, time: time2 } = massInfo[0];
    const auxiliary = await db.select({ name: users.name }).from(users).where(eq14(users.id, userId)).limit(1);
    const auxiliaryName = auxiliary[0]?.name || "Auxiliar";
    await db.insert(standbyMinisters).values({
      scheduleId,
      ministerId,
      calledAt: /* @__PURE__ */ new Date(),
      calledBy: userId,
      response: "pending",
      assignedPosition: position
    });
    await db.insert(notifications).values({
      userId: ministerId,
      type: "schedule",
      title: "\u{1F6A8} Chamada Urgente de Supl\xEAncia",
      message: `${auxiliaryName} est\xE1 convocando voc\xEA para a missa de ${format6(parseISO(date2), "dd/MM/yyyy")} \xE0s ${time2}. Posi\xE7\xE3o: ${position}`,
      priority: "high",
      data: {
        scheduleId,
        position,
        calledBy: userId,
        massDate: date2,
        massTime: time2
      }
    });
    res.json({
      success: true,
      message: "Suplente convocado com sucesso"
    });
  } catch (error) {
    console.error("[AUXILIARY_CALL_STANDBY] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao convocar suplente"
    });
  }
});
router10.post("/mass-report", authenticateToken, async (req, res) => {
  try {
    const {
      scheduleId,
      attendance,
      massQuality,
      comments,
      incidents,
      highlights
    } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "N\xE3o autenticado" });
    }
    const isAuxiliary = await isAuxiliaryForMass(userId, scheduleId);
    if (!isAuxiliary) {
      return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
    }
    const existingLog = await db.select().from(massExecutionLogs).where(eq14(massExecutionLogs.scheduleId, scheduleId)).limit(1);
    if (existingLog.length > 0) {
      await db.update(massExecutionLogs).set({
        attendance,
        massQuality,
        comments,
        incidents,
        highlights
      }).where(eq14(massExecutionLogs.id, existingLog[0].id));
    } else {
      await db.insert(massExecutionLogs).values({
        scheduleId,
        auxiliaryId: userId,
        attendance,
        massQuality,
        comments,
        incidents,
        highlights
      });
    }
    if (attendance && Array.isArray(attendance)) {
      for (const record of attendance) {
        if (record.absent) {
          continue;
        }
        if (record.checkedIn && record.ministerId) {
          await db.update(users).set({
            lastService: /* @__PURE__ */ new Date(),
            totalServices: sql8`${users.totalServices} + 1`
          }).where(eq14(users.id, record.ministerId));
        }
      }
    }
    if (incidents && incidents.length > 0) {
      const coordinators = await db.select().from(users).where(
        and11(
          inArray4(users.role, ["coordenador", "gestor"]),
          eq14(users.status, "active")
        )
      );
      for (const coordinator of coordinators) {
        await db.insert(notifications).values({
          userId: coordinator.id,
          type: "announcement",
          title: "Relat\xF3rio de Missa com Incidentes",
          message: `O auxiliar reportou ${incidents.length} incidente(s) na missa de ${scheduleId}`,
          data: { scheduleId, incidents }
        });
      }
    }
    res.json({
      success: true,
      message: "Relat\xF3rio enviado com sucesso"
    });
  } catch (error) {
    console.error("[AUXILIARY_REPORT] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao enviar relat\xF3rio"
    });
  }
});
var auxiliaryPanel_default = router10;

// server/routes/upload.ts
await init_db();
init_schema();
import { Router as Router11 } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq as eq15 } from "drizzle-orm";
var router11 = Router11();
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
router11.post("/profile-photo", authenticateToken, upload.single("photo"), handleMulterError, async (req, res) => {
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
    }).where(eq15(users.id, userId));
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
router11.delete("/profile-photo", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!db) {
      return res.status(500).json({ error: "Erro interno: banco de dados n\xE3o dispon\xEDvel" });
    }
    await db.update(users).set({
      photoUrl: null,
      imageData: null,
      imageContentType: null
    }).where(eq15(users.id, userId));
    res.json({
      success: true,
      message: "Foto de perfil removida com sucesso!"
    });
  } catch (error) {
    console.error("Error removing profile photo:", error);
    res.status(500).json({ error: "Erro interno ao remover a foto. Tente novamente." });
  }
});
var upload_default = router11;

// server/routes/notifications.ts
import { Router as Router12 } from "express";
import { z as z5 } from "zod";
await init_db();
await init_storage();
init_schema();
import { eq as eq16, and as and12 } from "drizzle-orm";

// server/utils/pushNotifications.ts
await init_storage();
var webpush = null;
try {
  const module = await import("web-push");
  webpush = module.default ?? module;
} catch (error) {
  console.warn("[PUSH] web-push module not available. Push notifications disabled.", error);
}
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
var VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
if (webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
var pushConfig = {
  enabled: Boolean(webpush && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
  publicKey: VAPID_PUBLIC_KEY || null
};
async function sendPushNotificationToUsers(userIds, payload) {
  if (!pushConfig.enabled || !webpush) {
    return;
  }
  if (!userIds || userIds.length === 0) {
    return;
  }
  const uniqueUserIds = Array.from(new Set(userIds));
  const subscriptions = await storage.getPushSubscriptionsByUserIds(uniqueUserIds);
  if (subscriptions.length === 0) {
    return;
  }
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? payload.data?.url ?? "/communication",
    tag: payload.tag,
    data: payload.data ?? {}
  });
  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.authKey,
          p256dh: subscription.p256dhKey
        }
      };
      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (error) {
        const statusCode = error?.statusCode ?? error?.code;
        if (statusCode === 404 || statusCode === 410) {
          console.warn("[PUSH] Subscription expired, removing:", subscription.endpoint);
          await storage.removePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          console.error("[PUSH] Failed to send notification:", error);
        }
      }
    })
  );
}

// server/routes/notifications.ts
var router12 = Router12();
var createNotificationSchema = z5.object({
  title: z5.string().min(1, "T\xEDtulo \xE9 obrigat\xF3rio"),
  message: z5.string().min(1, "Mensagem \xE9 obrigat\xF3ria"),
  type: z5.enum(["info", "warning", "success", "error"]).default("info"),
  recipientIds: z5.array(z5.string()).optional(),
  // IDs específicos ou vazio para todos
  recipientRole: z5.enum(["ministro", "coordenador", "gestor", "all"]).optional(),
  actionUrl: z5.string().url().optional()
});
var rawPushSubscriptionSchema = z5.object({
  endpoint: z5.string().url(),
  keys: z5.object({
    p256dh: z5.string(),
    auth: z5.string()
  })
});
var pushSubscriptionSchema = z5.union([
  z5.object({ subscription: rawPushSubscriptionSchema }),
  rawPushSubscriptionSchema
]);
var unsubscribeSchema = z5.object({
  endpoint: z5.string().url()
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
router12.get("/push/config", authenticateToken, (req, res) => {
  res.json({
    enabled: pushConfig.enabled,
    publicKey: pushConfig.publicKey
  });
});
router12.post("/push/subscribe", authenticateToken, async (req, res) => {
  try {
    if (!pushConfig.enabled) {
      return res.status(503).json({ error: "Notifica\xE7\xF5es push n\xE3o est\xE3o configuradas no servidor" });
    }
    const parsed = pushSubscriptionSchema.parse(req.body);
    const subscription = "subscription" in parsed ? parsed.subscription : parsed;
    await storage.upsertPushSubscription(req.user.id, {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z5.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      console.error("Erro ao registrar push subscription:", error);
      res.status(500).json({ error: "Erro ao registrar subscription push" });
    }
  }
});
router12.post("/push/unsubscribe", authenticateToken, async (req, res) => {
  try {
    const { endpoint } = unsubscribeSchema.parse(req.body);
    await storage.removePushSubscription(req.user.id, endpoint);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z5.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
    } else {
      console.error("Erro ao remover push subscription:", error);
      res.status(500).json({ error: "Erro ao remover subscription push" });
    }
  }
});
router12.get("/", authenticateToken, async (req, res) => {
  try {
    const notifications2 = await storage.getUserNotifications(req.user.id);
    res.json(notifications2);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar notifica\xE7\xF5es" });
  }
});
router12.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.warn("[NOTIFICATIONS] No user in request");
      return res.json({ count: 0 });
    }
    const allNotifications = await storage.getUserNotifications(req.user.id);
    if (!allNotifications || !Array.isArray(allNotifications)) {
      console.warn("[NOTIFICATIONS] Invalid notifications data");
      return res.json({ count: 0 });
    }
    const count8 = allNotifications.filter((n) => n && !n.read).length;
    res.json({ count: count8 });
  } catch (error) {
    console.error("[NOTIFICATIONS] Error counting notifications:", error);
    res.json({ count: 0 });
  }
});
router12.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await db.select().from(notifications).where(and12(
      eq16(notifications.id, id),
      eq16(notifications.userId, req.user.id)
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
router12.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    const userNotifications = await storage.getUserNotifications(req.user.id);
    const unreadNotifications = userNotifications.filter((n) => !n.read);
    await Promise.all(unreadNotifications.map((n) => storage.markNotificationAsRead(n.id)));
    res.json({ message: "Todas as notifica\xE7\xF5es foram marcadas como lidas" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar requisi\xE7\xE3o" });
  }
});
router12.post("/mass-invite", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const { massId, date: date2, time: time2, location, message, urgencyLevel } = req.body;
    console.log("Recebido pedido de notifica\xE7\xE3o para missa:", { massId, date: date2, time: time2, location, urgencyLevel });
    const title = urgencyLevel === "critical" ? "\u{1F534} URGENTE: Convoca\xE7\xE3o para Missa" : urgencyLevel === "high" ? "\u26A0\uFE0F IMPORTANTE: Ministros Necess\xE1rios" : "\u{1F4E2} Convite para Servir na Missa";
    const ministers = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(
      eq16(users.status, "active")
    );
    console.log(`Encontrados ${ministers.length} usu\xE1rios ativos`);
    const mappedType = urgencyLevel === "critical" || urgencyLevel === "high" ? "reminder" : "announcement";
    const notificationPromises = ministers.map(
      (minister) => storage.createNotification({
        userId: minister.id,
        title,
        message: message || `Precisamos de ministros para a missa de ${date2} \xE0s ${time2} na ${location}. Por favor, confirme sua disponibilidade.`,
        type: mappedType,
        read: false,
        actionUrl: "/schedules"
      })
    );
    const results = await Promise.all(notificationPromises);
    console.log(`Criadas ${results.length} notifica\xE7\xF5es`);
    if (pushConfig.enabled) {
      await sendPushNotificationToUsers(
        ministers.map((minister) => minister.id),
        {
          title,
          body: message || `Precisamos de ministros para a missa de ${date2} \xE0s ${time2} na ${location}. Por favor, confirme sua disponibilidade.`,
          url: "/schedules",
          data: {
            massId,
            urgencyLevel
          }
        }
      );
    }
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
router12.post("/", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const data = createNotificationSchema.parse(req.body);
    let recipientUserIds = [];
    if (data.recipientIds && data.recipientIds.length > 0) {
      recipientUserIds = data.recipientIds;
    } else if (data.recipientRole) {
      let recipients;
      if (data.recipientRole === "all") {
        recipients = await db.select({ id: users.id }).from(users).where(eq16(users.status, "active"));
      } else {
        recipients = await db.select({ id: users.id }).from(users).where(and12(
          eq16(users.role, data.recipientRole),
          eq16(users.status, "active")
        ));
      }
      recipientUserIds = recipients.map((r) => r.id);
    } else {
      const recipients = await db.select({ id: users.id }).from(users).where(and12(
        eq16(users.role, "ministro"),
        eq16(users.status, "active")
      ));
      recipientUserIds = recipients.map((r) => r.id);
    }
    if (!recipientUserIds.includes(req.user.id)) {
      recipientUserIds.push(req.user.id);
    }
    recipientUserIds = Array.from(new Set(recipientUserIds));
    const mappedType = mapNotificationType(data.type);
    const notificationPromises = recipientUserIds.map(
      (userId) => storage.createNotification({
        userId,
        title: data.title,
        message: data.message,
        type: mappedType,
        read: false,
        actionUrl: data.actionUrl ?? null
      })
    );
    await Promise.all(notificationPromises);
    if (pushConfig.enabled) {
      await sendPushNotificationToUsers(recipientUserIds, {
        title: data.title,
        body: data.message,
        url: data.actionUrl ?? "/communication"
      });
    }
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
router12.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(req.user.id);
    const isCoordinator = user && ["coordenador", "gestor"].includes(user.role);
    let notification;
    if (isCoordinator) {
      notification = await db.select().from(notifications).where(eq16(notifications.id, id)).limit(1);
    } else {
      notification = await db.select().from(notifications).where(and12(
        eq16(notifications.id, id),
        eq16(notifications.userId, req.user.id)
      )).limit(1);
    }
    if (notification.length === 0) {
      return res.status(404).json({ error: "Notifica\xE7\xE3o n\xE3o encontrada" });
    }
    await db.delete(notifications).where(eq16(notifications.id, id));
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
var notifications_default = router12;

// server/routes/reports.ts
await init_db();
init_schema();
import { Router as Router13 } from "express";
import { eq as eq17, sql as sql9, and as and13, gte as gte7, lte as lte7, desc as desc6, asc, count as count4, avg } from "drizzle-orm";

// server/utils/activityLogger.ts
await init_db();
init_schema();
async function logActivity2(userId, action, details, req) {
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
      return logActivity2(userId, action, details, req);
    }
  };
}

// server/routes/reports.ts
var router13 = Router13();
router13.get("/availability", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "availability" });
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const availabilityData = await db.select({
      userId: questionnaireResponses.userId,
      userName: users.name,
      totalResponses: count4(questionnaireResponses.id),
      availableDays: sql9`
          COALESCE(
            SUM(
              jsonb_array_length(
                COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
              )
            ), 0
          )
        `.as("available_days")
    }).from(questionnaireResponses).leftJoin(users, eq17(users.id, questionnaireResponses.userId)).where(
      and13(
        startDate ? gte7(questionnaireResponses.submittedAt, new Date(startDate)) : sql9`true`,
        endDate ? lte7(questionnaireResponses.submittedAt, new Date(endDate)) : sql9`true`
      )
    ).groupBy(questionnaireResponses.userId, users.name).orderBy(desc6(sql9`available_days`)).limit(Number(limit));
    res.json({
      topAvailable: availabilityData,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error("Error fetching availability metrics:", error);
    res.status(500).json({ error: "Failed to fetch availability metrics" });
  }
});
router13.get("/substitutions", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "substitutions" });
  try {
    const { startDate, endDate } = req.query;
    const mostRequests = await db.select({
      userId: substitutionRequests.requesterId,
      userName: users.name,
      totalRequests: count4(substitutionRequests.id),
      approvedRequests: sql9`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as("approved_requests"),
      pendingRequests: sql9`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'pending' THEN 1 END)
        `.as("pending_requests")
    }).from(substitutionRequests).leftJoin(users, eq17(users.id, substitutionRequests.requesterId)).where(
      and13(
        startDate ? gte7(substitutionRequests.createdAt, new Date(startDate)) : sql9`true`,
        endDate ? lte7(substitutionRequests.createdAt, new Date(endDate)) : sql9`true`
      )
    ).groupBy(substitutionRequests.requesterId, users.name).orderBy(desc6(count4(substitutionRequests.id))).limit(10);
    const reliableServers = await db.select({
      userId: schedules.ministerId,
      userName: users.name,
      totalAssignments: count4(schedules.id),
      substitutionRequests: sql9`
          (SELECT COUNT(*) FROM ${substitutionRequests}
           WHERE ${substitutionRequests.requesterId} = ${schedules.ministerId}
           ${startDate ? sql9`AND ${substitutionRequests.createdAt} >= ${new Date(startDate)}` : sql9``}
           ${endDate ? sql9`AND ${substitutionRequests.createdAt} <= ${new Date(endDate)}` : sql9``})
        `.as("substitution_requests")
    }).from(schedules).leftJoin(users, eq17(users.id, schedules.ministerId)).where(
      and13(
        schedules.status ? eq17(schedules.status, "published") : sql9`true`,
        startDate ? gte7(schedules.createdAt, new Date(startDate)) : sql9`true`,
        endDate ? lte7(schedules.createdAt, new Date(endDate)) : sql9`true`
      )
    ).groupBy(schedules.ministerId, users.name).having(sql9`COUNT(${schedules.id}) > 0`).orderBy(asc(sql9`substitution_requests`), desc6(count4(schedules.id))).limit(10);
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
router13.get("/engagement", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "engagement" });
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const mostActive = await db.select({
      userId: activityLogs.userId,
      userName: users.name,
      totalActions: count4(activityLogs.id),
      lastActivity: sql9`MAX(${activityLogs.createdAt})`.as("last_activity"),
      uniqueDays: sql9`
          COUNT(DISTINCT DATE(${activityLogs.createdAt}))
        `.as("unique_days")
    }).from(activityLogs).leftJoin(users, eq17(users.id, activityLogs.userId)).where(
      and13(
        startDate ? gte7(activityLogs.createdAt, new Date(startDate)) : sql9`true`,
        endDate ? lte7(activityLogs.createdAt, new Date(endDate)) : sql9`true`
      )
    ).groupBy(activityLogs.userId, users.name).orderBy(desc6(count4(activityLogs.id))).limit(Number(limit));
    const responseRates = await db.select({
      totalMinisters: count4(users.id),
      respondedMinisters: sql9`
          COUNT(DISTINCT ${questionnaireResponses.userId})
        `.as("responded_ministers"),
      responseRate: sql9`
          ROUND(
            COUNT(DISTINCT ${questionnaireResponses.userId})::numeric /
            NULLIF(COUNT(DISTINCT ${users.id}), 0) * 100,
            2
          )
        `.as("response_rate")
    }).from(users).leftJoin(
      questionnaireResponses,
      and13(
        eq17(users.id, questionnaireResponses.userId),
        startDate ? gte7(questionnaireResponses.submittedAt, new Date(startDate)) : sql9`true`,
        endDate ? lte7(questionnaireResponses.submittedAt, new Date(endDate)) : sql9`true`
      )
    ).where(eq17(users.status, "active"));
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
router13.get("/formation", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "formation" });
  try {
    const { limit = 10 } = req.query;
    const topPerformers = await db.select({
      userId: formationProgress.userId,
      userName: users.name,
      completedModules: sql9`
          COUNT(CASE WHEN ${formationProgress.status} = 'completed' THEN 1 END)
        `.as("completed_modules"),
      inProgressModules: sql9`
          COUNT(CASE WHEN ${formationProgress.status} = 'in_progress' THEN 1 END)
        `.as("in_progress_modules"),
      avgProgress: avg(formationProgress.progressPercentage)
    }).from(formationProgress).leftJoin(users, eq17(users.id, formationProgress.userId)).groupBy(formationProgress.userId, users.name).orderBy(desc6(sql9`completed_modules`)).limit(Number(limit));
    const formationStats = await db.select({
      totalModules: sql9`
          (SELECT COUNT(*) FROM formation_modules)
        `.as("total_modules"),
      totalEnrolled: count4(sql9`DISTINCT ${formationProgress.userId}`),
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
router13.get("/families", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "families" });
  try {
    const activeFamilies = await db.select({
      familyId: families.id,
      familyName: families.name,
      totalMembers: count4(users.id),
      activeMembers: sql9`
          COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)
        `.as("active_members"),
      totalServices: sql9`
          COALESCE(SUM(${users.totalServices}), 0)
        `.as("total_services")
    }).from(families).leftJoin(users, eq17(users.familyId, families.id)).groupBy(families.id, families.name).having(sql9`COUNT(${users.id}) > 1`).orderBy(desc6(sql9`active_members`), desc6(sql9`total_services`)).limit(10);
    res.json({
      activeFamilies
    });
  } catch (error) {
    console.error("Error fetching family metrics:", error);
    res.status(500).json({ error: "Failed to fetch family metrics" });
  }
});
router13.get("/summary", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
  const logActivity3 = createActivityLogger(req);
  await logActivity3("view_reports", { type: "summary" });
  try {
    const now = /* @__PURE__ */ new Date();
    const startOfMonth6 = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth6 = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const activeMinistersCount = await db.select({ count: count4() }).from(users).where(eq17(users.status, "active"));
    const monthSubstitutions = await db.select({
      total: count4(),
      approved: sql9`
          COUNT(CASE WHEN ${substitutionRequests.status} = 'approved' THEN 1 END)
        `.as("approved")
    }).from(substitutionRequests).where(
      and13(
        gte7(substitutionRequests.createdAt, startOfMonth6),
        lte7(substitutionRequests.createdAt, endOfMonth6)
      )
    );
    const formationThisMonth = await db.select({ count: count4() }).from(formationProgress).where(
      and13(
        eq17(formationProgress.status, "completed"),
        formationProgress.completedAt ? gte7(formationProgress.completedAt, startOfMonth6) : sql9`false`,
        formationProgress.completedAt ? lte7(formationProgress.completedAt, endOfMonth6) : sql9`false`
      )
    );
    const avgAvailability = await db.select({
      avgDays: sql9`
          AVG(
            jsonb_array_length(
              COALESCE(${questionnaireResponses.responses}->>'availableDays', '[]')::jsonb
            )
          )
        `.as("avg_days")
    }).from(questionnaireResponses).where(
      and13(
        gte7(questionnaireResponses.submittedAt, startOfMonth6),
        lte7(questionnaireResponses.submittedAt, endOfMonth6)
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
var reports_default = router13;

// server/routes/ministers.ts
await init_db();
init_schema();
import { Router as Router14 } from "express";
import { eq as eq18, and as and14, sql as sql10 } from "drizzle-orm";

// server/utils/formatters.ts
function formatMinisterName(name) {
  if (!name) return "";
  if (name === "VACANTE") return "VACANTE";
  const lowercase = ["da", "de", "di", "do", "das", "dos", "e", "em", "na", "no"];
  return name.toLowerCase().split(" ").map((word, index2) => {
    if (index2 === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    if (lowercase.includes(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

// server/routes/ministers.ts
var router14 = Router14();
router14.get("/", authenticateToken, auditPersonalDataAccess("personal"), async (req, res) => {
  try {
    const ministersList = await db.select().from(users).where(
      sql10`${users.role} IN ('ministro', 'coordenador')`
    );
    res.json(ministersList);
  } catch (error) {
    console.error("Error fetching ministers:", error);
    res.status(500).json({ message: "Erro ao buscar ministros" });
  }
});
router14.get("/:id", authenticateToken, auditPersonalDataAccess("personal"), async (req, res) => {
  try {
    const minister = await db.select().from(users).where(and14(
      eq18(users.id, req.params.id),
      eq18(users.role, "ministro")
    )).limit(1);
    if (minister.length === 0) {
      return res.status(404).json({ message: "Ministro n\xE3o encontrado" });
    }
    res.json(minister[0]);
  } catch (error) {
    console.error("Error fetching minister:", error);
    res.status(500).json({ message: "Erro ao buscar ministro" });
  }
});
router14.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;
    if (currentUser.role !== "gestor" && currentUser.role !== "coordenador" && currentUser.id !== userId) {
      return res.status(403).json({ message: "Sem permiss\xE3o para editar este ministro" });
    }
    const allowedFields = [
      "birthDate",
      "address",
      "city",
      "zipCode",
      "emergencyContact",
      "emergencyPhone",
      "preferredPosition",
      "availableForSpecialEvents",
      "canServeAsCouple",
      "spouseUserId",
      "experience",
      "specialSkills",
      "liturgicalTraining",
      "observations",
      "active",
      "scheduleDisplayName"
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== void 0) {
        if (field === "specialSkills") {
          updateData[field] = typeof req.body[field] === "string" ? req.body[field] : JSON.stringify(req.body[field]);
        } else if (["liturgicalTraining", "formationCompleted"].includes(field)) {
          updateData[field] = Boolean(req.body[field]);
        } else if (field === "scheduleDisplayName") {
          updateData[field] = formatMinisterName(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar" });
    }
    updateData.updatedAt = /* @__PURE__ */ new Date();
    const result = await db.update(users).set(updateData).where(and14(
      eq18(users.id, userId),
      eq18(users.role, "ministro")
    )).returning();
    if (result.length === 0) {
      return res.status(404).json({ message: "Ministro n\xE3o encontrado" });
    }
    await logAudit("PERSONAL_DATA_UPDATE" /* PERSONAL_DATA_UPDATE */, {
      userId: currentUser.id,
      targetUserId: userId,
      targetResource: "minister",
      changes: Object.keys(updateData),
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating minister:", error);
    res.status(500).json({ message: "Erro ao atualizar ministro" });
  }
});
router14.get("/:id/stats", authenticateToken, async (req, res) => {
  try {
    const ministerId = req.params.id;
    const minister = await db.select({ totalServices: users.totalServices }).from(users).where(and14(
      eq18(users.id, ministerId),
      eq18(users.role, "ministro")
    )).limit(1);
    if (minister.length === 0) {
      return res.status(404).json({ message: "Ministro n\xE3o encontrado" });
    }
    const threeMonthsAgo = /* @__PURE__ */ new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentAssignments = 0;
    res.json({
      totalServices: minister[0].totalServices || 0,
      recentAssignments
    });
  } catch (error) {
    console.error("Error fetching minister stats:", error);
    res.status(500).json({ message: "Erro ao buscar estat\xEDsticas" });
  }
});
var ministers_default = router14;

// server/routes/substitutions.ts
await init_db();
init_schema();
import { Router as Router15 } from "express";
import { eq as eq20, and as and16, sql as sql12, gte as gte9, desc as desc7, count as count5, notInArray, inArray as inArray5 } from "drizzle-orm";
var router15 = Router15();
function calculateUrgency(massDateStr, massTime) {
  const now = /* @__PURE__ */ new Date();
  const [year, month, day] = massDateStr.split("-").map(Number);
  const [hours, minutes] = massTime.split(":").map(Number);
  const massDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1e3 * 60 * 60);
  if (hoursUntilMass < 12) return "critical";
  if (hoursUntilMass < 24) return "high";
  if (hoursUntilMass < 72) return "medium";
  return "low";
}
async function countMonthlySubstitutions(requesterId) {
  const now = /* @__PURE__ */ new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth2 = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const result = await db.select({ count: count5() }).from(substitutionRequests).where(
    and16(
      eq20(substitutionRequests.requesterId, requesterId),
      gte9(substitutionRequests.createdAt, firstDayOfMonth),
      sql12`${substitutionRequests.createdAt} <= ${lastDayOfMonth2}`
    )
  );
  return result[0]?.count || 0;
}
router15.post("/", authenticateToken, async (req, res) => {
  try {
    const { scheduleId, substituteId, reason } = req.body;
    const requesterId = req.user.id;
    console.log("[Substitutions] Criando solicita\xE7\xE3o:", { scheduleId, substituteId, reason, requesterId });
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: "ID da escala \xE9 obrigat\xF3rio"
      });
    }
    const [schedule] = await db.select().from(schedules).where(eq20(schedules.id, scheduleId)).limit(1);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Escala n\xE3o encontrada"
      });
    }
    const [year, month, day] = schedule.date.split("-").map(Number);
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const massDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    const now = /* @__PURE__ */ new Date();
    console.log("[Substitutions] Verificando data:", {
      scheduleDate: schedule.date,
      scheduleTime: schedule.time,
      massDateTime: massDateTime.toISOString(),
      now: now.toISOString(),
      isPast: massDateTime < now
    });
    if (massDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "N\xE3o \xE9 poss\xEDvel solicitar substitui\xE7\xE3o para missa que j\xE1 passou"
      });
    }
    if (schedule.ministerId !== requesterId) {
      return res.status(403).json({
        success: false,
        message: "Voc\xEA n\xE3o est\xE1 escalado para esta data"
      });
    }
    const [existingRequest] = await db.select().from(substitutionRequests).where(
      and16(
        eq20(substitutionRequests.scheduleId, scheduleId),
        inArray5(substitutionRequests.status, ["pending", "available"])
      )
    ).limit(1);
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "J\xE1 existe uma solicita\xE7\xE3o pendente para esta escala"
      });
    }
    const urgency = calculateUrgency(schedule.date, schedule.time);
    const monthlyCount = await countMonthlySubstitutions(requesterId);
    const finalSubstituteId = substituteId || null;
    const status = finalSubstituteId ? "pending" : "available";
    const [newRequest] = await db.insert(substitutionRequests).values({
      scheduleId,
      requesterId,
      substituteId: finalSubstituteId,
      reason: reason || null,
      status,
      urgency,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    const requestQuery = db.select({
      request: substitutionRequests,
      assignment: schedules,
      requestingUser: {
        id: users.id,
        name: users.name,
        email: users.email,
        profilePhoto: users.photoUrl
      }
    }).from(substitutionRequests).innerJoin(schedules, eq20(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq20(substitutionRequests.requesterId, users.id)).where(eq20(substitutionRequests.id, newRequest.id)).limit(1);
    const [requestWithDetails] = await requestQuery;
    let substituteUser = null;
    if (finalSubstituteId) {
      const [substitute] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        whatsapp: users.whatsapp
      }).from(users).where(eq20(users.id, finalSubstituteId)).limit(1);
      substituteUser = substitute || null;
    }
    const responseData = {
      ...requestWithDetails,
      assignment: {
        ...requestWithDetails.assignment,
        massTime: requestWithDetails.assignment.time
      },
      substituteUser
    };
    const message = finalSubstituteId ? "Solicita\xE7\xE3o criada. Aguardando resposta do ministro indicado." : "Solicita\xE7\xE3o publicada no quadro de substitui\xE7\xF5es. Outros ministros poder\xE3o se prontificar.";
    const { notifySubstitutionRequest: notifySubstitutionRequest2 } = await init_websocket().then(() => websocket_exports);
    notifySubstitutionRequest2({
      ...responseData,
      urgency,
      hoursUntil: Math.round((massDateTime.getTime() - now.getTime()) / (1e3 * 60 * 60))
    });
    res.json({
      success: true,
      message,
      data: responseData,
      monthlyCount: monthlyCount + 1
    });
  } catch (error) {
    console.error("[Substitutions] Erro ao criar solicita\xE7\xE3o de substitui\xE7\xE3o:", error);
    console.error("[Substitutions] Stack trace:", error.stack);
    console.error("[Substitutions] Request body:", req.body);
    console.error("[Substitutions] User:", req.user);
    res.status(500).json({
      success: false,
      message: "Erro ao criar solicita\xE7\xE3o de substitui\xE7\xE3o",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
router15.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const isCoordinator = userRole === "coordenador" || userRole === "gestor";
    let requests;
    if (isCoordinator) {
      requests = await db.select({
        request: substitutionRequests,
        assignment: schedules,
        requestingUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          profilePhoto: users.photoUrl
        }
      }).from(substitutionRequests).innerJoin(schedules, eq20(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq20(substitutionRequests.requesterId, users.id)).orderBy(desc7(substitutionRequests.createdAt));
    } else {
      requests = await db.select({
        request: substitutionRequests,
        assignment: schedules,
        requestingUser: {
          id: users.id,
          name: users.name,
          email: users.email,
          profilePhoto: users.photoUrl
        }
      }).from(substitutionRequests).innerJoin(schedules, eq20(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq20(substitutionRequests.requesterId, users.id)).where(
        sql12`${substitutionRequests.requesterId} = ${userId}
            OR ${substitutionRequests.substituteId} = ${userId}
            OR ${substitutionRequests.status} = 'available'`
      ).orderBy(desc7(substitutionRequests.createdAt));
    }
    const mappedRequests = requests.map((req2) => ({
      ...req2,
      assignment: {
        ...req2.assignment,
        massTime: req2.assignment.time
      }
    }));
    res.json(mappedRequests);
  } catch (error) {
    console.error("Erro ao listar solicita\xE7\xF5es:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar solicita\xE7\xF5es"
    });
  }
});
router15.get("/available/:scheduleId", authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    console.log("[Substitutions] Buscando substitutos dispon\xEDveis para schedule:", scheduleId);
    const [schedule] = await db.select().from(schedules).where(eq20(schedules.id, scheduleId)).limit(1);
    if (!schedule) {
      console.log("[Substitutions] Escala n\xE3o encontrada:", scheduleId);
      return res.status(404).json({
        success: false,
        message: "Escala n\xE3o encontrada"
      });
    }
    console.log("[Substitutions] Escala encontrada:", { date: schedule.date, time: schedule.time });
    const availableSubstitutes = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl
    }).from(users).where(
      and16(
        eq20(users.status, "active"),
        eq20(users.role, "ministro"),
        // Não está escalado no mesmo horário
        sql12`NOT EXISTS (
            SELECT 1 FROM ${schedules} s
            WHERE s.minister_id = ${users.id}
            AND s.date = ${schedule.date}
            AND s.time = ${schedule.time}
          )`
      )
    ).limit(20);
    console.log("[Substitutions] Substitutos encontrados:", availableSubstitutes.length);
    res.json({
      success: true,
      data: availableSubstitutes
    });
  } catch (error) {
    console.error("[Substitutions] Erro ao buscar substitutos dispon\xEDveis:", error);
    console.error("[Substitutions] Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar substitutos dispon\xEDveis",
      error: error.message
    });
  }
});
router15.post("/:id/respond", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, responseMessage } = req.body;
    const userId = req.user.id;
    if (!response || !["accepted", "rejected"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Resposta inv\xE1lida. Use 'accepted' ou 'rejected'"
      });
    }
    const [request] = await db.select().from(substitutionRequests).where(eq20(substitutionRequests.id, id)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    const isSubstitute = request.substituteId === userId;
    const isCoordinator = req.user.role === "coordenador" || req.user.role === "gestor";
    if (!isSubstitute && !isCoordinator) {
      return res.status(403).json({
        success: false,
        message: "Voc\xEA n\xE3o tem permiss\xE3o para responder esta solicita\xE7\xE3o"
      });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Esta solicita\xE7\xE3o j\xE1 foi respondida"
      });
    }
    const newStatus = response === "accepted" ? "approved" : "rejected";
    await db.update(substitutionRequests).set({
      status: newStatus,
      approvedBy: userId,
      approvedAt: /* @__PURE__ */ new Date(),
      responseMessage: responseMessage || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq20(substitutionRequests.id, id));
    if (newStatus === "approved" && request.substituteId) {
      await db.update(schedules).set({
        ministerId: request.substituteId,
        substituteId: request.requesterId
      }).where(eq20(schedules.id, request.scheduleId));
    }
    res.json({
      success: true,
      message: response === "accepted" ? "Substitui\xE7\xE3o aceita com sucesso" : "Substitui\xE7\xE3o rejeitada"
    });
  } catch (error) {
    console.error("Erro ao responder solicita\xE7\xE3o:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao responder solicita\xE7\xE3o"
    });
  }
});
router15.post("/:id/claim", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message } = req.body;
    const [request] = await db.select().from(substitutionRequests).where(eq20(substitutionRequests.id, id)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    const isAvailable = request.status === "available" || request.status === "pending" && !request.substituteId;
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Esta solicita\xE7\xE3o n\xE3o est\xE1 mais dispon\xEDvel"
      });
    }
    if (request.requesterId === userId) {
      return res.status(400).json({
        success: false,
        message: "Voc\xEA n\xE3o pode reivindicar sua pr\xF3pria solicita\xE7\xE3o"
      });
    }
    const [schedule] = await db.select().from(schedules).where(eq20(schedules.id, request.scheduleId)).limit(1);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Escala n\xE3o encontrada"
      });
    }
    const conflictingSchedule = await db.select().from(schedules).where(
      and16(
        eq20(schedules.ministerId, userId),
        eq20(schedules.date, schedule.date),
        eq20(schedules.time, schedule.time),
        eq20(schedules.status, "scheduled")
      )
    ).limit(1);
    if (conflictingSchedule.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Voc\xEA j\xE1 est\xE1 escalado neste hor\xE1rio"
      });
    }
    await db.update(substitutionRequests).set({
      status: "approved",
      substituteId: userId,
      approvedBy: userId,
      approvedAt: /* @__PURE__ */ new Date(),
      responseMessage: message || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq20(substitutionRequests.id, id));
    await db.update(schedules).set({
      ministerId: userId,
      substituteId: request.requesterId
    }).where(eq20(schedules.id, request.scheduleId));
    res.json({
      success: true,
      message: "Substitui\xE7\xE3o aceita com sucesso!"
    });
  } catch (error) {
    console.error("Erro ao reivindicar substitui\xE7\xE3o:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reivindicar substitui\xE7\xE3o"
    });
  }
});
router15.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [request] = await db.select().from(substitutionRequests).where(eq20(substitutionRequests.id, id)).limit(1);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Solicita\xE7\xE3o n\xE3o encontrada"
      });
    }
    const isRequester = request.requesterId === userId;
    const isCoordinator = req.user.role === "coordenador" || req.user.role === "gestor";
    if (!isRequester && !isCoordinator) {
      return res.status(403).json({
        success: false,
        message: "Voc\xEA n\xE3o tem permiss\xE3o para cancelar esta solicita\xE7\xE3o"
      });
    }
    if (request.status !== "pending" && request.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Apenas solicita\xE7\xF5es pendentes ou dispon\xEDveis podem ser canceladas"
      });
    }
    await db.update(substitutionRequests).set({
      status: "cancelled",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq20(substitutionRequests.id, id));
    res.json({
      success: true,
      message: "Solicita\xE7\xE3o cancelada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao cancelar solicita\xE7\xE3o:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao cancelar solicita\xE7\xE3o"
    });
  }
});
var substitutions_default = router15;

// server/routes/mass-pendencies.ts
await init_db();
init_schema();
import { Router as Router16 } from "express";
import { eq as eq21, and as and17, gte as gte10, lte as lte9, sql as sql13 } from "drizzle-orm";
var router16 = Router16();
var MINIMUM_MINISTERS = {
  "08:00:00": 12,
  // Missa das 8h - 12 ministros
  "10:00:00": 15,
  // Missa das 10h - 15 ministros
  "19:00:00": 15,
  // Missa das 19h - 15 ministros
  "19:30:00": 12,
  // São Judas - 12 ministros (domingo 28)
  "06:30:00": 8,
  // Missa da semana - 8 ministros
  "18:00:00": 10
  // Missa da tarde - 10 ministros
};
router16.get("/", authenticateToken, requireRole(["coordenador", "gestor"]), async (req, res) => {
  try {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth6 = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth6 = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDateStr = startOfMonth6.toISOString().split("T")[0];
    const endDateStr = endOfMonth6.toISOString().split("T")[0];
    const monthSchedules = await db.select({
      date: schedules.date,
      time: schedules.time,
      location: schedules.location,
      ministerId: schedules.ministerId,
      ministerName: users.name,
      position: schedules.position,
      status: schedules.status,
      id: schedules.id
    }).from(schedules).leftJoin(users, eq21(schedules.ministerId, users.id)).where(
      and17(
        gte10(schedules.date, startDateStr),
        lte9(schedules.date, endDateStr),
        eq21(schedules.status, "scheduled")
      )
    ).orderBy(schedules.date, schedules.time);
    const scheduleIds = monthSchedules.map((s) => s.id);
    const activeSubstitutions = scheduleIds.length > 0 ? await db.select({
      scheduleId: substitutionRequests.scheduleId,
      requesterId: substitutionRequests.requesterId,
      substituteId: substitutionRequests.substituteId,
      status: substitutionRequests.status
    }).from(substitutionRequests).where(
      and17(
        sql13`${substitutionRequests.scheduleId} IN (${sql13.join(
          scheduleIds.map((id) => sql13`${id}`),
          sql13`, `
        )})`,
        sql13`${substitutionRequests.status} IN ('pending', 'approved')`
      )
    ) : [];
    const substitutionsMap = /* @__PURE__ */ new Map();
    activeSubstitutions.forEach((sub) => {
      substitutionsMap.set(sub.scheduleId, sub);
    });
    const massesByDateTime = /* @__PURE__ */ new Map();
    monthSchedules.forEach((schedule) => {
      const key = `${schedule.date}-${schedule.time}`;
      if (!massesByDateTime.has(key)) {
        massesByDateTime.set(key, []);
      }
      massesByDateTime.get(key).push(schedule);
    });
    const allMinisters = await db.select({
      id: users.id,
      name: users.name,
      lastService: users.lastService
    }).from(users).where(
      and17(
        eq21(users.status, "active"),
        eq21(users.role, "ministro")
      )
    );
    const pendencies = [];
    for (const [dateTimeKey, scheduleGroup] of massesByDateTime.entries()) {
      if (scheduleGroup.length === 0) continue;
      const firstSchedule = scheduleGroup[0];
      const massDate = firstSchedule.date;
      const massTime = firstSchedule.time;
      const location = firstSchedule.location || "Matriz";
      const dayOfMonth = new Date(massDate).getDate();
      const isSaoJudas = dayOfMonth === 28 && massTime === "19:30:00";
      const minimumRequired = MINIMUM_MINISTERS[massTime] || 12;
      let currentConfirmed = 0;
      let totalPositions = scheduleGroup.length;
      const confirmedMinisters = [];
      scheduleGroup.forEach((schedule) => {
        const substitution = substitutionsMap.get(schedule.id);
        if (substitution?.status === "approved" && substitution.substituteId) {
          currentConfirmed++;
          confirmedMinisters.push({
            id: substitution.substituteId,
            name: "Substituto",
            // Poderia fazer join para pegar o nome real
            position: schedule.position || 0
          });
        } else if (!substitution && schedule.ministerId && schedule.ministerName) {
          currentConfirmed++;
          confirmedMinisters.push({
            id: schedule.ministerId,
            name: schedule.ministerName,
            position: schedule.position || 0
          });
        }
      });
      const ministersShort = Math.max(
        0,
        minimumRequired - currentConfirmed,
        // Falta para atingir o mínimo
        totalPositions - currentConfirmed
        // Posições vazias
      );
      if (ministersShort > 0) {
        const daysUntilMass = Math.floor(
          (new Date(massDate).getTime() - today.getTime()) / (1e3 * 60 * 60 * 24)
        );
        let urgencyLevel = "low";
        if (daysUntilMass <= 1 && ministersShort >= 5) urgencyLevel = "critical";
        else if (daysUntilMass <= 3 && ministersShort >= 3) urgencyLevel = "high";
        else if (daysUntilMass <= 7 && ministersShort >= 2) urgencyLevel = "medium";
        const scheduledMinisterIds = new Set(
          scheduleGroup.filter((s) => s.ministerId).map((s) => s.ministerId)
        );
        const availableMinisters = allMinisters.filter((m) => !scheduledMinisterIds.has(m.id)).slice(0, 10).map((m) => ({
          id: m.id,
          name: m.name,
          lastServed: m.lastService ? new Date(m.lastService).toISOString().split("T")[0] : void 0
        }));
        pendencies.push({
          id: dateTimeKey,
          date: massDate,
          massTime,
          location: isSaoJudas ? "S\xE3o Judas" : location,
          isSpecial: isSaoJudas,
          specialName: isSaoJudas ? "Missa de S\xE3o Judas Tadeu" : void 0,
          minimumRequired,
          currentConfirmed,
          ministersShort,
          confirmedMinisters,
          availableMinisters,
          urgencyLevel
        });
      }
    }
    pendencies.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    res.json(pendencies);
  } catch (error) {
    console.error("Error fetching mass pendencies:", error);
    res.status(500).json({ message: "Erro ao buscar pend\xEAncias" });
  }
});
var mass_pendencies_default = router16;

// server/routes/formationAdmin.ts
await init_db();
init_schema();
import { Router as Router17 } from "express";
import { eq as eq23, asc as asc2 } from "drizzle-orm";
var router17 = Router17();
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "gestor" && req.user.role !== "coordenador") {
    return res.status(403).json({
      error: "Acesso negado",
      message: "Apenas gestores e coordenadores podem acessar esta funcionalidade"
    });
  }
  next();
}
router17.use(authenticateToken, requireAdmin);
router17.post("/seed", async (req, res) => {
  try {
    const { default: seedFormation2 } = await init_formation_seed().then(() => formation_seed_exports);
    const result = await seedFormation2();
    res.status(200).json({
      success: true,
      message: "Formation content seeded successfully",
      ...result
    });
  } catch (error) {
    console.error("Error running formation seed:", error);
    res.status(500).json({
      error: "Erro ao popular banco de dados",
      message: error.message,
      details: error.stack
    });
  }
});
router17.get("/tracks", async (req, res) => {
  try {
    const tracks = await db.select().from(formationTracks).orderBy(asc2(formationTracks.orderIndex));
    res.json({ tracks });
  } catch (error) {
    console.error("Error fetching formation tracks:", error);
    res.status(500).json({
      error: "Erro ao buscar trilhas de forma\xE7\xE3o",
      message: error.message
    });
  }
});
router17.get("/tracks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const track = await db.select().from(formationTracks).where(eq23(formationTracks.id, id)).limit(1);
    if (track.length === 0) {
      return res.status(404).json({
        error: "Trilha n\xE3o encontrada",
        message: `Trilha com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({ track: track[0] });
  } catch (error) {
    console.error("Error fetching formation track:", error);
    res.status(500).json({
      error: "Erro ao buscar trilha de forma\xE7\xE3o",
      message: error.message
    });
  }
});
router17.post("/tracks", async (req, res) => {
  try {
    const trackData = req.body;
    const newTrack = await db.insert(formationTracks).values(trackData).returning();
    res.status(201).json({
      message: "Trilha criada com sucesso",
      track: newTrack[0]
    });
  } catch (error) {
    console.error("Error creating formation track:", error);
    res.status(500).json({
      error: "Erro ao criar trilha de forma\xE7\xE3o",
      message: error.message
    });
  }
});
router17.patch("/tracks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.update(formationTracks).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq23(formationTracks.id, id)).returning();
    if (updated.length === 0) {
      return res.status(404).json({
        error: "Trilha n\xE3o encontrada",
        message: `Trilha com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Trilha atualizada com sucesso",
      track: updated[0]
    });
  } catch (error) {
    console.error("Error updating formation track:", error);
    res.status(500).json({
      error: "Erro ao atualizar trilha de forma\xE7\xE3o",
      message: error.message
    });
  }
});
router17.delete("/tracks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const modules = await db.select().from(formationModules).where(eq23(formationModules.trackId, id));
    if (modules.length > 0) {
      return res.status(400).json({
        error: "N\xE3o \xE9 poss\xEDvel deletar",
        message: "Esta trilha possui m\xF3dulos. Delete os m\xF3dulos primeiro ou desative a trilha."
      });
    }
    const deleted = await db.delete(formationTracks).where(eq23(formationTracks.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({
        error: "Trilha n\xE3o encontrada",
        message: `Trilha com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Trilha deletada com sucesso",
      track: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting formation track:", error);
    res.status(500).json({
      error: "Erro ao deletar trilha de forma\xE7\xE3o",
      message: error.message
    });
  }
});
router17.get("/tracks/:trackId/modules", async (req, res) => {
  try {
    const { trackId } = req.params;
    const modules = await db.select().from(formationModules).where(eq23(formationModules.trackId, trackId)).orderBy(asc2(formationModules.orderIndex));
    res.json({ modules });
  } catch (error) {
    console.error("Error fetching formation modules:", error);
    res.status(500).json({
      error: "Erro ao buscar m\xF3dulos",
      message: error.message
    });
  }
});
router17.get("/modules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const module = await db.select().from(formationModules).where(eq23(formationModules.id, id)).limit(1);
    if (module.length === 0) {
      return res.status(404).json({
        error: "M\xF3dulo n\xE3o encontrado",
        message: `M\xF3dulo com ID ${id} n\xE3o encontrado`
      });
    }
    res.json({ module: module[0] });
  } catch (error) {
    console.error("Error fetching formation module:", error);
    res.status(500).json({
      error: "Erro ao buscar m\xF3dulo",
      message: error.message
    });
  }
});
router17.post("/modules", async (req, res) => {
  try {
    const moduleData = req.body;
    const newModule = await db.insert(formationModules).values(moduleData).returning();
    res.status(201).json({
      message: "M\xF3dulo criado com sucesso",
      module: newModule[0]
    });
  } catch (error) {
    console.error("Error creating formation module:", error);
    res.status(500).json({
      error: "Erro ao criar m\xF3dulo",
      message: error.message
    });
  }
});
router17.patch("/modules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.update(formationModules).set(updates).where(eq23(formationModules.id, id)).returning();
    if (updated.length === 0) {
      return res.status(404).json({
        error: "M\xF3dulo n\xE3o encontrado",
        message: `M\xF3dulo com ID ${id} n\xE3o encontrado`
      });
    }
    res.json({
      message: "M\xF3dulo atualizado com sucesso",
      module: updated[0]
    });
  } catch (error) {
    console.error("Error updating formation module:", error);
    res.status(500).json({
      error: "Erro ao atualizar m\xF3dulo",
      message: error.message
    });
  }
});
router17.delete("/modules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lessons = await db.select().from(formationLessons).where(eq23(formationLessons.moduleId, id));
    if (lessons.length > 0) {
      return res.status(400).json({
        error: "N\xE3o \xE9 poss\xEDvel deletar",
        message: "Este m\xF3dulo possui li\xE7\xF5es. Delete as li\xE7\xF5es primeiro."
      });
    }
    const deleted = await db.delete(formationModules).where(eq23(formationModules.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({
        error: "M\xF3dulo n\xE3o encontrado",
        message: `M\xF3dulo com ID ${id} n\xE3o encontrado`
      });
    }
    res.json({
      message: "M\xF3dulo deletado com sucesso",
      module: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting formation module:", error);
    res.status(500).json({
      error: "Erro ao deletar m\xF3dulo",
      message: error.message
    });
  }
});
router17.get("/modules/:moduleId/lessons", async (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessons = await db.select().from(formationLessons).where(eq23(formationLessons.moduleId, moduleId)).orderBy(asc2(formationLessons.orderIndex));
    res.json({ lessons });
  } catch (error) {
    console.error("Error fetching formation lessons:", error);
    res.status(500).json({
      error: "Erro ao buscar li\xE7\xF5es",
      message: error.message
    });
  }
});
router17.get("/lessons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await db.select().from(formationLessons).where(eq23(formationLessons.id, id)).limit(1);
    if (lesson.length === 0) {
      return res.status(404).json({
        error: "Li\xE7\xE3o n\xE3o encontrada",
        message: `Li\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({ lesson: lesson[0] });
  } catch (error) {
    console.error("Error fetching formation lesson:", error);
    res.status(500).json({
      error: "Erro ao buscar li\xE7\xE3o",
      message: error.message
    });
  }
});
router17.post("/lessons", async (req, res) => {
  try {
    const lessonData = req.body;
    const newLesson = await db.insert(formationLessons).values(lessonData).returning();
    res.status(201).json({
      message: "Li\xE7\xE3o criada com sucesso",
      lesson: newLesson[0]
    });
  } catch (error) {
    console.error("Error creating formation lesson:", error);
    res.status(500).json({
      error: "Erro ao criar li\xE7\xE3o",
      message: error.message
    });
  }
});
router17.patch("/lessons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.update(formationLessons).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq23(formationLessons.id, id)).returning();
    if (updated.length === 0) {
      return res.status(404).json({
        error: "Li\xE7\xE3o n\xE3o encontrada",
        message: `Li\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Li\xE7\xE3o atualizada com sucesso",
      lesson: updated[0]
    });
  } catch (error) {
    console.error("Error updating formation lesson:", error);
    res.status(500).json({
      error: "Erro ao atualizar li\xE7\xE3o",
      message: error.message
    });
  }
});
router17.delete("/lessons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sections = await db.select().from(formationLessonSections).where(eq23(formationLessonSections.lessonId, id));
    if (sections.length > 0) {
      return res.status(400).json({
        error: "N\xE3o \xE9 poss\xEDvel deletar",
        message: "Esta li\xE7\xE3o possui se\xE7\xF5es. Delete as se\xE7\xF5es primeiro."
      });
    }
    const deleted = await db.delete(formationLessons).where(eq23(formationLessons.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({
        error: "Li\xE7\xE3o n\xE3o encontrada",
        message: `Li\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Li\xE7\xE3o deletada com sucesso",
      lesson: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting formation lesson:", error);
    res.status(500).json({
      error: "Erro ao deletar li\xE7\xE3o",
      message: error.message
    });
  }
});
router17.get("/lessons/:lessonId/sections", async (req, res) => {
  try {
    const { lessonId } = req.params;
    const sections = await db.select().from(formationLessonSections).where(eq23(formationLessonSections.lessonId, lessonId)).orderBy(asc2(formationLessonSections.orderIndex));
    res.json({ sections });
  } catch (error) {
    console.error("Error fetching lesson sections:", error);
    res.status(500).json({
      error: "Erro ao buscar se\xE7\xF5es",
      message: error.message
    });
  }
});
router17.get("/sections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const section = await db.select().from(formationLessonSections).where(eq23(formationLessonSections.id, id)).limit(1);
    if (section.length === 0) {
      return res.status(404).json({
        error: "Se\xE7\xE3o n\xE3o encontrada",
        message: `Se\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({ section: section[0] });
  } catch (error) {
    console.error("Error fetching lesson section:", error);
    res.status(500).json({
      error: "Erro ao buscar se\xE7\xE3o",
      message: error.message
    });
  }
});
router17.post("/sections", async (req, res) => {
  try {
    const sectionData = req.body;
    const newSection = await db.insert(formationLessonSections).values(sectionData).returning();
    res.status(201).json({
      message: "Se\xE7\xE3o criada com sucesso",
      section: newSection[0]
    });
  } catch (error) {
    console.error("Error creating lesson section:", error);
    res.status(500).json({
      error: "Erro ao criar se\xE7\xE3o",
      message: error.message
    });
  }
});
router17.patch("/sections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await db.update(formationLessonSections).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq23(formationLessonSections.id, id)).returning();
    if (updated.length === 0) {
      return res.status(404).json({
        error: "Se\xE7\xE3o n\xE3o encontrada",
        message: `Se\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Se\xE7\xE3o atualizada com sucesso",
      section: updated[0]
    });
  } catch (error) {
    console.error("Error updating lesson section:", error);
    res.status(500).json({
      error: "Erro ao atualizar se\xE7\xE3o",
      message: error.message
    });
  }
});
router17.delete("/sections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(formationLessonSections).where(eq23(formationLessonSections.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({
        error: "Se\xE7\xE3o n\xE3o encontrada",
        message: `Se\xE7\xE3o com ID ${id} n\xE3o encontrada`
      });
    }
    res.json({
      message: "Se\xE7\xE3o deletada com sucesso",
      section: deleted[0]
    });
  } catch (error) {
    console.error("Error deleting lesson section:", error);
    res.status(500).json({
      error: "Erro ao deletar se\xE7\xE3o",
      message: error.message
    });
  }
});
router17.post("/lessons/:lessonId/sections/reorder", async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { sectionIds } = req.body;
    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({
        error: "Dados inv\xE1lidos",
        message: "sectionIds deve ser um array"
      });
    }
    const updates = sectionIds.map(
      (id, index2) => db.update(formationLessonSections).set({ orderIndex: index2 }).where(eq23(formationLessonSections.id, id))
    );
    await Promise.all(updates);
    res.json({
      message: "Ordem das se\xE7\xF5es atualizada com sucesso"
    });
  } catch (error) {
    console.error("Error reordering sections:", error);
    res.status(500).json({
      error: "Erro ao reordenar se\xE7\xF5es",
      message: error.message
    });
  }
});
var formationAdmin_default = router17;

// server/routes/version.ts
import { Router as Router18 } from "express";
var router18 = Router18();
var SYSTEM_VERSION = "5.4.2";
var BUILD_TIME = (/* @__PURE__ */ new Date()).toISOString();
router18.get("/", (req, res) => {
  res.json({
    version: SYSTEM_VERSION,
    buildTime: BUILD_TIME,
    timestamp: Date.now()
  });
});
var version_default = router18;

// server/routes/liturgical.ts
await init_db();
init_schema();
import { Router as Router19 } from "express";
import { eq as eq24, and as and18, gte as gte11, lte as lte10 } from "drizzle-orm";

// shared/constants/massConfig.ts
var REGULAR_MASS_SCHEDULE = {
  SUNDAY: [
    { time: "08:00", min: 15, max: 20, label: "Missa das 8h" },
    { time: "10:00", min: 20, max: 28, label: "Missa das 10h" },
    { time: "19:00", min: 20, max: 28, label: "Missa das 19h" }
  ],
  WEEKDAY: [
    { time: "06:30", min: 5, max: 8, label: "Missa da Semana" }
  ],
  SATURDAY: [
    { time: "06:30", min: 5, max: 8, label: "Missa de S\xE1bado" }
  ]
};
var SPECIAL_MONTHLY_MASSES = {
  FIRST_THURSDAY_HEALING: {
    time: "19:30",
    // or 19:00 if holiday
    alternativeTime: "19:00",
    min: 20,
    max: 28,
    label: "Cura e Liberta\xE7\xE3o (1\xAA Quinta-feira)",
    description: "Missa de Cura e Liberta\xE7\xE3o na primeira quinta-feira do m\xEAs"
  },
  FIRST_FRIDAY_SACRED_HEART: {
    time: "06:30",
    min: 8,
    max: 12,
    label: "Sagrado Cora\xE7\xE3o (1\xAA Sexta-feira)",
    description: "Devo\xE7\xE3o ao Sagrado Cora\xE7\xE3o de Jesus"
  },
  FIRST_SATURDAY_IMMACULATE_HEART: {
    time: "06:30",
    min: 8,
    max: 12,
    label: "Imaculado Cora\xE7\xE3o (1\xBA S\xE1bado)",
    description: "Devo\xE7\xE3o ao Imaculado Cora\xE7\xE3o de Maria"
  }
};
var ST_JUDE_DAY_28_MASSES = {
  WEEKDAY: [
    { time: "07:00", min: 12, max: 12, label: "Missa da Manh\xE3" },
    { time: "15:00", min: 12, max: 12, label: "Missa da Tarde" },
    { time: "19:30", min: 20, max: 25, label: "Missa da Noite" }
  ],
  SATURDAY: [
    { time: "07:00", min: 12, max: 12, label: "Missa da Manh\xE3" },
    { time: "15:00", min: 12, max: 12, label: "Missa da Tarde" },
    { time: "19:00", min: 20, max: 25, label: "Missa da Noite" }
  ],
  SUNDAY: [
    { time: "08:00", min: 20, max: 20, label: "Missa das 8h" },
    { time: "10:00", min: 25, max: 28, label: "Missa das 10h" },
    { time: "15:00", min: 18, max: 20, label: "Missa das 15h" },
    { time: "19:00", min: 25, max: 28, label: "Missa das 19h" }
  ],
  // Special configuration for October 28 (Feast Day)
  OCTOBER_FEAST_DAY: [
    { time: "07:00", min: 12, max: 12, label: "Missa das 7h" },
    { time: "10:00", min: 12, max: 12, label: "Missa das 10h" },
    { time: "12:00", min: 12, max: 12, label: "Missa do Meio-dia" },
    { time: "15:00", min: 12, max: 12, label: "Missa das 15h" },
    { time: "17:00", min: 15, max: 15, label: "Missa das 17h" },
    { time: "19:30", min: 20, max: 25, label: "Missa Solene" }
  ]
};
var ST_JUDE_NOVENA_MASSES = {
  WEEKDAY: [
    { time: "19:30", min: 18, max: 20, label: "Missa da Novena" }
  ],
  SATURDAY: [
    { time: "19:00", min: 18, max: 20, label: "Missa da Novena" }
  ]
};
function getMassConfigForDate(date2) {
  const dayOfWeek = date2.getDay();
  const dayOfMonth = date2.getDate();
  const month = date2.getMonth();
  if (month === 9 && dayOfMonth >= 20 && dayOfMonth <= 27) {
    if (dayOfWeek === 6) {
      return ST_JUDE_NOVENA_MASSES.SATURDAY;
    }
    if (dayOfWeek !== 0) {
      return ST_JUDE_NOVENA_MASSES.WEEKDAY;
    }
  }
  if (month === 9 && dayOfMonth === 28) {
    return ST_JUDE_DAY_28_MASSES.OCTOBER_FEAST_DAY;
  }
  if (dayOfMonth === 28) {
    if (dayOfWeek === 0) {
      return ST_JUDE_DAY_28_MASSES.SUNDAY;
    }
    if (dayOfWeek === 6) {
      return ST_JUDE_DAY_28_MASSES.SATURDAY;
    }
    return ST_JUDE_DAY_28_MASSES.WEEKDAY;
  }
  if (dayOfWeek === 0) {
    return REGULAR_MASS_SCHEDULE.SUNDAY;
  }
  if (dayOfWeek === 6) {
    return REGULAR_MASS_SCHEDULE.SATURDAY;
  }
  return REGULAR_MASS_SCHEDULE.WEEKDAY;
}
function getSpecialMonthlyMass(date2) {
  const dayOfWeek = date2.getDay();
  const dayOfMonth = date2.getDate();
  if (dayOfWeek === 4 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_THURSDAY_HEALING;
  }
  if (dayOfWeek === 5 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_FRIDAY_SACRED_HEART;
  }
  if (dayOfWeek === 6 && dayOfMonth >= 1 && dayOfMonth <= 7) {
    return SPECIAL_MONTHLY_MASSES.FIRST_SATURDAY_IMMACULATE_HEART;
  }
  return null;
}

// server/utils/liturgicalQuestionnaireGenerator.ts
import { format as format8, addDays as addDays5, startOfMonth as startOfMonth4, endOfMonth as endOfMonth4, getDay as getDay4, isSunday as isSunday2 } from "date-fns";
import { ptBR as ptBR3 } from "date-fns/locale";
function generateSundayMasses(month, year) {
  const masses = [];
  const start = startOfMonth4(new Date(year, month - 1));
  const end = endOfMonth4(new Date(year, month - 1));
  let current = start;
  while (current <= end) {
    if (isSunday2(current)) {
      const dateStr = format8(current, "yyyy-MM-dd");
      const displayDate = format8(current, "dd 'de' MMMM", { locale: ptBR3 });
      masses.push({
        id: `${dateStr}_08:00`,
        date: dateStr,
        time: "08:00",
        displayText: `${displayDate} \xE0s 8h`,
        type: "sunday"
      });
      masses.push({
        id: `${dateStr}_10:00`,
        date: dateStr,
        time: "10:00",
        displayText: `${displayDate} \xE0s 10h`,
        type: "sunday"
      });
      masses.push({
        id: `${dateStr}_19:00`,
        date: dateStr,
        time: "19:00",
        displayText: `${displayDate} \xE0s 19h`,
        type: "sunday"
      });
    }
    current = addDays5(current, 1);
  }
  return masses;
}
function generateSpecialMasses(month, year) {
  const masses = [];
  const start = startOfMonth4(new Date(year, month - 1));
  const end = endOfMonth4(new Date(year, month - 1));
  let current = start;
  let firstThursday = null;
  let firstFriday = null;
  let firstSaturday = null;
  while (current <= end) {
    const dayOfWeek = getDay4(current);
    if (dayOfWeek === 4 && !firstThursday) {
      firstThursday = current;
      masses.push({
        id: `${format8(current, "yyyy-MM-dd")}_19:30`,
        date: format8(current, "yyyy-MM-dd"),
        time: "19:30",
        displayText: `Primeira Quinta-feira (${format8(current, "dd/MM")}) - Missa de Cura e Liberta\xE7\xE3o \xE0s 19h30`,
        type: "special"
      });
    }
    if (dayOfWeek === 5 && !firstFriday) {
      firstFriday = current;
      masses.push({
        id: `${format8(current, "yyyy-MM-dd")}_06:30`,
        date: format8(current, "yyyy-MM-dd"),
        time: "06:30",
        displayText: `Primeira Sexta-feira (${format8(current, "dd/MM")}) - Sagrado Cora\xE7\xE3o \xE0s 6h30`,
        type: "special"
      });
    }
    if (dayOfWeek === 6 && !firstSaturday) {
      firstSaturday = current;
      masses.push({
        id: `${format8(current, "yyyy-MM-dd")}_06:30`,
        date: format8(current, "yyyy-MM-dd"),
        time: "06:30",
        displayText: `Primeiro S\xE1bado (${format8(current, "dd/MM")}) - Imaculado Cora\xE7\xE3o \xE0s 6h30`,
        type: "special"
      });
    }
    current = addDays5(current, 1);
  }
  return masses;
}
function generateNovemberSpecialMasses(year) {
  const masses = [];
  const allSoulsDay = `${year}-11-02`;
  masses.push({
    id: `${allSoulsDay}_07:00`,
    date: allSoulsDay,
    time: "07:00",
    displayText: "Dia de Finados (2 de novembro) - Missa das 7h",
    type: "special"
  });
  masses.push({
    id: `${allSoulsDay}_10:00`,
    date: allSoulsDay,
    time: "10:00",
    displayText: "Dia de Finados (2 de novembro) - Missa das 10h",
    type: "special"
  });
  masses.push({
    id: `${allSoulsDay}_15:00`,
    date: allSoulsDay,
    time: "15:00",
    displayText: "Dia de Finados (2 de novembro) - Missa das 15h",
    type: "special"
  });
  return masses;
}
function generateDecemberSpecialMasses(year) {
  const masses = [];
  masses.push({
    id: `${year}-12-24_00:00`,
    date: `${year}-12-24`,
    time: "00:00",
    displayText: "Missa do Galo (24 de dezembro - 00h)",
    type: "special"
  });
  masses.push({
    id: `${year}-12-25_08:00`,
    date: `${year}-12-25`,
    time: "08:00",
    displayText: "Natal (25 de dezembro) - Missa das 8h",
    type: "special"
  });
  masses.push({
    id: `${year}-12-25_10:00`,
    date: `${year}-12-25`,
    time: "10:00",
    displayText: "Natal (25 de dezembro) - Missa das 10h",
    type: "special"
  });
  masses.push({
    id: `${year}-12-25_19:00`,
    date: `${year}-12-25`,
    time: "19:00",
    displayText: "Natal (25 de dezembro) - Missa das 19h",
    type: "special"
  });
  masses.push({
    id: `${year}-12-31_19:00`,
    date: `${year}-12-31`,
    time: "19:00",
    displayText: "R\xE9veillon (31 de dezembro) - Missa das 19h",
    type: "special"
  });
  return masses;
}
function generateLiturgicalQuestionnaire(month, year) {
  const theme = getLiturgicalTheme(month);
  if (!theme) {
    throw new Error(`No liturgical theme found for month ${month}`);
  }
  const sundayMasses = generateSundayMasses(month, year);
  const specialMasses = generateSpecialMasses(month, year);
  if (month === 11) {
    specialMasses.push(...generateNovemberSpecialMasses(year));
  } else if (month === 12) {
    specialMasses.push(...generateDecemberSpecialMasses(year));
  }
  const questions = [];
  questions.push({
    id: "sunday_masses",
    type: "checkbox_grid",
    question: `Missas Dominicais - ${theme.name}`,
    description: `Marque os hor\xE1rios em que voc\xEA pode servir. Tema lit\xFArgico: ${theme.description}`,
    options: sundayMasses.map((mass) => ({
      id: mass.id,
      date: mass.date,
      time: mass.time,
      label: mass.displayText
    })),
    required: true,
    section: "Missas Dominicais"
  });
  questions.push({
    id: "weekday_masses",
    type: "multiselect",
    question: "Missas Di\xE1rias (6h30)",
    description: "Em quais dias da semana voc\xEA pode servir nas missas di\xE1rias?",
    options: [
      { value: "monday", label: "Segunda-feira" },
      { value: "tuesday", label: "Ter\xE7a-feira" },
      { value: "wednesday", label: "Quarta-feira" },
      { value: "thursday", label: "Quinta-feira" },
      { value: "friday", label: "Sexta-feira" }
    ],
    required: false,
    section: "Missas Di\xE1rias"
  });
  if (specialMasses.length > 0) {
    questions.push({
      id: "special_masses",
      type: "checkbox_list",
      question: "Missas Especiais do M\xEAs",
      description: "Marque as missas especiais em que voc\xEA pode servir",
      options: specialMasses.map((mass) => ({
        id: mass.id,
        date: mass.date,
        time: mass.time,
        label: mass.displayText
      })),
      required: false,
      section: "Missas Especiais"
    });
  }
  questions.push({
    id: "can_substitute",
    type: "radio",
    question: "Dispon\xEDvel para substitui\xE7\xF5es de \xFAltima hora?",
    description: "Podemos contar com voc\xEA para substituir ministros ausentes?",
    options: [
      { value: "yes", label: "Sim, dispon\xEDvel para qualquer missa" },
      { value: "sundays_only", label: "Apenas para missas dominicais" },
      { value: "no", label: "N\xE3o posso fazer substitui\xE7\xF5es" }
    ],
    required: true,
    section: "Disponibilidade"
  });
  return {
    month,
    year,
    theme: {
      name: theme.name,
      color: theme.color,
      colorHex: theme.colorHex,
      description: theme.description
    },
    questions,
    metadata: {
      version: "2.0",
      structure: "liturgical",
      totalSundays: sundayMasses.length / 3,
      // 3 times per Sunday
      hasSpecialMasses: specialMasses.length > 0
    }
  };
}
function convertToAlgorithmFormat(responses, month, year) {
  const result = {
    version: "2.0",
    structure: "liturgical",
    availability: {},
    preferences: {
      max_per_month: 4,
      // Default
      preferred_times: [],
      avoid_times: []
    },
    substitute: {
      available: false,
      conditions: "no"
    },
    metadata: {
      total_availability: 0,
      submitted_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  if (responses.sunday_masses) {
    Object.keys(responses.sunday_masses).forEach((massId) => {
      if (responses.sunday_masses[massId] === true) {
        result.availability[massId] = true;
        result.metadata.total_availability++;
      }
    });
  }
  if (responses.weekday_masses && Array.isArray(responses.weekday_masses)) {
    const weekdayKey = "weekday_06:30";
    result.availability[weekdayKey] = responses.weekday_masses.map((day) => day);
    result.metadata.total_availability += responses.weekday_masses.length;
  }
  if (responses.special_masses) {
    Object.keys(responses.special_masses).forEach((massId) => {
      if (responses.special_masses[massId] === true) {
        result.availability[massId] = true;
        result.metadata.total_availability++;
      }
    });
  }
  if (responses.can_substitute) {
    switch (responses.can_substitute) {
      case "yes":
        result.substitute.available = true;
        result.substitute.conditions = "any";
        break;
      case "sundays_only":
        result.substitute.available = true;
        result.substitute.conditions = "only_sundays";
        break;
      case "no":
        result.substitute.available = false;
        result.substitute.conditions = "no";
        break;
    }
  }
  return result;
}

// server/routes/liturgical.ts
var router19 = Router19();
router19.get("/current-season", async (req, res) => {
  try {
    const currentDate = /* @__PURE__ */ new Date();
    const seasonInfo = getCurrentLiturgicalSeason(currentDate);
    const year = currentDate.getFullYear();
    const [liturgicalYear] = await db.select().from(liturgicalYears).where(eq24(liturgicalYears.year, year)).limit(1);
    res.json({
      success: true,
      data: {
        season: seasonInfo.name,
        color: seasonInfo.color,
        cycle: seasonInfo.cycle,
        year: liturgicalYear?.year || year,
        easterDate: liturgicalYear?.easterDate
      }
    });
  } catch (error) {
    console.error("Error fetching current liturgical season:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar temporada lit\xFArgica atual"
    });
  }
});
router19.get("/seasons/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const [liturgicalYear] = await db.select().from(liturgicalYears).where(eq24(liturgicalYears.year, year)).limit(1);
    if (!liturgicalYear) {
      return res.status(404).json({
        success: false,
        message: "Ano lit\xFArgico n\xE3o encontrado"
      });
    }
    const seasons = await db.select().from(liturgicalSeasons).where(eq24(liturgicalSeasons.yearId, liturgicalYear.id));
    res.json({
      success: true,
      data: {
        year: liturgicalYear.year,
        cycle: liturgicalYear.cycle,
        easterDate: liturgicalYear.easterDate,
        seasons
      }
    });
  } catch (error) {
    console.error("Error fetching liturgical seasons:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar temporadas lit\xFArgicas"
    });
  }
});
router19.get("/celebrations/:year/:month", async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const [liturgicalYear] = await db.select().from(liturgicalYears).where(eq24(liturgicalYears.year, year)).limit(1);
    if (!liturgicalYear) {
      return res.status(404).json({
        success: false,
        message: "Ano lit\xFArgico n\xE3o encontrado"
      });
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const celebrations = await db.select().from(liturgicalCelebrations).where(
      and18(
        eq24(liturgicalCelebrations.yearId, liturgicalYear.id),
        gte11(liturgicalCelebrations.date, startDate.toISOString().split("T")[0]),
        lte10(liturgicalCelebrations.date, endDate.toISOString().split("T")[0])
      )
    ).orderBy(liturgicalCelebrations.date);
    res.json({
      success: true,
      data: {
        year,
        month,
        celebrations
      }
    });
  } catch (error) {
    console.error("Error fetching liturgical celebrations:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar celebra\xE7\xF5es lit\xFArgicas"
    });
  }
});
router19.get("/celebration/:date", async (req, res) => {
  try {
    const dateStr = req.params.date;
    const date2 = new Date(dateStr);
    const year = date2.getFullYear();
    const [liturgicalYear] = await db.select().from(liturgicalYears).where(eq24(liturgicalYears.year, year)).limit(1);
    if (!liturgicalYear) {
      return res.json({
        success: true,
        data: null
      });
    }
    const [celebration] = await db.select().from(liturgicalCelebrations).where(
      and18(
        eq24(liturgicalCelebrations.yearId, liturgicalYear.id),
        eq24(liturgicalCelebrations.date, dateStr)
      )
    ).limit(1);
    res.json({
      success: true,
      data: celebration || null
    });
  } catch (error) {
    console.error("Error fetching celebration for date:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar celebra\xE7\xE3o"
    });
  }
});
router19.get("/mass-config/:date", async (req, res) => {
  try {
    const dateStr = req.params.date;
    const date2 = new Date(dateStr);
    const year = date2.getFullYear();
    const [liturgicalYear] = await db.select().from(liturgicalYears).where(eq24(liturgicalYears.year, year)).limit(1);
    const overrides = await db.select().from(liturgicalMassOverrides).where(eq24(liturgicalMassOverrides.date, dateStr));
    if (overrides.length > 0) {
      return res.json({
        success: true,
        data: {
          date: dateStr,
          masses: overrides.map((override) => ({
            time: override.time,
            min: override.minMinisters,
            max: override.maxMinisters,
            label: override.description || `Missa das ${override.time}`,
            isOverride: true
          })),
          source: "override"
        }
      });
    }
    if (liturgicalYear) {
      const [celebration] = await db.select().from(liturgicalCelebrations).where(
        and18(
          eq24(liturgicalCelebrations.yearId, liturgicalYear.id),
          eq24(liturgicalCelebrations.date, dateStr)
        )
      ).limit(1);
      if (celebration?.specialMassConfig) {
        const config = celebration.specialMassConfig;
        if (config.times && config.minMinisters && config.maxMinisters) {
          return res.json({
            success: true,
            data: {
              date: dateStr,
              celebration: celebration.name,
              rank: celebration.rank,
              color: celebration.color,
              masses: config.times.map((time2) => ({
                time: time2,
                min: config.minMinisters[time2],
                max: config.maxMinisters[time2],
                label: `${celebration.name} - ${time2}`,
                requiresProcession: config.requiresProcession,
                requiresIncense: config.requiresIncense
              })),
              source: "celebration"
            }
          });
        }
      }
    }
    const massConfig = getMassConfigForDate(date2);
    const specialMonthlyMass = getSpecialMonthlyMass(date2);
    const masses = massConfig.map((config) => ({
      time: config.time,
      min: config.min,
      max: config.max,
      label: config.label || `Missa das ${config.time}`
    }));
    if (specialMonthlyMass) {
      masses.push({
        time: specialMonthlyMass.time,
        min: specialMonthlyMass.min,
        max: specialMonthlyMass.max,
        label: specialMonthlyMass.label || `Missa das ${specialMonthlyMass.time}`
      });
    }
    res.json({
      success: true,
      data: {
        date: dateStr,
        masses,
        source: "default",
        specialInfo: {
          isStJudeDay: isStJudeDay(date2),
          isStJudeNovena: isStJudeNovena(date2),
          isStJudeFeast: isStJudeFeast(date2)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching mass configuration:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar configura\xE7\xE3o de missas"
    });
  }
});
router19.post("/overrides", async (req, res) => {
  try {
    const { date: date2, time: time2, minMinisters, maxMinisters, description, reason } = req.body;
    if (!date2 || !time2 || !minMinisters || !maxMinisters) {
      return res.status(400).json({
        success: false,
        message: "Dados incompletos: date, time, minMinisters, maxMinisters s\xE3o obrigat\xF3rios"
      });
    }
    const [override] = await db.insert(liturgicalMassOverrides).values({
      date: date2,
      time: time2,
      minMinisters,
      maxMinisters,
      description,
      reason,
      createdBy: "admin"
      // TODO: Use req.user.id
    }).returning();
    res.json({
      success: true,
      data: override,
      message: "Override de missa criado com sucesso"
    });
  } catch (error) {
    console.error("Error creating mass override:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar override de missa"
    });
  }
});
router19.get("/overrides/:date", async (req, res) => {
  try {
    const { date: date2 } = req.params;
    const overrides = await db.select().from(liturgicalMassOverrides).where(eq24(liturgicalMassOverrides.date, date2));
    res.json({
      success: true,
      data: overrides
    });
  } catch (error) {
    console.error("Error fetching mass overrides:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar overrides de missa"
    });
  }
});
router19.delete("/overrides/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(liturgicalMassOverrides).where(eq24(liturgicalMassOverrides.id, id));
    res.json({
      success: true,
      message: "Override de missa removido com sucesso"
    });
  } catch (error) {
    console.error("Error deleting mass override:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover override de missa"
    });
  }
});
router19.get("/questionnaire/:year/:month", (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }
    const questionnaire = generateLiturgicalQuestionnaire(month, year);
    res.json(questionnaire);
  } catch (error) {
    console.error("[LITURGICAL] Error generating questionnaire:", error);
    res.status(500).json({ error: "Failed to generate questionnaire" });
  }
});
router19.post("/convert", (req, res) => {
  try {
    const { responses, month, year } = req.body;
    if (!responses || !month || !year) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const algorithmFormat = convertToAlgorithmFormat(responses, month, year);
    res.json(algorithmFormat);
  } catch (error) {
    console.error("[LITURGICAL] Error converting responses:", error);
    res.status(500).json({ error: "Failed to convert responses" });
  }
});
var liturgical_default = router19;

// server/routes/saints.ts
await init_db();
init_schema();
import { Router as Router20 } from "express";
import { eq as eq25, sql as sql15, like, or as or8 } from "drizzle-orm";
var router20 = Router20();
function getMonthName2(month) {
  const monthNames2 = [
    "janeiro",
    "fevereiro",
    "mar\xE7o",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];
  return monthNames2[month - 1] || "desconhecido";
}
router20.get("/today", async (req, res) => {
  try {
    console.log("[LITURGY API] Buscando liturgia do dia...");
    const today = /* @__PURE__ */ new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const feastDay = `${month}-${day}`;
    try {
      const liturgyUrl = "https://www.paulus.com.br/portal/liturgia-diaria/";
      console.log(`[LITURGY API] Fazendo fetch de ${liturgyUrl}`);
      const response = await fetch(liturgyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();
      console.log(`[LITURGY API] HTML recebido, tamanho: ${html.length} caracteres`);
      let liturgyTitle = "Liturgia do Dia";
      let liturgyColor = "green";
      let liturgyRank = "MEMORIAL";
      let firstReading = { reference: "", text: "" };
      let secondReading = { reference: "", text: "" };
      let gospel = { reference: "", text: "" };
      let psalm = { reference: "", response: "" };
      let homily = "";
      const titleMatches = [
        html.match(/<h1[^>]*>([^<]*(?:domingo|segunda|terça|quarta|quinta|sexta|sábado)[^<]*)<\/h1>/i),
        html.match(/<h2[^>]*class="[^"]*titulo[^"]*"[^>]*>([^<]+)<\/h2>/i),
        html.match(/<div[^>]*class="[^"]*celebracao[^"]*"[^>]*>([^<]+)<\/div>/i),
        html.match(/<span[^>]*class="[^"]*celebracao[^"]*"[^>]*>([^<]+)<\/span>/i),
        html.match(/<title>([^<]*Liturgia[^<]*)<\/title>/i)
      ];
      for (const match of titleMatches) {
        if (match) {
          liturgyTitle = match[1].trim().replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").replace(/Liturgia Diária/i, "").replace(/Liturgia de hoje/i, "").replace(/Paulus/i, "").replace(/[-–—]/g, "").trim();
          if (liturgyTitle.length > 5) break;
        }
      }
      const colorPatterns = [
        /cor\s+lit[uú]rgica\s*:\s*([a-záéíóúâêôãõç]+)/i,
        /lit[uú]rgica\s*:\s*([a-záéíóúâêôãõç]+)/i,
        /color[^>]*>([a-záéíóúâêôãõç]+)</i
      ];
      for (const pattern of colorPatterns) {
        const match = html.match(pattern);
        if (match) {
          const colorMap = {
            "verde": "green",
            "branco": "white",
            "branca": "white",
            "vermelho": "red",
            "vermelha": "red",
            "roxo": "purple",
            "roxa": "purple",
            "violeta": "purple",
            "rosa": "rose"
          };
          liturgyColor = colorMap[match[1].toLowerCase()] || "green";
          break;
        }
      }
      if (html.match(/solenidade/i)) {
        liturgyRank = "SOLEMNITY";
      } else if (html.match(/festa/i)) {
        liturgyRank = "FEAST";
      } else if (html.match(/mem[oó]ria\s+obrigat[oó]ria/i)) {
        liturgyRank = "MEMORIAL";
      } else if (html.match(/mem[oó]ria/i)) {
        liturgyRank = "OPTIONAL_MEMORIAL";
      } else {
        liturgyRank = "FERIAL";
      }
      const firstReadingPatterns = [
        /(?:1[ªa°]?\s*Leitura|Primeira\s+Leitura)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>(?:1[ªa°]?\s*Leitura|Primeira\s+Leitura)<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*primeira[^"]*leitura[^"]*"[^>]*>([^<]+)/i
      ];
      for (const pattern of firstReadingPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          firstReading.reference = match[1].trim().replace(/\s+/g, " ").replace(/[()]/g, "");
          break;
        }
      }
      if (firstReading.reference) {
        const firstTextMatch = html.match(new RegExp(
          firstReading.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]{0,50}?<[^>]*>([\\s\\S]{100,2000}?)(?:<\\/[pdiv]|<h[2-4]|1[\xAAa\xB0]?\\s*Leitura)",
          "i"
        ));
        if (firstTextMatch) {
          firstReading.text = firstTextMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().substring(0, 1500);
        }
      }
      const secondReadingPatterns = [
        /(?:2[ªa°]?\s*Leitura|Segunda\s+Leitura)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>(?:2[ªa°]?\s*Leitura|Segunda\s+Leitura)<\/h[2-4]>\s*<[^>]*>([^<]+)/i
      ];
      for (const pattern of secondReadingPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          secondReading.reference = match[1].trim().replace(/\s+/g, " ").replace(/[()]/g, "");
          const secondTextMatch = html.match(new RegExp(
            secondReading.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]{0,50}?<[^>]*>([\\s\\S]{100,2000}?)(?:<\\/[pdiv]|<h[2-4]|Evangelho)",
            "i"
          ));
          if (secondTextMatch) {
            secondReading.text = secondTextMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().substring(0, 1500);
          }
          break;
        }
      }
      const psalmPatterns = [
        /(?:Salmo\s+Responsorial|Salmo)[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>Salmo[^<]*<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*salmo[^"]*"[^>]*>([^<]+)/i
      ];
      for (const pattern of psalmPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          psalm.reference = match[1].trim().replace(/\s+/g, " ").replace(/[()]/g, "");
          break;
        }
      }
      const psalmResponsePatterns = [
        /(?:Respons[oó]rio|Refr[ãa]o)[:\s]*[–—-]?\s*([^<\n.]+)/i,
        /<[^>]*class="[^"]*respons[^"]*"[^>]*>([^<]+)/i,
        /<em>([^<]{10,100})<\/em>/i
        // Muitas vezes o refrão vem em itálico
      ];
      for (const pattern of psalmResponsePatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 8) {
          psalm.response = match[1].trim().replace(/\s+/g, " ").replace(/[."]/g, "");
          break;
        }
      }
      const gospelPatterns = [
        /Evangelho[:\s]*[(<]*([^<)\n]+[0-9][^<)\n]*)/i,
        /<h[2-4][^>]*>Evangelho<\/h[2-4]>\s*<[^>]*>([^<]+)/i,
        /class="[^"]*evangelho[^"]*"[^>]*>([^<]+)/i
      ];
      for (const pattern of gospelPatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 3) {
          gospel.reference = match[1].trim().replace(/\s+/g, " ").replace(/[()]/g, "");
          const gospelTextMatch = html.match(new RegExp(
            gospel.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]{0,50}?<[^>]*>([\\s\\S]{100,3000}?)(?:<\\/[pdiv]|<h[2-4]|Medita)",
            "i"
          ));
          if (gospelTextMatch) {
            gospel.text = gospelTextMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().substring(0, 2e3);
          }
          break;
        }
      }
      const meditationPatterns = [
        /<div[^>]*class="[^"]*medita[çc][ãa]o[^"]*"[^>]*>([\s\S]{100,800}?)<\/div>/i,
        /<div[^>]*class="[^"]*reflex[ãa]o[^"]*"[^>]*>([\s\S]{100,800}?)<\/div>/i,
        /<article[^>]*class="[^"]*contempla[^"]*"[^>]*>([\s\S]{100,800}?)<\/article>/i,
        /<p[^>]*class="[^"]*medita[^"]*"[^>]*>([^<]{100,500})<\/p>/i,
        /(?:Medita[çc][ãa]o|Reflex[ãa]o)[:\s]*<[^>]*>([\s\S]{100,600}?)(?:<\/[pdiv]|<h[2-4])/i
      ];
      for (const pattern of meditationPatterns) {
        const match = html.match(pattern);
        if (match) {
          homily = match[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim().substring(0, 500);
          if (homily.length > 80) break;
        }
      }
      if (liturgyTitle.length > 5 || firstReading.reference || gospel.reference) {
        const liturgyData = {
          id: `liturgy-${day}-${month}`,
          name: liturgyTitle,
          feastDay,
          biography: createRichLiturgyDescription(
            firstReading,
            secondReading,
            psalm,
            gospel,
            homily
          ),
          isBrazilian: false,
          rank: liturgyRank,
          liturgicalColor: liturgyColor,
          title: getRankLabel(liturgyRank),
          patronOf: void 0,
          collectPrayer: homily || void 0,
          firstReading: firstReading.reference ? firstReading : void 0,
          secondReading: secondReading.reference ? secondReading : void 0,
          responsorialPsalm: psalm.reference ? psalm : void 0,
          gospel: gospel.reference ? gospel : void 0,
          attributes: void 0,
          quotes: homily ? [homily.substring(0, 200) + "..."] : void 0
        };
        console.log(`[LITURGY API] Liturgia encontrada: ${liturgyData.name}`);
        console.log(`[LITURGY API] Leituras: 1\xAA=${firstReading.reference}, 2\xAA=${secondReading.reference || "N/A"}, Salmo=${psalm.reference}, Ev=${gospel.reference}`);
        return res.json({
          success: true,
          data: {
            date: today.toISOString().split("T")[0],
            feastDay,
            saints: [liturgyData],
            source: "paulus"
          }
        });
      }
    } catch (liturgyError) {
      console.error("[LITURGY API] Erro ao buscar liturgia da Paulus:", liturgyError);
    }
    console.log("[LITURGY API] Usando liturgia gen\xE9rica");
    const weekday = today.toLocaleDateString("pt-BR", { weekday: "long" });
    const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const genericLiturgy = {
      id: `generic-${feastDay}`,
      name: `${weekdayCapitalized}, ${day} de ${getMonthName2(parseInt(month))}`,
      feastDay,
      biography: `\u{1F4D6} Liturgia do dia ${day} de ${getMonthName2(parseInt(month))} de ${today.getFullYear()}.

Para acessar as leituras completas e reflex\xF5es do dia, visite: https://www.paulus.com.br/portal/liturgia-diaria/

L\xE1 voc\xEA encontrar\xE1:
\u2022 Primeira e Segunda Leituras
\u2022 Salmo Responsorial
\u2022 Evangelho do dia
\u2022 Medita\xE7\xE3o e reflex\xF5es`,
      isBrazilian: false,
      rank: "FERIAL",
      liturgicalColor: "green",
      title: "Liturgia Di\xE1ria",
      patronOf: void 0,
      collectPrayer: void 0,
      firstReading: void 0,
      responsorialPsalm: void 0,
      gospel: void 0,
      attributes: ["Liturgia Di\xE1ria", "Paulus"],
      quotes: void 0
    };
    res.json({
      success: true,
      data: {
        date: today.toISOString().split("T")[0],
        feastDay,
        saints: [genericLiturgy],
        source: "generic"
      }
    });
  } catch (error) {
    console.error("[LITURGY API] Error fetching liturgy:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar liturgia do dia"
    });
  }
});
function getRankLabel(rank) {
  const labels = {
    "SOLEMNITY": "Solenidade",
    "FEAST": "Festa",
    "MEMORIAL": "Mem\xF3ria",
    "OPTIONAL_MEMORIAL": "Mem\xF3ria Facultativa",
    "FERIAL": "Feria do Tempo Comum"
  };
  return labels[rank] || "Liturgia Di\xE1ria";
}
function createRichLiturgyDescription(firstReading, secondReading, psalm, gospel, meditation) {
  const parts = [];
  if (firstReading.reference) {
    let firstText = `\u{1F4D6} **Primeira Leitura**
${firstReading.reference}`;
    if (firstReading.text) {
      firstText += `

${firstReading.text}`;
    }
    parts.push(firstText);
  }
  if (secondReading.reference) {
    let secondText = `\u{1F4D6} **Segunda Leitura**
${secondReading.reference}`;
    if (secondReading.text) {
      secondText += `

${secondReading.text}`;
    }
    parts.push(secondText);
  }
  if (psalm.reference) {
    let psalmText = `\u{1F3B5} **Salmo Responsorial**
${psalm.reference}`;
    if (psalm.response) {
      psalmText += `

_Refr\xE3o: "${psalm.response}"_`;
    }
    parts.push(psalmText);
  }
  if (gospel.reference) {
    let gospelText = `\u271D\uFE0F **Evangelho**
${gospel.reference}`;
    if (gospel.text) {
      gospelText += `

${gospel.text}`;
    }
    parts.push(gospelText);
  }
  if (meditation) {
    parts.push(`
\u{1F4AC} **Medita\xE7\xE3o**
${meditation}...`);
  }
  if (parts.length > 0) {
    parts.push(`
\u{1F517} **Acesse o conte\xFAdo completo:**
https://www.paulus.com.br/portal/liturgia-diaria/`);
    return parts.join("\n\n");
  }
  return "Consulte www.paulus.com.br/portal/liturgia-diaria/ para as leituras completas e reflex\xF5es do dia.";
}
router20.get("/date/:date", async (req, res) => {
  try {
    const dateStr = req.params.date;
    const date2 = new Date(dateStr);
    const month = String(date2.getMonth() + 1).padStart(2, "0");
    const day = String(date2.getDate()).padStart(2, "0");
    const feastDay = `${month}-${day}`;
    const saintsOnDate = await db.select().from(saints).where(eq25(saints.feastDay, feastDay)).orderBy(saints.rank);
    res.json({
      success: true,
      data: {
        date: dateStr,
        feastDay,
        saints: saintsOnDate
      }
    });
  } catch (error) {
    console.error("Error fetching saints for date:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santos da data"
    });
  }
});
router20.get("/month/:month", async (req, res) => {
  try {
    const month = String(req.params.month).padStart(2, "0");
    const monthSaints = await db.select().from(saints).where(like(saints.feastDay, `${month}-%`)).orderBy(saints.feastDay);
    res.json({
      success: true,
      data: {
        month: parseInt(month),
        saints: monthSaints
      }
    });
  } catch (error) {
    console.error("Error fetching saints for month:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santos do m\xEAs"
    });
  }
});
router20.get("/brazilian", async (req, res) => {
  try {
    const brazilianSaints = await db.select().from(saints).where(eq25(saints.isBrazilian, true)).orderBy(saints.feastDay);
    res.json({
      success: true,
      data: brazilianSaints
    });
  } catch (error) {
    console.error("Error fetching Brazilian saints:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santos brasileiros"
    });
  }
});
router20.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [saint] = await db.select().from(saints).where(eq25(saints.id, id)).limit(1);
    if (!saint) {
      return res.status(404).json({
        success: false,
        message: "Santo n\xE3o encontrado"
      });
    }
    res.json({
      success: true,
      data: saint
    });
  } catch (error) {
    console.error("Error fetching saint:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santo"
    });
  }
});
router20.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const searchResults = await db.select().from(saints).where(
      or8(
        like(saints.name, `%${query}%`),
        like(saints.title, `%${query}%`),
        like(saints.patronOf, `%${query}%`)
      )
    ).orderBy(saints.feastDay);
    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    console.error("Error searching saints:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santos"
    });
  }
});
router20.get("/name-match/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const nameParts = name.toLowerCase().split(" ");
    const matchingSaints = await db.select().from(saints).where(
      sql15`LOWER(${saints.name}) LIKE ANY(ARRAY[${sql15.join(
        nameParts.map((part) => sql15`${"%" + part + "%"}`),
        sql15`, `
      )}])`
    ).orderBy(saints.rank);
    const saintsWithScore = matchingSaints.map((saint) => {
      const saintNameLower = saint.name.toLowerCase();
      let score = 0;
      nameParts.forEach((part) => {
        if (saintNameLower.includes(part)) {
          score += part.length;
        }
      });
      return {
        ...saint,
        matchScore: score
      };
    });
    saintsWithScore.sort((a, b) => b.matchScore - a.matchScore);
    res.json({
      success: true,
      data: {
        ministerName: name,
        matches: saintsWithScore
      }
    });
  } catch (error) {
    console.error("Error matching saint names:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar correspond\xEAncia de nomes"
    });
  }
});
router20.get("/readings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [saint] = await db.select({
      name: saints.name,
      feastDay: saints.feastDay,
      rank: saints.rank,
      liturgicalColor: saints.liturgicalColor,
      collectPrayer: saints.collectPrayer,
      firstReading: saints.firstReading,
      responsorialPsalm: saints.responsorialPsalm,
      gospel: saints.gospel,
      prayerOfTheFaithful: saints.prayerOfTheFaithful,
      communionAntiphon: saints.communionAntiphon
    }).from(saints).where(eq25(saints.id, id)).limit(1);
    if (!saint) {
      return res.status(404).json({
        success: false,
        message: "Santo n\xE3o encontrado"
      });
    }
    res.json({
      success: true,
      data: saint
    });
  } catch (error) {
    console.error("Error fetching saint readings:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar leituras do santo"
    });
  }
});
router20.get("/", async (req, res) => {
  try {
    const { rank, brazilian } = req.query;
    let query = db.select().from(saints);
    if (rank) {
      query = query.where(eq25(saints.rank, rank));
    }
    if (brazilian === "true") {
      query = query.where(eq25(saints.isBrazilian, true));
    }
    const allSaints = await query.orderBy(saints.feastDay);
    res.json({
      success: true,
      data: allSaints
    });
  } catch (error) {
    console.error("Error fetching all saints:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar santos"
    });
  }
});
var saints_default = router20;

// server/routes/dashboard.ts
await init_db();
init_schema();
import { Router as Router21 } from "express";
import { eq as eq26, and as and19, gte as gte12, lte as lte11, sql as sql16, or as or9, isNull, count as count6, desc as desc9 } from "drizzle-orm";
import { format as format9, addDays as addDays6, subDays, startOfMonth as startOfMonth5, endOfMonth as endOfMonth5 } from "date-fns";
var router21 = Router21();
router21.get("/urgent-alerts", async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const next48Hours = addDays6(now, 2);
    const next7Days = addDays6(now, 7);
    const incompleteMasses = await db.select({
      date: schedules.date,
      time: schedules.time,
      totalSlots: sql16`COUNT(*)`,
      filledSlots: sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NOT NULL THEN 1 END)`,
      vacancies: sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`
    }).from(schedules).where(
      and19(
        eq26(schedules.status, "published"),
        gte12(schedules.date, format9(now, "yyyy-MM-dd")),
        lte11(schedules.date, format9(next7Days, "yyyy-MM-dd"))
      )
    ).groupBy(schedules.date, schedules.time).having(sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`);
    const criticalMasses = incompleteMasses.filter((mass) => new Date(mass.date) <= next48Hours).map((m) => ({
      ...m,
      hoursUntil: Math.round((new Date(m.date).getTime() - now.getTime()) / (1e3 * 60 * 60)),
      massTime: m.time
    }));
    const regularIncomplete = incompleteMasses.filter((mass) => new Date(mass.date) > next48Hours).map((m) => ({
      ...m,
      massTime: m.time
    }));
    const pendingSubstitutions = await db.select({
      id: substitutionRequests.id,
      scheduleId: substitutionRequests.scheduleId,
      requesterId: substitutionRequests.requesterId,
      requesterName: users.name,
      reason: substitutionRequests.reason,
      status: substitutionRequests.status,
      massDate: schedules.date,
      massTime: schedules.time
    }).from(substitutionRequests).innerJoin(users, eq26(substitutionRequests.requesterId, users.id)).innerJoin(schedules, eq26(substitutionRequests.scheduleId, schedules.id)).where(
      and19(
        eq26(schedules.status, "published"),
        or9(
          eq26(substitutionRequests.status, "pending"),
          eq26(substitutionRequests.status, "available")
        ),
        gte12(schedules.date, format9(now, "yyyy-MM-dd"))
      )
    ).orderBy(schedules.date);
    const urgentSubstitutions = pendingSubstitutions.filter((sub) => new Date(sub.massDate) <= next48Hours).map((s) => ({
      ...s,
      hoursUntil: Math.round((new Date(s.massDate).getTime() - now.getTime()) / (1e3 * 60 * 60))
    }));
    const regularSubstitutions = pendingSubstitutions.filter((sub) => new Date(sub.massDate) > next48Hours);
    res.json({
      success: true,
      data: {
        criticalMasses,
        incompleteMasses: regularIncomplete,
        urgentSubstitutions,
        pendingSubstitutions: regularSubstitutions,
        totalAlerts: criticalMasses.length + urgentSubstitutions.length
      }
    });
  } catch (error) {
    console.error("[DASHBOARD_ALERTS] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch urgent alerts" });
  }
});
router21.get("/next-week-masses", async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const next7Days = addDays6(now, 7);
    const masses = await db.select({
      date: schedules.date,
      massTime: schedules.time,
      totalSlots: sql16`COUNT(*)`,
      totalAssigned: sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NOT NULL THEN 1 END)`,
      totalVacancies: sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
      requiredMinisters: sql16`COUNT(*)`,
      // All slots are required
      hasPendingSubstitutions: sql16`EXISTS(
          SELECT 1 FROM ${substitutionRequests}
          WHERE ${substitutionRequests.scheduleId} IN (
            SELECT id FROM ${schedules} AS s2
            WHERE s2.date = ${schedules.date} AND s2.time = ${schedules.time}
          )
          AND ${substitutionRequests.status} IN ('pending', 'available')
        )`
    }).from(schedules).where(
      and19(
        eq26(schedules.status, "published"),
        gte12(schedules.date, format9(now, "yyyy-MM-dd")),
        lte11(schedules.date, format9(next7Days, "yyyy-MM-dd"))
      )
    ).groupBy(schedules.date, schedules.time).orderBy(schedules.date, schedules.time);
    const massesWithStatus = masses.map((mass) => {
      const staffingRate = mass.requiredMinisters > 0 ? mass.totalAssigned / mass.requiredMinisters * 100 : 0;
      let status = "full";
      if (staffingRate < 80) status = "critical";
      else if (staffingRate < 100) status = "warning";
      const id = `${mass.date}-${mass.massTime}`;
      return {
        id,
        date: mass.date,
        massTime: mass.massTime,
        totalAssigned: mass.totalAssigned,
        totalVacancies: mass.totalVacancies,
        requiredMinisters: mass.requiredMinisters,
        staffingRate: Math.round(staffingRate),
        status,
        hasPendingSubstitutions: mass.hasPendingSubstitutions
      };
    });
    res.json({
      success: true,
      data: massesWithStatus
    });
  } catch (error) {
    console.error("[DASHBOARD_NEXT_WEEK] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch next week masses" });
  }
});
router21.get("/ministry-stats", async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const thisMonthStart = startOfMonth5(now);
    const thisMonthEnd = endOfMonth5(now);
    const [activeMinistersResult] = await db.select({ count: count6() }).from(users).where(
      and19(
        eq26(users.status, "active"),
        or9(
          eq26(users.role, "ministro"),
          eq26(users.role, "coordenador")
        )
      )
    );
    const inactiveMinisters = await db.select({
      id: users.id,
      name: users.name,
      lastService: users.lastService,
      daysSinceService: sql16`EXTRACT(DAY FROM NOW() - ${users.lastService})`
    }).from(users).where(
      and19(
        eq26(users.status, "active"),
        or9(
          eq26(users.role, "ministro"),
          eq26(users.role, "coordenador")
        ),
        or9(
          lte11(users.lastService, thirtyDaysAgo),
          isNull(users.lastService)
        )
      )
    ).orderBy(desc9(sql16`EXTRACT(DAY FROM NOW() - ${users.lastService})`));
    const [monthStats] = await db.select({
      totalMasses: sql16`COUNT(DISTINCT (${schedules.date}, ${schedules.time}))`,
      fullyStaffedMasses: sql16`COUNT(DISTINCT CASE
          WHEN NOT EXISTS(
            SELECT 1 FROM schedules AS s2
            WHERE s2.date = ${schedules.date}
            AND s2.time = ${schedules.time}
            AND s2.minister_id IS NULL
            AND s2.status = 'published'
          ) THEN (${schedules.date}, ${schedules.time})
        END)`
    }).from(schedules).where(
      and19(
        eq26(schedules.status, "published"),
        gte12(schedules.date, format9(thisMonthStart, "yyyy-MM-dd")),
        lte11(schedules.date, format9(thisMonthEnd, "yyyy-MM-dd"))
      )
    );
    const [currentQuestionnaire] = await db.select({
      id: questionnaires.id,
      status: questionnaires.status
    }).from(questionnaires).where(
      and19(
        eq26(questionnaires.month, now.getMonth() + 1),
        eq26(questionnaires.year, now.getFullYear())
      )
    ).limit(1);
    let responseRate = 0;
    if (currentQuestionnaire) {
      const [responseStats] = await db.select({
        totalResponses: count6(questionnaireResponses.id)
      }).from(questionnaireResponses).where(eq26(questionnaireResponses.questionnaireId, currentQuestionnaire.id));
      responseRate = Math.round(
        responseStats.totalResponses / (activeMinistersResult.count || 1) * 100
      );
    }
    const [pendingSubsCount] = await db.select({ count: count6() }).from(substitutionRequests).where(
      and19(
        or9(
          eq26(substitutionRequests.status, "pending"),
          eq26(substitutionRequests.status, "available")
        )
      )
    );
    const [incompleteMassesCount] = await db.select({
      count: sql16`COUNT(DISTINCT (${schedules.date}, ${schedules.time}))`
    }).from(schedules).where(
      and19(
        eq26(schedules.status, "published"),
        gte12(schedules.date, format9(now, "yyyy-MM-dd")),
        isNull(schedules.ministerId)
      )
    );
    res.json({
      success: true,
      data: {
        activeMinisters: activeMinistersResult.count,
        responseRate,
        monthCoverage: {
          total: monthStats?.totalMasses || 0,
          fullyStaffed: monthStats?.fullyStaffedMasses || 0,
          percentage: monthStats?.totalMasses > 0 ? Math.round((monthStats.fullyStaffedMasses || 0) / monthStats.totalMasses * 100) : 0
        },
        pendingActions: (pendingSubsCount.count || 0) + (incompleteMassesCount.count || 0),
        inactiveMinisters: inactiveMinisters.slice(0, 10),
        // Top 10
        questionnaireStatus: currentQuestionnaire?.status || "closed"
      }
    });
  } catch (error) {
    console.error("[DASHBOARD_STATS] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ministry stats" });
  }
});
router21.get("/incomplete", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = /* @__PURE__ */ new Date();
    const futureDate = addDays6(now, days);
    const incomplete = await db.select({
      date: schedules.date,
      massTime: schedules.time,
      vacancies: sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END)`,
      totalSlots: sql16`COUNT(*)`,
      positions: sql16`ARRAY_AGG(
          CASE WHEN ${schedules.ministerId} IS NULL
          THEN ${schedules.position}
          END
        ) FILTER (WHERE ${schedules.ministerId} IS NULL)`
    }).from(schedules).where(
      and19(
        eq26(schedules.status, "published"),
        gte12(schedules.date, format9(now, "yyyy-MM-dd")),
        lte11(schedules.date, format9(futureDate, "yyyy-MM-dd"))
      )
    ).groupBy(schedules.date, schedules.time).having(sql16`COUNT(CASE WHEN ${schedules.ministerId} IS NULL THEN 1 END) > 0`).orderBy(schedules.date, schedules.time);
    res.json({
      success: true,
      data: incomplete.map((item) => ({
        ...item,
        id: `${item.date}-${item.massTime}`,
        title: `Missa ${item.massTime}`,
        requiredMinisters: item.totalSlots,
        totalAssigned: item.totalSlots - item.vacancies
      }))
    });
  } catch (error) {
    console.error("[SCHEDULES_INCOMPLETE] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch incomplete schedules" });
  }
});
var dashboard_default = router21;

// server/routes/pushSubscriptions.ts
await init_storage();
import { Router as Router22 } from "express";
import { z as z6 } from "zod";
var router22 = Router22();
var pushSubscriptionSchema2 = z6.object({
  endpoint: z6.string().url(),
  keys: z6.object({
    p256dh: z6.string(),
    auth: z6.string()
  })
});
router22.get("/vapid-public-key", (req, res) => {
  if (!pushConfig.enabled || !pushConfig.publicKey) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  res.json({ publicKey: pushConfig.publicKey });
});
router22.post("/subscribe", csrfProtection, authenticateToken, async (req, res) => {
  try {
    if (!pushConfig.enabled) {
      return res.status(503).json({ error: "Push notifications not available" });
    }
    const validatedData = pushSubscriptionSchema2.parse(req.body);
    const userId = req.user.id;
    const existing = await storage.getPushSubscriptionByEndpoint(validatedData.endpoint);
    if (existing) {
      if (existing.userId !== userId) {
        await storage.removePushSubscriptionByEndpoint(validatedData.endpoint);
        await storage.createPushSubscription({
          userId,
          endpoint: validatedData.endpoint,
          p256dhKey: validatedData.keys.p256dh,
          authKey: validatedData.keys.auth
        });
      }
      return res.json({ success: true, message: "Subscription updated" });
    }
    await storage.createPushSubscription({
      userId,
      endpoint: validatedData.endpoint,
      p256dhKey: validatedData.keys.p256dh,
      authKey: validatedData.keys.auth
    });
    res.json({ success: true, message: "Subscribed to push notifications" });
  } catch (error) {
    console.error("[PUSH API] Subscribe error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid subscription data" });
    }
    res.status(500).json({ error: "Failed to subscribe" });
  }
});
router22.post("/unsubscribe", csrfProtection, authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required" });
    }
    await storage.removePushSubscriptionByEndpoint(endpoint);
    res.json({ success: true, message: "Unsubscribed from push notifications" });
  } catch (error) {
    console.error("[PUSH API] Unsubscribe error:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});
router22.get("/subscriptions", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await storage.getPushSubscriptionsByUserIds([userId]);
    res.json({
      subscriptions: subscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        createdAt: sub.createdAt
      }))
    });
  } catch (error) {
    console.error("[PUSH API] Get subscriptions error:", error);
    res.status(500).json({ error: "Failed to get subscriptions" });
  }
});
var pushSubscriptions_default = router22;

// server/routes/whatsapp-api.ts
await init_db();
init_schema();
import { Router as Router23 } from "express";
import { eq as eq27, and as and20, gte as gte13, desc as desc10, asc as asc3 } from "drizzle-orm";
import { sql as sql17 } from "drizzle-orm";
var router23 = Router23();
var authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  const validApiKey = process.env.WHATSAPP_API_KEY;
  if (!validApiKey) {
    return res.status(500).json({
      erro: "API key n\xE3o configurada no servidor"
    });
  }
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      erro: "API key inv\xE1lida ou ausente. Envie via header 'X-API-Key' ou query parameter 'api_key'"
    });
  }
  next();
};
router23.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MESC WhatsApp API",
    version: "1.0.0",
    endpoints: 7,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router23.use(authenticateAPIKey);
function normalizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, "");
}
function getPositionName(position) {
  const positions = {
    1: "Auxiliar 1",
    2: "Auxiliar 2",
    3: "Auxiliar 3",
    4: "Auxiliar 4",
    5: "Auxiliar 5",
    6: "Auxiliar 6",
    7: "Auxiliar 7",
    8: "Auxiliar 8"
  };
  return positions[position] || `Posi\xE7\xE3o ${position}`;
}
function formatDateBR(dateStr) {
  const date2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  return date2.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function formatTime(timeStr) {
  return timeStr.substring(0, 5);
}
function getDayOfWeek(dateStr) {
  const date2 = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  const days = ["Domingo", "Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
  return days[date2.getDay()];
}
router23.post("/escala", async (req, res) => {
  try {
    const { telefone, data } = req.body;
    if (!telefone || !data) {
      return res.status(400).json({
        erro: "Campos obrigat\xF3rios: telefone e data (formato YYYY-MM-DD)"
      });
    }
    const normalizedPhone = normalizePhone(telefone);
    const minister = await db.select().from(users).where(
      sql17`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
    ).limit(1);
    if (!minister || minister.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Ministro n\xE3o encontrado com o telefone ${telefone}. Verifique se o n\xFAmero est\xE1 cadastrado.`
      });
    }
    const schedule = await db.select().from(schedules).where(
      and20(
        eq27(schedules.ministerId, minister[0].id),
        eq27(schedules.date, data)
      )
    ).limit(1);
    if (!schedule || schedule.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Ol\xE1 ${minister[0].name}! Voc\xEA n\xE3o est\xE1 escalado para o dia ${formatDateBR(data)}.`
      });
    }
    const s = schedule[0];
    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || "Santu\xE1rio S\xE3o Judas Tadeu",
      tipo: s.type === "missa" ? "Missa" : s.type,
      observacoes: s.notes || null
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /escala:", err);
    return res.status(500).json({ erro: err.message });
  }
});
router23.post("/proximas", async (req, res) => {
  try {
    const { telefone } = req.body;
    if (!telefone) {
      return res.status(400).json({
        erro: "Campo obrigat\xF3rio: telefone"
      });
    }
    const normalizedPhone = normalizePhone(telefone);
    const minister = await db.select().from(users).where(
      sql17`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
    ).limit(1);
    if (!minister || minister.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Ministro n\xE3o encontrado com o telefone ${telefone}.`
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const upcomingSchedules = await db.select().from(schedules).where(
      and20(
        eq27(schedules.ministerId, minister[0].id),
        gte13(schedules.date, today)
      )
    ).orderBy(asc3(schedules.date), asc3(schedules.time)).limit(3);
    if (!upcomingSchedules || upcomingSchedules.length === 0) {
      return res.json({
        encontrado: true,
        ministro: minister[0].name,
        proximasMissas: [],
        mensagem: `Ol\xE1 ${minister[0].name}! Voc\xEA n\xE3o tem escalas futuras no momento.`
      });
    }
    const missas = upcomingSchedules.map((s) => ({
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || "Santu\xE1rio S\xE3o Judas Tadeu",
      tipo: s.type === "missa" ? "Missa" : s.type,
      observacoes: s.notes || null
    }));
    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      totalProximas: missas.length,
      proximasMissas: missas
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /proximas:", err);
    return res.status(500).json({ erro: err.message });
  }
});
router23.post("/colegas", async (req, res) => {
  try {
    const { data, horario } = req.body;
    if (!data || !horario) {
      return res.status(400).json({
        erro: "Campos obrigat\xF3rios: data (YYYY-MM-DD) e horario (HH:MM ou HH:MM:SS)"
      });
    }
    const normalizedTime = horario.length === 5 ? `${horario}:00` : horario;
    const ministersInMass = await db.select({
      scheduleId: schedules.id,
      ministerId: schedules.ministerId,
      position: schedules.position,
      notes: schedules.notes,
      ministerName: users.name,
      ministerPhone: users.phone,
      ministerWhatsapp: users.whatsapp
    }).from(schedules).innerJoin(users, eq27(schedules.ministerId, users.id)).where(
      and20(
        eq27(schedules.date, data),
        eq27(schedules.time, normalizedTime)
      )
    ).orderBy(asc3(schedules.position));
    if (!ministersInMass || ministersInMass.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Nenhum ministro escalado para ${formatDateBR(data)} \xE0s ${formatTime(normalizedTime)}.`
      });
    }
    const colegas = ministersInMass.map((m) => ({
      nome: m.ministerName,
      funcao: getPositionName(m.position || 0),
      telefone: m.ministerPhone || m.ministerWhatsapp || null,
      observacoes: m.notes || null
    }));
    return res.json({
      encontrado: true,
      data: formatDateBR(data),
      diaSemana: getDayOfWeek(data),
      horario: formatTime(normalizedTime),
      totalMinistros: colegas.length,
      ministros: colegas
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /colegas:", err);
    return res.status(500).json({ erro: err.message });
  }
});
router23.get("/substituicoes-abertas", async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 5, 20);
    const openSubstitutions = await db.select({
      substitutionId: substitutionRequests.id,
      scheduleId: substitutionRequests.scheduleId,
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      location: schedules.location,
      requesterName: users.name,
      requesterPhone: users.phone,
      reason: substitutionRequests.reason,
      urgency: substitutionRequests.urgency,
      createdAt: substitutionRequests.createdAt
    }).from(substitutionRequests).innerJoin(schedules, eq27(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq27(substitutionRequests.requesterId, users.id)).where(eq27(substitutionRequests.status, "available")).orderBy(asc3(schedules.date), asc3(schedules.time)).limit(limite);
    if (!openSubstitutions || openSubstitutions.length === 0) {
      return res.json({
        encontrado: false,
        totalVagas: 0,
        vagas: [],
        mensagem: "N\xE3o h\xE1 substitui\xE7\xF5es dispon\xEDveis no momento."
      });
    }
    const vagas = openSubstitutions.map((s) => ({
      id: s.substitutionId,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || "Santu\xE1rio S\xE3o Judas Tadeu",
      ministroOriginal: s.requesterName,
      telefoneOriginal: s.requesterPhone,
      motivo: s.reason || "N\xE3o informado",
      urgencia: s.urgency === "high" ? "Alta" : s.urgency === "critical" ? "Cr\xEDtica" : s.urgency === "low" ? "Baixa" : "M\xE9dia",
      dataPublicacao: s.createdAt ? new Date(s.createdAt).toLocaleDateString("pt-BR") : null
    }));
    return res.json({
      encontrado: true,
      totalVagas: vagas.length,
      vagas
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /substituicoes-abertas:", err);
    return res.status(500).json({ erro: err.message });
  }
});
router23.post("/aceitar-substituicao", async (req, res) => {
  try {
    const { telefone, id_substituicao, mensagem } = req.body;
    if (!telefone || !id_substituicao) {
      return res.status(400).json({
        erro: "Campos obrigat\xF3rios: telefone e id_substituicao"
      });
    }
    const normalizedPhone = normalizePhone(telefone);
    const substitute = await db.select().from(users).where(
      sql17`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
    ).limit(1);
    if (!substitute || substitute.length === 0) {
      return res.json({
        sucesso: false,
        mensagem: `Ministro n\xE3o encontrado com o telefone ${telefone}. Verifique se est\xE1 cadastrado.`
      });
    }
    const substitution = await db.select({
      substitutionId: substitutionRequests.id,
      scheduleId: substitutionRequests.scheduleId,
      requesterId: substitutionRequests.requesterId,
      status: substitutionRequests.status,
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      requesterName: users.name
    }).from(substitutionRequests).innerJoin(schedules, eq27(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq27(substitutionRequests.requesterId, users.id)).where(eq27(substitutionRequests.id, id_substituicao)).limit(1);
    if (!substitution || substitution.length === 0) {
      return res.json({
        sucesso: false,
        mensagem: "Substitui\xE7\xE3o n\xE3o encontrada. Verifique o ID."
      });
    }
    const sub = substitution[0];
    if (sub.status !== "available") {
      return res.json({
        sucesso: false,
        mensagem: `Esta substitui\xE7\xE3o j\xE1 foi ${sub.status === "approved" ? "aprovada" : sub.status === "pending" ? "aceita e aguarda aprova\xE7\xE3o" : "cancelada"}.`
      });
    }
    if (sub.requesterId === substitute[0].id) {
      return res.json({
        sucesso: false,
        mensagem: "Voc\xEA n\xE3o pode aceitar sua pr\xF3pria substitui\xE7\xE3o."
      });
    }
    await db.update(substitutionRequests).set({
      substituteId: substitute[0].id,
      status: "pending",
      responseMessage: mensagem || `Aceito via WhatsApp por ${substitute[0].name}`
    }).where(eq27(substitutionRequests.id, id_substituicao));
    return res.json({
      sucesso: true,
      substituto: substitute[0].name,
      data: formatDateBR(sub.date),
      diaSemana: getDayOfWeek(sub.date),
      horario: formatTime(sub.time),
      funcao: getPositionName(sub.position || 0),
      ministroOriginal: sub.requesterName,
      mensagem: `Substitui\xE7\xE3o aceita com sucesso! Aguarde a aprova\xE7\xE3o do coordenador.`,
      proximoPasso: "O coordenador ser\xE1 notificado e aprovar\xE1 sua substitui\xE7\xE3o em breve."
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /aceitar-substituicao:", err);
    return res.status(500).json({ erro: err.message });
  }
});
router23.post("/minhas-substituicoes", async (req, res) => {
  try {
    const { telefone, tipo = "todas" } = req.body;
    if (!telefone) {
      return res.status(400).json({
        erro: "Campo obrigat\xF3rio: telefone"
      });
    }
    const normalizedPhone = normalizePhone(telefone);
    const minister = await db.select().from(users).where(
      sql17`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}
         OR REPLACE(REPLACE(REPLACE(REPLACE(${users.whatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${normalizedPhone}`
    ).limit(1);
    if (!minister || minister.length === 0) {
      return res.json({
        encontrado: false,
        mensagem: `Ministro n\xE3o encontrado com o telefone ${telefone}.`
      });
    }
    let whereCondition;
    if (tipo === "solicitadas") {
      whereCondition = eq27(substitutionRequests.requesterId, minister[0].id);
    } else if (tipo === "aceitas") {
      whereCondition = eq27(substitutionRequests.substituteId, minister[0].id);
    } else {
      whereCondition = sql17`${substitutionRequests.requesterId} = ${minister[0].id} OR ${substitutionRequests.substituteId} = ${minister[0].id}`;
    }
    const mySubstitutions = await db.select({
      substitutionId: substitutionRequests.id,
      date: schedules.date,
      time: schedules.time,
      position: schedules.position,
      location: schedules.location,
      requesterName: users.name,
      status: substitutionRequests.status,
      reason: substitutionRequests.reason,
      urgency: substitutionRequests.urgency,
      responseMessage: substitutionRequests.responseMessage
    }).from(substitutionRequests).innerJoin(schedules, eq27(substitutionRequests.scheduleId, schedules.id)).innerJoin(users, eq27(substitutionRequests.requesterId, users.id)).where(whereCondition).orderBy(desc10(schedules.date), desc10(schedules.time)).limit(10);
    if (!mySubstitutions || mySubstitutions.length === 0) {
      return res.json({
        encontrado: false,
        ministro: minister[0].name,
        substituicoes: [],
        mensagem: `Voc\xEA n\xE3o tem substitui\xE7\xF5es ${tipo === "solicitadas" ? "solicitadas" : tipo === "aceitas" ? "aceitas" : "registradas"}.`
      });
    }
    const substituicoes = mySubstitutions.map((s) => ({
      id: s.substitutionId,
      data: formatDateBR(s.date),
      diaSemana: getDayOfWeek(s.date),
      horario: formatTime(s.time),
      funcao: getPositionName(s.position || 0),
      local: s.location || "Santu\xE1rio S\xE3o Judas Tadeu",
      ministroOriginal: s.requesterName,
      status: s.status === "available" ? "Dispon\xEDvel" : s.status === "pending" ? "Aguardando Aprova\xE7\xE3o" : s.status === "approved" ? "Aprovada" : s.status === "rejected" ? "Rejeitada" : s.status === "cancelled" ? "Cancelada" : "Auto-aprovada",
      motivo: s.reason || "N\xE3o informado",
      urgencia: s.urgency === "high" ? "Alta" : s.urgency === "critical" ? "Cr\xEDtica" : s.urgency === "low" ? "Baixa" : "M\xE9dia",
      mensagem: s.responseMessage || null
    }));
    return res.json({
      encontrado: true,
      ministro: minister[0].name,
      totalSubstituicoes: substituicoes.length,
      substituicoes
    });
  } catch (err) {
    console.error("[WHATSAPP_API] Erro em /minhas-substituicoes:", err);
    return res.status(500).json({ erro: err.message });
  }
});
var whatsapp_api_default = router23;

// server/routes.ts
init_schema();
init_logger();
await init_db();
import { z as z7 } from "zod";
import { eq as eq28, count as count7, or as or10 } from "drizzle-orm";

// server/services/formationService.ts
await init_db();
import { randomUUID } from "node:crypto";
import { sql as sql18 } from "drizzle-orm";
var parseRows = (result) => {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  return [];
};
var parseProgressNotes = (notes) => {
  if (!notes) {
    return { completedSections: [], progressPercentage: 0 };
  }
  try {
    const parsed = JSON.parse(notes);
    return {
      completedSections: Array.isArray(parsed?.completedSections) ? parsed.completedSections : [],
      progressPercentage: typeof parsed?.progressPercentage === "number" ? parsed.progressPercentage : 0
    };
  } catch {
    return { completedSections: [], progressPercentage: 0 };
  }
};
var serializeProgressNotes = (data) => JSON.stringify({
  completedSections: data.completedSections,
  progressPercentage: data.progressPercentage
});
var buildLessonProgressView = (lesson, progressRow, totalSections) => {
  if (!progressRow) {
    return {
      status: "not_started",
      progressPercentage: 0,
      timeSpent: 0,
      completedSections: []
    };
  }
  const meta = parseProgressNotes(progressRow.notes);
  const isCompleted = Boolean(progressRow.isCompleted);
  const timeSpent = progressRow.timeSpent ?? 0;
  let progressPercentage = meta.progressPercentage ?? 0;
  if (!progressPercentage && !isCompleted) {
    const estimated = lesson.estimatedDuration ?? 0;
    if (estimated > 0 && timeSpent > 0) {
      progressPercentage = Math.min(99, Math.round(timeSpent / estimated * 100));
    }
  }
  if (isCompleted) {
    progressPercentage = 100;
  } else if (totalSections && totalSections > 0) {
    progressPercentage = Math.max(
      progressPercentage,
      Math.min(99, Math.round(meta.completedSections.length / totalSections * 100))
    );
  }
  const status = isCompleted ? "completed" : progressPercentage > 0 ? "in_progress" : "not_started";
  return {
    status,
    progressPercentage,
    timeSpent,
    completedSections: meta.completedSections
  };
};
var groupBy = (items, extractKey) => {
  return items.reduce((acc, item) => {
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
async function getFormationOverview(userId) {
  const [tracksResult, modulesResult, lessonsResult, progressResult] = await Promise.all([
    db.execute(sql18`
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
      ORDER BY COALESCE(order_index, 0), title
    `),
    db.execute(sql18`
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
    db.execute(sql18`
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
      ORDER BY module_id, lesson_number
    `),
    userId ? db.execute(sql18`
          SELECT
            id,
            user_id AS "userId",
            lesson_id AS "lessonId",
            CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
            completed_at AS "completedAt",
            time_spent_minutes AS "timeSpent",
            0 AS "quizScore",
            '' AS notes
          FROM formation_lesson_progress
          WHERE user_id = ${userId}
        `) : Promise.resolve(void 0)
  ]);
  const tracks = parseRows(tracksResult);
  const modules = parseRows(modulesResult);
  const lessons = parseRows(lessonsResult);
  const progressRows = parseRows(progressResult);
  const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]));
  const lessonsGroupedByModule = groupBy(lessons, (lesson) => lesson.moduleId);
  const moduleViews = {};
  modules.forEach((module) => {
    const lessonList = [...lessonsGroupedByModule[module.id] ?? []].sort((a, b) => a.lessonNumber - b.lessonNumber);
    const lessonsWithProgress = lessonList.map((lesson) => {
      const progressRow = progressByLesson.get(lesson.id);
      const progressView = buildLessonProgressView(lesson, progressRow);
      return {
        ...lesson,
        progress: progressView
      };
    });
    const completedLessons = lessonsWithProgress.filter((lesson) => lesson.progress.status === "completed").length;
    const inProgressLessons = lessonsWithProgress.filter((lesson) => lesson.progress.status === "in_progress").length;
    const totalLessons = lessonsWithProgress.length;
    const progressPercentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
    const moduleView = {
      ...module,
      lessons: lessonsWithProgress,
      stats: {
        totalLessons,
        completedLessons,
        inProgressLessons,
        progressPercentage
      }
    };
    if (!moduleViews[module.trackId]) {
      moduleViews[module.trackId] = [];
    }
    moduleViews[module.trackId].push(moduleView);
  });
  const trackOverviews = tracks.map((track) => {
    const modulesForTrack = moduleViews[track.id] ?? [];
    const totalModules = modulesForTrack.length;
    const totalLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.totalLessons, 0);
    const completedLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.completedLessons, 0);
    const inProgressLessons = modulesForTrack.reduce((sum, module) => sum + module.stats.inProgressLessons, 0);
    const progressPercentage = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
    const nextLesson = modulesForTrack.flatMap((module) => module.lessons).find((lesson) => lesson.progress.status !== "completed") ?? null;
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
        progressPercentage
      },
      nextLesson
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
      inProgressLessons: 0
    }
  );
  const percentageCompleted = totals.totalLessons > 0 ? Math.round(totals.completedLessons / totals.totalLessons * 100) : 0;
  return {
    tracks: trackOverviews,
    summary: {
      totalTracks: trackOverviews.length,
      ...totals,
      percentageCompleted,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function getLessonDetail(params) {
  const { userId, trackId, moduleId, lessonNumber } = params;
  const lessonResult = await db.execute(sql18`
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
    WHERE module_id = ${moduleId} AND lesson_number = ${lessonNumber}
    LIMIT 1
  `);
  const lessonRow = parseRows(lessonResult)[0];
  if (!lessonRow) {
    return null;
  }
  const sectionsResult = await db.execute(sql18`
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
  const sections = parseRows(sectionsResult);
  const sectionsCount = sections.length || 1;
  const sectionViews = sections.map((section) => ({
    id: section.id,
    title: section.title,
    content: section.content,
    contentType: section.contentType,
    orderIndex: section.orderIndex ?? 0,
    videoUrl: section.videoUrl,
    audioUrl: section.audioUrl,
    documentUrl: section.documentUrl,
    estimatedMinutes: lessonRow.estimatedDuration ? Math.max(1, Math.round(lessonRow.estimatedDuration / sectionsCount)) : null,
    quizData: section.quizData ? JSON.parse(section.quizData) : void 0,
    interactiveData: section.interactiveData ? JSON.parse(section.interactiveData) : void 0
  }));
  let progressView = {
    status: "not_started",
    progressPercentage: 0,
    timeSpent: 0,
    completedSections: []
  };
  if (userId) {
    const progressResult = await db.execute(sql18`
      SELECT
        id,
        user_id AS "userId",
        lesson_id AS "lessonId",
        CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
        completed_at AS "completedAt",
        time_spent_minutes AS "timeSpent",
        0 AS "quizScore",
        '' AS notes
      FROM formation_lesson_progress
      WHERE user_id = ${userId} AND lesson_id = ${lessonRow.id}
      LIMIT 1
    `);
    const progressRow = parseRows(progressResult)[0];
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
      documentUrl: lessonRow.documentUrl
    },
    sections: sectionViews,
    progress: progressView
  };
}
async function ensureLessonProgressRecord(userId, lessonId) {
  const result = await db.execute(sql18`
    SELECT
      id,
      user_id AS "userId",
      lesson_id AS "lessonId",
      CASE WHEN status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
      completed_at AS "completedAt",
      time_spent_minutes AS "timeSpent",
      0 AS "quizScore",
      '' AS notes
    FROM formation_lesson_progress
    WHERE user_id = ${userId} AND lesson_id = ${lessonId}
    LIMIT 1
  `);
  return parseRows(result)[0] ?? null;
}
async function countLessonSections(lessonId) {
  const result = await db.execute(sql18`
    SELECT COUNT(*)::integer AS count
    FROM formation_lesson_sections
    WHERE lesson_id = ${lessonId}
  `);
  const row = parseRows(result)[0];
  return row?.count ?? 0;
}
async function markLessonSectionCompleted(params) {
  const { userId, lessonId, sectionId } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const meta = parseProgressNotes(existing?.notes);
  if (!meta.completedSections.includes(sectionId)) {
    meta.completedSections.push(sectionId);
  }
  const totalSections = await countLessonSections(lessonId);
  if (totalSections > 0) {
    meta.progressPercentage = Math.min(99, Math.round(meta.completedSections.length / totalSections * 100));
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    await db.execute(sql18`
      UPDATE formation_lesson_progress
      SET
        "isCompleted" = ${existing.isCompleted},
        "completedAt" = ${existing.completedAt},
        "timeSpent" = COALESCE("timeSpent", 0) + 1,
        "quizScore" = "quizScore",
        notes = ${serializeProgressNotes(meta)},
        "updatedAt" = ${now}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql18`
      INSERT INTO formation_lesson_progress (
        id,
        "userId",
        "lessonId",
        "isCompleted",
        "completedAt",
        "timeSpent",
        "quizScore",
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        ${false},
        ${null},
        ${1},
        ${null},
        ${serializeProgressNotes(meta)},
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
      trackId: null
    },
    {
      id: existing?.id ?? "",
      userId,
      lessonId,
      isCompleted: false,
      completedAt: null,
      timeSpent: (existing?.timeSpent ?? 0) + 1,
      quizScore: existing?.quizScore ?? null,
      notes: serializeProgressNotes(meta)
    },
    totalSections
  );
}
async function markLessonCompleted(params) {
  const { userId, lessonId } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const totalSections = await countLessonSections(lessonId);
  const meta = {
    completedSections: Array.from(
      /* @__PURE__ */ new Set([
        ...existing ? parseProgressNotes(existing.notes).completedSections : [],
        ...totalSections > 0 ? (await db.execute(sql18`
                SELECT id FROM formation_lesson_sections WHERE lesson_id = ${lessonId}
              `)).rows.map((row) => row.id) : []
      ])
    ),
    progressPercentage: 100
  };
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    await db.execute(sql18`
      UPDATE formation_lesson_progress
      SET
        "isCompleted" = ${true},
        "completedAt" = ${now},
        "timeSpent" = COALESCE("timeSpent", 0),
        "quizScore" = "quizScore",
        notes = ${serializeProgressNotes(meta)},
        "updatedAt" = ${now}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql18`
      INSERT INTO formation_lesson_progress (
        id,
        "userId",
        "lessonId",
        "isCompleted",
        "completedAt",
        "timeSpent",
        "quizScore",
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        ${true},
        ${now},
        ${0},
        ${null},
        ${serializeProgressNotes(meta)},
        ${now},
        ${now}
      )
    `);
  }
  return {
    status: "completed",
    progressPercentage: 100,
    timeSpent: existing?.timeSpent ?? 0,
    completedSections: meta.completedSections
  };
}
async function upsertLessonProgressEntry(params) {
  const { userId, lessonId, isCompleted, timeSpent, progressPercentage, completedSections, quizScore, notes } = params;
  const existing = await ensureLessonProgressRecord(userId, lessonId);
  const meta = parseProgressNotes(existing?.notes);
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
    }
  }
  const finalIsCompleted = isCompleted ?? existing?.isCompleted ?? false;
  if (finalIsCompleted) {
    meta.progressPercentage = 100;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const payload = {
    isCompleted: finalIsCompleted,
    completedAt: finalIsCompleted ? now : existing?.completedAt ?? null,
    timeSpent: timeSpent ?? existing?.timeSpent ?? 0,
    quizScore: quizScore ?? existing?.quizScore ?? null,
    notes: serializeProgressNotes(meta),
    updatedAt: now
  };
  if (existing) {
    await db.execute(sql18`
      UPDATE formation_lesson_progress
      SET
        "isCompleted" = ${payload.isCompleted},
        "completedAt" = ${payload.completedAt},
        "timeSpent" = ${payload.timeSpent},
        "quizScore" = ${payload.quizScore},
        notes = ${payload.notes},
        "updatedAt" = ${payload.updatedAt}
      WHERE id = ${existing.id}
    `);
  } else {
    await db.execute(sql18`
      INSERT INTO formation_lesson_progress (
        id,
        "userId",
        "lessonId",
        "isCompleted",
        "completedAt",
        "timeSpent",
        "quizScore",
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${lessonId},
        ${payload.isCompleted},
        ${payload.completedAt},
        ${payload.timeSpent},
        ${payload.quizScore},
        ${payload.notes},
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
      trackId: null
    },
    {
      id: existing?.id ?? "",
      userId,
      lessonId,
      isCompleted: payload.isCompleted ? 1 : 0,
      completedAt: payload.completedAt,
      timeSpent: payload.timeSpent,
      quizScore: payload.quizScore,
      notes: payload.notes
    }
  );
}
async function listLessonProgressEntries(params) {
  const { userId, trackId } = params;
  const query = trackId ? sql18`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.lesson_id AS "lessonId",
          CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
          p.completed_at AS "completedAt",
          p.time_spent_minutes AS "timeSpent",
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
      ` : sql18`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.lesson_id AS "lessonId",
          CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END AS "isCompleted",
          p.completed_at AS "completedAt",
          p.time_spent_minutes AS "timeSpent",
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
  const rows = parseRows(result);
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
        trackId: row.lessonTrackId
      },
      row
    )
  }));
}

// server/routes.ts
var formationProgressUpdateSchema = z7.object({
  lessonId: z7.string(),
  isCompleted: z7.boolean().optional(),
  timeSpent: z7.number().int().min(0).optional(),
  progressPercentage: z7.number().min(0).max(100).optional(),
  completedSections: z7.array(z7.string()).optional(),
  quizScore: z7.number().optional(),
  notes: z7.string().optional()
});
function handleApiError(error, operation) {
  if (error instanceof z7.ZodError) {
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
  app2.use(noCacheHeaders);
  app2.use(csrfTokenGenerator);
  app2.get("/api/csrf-token", getCsrfToken);
  app2.use("/api/auth", authRateLimiter, authRoutes_default);
  app2.use("/api/password-reset", passwordResetRateLimiter, router3);
  app2.use("/api/whatsapp", whatsapp_api_default);
  app2.use("/api/questionnaires", csrfProtection, questionnaires_default);
  app2.use("/api/questionnaires/admin", csrfProtection, questionnaireAdmin_default);
  app2.use("/api/schedules", csrfProtection, schedules_default);
  app2.use("/api/schedules", csrfProtection, scheduleGeneration_default);
  app2.use("/api/schedules", csrfProtection, smartScheduleGeneration_default);
  app2.use("/api/schedules", csrfProtection, testScheduleGeneration_default);
  app2.use("/api/auxiliary", csrfProtection, auxiliaryPanel_default);
  app2.use("/api/upload", csrfProtection, upload_default);
  app2.use("/api/notifications", csrfProtection, notifications_default);
  app2.use("/api/reports", reports_default);
  app2.use("/api/ministers", csrfProtection, ministers_default);
  app2.use("/api/session", session_default);
  app2.use("/api/substitutions", csrfProtection, substitutions_default);
  app2.use("/api/mass-pendencies", mass_pendencies_default);
  app2.use("/api/formation/admin", csrfProtection, formationAdmin_default);
  app2.use("/api/version", version_default);
  app2.use("/api/liturgical", liturgical_default);
  app2.use("/api/saints", saints_default);
  app2.use("/api/dashboard", dashboard_default);
  app2.use("/api/schedules/incomplete", dashboard_default);
  app2.use("/api/push-subscriptions", pushSubscriptions_default);
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
  app2.put("/api/profile", authenticateToken, csrfProtection, async (req, res) => {
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
  app2.post("/api/profile/family", authenticateToken, csrfProtection, async (req, res) => {
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
  app2.delete("/api/profile/family/:id", authenticateToken, csrfProtection, async (req, res) => {
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
      const users3 = await storage.getAllUsers();
      const activeUsers = users3.filter((u) => u.status === "active");
      res.json(activeUsers);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar usu\xE1rios ativos");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.get("/api/users/pending", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const users3 = await storage.getAllUsers();
      const pendingUsers = users3.filter((u) => u.status === "pending");
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
      const users3 = await storage.getAllUsers();
      res.json(users3);
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
      }).from(users).where(eq28(users.id, userId));
      if (!user || !user.imageData) {
        return res.status(404).json({ error: "Photo not found" });
      }
      const imageBuffer = Buffer.from(user.imageData, "base64");
      const imageHash = crypto2.createHash("md5").update(user.imageData).digest("hex");
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
  app2.post("/api/users", authenticateToken, requireRole(["gestor"]), csrfProtection, async (req, res) => {
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
  app2.put("/api/users/:id", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
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
  app2.patch("/api/users/:id/status", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
    try {
      const statusUpdateSchema = z7.object({
        status: z7.enum(["active", "inactive", "pending"], {
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
      if (error instanceof z7.ZodError) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: error.errors
        });
      }
      const errorResponse = handleApiError(error, "atualizar status do usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.patch("/api/users/:id/role", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
    try {
      const roleUpdateSchema = z7.object({
        role: z7.enum(["gestor", "coordenador", "ministro"], {
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
      if (error instanceof z7.ZodError) {
        return res.status(400).json({
          message: "Dados inv\xE1lidos",
          errors: error.errors
        });
      }
      const errorResponse = handleApiError(error, "atualizar papel do usu\xE1rio");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.patch("/api/users/:id/block", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
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
        const [questionnaireCheck] = await db.select({ count: count7() }).from(questionnaireResponses).where(eq28(questionnaireResponses.userId, userId));
        diagnostics.canQueryQuestionnaireResponses = true;
        diagnostics.questionnaireCount = questionnaireCheck?.count || 0;
      } catch (e) {
        diagnostics.questionnaireError = `Error querying questionnaire responses: ${e}`;
      }
      try {
        const [scheduleMinisterCheck] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.ministerId, userId));
        diagnostics.canQueryScheduleAssignments = true;
        diagnostics.scheduleMinisterCount = scheduleMinisterCheck?.count || 0;
        const [scheduleSubstituteCheck] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.substituteId, userId));
        diagnostics.scheduleSubstituteCount = scheduleSubstituteCheck?.count || 0;
      } catch (e) {
        diagnostics.scheduleError = `Error querying schedule assignments: ${e}`;
      }
      try {
        const [substitutionCheck] = await db.select({ count: count7() }).from(substitutionRequests).where(or10(
          eq28(substitutionRequests.requesterId, userId),
          eq28(substitutionRequests.substituteId, userId)
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
  app2.delete("/api/users/:id", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
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
          const [questionnaireCount] = await db.select({ count: count7() }).from(questionnaireResponses).where(eq28(questionnaireResponses.userId, userId));
          const [scheduleMinisterCount] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.ministerId, userId));
          const [scheduleSubstituteCount] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.substituteId, userId));
          const [substitutionCount] = await db.select({ count: count7() }).from(substitutionRequests).where(or10(
            eq28(substitutionRequests.requesterId, userId),
            eq28(substitutionRequests.substituteId, userId)
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
          const [questionnaireCount] = await db.select({ count: count7() }).from(questionnaireResponses).where(eq28(questionnaireResponses.userId, userId));
          const [scheduleMinisterCount] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.ministerId, userId));
          const [scheduleSubstituteCount] = await db.select({ count: count7() }).from(schedules).where(eq28(schedules.substituteId, userId));
          const [substitutionCount] = await db.select({ count: count7() }).from(substitutionRequests).where(or10(
            eq28(substitutionRequests.requesterId, userId),
            eq28(substitutionRequests.substituteId, userId)
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
  app2.post("/api/questionnaires", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const questionnaireData = insertQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.createQuestionnaire({
        ...questionnaireData,
        createdById: req.user?.id || "0"
      });
      res.status(201).json(questionnaire);
    } catch (error) {
      console.error("Error creating questionnaire:", error);
      if (error instanceof z7.ZodError) {
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
  app2.post("/api/questionnaires/:id/responses", authenticateToken, csrfProtection, async (req, res) => {
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
      const month = req.query.month ? parseInt(req.query.month) : void 0;
      const year = req.query.year ? parseInt(req.query.year) : void 0;
      const scheduleSummary = await storage.getSchedulesSummary(month, year);
      const assignments = await storage.getMonthAssignments(month, year);
      const substitutionsData = await storage.getMonthSubstitutions(month, year);
      res.json({
        schedules: scheduleSummary,
        assignments,
        substitutions: substitutionsData
      });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });
  app2.post("/api/schedules", authenticateToken, csrfProtection, async (req, res) => {
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
  app2.post("/api/mass-times", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.parse(req.body);
      const massTime = await storage.createMassTime(massTimeData);
      res.status(201).json(massTime);
    } catch (error) {
      console.error("Error creating mass time:", error);
      if (error instanceof z7.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mass time" });
    }
  });
  app2.put("/api/mass-times/:id", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const massTimeData = insertMassTimeSchema.partial().parse(req.body);
      const massTime = await storage.updateMassTime(req.params.id, massTimeData);
      res.json(massTime);
    } catch (error) {
      console.error("Error updating mass time:", error);
      if (error instanceof z7.ZodError) {
        return res.status(400).json({ message: "Invalid mass time data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update mass time" });
    }
  });
  app2.delete("/api/mass-times/:id", authenticateToken, csrfProtection, async (req, res) => {
    try {
      await storage.deleteMassTime(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mass time:", error);
      res.status(500).json({ message: "Failed to delete mass time" });
    }
  });
  app2.get("/api/formation/overview", authenticateToken, async (req, res) => {
    try {
      const overview = await getFormationOverview(req.user?.id);
      res.json(overview);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar vis\xE3o geral da forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
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
  app2.get("/api/formation/lessons/:trackId/:moduleId", authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId } = req.params;
      const lessons = await storage.getFormationLessonsByTrackAndModule(trackId, moduleId);
      if (!lessons || lessons.length === 0) {
        return res.status(404).json({ message: "Aulas n\xE3o encontradas para este m\xF3dulo" });
      }
      res.json(lessons);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar aulas do m\xF3dulo");
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
  app2.get("/api/formation/:trackId/:moduleId/:lessonNumber", authenticateToken, async (req, res) => {
    try {
      const { trackId, moduleId, lessonNumber } = req.params;
      const detail = await getLessonDetail({
        userId: req.user?.id,
        trackId,
        moduleId,
        lessonNumber: parseInt(lessonNumber, 10)
      });
      if (!detail) {
        return res.status(404).json({ message: "Aula n\xE3o encontrada" });
      }
      res.json(detail);
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
      const progress = await listLessonProgressEntries({
        userId,
        trackId: trackId ? String(trackId) : void 0
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "buscar progresso de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/progress", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const progressData = formationProgressUpdateSchema.parse(req.body);
      const progress = await upsertLessonProgressEntry({
        userId,
        lessonId: progressData.lessonId,
        isCompleted: progressData.isCompleted,
        timeSpent: progressData.timeSpent,
        progressPercentage: progressData.progressPercentage,
        completedSections: progressData.completedSections,
        quizScore: progressData.quizScore,
        notes: progressData.notes
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "atualizar progresso de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:lessonId/sections/:sectionId/complete", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const { lessonId, sectionId } = req.params;
      const progress = await markLessonSectionCompleted({
        userId,
        lessonId,
        sectionId
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar se\xE7\xE3o como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:lessonId/complete", authenticateToken, csrfProtection, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
      }
      const { lessonId } = req.params;
      const progress = await markLessonCompleted({
        userId,
        lessonId
      });
      res.json(progress);
    } catch (error) {
      const errorResponse = handleApiError(error, "marcar aula como completa");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/tracks", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
    try {
      const trackData = insertFormationTrackSchema.parse(req.body);
      const track = await storage.createFormationTrack(trackData);
      res.status(201).json(track);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar trilha de forma\xE7\xE3o");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
    try {
      const lessonData = insertFormationLessonSchema.parse(req.body);
      const lesson = await storage.createFormationLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      const errorResponse = handleApiError(error, "criar aula");
      res.status(errorResponse.status).json(errorResponse);
    }
  });
  app2.post("/api/formation/lessons/:id/sections", authenticateToken, requireRole(["gestor", "coordenador"]), csrfProtection, async (req, res) => {
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
  if (process.env.NODE_ENV === "development") {
    app2.post("/api/dev/switch-role", authenticateToken, async (req, res) => {
      try {
        const { role } = req.body;
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Usu\xE1rio n\xE3o autenticado" });
        }
        if (!["ministro", "coordenador", "gestor"].includes(role)) {
          return res.status(400).json({ message: "Role inv\xE1lido" });
        }
        await storage.updateUser(userId, { role });
        res.json({
          message: `Role alterado para ${role} com sucesso`,
          role
        });
      } catch (error) {
        console.error("Error switching role:", error);
        res.status(500).json({ message: "Erro ao alterar role" });
      }
    });
  }
  app2.post("/api/admin/migrate-substitution-status", authenticateToken, requireRole(["gestor", "coordenador"]), async (req, res) => {
    try {
      const { sql: sqlHelper, isNull: isNull2, and: and21 } = await import("drizzle-orm");
      const affectedRequests = await db.select({
        id: substitutionRequests.id,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        createdAt: substitutionRequests.createdAt
      }).from(substitutionRequests).where(
        and21(
          eq28(substitutionRequests.status, "pending"),
          isNull2(substitutionRequests.substituteId)
        )
      );
      if (affectedRequests.length === 0) {
        return res.json({
          success: true,
          message: "Nenhum registro inconsistente encontrado. Base de dados est\xE1 limpa!",
          affectedCount: 0
        });
      }
      await db.update(substitutionRequests).set({ status: "available" }).where(
        and21(
          eq28(substitutionRequests.status, "pending"),
          isNull2(substitutionRequests.substituteId)
        )
      );
      logger.info("Migration: Fixed substitution status", {
        affectedCount: affectedRequests.length,
        userId: req.user?.id
      });
      res.json({
        success: true,
        message: `Migra\xE7\xE3o conclu\xEDda com sucesso! ${affectedRequests.length} registro(s) atualizado(s).`,
        affectedCount: affectedRequests.length,
        affectedRequests: affectedRequests.map((r) => ({
          id: r.id,
          createdAt: r.createdAt
        }))
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao executar migra\xE7\xE3o",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.use((err, req, res, next) => {
    console.error("\u{1F6A8} Route error:", err.message);
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? err.stack : void 0
      });
    }
  });
  const httpServer = createServer(app2);
  const { initializeWebSocket: initializeWebSocket2 } = await init_websocket().then(() => websocket_exports);
  initializeWebSocket2(httpServer);
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
    emptyOutDir: true,
    // Gerar hash nos arquivos para cache busting automático
    rollupOptions: {
      output: {
        // CRITICAL: Hash patterns for cache busting
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunks - separate large libraries
          "vendor-react": ["react", "react-dom", "react/jsx-runtime"],
          "vendor-router": ["wouter"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-accordion",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-switch"
          ],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-date": ["date-fns"],
          "vendor-icons": ["lucide-react"],
          "vendor-charts": ["recharts"]
        }
      }
    },
    minify: "terser",
    sourcemap: false,
    // Disable for production
    chunkSizeWarningLimit: 500
    // Keep warning at 500KB
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
import { nanoid as nanoid2 } from "nanoid";
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
        `src="/src/main.tsx?v=${nanoid2()}"`
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
  app2.use("/assets", express.static(path2.join(distPath, "assets"), {
    maxAge: "1y",
    // Cache por 1 ano
    immutable: true
    // Assets com hash são imutáveis
  }));
  app2.use(express.static(distPath, {
    maxAge: "1d",
    // 1 dia de cache
    setHeaders: (res, filepath) => {
      if (filepath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filepath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Service-Worker-Allowed", "/");
      } else if (filepath.endsWith("version.json")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  }));
  app2.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
process.on("uncaughtException", (error) => {
  console.error("\u{1F6A8} Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u{1F6A8} Unhandled Rejection:", reason);
});
var app = express2();
app.set("trust proxy", true);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        // Necessário para Vite HMR em dev
        "'unsafe-eval'",
        // Necessário para Vite HMR em dev
        "https://cdn.jsdelivr.net"
        // Para bibliotecas CDN
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        // Necessário para styled components e Tailwind
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === "development" ? "ws:" : "",
        process.env.NODE_ENV === "development" ? "wss:" : ""
      ].filter(Boolean),
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  // Permitir embed de recursos externos
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536e3,
    // 1 ano
    includeSubDomains: true,
    preload: true
  },
  frameguard: process.env.NODE_ENV === "development" ? false : { action: "deny" },
  // Prevenir clickjacking em produção
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  }
}));
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
});
app.get("/", (_req, res, next) => {
  if (res.headersSent) return;
  const acceptHeader = _req.get("accept") || "";
  if (acceptHeader.includes("application/json") && !acceptHeader.includes("text/html")) {
    return res.status(200).json({ status: "ok" });
  }
  next();
});
var allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:5000", "http://localhost:3000", "http://127.0.0.1:5000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (origin === allowedOrigin) return true;
      if (origin.includes(".replit.dev") || origin.includes(".replit.com") || origin.includes(".replit.app")) {
        return true;
      }
      return false;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.warn(`\u{1F534} CORS blocked: ${origin}`);
      }
      callback(new Error("Origin not allowed by CORS"));
    }
  },
  credentials: true,
  // Permitir cookies e headers de auth
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"]
}));
app.use("/api", apiRateLimiter);
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
  const server = await registerRoutes(app);
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`\u274C ${status} ${req.method} ${req.path}: ${message}`);
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });
  const isDevelopment2 = process.env.NODE_ENV === "development";
  if (isDevelopment2) {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
    } catch (error) {
      console.error("\u274C Failed to configure static file serving:", error);
      process.exit(1);
    }
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.on("error", (error) => {
    console.error("\u274C Server error:", error);
    if (error.code === "EADDRINUSE") {
      console.error(`\u274C Port ${port} is already in use`);
    }
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`\u2705 Server started on port ${port} (${process.env.NODE_ENV})`);
  });
})();
