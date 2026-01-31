import { sql, relations, eq } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  unique,
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
export const materialTypeEnum = pgEnum('material_type', ['pdf', 'document', 'video', 'audio', 'image', 'presentation', 'other']);
export const liturgicalCycleEnum = pgEnum('liturgical_cycle', ['A', 'B', 'C']);
export const liturgicalColorEnum = pgEnum('liturgical_color', ['white', 'red', 'green', 'purple', 'rose', 'black']);
export const celebrationRankEnum = pgEnum('celebration_rank', ['SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL_MEMORIAL', 'FERIAL']);
export const confirmationStatusEnum = pgEnum('confirmation_status', ['pending', 'confirmed', 'declined', 'no_response', 'no_show']);

// Mass configuration enums
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['weekly', 'monthly', 'yearly', 'one_time']);
export const massTypeEnum = pgEnum('mass_type', [
  'missa_diaria',
  'missa_dominical',
  'missa_cura_libertacao',
  'missa_sagrado_coracao',
  'missa_imaculado_coracao',
  'missa_sao_judas',
  'adoracao',
  'novena',
  'festa_padroeiro',
  'finados',
  'evento_especial'
]);
export const learnedPatternTypeEnum = pgEnum('learned_pattern_type', [
  'minister_removal',
  'minister_addition',
  'position_preference',
  'time_preference',
  'mass_type_preference'
]);

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
  preferredPositions: jsonb('preferred_positions').$type<number[]>().default([]),
  avoidPositions: jsonb('avoid_positions').$type<number[]>().default([]),
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

  // 🤖 ADAPTIVE LEARNING: Reliability metrics for intelligent schedule generation
  reliabilityScore: integer('reliability_score').default(100), // 0-100 score based on behavior
  substitutionRequestCount: integer('substitution_request_count').default(0), // How many times requested substitution
  substitutionFulfilledCount: integer('substitution_fulfilled_count').default(0), // How many times helped as substitute
  manualRemovalCount: integer('manual_removal_count').default(0), // Removed from auto-generated schedule by coordinator
  noShowCount: integer('no_show_count').default(0), // Failed to show up when scheduled
  lastReliabilityUpdate: timestamp('last_reliability_update'), // When score was last recalculated
  reliabilityNotes: text('reliability_notes'), // Coordinator notes about reliability issues

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
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  // Filter users by status (pending, active, inactive)
  index('idx_users_status').on(table.status),
  // Filter by role and status (e.g., active ministers)
  index('idx_users_role_status').on(table.role, table.status),
  // Quick email lookup for authentication
  index('idx_users_email').on(table.email)
]);

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
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relatedUserId: varchar('related_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  createdById: varchar('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Questionnaire responses
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull().references(() => questionnaires.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  responses: jsonb('responses').notNull(),
  
  availableSundays: jsonb('available_sundays').$type<string[]>(),
  preferredMassTimes: jsonb('preferred_mass_times').$type<string[]>(),
  alternativeTimes: jsonb('alternative_times').$type<string[]>(),
  dailyMassAvailability: jsonb('daily_mass_availability').$type<string[]>(),
  specialEvents: jsonb('special_events'),
  canSubstitute: boolean('can_substitute').default(false),
  notes: text('notes'),
  
  // Safety net: Capture responses that weren't mapped to any specific field
  unmappedResponses: jsonb('unmapped_responses').$type<Array<{
    questionId: string;
    question?: string;
    answer: unknown;
    metadata?: Record<string, unknown>;
  }>>(),
  
  // Processing warnings/info for debugging
  processingWarnings: jsonb('processing_warnings').$type<string[]>(),
  
  // Family sharing fields
  sharedWithFamilyIds: jsonb('shared_with_family_ids').$type<string[]>(),
  isSharedResponse: boolean('is_shared_response').default(false),
  sharedFromUserId: varchar('shared_from_user_id').references(() => users.id, { onDelete: 'set null' }),

  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Soft delete fields (Phase 1 - Data Integrity)
  deletedAt: timestamp("deleted_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
}, (table) => [
  // Global unique constraint for UPSERT - one response per user per questionnaire (regardless of soft delete status)
  // Soft delete is just a flag - UPSERT always updates the same record and resurrects it
  unique('questionnaire_responses_user_questionnaire_key')
    .on(table.userId, table.questionnaireId),
  // Get all responses for a questionnaire (report generation)
  index('idx_questionnaire_responses_questionnaire').on(table.questionnaireId),
  // Get all responses for a user
  index('idx_questionnaire_responses_user').on(table.userId),
  // Filter deleted responses
  index('idx_questionnaire_responses_deleted').on(table.isDeleted)
]);

// Schedules
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  type: scheduleTypeEnum('type').notNull().default('missa'),
  location: varchar('location', { length: 255 }),
  ministerId: varchar('minister_id').references(() => users.id, { onDelete: 'set null' }),
  position: integer('position').default(0), // Order position for ministers at same date/time
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  substituteId: varchar('substitute_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  onSiteAdjustments: jsonb('on_site_adjustments').$type<{
    originalPosition?: number;
    newPosition?: number;
    adjustedBy?: string;
    adjustedAt?: string;
    reason?: string;
  }[]>(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_schedules_date').on(table.date),
  index('idx_schedules_minister').on(table.ministerId),
  index('idx_schedules_date_time').on(table.date, table.time),
  index('idx_schedules_status').on(table.status),
  // Minister schedule lookup by date (my schedules)
  index('idx_schedules_minister_date').on(table.ministerId, table.date),
  // Published schedules filtering
  index('idx_schedules_date_status').on(table.date, table.status)
]);

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

