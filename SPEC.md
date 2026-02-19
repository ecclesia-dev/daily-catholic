# Traditional Catholic Daily Bot — SPEC

> *Sancti Angeli Dei* — A daily Traditional Catholic newsletter via Email and Nostr

## Overview

A TypeScript/Node.js bot that publishes daily Traditional Catholic content at **5:00 AM CT** to both a Nostr relay network and an email newsletter. Content follows the **1962 Roman Calendar** (Extraordinary Form / Usus Antiquior).

Every post includes a Lightning address for zaps, building community and driving traffic to our other Catholic tools.

---

## Daily Content Structure

Each post contains five sections:

### 1. Saint of the Day (1962 Calendar)
- Full name and title (e.g., *S. Simeon Episcopus et Martyr*)
- Brief biographical note (2–3 sentences)
- Source: Divinum Officium data + Catholic Encyclopedia (public domain, 1encyclopedias pre-1927)

### 2. Liturgical Color & Feast Rank
- Color: White / Red / Green / Violet / Black / Rose
- Rank per 1962 rubrics: Duplex I classis, Duplex II classis, Duplex majus, Duplex, Semiduplex, Simplex, Feria
- Season context (e.g., "Wednesday of Sexagesima Week")

### 3. Collect Prayer (Latin + English)
- The Collect (*Oratio*) from the day's Mass
- Latin text followed by English translation
- Source: Divinum Officium Missale Romanum 1962 data

### 4. Brief Scripture Reading
- The Epistle or a short lectio from the day's Office
- 3–8 verses, Douay-Rheims translation
- Vulgate reference included

### 5. Reflection / Patristic Quote
- Short quote (1–3 sentences) from a Church Father or Doctor
- Rotating pool: St. Augustine, St. Thomas Aquinas, St. John Chrysostom, St. Jerome, St. Gregory the Great, St. Bernard, St. Alphonsus Liguori, etc.
- Source: Public domain patristic texts (Nicene & Post-Nicene Fathers, Fathers of the Church series pre-1927)

### Footer
- Lightning address: `⚡ yourname@getalby.com` (or custom LN address)
- Link to subscribe (email) / follow (Nostr npub)
- Links to our other Catholic tools

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Cron Job    │────▶│  daily-catholic  │────▶│  Nostr      │
│  5:00 AM CT  │     │  TypeScript Bot   │     │  Relays     │
└─────────────┘     │                    │     └─────────────┘
                    │  1. Fetch calendar │
                    │  2. Build content  │     ┌─────────────┐
                    │  3. Publish        │────▶│  Email      │
                    │                    │     │  (Buttondown)│
                    └──────────────────┘     └─────────────┘
                            │
                    ┌───────┴────────┐
                    │  Content Sources │
                    │  - Liturgical    │
                    │    Calendar API  │
                    │  - Divinum       │
                    │    Officium data │
                    │  - Patristic     │
                    │    quotes DB     │
                    └────────────────┘
```

### Project Structure

```
daily-catholic/
├── src/
│   ├── index.ts              # Entry point — orchestrates daily run
│   ├── calendar.ts           # Liturgical calendar API client
│   ├── content.ts            # Content assembly & formatting
│   ├── nostr.ts              # Nostr event signing & publishing
│   ├── email.ts              # Email newsletter dispatch
│   └── types.ts              # Shared types
├── data/
│   ├── patristic-quotes.json # Curated quote pool (~365+ entries)
│   ├── saints/               # Saint bios keyed by calendar date
│   └── collects/             # Fallback collects if API unavailable
├── templates/
│   ├── email.html            # HTML email template
│   └── email.txt             # Plaintext fallback
├── package.json
├── tsconfig.json
├── .env.example
└── SPEC.md
```

---

## Content Sources

### Liturgical Calendar API
- **Primary:** Our own Liturgical Calendar API (if built) or [Romcal](https://github.com/romcal/romcal) npm package for 1962 calendar computation
- **Romcal** provides: saint of the day, feast rank, liturgical color, season
- Config: `GeneralRoman` calendar with `1962` rubrics mode

### Divinum Officium Data
- **GitHub repo:** [DivinumOfficium/divinum-officium](https://github.com/DivinumOfficium/divinum-officium)
- Raw text files for Mass propers (Collects, Epistles, Gospels) in Latin and English
- File structure: `web/www/missa/Latin/`, `web/www/missa/English/`
- Parse the plain text files to extract Collect and readings
- **License:** Data is public domain liturgical texts; code is GPL

### Patristic Quotes
- Curated JSON file of 400+ quotes from Church Fathers and Doctors
- Sources (all public domain):
  - *Nicene and Post-Nicene Fathers* (Schaff edition, 1886–1900)
  - *Summa Theologica* (St. Thomas Aquinas, Benziger Bros. 1947 translation)
  - *The Imitation of Christ* (Thomas à Kempis)
  - *Introduction to the Devout Life* (St. Francis de Sales)
  - *The Spiritual Combat* (Dom Lorenzo Scupoli)
- Each quote tagged with author, work, and optional liturgical season affinity
- Selection: prefer season-matched quotes, fallback to random

---

## Nostr Publishing

### Protocol Details

**Short-form note (kind 1 — NIP-01):**
- Daily teaser/summary posted as a regular note
- Contains: Saint name, feast rank, color, and a one-liner from the reflection
- Hashtags: `#catholic`, `#traditionalcatholic`, `#latin`, `#saints`
- Includes `naddr` link to the long-form article

