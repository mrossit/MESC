import { getLiturgicalTheme, getThemeColorClass, getThemeTextColor } from '@shared/constants/liturgicalThemes';

interface LiturgicalThemeBannerProps {
  month: number;
  year: number;
}

export function LiturgicalThemeBanner({ month, year }: LiturgicalThemeBannerProps) {
  const theme = getLiturgicalTheme(month);

  if (!theme) {
    return null;
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className={`p-6 rounded-lg shadow-md ${getThemeColorClass(month)}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-2xl font-bold ${getThemeTextColor(month)}`}>
          {theme.name}
        </h2>
        <div className={`text-sm font-medium ${getThemeTextColor(month)} opacity-75`}>
          {monthNames[month - 1]} {year}
        </div>
      </div>

      <p className={`text-sm mt-2 ${getThemeTextColor(month)} opacity-80`}>
        {theme.description}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className={`text-xs ${getThemeTextColor(month)} opacity-70`}>
          <span className="font-semibold">Cor litúrgica:</span> {theme.color}
        </div>
        {theme.patron && (
          <div className={`text-xs ${getThemeTextColor(month)} opacity-70`}>
            <span className="font-semibold">Patrono:</span> {theme.patron}
          </div>
        )}
      </div>
    </div>
  );
}
