import postgres from "postgres";

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
};

type LegacyMassTime = {
  dayOfWeek: number;
  time: string;
  minMinisters: number;
  maxMinisters: number;
  specialEvent?: boolean;
  eventName?: string | null;
};

type MassConfigurationSeed = {
  name: string;
  description: string;
  recurrenceType: "weekly" | "monthly" | "yearly" | "one_time";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  month?: number | null;
  occurrenceInMonth?: number | null;
  time: string;
  durationMinutes: number;
  minMinisters: number;
  maxMinisters: number;
  massType:
    | "missa_diaria"
    | "missa_dominical"
    | "missa_cura_libertacao"
    | "missa_sagrado_coracao"
    | "missa_imaculado_coracao"
    | "missa_sao_judas"
    | "adoracao"
    | "novena"
    | "festa_padroeiro"
    | "finados"
    | "evento_especial";
  location?: string | null;
  excludedDates?: string[];
  priority: number;
  isActive: boolean;
};

type SpecialEventSeed = {
  name: string;
  description: string;
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
  minMinisters: number;
  maxMinisters: number;
  massType: MassConfigurationSeed["massType"];
  location: string;
  priority: number;
  suppressesMassTypes: string[];
  isActive: boolean;
};

type Summary = {
  legacyInserted: number;
  legacyUpdated: number;
  configInserted: number;
  configUpdated: number;
  eventInserted: number;
  eventUpdated: number;
};

const args = process.argv.slice(2);

function hasFlag(name: string) {
  return args.includes(`--${name}`);
}

function optionValues(name: string) {
  const prefix = `--${name}=`;
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
      continue;
    }
    if (arg === `--${name}` && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }

  return values.filter(Boolean);
}

function option(name: string, fallback: string) {
  return optionValues(name)[0] ?? fallback;
}

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Defina DATABASE_URL para semear configuracao de missas no banco nativo.");
  }
  return value;
}

function guard(databaseUrl: string, write: boolean) {
  if (!write) return;

  if (process.env.CONFIRM_NATIVE_MASS_CONFIG_SEED !== "true") {
    throw new Error(
      "Seed recusado. Defina CONFIRM_NATIVE_MASS_CONFIG_SEED=true ou rode sem --write para dry-run.",
    );
  }

  const productionHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";
  const host = new URL(databaseUrl).hostname;
  if (host.includes(productionHostMarker) && process.env.ALLOW_CURRENT_MESC_DB !== "true") {
    throw new Error("Seed recusado: host parece ser o banco atual do MESC/Replit.");
  }
}

function yearRange() {
  const startYear = Number.parseInt(option("year", String(new Date().getFullYear())), 10);
  const years = Number.parseInt(option("years", "2"), 10);
  if (!Number.isFinite(startYear) || startYear < 2020 || startYear > 2100) {
    throw new Error("Ano invalido. Use --year=2026.");
  }
  if (!Number.isFinite(years) || years < 1 || years > 5) {
    throw new Error("Quantidade de anos invalida. Use --years entre 1 e 5.");
  }

  return Array.from({ length: years }, (_, index) => startYear + index);
}

function canonicalLegacyMassTimes(): LegacyMassTime[] {
  return [
    ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      time: "06:30",
      minMinisters: 5,
      maxMinisters: 5,
      specialEvent: false,
      eventName: null,
    })),
    { dayOfWeek: 0, time: "08:00", minMinisters: 15, maxMinisters: 15 },
    { dayOfWeek: 0, time: "10:00", minMinisters: 20, maxMinisters: 20 },
    { dayOfWeek: 0, time: "19:00", minMinisters: 20, maxMinisters: 20 },
    { dayOfWeek: 4, time: "19:30", minMinisters: 26, maxMinisters: 26, specialEvent: true, eventName: "Missa de Cura e Libertacao" },
    { dayOfWeek: 5, time: "06:30", minMinisters: 6, maxMinisters: 6, specialEvent: true, eventName: "Sagrado Coracao de Jesus" },
    { dayOfWeek: 6, time: "06:30", minMinisters: 6, maxMinisters: 6, specialEvent: true, eventName: "Imaculado Coracao de Maria" },
    { dayOfWeek: 1, time: "22:00", minMinisters: 3, maxMinisters: 10, specialEvent: true, eventName: "Adoracao ao Santissimo" },
  ];
}

