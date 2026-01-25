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
    answer: any;
    metadata?: any;
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
