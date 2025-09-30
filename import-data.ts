import { db } from './server/db';
import { 
  users, 
  familyRelationships, 
  massTimesConfig, 
  questionnaires, 
  questionnaireResponses,
  schedules,
  notifications,
  activityLogs
} from './shared/schema';
import * as fs from 'fs';

// Helper para converter string para Date ou null
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

async function importData() {
  try {
    console.log('🚀 Iniciando importação de dados...');

    // 1. Importar users
    console.log('\n📥 Importando users...');
    const usersData = JSON.parse(fs.readFileSync('attached_assets/users (2)_1759268600377.json', 'utf-8'));
    for (const user of usersData) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        passwordHash: user.password_hash,
        requiresPasswordChange: user.requires_password_change,
        birthDate: toDate(user.birth_date),
        address: user.address,
        city: user.city,
        zipCode: user.zip_code,
        maritalStatus: user.marital_status,
        baptismDate: toDate(user.baptism_date),
        baptismParish: user.baptism_parish,
        confirmationDate: toDate(user.confirmation_date),
        confirmationParish: user.confirmation_parish,
        marriageDate: toDate(user.marriage_date),
        marriageParish: user.marriage_parish,
        preferredPosition: user.preferred_position,
        preferredTimes: user.preferred_times,
        availableForSpecialEvents: user.available_for_special_events,
        canServeAsCouple: user.can_serve_as_couple,
        spouseMinisterId: user.spouse_minister_id,
        ministryStartDate: toDate(user.ministry_start_date),
        experience: user.experience,
        specialSkills: user.special_skills,
        liturgicalTraining: user.liturgical_training,
        lastService: toDate(user.last_service),
        totalServices: user.total_services,
        formationCompleted: user.formation_completed,
        observations: user.observations,
        lastLogin: toDate(user.last_login),
        ministerType: user.minister_type,
        approvedAt: toDate(user.approved_at),
        approvedById: user.approved_by_id,
        rejectionReason: user.rejection_reason,
        whatsapp: user.whatsapp,
        joinDate: toDate(user.join_date),
        photoUrl: user.photo_url,
        familyId: user.family_id,
        extraActivities: user.extra_activities,
        imageData: user.image_data,
        createdAt: toDate(user.created_at),
        updatedAt: toDate(user.updated_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${usersData.length} users importados`);

    // 2. Importar family_relationships
    console.log('\n📥 Importando family_relationships...');
    const familyData = JSON.parse(fs.readFileSync('attached_assets/family_relationships (1)_1759268600375.json', 'utf-8'));
    for (const rel of familyData) {
      await db.insert(familyRelationships).values({
        id: rel.id,
        userId: rel.user_id,
        relatedUserId: rel.related_user_id,
        relationshipType: rel.relationship_type,
        createdAt: toDate(rel.created_at),
        updatedAt: toDate(rel.updated_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${familyData.length} relacionamentos importados`);

    // 3. Importar mass_times_config
    console.log('\n📥 Importando mass_times_config...');
    const massTimesData = JSON.parse(fs.readFileSync('attached_assets/mass_times_config (1)_1759268600376.json', 'utf-8'));
    for (const massTime of massTimesData) {
      await db.insert(massTimesConfig).values({
        id: massTime.id,
        dayOfWeek: massTime.day_of_week,
        time: massTime.time,
        minMinisters: massTime.min_ministers,
        maxMinisters: massTime.max_ministers,
        isActive: massTime.is_active,
        specialEvent: massTime.special_event,
        eventName: massTime.event_name,
        createdAt: toDate(massTime.created_at),
        updatedAt: toDate(massTime.updated_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${massTimesData.length} configurações de horário importadas`);

    // 4. Importar questionnaires
    console.log('\n📥 Importando questionnaires...');
    const questionnairesData = JSON.parse(fs.readFileSync('attached_assets/questionnaires (1)_1759268600377.json', 'utf-8'));
    for (const q of questionnairesData) {
      await db.insert(questionnaires).values({
        id: q.id,
        title: q.title,
        description: q.description,
        month: q.month,
        year: q.year,
        status: q.status,
        questions: q.questions,
        createdAt: toDate(q.created_at),
        createdById: q.created_by_id,
        updatedAt: toDate(q.updated_at),
        closedAt: toDate(q.closed_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${questionnairesData.length} questionários importados`);

    // 5. Importar questionnaire_responses
    console.log('\n📥 Importando questionnaire_responses...');
    const responsesData = JSON.parse(fs.readFileSync('attached_assets/questionnaire_responses (1)_1759268600377.json', 'utf-8'));
    for (const resp of responsesData) {
      await db.insert(questionnaireResponses).values({
        id: resp.id,
        questionnaireId: resp.questionnaire_id,
        userId: resp.user_id,
        responses: resp.responses,
        submittedAt: toDate(resp.submitted_at),
        updatedAt: toDate(resp.updated_at),
        availableSundays: resp.available_sundays,
        preferredMassTimes: resp.preferred_mass_times,
        dailyMassAvailability: resp.daily_mass_availability,
        canSubstitute: resp.can_substitute,
        alternativeTimes: resp.alternative_times,
        monthlyAvailability: resp.monthly_availability,
        specialEvents: resp.special_events
      }).onConflictDoNothing();
    }
    console.log(`✅ ${responsesData.length} respostas importadas`);

    // 6. Importar schedules
    console.log('\n📥 Importando schedules...');
    const schedulesData = JSON.parse(fs.readFileSync('attached_assets/schedules_1759268600377.json', 'utf-8'));
    for (const sched of schedulesData) {
      await db.insert(schedules).values({
        id: sched.id,
        date: toDate(sched.date),
        time: sched.time,
        type: sched.type,
        location: sched.location,
        ministerId: sched.minister_id,
        substituteId: sched.substitute_id,
        position: sched.position || 0,
        notes: sched.notes,
        status: sched.status,
        createdAt: toDate(sched.created_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${schedulesData.length} escalas importadas`);

    // 7. Importar notifications
    console.log('\n📥 Importando notifications...');
    const notificationsData = JSON.parse(fs.readFileSync('attached_assets/notifications_1759268600377.json', 'utf-8'));
    for (const notif of notificationsData) {
      await db.insert(notifications).values({
        id: notif.id,
        userId: notif.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: notif.data,
        read: notif.read,
        readAt: toDate(notif.read_at),
        actionUrl: notif.action_url,
        priority: notif.priority,
        expiresAt: toDate(notif.expires_at),
        createdAt: toDate(notif.created_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${notificationsData.length} notificações importadas`);

    // 8. Importar activity_logs
    console.log('\n📥 Importando activity_logs...');
    const activityData = JSON.parse(fs.readFileSync('attached_assets/activity_logs_1759268600369.json', 'utf-8'));
    for (const activity of activityData) {
      await db.insert(activityLogs).values({
        id: activity.id,
        userId: activity.user_id,
        action: activity.action,
        details: activity.details,
        ipAddress: activity.ip_address,
        userAgent: activity.user_agent,
        sessionId: activity.session_id,
        createdAt: toDate(activity.created_at)
      }).onConflictDoNothing();
    }
    console.log(`✅ ${activityData.length} logs de atividade importados`);

    console.log('\n✅ Importação concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

importData();