function canonicalMassConfigurations(): MassConfigurationSeed[] {
  const daily = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    name: "Missa Diaria",
    description: "Missa diaria de segunda a sexta-feira as 6h30",
    recurrenceType: "weekly" as const,
    dayOfWeek,
    time: "06:30",
    durationMinutes: 45,
    minMinisters: 5,
    maxMinisters: 5,
    massType: "missa_diaria" as const,
    priority: 0,
    isActive: true,
  }));

  return [
    ...daily,
    {
      name: "Missa Dominical 8h",
      description: "Missa dominical as 8h",
      recurrenceType: "weekly",
      dayOfWeek: 0,
      time: "08:00",
      durationMinutes: 90,
      minMinisters: 15,
      maxMinisters: 15,
      massType: "missa_dominical",
      priority: 10,
      isActive: true,
    },
    {
      name: "Missa Dominical 10h",
      description: "Missa dominical as 10h",
      recurrenceType: "weekly",
      dayOfWeek: 0,
      time: "10:00",
      durationMinutes: 90,
      minMinisters: 20,
      maxMinisters: 20,
      massType: "missa_dominical",
      priority: 10,
      isActive: true,
    },
    {
      name: "Missa Dominical 19h",
      description: "Missa dominical as 19h",
      recurrenceType: "weekly",
      dayOfWeek: 0,
      time: "19:00",
      durationMinutes: 90,
      minMinisters: 20,
      maxMinisters: 20,
      massType: "missa_dominical",
      priority: 10,
      isActive: true,
    },
    {
      name: "Missa de Cura e Libertacao",
      description: "Missa de Cura e Libertacao na primeira quinta-feira do mes as 19h30",
      recurrenceType: "monthly",
      dayOfWeek: 4,
      occurrenceInMonth: 1,
      time: "19:30",
      durationMinutes: 120,
      minMinisters: 26,
      maxMinisters: 26,
      massType: "missa_cura_libertacao",
      priority: 50,
      isActive: true,
    },
    {
      name: "Missa Sagrado Coracao de Jesus",
      description: "Missa em honra ao Sagrado Coracao de Jesus na primeira sexta-feira do mes as 6h30",
      recurrenceType: "monthly",
      dayOfWeek: 5,
      occurrenceInMonth: 1,
      time: "06:30",
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: "missa_sagrado_coracao",
      priority: 50,
      isActive: true,
    },
    {
      name: "Missa Imaculado Coracao de Maria",
      description: "Missa em honra ao Imaculado Coracao de Maria no primeiro sabado do mes as 6h30",
      recurrenceType: "monthly",
      dayOfWeek: 6,
      occurrenceInMonth: 1,
      time: "06:30",
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: "missa_imaculado_coracao",
      priority: 50,
      isActive: true,
    },
    {
      name: "Sao Judas Mensal 7h",
      description: "Missa mensal de Sao Judas Tadeu no dia 28 as 7h",
      recurrenceType: "monthly",
      dayOfMonth: 28,
      time: "07:00",
      durationMinutes: 60,
      minMinisters: 6,
      maxMinisters: 6,
      massType: "missa_sao_judas",
      priority: 60,
      isActive: true,
    },
    {
      name: "Sao Judas Mensal 15h",
      description: "Missa mensal de Sao Judas Tadeu no dia 28 as 15h",
      recurrenceType: "monthly",
      dayOfMonth: 28,
      time: "15:00",
      durationMinutes: 60,
      minMinisters: 4,
      maxMinisters: 4,
      massType: "missa_sao_judas",
      priority: 60,
      isActive: true,
    },
    {
      name: "Sao Judas Mensal 19h30",
      description: "Missa mensal de Sao Judas Tadeu no dia 28 as 19h30",
      recurrenceType: "monthly",
      dayOfMonth: 28,
      time: "19:30",
      durationMinutes: 90,
      minMinisters: 7,
      maxMinisters: 7,
      massType: "missa_sao_judas",
      priority: 60,
      isActive: true,
    },
    {
      name: "Adoracao ao Santissimo",
      description: "Adoracao ao Santissimo Sacramento as segundas-feiras as 22h",
      recurrenceType: "weekly",
      dayOfWeek: 1,
      time: "22:00",
      durationMinutes: 60,
      minMinisters: 3,
      maxMinisters: 10,
      massType: "adoracao",
      priority: 20,
      isActive: true,
    },
  ];
}

