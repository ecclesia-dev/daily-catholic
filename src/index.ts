import 'dotenv/config';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);
import { getLiturgicalDay } from './calendar.js';
import { assembleDailyContent } from './content.js';
import { formatPlainText, formatNostrTeaser, formatNostrArticle, formatEmailHtml } from './format.js';
import { publishToNostr } from './nostr.js';
import { sendEmail } from './email.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stateFile = join(__dirname, '..', 'state.json');

interface State {
  lastPublished?: string;
}

function loadState(): State {
  if (existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, 'utf-8'));
  }
  return {};
}

function saveState(state: State) {
  // MED-3 / S-2: restrict state.json to owner read/write only
  writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
}

async function main() {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview');
  const generateOnly = args.includes('--generate-only');
  const dateOverride = args.find(a => a.match(/^\d{4}-\d{2}-\d{2}$/));

  // MED-4 / S-3: Validate date argument before doing anything else
  if (dateOverride && !dayjs(dateOverride, 'YYYY-MM-DD', true).isValid()) {
    process.stderr.write(`Error: invalid date "${dateOverride}". Expected YYYY-MM-DD format.\n`);
    process.exit(1);
  }

  console.log('☩ Sancti Angeli Dei — Daily Catholic Bot\n');

  // Get liturgical day
  const day = getLiturgicalDay(dateOverride);
  console.log(`Date: ${day.dateFormatted}`);
  console.log(`Saint: ${day.saint.name}`);
  console.log(`Color: ${day.color} | Rank: ${day.feastRank}`);
  console.log(`Season: ${day.season}\n`);

  // Assemble content
  const lightningAddress = process.env.LIGHTNING_ADDRESS || 'you@getalby.com';

  // Advisory: warn operator if Lightning address is unconfigured
  if (!process.env.LIGHTNING_ADDRESS || process.env.LIGHTNING_ADDRESS === 'you@getalby.com') {
    process.stderr.write('⚠ LIGHTNING_ADDRESS is not set or is still the placeholder (you@getalby.com). Set this in your .env before publishing.\n');
  }

  const content = assembleDailyContent(day, lightningAddress);

  if (preview || generateOnly) {
    // Output all formats
    console.log('━'.repeat(60));
    console.log('PLAIN TEXT FORMAT:');
    console.log('━'.repeat(60));
    console.log(formatPlainText(content));
    console.log();

    console.log('━'.repeat(60));
    console.log('NOSTR TEASER (kind 1):');
    console.log('━'.repeat(60));
    console.log(formatNostrTeaser(content));
    console.log();

    if (args.includes('--html')) {
      console.log('━'.repeat(60));
      console.log('EMAIL HTML:');
      console.log('━'.repeat(60));
      console.log(formatEmailHtml(content));
      console.log();
    }

    if (args.includes('--markdown')) {
      console.log('━'.repeat(60));
      console.log('NOSTR ARTICLE (kind 30023):');
      console.log('━'.repeat(60));
      console.log(formatNostrArticle(content));
    }

    return;
  }

  // Check idempotency
  const state = loadState();
  if (state.lastPublished === day.date) {
    console.log(`Already published for ${day.date}. Skipping.`);
    return;
  }

  // Publish
  let nostrOk = false;
  let emailOk = false;

  if (process.env.NOSTR_PRIVATE_KEY) {
    try {
      const result = await publishToNostr(content);
      console.log(`Nostr article: ${result.articleId}`);
      console.log(`Nostr teaser: ${result.teaserId}`);
      nostrOk = true;
    } catch (e) {
      console.error('Nostr publish failed:', e);
    }
  } else {
    console.log('⚠ NOSTR_PRIVATE_KEY not set — skipping Nostr');
  }

  if (process.env.BUTTONDOWN_API_KEY) {
    emailOk = await sendEmail(content);
  } else {
    console.log('⚠ BUTTONDOWN_API_KEY not set — skipping email');
  }

  // Update state
  if (nostrOk || emailOk) {
    state.lastPublished = day.date;
    saveState(state);
    console.log(`\n✓ State updated: lastPublished = ${day.date}`);
  }

  console.log('\n☩ Deo Gratias');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
