import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface MassOption {
  id: string;
  date: string;
  time: string;
  label: string;
  type: 'sunday' | 'weekday' | 'special';
}

interface QuestionnaireQuestion {
  id: string;
  type: string;
  question: string;
  description?: string;
  options: any[];
  required: boolean;
  section?: string;
}

interface LiturgicalMassCalendarProps {
  questions: QuestionnaireQuestion[];
  responses: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
}

export function LiturgicalMassCalendar({
  questions,
  responses,
  onChange
}: LiturgicalMassCalendarProps) {
  const [totalSelected, setTotalSelected] = useState(0);

  // Calculate total selected masses
  useEffect(() => {
    let count = 0;

    // Count Sunday masses
    const sundayMasses = responses.sunday_masses || {};
    count += Object.values(sundayMasses).filter(v => v === true).length;

    // Count weekday masses
    const weekdayMasses = responses.weekday_masses || [];
    count += Array.isArray(weekdayMasses) ? weekdayMasses.length : 0;

    // Count special masses
    const specialMasses = responses.special_masses || {};
    count += Object.values(specialMasses).filter(v => v === true).length;

    setTotalSelected(count);
  }, [responses]);

  const sundayQuestion = questions.find(q => q.id === 'sunday_masses');
  const weekdayQuestion = questions.find(q => q.id === 'weekday_masses');
  const specialQuestion = questions.find(q => q.id === 'special_masses');
  const substituteQuestion = questions.find(q => q.id === 'can_substitute');

  // Group Sunday masses by date
  const groupedSundayMasses: Record<string, MassOption[]> = {};
  if (sundayQuestion) {
    sundayQuestion.options.forEach((option: any) => {
      if (!groupedSundayMasses[option.date]) {
        groupedSundayMasses[option.date] = [];
      }
      groupedSundayMasses[option.date].push({
        id: option.id,
        date: option.date,
        time: option.time,
        label: option.label,
        type: 'sunday'
      });
    });
  }

  const handleSundayMassToggle = (massId: string, checked: boolean) => {
    const currentSelections = responses.sunday_masses || {};
    onChange('sunday_masses', {
      ...currentSelections,
      [massId]: checked
    });
  };

  const handleWeekdayToggle = (day: string, checked: boolean) => {
    const currentSelections = responses.weekday_masses || [];
    if (checked) {
      onChange('weekday_masses', [...currentSelections, day]);
    } else {
      onChange('weekday_masses', currentSelections.filter((d: string) => d !== day));
    }
  };

  const handleSpecialMassToggle = (massId: string, checked: boolean) => {
    const currentSelections = responses.special_masses || {};
    onChange('special_masses', {
      ...currentSelections,
      [massId]: checked
    });
  };

  const handleSubstituteChange = (value: string) => {
    onChange('can_substitute', value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-blue-900">
              {totalSelected}
            </div>
            <div className="text-sm text-blue-700 mt-1">
              {totalSelected === 1 ? 'missa marcada' : 'missas marcadas'}
            </div>
          </div>
          <div className="text-blue-400">
            {totalSelected >= 3 ? (
              <CheckCircle2 className="w-12 h-12" />
            ) : (
              <AlertCircle className="w-12 h-12" />
            )}
          </div>
        </div>

        {totalSelected < 3 && (
          <Alert className="mt-4 bg-yellow-50 border-yellow-300">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Considere marcar ao menos 3 missas para ajudar na escala mensal
            </AlertDescription>
          </Alert>
        )}

        {totalSelected >= 6 && (
          <Alert className="mt-4 bg-green-50 border-green-300">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Obrigado pela sua disponibilidade! Você está ajudando muito a comunidade.
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Sunday Masses */}
      {sundayQuestion && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">{sundayQuestion.question}</h3>
          {sundayQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {sundayQuestion.description}
            </p>
          )}

          <div className="space-y-4">
            {Object.entries(groupedSundayMasses).map(([date, masses]) => (
              <div key={date} className="border rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-gray-900 mb-3">
                  {formatDate(date)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {masses.map((mass) => {
                    const isChecked = responses.sunday_masses?.[mass.id] === true;
                    return (
                      <div
                        key={mass.id}
                        className={`flex items-center space-x-3 p-3 rounded-md border-2 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-green-50 border-green-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSundayMassToggle(mass.id, !isChecked)}
                      >
                        <Checkbox
                          id={mass.id}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleSundayMassToggle(mass.id, checked === true)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label
                          htmlFor={mass.id}
                          className={`text-sm font-medium cursor-pointer flex-1 ${
                            isChecked ? 'text-green-900' : 'text-gray-700'
                          }`}
                        >
                          {mass.time}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weekday Masses */}
      {weekdayQuestion && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">{weekdayQuestion.question}</h3>
          {weekdayQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {weekdayQuestion.description}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {weekdayQuestion.options.map((option: any) => {
              const isChecked = responses.weekday_masses?.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 p-3 rounded-md border-2 transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-green-50 border-green-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleWeekdayToggle(option.value, !isChecked)}
                >
                  <Checkbox
                    id={option.value}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleWeekdayToggle(option.value, checked === true)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={option.value}
                    className={`text-sm font-medium cursor-pointer flex-1 ${
                      isChecked ? 'text-green-900' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Special Masses */}
      {specialQuestion && specialQuestion.options.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">{specialQuestion.question}</h3>
          {specialQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {specialQuestion.description}
            </p>
          )}

          <div className="space-y-3">
            {specialQuestion.options.map((option: any) => {
              const isChecked = responses.special_masses?.[option.id] === true;
              return (
                <div
                  key={option.id}
                  className={`flex items-center space-x-3 p-4 rounded-md border-2 transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-purple-50 border-purple-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSpecialMassToggle(option.id, !isChecked)}
                >
                  <Checkbox
                    id={option.id}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleSpecialMassToggle(option.id, checked === true)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={option.id}
                    className={`text-sm font-medium cursor-pointer flex-1 ${
                      isChecked ? 'text-purple-900' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Substitution Availability */}
      {substituteQuestion && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">{substituteQuestion.question}</h3>
          {substituteQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {substituteQuestion.description}
            </p>
          )}

          <div className="space-y-3">
            {substituteQuestion.options.map((option: any) => {
              const isSelected = responses.can_substitute === option.value;
              return (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 p-4 rounded-md border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSubstituteChange(option.value)}
                >
                  <input
                    type="radio"
                    id={option.value}
                    name="can_substitute"
                    checked={isSelected}
                    onChange={() => handleSubstituteChange(option.value)}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={option.value}
                    className={`text-sm font-medium cursor-pointer flex-1 ${
                      isSelected ? 'text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
