export interface Saint {
  name: string;
  title?: string;
  bio: string;
  patronage?: string;
  feastRank: string;
}

export interface LiturgicalDay {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. "Wednesday, February 18, 2026"
  season: string;
  seasonWeek: string; // e.g. "Wednesday of Sexagesima Week"
  color: 'White' | 'Red' | 'Green' | 'Violet' | 'Black' | 'Rose';
  feastRank: string;
  saint: Saint;
}

export interface Collect {
  latin: string;
  english: string;
}

export interface ScriptureReading {
  reference: string; // e.g. "2 Corinthians 11:19-33"
  text: string; // Douay-Rheims
  seasons?: string[];
}

export interface PatristicQuote {
  text: string;
  author: string;
  work?: string;
  seasons?: string[]; // optional season affinity
}

export interface DailyContent {
  day: LiturgicalDay;
  collect: Collect;
  reading: ScriptureReading;
  quote: PatristicQuote;
  lightningAddress: string;
}
