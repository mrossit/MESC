import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function fixDatabase() {
  try {
    console.log("Adicionando colunas faltantes...");
    
    // Adicionar coluna whatsapp
    try {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN whatsapp varchar(20)
      `);
      console.log("✓ Coluna whatsapp adicionada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Coluna whatsapp já existe");
      } else {
        throw error;
      }
    }

    // Adicionar coluna join_date
    try {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN join_date date
      `);
      console.log("✓ Coluna join_date adicionada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Coluna join_date já existe");
      } else {
        throw error;
      }
    }

    // Adicionar coluna photo_url
    try {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN photo_url text
      `);
      console.log("✓ Coluna photo_url adicionada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Coluna photo_url já existe");
      } else {
        throw error;
      }
    }

    // Criar tabela families
    try {
      await db.execute(sql`
        CREATE TABLE families (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(255) NOT NULL,
          created_at timestamp DEFAULT now()
        )
      `);
      console.log("✓ Tabela families criada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Tabela families já existe");
      } else {
        throw error;
      }
    }

    // Adicionar coluna family_id
    try {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN family_id uuid REFERENCES families(id)
      `);
      console.log("✓ Coluna family_id adicionada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Coluna family_id já existe");
      } else {
        throw error;
      }
    }

    // Criar tipos ENUM necessários
    const enumTypes = [
      { name: 'formation_category', values: "'liturgia', 'espiritualidade', 'pratica'" },
      { name: 'formation_status', values: "'not_started', 'in_progress', 'completed'" },
      { name: 'substitution_status', values: "'pending', 'approved', 'rejected', 'cancelled'" },
      { name: 'schedule_type', values: "'missa', 'celebracao', 'evento'" }
    ];

    for (const enumType of enumTypes) {
      try {
        await db.execute(sql.raw(`CREATE TYPE ${enumType.name} AS ENUM(${enumType.values})`));
        console.log(`✓ Tipo ${enumType.name} criado`);
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          console.log(`- Tipo ${enumType.name} já existe`);
        } else {
          throw error;
        }
      }
    }

    // Criar tabela formation_modules
    try {
      await db.execute(sql`
        CREATE TABLE formation_modules (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title varchar(255) NOT NULL,
          description text,
          category formation_category NOT NULL,
          content text,
          video_url varchar(255),
          duration_minutes integer,
          order_index integer,
          created_at timestamp DEFAULT now()
        )
      `);
      console.log("✓ Tabela formation_modules criada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Tabela formation_modules já existe");
      } else {
        throw error;
      }
    }

    // Criar tabela formation_progress
    try {
      await db.execute(sql`
        CREATE TABLE formation_progress (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id),
          module_id uuid NOT NULL REFERENCES formation_modules(id),
          status formation_status DEFAULT 'not_started' NOT NULL,
          progress_percentage integer DEFAULT 0,
          completed_at timestamp,
          created_at timestamp DEFAULT now()
        )
      `);
      console.log("✓ Tabela formation_progress criada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Tabela formation_progress já existe");
      } else {
        throw error;
      }
    }

    // Criar tabela substitution_requests
    try {
      await db.execute(sql`
        CREATE TABLE substitution_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id uuid NOT NULL REFERENCES schedules(id),
          requester_id varchar NOT NULL REFERENCES users(id),
          substitute_id varchar REFERENCES users(id),
          reason text,
          status substitution_status DEFAULT 'pending' NOT NULL,
          approved_by varchar REFERENCES users(id),
          approved_at timestamp,
          created_at timestamp DEFAULT now()
        )
      `);
      console.log("✓ Tabela substitution_requests criada");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("- Tabela substitution_requests já existe");
      } else {
        throw error;
      }
    }

    // Atualizar tabela schedules
    const scheduleColumns = [
      { name: 'date', type: 'date' },
      { name: 'time', type: 'time' },
      { name: 'type', type: 'schedule_type DEFAULT \'missa\'' },
      { name: 'location', type: 'varchar(255)' },
      { name: 'minister_id', type: 'varchar REFERENCES users(id)' },
      { name: 'substitute_id', type: 'varchar REFERENCES users(id)' },
      { name: 'notes', type: 'text' }
    ];

    for (const col of scheduleColumns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE schedules ADD COLUMN ${col.name} ${col.type}`));
        console.log(`✓ Coluna schedules.${col.name} adicionada`);
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          console.log(`- Coluna schedules.${col.name} já existe`);
        } else if (!error.message.includes("does not exist")) {
          throw error;
        }
      }
    }

    console.log("\n✅ Banco de dados atualizado com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao atualizar banco de dados:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

fixDatabase();