function canonicalSpecialEvents(years: number[]): SpecialEventSeed[] {
  const events: SpecialEventSeed[] = [];

  for (const year of years) {
    for (let day = 19; day <= 27; day += 1) {
      const date = new Date(year, 9, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) continue;

      const eventTime = dayOfWeek === 6 ? "19:00" : "19:30";
      events.push({
        name: `Novena Sao Judas - ${day - 18} dia`,
        description: `${day - 18} dia da Novena de Sao Judas Tadeu`,
        eventDate: `${year}-10-${String(day).padStart(2, "0")}`,
        eventTime,
        durationMinutes: 90,
        minMinisters: 26,
        maxMinisters: 26,
        massType: "novena",
        location: "Igreja Sao Judas Tadeu",
        priority: 100,
        suppressesMassTypes: ["missa_diaria"],
        isActive: true,
      });
    }

    for (const mass of [
      { eventTime: "05:00", ministers: 26 },
      { eventTime: "07:00", ministers: 26 },
      { eventTime: "09:00", ministers: 26 },
      { eventTime: "12:00", ministers: 26 },
      { eventTime: "17:00", ministers: 26 },
      { eventTime: "19:30", ministers: 26 },
    ]) {
      events.push({
        name: `Festa Sao Judas ${mass.eventTime}`,
        description: `Missa da Festa de Sao Judas Tadeu as ${mass.eventTime}`,
        eventDate: `${year}-10-28`,
        eventTime: mass.eventTime,
        durationMinutes: 90,
        minMinisters: mass.ministers,
        maxMinisters: mass.ministers,
        massType: "festa_padroeiro",
        location: "Igreja Sao Judas Tadeu",
        priority: 200,
        suppressesMassTypes: ["missa_diaria", "missa_sao_judas"],
        isActive: true,
      });
    }

    events.push({
      name: "Missa de Finados",
      description: "Missa do Dia de Finados no Cemiterio Memorial",
      eventDate: `${year}-11-02`,
      eventTime: "15:30",
      durationMinutes: 60,
      minMinisters: 10,
      maxMinisters: 10,
      massType: "finados",
      location: "Cemiterio Memorial",
      priority: 80,
      suppressesMassTypes: [],
      isActive: true,
    });

    events.push({
      name: "Missa PUC - Consciencia Negra",
      description: "Missa na PUC em celebracao ao Dia da Consciencia Negra",
      eventDate: `${year}-11-20`,
      eventTime: "10:00",
      durationMinutes: 90,
      minMinisters: 10,
      maxMinisters: 10,
      massType: "evento_especial",
      location: "PUC Sorocaba",
      priority: 70,
      suppressesMassTypes: [],
      isActive: true,
    });
  }

  return events;
}

async function tableExists(sql: postgres.Sql, tableName: string) {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;
  return rows[0]?.exists === true;
}

async function loadCommunities(sql: postgres.Sql): Promise<CommunityRow[]> {
  const slugs = optionValues("community-slug");

  if (hasFlag("all-active-communities")) {
    return sql<CommunityRow[]>`
      SELECT id, slug, name
      FROM communities
      WHERE active = true
      ORDER BY is_matriz DESC, name ASC
    `;
  }

  if (slugs.length > 0) {
    return sql<CommunityRow[]>`
      SELECT id, slug, name
      FROM communities
      WHERE slug IN ${sql(slugs)}
      ORDER BY is_matriz DESC, name ASC
    `;
  }

  return sql<CommunityRow[]>`
    SELECT id, slug, name
    FROM communities
    WHERE active = true
      AND is_matriz = true
    ORDER BY name ASC
  `;
}

