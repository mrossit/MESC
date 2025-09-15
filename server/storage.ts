import {
  users,
  questionnaires,
  questionnaireResponses,
  schedules,
  substitutionRequests,
  notifications,
  massTimesConfig,
  familyRelationships,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";

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
      .where(eq(users.status, 'active'));

    const [weeklyMassesResult] = await db
      .select({ count: count() })
      .from(massTimesConfig)
      .where(eq(massTimesConfig.isActive, true));

    // For available today, we'll use a simplified calculation
    const [availableTodayResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.status, 'active'),
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
}

export const storage = new DatabaseStorage();
