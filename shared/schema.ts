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
export const userRoleEnum = pgEnum('user_role', ['reitor', 'coordenador', 'ministro']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);
export const scheduleStatusEnum = pgEnum('schedule_status', ['draft', 'published', 'completed']);
export const notificationTypeEnum = pgEnum('notification_type', ['schedule', 'substitution', 'announcement', 'reminder']);

// User storage table for Replit Auth + MESC data
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // MESC specific fields
  name: varchar('name', { length: 255 }).notNull().default(''),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('ministro'),
  status: userStatusEnum('status').notNull().default('pending'),
  requiresPasswordChange: boolean('requires_password_change').default(true),
  
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
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  
  submittedAt: timestamp('submitted_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Schedules
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: scheduleStatusEnum('status').notNull().default('draft'),
  version: integer('version').default(1),
  
  totalAssignments: integer('total_assignments').default(0),
  totalMinisters: integer('total_ministers').default(0),
  
  createdById: varchar('created_by_id').references(() => users.id),
  publishedAt: timestamp('published_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Schedule assignments
export const scheduleAssignments = pgTable('schedule_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id),
  userId: varchar('user_id').notNull().references(() => users.id),
  
  date: date('date').notNull(),
  massTime: time('mass_time').notNull(),
  position: integer('position').notNull(),
  
  confirmed: boolean('confirmed').default(false),
  confirmedAt: timestamp('confirmed_at'),
  present: boolean('present'),
  
  isSubstitution: boolean('is_substitution').default(false),
  originalUserId: varchar('original_user_id').references(() => users.id),
  substitutionReason: text('substitution_reason'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
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
  actionUrl: text('action_url'),
  priority: varchar('priority', { length: 10 }).default('normal'),
  expiresAt: timestamp('expires_at'),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  questionnaires: many(questionnaires),
  questionnaireResponses: many(questionnaireResponses),
  scheduleAssignments: many(scheduleAssignments),
  notifications: many(notifications),
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
  createdBy: one(users, {
    fields: [schedules.createdById],
    references: [users.id]
  }),
  assignments: many(scheduleAssignments)
}));

export const scheduleAssignmentsRelations = relations(scheduleAssignments, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleAssignments.scheduleId],
    references: [schedules.id]
  }),
  user: one(users, {
    fields: [scheduleAssignments.userId],
    references: [users.id]
  }),
  originalUser: one(users, {
    fields: [scheduleAssignments.originalUserId],
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
export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type QuestionnaireResponse = typeof questionnaireResponses.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type ScheduleAssignment = typeof scheduleAssignments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type MassTimeConfig = typeof massTimesConfig.$inferSelect;
export type InsertMassTime = z.infer<typeof insertMassTimeSchema>;
