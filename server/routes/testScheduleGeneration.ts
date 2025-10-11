import { Router, Response } from "express";
import { authenticateToken as requireAuth, AuthRequest, requireRole } from "../auth";
import { generateAutomaticSchedule, ScheduleGenerator, Minister, MassTime, AvailabilityData } from "../utils/scheduleGenerator";
import { format, addMonths, startOfMonth, endOfMonth, getDay } from 'date-fns';

const router = Router();

/**
 * Generate mock ministers for testing
 */
function generateMockMinisters(count: number = 50): Minister[] {
  const firstNames = [
    'João', 'Maria', 'José', 'Ana', 'Pedro', 'Paula', 'Carlos', 'Juliana',
    'Rafael', 'Mariana', 'Lucas', 'Beatriz', 'Fernando', 'Camila', 'Roberto',
    'Larissa', 'Marcos', 'Fernanda', 'André', 'Patrícia', 'Gabriel', 'Isabela',
    'Thiago', 'Aline', 'Felipe', 'Cristina', 'Rodrigo', 'Vanessa', 'Bruno',
    'Renata', 'Diego', 'Adriana', 'Gustavo', 'Simone', 'Leandro', 'Tatiana',
    'Ricardo', 'Luciana', 'Marcelo', 'Daniela', 'Alexandre', 'Carla', 'Fábio',
    'Priscila', 'Vinícius', 'Amanda', 'Maurício', 'Silvia', 'Leonardo', 'Bianca'
  ];

  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
    'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
    'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Cardoso',
    'Correia', 'Dias', 'Teixeira', 'Cavalcanti', 'Monteiro', 'Freitas', 'Mendes'
  ];

  const ministers: Minister[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${firstName} ${lastName}`;

    // Vary experience levels
    const experienceYears = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
    const totalServices = Math.floor(Math.random() * 20) + experienceYears * 10;

    // Some ministers prefer different times
    const preferredTimes: string[] = [];
    if (Math.random() > 0.5) preferredTimes.push('08:00');
    if (Math.random() > 0.5) preferredTimes.push('10:00');
    if (Math.random() > 0.3) preferredTimes.push('19:00');

    ministers.push({
      id: `mock-${i + 1}`,
      name,
      role: i < 5 ? 'coordenador' : 'ministro',
      totalServices,
      lastService: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      preferredTimes,
      canServeAsCouple: i % 10 === 0, // 10% can serve as couples
      spouseMinisterId: i % 10 === 0 && i > 0 ? `mock-${i}` : null,
      availabilityScore: 0.5 + Math.random() * 0.5, // 0.5 to 1.0
      preferenceScore: Math.random()
    });
  }

  return ministers;
}

/**
 * Generate mock availability data
 */
function generateMockAvailabilityData(ministers: Minister[], month: number, year: number): Map<string, AvailabilityData> {
  const availabilityMap = new Map<string, AvailabilityData>();

  for (const minister of ministers) {
    if (!minister.id) continue;

    // Random availability patterns
    const availableSundays: string[] = [];
    const sundaysInMonth = 4 + (Math.random() > 0.7 ? 1 : 0); // 4 or 5 Sundays

    for (let i = 1; i <= sundaysInMonth; i++) {
      if (Math.random() > 0.2) { // 80% chance to be available each Sunday
        availableSundays.push(i.toString());
      }
    }

    // Preferred mass times (some prefer mornings, some evenings)
    const preferredMassTimes: string[] = [];
    if (Math.random() > 0.3) preferredMassTimes.push('8h');
    if (Math.random() > 0.4) preferredMassTimes.push('10h');
    if (Math.random() > 0.5) preferredMassTimes.push('19h');

    // Alternative times
    const alternativeTimes: string[] = [];
    if (preferredMassTimes.length > 0 && Math.random() > 0.5) {
      const allTimes = ['8h', '10h', '19h'];
      for (const time of allTimes) {
        if (!preferredMassTimes.includes(time) && Math.random() > 0.6) {
          alternativeTimes.push(time);
        }
      }
    }

    // Daily mass availability (weekdays)
    const dailyMassAvailability: string[] = [];
    const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    for (const day of weekdays) {
      if (Math.random() > 0.7) { // 30% chance for each weekday
        dailyMassAvailability.push(day);
      }
    }

    availabilityMap.set(minister.id, {
      ministerId: minister.id,
      availableSundays,
      preferredMassTimes,
      alternativeTimes,
      dailyMassAvailability,
      canSubstitute: Math.random() > 0.4 // 60% can substitute
    });
  }

  return availabilityMap;
}

/**
 * POST /api/schedules/test-generation
 * Generate a test schedule with mock data
 */
router.post("/test-generation", requireAuth, requireRole(['coordenador', 'gestor']), async (req: AuthRequest, res: Response) => {
  try {
    const { ministerCount = 50 } = req.body;

    // Use next month for testing
    const nextMonth = addMonths(new Date(), 1);
    const month = nextMonth.getMonth() + 1;
    const year = nextMonth.getFullYear();

    console.log(`[TEST_GEN] Generating test schedule for ${month}/${year} with ${ministerCount} mock ministers`);

    // Generate mock data
    const mockMinisters = generateMockMinisters(ministerCount);
    const mockAvailability = generateMockAvailabilityData(mockMinisters, month, year);

    console.log(`[TEST_GEN] Created ${mockMinisters.length} mock ministers`);
    console.log(`[TEST_GEN] Created ${mockAvailability.size} availability records`);

    // Create a test generator instance with mock data
    const generator = new TestScheduleGenerator(mockMinisters, mockAvailability);
    const schedules = await generator.generateScheduleForMonth(year, month, true);

    console.log(`[TEST_GEN] Generated ${schedules.length} mass schedules`);

    // Calculate statistics
    const statistics = calculateTestStatistics(schedules, mockMinisters);

    // Format response
    const response = {
      success: true,
      message: `Teste gerado com sucesso para ${month}/${year}`,
      data: {
        month,
        year,
        mockData: {
          ministerCount: mockMinisters.length,
          ministers: mockMinisters.slice(0, 10).map(m => ({ id: m.id, name: m.name, totalServices: m.totalServices })), // Sample
          availabilityCount: mockAvailability.size
        },
        schedules: schedules.map(s => ({
          date: s.massTime.date,
          time: s.massTime.time,
          type: s.massTime.type,
          ministersAssigned: s.ministers.length,
          ministersRequired: s.massTime.minMinisters,
          confidence: s.confidence,
          ministers: s.ministers.map(m => ({
            id: m.id,
            name: m.name,
            position: m.position,
            totalServices: m.totalServices
          }))
        })),
        statistics
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error("[TEST_GEN] Error generating test schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Erro ao gerar escala de teste",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Test Schedule Generator - extends the main generator with mock data injection
 */
class TestScheduleGenerator extends ScheduleGenerator {
  private mockMinisters: Minister[];
  private mockAvailability: Map<string, AvailabilityData>;

  constructor(ministers: Minister[], availability: Map<string, AvailabilityData>) {
    super();
    this.mockMinisters = ministers;
    this.mockAvailability = availability;
  }

  /**
   * Override to use mock data instead of database
   */
  async generateScheduleForMonth(year: number, month: number, isPreview: boolean = true) {
    console.log(`[TEST_GENERATOR] Using ${this.mockMinisters.length} mock ministers`);

    // Inject mock data into the generator
    (this as any).ministers = this.mockMinisters;
    (this as any).availabilityData = this.mockAvailability;
    (this as any).dailyAssignments = new Map();
    (this as any).saintBonusCache = new Map();

    // Set mock db to null to prevent database calls
    (this as any).db = null;

    // Load mass times config (use defaults since we can't access DB)
    (this as any).massTimes = [
      { id: '1', dayOfWeek: 0, time: '08:00', minMinisters: 15, maxMinisters: 20 },
      { id: '2', dayOfWeek: 0, time: '10:00', minMinisters: 20, maxMinisters: 28 },
      { id: '3', dayOfWeek: 0, time: '19:00', minMinisters: 20, maxMinisters: 28 },
      { id: '4', dayOfWeek: 1, time: '06:30', minMinisters: 5, maxMinisters: 8 },
      { id: '5', dayOfWeek: 2, time: '06:30', minMinisters: 5, maxMinisters: 8 },
      { id: '6', dayOfWeek: 3, time: '06:30', minMinisters: 5, maxMinisters: 8 },
      { id: '7', dayOfWeek: 4, time: '06:30', minMinisters: 5, maxMinisters: 8 },
      { id: '8', dayOfWeek: 5, time: '06:30', minMinisters: 5, maxMinisters: 8 },
      { id: '9', dayOfWeek: 6, time: '06:30', minMinisters: 5, maxMinisters: 8 }
    ];

    // Generate monthly mass times
    const monthlyMassTimes = (this as any).generateMonthlyMassTimes(year, month);
    console.log(`[TEST_GENERATOR] Generated ${monthlyMassTimes.length} mass times for the month`);

    // Generate schedules
    const generatedSchedules = [];
    for (const massTime of monthlyMassTimes) {
      const schedule = await (this as any).generateScheduleForMass(massTime);
      generatedSchedules.push(schedule);
    }

    // Log incomplete schedules
    const incompleteSchedules = generatedSchedules.filter(s =>
      s.ministers.length < s.massTime.minMinisters
    );

    if (incompleteSchedules.length > 0) {
      console.log(`[TEST_GENERATOR] ⚠️ ${incompleteSchedules.length} incomplete schedules detected`);
      incompleteSchedules.forEach(s => {
        console.log(`  - ${s.massTime.date} ${s.massTime.time}: ${s.ministers.length}/${s.massTime.minMinisters} ministers`);
      });
    } else {
      console.log(`[TEST_GENERATOR] ✅ All schedules have minimum ministers!`);
    }

    return generatedSchedules;
  }
}

/**
 * Calculate statistics for test generation
 */
function calculateTestStatistics(schedules: any[], ministers: Minister[]) {
  const assignmentsPerMinister: Record<string, number> = {};
  let totalPositions = 0;
  let filledPositions = 0;
  let totalConfidence = 0;

  for (const schedule of schedules) {
    totalPositions += schedule.massTime.minMinisters;
    filledPositions += schedule.ministers.length;
    totalConfidence += schedule.confidence;

    for (const minister of schedule.ministers) {
      if (!minister.id) continue;
      assignmentsPerMinister[minister.id] = (assignmentsPerMinister[minister.id] || 0) + 1;
    }
  }

  const coverage = totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0;
  const averageConfidence = schedules.length > 0 ? totalConfidence / schedules.length : 0;

  // Calculate distribution variance
  const assignments = Object.values(assignmentsPerMinister);
  const avgAssignments = assignments.length > 0
    ? assignments.reduce((sum, count) => sum + count, 0) / assignments.length
    : 0;

  const variance = assignments.length > 0
    ? Math.sqrt(
        assignments.reduce((sum, count) => sum + Math.pow(count - avgAssignments, 2), 0) / assignments.length
      )
    : 0;

  const fairness = Math.max(0, 1 - (variance / (avgAssignments || 1)));

  // Find outliers
  const outliers = Object.entries(assignmentsPerMinister)
    .filter(([_, count]) => count > 4 || count < 1)
    .map(([ministerId, count]) => ({
      ministerId,
      ministerName: ministers.find(m => m.id === ministerId)?.name || 'Unknown',
      count,
      reason: count > 4 ? 'too_many_assignments' : 'too_few_assignments'
    }));

  // Count mass types
  const massTypes: Record<string, number> = {};
  for (const schedule of schedules) {
    const type = schedule.massTime.type || 'regular';
    massTypes[type] = (massTypes[type] || 0) + 1;
  }

  return {
    totalMasses: schedules.length,
    totalPositions,
    filledPositions,
    coverage: Math.round(coverage * 100) / 100,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    uniqueMinistersUsed: Object.keys(assignmentsPerMinister).length,
    totalMinistersAvailable: ministers.length,
    utilizationRate: Math.round((Object.keys(assignmentsPerMinister).length / ministers.length) * 100),
    averageAssignmentsPerMinister: Math.round(avgAssignments * 10) / 10,
    distributionVariance: Math.round(variance * 100) / 100,
    fairnessScore: Math.round(fairness * 100),
    outliers,
    massTypeBreakdown: massTypes,
    incompleteSchedules: schedules.filter(s => s.ministers.length < s.massTime.minMinisters).length,
    highConfidenceSchedules: schedules.filter(s => s.confidence >= 0.8).length,
    mediumConfidenceSchedules: schedules.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length,
    lowConfidenceSchedules: schedules.filter(s => s.confidence < 0.6).length
  };
}

export default router;