// Schedule Confirmations (minister attendance confirmation)
export const scheduleConfirmations = pgTable('schedule_confirmations', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  ministerId: varchar('minister_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: confirmationStatusEnum('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at').defaultNow(),
  respondedAt: timestamp('responded_at'),
  reminderSentAt: timestamp('reminder_sent_at'),
  reminderCount: integer('reminder_count').default(0),
  declineReason: text('decline_reason'),
  notes: text('notes'),
  requestedBy: varchar('requested_by').references(() => users.id), // Coordinator who requested
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_schedule_confirmations_schedule').on(table.scheduleId),
  index('idx_schedule_confirmations_minister').on(table.ministerId),
  index('idx_schedule_confirmations_status').on(table.status),
  // Unique constraint: one confirmation per minister per schedule
  uniqueIndex('idx_schedule_confirmations_unique').on(table.scheduleId, table.ministerId)
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
  index('idx_substitution_schedule').on(table.scheduleId),
  // Check substitution status for a schedule
  index('idx_substitution_schedule_status').on(table.scheduleId, table.status),
  // User's substitution history ordered by date
  index('idx_substitution_requester_created').on(table.requesterId, table.createdAt)
]);

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
}, (table) => [
  // Critical: fetching unread notifications for a user
  index('idx_notifications_user_read').on(table.userId, table.read),
  // Listing notifications by user ordered by creation
  index('idx_notifications_user_created').on(table.userId, table.createdAt),
  // Cleanup expired notifications
  index('idx_notifications_expires').on(table.expiresAt)
]);

// Push notification subscriptions
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dhKey: text('p256dh_key').notNull(),
  authKey: text('auth_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
  // Find all subscriptions for a user (sending push notifications)
  index('idx_push_subscriptions_user').on(table.userId)
]);

