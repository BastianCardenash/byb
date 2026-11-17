const RELATIONSHIP_START = '2026-11-20';
const MS_PER_DAY = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function formatDate(ymd: string): string {
  return dateFormatter.format(parseLocalDate(ymd));
}

export function getRelationshipCounter(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = parseLocalDate(RELATIONSHIP_START);
  const diff = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY);

  if (diff < 0) {
    const remaining = Math.abs(diff);
    return {
      started: false,
      days: remaining,
      headline: remaining === 1 ? 'Falta 1 día' : `Faltan ${remaining} días`,
      subtitle: 'para el 20 de noviembre',
    };
  }

  const together = diff + 1;
  return {
    started: true,
    days: together,
    headline: together === 1 ? '1 día juntos' : `${together} días juntos`,
    subtitle: 'desde el 20 de noviembre de 2026',
  };
}
