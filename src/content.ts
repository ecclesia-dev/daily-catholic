import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LiturgicalDay, Collect, ScriptureReading, PatristicQuote, DailyContent } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const quotes: PatristicQuote[] = JSON.parse(readFileSync(join(dataDir, 'patristic-quotes.json'), 'utf-8'));
const collects: Record<string, Collect> = JSON.parse(readFileSync(join(dataDir, 'collects.json'), 'utf-8'));
const scriptures: ScriptureReading[] = JSON.parse(readFileSync(join(dataDir, 'scripture.json'), 'utf-8'));

function getDayOfYear(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

/**
 * MED-1: Check whether a liturgical season string matches a data tag.
 * Data tags use short names ('ordinary', 'lent', 'advent', etc.) while
 * getSeason() returns human-readable strings ('Time after Pentecost', etc.).
 */
function seasonMatchesTag(season: string, tag: string): boolean {
  const seasonLower = season.toLowerCase();
  // Direct substring match (handles 'lent', 'advent', 'christmas', 'easter', etc.)
  if (seasonLower.includes(tag)) return true;
  // 'ordinary' matches 'Time after Pentecost' and 'Ordinary Time' variants
  if (tag === 'ordinary' && (seasonLower.includes('pentecost') || seasonLower.includes('ordinary'))) return true;
  // 'passiontide' is a late-Lent sub-season; match it against 'lent'
  if (tag === 'passiontide' && seasonLower.includes('lent')) return true;
  return false;
}

function selectByDay<T extends { seasons?: string[] }>(items: T[], dateStr: string, season: string): T {
  // Prefer season-matched items
  const seasonMatched = items.filter(i =>
    i.seasons?.some(s => seasonMatchesTag(season, s))
  );

  const pool = seasonMatched.length > 0 ? seasonMatched : items;
  const dayNum = getDayOfYear(dateStr);
  return pool[dayNum % pool.length];
}

export function getCollect(day: LiturgicalDay): Collect {
  const mmdd = day.date.slice(5); // MM-DD
  return collects[mmdd] || collects['_default'];
}

export function getScripture(day: LiturgicalDay): ScriptureReading {
  const selected = selectByDay(scriptures, day.date, day.season);
  return { reference: selected.reference, text: selected.text };
}

export function getQuote(day: LiturgicalDay): PatristicQuote {
  return selectByDay(quotes, day.date, day.season);
}

export function assembleDailyContent(day: LiturgicalDay, lightningAddress: string): DailyContent {
  return {
    day,
    collect: getCollect(day),
    reading: getScripture(day),
    quote: getQuote(day),
    lightningAddress,
  };
}
