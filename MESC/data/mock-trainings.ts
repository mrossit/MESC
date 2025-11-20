export interface Lesson {
  id: string;
  title: string;
  duration: string; // e.g., "10 min"
  completed: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Training {
  id: string;
  title: string;
  description: string;
  imageUrl: string; // Placeholder URL
  progress: number; // 0 to 100
  modules: Module[];
}

export const mockTrainings: Training[] = [
  {
    id: '1',
    title: 'Introdução à Liturgia',
    description: 'Conceitos fundamentais sobre a Sagrada Liturgia, seus ritos e significados.',
    imageUrl: 'https://placehold.co/600x400/png?text=Liturgia',
    progress: 0,
    modules: [
      {
        id: 'm1',
        title: 'O que é Liturgia?',
        lessons: [
          { id: 'l1', title: 'Definição e História', duration: '15 min', completed: false },
          { id: 'l2', title: 'O Ano Litúrgico', duration: '20 min', completed: false },
        ],
      },
      {
        id: 'm2',
        title: 'Gestos e Símbolos',
        lessons: [
          { id: 'l3', title: 'Cores Litúrgicas', duration: '10 min', completed: false },
          { id: 'l4', title: 'Objetos Sagrados', duration: '25 min', completed: false },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Formação para MESC',
    description: 'Curso específico para Ministros Extraordinários da Sagrada Comunhão.',
    imageUrl: 'https://placehold.co/600x400/png?text=MESC',
    progress: 30,
    modules: [
      {
        id: 'm1',
        title: 'O Ministério',
        lessons: [
          { id: 'l1', title: 'A Missão do Ministro', duration: '30 min', completed: true },
          { id: 'l2', title: 'Espiritualidade', duration: '20 min', completed: false },
        ],
      },
    ],
  },
  {
    id: '3',
    title: 'Missal Romano',
    description: 'Estudo aprofundado sobre o uso e as orações do Missal Romano.',
    imageUrl: 'https://placehold.co/600x400/png?text=Missal',
    progress: 0,
    modules: [],
  },
];
