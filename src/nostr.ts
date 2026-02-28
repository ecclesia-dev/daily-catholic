import { finalizeEvent, SimplePool, nip19 } from 'nostr-tools';
import type { DailyContent } from './types.js';
import { formatNostrTeaser, formatNostrArticle } from './format.js';

function getSecretKey(): Uint8Array {
  const nsec = process.env.NOSTR_PRIVATE_KEY;
  if (!nsec) throw new Error('NOSTR_PRIVATE_KEY not set');

  if (nsec.startsWith('nsec1')) {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') throw new Error('Invalid nsec key');
    return decoded.data;
  }

  // Assume hex
  return Uint8Array.from(Buffer.from(nsec, 'hex'));
}

function getRelays(): string[] {
  const relays = process.env.NOSTR_RELAYS;
  const raw = relays
    ? relays.split(',').map(r => r.trim()).filter(Boolean)
    : [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band',
      ];

  // MED-2 / S-1: Only allow secure wss:// relay URLs
  return raw.filter(r => {
    if (r.startsWith('wss://')) return true;
    process.stderr.write(`⚠ Rejected insecure relay URL (must use wss://): ${r}\n`);
    return false;
  });
}

export async function publishToNostr(content: DailyContent): Promise<{ articleId: string; teaserId: string }> {
  const secretKey = getSecretKey();
  const relays = getRelays();
  const pool = new SimplePool();

  const dateStr = content.day.date;
  const title = `Sancti Angeli Dei — ${content.day.dateFormatted} — ${content.day.saint.name}`;
  const summary = `${content.day.saint.name} — ${content.day.color} — ${content.day.feastRank}`;
  const articleContent = formatNostrArticle(content);
  const now = Math.floor(Date.now() / 1000);

  // Long-form article (kind 30023)
  const articleEvent = finalizeEvent({
    kind: 30023,
    created_at: now,
    tags: [
      ['d', `daily-${dateStr}`],
      ['title', title],
      ['summary', summary],
      ['published_at', String(now)],
      ['t', 'catholic'],
      ['t', 'traditional'],
      ['t', 'saints'],
      ['t', 'liturgy'],
      ['t', 'latin'],
    ],
    content: articleContent,
  }, secretKey);

  // Short-form teaser (kind 1)
  const teaserContent = formatNostrTeaser(content);
  const teaserEvent = finalizeEvent({
    kind: 1,
    created_at: now + 1,
    tags: [
      ['t', 'catholic'],
      ['t', 'traditionalcatholic'],
      ['t', 'saints'],
    ],
    content: teaserContent,
  }, secretKey);

  // Publish both — HIGH-2: check that at least one relay ACKed each event
  console.log(`Publishing to ${relays.length} relays...`);

  const articleResults = await Promise.allSettled(pool.publish(relays, articleEvent));
  const articleOkCount = articleResults.filter(r => r.status === 'fulfilled').length;
  console.log(`Article: ${articleOkCount}/${relays.length} relays ACKed (kind 30023, d=daily-${dateStr})`);
  if (articleOkCount > 0) {
    console.log(`✓ Article published`);
  } else {
    console.error('✗ Article: no relay acknowledged');
  }

  const teaserResults = await Promise.allSettled(pool.publish(relays, teaserEvent));
  const teaserOkCount = teaserResults.filter(r => r.status === 'fulfilled').length;
  console.log(`Teaser: ${teaserOkCount}/${relays.length} relays ACKed (kind 1)`);
  if (teaserOkCount > 0) {
    console.log(`✓ Teaser published`);
  } else {
    console.error('✗ Teaser: no relay acknowledged');
  }

  // Give relays time to finalize
  await new Promise(resolve => setTimeout(resolve, 3000));
  pool.close(relays);

  // HIGH-2: if zero relays acknowledged either event, treat as failure
  if (articleOkCount === 0 && teaserOkCount === 0) {
    throw new Error('No relays acknowledged any published events — aborting state update');
  }

  return { articleId: articleEvent.id, teaserId: teaserEvent.id };
}