**Long-form article (kind 30023 — NIP-23):**
- Full daily content as Markdown
- Tags:
  - `d` tag: `daily-{YYYY-MM-DD}` (for addressability/editability)
  - `title`: "Sancti Angeli Dei — {Date} — {Saint Name}"
  - `summary`: Brief one-line summary
  - `published_at`: Unix timestamp string
  - `t` tags: `catholic`, `traditional`, `saints`, `liturgy`, `latin`
- Content in Markdown with Latin/English sections

### Implementation
- **Library:** `nostr-tools` (npm) — event creation, signing, relay publishing
- **Key management:** Private key stored in `.env` (nsec), derive pubkey at runtime
- **Relays:** Publish to 4–6 relays for redundancy:
  - `wss://relay.damus.io`
  - `wss://nos.lol`
  - `wss://relay.nostr.band`
  - `wss://nostr.wine` (paid, high quality)
  - `wss://relay.catholicnostr.com` (if exists / create our own)
- **Zaps:** Include Lightning address in profile (`lud16` field in kind 0 metadata) and in post footer text

### Event Signing Flow
```typescript
import { finalizeEvent, SimplePool } from 'nostr-tools';

const event = finalizeEvent({
  kind: 30023,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['d', `daily-${dateStr}`],
    ['title', title],
    ['summary', summary],
    ['published_at', String(publishedAt)],
    ['t', 'catholic'],
    ['t', 'traditional'],
    ['t', 'saints'],
  ],
  content: markdownContent,
}, secretKey);

const pool = new SimplePool();
await Promise.allSettled(
  pool.publish(relays, event)
);
```

---

## Email Newsletter

### Provider: Buttondown

**Why Buttondown:**
- Free tier: up to 100 subscribers (sufficient for launch)
- Simple API, Markdown-native
- Paid tiers reasonable ($9/mo for 1,000 subs)
- No tracking pixels by default (respects reader privacy — aligned with Catholic values)
- Custom domain support on paid tier

**Alternative (self-hosted): Listmonk**
- Free, open-source, self-hosted
- PostgreSQL-backed, handles 100k+ subscribers
- Better long-term if we want full control
- More ops overhead — consider migrating after 500+ subs

### Buttondown API Integration
```typescript
// POST https://api.buttondown.com/v1/emails
const response = await fetch('https://api.buttondown.com/v1/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subject: `☩ ${saintName} — ${dateFormatted}`,
    body: markdownContent,        // Buttondown renders MD → HTML
    status: 'published',          // Send immediately
  }),
});
```

### Email Template
- Clean, minimal design — no heavy graphics
- Liturgical color accent bar at top
- Cross (☩) in subject line for brand recognition
- Footer: unsubscribe link, Lightning address, links to Nostr profile and other tools
- Plaintext version always included

---

## Scheduling

### Cron Configuration
```cron
# Fire at 5:00 AM Central Time daily
0 5 * * * cd /path/to/daily-catholic && node dist/index.js >> /var/log/daily-catholic.log 2>&1
```

- **Timezone handling:** Set `TZ=America/Chicago` in environment or use systemd timer with timezone support
- **Retry logic:** If publish fails, retry up to 3 times with 60-second backoff
- **Idempotency:** Check if today's post already exists (by `d` tag on Nostr, by date in local state file) before publishing

### systemd Timer (preferred on Linux)
```ini
# /etc/systemd/system/daily-catholic.timer
[Unit]
Description=Daily Catholic Bot Timer

[Timer]
OnCalendar=*-*-* 05:00:00 America/Chicago
Persistent=true

[Install]
WantedBy=timers.target
```

### OpenClaw Cron (if running within OpenClaw)
```
openclaw cron add --schedule "0 5 * * *" --tz "America/Chicago" --command "node /path/to/daily-catholic/dist/index.js"
```

---

## Environment Variables

