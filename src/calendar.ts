import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LiturgicalDay, Saint } from './types.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const saints: Record<string, Saint> = JSON.parse(
  readFileSync(join(dataDir, 'saints.json'), 'utf-8')
);

/**
 * Determine the liturgical season based on date.
 * Simplified: uses fixed-date approximations for moveable feasts.
 * For production, integrate romcal for exact computations.
 */
function getLiturgicalSeason(date: dayjs.Dayjs): { season: string; color: LiturgicalDay['color'] } {
  const month = date.month() + 1; // 1-indexed
  const day = date.date();
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Christmas season: Dec 25 - Jan 13 (approx)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 13)) {
    return { season: 'Christmas', color: 'White' };
  }

  // Check for specific feast colors
  const saint = saints[mmdd];
  if (saint) {
    const name = saint.name.toLowerCase();
    if (name.includes('martyr')) return { season: getSeason(date), color: 'Red' };
    if (saint.feastRank === 'Feria') return { season: getSeason(date), color: getSeasonColor(date) };
  }

  return { season: getSeason(date), color: getSeasonColor(date) };
}

/**
 * Compute the first Sunday of Advent for a given year.
 * Advent Sunday = the Sunday on or before Dec 3 (always falls Nov 27 – Dec 3).
 */
function getAdventSunday(year: number): dayjs.Dayjs {
  // Dec 3, no timezone needed for day-of-week calculation
  const dec3Dow = new Date(year, 11, 3).getDay(); // 0 = Sunday
  // Subtract the weekday offset: if Dec 3 is Wednesday (3), go back 3 days → Nov 30
  return dayjs(new Date(year, 11, 3 - dec3Dow));
}

function getSeason(date: dayjs.Dayjs): string {
  // Very simplified — in production use romcal
  const month = date.month() + 1; // 1-indexed
  const day = date.date();
  const year = date.year();

  // Christmas season: Dec 25 onwards and Jan 1–13
  if ((month === 12 && day >= 25) || (month === 1 && day <= 13)) {
    return 'Christmas';
  }

  // Advent: from Advent Sunday (Nov 27–Dec 3) through Dec 24 (inclusive)
  // Advent Sunday is the Sunday on or before Dec 3 of the current year.
  if (month === 11 || month === 12) {
    const adventStart = getAdventSunday(year);
    const dec24 = dayjs(new Date(year, 11, 24));
    if (!date.isBefore(adventStart) && !date.isAfter(dec24)) {
      return 'Advent';
    }
  }

  if (month >= 2 && month <= 3) return 'Septuagesima / Pre-Lent';
  if (month >= 3 && month <= 4) return 'Lent';
  if (month >= 4 && month <= 5) return 'Easter';
  return 'Time after Pentecost';
}

function getSeasonColor(date: dayjs.Dayjs): LiturgicalDay['color'] {
  const season = getSeason(date);
  if (season === 'Lent') return 'Violet';
  if (season === 'Advent') return 'Violet';
  if (season === 'Christmas' || season === 'Easter') return 'White';
  return 'Green';
}

function getDayOfWeek(date: dayjs.Dayjs): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.day()];
}

function getSeasonWeek(date: dayjs.Dayjs, season: string): string {
  const dow = getDayOfWeek(date);
  return `${dow} in ${season}`;
}

export function getLiturgicalDay(dateOverride?: string): LiturgicalDay {
  const now = dateOverride
    ? dayjs.tz(dateOverride, 'America/Chicago')
    : dayjs().tz('America/Chicago');

  const mmdd = now.format('MM-DD');
  const { season, color } = getLiturgicalSeason(now);

  const saint: Saint = saints[mmdd] || {
    name: 'Feria',
    bio: 'A ferial day in the liturgical calendar. The faithful are encouraged to offer their prayers and works for the glory of God and the salvation of souls.',
    feastRank: 'Feria',
  };

  return {
    date: now.format('YYYY-MM-DD'),
    dateFormatted: now.format('dddd, MMMM D, YYYY'),
    season,
    seasonWeek: getSeasonWeek(now, season),
    color,
    feastRank: saint.feastRank,
    saint,
  };
}
