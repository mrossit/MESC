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
export const substitutionStatusEnum = pgEnum('substitution_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const notificationTypeEnum = pgEnum('notification_type', ['schedule', 'substitution', 'formation', 'announcement', 'reminder']);
export const formationCategoryEnum = pgEnum('formation_category', ['liturgia', 'espiritualidade', 'pratica']);
export const formationStatusEnum = pgEnum('formation_status', ['not_started', 'in_progress', 'completed']);

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
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  substituteId: varchar('substitute_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// Substitution requests
export const substitutionRequests = pgTable('substitution_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id),
  requesterId: varchar('requester_id').notNull().references(() => users.id),
  substituteId: varchar('substitute_id').references(() => users.id),
  reason: text('reason'),
  status: substitutionStatusEnum('status').notNull().default('pending'),
  approvedBy: varchar('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow()
});

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

// Formation modules
export const formationModules = pgTable('formation_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: formationCategoryEnum('category').notNull(),
  content: text('content'),
  videoUrl: varchar('video_url', { length: 255 }),
  durationMinutes: integer('duration_minutes'),
  orderIndex: integer('order_index'),
  createdAt: timestamp('created_at').defaultNow()
});

// Formation progress
export const formationProgress = pgTable('formation_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull().references(() => users.id),
  moduleId: uuid('module_id').notNull().references(() => formationModules.id),
  status: formationStatusEnum('status').notNull().default('not_started'),
  progressPercentage: integer('progress_percentage').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow()
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

// Relations
export const familiesRelations = relations(families, ({ many }) => ({
  members: many(users)
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
  substitutionRequests: many(substitutionRequests)
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

export const formationModulesRelations = relations(formationModules, ({ many }) => ({
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

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Family = typeof families.$inferSelect;
export type FamilyRelationship = typeof familyRelationships.$inferSelect;
export type InsertFamilyRelationship = typeof familyRelationships.$inferInsert;
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