```env
# Nostr
NOSTR_PRIVATE_KEY=nsec1...        # Bot's Nostr private key
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band

# Email
BUTTONDOWN_API_KEY=bd-...         # Buttondown API token

# Lightning
LIGHTNING_ADDRESS=you@getalby.com # Included in every post

# Content
DIVINUM_OFFICIUM_DATA_PATH=./data/divinum-officium  # Cloned repo path
CALENDAR_MODE=1962                # Rubrics mode

# Operational
TZ=America/Chicago
LOG_LEVEL=info
STATE_FILE=./state.json           # Tracks last published date
```

---

## Data Flow (Daily Run)

```
1. Read current date (CT timezone)
2. Compute liturgical day via Romcal or our Calendar API
   → saint, rank, color, season
3. Fetch Collect from Divinum Officium data files
   → Latin + English text
4. Fetch Epistle/reading for the day
   → Douay-Rheims text
5. Select patristic quote
   → Season-matched preferred, else random (no repeats within 30 days)
6. Assemble Markdown content
7. Publish to Nostr (kind 30023 + kind 1 teaser)
8. Send via Buttondown API
9. Update state.json with today's date
10. Log success/failure
```

---

## Content Example

> ### ☩ Wednesday, February 18, 2026
> **Feria IV after Sexagesima — Violet — Feria (III class)**
>
> ---
>
> ### Saint of the Day
> **St. Simeon, Bishop and Martyr** — Simeon, a kinsman of Our Lord and second Bishop of Jerusalem after St. James the Less, governed the Church through the destruction of Jerusalem in 70 AD. At the age of 120, under Emperor Trajan, he was crucified for the Faith.
>
> ---
>
> ### Collect
> *Oratio*
>
> **Deus, qui nos in tantis perículis constitútos, pro humána scis fragilitáte non posse subsístere: da nobis salútem mentis et córporis; ut ea, quæ pro peccátis nostris pátimur, te adjuvánte vincámus.**
>
> O God, who seest that we are wholly destitute of power: keep us both outwardly in body and inwardly in soul, that we may be defended from all adversities that may befall the body, and from all evil thoughts that may assault the soul.
>
> ---
>
> ### Scripture Reading
> *2 Corinthians 11:19–33*
>
> "For you gladly suffer the foolish; whereas yourselves are wise..."
>
> ---
>
> ### Reflection
> *"The soul that walks in love neither tires others nor grows tired."* — St. John of the Cross
>
> ---
>
> ⚡ `you@getalby.com` · [Subscribe](https://buttondown.com/sanctiangeli) · [Follow on Nostr](nostr:npub1...)

---

## Dependencies

```json
{
  "dependencies": {
    "nostr-tools": "^2.x",
    "@noble/hashes": "^1.x",
    "romcal": "^4.x",
    "dayjs": "^1.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "tsx": "^4.x"
  }
}
```

---

## Milestones

### Phase 1 — MVP (Week 1–2)
- [ ] Set up TypeScript project scaffold
- [ ] Integrate Romcal for 1962 calendar data
- [ ] Clone and parse Divinum Officium data for Collects
- [ ] Curate initial 60 patristic quotes (2 months of content)
- [ ] Implement Nostr publishing (kind 30023 + kind 1)
- [ ] Set up Buttondown account, implement email sending
- [ ] Cron job on local machine
- [ ] Manual testing for 1 week

### Phase 2 — Polish (Week 3–4)
- [ ] HTML email template with liturgical color theming
- [ ] Expand quote pool to 200+
- [ ] Add saint bios for major feasts
- [ ] Error alerting (notify on failure)
- [ ] Deploy to VPS or run via OpenClaw cron

### Phase 3 — Growth (Month 2+)
- [ ] Custom domain for email (e.g., `daily@sanctiangeli.com`)
- [ ] Landing page / subscribe widget
- [ ] Migrate to Listmonk if >100 subscribers
- [ ] Add Office readings (Matins lessons) as bonus content
- [ ] RSS feed output
- [ ] Cross-post to Catholic Nostr community relay
- [ ] Analytics: open rates, Nostr engagement, zap revenue

---

## Notes

- **Liturgical accuracy is paramount.** All calendar computations must follow the 1962 rubrics exactly. When in doubt, cross-reference with Divinum Officium.
- **Latin first.** The Collect always appears in Latin before English — this is a Traditional Catholic product.
- **No modernist content.** Stick to pre-Vatican II sources, Douay-Rheims translation, and approved traditional devotions.
- **Lightning integration** makes this native to the Bitcoin/Nostr Catholic community — a growing and engaged audience.
- **Keep it brief.** The email should be readable in 2 minutes. Depth comes from linking to fuller resources.
