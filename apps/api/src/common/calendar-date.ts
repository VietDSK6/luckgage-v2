const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarDateToDate(value: string): Date {
  if (!isCalendarDate(value)) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateToCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function daysBetween(left: string, right: string): number {
  return Math.round(
    (calendarDateToDate(right).getTime() - calendarDateToDate(left).getTime()) / 86_400_000,
  );
}

export function currentUtcCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}
