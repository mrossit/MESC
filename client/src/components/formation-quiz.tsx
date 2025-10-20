import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Trophy, ArrowRight } from "lucide-react";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type QuizData = {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number; // Percentage needed to pass (e.g., 70)
};

type QuizAnswer = {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
};

interface FormationQuizProps {
  quizData: QuizData;
  onComplete: (score: number, passed: boolean) => void;
  onSkip?: () => void;
}

export function FormationQuiz({ quizData, onComplete, onSkip }: FormationQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  const handleSelectOption = (optionIndex: number) => {
    if (!showFeedback) {
      setSelectedOption(optionIndex);
    }
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedOption,
      isCorrect,
    };

    setAnswers([...answers, answer]);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      finishQuiz();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  };

  const finishQuiz = () => {
    const totalQuestions = quizData.questions.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length +
      (selectedOption === currentQuestion.correctAnswer ? 1 : 0);

    const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = scorePercentage >= quizData.passingScore;

    setIsCompleted(true);
    onComplete(scorePercentage, passed);
  };

  const calculateFinalScore = () => {
    const totalQuestions = quizData.questions.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    return Math.round((correctAnswers / totalQuestions) * 100);
  };

  if (isCompleted) {
    const score = calculateFinalScore();
    const passed = score >= quizData.passingScore;

    return (
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {passed ? (
              <Trophy className="h-16 w-16 text-yellow-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-orange-500" />
            )}
          </div>
          <CardTitle className="text-center text-2xl">
            {passed ? "Parabéns! Você passou!" : "Continue estudando"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div>
              <p className="text-4xl font-bold text-primary">{score}%</p>
              <p className="text-sm text-muted-foreground">
                {answers.filter((a) => a.isCorrect).length} de {quizData.questions.length} corretas
              </p>
            </div>

            {passed ? (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300">
                  Você demonstrou ótima compreensão do conteúdo!
                  A nota mínima era {quizData.passingScore}% e você obteve {score}%.
                </p>
              </div>
            ) : (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-orange-700 dark:text-orange-300">
                  Você obteve {score}%, mas a nota mínima é {quizData.passingScore}%.
                  Recomendamos revisar o conteúdo e tentar novamente.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Resumo das respostas:</h3>
            {quizData.questions.map((q, index) => {
              const answer = answers[index];
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                >
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Questão {index + 1}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {q.question}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              Questão {currentQuestionIndex + 1} de {quizData.questions.length}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Quiz de Avaliação
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === currentQuestion.correctAnswer;
            const showCorrect = showFeedback && isCorrect;
            const showIncorrect = showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => handleSelectOption(index)}
                disabled={showFeedback}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all
                  ${!showFeedback && isSelected ? "border-primary bg-primary/5" : "border-border"}
                  ${showCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/20" : ""}
                  ${showIncorrect ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""}
                  ${!showFeedback && !isSelected ? "hover:border-primary/50 hover:bg-muted/50" : ""}
                  ${showFeedback ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5
                    ${isSelected && !showFeedback ? "border-primary bg-primary text-white" : "border-muted-foreground"}
                    ${showCorrect ? "border-green-500 bg-green-500 text-white" : ""}
                    ${showIncorrect ? "border-red-500 bg-red-500 text-white" : ""}
                  `}>
                    {showCorrect && <CheckCircle2 className="h-4 w-4" />}
                    {showIncorrect && <XCircle className="h-4 w-4" />}
                    {!showFeedback && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {showFeedback && currentQuestion.explanation && (
          <div className={`
            p-4 rounded-lg border
            ${selectedOption === currentQuestion.correctAnswer
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            }
          `}>
            <p className="text-sm font-medium mb-2">
              {selectedOption === currentQuestion.correctAnswer ? "Correto! 🎉" : "Explicação:"}
            </p>
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {onSkip && !showFeedback && (
            <Button variant="outline" onClick={onSkip} className="flex-1">
              Pular Quiz
            </Button>
          )}

          {!showFeedback ? (
            <Button
              onClick={handleConfirmAnswer}
              disabled={selectedOption === null}
              className="flex-1"
            >
              Confirmar resposta
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              {isLastQuestion ? "Finalizar Quiz" : "Próxima questão"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
