// eslint-disable-next-line @typescript-eslint/no-var-requires
const dayjs = require('dayjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const timezone = require('dayjs/plugin/timezone');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
dayjs.extend(timezone);

export function convertToTimezone(date: Date, tz: string): Date {
  return dayjs(date).tz(tz).toDate() as Date;
}

export function formatDate(date: Date, format: string, tz: string): string {
  return dayjs(date).tz(tz).format(format) as string;
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): { from: Date; to: Date } {
  const now = dayjs();
  switch (period) {
    case 'today':
      return { from: now.startOf('day').toDate() as Date, to: now.endOf('day').toDate() as Date };
    case 'week':
      return { from: now.startOf('week').toDate() as Date, to: now.endOf('week').toDate() as Date };
    case 'month':
      return { from: now.startOf('month').toDate() as Date, to: now.endOf('month').toDate() as Date };
    case 'year':
      return { from: now.startOf('year').toDate() as Date, to: now.endOf('year').toDate() as Date };
    default:
      return { from: now.startOf('day').toDate() as Date, to: now.endOf('day').toDate() as Date };
  }
}

export function isOverdue(dueDate: Date): boolean {
  return dayjs(dueDate).isBefore(dayjs()) as boolean;
}