// Formation tracks (tracks like liturgia, espiritualidade, pratica)
export const formationTracks = pgTable('formation_tracks', {
  id: varchar('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: formationCategoryEnum('category').notNull(),
  orderIndex: integer('order_index').default(0),
  icon: varchar('icon', { length: 128 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation modules
export const formationModules = pgTable('formation_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  trackId: varchar('track_id').notNull().references(() => formationTracks.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: formationCategoryEnum('category'),
  content: text('content'),
  videoUrl: varchar('video_url', { length: 512 }),
  durationMinutes: integer('duration_minutes'),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

// Formation progress
export const formationProgress = pgTable('formation_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').notNull().references(() => formationModules.id, { onDelete: 'cascade' }),
  status: formationStatusEnum('status').notNull().default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Get all progress for a user
  index('idx_formation_progress_user').on(table.userId),
  // Get all progress for a module
  index('idx_formation_progress_module').on(table.moduleId),
  // Unique progress per user/module combination
  index('idx_formation_progress_user_module').on(table.userId, table.moduleId)
]);

// Formation lessons (individual lessons within modules)
export const formationLessons = pgTable('formation_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => formationModules.id),
  trackId: varchar('track_id'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  lessonNumber: integer('lesson_number').notNull(),
  durationMinutes: integer('duration_minutes'),
  objectives: jsonb('objectives'),
  isActive: boolean('is_active').default(true),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation lesson content sections (text, video, etc. within a lesson)
export const formationLessonSections = pgTable('formation_lesson_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').notNull().references(() => formationLessons.id),
  type: lessonContentTypeEnum('type').default('text'),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  videoUrl: varchar('video_url', { length: 512 }),
  audioUrl: varchar('audio_url', { length: 512 }),
  documentUrl: varchar('document_url', { length: 512 }),
  imageUrl: varchar('image_url', { length: 512 }),
  quizData: jsonb('quiz_data'),
  orderIndex: integer('order_index').default(0),
  isRequired: boolean('is_required').default(true),
  estimatedMinutes: integer('estimated_minutes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Formation lesson progress (track user progress through individual lessons)
export const formationLessonProgress = pgTable('formation_lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => formationLessons.id, { onDelete: 'cascade' }),
  status: formationStatusEnum('status').notNull().default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  timeSpentMinutes: integer('time_spent_minutes').default(0),
  completedSections: jsonb('completed_sections'),
  lastAccessedAt: timestamp('last_accessed_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  // Get all lesson progress for a user
  index('idx_formation_lesson_progress_user').on(table.userId),
  // Get all progress for a lesson
  index('idx_formation_lesson_progress_lesson').on(table.lessonId),
  // Unique progress per user/lesson combination
  index('idx_formation_lesson_progress_user_lesson').on(table.userId, table.lessonId)
]);

// Formation Certificates - issued when user completes a track
export const formationCertificates = pgTable('formation_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: varchar('track_id').notNull().references(() => formationTracks.id, { onDelete: 'cascade' }),
  certificateNumber: varchar('certificate_number', { length: 50 }).notNull().unique(),
  userName: varchar('user_name', { length: 255 }).notNull(), // Snapshot of name at issuance
  trackTitle: varchar('track_title', { length: 255 }).notNull(), // Snapshot of track title
  trackCategory: formationCategoryEnum('track_category').notNull(),
  totalLessons: integer('total_lessons').notNull(),
  totalHours: integer('total_hours').notNull(), // Total duration in minutes / 60
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  issuedBy: varchar('issued_by').references(() => users.id, { onDelete: 'set null' }), // Coordinator who issued
  validUntil: timestamp('valid_until'), // Optional expiration
  verificationCode: varchar('verification_code', { length: 20 }).notNull().unique(), // For QR code verification
  metadata: jsonb('metadata').$type<{
    lessonsCompleted: string[];
    completionDate: string;
    averageScore?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_certificates_user').on(table.userId),
  index('idx_certificates_track').on(table.trackId),
  index('idx_certificates_verification').on(table.verificationCode)
]);

// Formation Materials Library - uploaded files for training
export const formationMaterials = pgTable('formation_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: materialTypeEnum('type').notNull().default('pdf'),
  category: formationCategoryEnum('category'), // Optional - links to track category
  trackId: varchar('track_id').references(() => formationTracks.id, { onDelete: 'set null' }), // Optional link to track
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(), // Size in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileData: text('file_data'), // Base64 encoded file content (for smaller files)
  externalUrl: varchar('external_url', { length: 512 }), // URL for external/large files
  thumbnailData: text('thumbnail_data'), // Base64 thumbnail for previews
  tags: jsonb('tags').$type<string[]>().default([]),
  uploadedBy: varchar('uploaded_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  downloadCount: integer('download_count').default(0),
  isPublished: boolean('is_published').default(true),
  isActive: boolean('is_active').default(true),
  // AI Analysis fields
  aiAnalyzed: boolean('ai_analyzed').default(false),
  aiSummary: text('ai_summary'),
  aiSuggestedCategory: formationCategoryEnum('ai_suggested_category'),
  aiSuggestedTags: jsonb('ai_suggested_tags').$type<string[]>(),
  aiKeyTopics: jsonb('ai_key_topics').$type<string[]>(),
  aiContentQuality: varchar('ai_content_quality', { length: 20 }),
  aiQualityNotes: jsonb('ai_quality_notes').$type<string[]>(),
  aiQuizQuestions: jsonb('ai_quiz_questions').$type<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[]>(),
  aiAnalyzedAt: timestamp('ai_analyzed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_materials_category').on(table.category),
  index('idx_materials_track').on(table.trackId),
  index('idx_materials_type').on(table.type),
  index('idx_materials_uploaded_by').on(table.uploadedBy)
]);

// Material access logs for analytics
export const materialAccessLogs = pgTable('material_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').notNull().references(() => formationMaterials.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 20 }).notNull(), // 'view', 'download'
  accessedAt: timestamp('accessed_at').defaultNow()
}, (table) => [
  index('idx_material_access_material').on(table.materialId),
  index('idx_material_access_user').on(table.userId)
]);

// Mass times configuration (legacy - kept for compatibility)
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

// ============================================
// DYNAMIC MASS CONFIGURATION SYSTEM
// ============================================

// Mass Configurations - Recurring mass settings (replaces hardcoded rules)
export const massConfigurations = pgTable('mass_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Recurrence settings
  recurrenceType: recurrenceTypeEnum('recurrence_type').notNull(),
  dayOfWeek: integer('day_of_week'), // 0=Sunday, 1=Monday, ..., 6=Saturday (for weekly)
  dayOfMonth: integer('day_of_month'), // 1-31 (for monthly by day)
  month: integer('month'), // 1-12 (for yearly)
  occurrenceInMonth: integer('occurrence_in_month'), // 1=first, 2=second, -1=last (for "first Thursday of month")

  // Time settings
  time: time('time').notNull(),
  durationMinutes: integer('duration_minutes').default(60),

  // Minister requirements
  minMinisters: integer('min_ministers').notNull().default(3),
  maxMinisters: integer('max_ministers').notNull().default(6),

  // Classification
  massType: massTypeEnum('mass_type').notNull(),
  location: varchar('location', { length: 255 }),

  // Validity and exceptions
  excludedDates: jsonb('excluded_dates').$type<string[]>().default([]), // ISO date strings
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),

  // Priority for conflict resolution (higher = takes precedence)
  priority: integer('priority').default(0),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_mass_configurations_type').on(table.massType),
  index('idx_mass_configurations_recurrence').on(table.recurrenceType),
  index('idx_mass_configurations_active').on(table.isActive),
  index('idx_mass_configurations_day_of_week').on(table.dayOfWeek)
]);

// Special Events - Non-recurring events (novenas, feasts, etc.)
export const specialEvents = pgTable('special_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Event timing
  eventDate: date('event_date').notNull(),
  eventTime: time('event_time').notNull(),
  durationMinutes: integer('duration_minutes').default(60),

  // Minister requirements
  minMinisters: integer('min_ministers').notNull().default(3),
  maxMinisters: integer('max_ministers').notNull().default(6),

  // Classification
  massType: massTypeEnum('mass_type').notNull(),
  location: varchar('location', { length: 255 }),

  // Priority (special events generally have higher priority than regular masses)
  priority: integer('priority').default(100),

  // Which regular masses this event suppresses (if any)
  suppressesMassTypes: jsonb('suppresses_mass_types').$type<string[]>().default([]),

  isActive: boolean('is_active').default(true),
  createdBy: varchar('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_special_events_date').on(table.eventDate),
  index('idx_special_events_type').on(table.massType),
  index('idx_special_events_active').on(table.isActive)
]);

// Question-Mass Mappings - Explicit mapping from custom questions to masses
// This replaces the fragile regex parsing of question text
export const questionMassMappings = pgTable('question_mass_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionnaireId: uuid('questionnaire_id').notNull().references(() => questionnaires.id, { onDelete: 'cascade' }),
  questionId: varchar('question_id', { length: 100 }).notNull(), // The question's ID within the questionnaire

  // Target: either a configuration, special event, or explicit date/time
  massConfigurationId: uuid('mass_configuration_id').references(() => massConfigurations.id, { onDelete: 'set null' }),
  specialEventId: uuid('special_event_id').references(() => specialEvents.id, { onDelete: 'set null' }),
  targetDate: date('target_date'), // For explicit date mapping
  targetTime: time('target_time'), // For explicit time mapping

  // Override minister counts (optional - inherits from config/event if not specified)
  minMinisters: integer('min_ministers'),
  maxMinisters: integer('max_ministers'),

  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_question_mass_mappings_questionnaire').on(table.questionnaireId),
  index('idx_question_mass_mappings_config').on(table.massConfigurationId),
  index('idx_question_mass_mappings_event').on(table.specialEventId),
  unique('unique_question_mapping').on(table.questionnaireId, table.questionId)
]);

