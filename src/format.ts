import type { DailyContent } from './types.js';

const COLOR_EMOJI: Record<string, string> = {
  White: '⚪', Red: '🔴', Green: '🟢', Violet: '🟣', Black: '⚫', Rose: '🌸',
};

const COLOR_HEX: Record<string, string> = {
  White: '#F5F5DC', Red: '#8B0000', Green: '#006400', Violet: '#4B0082', Black: '#1a1a1a', Rose: '#C71585',
};

/**
 * Format as Nostr short-form note (kind 1 teaser)
 */
export function formatNostrTeaser(content: DailyContent): string {
  const { day, quote } = content;
  const emoji = COLOR_EMOJI[day.color] || '⚪';

  let teaser = `☩ ${day.dateFormatted}\n`;
  teaser += `${emoji} ${day.color} — ${day.feastRank}\n\n`;
  teaser += `🕊️ ${day.saint.name}`;
  if (day.saint.title) teaser += ` (${day.saint.title})`;
  teaser += `\n\n`;
  teaser += `"${quote.text}"\n— ${quote.author}\n\n`;
  teaser += `⚡ ${content.lightningAddress}\n`;
  teaser += `#Catholic #TraditionalCatholic #Saints #Latin`;

  return teaser;
}

/**
 * Format as Nostr long-form article (kind 30023 content)
 */
export function formatNostrArticle(content: DailyContent): string {
  const { day, collect, reading, quote } = content;

  let md = `# ☩ ${day.dateFormatted}\n\n`;
  md += `**${day.seasonWeek}** — ${day.color} — ${day.feastRank}\n\n`;
  md += `---\n\n`;

  // Saint of the Day
  md += `## Saint of the Day\n\n`;
  md += `**${day.saint.name}**`;
  if (day.saint.title) md += ` — *${day.saint.title}*`;
  md += `\n\n`;
  md += `${day.saint.bio}\n\n`;
  if (day.saint.patronage) {
    md += `*Patron of: ${day.saint.patronage}*\n\n`;
  }
  md += `---\n\n`;

  // Collect
  md += `## Collect\n\n`;
  md += `*Oratio*\n\n`;
  md += `**${collect.latin}**\n\n`;
  md += `${collect.english}\n\n`;
  md += `---\n\n`;

  // Scripture
  md += `## Scripture Reading\n\n`;
  md += `*${reading.reference}* (Douay-Rheims)\n\n`;
  md += `> ${reading.text}\n\n`;
  md += `---\n\n`;

  // Reflection
  md += `## Reflection\n\n`;
  md += `> *"${quote.text}"*\n\n`;
  md += `— ${quote.author}`;
  if (quote.work) md += `, *${quote.work}*`;
  md += `\n\n`;
  md += `---\n\n`;

  // Footer
  md += `⚡ \`${content.lightningAddress}\`\n`;

  return md;
}

/**
 * Format as plain text (email fallback, terminal output)
 */
export function formatPlainText(content: DailyContent): string {
  const { day, collect, reading, quote } = content;

  let text = `☩ SANCTI ANGELI DEI\n`;
  text += `${day.dateFormatted}\n`;
  text += `${day.seasonWeek} — ${day.color} — ${day.feastRank}\n`;
  text += `${'='.repeat(50)}\n\n`;

  text += `SAINT OF THE DAY\n`;
  text += `${day.saint.name}`;
  if (day.saint.title) text += ` (${day.saint.title})`;
  text += `\n\n`;
  text += `${day.saint.bio}\n`;
  if (day.saint.patronage) text += `Patron of: ${day.saint.patronage}\n`;
  text += `\n`;

  text += `COLLECT (Oratio)\n`;
  text += `${collect.latin}\n\n`;
  text += `${collect.english}\n\n`;

  text += `SCRIPTURE READING — ${reading.reference} (Douay-Rheims)\n`;
  text += `"${reading.text}"\n\n`;

  text += `REFLECTION\n`;
  text += `"${quote.text}"\n`;
  text += `— ${quote.author}`;
  if (quote.work) text += `, ${quote.work}`;
  text += `\n\n`;

  text += `${'='.repeat(50)}\n`;
  text += `⚡ ${content.lightningAddress}\n`;

  return text;
}

