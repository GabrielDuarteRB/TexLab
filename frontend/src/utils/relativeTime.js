const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function formatUnit(value, unit, pluralUnit) {
  if (value === 1) return `há ${value} ${unit}`;
  return `há ${value} ${pluralUnit || `${unit}s`}`;
}

export function relativeTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return formatUnit(Math.floor(diff / MINUTE), 'minuto');
  if (diff < DAY) return formatUnit(Math.floor(diff / HOUR), 'hora');
  if (diff < WEEK) return formatUnit(Math.floor(diff / DAY), 'dia');
  if (diff < MONTH) return formatUnit(Math.floor(diff / WEEK), 'semana');
  if (diff < YEAR) return formatUnit(Math.floor(diff / MONTH), 'mês');
  return formatUnit(Math.floor(diff / YEAR), 'ano');
}