// Learned Patterns - Patterns learned from coordinator edits to improve future generations
export const learnedPatterns = pgTable('learned_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Pattern classification
  patternType: learnedPatternTypeEnum('pattern_type').notNull(),

  // Context of the pattern
  ministerId: varchar('minister_id').references(() => users.id, { onDelete: 'cascade' }),
  massType: massTypeEnum('mass_type'),
  dayOfWeek: integer('day_of_week'), // 0-6
  timeSlot: time('time_slot'),

  // Pattern strength
  occurrenceCount: integer('occurrence_count').default(1),
  confidence: integer('confidence').default(50), // 0-100 percentage

  // Weight adjustment to apply (-100 to +100, representing percentage adjustment)
  weightAdjustment: integer('weight_adjustment').default(0),

  // Tracking
  lastOccurrence: timestamp('last_occurrence').defaultNow(),
  notes: text('notes'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_learned_patterns_minister').on(table.ministerId),
  index('idx_learned_patterns_type').on(table.patternType),
  index('idx_learned_patterns_mass_type').on(table.massType),
  index('idx_learned_patterns_active').on(table.isActive),
  // Composite index for pattern lookup during schedule generation
  index('idx_learned_patterns_lookup').on(table.ministerId, table.massType, table.dayOfWeek, table.timeSlot)
]);