/**
 * Format as HTML email
 */
export function formatEmailHtml(content: DailyContent): string {
  const { day, collect, reading, quote } = content;
  const accentColor = COLOR_HEX[day.color] || '#4B0082';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>☩ ${day.saint.name} — ${day.dateFormatted}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Accent bar -->
    <tr><td style="height:6px;background:${accentColor};"></td></tr>

    <!-- Header -->
    <tr><td style="padding:28px 32px 8px;text-align:center;">
      <h1 style="margin:0;font-size:18px;color:#333;letter-spacing:2px;">☩ SANCTI ANGELI DEI</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#888;">${day.dateFormatted}</p>
      <p style="margin:4px 0 0;font-size:13px;color:${accentColor};font-weight:bold;">
        ${day.seasonWeek} — ${day.color} — ${day.feastRank}
      </p>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #ddd;margin:16px 0;"></td></tr>

    <!-- Saint -->
    <tr><td style="padding:0 32px 16px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:${accentColor};text-transform:uppercase;letter-spacing:1px;">Saint of the Day</h2>
      <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#222;">
        ${day.saint.name}${day.saint.title ? ` <span style="font-weight:normal;font-style:italic;color:#666;">— ${day.saint.title}</span>` : ''}
      </p>
      <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">${day.saint.bio}</p>
      ${day.saint.patronage ? `<p style="margin:8px 0 0;font-size:13px;color:#888;font-style:italic;">Patron of: ${day.saint.patronage}</p>` : ''}
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;"></td></tr>

    <!-- Collect -->
    <tr><td style="padding:0 32px 16px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:${accentColor};text-transform:uppercase;letter-spacing:1px;">Collect</h2>
      <p style="margin:0 0 10px;font-size:14px;color:#555;font-style:italic;line-height:1.6;">${collect.latin}</p>
      <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${collect.english}</p>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;"></td></tr>

    <!-- Scripture -->
    <tr><td style="padding:0 32px 16px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:${accentColor};text-transform:uppercase;letter-spacing:1px;">Scripture Reading</h2>
      <p style="margin:0 0 6px;font-size:13px;color:#888;">${reading.reference} (Douay-Rheims)</p>
      <blockquote style="margin:0;padding:12px 16px;border-left:3px solid ${accentColor};background:#f9f7f3;font-size:15px;color:#444;line-height:1.6;font-style:italic;">
        "${reading.text}"
      </blockquote>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #ddd;margin:8px 0;"></td></tr>

    <!-- Reflection -->
    <tr><td style="padding:0 32px 16px;">
      <h2 style="margin:0 0 8px;font-size:16px;color:${accentColor};text-transform:uppercase;letter-spacing:1px;">Reflection</h2>
      <blockquote style="margin:0;padding:12px 16px;border-left:3px solid ${accentColor};background:#f9f7f3;font-size:15px;color:#444;line-height:1.6;">
        <em>"${quote.text}"</em>
      </blockquote>
      <p style="margin:8px 0 0;font-size:14px;color:#666;text-align:right;">
        — ${quote.author}${quote.work ? `, <em>${quote.work}</em>` : ''}
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #ddd;">
      <p style="margin:0 0 8px;font-size:13px;color:#aaa;">⚡ ${content.lightningAddress}</p>
      <p style="margin:0;font-size:12px;color:#bbb;">
        <em>Sancti Angeli Dei</em> — Daily Traditional Catholic Content
      </p>
    </td></tr>

    <!-- Bottom accent bar -->
    <tr><td style="height:4px;background:${accentColor};"></td></tr>
  </table>
</body>
</html>`;
}
