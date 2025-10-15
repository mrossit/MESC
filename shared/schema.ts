import { sql, relations } from 'drizzle-orm';
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
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum('user_role', ['gestor', 'coordenador', 'ministro']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
export const scheduleStatusEnum = pgEnum('schedule_status', ['draft', 'published', 'completed']);
export const scheduleTypeEnum = pgEnum('schedule_type', ['missa', 'celebracao', 'evento']);
export const substitutionStatusEnum = pgEnum('substitution_status', ['available', 'pending', 'approved', 'rejected', 'cancelled', 'auto_approved']);
export const urgencyLevelEnum = pgEnum('urgency_level', ['low', 'medium', 'high', 'critical']);
export const notificationTypeEnum = pgEnum('notification_type', ['schedule', 'substitution', 'formation', 'announcement', 'reminder']);
export const formationCategoryEnum = pgEnum('formation_category', ['liturgia', 'espiritualidade', 'pratica']);
export const formationStatusEnum = pgEnum('formation_status', ['not_started', 'in_progress', 'completed']);
export const lessonContentTypeEnum = pgEnum('lesson_content_type', ['text', 'video', 'audio', 'document', 'quiz', 'interactive']);
export const liturgicalCycleEnum = pgEnum('liturgical_cycle', ['A', 'B', 'C']);
export const liturgicalColorEnum = pgEnum('liturgical_color', ['white', 'red', 'green', 'purple', 'rose', 'black']);
export const celebrationRankEnum = pgEnum('celebration_rank', ['SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL_MEMORIAL', 'FERIAL']);

// User storage table for Replit Auth + MESC data
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // MESC specific fields
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('ministro'),
  status: userStatusEnum('status').notNull().default('pending'),
  requiresPasswordChange: boolean('requires_password_change').default(true),
  lastLogin: timestamp('last_login'),
  joinDate: date('join_date'),
  photoUrl: text('photo_url'),
  imageData: text('image_data'), // Base64 encoded image data
  imageContentType: varchar('image_content_type', { length: 50 }), // MIME type
  familyId: uuid('family_id').references(() => families.id),
  
  // Personal information
  birthDate: date('birth_date'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  zipCode: varchar('zip_code', { length: 10 }),
  maritalStatus: varchar('marital_status', { length: 20 }),
  
  // Sacramental data
  baptismDate: date('baptism_date'),
  baptismParish: varchar('baptism_parish', { length: 255 }),
  confirmationDate: date('confirmation_date'),
  confirmationParish: varchar('confirmation_parish', { length: 255 }),
  marriageDate: date('marriage_date'),
  marriageParish: varchar('marriage_parish', { length: 255 }),
  
  // Ministry preferences
  preferredPosition: integer('preferred_position'),
  preferredTimes: jsonb('preferred_times').$type<string[]>(),
  availableForSpecialEvents: boolean('available_for_special_events').default(true),
  canServeAsCouple: boolean('can_serve_as_couple').default(false),
  spouseMinisterId: uuid('spouse_minister_id'),

  // Extra activities preferences
  extraActivities: jsonb('extra_activities').$type<{
    sickCommunion: boolean;
    mondayAdoration: boolean;
    helpOtherPastorals: boolean;
    festiveEvents: boolean;
  }>().default({
    sickCommunion: false,
    mondayAdoration: false,
    helpOtherPastorals: false,
    festiveEvents: false
  }),
  
  // Experience and formation
  ministryStartDate: date('ministry_start_date'),
  experience: text('experience'),
  specialSkills: text('special_skills'),
  liturgicalTraining: boolean('liturgical_training').default(false),
  
  // Statistics
  lastService: timestamp('last_service'),
  totalServices: integer('total_services').default(0),
  formationCompleted: boolean('formation_completed').default(false),
  
  // Observations
  observations: text('observations'),

  // Display name for schedules (optional custom name shown in schedule lists)
  scheduleDisplayName: varchar('schedule_display_name', { length: 100 }),

  // Registration fields
  ministerType: varchar('minister_type', { length: 50 }),
  approvedAt: timestamp('approved_at'),
  approvedById: varchar('approved_by_id'),
  rejectionReason: text('rejection_reason'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Families table
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  preferServeTogether: boolean('prefer_serve_together').default(true), // Default: families prefer to serve together
  createdAt: timestamp('created_at').defaultNow()
});

// Family relationships table
export const familyRelationships = pgTable('family_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  relatedUserId: varchar('related_user_id').notNull().references(() => users.id),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull(), // spouse, parent, child, sibling
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Questionnaires table
export const questionnaires = pgTable('questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  questions: jsonb('questions').notNull(),
  deadline: timestamp('deadline'),
  targetUserIds: jsonb('target_user_ids').$type<string[]>(),
  notifiedUserIds: jsonb('notified_user_ids').$type<string[]>(),
  createdById: varchar('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Questionnaire responses
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull().references(() => questionnaires.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  responses: jsonb('responses').notNull(),
  
  availableSundays: jsonb('available_sundays').$type<string[]>(),
  preferredMassTimes: jsonb('preferred_mass_times').$type<string[]>(),
  alternativeTimes: jsonb('alternative_times').$type<string[]>(),
  dailyMassAvailability: jsonb('daily_mass_availability').$type<string[]>(),
  specialEvents: jsonb('special_events'),
  canSubstitute: boolean('can_substitute').default(false),
  notes: text('notes'),
  
  // Family sharing fields
  sharedWithFamilyIds: jsonb('shared_with_family_ids').$type<string[]>(),
  isSharedResponse: boolean('is_shared_response').default(false),
  sharedFromUserId: varchar('shared_from_user_id').references(() => users.id),
  
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Schedules
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  type: scheduleTypeEnum('type').notNull().default('missa'),
  location: varchar('location', { length: 255 }),
  ministerId: varchar('minister_id').references(() => users.id),
  position: integer('position').default(0), // Order position for ministers at same date/time
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  substituteId: varchar('substitute_id').references(() => users.id),
  notes: text('notes'),
  onSiteAdjustments: jsonb('on_site_adjustments').$type<{
    originalPosition?: number;
    newPosition?: number;
    adjustedBy?: string;
    adjustedAt?: string;
    reason?: string;
  }[]>(),
  createdAt: timestamp('created_at').defaultNow()
});

// Mass Execution Logs (for auxiliary leaders)
export const massExecutionLogs = pgTable('mass_execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  auxiliaryId: varchar('auxiliary_id').notNull().references(() => users.id),
  changesMade: jsonb('changes_made').$type<{
    type: 'check_in' | 'position_change' | 'standby_called' | 'emergency_redistribution';
    ministerId?: string;
    ministerName?: string;
    fromPosition?: number;
    toPosition?: number;
    timestamp: string;
    details?: string;
  }[]>(),
  comments: text('comments'),
  massQuality: integer('mass_quality'), // 1-5 stars
  attendance: jsonb('attendance').$type<{
    ministerId: string;
    ministerName: string;
    position: number;
    checkedIn: boolean;
    checkInTime?: string;
    absent?: boolean;
  }[]>(),
  incidents: jsonb('incidents').$type<{
    type: 'late_arrival' | 'no_show' | 'position_conflict' | 'other';
    description: string;
    ministersInvolved?: string[];
    timestamp: string;
  }[]>(),
  highlights: text('highlights'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_mass_execution_logs_schedule').on(table.scheduleId),
  index('idx_mass_execution_logs_auxiliary').on(table.auxiliaryId)
]);

// Standby Ministers (available for emergency calls)
export const standbyMinisters = pgTable('standby_ministers', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  ministerId: varchar('minister_id').notNull().references(() => users.id),
  confirmedAvailable: boolean('confirmed_available').default(false),
  checkInTime: timestamp('check_in_time'),
  calledAt: timestamp('called_at'),
  calledBy: varchar('called_by').references(() => users.id),
  respondedAt: timestamp('responded_at'),
  response: varchar('response', { length: 50 }), // 'available', 'unavailable', 'on_way', 'arrived'
  responseMessage: text('response_message'),
  assignedPosition: integer('assigned_position'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_standby_ministers_schedule').on(table.scheduleId),
  index('idx_standby_ministers_minister').on(table.ministerId),
  index('idx_standby_ministers_called').on(table.calledAt)
]);

// Minister Check-ins (real-time presence tracking)
export const ministerCheckIns = pgTable('minister_check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  ministerId: varchar('minister_id').notNull().references(() => users.id),
  position: integer('position').notNull(),
  checkedInAt: timestamp('checked_in_at').defaultNow(),
  checkedInBy: varchar('checked_in_by').references(() => users.id), // Auxiliary who checked them in
  status: varchar('status', { length: 20 }).default('present'), // present, late, absent
  notes: text('notes')
}, (table) => [
  index('idx_minister_check_ins_schedule').on(table.scheduleId),
  index('idx_minister_check_ins_minister').on(table.ministerId)
]);

// Substitution requests
export const substitutionRequests = pgTable('substitution_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  requesterId: varchar('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  substituteId: varchar('substitute_id').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'), // Opcional - ministro pode ou não informar motivo
  status: substitutionStatusEnum('status').notNull().default('available'),
  urgency: urgencyLevelEnum('urgency').notNull().default('medium'),
  approvedBy: varchar('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  responseMessage: text('response_message'), // Mensagem do substituto ao aceitar/rejeitar
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_substitution_requester').on(table.requesterId),
  index('idx_substitution_substitute').on(table.substituteId),
  index('idx_substitution_status').on(table.status),
  index('idx_substitution_schedule').on(table.scheduleId)
]);

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  read: boolean('read').default(false),
  readAt: timestamp('read_at'),
  actionUrl: varchar('action_url', { length: 255 }),
  priority: varchar('priority', { length: 10 }).default('normal'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Formation tracks (tracks like liturgia, espiritualidade, pratica)
export const formationTracks = pgTable('formation_tracks', {
  id: varchar('id').primaryKey(), // liturgia, espiritualidade, pratica
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: formationCategoryEnum('category').notNull(),
  icon: varchar('icon', { length: 50 }),
  orderIndex: integer('order_index').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation modules
export const formationModules = pgTable('formation_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: varchar('trackId').notNull().references(() => formationTracks.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: formationCategoryEnum('category').notNull(),
  content: text('content'),
  videoUrl: varchar('video_url', { length: 255 }),
  durationMinutes: integer('durationMinutes'),
  orderIndex: integer('order_index'),
  createdAt: timestamp('created_at').defaultNow()
});

// Formation progress
export const formationProgress = pgTable('formation_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  moduleId: uuid('moduleId').notNull().references(() => formationModules.id),
  status: formationStatusEnum('status').notNull().default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Formation lessons (individual lessons within modules)
export const formationLessons = pgTable('formation_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('moduleId').notNull().references(() => formationModules.id),
  trackId: varchar('trackId').notNull().references(() => formationTracks.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  lessonNumber: integer('lessonNumber').notNull(),
  estimatedDuration: integer('estimatedDuration').default(30),
  // objectives: jsonb('objectives').$type<string[]>(), // Not in SQLite local
  isActive: boolean('is_active').default(true),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation lesson content sections (text, video, etc. within a lesson)
export const formationLessonSections = pgTable('formation_lesson_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').notNull().references(() => formationLessons.id),
  type: lessonContentTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content'), // Text content, video embed code, etc.
  videoUrl: varchar('video_url', { length: 500 }),
  audioUrl: varchar('audio_url', { length: 500 }),
  documentUrl: varchar('document_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  quizData: jsonb('quiz_data'), // For interactive quizzes
  orderIndex: integer('order_index').default(0),
  isRequired: boolean('is_required').default(true),
  estimatedMinutes: integer('estimated_minutes').default(5),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation lesson progress (track user progress through individual lessons)
export const formationLessonProgress = pgTable('formation_lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  lessonId: uuid('lesson_id').notNull().references(() => formationLessons.id),
  status: formationStatusEnum('status').notNull().default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  timeSpentMinutes: integer('time_spent_minutes').default(0),
  completedSections: jsonb('completed_sections').$type<string[]>().default([]),
  lastAccessedAt: timestamp('last_accessed_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Mass times configuration
export const massTimesConfig = pgTable('mass_times_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfWeek: integer('day_of_week').notNull(),
  time: time('time').notNull(),
  minMinisters: integer('min_ministers').notNull().default(3),
  maxMinisters: integer('max_ministers').notNull().default(6),
  isActive: boolean('is_active').default(true),
  specialEvent: boolean('special_event').default(false),
  eventName: varchar('event_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Password reset requests
export const passwordResetRequests = pgTable('password_reset_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  processedBy: varchar('processed_by').references(() => users.id),
  processedAt: timestamp('processed_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// Active sessions for activity tracking and auto-logout
export const activeSessions = pgTable('active_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').default(true)
}, (table) => [
  index('idx_active_sessions_user').on(table.userId),
  index('idx_active_sessions_active').on(table.isActive),
  index('idx_active_sessions_expires').on(table.expiresAt),
  index('idx_active_sessions_activity').on(table.lastActivityAt)
]);

// Activity logs for tracking user interactions and analytics
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // login, view_schedule, respond_questionnaire, etc
  details: jsonb('details'), // Additional context for the action
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('idx_activity_logs_user').on(table.userId),
  index('idx_activity_logs_action').on(table.action),
  index('idx_activity_logs_created').on(table.createdAt)
]);

// Liturgical Calendar Tables
export const liturgicalYears = pgTable('liturgical_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull().unique(), // Civil year when liturgical year starts
  cycle: liturgicalCycleEnum('cycle').notNull(), // A, B, or C
  startDate: date('start_date').notNull(), // First Sunday of Advent
  endDate: date('end_date').notNull(), // Saturday before next Advent
  easterDate: date('easter_date').notNull(), // Calculated Easter Sunday
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_liturgical_years_year').on(table.year)
]);

export const liturgicalSeasons = pgTable('liturgical_seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  yearId: uuid('year_id').notNull().references(() => liturgicalYears.id),
  name: varchar('name', { length: 100 }).notNull(), // Advent, Christmas, Lent, Easter, Ordinary Time
  color: liturgicalColorEnum('color').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_liturgical_seasons_year').on(table.yearId),
  index('idx_liturgical_seasons_dates').on(table.startDate, table.endDate)
]);

export const liturgicalCelebrations = pgTable('liturgical_celebrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  rank: celebrationRankEnum('rank').notNull(),
  color: liturgicalColorEnum('color').notNull(),
  isMovable: boolean('is_movable').default(false), // True for Easter-dependent dates
  specialMassConfig: jsonb('special_mass_config').$type<{
    times?: string[];
    minMinisters?: { [time: string]: number };
    maxMinisters?: { [time: string]: number };
    requiresProcession?: boolean;
    requiresIncense?: boolean;
  }>(),
  saintOfTheDay: varchar('saint_of_the_day', { length: 255 }),
  readings: jsonb('readings'),
  notes: text('notes'),
  yearId: uuid('year_id').references(() => liturgicalYears.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_liturgical_celebrations_date').on(table.date),
  index('idx_liturgical_celebrations_rank').on(table.rank),
  index('idx_liturgical_celebrations_year').on(table.yearId)
]);

// Liturgical Settings - Override mass times for special occasions
export const liturgicalMassOverrides = pgTable('liturgical_mass_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  celebrationId: uuid('celebration_id').references(() => liturgicalCelebrations.id),
  date: date('date').notNull(),
  time: time('time').notNull(),
  minMinisters: integer('min_ministers').notNull(),
  maxMinisters: integer('max_ministers').notNull(),
  description: varchar('description', { length: 255 }),
  reason: text('reason'),
  createdBy: varchar('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_liturgical_mass_overrides_date').on(table.date),
  index('idx_liturgical_mass_overrides_celebration').on(table.celebrationId)
]);

// Saints calendar - Brazilian saints and feast days
export const saints = pgTable('saints', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  feastDay: varchar('feast_day', { length: 10 }).notNull(), // MM-DD format
  title: varchar('title', { length: 255 }), // e.g., "Apóstolo", "Mártir", "Doutor da Igreja"
  patronOf: text('patron_of'), // What they're patron saint of
  biography: text('biography'),
  imageUrl: varchar('image_url', { length: 500 }),
  isBrazilian: boolean('is_brazilian').default(false),
  rank: celebrationRankEnum('rank').notNull().default('OPTIONAL_MEMORIAL'),
  liturgicalColor: liturgicalColorEnum('liturgical_color').notNull().default('white'),

  // Liturgical texts
  collectPrayer: text('collect_prayer'), // Oração Coleta
  firstReading: jsonb('first_reading').$type<{
    reference: string;
    text?: string;
  }>(),
  responsorialPsalm: jsonb('responsorial_psalm').$type<{
    reference: string;
    response?: string;
    text?: string;
  }>(),
  gospel: jsonb('gospel').$type<{
    reference: string;
    text?: string;
  }>(),
  prayerOfTheFaithful: text('prayer_of_the_faithful'),
  communionAntiphon: text('communion_antiphon'),

  // Additional information
  attributes: jsonb('attributes').$type<string[]>(), // Common symbols, attributes
  quotes: jsonb('quotes').$type<string[]>(), // Famous quotes by/about the saint
  relatedSaints: jsonb('related_saints').$type<string[]>(), // Related saint IDs

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_saints_feast_day').on(table.feastDay),
  index('idx_saints_name').on(table.name),
  index('idx_saints_brazilian').on(table.isBrazilian)
]);

// Relations
export const familiesRelations = relations(families, ({ many }) => ({
  members: many(users)
}));

export const activeSessionsRelations = relations(activeSessions, ({ one }) => ({
  user: one(users, {
    fields: [activeSessions.userId],
    references: [users.id]
  })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id]
  })
}));

export const usersRelations = relations(users, ({ many, one }) => ({
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

export const questionnairesRelations = relations(questionnaires, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [questionnaires.createdById],
    references: [users.id]
  }),
  responses: many(questionnaireResponses)
}));

export const questionnaireResponsesRelations = relations(questionnaireResponses, ({ one }) => ({
  questionnaire: one(questionnaires, {
    fields: [questionnaireResponses.questionnaireId],
    references: [questionnaires.id]
  }),
  user: one(users, {
    fields: [questionnaireResponses.userId],
    references: [users.id]
  })
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
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

export const massExecutionLogsRelations = relations(massExecutionLogs, ({ one }) => ({
  schedule: one(schedules, {
    fields: [massExecutionLogs.scheduleId],
    references: [schedules.id]
  }),
  auxiliary: one(users, {
    fields: [massExecutionLogs.auxiliaryId],
    references: [users.id]
  })
}));

export const standbyMinistersRelations = relations(standbyMinisters, ({ one }) => ({
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

export const ministerCheckInsRelations = relations(ministerCheckIns, ({ one }) => ({
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

export const substitutionRequestsRelations = relations(substitutionRequests, ({ one }) => ({
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

export const formationModulesRelations = relations(formationModules, ({ one, many }) => ({
  track: one(formationTracks, {
    fields: [formationModules.trackId],
    references: [formationTracks.id]
  }),
  progress: many(formationProgress),
  lessons: many(formationLessons)
}));

export const formationProgressRelations = relations(formationProgress, ({ one }) => ({
  user: one(users, {
    fields: [formationProgress.userId],
    references: [users.id]
  }),
  module: one(formationModules, {
    fields: [formationProgress.moduleId],
    references: [formationModules.id]
  })
}));

export const formationTracksRelations = relations(formationTracks, ({ many }) => ({
  modules: many(formationModules),
  lessons: many(formationLessons)
}));

export const formationLessonsRelations = relations(formationLessons, ({ one, many }) => ({
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

export const formationLessonSectionsRelations = relations(formationLessonSections, ({ one }) => ({
  lesson: one(formationLessons, {
    fields: [formationLessonSections.lessonId],
    references: [formationLessons.id]
  })
}));

export const formationLessonProgressRelations = relations(formationLessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [formationLessonProgress.userId],
    references: [users.id]
  }),
  lesson: one(formationLessons, {
    fields: [formationLessonProgress.lessonId],
    references: [formationLessons.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

// Schema exports for forms
export const insertUserSchema = createInsertSchema(users).pick({
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

export const insertQuestionnaireSchema = createInsertSchema(questionnaires).pick({
  title: true,
  description: true,
  month: true,
  year: true,
  questions: true,
  deadline: true,
  targetUserIds: true
});

export const insertMassTimeSchema = createInsertSchema(massTimesConfig).pick({
  dayOfWeek: true,
  time: true,
  minMinisters: true,
  maxMinisters: true,
  isActive: true,
  specialEvent: true,
  eventName: true
});

export const insertFormationTrackSchema = createInsertSchema(formationTracks).pick({
  id: true,
  title: true,
  description: true,
  category: true,
  icon: true,
  orderIndex: true,
  isActive: true
});

export const insertFormationLessonSchema = createInsertSchema(formationLessons).pick({
  moduleId: true,
  trackId: true,
  title: true,
  description: true,
  lessonNumber: true,
  orderIndex: true,
  isActive: true
});

export const insertFormationLessonSectionSchema = createInsertSchema(formationLessonSections).pick({
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

export const insertFormationLessonProgressSchema = createInsertSchema(formationLessonProgress).pick({
  userId: true,
  lessonId: true,
  status: true,
  progressPercentage: true,
  timeSpentMinutes: true,
  completedSections: true
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Family = typeof families.$inferSelect;
export type FamilyRelationship = typeof familyRelationships.$inferSelect;
export type InsertFamilyRelationship = typeof familyRelationships.$inferInsert;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type SubstitutionRequest = typeof substitutionRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type FormationModule = typeof formationModules.$inferSelect;
export type FormationProgress = typeof formationProgress.$inferSelect;
export type MassTimeConfig = typeof massTimesConfig.$inferSelect;
export type InsertMassTime = z.infer<typeof insertMassTimeSchema>;
export type FormationTrack = typeof formationTracks.$inferSelect;
export type InsertFormationTrack = z.infer<typeof insertFormationTrackSchema>;
export type FormationLesson = typeof formationLessons.$inferSelect;
export type InsertFormationLesson = z.infer<typeof insertFormationLessonSchema>;
export type FormationLessonSection = typeof formationLessonSections.$inferSelect;
export type InsertFormationLessonSection = z.infer<typeof insertFormationLessonSectionSchema>;
export type FormationLessonProgress = typeof formationLessonProgress.$inferSelect;
export type InsertFormationLessonProgress = z.infer<typeof insertFormationLessonProgressSchema>;
export type Saint = typeof saints.$inferSelect;
export type InsertSaint = typeof saints.$inferInsert;
export type MassExecutionLog = typeof massExecutionLogs.$inferSelect;
export type InsertMassExecutionLog = typeof massExecutionLogs.$inferInsert;
export type StandbyMinister = typeof standbyMinisters.$inferSelect;
export type InsertStandbyMinister = typeof standbyMinisters.$inferInsert;
export type MinisterCheckIn = typeof ministerCheckIns.$inferSelect;
export type InsertMinisterCheckIn = typeof ministerCheckIns.$inferInsert;
