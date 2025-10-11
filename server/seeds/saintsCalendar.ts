/**
 * Saints Calendar Seeding Script
 * Populates database with Brazilian and universal saints
 */

import { db } from '../db';
import { saints } from '../../shared/schema';

interface SaintData {
  name: string;
  feastDay: string; // MM-DD
  title?: string;
  patronOf?: string;
  biography: string;
  imageUrl?: string;
  isBrazilian?: boolean;
  rank: 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'OPTIONAL_MEMORIAL';
  liturgicalColor: 'white' | 'red' | 'green' | 'purple' | 'rose' | 'black';
  collectPrayer?: string;
  firstReading?: { reference: string; text?: string };
  responsorialPsalm?: { reference: string; response?: string; text?: string };
  gospel?: { reference: string; text?: string };
  prayerOfTheFaithful?: string;
  communionAntiphon?: string;
  attributes?: string[];
  quotes?: string[];
}

const BRAZILIAN_SAINTS: SaintData[] = [
  {
    name: 'Nossa Senhora Aparecida',
    feastDay: '10-12',
    title: 'Padroeira do Brasil',
    patronOf: 'Brasil, pescadores, navegadores',
    biography: 'Em 1717, três pescadores encontraram no rio Paraíba uma imagem de Nossa Senhora da Conceição. A imagem escura (aparecida) tornou-se símbolo da fé brasileira e foi coroada Rainha e Padroeira do Brasil em 1929 pelo Papa Pio XI.',
    isBrazilian: true,
    rank: 'SOLEMNITY',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, Pai de misericórdia, que destes ao povo brasileiro Nossa Senhora Aparecida como Mãe e Padroeira, concedei-nos a graça de, à imitação dela, buscar sempre o reino de Cristo.',
    firstReading: { reference: 'Zc 2,14-17' },
    responsorialPsalm: { reference: 'Jt 13', response: 'Vós sois a glória de Jerusalém, a grande honra de Israel' },
    gospel: { reference: 'Lc 1,39-47' },
    attributes: ['manto azul', 'imagem escura', 'coroa', 'rosas'],
    quotes: ['Eu sou a Imaculada Conceição']
  },
  {
    name: 'Santo Antônio de Pádua',
    feastDay: '06-13',
    title: 'Doutor da Igreja',
    patronOf: 'pobres, viajantes, objetos perdidos, casamento, Portugal, Brasil',
    biography: 'Nascido em Lisboa em 1195, Fernando Martins de Bulhões tornou-se frade franciscano com o nome de Antônio. Pregador eloquente e taumaturgo, é um dos santos mais venerados no Brasil.',
    rank: 'MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que adornastes Santo Antônio com o dom da pregação evangélica e o poder dos milagres, concedei que, por sua intercessão, possamos viver sempre conforme o Evangelho.',
    firstReading: { reference: '1Cor 1,26-31' },
    responsorialPsalm: { reference: 'Sl 39', response: 'Eis que venho, Senhor, para fazer vossa vontade' },
    gospel: { reference: 'Mt 5,13-16' },
    attributes: ['Menino Jesus', 'lírio', 'pão', 'livro'],
    quotes: ['As ações falam mais alto que as palavras']
  },
  {
    name: 'São Francisco de Assis',
    feastDay: '10-04',
    title: 'Fundador',
    patronOf: 'animais, ecologia, comerciantes, Itália',
    biography: 'Nasceu em Assis em 1182. Fundou a Ordem dos Frades Menores (Franciscanos). Muito venerado no Brasil, é conhecido por seu amor à natureza e aos pobres.',
    rank: 'MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que inspirastes a São Francisco a imitar perfeitamente a Cristo na pobreza e humildade, concedei-nos seguir fielmente sua doutrina.',
    firstReading: { reference: 'Gl 6,14-18' },
    responsorialPsalm: { reference: 'Sl 16', response: 'Vós sois, ó Senhor, minha herança' },
    gospel: { reference: 'Mt 11,25-30' },
    attributes: ['hábito marrom', 'cordão', 'estigmas', 'pássaros', 'lobo'],
    quotes: ['Senhor, fazei de mim um instrumento de vossa paz']
  },
  {
    name: 'São Judas Tadeu',
    feastDay: '10-28',
    title: 'Apóstolo',
    patronOf: 'causas impossíveis, desesperadas',
    biography: 'Um dos doze apóstol os de Jesus Cristo, primo do Senhor. É invocado nas causas difíceis e desesperadas. Sua festa no Brasil é celebrada com grande devoção.',
    rank: 'FEAST',
    liturgicalColor: 'red',
    collectPrayer: 'Ó Deus, que por meio de vosso apóstolo São Judas Tadeu nos fizestes chegar ao conhecimento de vosso nome, concedei-nos celebrar seus méritos progredindo na fé.',
    firstReading: { reference: 'Ef 2,19-22' },
    responsorialPsalm: { reference: 'Sl 19', response: 'Seu som ressoa em toda a terra' },
    gospel: { reference: 'Lc 6,12-16' },
    attributes: ['medalhão com imagem de Jesus', 'machado', 'livro'],
    quotes: ['Combater pela fé que foi transmitida aos santos']
  },
  {
    name: 'Santa Rita de Cássia',
    feastDay: '05-22',
    title: 'Viúva',
    patronOf: 'causas impossíveis, mulheres, mães',
    biography: 'Nascida em 1381 na Itália, foi esposa e mãe dedicada. Após enviuvar, tornou-se religiosa agostiniana. É muito venerada no Brasil como advogada das causas impossíveis.',
    rank: 'OPTIONAL_MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que destes a Santa Rita a graça de amar seus inimigos e carregar em seu coração e fronte os sinais de vossa caridade e paixão, concedei-nos, por sua intercessão e méritos, o perdão de nossos pecados.',
    attributes: ['espinho na testa', 'rosas', 'crucifixo'],
    quotes: ['Quanto mais a cruz pesa, mais ela eleva']
  },
  {
    name: 'São Benedito',
    feastDay: '10-05',
    title: 'Religioso',
    patronOf: 'negros, cozinheiros, africanos no Brasil',
    biography: 'Nascido na Sicília em 1526, filho de escravos africanos. Tornou-se franciscano e foi cozinheiro do convento. É padroeiro dos negros e muito venerado no Brasil.',
    isBrazilian: false,
    rank: 'OPTIONAL_MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que fizestes de São Benedito, humilde servo, um exemplo de caridade fraterna, concedei-nos imitar sua simplicidade e amor aos pobres.',
    attributes: ['hábito franciscano', 'Menino Jesus', 'pão', 'rosas'],
    quotes: ['Servir com humildade é o caminho da santidade']
  },
  {
    name: 'Frei Galvão',
    feastDay: '10-25',
    title: 'Primeiro Santo Brasileiro',
    patronOf: 'parturientes, doentes, São Paulo',
    biography: 'Antônio de Sant\'Ana Galvão, nascido em Guaratinguetá em 1739. Franciscano, fundou o Recolhimento de Santa Teresa. Canonizado em 2007, foi o primeiro santo nascido no Brasil.',
    isBrazilian: true,
    rank: 'OPTIONAL_MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que em Frei Galvão nos destes um modelo de vida franciscana e sacerdotal, concedei que, a seu exemplo, vivamos o Evangelho com alegria.',
    firstReading: { reference: 'Fl 3,8-14' },
    gospel: { reference: 'Mt 16,24-27' },
    attributes: ['pílulas de papel', 'hábito franciscano', 'rosário'],
    quotes: ['Fiat voluntas tua (Faça-se a tua vontade)']
  },
  {
    name: 'Irmã Dulce',
    feastDay: '08-13',
    title: 'Anjo Bom da Bahia',
    patronOf: 'pobres, doentes, Bahia',
    biography: 'Maria Rita de Souza Brito Lopes Pontes, nascida em Salvador em 1914. Religiosa das Irmãs Missionárias da Imaculada Conceição, dedicou sua vida aos pobres e doentes. Canonizada em 2019.',
    isBrazilian: true,
    rank: 'OPTIONAL_MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que em Santa Dulce dos Pobres nos destes um exemplo luminoso de caridade para com os necessitados, concedei-nos, por sua intercessão, servir Cristo nos irmãos mais necessitados.',
    attributes: ['hábito azul', 'flores', 'coração'],
    quotes: ['Enquanto puder servir, não vou desistir']
  },
  {
    name: 'Beato José de Anchieta',
    feastDay: '06-09',
    title: 'Apóstolo do Brasil',
    patronOf: 'Brasil, catequese, educação',
    biography: 'Nascido nas Ilhas Canárias em 1534, veio para o Brasil como jesuíta. Fundou cidades, escreveu a primeira gramática tupi-guarani e foi missionário incansável. Beatificado em 1980.',
    isBrazilian: true,
    rank: 'MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que enviastes o Beato José de Anchieta para evangelizar o povo brasileiro, concedei-nos, por sua intercessão, proclamar o Evangelho com coragem.',
    attributes: ['batina jesuíta', 'cruz', 'livro', 'índios'],
    quotes: ['A vós, ó Virgem, venho humildemente']
  },
  {
    name: 'São Sebastião',
    feastDay: '01-20',
    title: 'Mártir',
    patronOf: 'Rio de Janeiro, soldados, atletas',
    biography: 'Mártir romano do século III, morto com flechadas por sua fé. É padroeiro do Rio de Janeiro e muito venerado no Brasil.',
    rank: 'OPTIONAL_MEMORIAL',
    liturgicalColor: 'red',
    collectPrayer: 'Ó Deus, que destes a São Sebastião a força para enfrentar o martírio, concedei-nos, por sua intercessão, coragem para testemunhar nossa fé.',
    attributes: ['flechas', 'armadura romana', 'coroa de mártir'],
    quotes: ['Meu corpo é vosso, minha alma é de Deus']
  }
];