// Password reset requests
export const passwordResetRequests = pgTable('password_reset_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  processedBy: varchar('processed_by').references(() => users.id, { onDelete: 'set null' }),
  processedAt: timestamp('processed_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Filter requests by status (pending requests queue)
  index('idx_password_reset_status').on(table.status),
  // Get requests for a user
  index('idx_password_reset_user').on(table.userId)
]);

// Adoration draws - tracks sorteios para adoração ao Santíssimo
export const adorationDraws = pgTable('adoration_draws', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  totalMinistersToDraw: integer('total_ministers_to_draw').notNull(),
  createdBy: varchar('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_adoration_draws_month_year').on(table.year, table.month)
]);

// Adoration draw results - ministros sorteados
export const adorationDrawResults = pgTable('adoration_draw_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  drawId: uuid('draw_id').notNull().references(() => adorationDraws.id, { onDelete: 'cascade' }),
  ministerId: varchar('minister_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mondayOfWeek: integer('monday_of_week').notNull(), // Semana do mês (1, 2, 3, 4, 5)
  isVoluntary: boolean('is_voluntary').default(false), // true = respondeu sim no questionário, false = sorteado obrigatoriamente
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_adoration_draw_results_draw').on(table.drawId),
  index('idx_adoration_draw_results_minister').on(table.ministerId),
  unique('unique_adoration_draw_minister_week').on(table.drawId, table.ministerId, table.mondayOfWeek)
]);

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
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// ============================================
// GAMIFICATION SYSTEM TABLES
// ============================================

// Badge categories enum
export const badgeCategoryEnum = pgEnum('badge_category', [
  'participation',    // Participacao em missas
  'formation',        // Formacao e aprendizado
  'community',        // Comunidade e ajuda
  'streak',           // Sequencias e consistencia
  'milestone',        // Marcos importantes
  'special'           // Eventos especiais
]);

