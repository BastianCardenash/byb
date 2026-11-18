const RELATIONSHIP_START = '2026-11-14';
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

const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short' });

export function formatDate(ymd: string): string {
  return dateFormatter.format(parseLocalDate(ymd));
}

export function formatDateParts(ymd: string): { day: string; monthYear: string } {
  const date = parseLocalDate(ymd);
  const month = monthFormatter.format(date).replace(/\.$/, '').toLowerCase();
  return {
    day: String(date.getDate()),
    monthYear: `${month} ${date.getFullYear()}`,
  };
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
      months: 0,
      years: 0,
    };
  }

  const days = diff + 1;
  let months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) {
    months -= 1;
  }
  months = Math.max(0, months);
  const years = Math.floor(months / 12);

  return {
    started: true,
    days,
    months,
    years,
  };
}
