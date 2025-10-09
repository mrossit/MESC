import { db } from '../server/db';
import { users, questionnaires, massTimesConfig, notifications, familyRelationships } from '@shared/schema';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function populateDatabase() {
  try {
    console.log('🚀 Iniciando população do banco de dados...\n');

    // Senha padrão para todos os usuários de teste
    const defaultPassword = await bcrypt.hash('senha123', 10);

    // 1. Criar usuários ministros
    console.log('📝 Criando ministros...');
    const ministers = [
      {
        id: uuidv4(),
        email: 'ana.silva@test.com',
        name: 'Ana Silva',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11987654321',
        ministryStartDate: new Date('2018-03-15'),
        birthDate: new Date('1985-06-20'),
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        zipCode: '01234-567',
        maritalStatus: 'married',
        baptismDate: new Date('1986-12-25'),
        baptismParish: 'Paróquia São José',
        confirmationDate: new Date('1998-05-10'),
        confirmationParish: 'Paróquia São José',
        marriageDate: new Date('2010-08-15'),
        marriageParish: 'Paróquia Nossa Senhora',
        preferredPosition: 1,
        availableForSpecialEvents: true,
        liturgicalTraining: true,
        experience: 'Experiência de 6 anos como ministra da eucaristia',
        specialSkills: 'Formação em liturgia e canto',
        observations: 'Disponível aos domingos pela manhã',
        totalServices: 85,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'carlos.santos@test.com',
        name: 'Carlos Santos',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11976543210',
        ministryStartDate: new Date('2019-07-01'),
        birthDate: new Date('1978-11-10'),
        address: 'Avenida Central, 456',
        city: 'São Paulo',
        zipCode: '02345-678',
        maritalStatus: 'married',
        baptismDate: new Date('1979-01-15'),
        confirmationDate: new Date('1990-09-20'),
        preferredPosition: 2,
        availableForSpecialEvents: true,
        liturgicalTraining: false,
        experience: 'Ministro há 5 anos',
        totalServices: 62,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'fernanda.lima@test.com',
        name: 'Fernanda Lima',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11965432109',
        ministryStartDate: new Date('2020-02-10'),
        birthDate: new Date('1990-04-15'),
        address: 'Rua do Comércio, 789',
        city: 'São Paulo',
        zipCode: '03456-789',
        maritalStatus: 'single',
        baptismDate: new Date('1990-08-20'),
        confirmationDate: new Date('2002-10-15'),
        preferredPosition: 3,
        availableForSpecialEvents: true,
        liturgicalTraining: true,
        experience: 'Ministra há 4 anos, participou de formações diocesanas',
        specialSkills: 'Coordenação de grupos de jovens',
        totalServices: 48,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'roberto.oliveira@test.com',
        name: 'Roberto Oliveira',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11954321098',
        ministryStartDate: new Date('2021-05-20'),
        birthDate: new Date('1982-09-25'),
        address: 'Praça da Igreja, 10',
        city: 'São Paulo',
        zipCode: '04567-890',
        maritalStatus: 'married',
        marriageDate: new Date('2008-06-10'),
        baptismDate: new Date('1983-02-14'),
        confirmationDate: new Date('1995-11-20'),
        preferredPosition: 1,
        availableForSpecialEvents: false,
        liturgicalTraining: true,
        experience: 'Ministro há 3 anos',
        totalServices: 35,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'juliana.costa@test.com',
        name: 'Juliana Costa',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'active' as const,
        phone: '11943210987',
        ministryStartDate: new Date('2017-08-01'),
        birthDate: new Date('1988-12-05'),
        address: 'Alameda das Palmeiras, 234',
        city: 'São Paulo',
        zipCode: '05678-901',
        maritalStatus: 'single',
        baptismDate: new Date('1989-03-10'),
        confirmationDate: new Date('2001-05-15'),
        preferredPosition: 2,
        availableForSpecialEvents: true,
        liturgicalTraining: false,
        experience: 'Experiência de 7 anos no ministério',
        totalServices: 92,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'marcos.pereira@test.com',
        name: 'Marcos Pereira',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'inactive' as const,
        phone: '11932109876',
        ministryStartDate: new Date('2016-03-10'),
        birthDate: new Date('1975-07-18'),
        address: 'Rua São Francisco, 567',
        city: 'São Paulo',
        zipCode: '06789-012',
        maritalStatus: 'married',
        baptismDate: new Date('1976-01-20'),
        confirmationDate: new Date('1988-09-10'),
        marriageDate: new Date('2000-04-22'),
        preferredPosition: 3,
        availableForSpecialEvents: false,
        liturgicalTraining: true,
        experience: 'Ministro por 8 anos, atualmente afastado',
        observations: 'Afastado temporariamente por motivos pessoais',
        totalServices: 120,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'patricia.alves@test.com',
        name: 'Patrícia Alves',
        passwordHash: defaultPassword,
        role: 'ministro' as const,
        status: 'pending' as const,
        phone: '11921098765',
        ministryStartDate: null,
        birthDate: new Date('1992-02-28'),
        address: 'Travessa das Acácias, 89',
        city: 'São Paulo',
        zipCode: '07890-123',
        maritalStatus: 'single',
        baptismDate: new Date('1992-05-30'),
        confirmationDate: new Date('2004-08-20'),
        preferredPosition: 1,
        availableForSpecialEvents: true,
        liturgicalTraining: false,
        experience: 'Aguardando aprovação para iniciar no ministério',
        observations: 'Candidata aguardando aprovação',
        totalServices: 0,
        requiresPasswordChange: true
      }
    ];

    // 2. Criar coordenadores
    console.log('📝 Criando coordenadores...');
    const coordinators = [
      {
        id: uuidv4(),
        email: 'coordenador@test.com',
        name: 'José Coordenador',
        passwordHash: defaultPassword,
        role: 'coordenador' as const,
        status: 'active' as const,
        phone: '11999887766',
        ministryStartDate: new Date('2015-01-01'),
        birthDate: new Date('1970-05-15'),
        address: 'Rua Principal, 100',
        city: 'São Paulo',
        zipCode: '01000-000',
        maritalStatus: 'married',
        baptismDate: new Date('1970-08-20'),
        confirmationDate: new Date('1982-10-10'),
        marriageDate: new Date('1995-06-15'),
        preferredPosition: 1,
        availableForSpecialEvents: true,
        liturgicalTraining: true,
        experience: 'Coordenador do ministério há 5 anos, ministro há 10 anos',
        specialSkills: 'Gestão de equipes, formação litúrgica',
        totalServices: 250,
        requiresPasswordChange: false
      },
      {
        id: uuidv4(),
        email: 'maria.coordenadora@test.com',
        name: 'Maria Coordenadora',
        passwordHash: defaultPassword,
        role: 'coordenador' as const,
        status: 'active' as const,
        phone: '11988776655',
        ministryStartDate: new Date('2014-06-01'),
        birthDate: new Date('1972-08-22'),
        address: 'Avenida da Igreja, 200',
        city: 'São Paulo',
        zipCode: '02000-000',
        maritalStatus: 'married',
        baptismDate: new Date('1972-12-25'),
        confirmationDate: new Date('1984-05-20'),
        marriageDate: new Date('1998-09-10'),
        preferredPosition: 2,
        availableForSpecialEvents: true,
        liturgicalTraining: true,
        experience: 'Vice-coordenadora, responsável pela formação',
        specialSkills: 'Formação teológica, organização de retiros',
        totalServices: 280,
        requiresPasswordChange: false
      }
    ];

    // Inserir todos os usuários
    for (const user of [...ministers, ...coordinators]) {
      try {
        await db.insert(users).values(user);
        console.log(`✅ Criado: ${user.name} (${user.email})`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⏭️  ${user.email} já existe, pulando...`);
        } else {
          throw error;
        }
      }
    }

    // 3. Criar relacionamentos familiares
    console.log('\n👨‍👩‍👧‍👦 Criando relacionamentos familiares...');
    const anaId = ministers[0].id;
    const carlosId = ministers[1].id;
    const robertoId = ministers[3].id;
    const julianaId = ministers[4].id;

    const relationships = [
      { userId: anaId, relatedUserId: carlosId, relationshipType: 'spouse' },
      { userId: carlosId, relatedUserId: anaId, relationshipType: 'spouse' },
      { userId: robertoId, relatedUserId: julianaId, relationshipType: 'sibling' },
      { userId: julianaId, relatedUserId: robertoId, relationshipType: 'sibling' }
    ];

    for (const rel of relationships) {
      try {
        await db.insert(familyRelationships).values({
          id: uuidv4(),
          ...rel
        });
        console.log(`✅ Relacionamento criado: ${rel.relationshipType}`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⏭️  Relacionamento já existe, pulando...`);
        }
      }
    }

    // 4. Criar horários de missas
    console.log('\n⛪ Configurando horários de missas...');
    const massTimes = [
      { dayOfWeek: 0, time: '07:00', label: 'Domingo - 07:00', ministersNeeded: 3, isActive: true },
      { dayOfWeek: 0, time: '09:00', label: 'Domingo - 09:00', ministersNeeded: 4, isActive: true },
      { dayOfWeek: 0, time: '11:00', label: 'Domingo - 11:00', ministersNeeded: 4, isActive: true },
      { dayOfWeek: 0, time: '19:00', label: 'Domingo - 19:00', ministersNeeded: 3, isActive: true },
      { dayOfWeek: 3, time: '19:30', label: 'Quarta-feira - 19:30', ministersNeeded: 2, isActive: true },
      { dayOfWeek: 6, time: '19:00', label: 'Sábado - 19:00', ministersNeeded: 3, isActive: true }
    ];

    for (const massTime of massTimes) {
      try {
        await db.insert(massTimesConfig).values({
          id: uuidv4(),
          ...massTime
        });
        console.log(`✅ Horário de missa criado: ${massTime.label}`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⏭️  Horário ${massTime.label} já existe, pulando...`);
        }
      }
    }

    // 5. Criar questionário de disponibilidade
    console.log('\n📋 Criando questionário de disponibilidade...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      const [questionnaire] = await db.insert(questionnaires).values({
        id: uuidv4(),
        title: `Disponibilidade - ${currentMonth}/${currentYear}`,
        description: 'Por favor, indique sua disponibilidade para servir nas missas deste mês',
        month: currentMonth,
        year: currentYear,
        status: 'published',
        questions: [
          {
            id: '1',
            type: 'multiple_choice',
            question: 'Quais domingos você está disponível?',
            options: ['1º Domingo', '2º Domingo', '3º Domingo', '4º Domingo', '5º Domingo'],
            required: true
          },
          {
            id: '2',
            type: 'multiple_choice',
            question: 'Quais horários você prefere?',
            options: ['07:00', '09:00', '11:00', '19:00'],
            required: true
          },
          {
            id: '3',
            type: 'yes_no',
            question: 'Você está disponível para missas durante a semana?',
            required: false
          },
          {
            id: '4',
            type: 'text',
            question: 'Observações ou restrições',
            required: false
          }
        ],
        deadline: new Date(currentYear, currentMonth, 0), // Último dia do mês
        createdById: coordinators[0].id
      }).returning();

      console.log(`✅ Questionário criado: ${questionnaire.title}`);
    } catch (error: any) {
      if (error.code === '23505') {
        console.log(`⏭️  Questionário do mês já existe, pulando...`);
      }
    }

    // 6. Criar notificações de exemplo
    console.log('\n🔔 Criando notificações de exemplo...');
    const notificationExamples = [
      {
        userId: ministers[0].id,
        type: 'schedule' as const,
        title: 'Nova escala disponível',
        message: 'A escala do próximo mês já está disponível. Confira suas datas!',
        priority: 'normal',
        read: false
      },
      {
        userId: ministers[1].id,
        type: 'reminder' as const,
        title: 'Lembrete: Missa amanhã',
        message: 'Você está escalado para a missa de amanhã às 09:00',
        priority: 'high',
        read: false
      },
      {
        userId: ministers[2].id,
        type: 'formation' as const,
        title: 'Nova formação disponível',
        message: 'Está disponível o material da formação sobre Liturgia Eucarística',
        priority: 'normal',
        read: true,
        readAt: new Date()
      },
      {
        userId: coordinators[0].id,
        type: 'substitution' as const,
        title: 'Solicitação de substituição',
        message: 'Ana Silva solicitou substituição para o dia 15/03',
        priority: 'high',
        read: false
      }
    ];

    for (const notif of notificationExamples) {
      try {
        await db.insert(notifications).values({
          id: uuidv4(),
          ...notif
        });
        console.log(`✅ Notificação criada: ${notif.title}`);
      } catch (error: any) {
        console.log(`⚠️  Erro ao criar notificação: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ BANCO DE DADOS POPULADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMO DOS DADOS CRIADOS:');
    console.log(`- ${ministers.length} ministros`);
    console.log(`- ${coordinators.length} coordenadores`);
    console.log(`- ${relationships.length/2} relacionamentos familiares`);
    console.log(`- ${massTimes.length} horários de missa`);
    console.log(`- 1 questionário de disponibilidade`);
    console.log(`- ${notificationExamples.length} notificações de exemplo`);
    console.log('\n🔐 CREDENCIAIS DE ACESSO:');
    console.log('Todos os usuários usam a senha: senha123');
    console.log('\nUSUÁRIOS PRINCIPAIS:');
    console.log('- rossit@icloud.com (gestor)');
    console.log('- coordenador@test.com (coordenador)');
    console.log('- maria.coordenadora@test.com (coordenadora)');
    console.log('- ana.silva@test.com (ministra ativa)');
    console.log('- patricia.alves@test.com (aguardando aprovação)');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
  }

  process.exit(0);
}

populateDatabase();