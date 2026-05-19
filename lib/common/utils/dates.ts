/** ISO date string YYYY-MM-DD for local calendar day */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfToday(): string {
  return toISODate(new Date());
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export function startOfMonth(): string {
  const d = new Date();
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}