const UNIVERSAL_SAINTS: SaintData[] = [
  {
    name: 'São José',
    feastDay: '03-19',
    title: 'Esposo da Virgem Maria',
    patronOf: 'trabalhadores, pais, Igreja Universal, boa morte',
    biography: 'Esposo de Maria e pai adotivo de Jesus. Carpinteiro de Nazaré, homem justo e fiel guardião da Sagrada Família.',
    rank: 'SOLEMNITY',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que confiastes os primeiros mistérios da salvação humana à fiel guarda de São José, concedei que, por sua intercessão, vossa Igreja conserve fielmente e realize o que ele guardou com amor.',
    firstReading: { reference: '2Sm 7,4-5a.12-14a.16' },
    responsorialPsalm: { reference: 'Sl 89', response: 'Cantarei eternamente as misericórdias do Senhor' },
    gospel: { reference: 'Mt 1,16.18-21.24a ou Lc 2,41-51a' },
    attributes: ['lírio', 'ferramentas de carpinteiro', 'Menino Jesus', 'cajado florido'],
    quotes: ['José fez como o Anjo do Senhor lhe ordenou']
  },
  {
    name: 'São Pedro',
    feastDay: '06-29',
    title: 'Apóstolo',
    patronOf: 'pescadores, papas, Igreja',
    biography: 'Simão Pedro, pescador chamado por Jesus. Primeiro Papa da Igreja, mártir crucificado em Roma de cabeça para baixo.',
    rank: 'SOLEMNITY',
    liturgicalColor: 'red',
    collectPrayer: 'Ó Deus, que destes aos apóstolos Pedro e Paulo a graça do martírio, concedei que vossa Igreja siga sempre seus ensinamentos.',
    firstReading: { reference: 'At 12,1-11' },
    responsorialPsalm: { reference: 'Sl 34', response: 'De todos os temores me livrou o Senhor Deus' },
    gospel: { reference: 'Mt 16,13-19' },
    attributes: ['chaves', 'galo', 'rede de pesca', 'cruz invertida'],
    quotes: ['Tu és o Cristo, o Filho de Deus vivo']
  },
  {
    name: 'São Paulo',
    feastDay: '06-29',
    title: 'Apóstolo dos Gentios',
    patronOf: 'missionários, teólogos, escritores',
    biography: 'Saulo de Tarso, fariseu convertido por Cristo. Grande missionário e escritor de epístolas fundamentais para a Igreja.',
    rank: 'SOLEMNITY',
    liturgicalColor: 'red',
    collectPrayer: 'Ó Deus, que pela pregação de São Paulo levaste o Evangelho a todas as nações, concedei-nos anunciar Cristo com a mesma coragem.',
    firstReading: { reference: 'At 9,1-22' },
    responsorialPsalm: { reference: 'Sl 117', response: 'Ide por todo o mundo, levai a Boa-Nova' },
    gospel: { reference: 'Mc 16,15-18' },
    attributes: ['espada', 'livro', 'Escrituras'],
    quotes: ['Já não sou eu que vivo, mas Cristo vive em mim']
  },
  {
    name: 'Santa Teresinha do Menino Jesus',
    feastDay: '10-01',
    title: 'Doutora da Igreja',
    patronOf: 'missões, flores, tuberculose',
    biography: 'Teresa de Lisieux (1873-1897), carmelita francesa que viveu o "pequeno caminho" de amor e confiança em Deus. Doutora da Igreja.',
    rank: 'MEMORIAL',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que preparastes para vossa glória um caminho de confiança e amor no coração de Santa Teresinha, concedei-nos caminhar em sua simplicidade.',
    attributes: ['rosas', 'crucifixo', 'hábito carmelita'],
    quotes: ['Depois de minha morte, farei cair uma chuva de rosas']
  },
  {
    name: 'Santa Luzia',
    feastDay: '12-13',
    title: 'Virgem e Mártir',
    patronOf: 'olhos, cegos, doenças dos olhos',
    biography: 'Mártir de Siracusa no século IV. Segundo a tradição, teve os olhos arrancados mas continuou a ver. Padroeira da visão.',
    rank: 'MEMORIAL',
    liturgicalColor: 'red',
    collectPrayer: 'Ó Deus, que destes a Santa Luzia a palma do martírio, concedei que, iluminados por sua luz, vejamos o caminho que conduz a vós.',
    attributes: ['olhos numa bandeja', 'lâmpada', 'palma do martírio'],
    quotes: ['Levo a luz de Cristo em meu coração']
  },
  {
    name: 'São João Batista',
    feastDay: '06-24',
    title: 'Precursor do Senhor',
    patronOf: 'batismo, conversão',
    biography: 'Profeta que preparou o caminho para Jesus Cristo. Batizou o Senhor no rio Jordão. Mártir decapitado por Herodes.',
    rank: 'SOLEMNITY',
    liturgicalColor: 'white',
    collectPrayer: 'Ó Deus, que suscitastes São João Batista para preparar um povo perfeito para Cristo, dai a vosso povo a alegria da salvação.',
    firstReading: { reference: 'Is 49,1-6' },
    responsorialPsalm: { reference: 'Sl 139', response: 'Eu vos dou graças, ó Senhor, porque de modo admirável me formastes' },
    gospel: { reference: 'Lc 1,57-66.80' },
    attributes: ['pele de camelo', 'cordeiro', 'cruz de cana', 'concha'],
    quotes: ['É preciso que Ele cresça e eu diminua']
  }
];

