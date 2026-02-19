import type { DailyContent } from './types.js';
import { formatNostrArticle } from './format.js';

export async function sendEmail(content: DailyContent): Promise<boolean> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    console.log('⚠ BUTTONDOWN_API_KEY not set — skipping email');
    return false;
  }

  const subject = `☩ ${content.day.saint.name} — ${content.day.dateFormatted}`;
  const body = formatNostrArticle(content); // Buttondown renders Markdown → HTML

  try {
    const response = await fetch('https://api.buttondown.com/v1/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        body,
        status: 'published',
      }),
    });

    if (response.ok) {
      console.log('✓ Email sent via Buttondown');
      return true;
    } else {
      const err = await response.text();
      console.error(`✗ Email failed (${response.status}): ${err}`);
      return false;
    }
  } catch (e) {
    console.error('✗ Email error:', e);
    return false;
  }
}
