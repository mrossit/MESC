import { describe, expect, it } from 'vitest';
import { sanitizeQuestionnaireResponses, type QuestionnaireResponseItem } from '../../server/utils/questionnaireSanitization';

const baseQuestions = [
  {
    id: 'monthly_availability',
    type: 'multiple_choice',
    category: 'regular',
  },
  {
    id: 'alternative_availability',
    type: 'multiple_choice',
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Não',
    },
  },
  {
    id: 'available_sundays',
    type: 'checkbox',
    category: 'regular',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
    },
  },
  {
    id: 'special_event_mass',
    type: 'multiple_choice',
    category: 'special_event',
    metadata: {
      dependsOn: 'monthly_availability',
      showIf: 'Sim',
      alternativeDependsOn: 'alternative_availability',
      alternativeShowIf: 'Sim',
    },
  },
];

function ids(responses: QuestionnaireResponseItem[]) {
  return responses.map((response) => response.questionId);
}

describe('sanitizeQuestionnaireResponses', () => {
  it('mantem pergunta dependente visivel', () => {
    const responses = [
      { questionId: 'monthly_availability', answer: 'Sim' },
      { questionId: 'available_sundays', answer: ['Domingo 05/07'] },
    ];

    expect(sanitizeQuestionnaireResponses(baseQuestions, responses)).toEqual(responses);
  });

  it('remove pergunta dependente oculta', () => {
    const responses = [
      { questionId: 'monthly_availability', answer: 'Não' },
      { questionId: 'available_sundays', answer: ['Domingo 05/07'] },
    ];

    expect(ids(sanitizeQuestionnaireResponses(baseQuestions, responses))).toEqual([
      'monthly_availability',
    ]);
  });

  it("remove opcoes nao aplicaveis quando filterMode e 'exclude'", () => {
    const questions = [
      { id: 'main_service_time', type: 'multiple_choice', category: 'regular' },
      {
        id: 'other_times_available',
        type: 'yes_no_with_options',
        category: 'regular',
        metadata: {
          dependsOn: 'main_service_time',
          showIf: '10h',
          conditionalOptions: ['8h', '10h', '19h'],
          filterMode: 'exclude',
        },
      },
    ];
    const responses = [
      { questionId: 'main_service_time', answer: '10h' },
      {
        questionId: 'other_times_available',
        answer: { answer: 'Sim', selectedOptions: ['8h', '10h', '19h'] },
      },
    ];

    expect(sanitizeQuestionnaireResponses(questions, responses)).toEqual([
      { questionId: 'main_service_time', answer: '10h' },
      {
        questionId: 'other_times_available',
        answer: { answer: 'Sim', selectedOptions: ['8h', '19h'] },
      },
    ]);
  });

  it('replica alternativa de monthly_availability para manter pergunta visivel', () => {
    const responses = [
      { questionId: 'monthly_availability', answer: 'Não' },
      { questionId: 'alternative_availability', answer: 'Sim' },
      { questionId: 'special_event_mass', answer: 'Sim' },
    ];

    expect(ids(sanitizeQuestionnaireResponses(baseQuestions, responses))).toEqual([
      'monthly_availability',
      'alternative_availability',
      'special_event_mass',
    ]);
  });

  it('mantem payload sem metadata condicional intacto', () => {
    const questions = [
      { id: 'notes', type: 'text', category: 'regular' },
      { id: 'can_substitute', type: 'multiple_choice', category: 'regular' },
    ];
    const responses = [
      { questionId: 'notes', answer: '  texto livre  ', metadata: { source: 'mobile' } },
      { questionId: 'can_substitute', answer: false },
    ];

    expect(sanitizeQuestionnaireResponses(questions, responses)).toEqual(responses);
  });

  it('mantem formato v2 intacto por nao carregar respostas por questionId', () => {
    const v2 = {
      format_version: '2.0' as const,
      masses: {
        '2026-07-05': {
          '08:00': true,
        },
      },
      special_events: {
        custom_hidden: true,
      },
      can_substitute: false,
    };

    expect(sanitizeQuestionnaireResponses(baseQuestions, v2)).toBe(v2);
  });
});
