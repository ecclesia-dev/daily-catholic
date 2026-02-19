# ☩ Sancti Angeli Dei

**Daily Traditional Catholic content bot** — publishes to Nostr and email at 5:00 AM CT.

Each daily post includes:
- **Saint of the Day** (1962 calendar) with bio, feast rank, and patronage
- **Liturgical color & season** awareness
- **Collect** (Latin + English)
- **Scripture reading** (Douay-Rheims)
- **Patristic reflection** (season-aware rotating quotes)
- **Lightning address** for zaps

## Quick Start

```bash
# Install
npm install

# Preview today's content (no publishing)
npm run preview

# Preview a specific date
npx tsx src/index.ts --preview 2025-12-25

# Preview with HTML email output
npx tsx src/index.ts --preview --html

# Preview with Markdown article output
npx tsx src/index.ts --preview --markdown
```

## Setup

1. Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `NOSTR_PRIVATE_KEY` | For Nostr | nsec or hex private key |
| `NOSTR_RELAYS` | No | Comma-separated relay URLs (defaults provided) |
| `BUTTONDOWN_API_KEY` | For email | Buttondown API token |
| `LIGHTNING_ADDRESS` | No | Lightning address for zaps |

2. Run the bot:

```bash
# Development (tsx, no compile needed)
npm run dev

# Production (compile + run)
npm run build
npm start
```

## Scheduling (5 AM CT Daily)

### Cron
```cron
0 5 * * * cd /path/to/daily-catholic && TZ=America/Chicago node dist/index.js >> daily-catholic.log 2>&1
```

### OpenClaw Cron
```bash
openclaw cron add --schedule "0 5 * * *" --tz "America/Chicago" --command "cd /path/to/daily-catholic && node dist/index.js"
```

### systemd Timer
```ini
# /etc/systemd/system/daily-catholic.timer
[Timer]
OnCalendar=*-*-* 05:00:00 America/Chicago
Persistent=true
```

## Output Formats

The bot generates four output formats:

| Format | Use |
|---|---|
| **Plain text** | Terminal preview, email fallback |
| **Nostr teaser** | Kind 1 short note with hashtags |
| **Nostr article** | Kind 30023 long-form Markdown |
| **HTML email** | Styled email with liturgical color accent |

## Data Files

Content is driven by JSON data files in `data/`:

- **`saints.json`** — Saint entries keyed by `MM-DD` (~80 entries, expandable)
- **`patristic-quotes.json`** — 100 rotating quotes with season tags
- **`collects.json`** — Latin/English collects for major feasts + default
- **`scripture.json`** — 48 Douay-Rheims passages with season tags

### Adding Content

**Add a saint:** Add an entry to `data/saints.json` keyed by `MM-DD`:
```json
"04-23": {
  "name": "St. George, Martyr",
  "title": "Martyr",
  "bio": "...",
  "patronage": "England, soldiers",
  "feastRank": "Simplex"
}
```

**Add a quote:** Append to `data/patristic-quotes.json`:
```json
{ "text": "...", "author": "St. Augustine", "work": "Confessions", "seasons": ["ordinary", "lent"] }
```

## Architecture

```
src/
├── index.ts      # Entry point — CLI args, orchestration, idempotency
├── calendar.ts   # Liturgical day computation (season, color, saint lookup)
├── content.ts    # Content assembly (collect, scripture, quote selection)
├── format.ts     # Output formatters (plain text, Nostr, HTML email)
├── nostr.ts      # Nostr event signing & relay publishing
├── email.ts      # Buttondown API integration
└── types.ts      # TypeScript interfaces
```

## Idempotency

The bot writes `state.json` after successful publishing. Running twice on the same day is a no-op. Delete `state.json` to force re-publish.

## License

Content data is from public domain liturgical and patristic sources.
