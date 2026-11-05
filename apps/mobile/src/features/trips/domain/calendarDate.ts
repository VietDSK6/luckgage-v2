declare const calendarDateBrand: unique symbol;

export type CalendarDate = string & { readonly [calendarDateBrand]: true };

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    return null;
  }

  return value as CalendarDate;
}

export function calendarDateFromLocalDate(date: Date): CalendarDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}` as CalendarDate;
}

export function addCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const timestamp = calendarDateToUtcTimestamp(date) + amount * MILLISECONDS_PER_DAY;
  const nextDate = new Date(timestamp);

  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nextDate.getUTCDate(),
  ).padStart(2, '0')}` as CalendarDate;
}

export function compareCalendarDates(first: CalendarDate, second: CalendarDate): number {
  return first.localeCompare(second);
}

export function differenceInCalendarDays(start: CalendarDate, end: CalendarDate): number {
  return Math.round(
    (calendarDateToUtcTimestamp(end) - calendarDateToUtcTimestamp(start)) / MILLISECONDS_PER_DAY,
  );
}

export function formatCalendarDate(date: CalendarDate, language: 'vi' | 'en'): string {
  const { year, month, day } = calendarDateParts(date);

  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function calendarDateToUtcTimestamp(date: CalendarDate): number {
  const { year, month, day } = calendarDateParts(date);
  return Date.UTC(year, month - 1, day);
}

function calendarDateParts(date: CalendarDate): CalendarDateParts {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}