// Badge rarity enum
export const badgeRarityEnum = pgEnum('badge_rarity', [
  'common',           // Comum - facil de obter
  'uncommon',         // Incomum
  'rare',             // Raro
  'epic',             // Epico
  'legendary'         // Lendario - muito dificil
]);

// Badge definitions
export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Unique identifier
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: badgeCategoryEnum('category').notNull(),
  rarity: badgeRarityEnum('rarity').notNull().default('common'),
  iconName: varchar('icon_name', { length: 50 }), // Lucide icon name
  iconColor: varchar('icon_color', { length: 20 }), // Tailwind color class
  pointsAwarded: integer('points_awarded').default(0),
  requirement: jsonb('requirement').$type<{
    type: string;
    value: number;
    description: string;
  }>(),
  isActive: boolean('is_active').default(true),
  isSecret: boolean('is_secret').default(false), // Hidden until earned
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_badges_category').on(table.category),
  index('idx_badges_active').on(table.isActive)
]);

// User badges - badges earned by users
export const userBadges = pgTable('user_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at').defaultNow(),
  isFeatured: boolean('is_featured').default(false), // Displayed prominently on profile
  progress: integer('progress').default(100), // For partial progress badges
  metadata: jsonb('metadata') // Additional context
}, (table) => [
  index('idx_user_badges_user').on(table.userId),
  index('idx_user_badges_badge').on(table.badgeId),
  unique('unique_user_badge').on(table.userId, table.badgeId)
]);

// User points summary
export const userPoints = pgTable('user_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalPoints: integer('total_points').default(0),
  currentStreak: integer('current_streak').default(0), // Consecutive weeks serving
  longestStreak: integer('longest_streak').default(0),
  level: integer('level').default(1),
  levelProgress: integer('level_progress').default(0), // Points towards next level
  massesServed: integer('masses_served').default(0),
  substitutionsHelped: integer('substitutions_helped').default(0),
  materialsCompleted: integer('materials_completed').default(0),
  quizzesCompleted: integer('quizzes_completed').default(0),
  lastActivityAt: timestamp('last_activity_at'),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_user_points_total').on(table.totalPoints),
  index('idx_user_points_level').on(table.level)
]);

// Point action types enum
export const pointActionEnum = pgEnum('point_action', [
  'mass_served',           // Serviu em missa
  'substitution_offered',  // Ofereceu substituicao
  'substitution_accepted', // Aceitou substituir alguem
  'material_completed',    // Completou material de formacao
  'quiz_completed',        // Completou quiz
  'quiz_perfect',          // Quiz com 100%
  'streak_bonus',          // Bonus de sequencia
  'badge_earned',          // Ganhou badge
  'login_bonus',           // Bonus de login diario
  'first_action',          // Primeira acao (boas vindas)
  'community_help',        // Ajudou na comunidade
  'special_event'          // Evento especial
]);

// Point transactions history
export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: pointActionEnum('action').notNull(),
  points: integer('points').notNull(), // Positive for earned, negative for spent
  description: text('description'),
  relatedEntityType: varchar('related_entity_type', { length: 50 }), // schedule, material, badge, etc
  relatedEntityId: varchar('related_entity_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_point_transactions_user').on(table.userId),
  index('idx_point_transactions_action').on(table.action),
  index('idx_point_transactions_created').on(table.createdAt)
]);

// Leaderboard cache (updated periodically)
export const leaderboardCache = pgTable('leaderboard_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  period: varchar('period', { length: 20 }).notNull(), // weekly, monthly, yearly, alltime
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rank: integer('rank').notNull(),
  points: integer('points').notNull(),
  level: integer('level').default(1),
  userName: varchar('user_name', { length: 255 }),
  userPhotoUrl: text('user_photo_url'),
  calculatedAt: timestamp('calculated_at').defaultNow()
}, (table) => [
  index('idx_leaderboard_period').on(table.period),
  index('idx_leaderboard_rank').on(table.period, table.rank),
  unique('unique_leaderboard_entry').on(table.period, table.userId)
]);

