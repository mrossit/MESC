/**
 * Seeds a small MESC Native P0 demo dataset:
 * two communities, ministers, coordinators, questionnaires, schedules and substitutions.
 */
import { getMobileP0DemoData, MOBILE_P0_DEMO_IDS } from "../test/fixtures/mobileP0DemoData";
import { pathToFileURL } from "url";

const demo = getMobileP0DemoData();
const allowRemoteDemoSeed = process.env.MOBILE_DEMO_SEED === "true";

function ids(values: string[]) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ");
}

function toSqliteJson(value: unknown) {
  return JSON.stringify(value);
}

function toSqliteDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function ensureSqliteColumns(
  sqlite: import("better-sqlite3").Database,
  tableName: string,
  columns: Record<string, string>,
) {
  const existingColumns = new Set(
    (sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>)
      .map((column) => column.name),
  );

  for (const [columnName, definition] of Object.entries(columns)) {
    if (!existingColumns.has(columnName)) {
      try {
        sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/duplicate column name/i.test(message)) {
          throw error;
        }
      }
    }
  }
}

async function seedPostgres(databaseUrl: string) {
  if (!allowRemoteDemoSeed) {
    throw new Error(
      "Refusing to seed mobile demo data with DATABASE_URL unless MOBILE_DEMO_SEED=true is set.",
    );
  }

  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM substitution_requests WHERE schedule_id IN ${tx(demo.schedules.map((item) => item.id))}`;
      await tx`DELETE FROM schedule_confirmations WHERE schedule_id IN ${tx(demo.schedules.map((item) => item.id))}`;
      await tx`DELETE FROM schedules WHERE id IN ${tx(demo.schedules.map((item) => item.id))}`;
      await tx`DELETE FROM questionnaire_responses WHERE questionnaire_id IN ${tx(demo.questionnaires.map((item) => item.id))}`;
      await tx`DELETE FROM questionnaires WHERE id IN ${tx(demo.questionnaires.map((item) => item.id))}`;
      await tx`DELETE FROM notifications WHERE user_id IN ${tx(demo.users.map((item) => item.id))}`;
      await tx`DELETE FROM notifications WHERE id IN ${tx(demo.notifications.map((item) => item.id))}`;
      await tx`DELETE FROM users WHERE id IN ${tx(demo.users.map((item) => item.id))}`;
      await tx`DELETE FROM communities WHERE id IN ${tx(demo.communities.map((item) => item.id))}`;

      for (const community of demo.communities) {
        await tx`
          INSERT INTO communities (
            id, parish_name, name, slug, color_hex, is_matriz, active, created_at, updated_at
          ) VALUES (
            ${community.id}, ${community.parishName}, ${community.name}, ${community.slug},
            ${community.colorHex}, ${community.isMatriz}, ${community.active},
            ${community.createdAt}, ${community.updatedAt}
          )
        `;
      }

      for (const user of demo.users) {
        await tx`
          INSERT INTO users (
            id, email, password_hash, name, role, status, phone, whatsapp,
            home_community_id, schedule_display_name, preferred_position,
            preferred_positions, avoid_positions, requires_password_change,
            created_at, updated_at
          ) VALUES (
            ${user.id}, ${user.email}, ${user.passwordHash}, ${user.name}, ${user.role}, ${user.status},
            ${user.phone}, ${user.whatsapp}, ${user.homeCommunityId}, ${user.scheduleDisplayName},
            ${user.preferredPosition}, ${sql.json(user.preferredPositions)}, ${sql.json(user.avoidPositions)},
            ${user.requiresPasswordChange}, ${user.createdAt}, ${user.updatedAt}
          )
        `;
      }

      for (const notification of demo.notifications) {
        await tx`
          INSERT INTO notifications (
            id, user_id, type, title, message, data, read, read_at,
            action_url, priority, expires_at, created_at
          ) VALUES (
            ${notification.id}, ${notification.userId}, ${notification.type}, ${notification.title},
            ${notification.message}, ${sql.json(notification.data)}, ${notification.read},
            ${notification.readAt}, ${notification.actionUrl}, ${notification.priority},
            ${notification.expiresAt}, ${notification.createdAt}
          )
        `;
      }

      for (const questionnaire of demo.questionnaires) {
        await tx`
          INSERT INTO questionnaires (
            id, community_id, title, description, month, year, status, questions,
            deadline, target_user_ids, notified_user_ids, created_by_id, version,
            created_at, updated_at
          ) VALUES (
            ${questionnaire.id}, ${questionnaire.communityId}, ${questionnaire.title},
            ${questionnaire.description}, ${questionnaire.month}, ${questionnaire.year},
            ${questionnaire.status}, ${sql.json(questionnaire.questions)}, ${questionnaire.deadline},
            ${sql.json(questionnaire.targetUserIds)}, ${sql.json(questionnaire.notifiedUserIds)},
            ${questionnaire.createdById}, ${questionnaire.version}, ${questionnaire.createdAt},
            ${questionnaire.updatedAt}
          )
        `;
      }

      for (const schedule of demo.schedules) {
        await tx`
          INSERT INTO schedules (
            id, community_id, date, time, type, location, minister_id, position,
            status, notes, created_at
          ) VALUES (
            ${schedule.id}, ${schedule.communityId}, ${schedule.date}, ${schedule.time},
            ${schedule.type}, ${schedule.location}, ${schedule.ministerId}, ${schedule.position},
            ${schedule.status}, ${schedule.notes}, ${schedule.createdAt}
          )
        `;
      }

      for (const substitution of demo.substitutions) {
        await tx`
          INSERT INTO substitution_requests (
            id, community_id, schedule_id, requester_id, substitute_id, reason,
            status, urgency, response_message, created_at, updated_at
          ) VALUES (
            ${substitution.id}, ${substitution.communityId}, ${substitution.scheduleId},
            ${substitution.requesterId}, ${substitution.substituteId}, ${substitution.reason},
            ${substitution.status}, ${substitution.urgency}, ${substitution.responseMessage},
            ${substitution.createdAt}, ${substitution.updatedAt}
          )
        `;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function ensureSqliteDemoSchema(sqlite: import("better-sqlite3").Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      parish_name TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color_hex TEXT NOT NULL,
      is_matriz INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      phone TEXT,
      whatsapp TEXT,
      last_login TEXT,
      join_date TEXT,
      photo_url TEXT,
      image_data TEXT,
      image_content_type TEXT,
      family_id TEXT,
      profile_image_url TEXT,
      home_community_id TEXT NOT NULL,
      birth_date TEXT,
      address TEXT,
      city TEXT,
      zip_code TEXT,
      marital_status TEXT,
      baptism_date TEXT,
      baptism_parish TEXT,
      confirmation_date TEXT,
      confirmation_parish TEXT,
      marriage_date TEXT,
      marriage_parish TEXT,
      schedule_display_name TEXT,
      preferred_position INTEGER,
      preferred_positions TEXT DEFAULT '[]',
      avoid_positions TEXT DEFAULT '[]',
      preferred_times TEXT DEFAULT '[]',
      available_for_special_events INTEGER DEFAULT 1,
      can_serve_as_couple INTEGER DEFAULT 0,
      spouse_minister_id TEXT,
      extra_activities TEXT DEFAULT '{}',
      ministry_start_date TEXT,
      experience TEXT,
      special_skills TEXT,
      liturgical_training INTEGER DEFAULT 0,
      last_service TEXT,
      total_services INTEGER DEFAULT 0,
      formation_completed INTEGER DEFAULT 0,
      reliability_score INTEGER DEFAULT 100,
      substitution_request_count INTEGER DEFAULT 0,
      substitution_fulfilled_count INTEGER DEFAULT 0,
      manual_removal_count INTEGER DEFAULT 0,
      no_show_count INTEGER DEFAULT 0,
      last_reliability_update TEXT,
      reliability_notes TEXT,
      observations TEXT,
      minister_type TEXT,
      approved_at TEXT,
      approved_by_id TEXT,
      rejection_reason TEXT,
      requires_password_change INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL,
      questions TEXT NOT NULL,
      deadline TEXT,
      target_user_ids TEXT,
      notified_user_ids TEXT,
      created_by_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questionnaire_responses (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      community_id TEXT NOT NULL,
      questionnaire_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      responses TEXT NOT NULL,
      available_sundays TEXT DEFAULT '[]',
      preferred_mass_times TEXT DEFAULT '[]',
      alternative_times TEXT DEFAULT '[]',
      daily_mass_availability TEXT DEFAULT '[]',
      special_events TEXT,
      can_substitute INTEGER DEFAULT 0,
      notes TEXT,
      unmapped_responses TEXT DEFAULT '[]',
      processing_warnings TEXT DEFAULT '[]',
      is_shared_response INTEGER DEFAULT 0,
      shared_from_user_id TEXT,
      shared_with_family_ids TEXT DEFAULT '[]',
      submitted_at TEXT,
      updated_at TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      UNIQUE(user_id, questionnaire_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_questionnaire_responses_user_questionnaire
      ON questionnaire_responses(user_id, questionnaire_id);

    CREATE TABLE IF NOT EXISTS mass_times_config (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      community_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      time TEXT NOT NULL,
      min_ministers INTEGER NOT NULL DEFAULT 3,
      max_ministers INTEGER NOT NULL DEFAULT 6,
      is_active INTEGER DEFAULT 1,
      special_event INTEGER DEFAULT 0,
      event_name TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT,
      minister_id TEXT,
      position INTEGER,
      status TEXT NOT NULL,
      substitute_id TEXT,
      notes TEXT,
      on_site_adjustments TEXT DEFAULT '[]',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS schedule_confirmations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      community_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      minister_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT,
      reminder_sent_at TEXT,
      reminder_count INTEGER DEFAULT 0,
      decline_reason TEXT,
      notes TEXT,
      requested_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(schedule_id, minister_id)
    );

    CREATE TABLE IF NOT EXISTS substitution_requests (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      substitute_id TEXT,
      reason TEXT,
      status TEXT NOT NULL,
      urgency TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      response_message TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      read_at TEXT,
      action_url TEXT,
      priority TEXT DEFAULT 'normal',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS active_sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_active_sessions_activity ON active_sessions(last_activity_at);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureSqliteColumns(sqlite, "users", {
    first_name: "TEXT",
    last_name: "TEXT",
    profile_image_url: "TEXT",
    last_login: "TEXT",
    join_date: "TEXT",
    photo_url: "TEXT",
    image_data: "TEXT",
    image_content_type: "TEXT",
    family_id: "TEXT",
    birth_date: "TEXT",
    address: "TEXT",
    city: "TEXT",
    zip_code: "TEXT",
    marital_status: "TEXT",
    baptism_date: "TEXT",
    baptism_parish: "TEXT",
    confirmation_date: "TEXT",
    confirmation_parish: "TEXT",
    marriage_date: "TEXT",
    marriage_parish: "TEXT",
    preferred_times: "TEXT DEFAULT '[]'",
    available_for_special_events: "INTEGER DEFAULT 1",
    can_serve_as_couple: "INTEGER DEFAULT 0",
    spouse_minister_id: "TEXT",
    extra_activities: "TEXT DEFAULT '{}'",
    ministry_start_date: "TEXT",
    experience: "TEXT",
    special_skills: "TEXT",
    liturgical_training: "INTEGER DEFAULT 0",
    last_service: "TEXT",
    total_services: "INTEGER DEFAULT 0",
    formation_completed: "INTEGER DEFAULT 0",
    reliability_score: "INTEGER DEFAULT 100",
    substitution_request_count: "INTEGER DEFAULT 0",
    substitution_fulfilled_count: "INTEGER DEFAULT 0",
    manual_removal_count: "INTEGER DEFAULT 0",
    no_show_count: "INTEGER DEFAULT 0",
    last_reliability_update: "TEXT",
    reliability_notes: "TEXT",
    observations: "TEXT",
    minister_type: "TEXT",
    approved_at: "TEXT",
    approved_by_id: "TEXT",
    rejection_reason: "TEXT",
  });
}

async function seedSqlite() {
  const Database = await import("better-sqlite3");
  const sqlite = new Database.default("local.db");
  await ensureSqliteDemoSchema(sqlite);

  const seedRows = sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM substitution_requests WHERE schedule_id IN (${ids(demo.schedules.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM schedule_confirmations WHERE schedule_id IN (${ids(demo.schedules.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM schedules WHERE id IN (${ids(demo.schedules.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM questionnaire_responses WHERE questionnaire_id IN (${ids(demo.questionnaires.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM questionnaires WHERE id IN (${ids(demo.questionnaires.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM notifications WHERE user_id IN (${ids(demo.users.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM notifications WHERE id IN (${ids(demo.notifications.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM users WHERE id IN (${ids(demo.users.map((item) => item.id))})`).run();
    sqlite.prepare(`DELETE FROM communities WHERE id IN (${ids(demo.communities.map((item) => item.id))})`).run();

    const insertCommunity = sqlite.prepare(`
      INSERT INTO communities (
        id, parish_name, name, slug, color_hex, is_matriz, active, created_at, updated_at
      ) VALUES (
        @id, @parishName, @name, @slug, @colorHex, @isMatriz, @active, @createdAt, @updatedAt
      )
    `);

    for (const community of demo.communities) {
      insertCommunity.run({
        ...community,
        isMatriz: community.isMatriz ? 1 : 0,
        active: community.active ? 1 : 0,
        createdAt: toSqliteDate(community.createdAt),
        updatedAt: toSqliteDate(community.updatedAt),
      });
    }

    const insertUser = sqlite.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, role, status, phone, whatsapp,
        home_community_id, schedule_display_name, preferred_position,
        preferred_positions, avoid_positions, requires_password_change,
        created_at, updated_at
      ) VALUES (
        @id, @email, @passwordHash, @name, @role, @status, @phone, @whatsapp,
        @homeCommunityId, @scheduleDisplayName, @preferredPosition,
        @preferredPositions, @avoidPositions, @requiresPasswordChange,
        @createdAt, @updatedAt
      )
    `);

    for (const user of demo.users) {
      insertUser.run({
        ...user,
        preferredPositions: toSqliteJson(user.preferredPositions),
        avoidPositions: toSqliteJson(user.avoidPositions),
        requiresPasswordChange: user.requiresPasswordChange ? 1 : 0,
        createdAt: toSqliteDate(user.createdAt),
        updatedAt: toSqliteDate(user.updatedAt),
      });
    }

    const insertNotification = sqlite.prepare(`
      INSERT INTO notifications (
        id, user_id, type, title, message, data, read, read_at,
        action_url, priority, expires_at, created_at
      ) VALUES (
        @id, @userId, @type, @title, @message, @data, @read, @readAt,
        @actionUrl, @priority, @expiresAt, @createdAt
      )
    `);

    for (const notification of demo.notifications) {
      insertNotification.run({
        ...notification,
        data: toSqliteJson(notification.data),
        read: notification.read ? 1 : 0,
        readAt: toSqliteDate(notification.readAt),
        expiresAt: toSqliteDate(notification.expiresAt),
        createdAt: toSqliteDate(notification.createdAt),
      });
    }

    const insertQuestionnaire = sqlite.prepare(`
      INSERT INTO questionnaires (
        id, community_id, title, description, month, year, status, questions,
        deadline, target_user_ids, notified_user_ids, created_by_id, version,
        created_at, updated_at
      ) VALUES (
        @id, @communityId, @title, @description, @month, @year, @status, @questions,
        @deadline, @targetUserIds, @notifiedUserIds, @createdById, @version,
        @createdAt, @updatedAt
      )
    `);

    for (const questionnaire of demo.questionnaires) {
      insertQuestionnaire.run({
        ...questionnaire,
        questions: toSqliteJson(questionnaire.questions),
        deadline: toSqliteDate(questionnaire.deadline),
        targetUserIds: toSqliteJson(questionnaire.targetUserIds),
        notifiedUserIds: toSqliteJson(questionnaire.notifiedUserIds),
        createdAt: toSqliteDate(questionnaire.createdAt),
        updatedAt: toSqliteDate(questionnaire.updatedAt),
      });
    }

    const insertSchedule = sqlite.prepare(`
      INSERT INTO schedules (
        id, community_id, date, time, type, location, minister_id, position,
        status, notes, created_at
      ) VALUES (
        @id, @communityId, @date, @time, @type, @location, @ministerId,
        @position, @status, @notes, @createdAt
      )
    `);

    for (const schedule of demo.schedules) {
      insertSchedule.run({
        ...schedule,
        createdAt: toSqliteDate(schedule.createdAt),
      });
    }

    const insertSubstitution = sqlite.prepare(`
      INSERT INTO substitution_requests (
        id, community_id, schedule_id, requester_id, substitute_id, reason,
        status, urgency, response_message, created_at, updated_at
      ) VALUES (
        @id, @communityId, @scheduleId, @requesterId, @substituteId, @reason,
        @status, @urgency, @responseMessage, @createdAt, @updatedAt
      )
    `);

    for (const substitution of demo.substitutions) {
      insertSubstitution.run({
        ...substitution,
        createdAt: toSqliteDate(substitution.createdAt),
        updatedAt: toSqliteDate(substitution.updatedAt),
      });
    }
  });

  try {
    seedRows();
  } finally {
    sqlite.close();
  }
}

export async function seedMobileP0Demo() {
  if (process.env.DATABASE_URL) {
    await seedPostgres(process.env.DATABASE_URL);
  } else {
    await seedSqlite();
  }
}

async function main() {
  await seedMobileP0Demo();

  console.log("Mobile P0 demo data seeded.");
  console.log(`Minister demo: ${MOBILE_P0_DEMO_IDS.ministerA}`);
  console.log(`Coordinator demo: ${MOBILE_P0_DEMO_IDS.coordinatorA}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Failed to seed mobile P0 demo data:", error);
    process.exit(1);
  });
}