/**
 * Seed saints calendar
 */
export async function seedSaintsCalendar() {
  console.log('Starting saints calendar seeding...\n');

  try {
    const allSaints = [...BRAZILIAN_SAINTS, ...UNIVERSAL_SAINTS];

    console.log(`Seeding ${allSaints.length} saints...`);
    console.log(`  - ${BRAZILIAN_SAINTS.length} Brazilian saints`);
    console.log(`  - ${UNIVERSAL_SAINTS.length} Universal saints\n`);

    for (const saintData of allSaints) {
      await db.insert(saints).values({
        name: saintData.name,
        feastDay: saintData.feastDay,
        title: saintData.title,
        patronOf: saintData.patronOf,
        biography: saintData.biography,
        imageUrl: saintData.imageUrl,
        isBrazilian: saintData.isBrazilian || false,
        rank: saintData.rank,
        liturgicalColor: saintData.liturgicalColor,
        collectPrayer: saintData.collectPrayer,
        firstReading: saintData.firstReading,
        responsorialPsalm: saintData.responsorialPsalm,
        gospel: saintData.gospel,
        prayerOfTheFaithful: saintData.prayerOfTheFaithful,
        communionAntiphon: saintData.communionAntiphon,
        attributes: saintData.attributes,
        quotes: saintData.quotes
      });

      console.log(`  ✓ ${saintData.name} (${saintData.feastDay})`);
    }

    console.log('\n✅ Saints calendar seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding saints calendar:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedSaintsCalendar()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