async function seedLegacy(sql: postgres.Sql, community: CommunityRow, write: boolean): Promise<Pick<Summary, "legacyInserted" | "legacyUpdated">> {
  let legacyInserted = 0;
  let legacyUpdated = 0;

  for (const item of canonicalLegacyMassTimes()) {
    const eventName = item.eventName ?? null;
    const existing = await sql<{ id: string }[]>`
      SELECT id
      FROM mass_times_config
      WHERE community_id = ${community.id}
        AND day_of_week = ${item.dayOfWeek}
        AND time = ${item.time}
        AND COALESCE(event_name, '') = COALESCE(${eventName}, '')
      LIMIT 1
    `;

    if (existing[0]) {
      legacyUpdated += 1;
      if (write) {
        await sql`
          UPDATE mass_times_config
          SET min_ministers = ${item.minMinisters},
              max_ministers = ${item.maxMinisters},
              is_active = true,
              special_event = ${Boolean(item.specialEvent)},
              event_name = ${eventName},
              updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      }
      continue;
    }

    legacyInserted += 1;
    if (write) {
      await sql`
        INSERT INTO mass_times_config (
          community_id,
          day_of_week,
          time,
          min_ministers,
          max_ministers,
          is_active,
          special_event,
          event_name
        )
        VALUES (
          ${community.id},
          ${item.dayOfWeek},
          ${item.time},
          ${item.minMinisters},
          ${item.maxMinisters},
          true,
          ${Boolean(item.specialEvent)},
          ${eventName}
        )
      `;
    }
  }

  return { legacyInserted, legacyUpdated };
}

async function seedDynamic(sql: postgres.Sql, community: CommunityRow, write: boolean): Promise<Pick<Summary, "configInserted" | "configUpdated">> {
  let configInserted = 0;
  let configUpdated = 0;

  for (const item of canonicalMassConfigurations()) {
    const dayOfWeek = item.dayOfWeek ?? null;
    const dayOfMonth = item.dayOfMonth ?? null;
    const occurrenceInMonth = item.occurrenceInMonth ?? null;
    const month = item.month ?? null;
    const location = item.location ?? null;

    const existing = await sql<{ id: string }[]>`
      SELECT id
      FROM mass_configurations
      WHERE community_id = ${community.id}
        AND name = ${item.name}
        AND recurrence_type = ${item.recurrenceType}
        AND time = ${item.time}
        AND mass_type = ${item.massType}
        AND COALESCE(day_of_week, -1) = COALESCE(${dayOfWeek}, -1)
        AND COALESCE(day_of_month, -1) = COALESCE(${dayOfMonth}, -1)
        AND COALESCE(occurrence_in_month, -999) = COALESCE(${occurrenceInMonth}, -999)
      LIMIT 1
    `;

    if (existing[0]) {
      configUpdated += 1;
      if (write) {
        await sql`
          UPDATE mass_configurations
          SET description = ${item.description},
              month = ${month},
              duration_minutes = ${item.durationMinutes},
              min_ministers = ${item.minMinisters},
              max_ministers = ${item.maxMinisters},
              location = ${location},
              excluded_dates = ${sql.json(item.excludedDates ?? [])},
              priority = ${item.priority},
              is_active = ${item.isActive},
              updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      }
      continue;
    }

    configInserted += 1;
    if (write) {
      await sql`
        INSERT INTO mass_configurations (
          community_id,
          name,
          description,
          recurrence_type,
          day_of_week,
          day_of_month,
          month,
          occurrence_in_month,
          time,
          duration_minutes,
          min_ministers,
          max_ministers,
          mass_type,
          location,
          excluded_dates,
          priority,
          is_active
        )
        VALUES (
          ${community.id},
          ${item.name},
          ${item.description},
          ${item.recurrenceType},
          ${dayOfWeek},
          ${dayOfMonth},
          ${month},
          ${occurrenceInMonth},
          ${item.time},
          ${item.durationMinutes},
          ${item.minMinisters},
          ${item.maxMinisters},
          ${item.massType},
          ${location},
          ${sql.json(item.excludedDates ?? [])},
          ${item.priority},
          ${item.isActive}
        )
      `;
    }
  }

  return { configInserted, configUpdated };
}

