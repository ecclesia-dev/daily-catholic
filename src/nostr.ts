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
  if (!relays) {
    return [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band',
    ];
  }
  return relays.split(',').map(r => r.trim()).filter(Boolean);
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

  // Publish both
  console.log(`Publishing to ${relays.length} relays...`);

  try {
    await Promise.allSettled(pool.publish(relays, articleEvent));
    console.log(`✓ Article published (kind 30023, d=daily-${dateStr})`);
  } catch (e) {
    console.error('✗ Article publish error:', e);
  }

  try {
    await Promise.allSettled(pool.publish(relays, teaserEvent));
    console.log(`✓ Teaser published (kind 1)`);
  } catch (e) {
    console.error('✗ Teaser publish error:', e);
  }

  // Give relays time to accept
  await new Promise(resolve => setTimeout(resolve, 3000));
  pool.close(relays);

  return { articleId: articleEvent.id, teaserId: teaserEvent.id };
}