// Level definitions
export const levelDefinitions = pgTable('level_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  level: integer('level').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  minPoints: integer('min_points').notNull(),
  maxPoints: integer('max_points'),
  iconName: varchar('icon_name', { length: 50 }),
  color: varchar('color', { length: 20 }),
  benefits: jsonb('benefits').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_level_definitions_level').on(table.level),
  index('idx_level_definitions_points').on(table.minPoints)
]);

// Schedule Generations - stores each schedule generation for comparison and learning
export const scheduleGenerationStatusEnum = pgEnum('schedule_generation_status', ['draft', 'published']);

export const scheduleGenerations = pgTable('schedule_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: scheduleGenerationStatusEnum('status').notNull().default('draft'),
  originalSchedule: jsonb('original_schedule').notNull(), // Schedule generated by algorithm (full JSON)
  finalSchedule: jsonb('final_schedule'), // Schedule after edits (filled on publish)
  differences: jsonb('differences'), // Calculated differences between original and final
  generationMetrics: jsonb('generation_metrics'), // Generation metrics (confidence, etc)
  createdAt: timestamp('created_at').defaultNow(),
  publishedAt: timestamp('published_at'),
  createdById: varchar('created_by_id').references(() => users.id, { onDelete: 'set null' })
}, (table) => [
  index('idx_schedule_generations_month_year').on(table.month, table.year),
  index('idx_schedule_generations_status').on(table.status),
  index('idx_schedule_generations_created_by').on(table.createdById)
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
  lessons: many(formationLessons),
  progress: many(formationProgress)
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

export const formationMaterialsRelations = relations(formationMaterials, ({ one, many }) => ({
  track: one(formationTracks, {
    fields: [formationMaterials.trackId],
    references: [formationTracks.id]
  }),
  uploader: one(users, {
    fields: [formationMaterials.uploadedBy],
    references: [users.id]
  }),
  accessLogs: many(materialAccessLogs)
}));

export const materialAccessLogsRelations = relations(materialAccessLogs, ({ one }) => ({
  material: one(formationMaterials, {
    fields: [materialAccessLogs.materialId],
    references: [formationMaterials.id]
  }),
  user: one(users, {
    fields: [materialAccessLogs.userId],
    references: [users.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const scheduleGenerationsRelations = relations(scheduleGenerations, ({ one }) => ({
  createdBy: one(users, {
    fields: [scheduleGenerations.createdById],
    references: [users.id]
  })
}));

// Mass Configuration System Relations
export const massConfigurationsRelations = relations(massConfigurations, ({ many }) => ({
  questionMappings: many(questionMassMappings)
}));

export const specialEventsRelations = relations(specialEvents, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [specialEvents.createdBy],
    references: [users.id]
  }),
  questionMappings: many(questionMassMappings)
}));

export const questionMassMappingsRelations = relations(questionMassMappings, ({ one }) => ({
  questionnaire: one(questionnaires, {
    fields: [questionMassMappings.questionnaireId],
    references: [questionnaires.id]
  }),
  massConfiguration: one(massConfigurations, {
    fields: [questionMassMappings.massConfigurationId],
    references: [massConfigurations.id]
  }),
  specialEvent: one(specialEvents, {
    fields: [questionMassMappings.specialEventId],
    references: [specialEvents.id]
  })
}));

export const learnedPatternsRelations = relations(learnedPatterns, ({ one }) => ({
  minister: one(users, {
    fields: [learnedPatterns.ministerId],
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
  observations: true,
  extraActivities: true
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
  durationMinutes: true,
  objectives: true,
  isActive: true,
  orderIndex: true
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
  completedSections: true,
  lastAccessedAt: true
});

// Formation materials schema
export const insertFormationMaterialSchema = createInsertSchema(formationMaterials).pick({
  title: true,
  description: true,
  type: true,
  category: true,
  trackId: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  fileData: true,
  externalUrl: true,
  thumbnailData: true,
  tags: true,
  uploadedBy: true,
  isPublished: true
});

// Adoration schemas
export const insertAdorationDrawSchema = createInsertSchema(adorationDraws).pick({
  month: true,
  year: true,
  totalMinistersToDraw: true,
  createdBy: true
});

export type AdorationDraw = typeof adorationDraws.$inferSelect;
export type InsertAdorationDraw = z.infer<typeof insertAdorationDrawSchema>;
export type AdorationDrawResult = typeof adorationDrawResults.$inferSelect;

// Mass Configuration schemas
export const insertMassConfigurationSchema = createInsertSchema(massConfigurations).pick({
  name: true,
  description: true,
  recurrenceType: true,
  dayOfWeek: true,
  dayOfMonth: true,
  month: true,
  occurrenceInMonth: true,
  time: true,
  durationMinutes: true,
  minMinisters: true,
  maxMinisters: true,
  massType: true,
  location: true,
  excludedDates: true,
  validFrom: true,
  validUntil: true,
  priority: true,
  isActive: true
});

export const insertSpecialEventSchema = createInsertSchema(specialEvents).pick({
  name: true,
  description: true,
  eventDate: true,
  eventTime: true,
  durationMinutes: true,
  minMinisters: true,
  maxMinisters: true,
  massType: true,
  location: true,
  priority: true,
  suppressesMassTypes: true,
  isActive: true,
  createdBy: true
});

export const insertQuestionMassMappingSchema = createInsertSchema(questionMassMappings).pick({
  questionnaireId: true,
  questionId: true,
  massConfigurationId: true,
  specialEventId: true,
  targetDate: true,
  targetTime: true,
  minMinisters: true,
  maxMinisters: true,
  notes: true
});

export const insertLearnedPatternSchema = createInsertSchema(learnedPatterns).pick({
  patternType: true,
  ministerId: true,
  massType: true,
  dayOfWeek: true,
  timeSlot: true,
  occurrenceCount: true,
  confidence: true,
  weightAdjustment: true,
  notes: true,
  isActive: true
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
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
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
export type FormationCertificate = typeof formationCertificates.$inferSelect;
export type InsertFormationCertificate = typeof formationCertificates.$inferInsert;
export type FormationMaterial = typeof formationMaterials.$inferSelect;
export type InsertFormationMaterial = z.infer<typeof insertFormationMaterialSchema>;
export type MaterialAccessLog = typeof materialAccessLogs.$inferSelect;
export type InsertMaterialAccessLog = typeof materialAccessLogs.$inferInsert;
export type Saint = typeof saints.$inferSelect;
export type InsertSaint = typeof saints.$inferInsert;
export type MassExecutionLog = typeof massExecutionLogs.$inferSelect;
export type InsertMassExecutionLog = typeof massExecutionLogs.$inferInsert;
export type StandbyMinister = typeof standbyMinisters.$inferSelect;
export type InsertStandbyMinister = typeof standbyMinisters.$inferInsert;
export type MinisterCheckIn = typeof ministerCheckIns.$inferSelect;
export type InsertMinisterCheckIn = typeof ministerCheckIns.$inferInsert;
export type ScheduleConfirmation = typeof scheduleConfirmations.$inferSelect;
export type InsertScheduleConfirmation = typeof scheduleConfirmations.$inferInsert;

// Schedule Generation types
export type ScheduleGeneration = typeof scheduleGenerations.$inferSelect;
export type InsertScheduleGeneration = typeof scheduleGenerations.$inferInsert;

// Gamification types
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;
export type UserPoints = typeof userPoints.$inferSelect;
export type InsertUserPoints = typeof userPoints.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;
export type LeaderboardEntry = typeof leaderboardCache.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardCache.$inferInsert;
export type LevelDefinition = typeof levelDefinitions.$inferSelect;
export type InsertLevelDefinition = typeof levelDefinitions.$inferInsert;

// Mass Configuration types
export type MassConfiguration = typeof massConfigurations.$inferSelect;
export type InsertMassConfiguration = z.infer<typeof insertMassConfigurationSchema>;
export type SpecialEvent = typeof specialEvents.$inferSelect;
export type InsertSpecialEvent = z.infer<typeof insertSpecialEventSchema>;
export type QuestionMassMapping = typeof questionMassMappings.$inferSelect;
export type InsertQuestionMassMapping = z.infer<typeof insertQuestionMassMappingSchema>;
export type LearnedPattern = typeof learnedPatterns.$inferSelect;
export type InsertLearnedPattern = z.infer<typeof insertLearnedPatternSchema>;