async function seedEvents(sql: postgres.Sql, community: CommunityRow, write: boolean, years: number[]): Promise<Pick<Summary, "eventInserted" | "eventUpdated">> {
  let eventInserted = 0;
  let eventUpdated = 0;

  for (const item of canonicalSpecialEvents(years)) {
    const existing = await sql<{ id: string }[]>`
      SELECT id
      FROM special_events
      WHERE community_id = ${community.id}
        AND name = ${item.name}
        AND event_date = ${item.eventDate}
        AND event_time = ${item.eventTime}
      LIMIT 1
    `;

    if (existing[0]) {
      eventUpdated += 1;
      if (write) {
        await sql`
          UPDATE special_events
          SET description = ${item.description},
              duration_minutes = ${item.durationMinutes},
              min_ministers = ${item.minMinisters},
              max_ministers = ${item.maxMinisters},
              mass_type = ${item.massType},
              location = ${item.location},
              priority = ${item.priority},
              suppresses_mass_types = ${sql.json(item.suppressesMassTypes)},
              is_active = ${item.isActive},
              updated_at = now()
          WHERE id = ${existing[0].id}
        `;
      }
      continue;
    }

    eventInserted += 1;
    if (write) {
      await sql`
        INSERT INTO special_events (
          community_id,
          name,
          description,
          event_date,
          event_time,
          duration_minutes,
          min_ministers,
          max_ministers,
          mass_type,
          location,
          priority,
          suppresses_mass_types,
          is_active
        )
        VALUES (
          ${community.id},
          ${item.name},
          ${item.description},
          ${item.eventDate},
          ${item.eventTime},
          ${item.durationMinutes},
          ${item.minMinisters},
          ${item.maxMinisters},
          ${item.massType},
          ${item.location},
          ${item.priority},
          ${sql.json(item.suppressesMassTypes)},
          ${item.isActive}
        )
      `;
    }
  }

  return { eventInserted, eventUpdated };
}

async function validateRequiredTables(sql: postgres.Sql) {
  const required = ["communities", "mass_times_config", "mass_configurations", "special_events"];
  const missing: string[] = [];
  for (const table of required) {
    if (!(await tableExists(sql, table))) missing.push(table);
  }
  if (missing.length > 0) {
    throw new Error(
      `Tabela(s) ausente(s): ${missing.join(", ")}. Rode CONFIRM_NATIVE_MASS_CONFIG_MIGRATION=true DATABASE_URL=... npm run db:migrate:native-mass-config.`,
    );
  }
}

async function main() {
  const url = databaseUrl();
  const write = hasFlag("write");
  guard(url, write);

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await validateRequiredTables(sql);
    const communities = await loadCommunities(sql);
    if (communities.length === 0) {
      throw new Error("Nenhuma comunidade alvo encontrada. Use --community-slug=<slug> ou --all-active-communities.");
    }

    const years = yearRange();
    const summary: Summary = {
      legacyInserted: 0,
      legacyUpdated: 0,
      configInserted: 0,
      configUpdated: 0,
      eventInserted: 0,
      eventUpdated: 0,
    };

    console.log(`${write ? "Applying" : "Dry-run"} native mass configuration seed`);
    console.log(`Communities: ${communities.map((community) => `${community.name} (${community.slug})`).join(", ")}`);
    console.log(`Special event years: ${years.join(", ")}`);

    for (const community of communities) {
      const legacy = await seedLegacy(sql, community, write);
      const configs = await seedDynamic(sql, community, write);
      const events = await seedEvents(sql, community, write, years);

      summary.legacyInserted += legacy.legacyInserted;
      summary.legacyUpdated += legacy.legacyUpdated;
      summary.configInserted += configs.configInserted;
      summary.configUpdated += configs.configUpdated;
      summary.eventInserted += events.eventInserted;
      summary.eventUpdated += events.eventUpdated;
    }

    console.log(JSON.stringify({ write, summary }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Failed to seed native mass configuration:", error);
  process.exit(1);
});
