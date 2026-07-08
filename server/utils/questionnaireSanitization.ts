type QuestionType = 'multiple_choice' | 'checkbox' | 'text' | 'time_selection' | 'yes_no_with_options';

type QuestionMetadata = {
  dependsOn?: string;
  enabledWhen?: string | string[];
  showIf?: string;
  alternativeDependsOn?: string;
  alternativeShowIf?: string;
  filterMode?: 'exclude' | 'include';
};

type Question = {
  id: string;
  type?: QuestionType;
  category?: string;
  metadata?: QuestionMetadata;
};

export type QuestionnaireResponseItem = {
  questionId: string;
  answer: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type V2QuestionnaireResponse = {
  format_version: '2.0';
  [key: string]: unknown;
};

const simFlowOnlyQuestionIds = new Set([
  'main_service_time',
  'available_sundays',
  'other_times_available',
]);

function parsePossiblyJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeQuestions(templateOrQuestions: unknown): Question[] {
  const source = isRecord(templateOrQuestions) && 'questions' in templateOrQuestions
    ? templateOrQuestions.questions
    : templateOrQuestions;
  const parsed = parsePossiblyJson(source);
  const items = Array.isArray(parsed) ? parsed : [];

  return items
    .filter(isRecord)
    .map((item, index): Question => {
      const id = typeof item.id === 'string' && item.id
        ? item.id
        : `question_${index + 1}`;
      const metadata = isRecord(item.metadata)
        ? item.metadata as QuestionMetadata
        : undefined;
      const question: Question = {
        id,
        type: typeof item.type === 'string' ? item.type as QuestionType : undefined,
        category: typeof item.category === 'string' ? item.category : undefined,
        metadata,
      };

      if (question.category === 'custom' && !question.metadata?.dependsOn) {
        question.metadata = {
          ...(question.metadata || {}),
          dependsOn: 'monthly_availability',
          showIf: 'Sim',
          alternativeDependsOn: 'alternative_availability',
          alternativeShowIf: 'Sim',
        };
      } else if (
        question.metadata?.dependsOn === 'monthly_availability' &&
        question.metadata?.showIf === 'Sim' &&
        !question.metadata?.alternativeDependsOn &&
        !simFlowOnlyQuestionIds.has(question.id)
      ) {
        question.metadata = {
          ...question.metadata,
          alternativeDependsOn: 'alternative_availability',
          alternativeShowIf: 'Sim',
        };
      }

      return question;
    });
}

function getComparableAnswer(answer: unknown): unknown {
  if (isRecord(answer) && 'answer' in answer) {
    return answer.answer;
  }

  return answer;
}

function isQuestionVisible(question: Question, answersByQuestionId: Map<string, unknown>): boolean {
  const meta = question.metadata;
  if (!meta?.dependsOn) return true;

  const depVal = getComparableAnswer(answersByQuestionId.get(meta.dependsOn));
  const expected = meta.enabledWhen ?? meta.showIf;
  if (expected === undefined) return true;

  const primaryMatch = Array.isArray(expected)
    ? expected.includes(depVal as string)
    : depVal === expected;
  if (primaryMatch) return true;

  if (meta.alternativeDependsOn && meta.alternativeShowIf) {
    const altVal = getComparableAnswer(answersByQuestionId.get(meta.alternativeDependsOn));
    return altVal === meta.alternativeShowIf;
  }

  return false;
}

function sanitizeExcludedOptions(answer: unknown, excludedValue: unknown): unknown {
  if (!excludedValue) return answer;

  if (Array.isArray(answer)) {
    return answer.filter((option) => option !== excludedValue);
  }

  if (isRecord(answer) && Array.isArray(answer.selectedOptions)) {
    return {
      ...answer,
      selectedOptions: answer.selectedOptions.filter((option) => option !== excludedValue),
    };
  }

  return answer;
}

function sanitizeLegacyResponseItems(
  questions: Question[],
  responses: QuestionnaireResponseItem[],
): QuestionnaireResponseItem[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answersByQuestionId = new Map<string, unknown>();

  for (const response of responses) {
    answersByQuestionId.set(response.questionId, response.answer);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const question of questions) {
      if (!answersByQuestionId.has(question.id)) continue;
      if (isQuestionVisible(question, answersByQuestionId)) continue;

      answersByQuestionId.delete(question.id);
      changed = true;
    }
  }

  return responses.flatMap((response) => {
    const question = questionById.get(response.questionId);
    if (question && !answersByQuestionId.has(response.questionId)) return [];

    let answer = response.answer;
    if (question?.metadata?.dependsOn && question.metadata.filterMode === 'exclude') {
      answer = sanitizeExcludedOptions(
        answer,
        getComparableAnswer(answersByQuestionId.get(question.metadata.dependsOn)),
      );
    }

    return [{
      ...response,
      answer,
    }];
  });
}

export function sanitizeQuestionnaireResponses<T extends QuestionnaireResponseItem[] | V2QuestionnaireResponse>(
  templateOrQuestions: unknown,
  responses: T,
): T {
  if (!Array.isArray(responses)) {
    return responses;
  }

  const questions = normalizeQuestions(templateOrQuestions);
  return sanitizeLegacyResponseItems(questions, responses) as T;
}
