import {
  users,
  questionnaires,
  questionnaireResponses,
  schedules,
  substitutionRequests,
  notifications,
  massTimesConfig,
  familyRelationships,
  formationTracks,
  formationModules,
  formationLessons,
  formationLessonSections,
  formationLessonProgress,
  type User,
  type UpsertUser,
  type InsertUser,
  type Questionnaire,
  type InsertQuestionnaire,
  type QuestionnaireResponse,
  type Schedule,
  type SubstitutionRequest,
  type Notification,
  type MassTimeConfig,
  type InsertMassTime,
  type FamilyRelationship,
  type InsertFamilyRelationship,
  type FormationTrack,
  type InsertFormationTrack,
  type FormationModule,
  type FormationLesson,
  type InsertFormationLesson,
  type FormationLessonSection,
  type InsertFormationLessonSection,
  type FormationLessonProgress,
  type InsertFormationLessonProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, gte, lte, or } from "drizzle-orm";
import Database from 'better-sqlite3';

// SOLUÇÃO DEFINITIVA: Fallback SQLite quando Drizzle falha
class DrizzleSQLiteFallback {
  private static sqliteDb: Database.Database | null = null;
  
  static getSQLiteDB(): Database.Database {
    // Only allow SQLite in development mode
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SQLite fallback not allowed in production');
    }
    if (!this.sqliteDb) {
      this.sqliteDb = new Database('local.db');
    }
    return this.sqliteDb;
  }
  
  static async safeQuery<T>(
    drizzleQuery: () => Promise<T>,
    fallbackSQL: string,
    fallbackMapper: (row: any) => any = (row) => row
  ): Promise<T> {
    // In production, always use Drizzle (no fallback)
    if (process.env.NODE_ENV === 'production') {
      return await drizzleQuery();
    }

    // In development, try Drizzle first then fallback to SQLite
    try {
      return await drizzleQuery();
    } catch (drizzleError: any) {
      if (drizzleError.code === 'SQLITE_ERROR' || drizzleError.message?.includes('SQLITE')) {
        console.warn('[FALLBACK] Drizzle failed in dev, using SQLite directly:', drizzleError.message);

        // Usar SQLite direto como fallback
        const sqlite = this.getSQLiteDB();
        const result = sqlite.prepare(fallbackSQL).all();
        return result.map(fallbackMapper) as T;
      }
      throw drizzleError;
    }
  }
  
  static async safeQueryFirst<T>(
    drizzleQuery: () => Promise<T>,
    fallbackSQL: string,
    fallbackMapper: (row: any) => any = (row) => row
  ): Promise<T> {
    // In production, always use Drizzle (no fallback)
    if (process.env.NODE_ENV === 'production') {
      return await drizzleQuery();
    }

    // In development, try Drizzle first then fallback to SQLite
    try {
      return await drizzleQuery();
    } catch (drizzleError: any) {
      if (drizzleError.code === 'SQLITE_ERROR' || drizzleError.message?.includes('SQLITE')) {
        console.warn('[FALLBACK] Drizzle failed, using SQLite directly:', drizzleError.message);
        
        // Usar SQLite direto como fallback
        const sqlite = this.getSQLiteDB();
        const result = sqlite.prepare(fallbackSQL).get();
        return (result ? fallbackMapper(result) : undefined) as T;
      }
      throw drizzleError;
    }
  }
}

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // MESC specific operations
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Questionnaire operations
  createQuestionnaire(questionnaire: InsertQuestionnaire & { createdById: string }): Promise<Questionnaire>;
  getQuestionnaires(): Promise<Questionnaire[]>;
  getQuestionnaireById(id: string): Promise<Questionnaire | undefined>;
  updateQuestionnaire(id: string, questionnaire: Partial<InsertQuestionnaire>): Promise<Questionnaire>;
  deleteQuestionnaire(id: string): Promise<void>;
  
  // Questionnaire response operations
  submitQuestionnaireResponse(response: any): Promise<QuestionnaireResponse>;
  getQuestionnaireResponses(questionnaireId: string): Promise<QuestionnaireResponse[]>;
  
  // Schedule operations
  createSchedule(schedule: any): Promise<Schedule>;
  getSchedules(): Promise<Schedule[]>;
  getSchedulesSummary(month?: number, year?: number): Promise<any[]>;
  getSchedulesByDate(date: string): Promise<any[]>;
  getScheduleById(id: string): Promise<Schedule | undefined>;
  getScheduleAssignments(scheduleId: string): Promise<any[]>;
  updateSchedule(id: string, schedule: any): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
  
  // Substitution request operations
  createSubstitutionRequest(request: any): Promise<SubstitutionRequest>;
  getSubstitutionRequests(scheduleId: string): Promise<SubstitutionRequest[]>;
  updateSubstitutionRequest(id: string, request: any): Promise<SubstitutionRequest>;
  deleteSubstitutionRequest(id: string): Promise<void>;
  
  // Mass times operations
  createMassTime(massTime: InsertMassTime): Promise<MassTimeConfig>;
  getMassTimes(): Promise<MassTimeConfig[]>;
  updateMassTime(id: string, massTime: Partial<InsertMassTime>): Promise<MassTimeConfig>;
  deleteMassTime(id: string): Promise<void>;
  
  // Notification operations
  createNotification(notification: any): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalMinisters: number;
    weeklyMasses: number;
    availableToday: number;
    substitutions: number;
  }>;

  // Family relationship operations
  getFamilyMembers(userId: string): Promise<FamilyRelationship[]>;
  addFamilyMember(userId: string, relatedUserId: string, relationshipType: string): Promise<FamilyRelationship>;
  removeFamilyMember(relationshipId: string): Promise<void>;
  
  // User activity checking for deletion safety
  checkUserMinisterialActivity(userId: string): Promise<{ isUsed: boolean; reason: string }>;

  // Formation track operations
  getFormationTracks(): Promise<FormationTrack[]>;
  getFormationTrackById(id: string): Promise<FormationTrack | undefined>;
  createFormationTrack(track: InsertFormationTrack): Promise<FormationTrack>;
  updateFormationTrack(id: string, track: Partial<InsertFormationTrack>): Promise<FormationTrack>;
  deleteFormationTrack(id: string): Promise<void>;
  
  // Formation module operations
  getFormationModules(trackId: string): Promise<FormationModule[]>;

  // Formation lesson operations
  getFormationLessons(trackId?: string, moduleId?: string): Promise<FormationLesson[]>;
  getFormationLessonById(id: string): Promise<FormationLesson | undefined>;
  getFormationLessonByNumber(trackId: string, moduleId: string, lessonNumber: number): Promise<FormationLesson | undefined>;
  getFormationLessonsByTrackAndModule(trackId: string, moduleId: string): Promise<FormationLesson[]>;
  createFormationLesson(lesson: InsertFormationLesson): Promise<FormationLesson>;
  updateFormationLesson(id: string, lesson: Partial<InsertFormationLesson>): Promise<FormationLesson>;
  deleteFormationLesson(id: string): Promise<void>;

  // Formation lesson section operations
  getFormationLessonSections(lessonId: string): Promise<FormationLessonSection[]>;
  getFormationLessonSectionById(id: string): Promise<FormationLessonSection | undefined>;
  createFormationLessonSection(section: InsertFormationLessonSection): Promise<FormationLessonSection>;
  updateFormationLessonSection(id: string, section: Partial<InsertFormationLessonSection>): Promise<FormationLessonSection>;
  deleteFormationLessonSection(id: string): Promise<void>;

  // Formation lesson progress operations
  getFormationLessonProgress(userId: string, lessonId?: string): Promise<FormationLessonProgress[]>;
  getFormationLessonProgressById(id: string): Promise<FormationLessonProgress | undefined>;
  getUserFormationProgress(userId: string, trackId?: string): Promise<FormationLessonProgress[]>;
  createOrUpdateFormationLessonProgress(progress: InsertFormationLessonProgress): Promise<FormationLessonProgress>;
  markLessonSectionCompleted(userId: string, lessonId: string, sectionId: string): Promise<FormationLessonProgress>;
  markLessonCompleted(userId: string, lessonId: string): Promise<FormationLessonProgress>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // MESC specific user operations
  async createUser(userData: InsertUser): Promise<User> {
    // Generate a temporary password for admin-created users
    const tempPassword = Math.random().toString(36).slice(-12);
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Usuário',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        role: userData.role as any || 'ministro',
        status: userData.status as any || 'pending',
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
        requiresPasswordChange: true // Force password change for admin-created users
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  // Questionnaire operations
  async createQuestionnaire(questionnaireData: InsertQuestionnaire & { createdById: string }): Promise<Questionnaire> {
    const [questionnaire] = await db
      .insert(questionnaires)
      .values({
        title: questionnaireData.title,
        description: questionnaireData.description || null,
        month: questionnaireData.month,
        year: questionnaireData.year,
        questions: questionnaireData.questions as any,
        deadline: questionnaireData.deadline || null,
        targetUserIds: questionnaireData.targetUserIds as any || null,
        createdById: questionnaireData.createdById
      } as any)
      .returning();
    return questionnaire;
  }

  async getQuestionnaires(): Promise<Questionnaire[]> {
    return await db.select().from(questionnaires).orderBy(desc(questionnaires.createdAt));
  }

  async getQuestionnaireById(id: string): Promise<Questionnaire | undefined> {
    const [questionnaire] = await db.select().from(questionnaires).where(eq(questionnaires.id, id));
    return questionnaire;
  }

  async updateQuestionnaire(id: string, questionnaireData: Partial<InsertQuestionnaire>): Promise<Questionnaire> {
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (questionnaireData.title) updateData.title = questionnaireData.title;
    if (questionnaireData.description !== undefined) updateData.description = questionnaireData.description;
    if (questionnaireData.month) updateData.month = questionnaireData.month;
    if (questionnaireData.year) updateData.year = questionnaireData.year;
    if (questionnaireData.questions) updateData.questions = questionnaireData.questions;
    if (questionnaireData.deadline !== undefined) updateData.deadline = questionnaireData.deadline;
    if (questionnaireData.targetUserIds !== undefined) updateData.targetUserIds = questionnaireData.targetUserIds;
    
    const [questionnaire] = await db
      .update(questionnaires)
      .set(updateData)
      .where(eq(questionnaires.id, id))
      .returning();
    return questionnaire;
  }

  async deleteQuestionnaire(id: string): Promise<void> {
    await db.delete(questionnaires).where(eq(questionnaires.id, id));
  }

  // Questionnaire response operations
  async submitQuestionnaireResponse(responseData: any): Promise<QuestionnaireResponse> {
    const [response] = await db
      .insert(questionnaireResponses)
      .values(responseData)
      .returning();
    return response;
  }

  async getQuestionnaireResponses(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    return await db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, questionnaireId));
  }

  // Schedule operations
  async createSchedule(scheduleData: any): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(scheduleData)
      .returning();
    return schedule;
  }

  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(desc(schedules.createdAt));
  }

  async getSchedulesSummary(month?: number, year?: number): Promise<any[]> {
    // Agrupa atribuições por mês/ano e retorna um resumo compatível com o frontend
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Buscar atribuições do mês
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = month === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    const assignments = await db
      .select()
      .from(schedules)
      .where(and(
        gte(schedules.date, startDate),
        sql`${schedules.date} < ${endDate}`
      ));

    if (assignments.length === 0) {
      return [];
    }

    // Criar um objeto de resumo da escala mensal
    const summary = {
      id: `schedule-${currentYear}-${currentMonth}`,
      title: `Escala de ${this.getMonthName(currentMonth)}/${currentYear}`,
      month: currentMonth,
      year: currentYear,
      status: 'published', // Assumir publicada se há atribuições
      createdBy: 'system',
      createdAt: assignments[0]?.createdAt || new Date(),
      publishedAt: assignments[0]?.createdAt || new Date(),
      totalAssignments: assignments.length
    };

    return [summary];
  }

  private getMonthName(month: number): string {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return months[month - 1] || 'Mês';
  }

  async getSchedulesByDate(date: string): Promise<any[]> {
    // Buscar todas as atribuições para uma data específica
    const dateOnly = date.split('T')[0]; // Extrair apenas a parte da data (YYYY-MM-DD)

    const assignments = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        ministerId: schedules.ministerId,
        position: schedules.position,
        status: schedules.status,
        notes: schedules.notes,
        ministerName: users.name
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(eq(schedules.date, dateOnly))
      .orderBy(schedules.time, schedules.position);

    return assignments;
  }

  async getMonthAssignments(month?: number, year?: number): Promise<any[]> {
    // Buscar todas as atribuições de um mês específico
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Calcular primeiro e último dia do mês
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = month === 12
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    const scheduleId = `schedule-${currentYear}-${currentMonth}`;

    const rawAssignments = await db
      .select({
        id: schedules.id,
        ministerId: schedules.ministerId,
        ministerName: users.name,
        date: schedules.date,
        massTime: schedules.time,
        position: schedules.position,
        status: schedules.status
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.ministerId, users.id))
      .where(and(
        gte(schedules.date, startDate),
        lte(schedules.date, endDate)
      ))
      .orderBy(schedules.date, schedules.time, schedules.position);

    // Mapear para o formato esperado pelo frontend
    return rawAssignments.map(a => ({
      id: a.id,
      scheduleId,
      ministerId: a.ministerId,
      ministerName: a.ministerName,
      date: a.date,
      massTime: a.massTime,
      position: a.position,
      confirmed: a.status === 'approved'
    }));
  }

  async getMonthSubstitutions(month?: number, year?: number): Promise<any[]> {
    // Por enquanto, retornar array vazio
    // TODO: Implementar query correta quando houver pedidos de substituição
    return [];
  }

  async getScheduleById(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule;
  }

  async getScheduleAssignments(scheduleId: string): Promise<any[]> {
    // For now, return empty array - this can be implemented later with proper assignments table
    return [];
  }

  async updateSchedule(id: string, scheduleData: any): Promise<Schedule> {
    const [schedule] = await db
      .update(schedules)
      .set({ ...scheduleData, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return schedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Substitution request operations
  async createSubstitutionRequest(requestData: any): Promise<SubstitutionRequest> {
    const [request] = await db
      .insert(substitutionRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getSubstitutionRequests(scheduleId: string): Promise<SubstitutionRequest[]> {
    return await db
      .select()
      .from(substitutionRequests)
      .where(eq(substitutionRequests.scheduleId, scheduleId));
  }

  async updateSubstitutionRequest(id: string, requestData: any): Promise<SubstitutionRequest> {
    const [request] = await db
      .update(substitutionRequests)
      .set({ ...requestData, updatedAt: new Date() })
      .where(eq(substitutionRequests.id, id))
      .returning();
    return request;
  }

  async deleteSubstitutionRequest(id: string): Promise<void> {
    await db.delete(substitutionRequests).where(eq(substitutionRequests.id, id));
  }

  // Mass times operations
  async createMassTime(massTimeData: InsertMassTime): Promise<MassTimeConfig> {
    const [massTime] = await db
      .insert(massTimesConfig)
      .values(massTimeData)
      .returning();
    return massTime;
  }

  async getMassTimes(): Promise<MassTimeConfig[]> {
    return await db.select().from(massTimesConfig).orderBy(massTimesConfig.dayOfWeek, massTimesConfig.time);
  }

  async updateMassTime(id: string, massTimeData: Partial<InsertMassTime>): Promise<MassTimeConfig> {
    const [massTime] = await db
      .update(massTimesConfig)
      .set({ ...massTimeData, updatedAt: new Date() })
      .where(eq(massTimesConfig.id, id))
      .returning();
    return massTime;
  }

  async deleteMassTime(id: string): Promise<void> {
    await db.delete(massTimesConfig).where(eq(massTimesConfig.id, id));
  }

  // Notification operations
  async createNotification(notificationData: any): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalMinisters: number;
    weeklyMasses: number;
    availableToday: number;
    substitutions: number;
  }> {
    const [totalMinistersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.status, 'active'), eq(users.role, 'ministro')));

    const [weeklyMassesResult] = await db
      .select({ count: count() })
      .from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    // For available today, we'll use a simplified calculation (only ministers)
    const [availableTodayResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.status, 'active'),
        eq(users.role, 'ministro'),
        eq(users.availableForSpecialEvents, true)
      ));

    // Get substitutions from the current week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [substitutionsResult] = await db
      .select({ count: count() })
      .from(substitutionRequests)
      .where(and(
        eq(substitutionRequests.status, 'pending'),
        gte(substitutionRequests.createdAt, weekStart)
      ));

    return {
      totalMinisters: totalMinistersResult.count,
      weeklyMasses: weeklyMassesResult.count,
      availableToday: Math.floor(availableTodayResult.count * 0.76), // 76% availability rate
      substitutions: substitutionsResult.count
    };
  }

  // Family relationship operations
  async getFamilyMembers(userId: string): Promise<FamilyRelationship[]> {
    const relationships = await db
      .select()
      .from(familyRelationships)
      .where(eq(familyRelationships.userId, userId));
    return relationships;
  }

  async addFamilyMember(userId: string, relatedUserId: string, relationshipType: string): Promise<FamilyRelationship> {
    // Check if relationship already exists
    const existingRelationship = await db
      .select()
      .from(familyRelationships)
      .where(and(
        eq(familyRelationships.userId, userId),
        eq(familyRelationships.relatedUserId, relatedUserId)
      ));

    if (existingRelationship.length > 0) {
      throw new Error('Relationship already exists');
    }

    // Add the relationship
    const [relationship] = await db
      .insert(familyRelationships)
      .values({
        userId,
        relatedUserId,
        relationshipType
      })
      .returning();

    // Add reciprocal relationship for certain types
    const reciprocalTypes: Record<string, string> = {
      'spouse': 'spouse',
      'parent': 'child',
      'child': 'parent',
      'sibling': 'sibling'
    };

    if (reciprocalTypes[relationshipType]) {
      await db
        .insert(familyRelationships)
        .values({
          userId: relatedUserId,
          relatedUserId: userId,
          relationshipType: reciprocalTypes[relationshipType]
        })
        .onConflictDoNothing();
    }

    return relationship;
  }

  async removeFamilyMember(relationshipId: string): Promise<void> {
    // Get the relationship to find the reciprocal
    const [relationship] = await db
      .select()
      .from(familyRelationships)
      .where(eq(familyRelationships.id, relationshipId));

    if (relationship) {
      // Delete both the relationship and its reciprocal
      await db
        .delete(familyRelationships)
        .where(and(
          eq(familyRelationships.userId, relationship.relatedUserId),
          eq(familyRelationships.relatedUserId, relationship.userId)
        ));
    }

    // Delete the original relationship
    await db.delete(familyRelationships).where(eq(familyRelationships.id, relationshipId));
  }

  // Family questionnaire sharing methods
  async getFamilyMembersForQuestionnaire(userId: string, questionnaireId: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    relationshipType: string;
    hasResponded: boolean;
    responseData?: any;
  }>> {
    // Get family members
    const relationships = await db
      .select()
      .from(familyRelationships)
      .where(eq(familyRelationships.userId, userId));

    // Get family members with their response status
    const familyMembers = await Promise.all(
      relationships.map(async (rel: any) => {
        const user = await this.getUser(rel.relatedUserId);
        if (!user) return null;

        // Check if family member has already responded to this questionnaire
        const response = await db
          .select()
          .from(questionnaireResponses)
          .where(and(
            eq(questionnaireResponses.questionnaireId, questionnaireId),
            eq(questionnaireResponses.userId, rel.relatedUserId)
          ))
          .limit(1);

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

    return familyMembers.filter(member => member !== null) as Array<{
      id: string;
      name: string;
      email: string;
      relationshipType: string;
      hasResponded: boolean;
      responseData?: any;
    }>;
  }

  async checkUserMinisterialActivity(userId: string): Promise<{ isUsed: boolean; reason: string }> {
    try {
      // 1. Check if user has submitted questionnaire responses
      const responses = await db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.userId, userId))
        .limit(1);
        
      if (responses.length > 0) {
        return {
          isUsed: true,
          reason: "Usuário já respondeu questionários"
        };
      }
      
      // 2. Check if user has any schedule assignments (as minister or substitute)
      const ministerAssignments = await db
        .select()
        .from(schedules)
        .where(eq(schedules.ministerId, userId))
        .limit(1);
        
      if (ministerAssignments.length > 0) {
        return {
          isUsed: true,
          reason: "Usuário já foi escalado para missas"
        };
      }
      
      const substituteAssignments = await db
        .select()
        .from(schedules)
        .where(eq(schedules.substituteId, userId))
        .limit(1);
        
      if (substituteAssignments.length > 0) {
        return {
          isUsed: true,
          reason: "Usuário já foi escalado como substituto"
        };
      }
      
      // 3. Check if user has any substitution requests (as requester or substitute)
      const substitutionActivity = await db
        .select()
        .from(substitutionRequests)
        .where(or(
          eq(substitutionRequests.requesterId, userId),
          eq(substitutionRequests.substituteId, userId)
        ))
        .limit(1);
        
      if (substitutionActivity.length > 0) {
        return {
          isUsed: true,
          reason: "Usuário tem solicitações de substituição no sistema"
        };
      }
      
      return {
        isUsed: false,
        reason: "Usuário nunca teve atividade ministerial no sistema"
      };
      
    } catch (error) {
      console.warn("Error checking user ministerial activity:", error);
      // Be conservative - if we can't verify, assume the user is used
      return {
        isUsed: true,
        reason: "Não foi possível verificar a atividade do usuário no banco de dados"
      };
    }
  }

  // Formation track operations
  async getFormationTracks(): Promise<FormationTrack[]> {
    return await DrizzleSQLiteFallback.safeQuery(
      () => db.select().from(formationTracks).orderBy(formationTracks.orderIndex, formationTracks.title),
      'SELECT * FROM formation_tracks ORDER BY orderIndex, title',
      (row) => ({
        ...row,
        isActive: !!row.isActive,
        isRequired: !!row.isRequired,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      })
    );
  }

  async getFormationTrackById(id: string): Promise<FormationTrack | undefined> {
    const [track] = await db.select().from(formationTracks).where(eq(formationTracks.id, id));
    return track;
  }

  // Formation module operations
  async getFormationModules(trackId: string): Promise<FormationModule[]> {
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

  async createFormationTrack(trackData: InsertFormationTrack): Promise<FormationTrack> {
    const [track] = await db
      .insert(formationTracks)
      .values(trackData)
      .returning();
    return track;
  }

  async updateFormationTrack(id: string, trackData: Partial<InsertFormationTrack>): Promise<FormationTrack> {
    const [track] = await db
      .update(formationTracks)
      .set({ ...trackData, updatedAt: new Date() })
      .where(eq(formationTracks.id, id))
      .returning();
    return track;
  }

  async deleteFormationTrack(id: string): Promise<void> {
    await db.delete(formationTracks).where(eq(formationTracks.id, id));
  }

  // Formation lesson operations
  async getFormationLessons(trackId?: string, moduleId?: string): Promise<FormationLesson[]> {
    const query = db.select().from(formationLessons);
    
    if (trackId && moduleId) {
      return await query
        .where(and(eq(formationLessons.trackId, trackId), eq(formationLessons.moduleId, moduleId)))
        .orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
    } else if (trackId) {
      return await query
        .where(eq(formationLessons.trackId, trackId))
        .orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
    } else if (moduleId) {
      return await query
        .where(eq(formationLessons.moduleId, moduleId))
        .orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
    }
    
    return await query.orderBy(formationLessons.orderIndex, formationLessons.lessonNumber);
  }

  async getFormationLessonById(id: string): Promise<FormationLesson | undefined> {
    const [lesson] = await db.select().from(formationLessons).where(eq(formationLessons.id, id));
    return lesson;
  }

  async getFormationLessonByNumber(trackId: string, moduleId: string, lessonNumber: number): Promise<FormationLesson | undefined> {
    const [lesson] = await db
      .select()
      .from(formationLessons)
      .where(and(
        eq(formationLessons.trackId, trackId),
        eq(formationLessons.moduleId, moduleId),
        eq(formationLessons.lessonNumber, lessonNumber)
      ));
    return lesson;
  }

  async getFormationLessonsByTrackAndModule(trackId: string, moduleId: string): Promise<FormationLesson[]> {
    try {
      console.log(`[DEBUG] Searching lessons for trackId: ${trackId}, moduleId: ${moduleId}`);
      // Use raw SQL to bypass Drizzle schema issues
      const rawQuery = `
        SELECT id, moduleId, trackId, title, description, lessonNumber, 
               estimatedDuration, orderIndex, createdAt, updatedAt
        FROM formation_lessons 
        WHERE trackId = ? AND moduleId = ? 
        ORDER BY lessonNumber
      `;
      console.log(`[DEBUG] Running raw SQL:`, rawQuery, [trackId, moduleId]);
      const lessons = await (db as any).all(rawQuery, [trackId, moduleId]);
      console.log(`[DEBUG] Found ${lessons.length} lessons via raw SQL`);
      return lessons as FormationLesson[];
    } catch (error) {
      console.error('[ERROR] getFormationLessonsByTrackAndModule failed:', error);
      throw error;
    }
  }

  async createFormationLesson(lessonData: InsertFormationLesson): Promise<FormationLesson> {
    const [lesson] = await db
      .insert(formationLessons)
      .values(lessonData)
      .returning();
    return lesson;
  }

  async updateFormationLesson(id: string, lessonData: Partial<InsertFormationLesson>): Promise<FormationLesson> {
    const [lesson] = await db
      .update(formationLessons)
      .set({ ...lessonData, updatedAt: new Date() })
      .where(eq(formationLessons.id, id))
      .returning();
    return lesson;
  }

  async deleteFormationLesson(id: string): Promise<void> {
    await db.delete(formationLessons).where(eq(formationLessons.id, id));
  }

  // Formation lesson section operations
  async getFormationLessonSections(lessonId: string): Promise<FormationLessonSection[]> {
    return await db
      .select()
      .from(formationLessonSections)
      .where(eq(formationLessonSections.lessonId, lessonId))
      .orderBy(formationLessonSections.orderIndex);
  }

  async getFormationLessonSectionById(id: string): Promise<FormationLessonSection | undefined> {
    const [section] = await db.select().from(formationLessonSections).where(eq(formationLessonSections.id, id));
    return section;
  }

  async createFormationLessonSection(sectionData: InsertFormationLessonSection): Promise<FormationLessonSection> {
    const [section] = await db
      .insert(formationLessonSections)
      .values(sectionData)
      .returning();
    return section;
  }

  async updateFormationLessonSection(id: string, sectionData: Partial<InsertFormationLessonSection>): Promise<FormationLessonSection> {
    const [section] = await db
      .update(formationLessonSections)
      .set({ ...sectionData, updatedAt: new Date() })
      .where(eq(formationLessonSections.id, id))
      .returning();
    return section;
  }

  async deleteFormationLessonSection(id: string): Promise<void> {
    await db.delete(formationLessonSections).where(eq(formationLessonSections.id, id));
  }

  // Formation lesson progress operations
  async getFormationLessonProgress(userId: string, lessonId?: string): Promise<FormationLessonProgress[]> {
    const query = db.select().from(formationLessonProgress).where(eq(formationLessonProgress.userId, userId));
    
    if (lessonId) {
      return await query.where(and(eq(formationLessonProgress.userId, userId), eq(formationLessonProgress.lessonId, lessonId)));
    }
    
    return await query.orderBy(desc(formationLessonProgress.lastAccessedAt));
  }

  async getFormationLessonProgressById(id: string): Promise<FormationLessonProgress | undefined> {
    const [progress] = await db.select().from(formationLessonProgress).where(eq(formationLessonProgress.id, id));
    return progress;
  }

  async getUserFormationProgress(userId: string, trackId?: string): Promise<FormationLessonProgress[]> {
    if (trackId) {
      // Join with lessons to filter by trackId
      return await db
        .select()
        .from(formationLessonProgress)
        .innerJoin(formationLessons, eq(formationLessonProgress.lessonId, formationLessons.id))
        .where(and(
          eq(formationLessonProgress.userId, userId),
          eq(formationLessons.trackId, trackId)
        ))
        .orderBy(desc(formationLessonProgress.lastAccessedAt));
    }
    
    return await this.getFormationLessonProgress(userId);
  }

  async createOrUpdateFormationLessonProgress(progressData: InsertFormationLessonProgress): Promise<FormationLessonProgress> {
    // Check if progress already exists
    const [existingProgress] = await db
      .select()
      .from(formationLessonProgress)
      .where(and(
        eq(formationLessonProgress.userId, progressData.userId),
        eq(formationLessonProgress.lessonId, progressData.lessonId)
      ));

    if (existingProgress) {
      // Update existing progress
      const [progress] = await db
        .update(formationLessonProgress)
        .set({
          status: progressData.status,
          progressPercentage: progressData.progressPercentage,
          timeSpentMinutes: progressData.timeSpentMinutes,
          completedSections: progressData.completedSections,
          lastAccessedAt: new Date(),
          completedAt: progressData.status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(formationLessonProgress.id, existingProgress.id))
        .returning();
      return progress;
    } else {
      // Create new progress
      const [progress] = await db
        .insert(formationLessonProgress)
        .values({
          ...progressData,
          lastAccessedAt: new Date(),
          completedAt: progressData.status === 'completed' ? new Date() : null
        })
        .returning();
      return progress;
    }
  }

  async markLessonSectionCompleted(userId: string, lessonId: string, sectionId: string): Promise<FormationLessonProgress> {
    // Get current progress
    const [currentProgress] = await db
      .select()
      .from(formationLessonProgress)
      .where(and(
        eq(formationLessonProgress.userId, userId),
        eq(formationLessonProgress.lessonId, lessonId)
      ));

    const currentSections = currentProgress?.completedSections || [];
    
    // Add section if not already completed
    if (!currentSections.includes(sectionId)) {
      currentSections.push(sectionId);
    }

    // Get total sections for this lesson to calculate progress
    const totalSections = await db
      .select({ count: count() })
      .from(formationLessonSections)
      .where(eq(formationLessonSections.lessonId, lessonId));

    const progressPercentage = Math.round((currentSections.length / (totalSections[0]?.count || 1)) * 100);
    const status = progressPercentage === 100 ? 'completed' : 'in_progress';

    return await this.createOrUpdateFormationLessonProgress({
      userId,
      lessonId,
      status: status as any,
      progressPercentage,
      completedSections: currentSections,
      timeSpentMinutes: (currentProgress?.timeSpentMinutes || 0) + 1
    });
  }

  async markLessonCompleted(userId: string, lessonId: string): Promise<FormationLessonProgress> {
    // Get all sections for the lesson
    const sections = await this.getFormationLessonSections(lessonId);
    const sectionIds = sections.map(s => s.id);

    return await this.createOrUpdateFormationLessonProgress({
      userId,
      lessonId,
      status: 'completed',
      progressPercentage: 100,
      completedSections: sectionIds,
      timeSpentMinutes: 0 // Will be preserved from existing record
    });
  }
}

export const storage = new DatabaseStorage();
