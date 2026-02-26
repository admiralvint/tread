# Countersteer — Moto News Aggregator

A self-hosted, AI-summarized motorcycle news site at [countersteer.cc](https://countersteer.cc).

Pulls from 30+ RSS and YouTube sources, categorizes into 10 categories, summarizes each article with Gemini 2.5 Flash, and serves everything through a filterable React frontend.

## Stack

| Container    | Role |
|-------------|------|
| `scraper`   | Fetches RSS + YouTube feeds every 60min, deduplicates, detects garbage content, summarizes via Gemini 2.5 Flash, writes to SQLite |
| `api`       | FastAPI — serves articles, categories, sources, stats |
| `frontend`  | Nginx — serves built React app, proxies `/api` to FastAPI |
| `caddy`     | Reverse proxy — automatic HTTPS via Let's Encrypt, security headers, HSTS |
| `umami`     | Self-hosted privacy-friendly analytics at analytics.countersteer.cc |
| `umami_db`  | Postgres 15 — Umami data store, isolated network |

## Categories

- 🏍️ Adventure Riding
- 🌍 Overland & Expeditions
- 🏔️ Ride Reports
- 🏁 Racing
- ✨ New Models
- 📰 Industry News
- 🧤 Gear Reviews
- 🎨 Custom & Culture
- ⚡ Street & Sport
- 🔩 How-To & Tech

## Security

- Non-root sudo user (`countersteer`) for operations
- SSH key-only authentication, root login disabled
- Fail2Ban for brute-force protection
- UFW firewall — only ports 22, 80, 443 open
- Three isolated Docker networks (`frontend_net`, `backend`, `umami_net`)
- `no-new-privileges` on all containers
- Read-only volume mounts for config files
- Secrets in `.env` with `600` permissions
- HSTS, X-Frame-Options, X-Content-Type-Options headers via Caddy
- Nightly SQLite backups via cron
- Weekly Docker prune via cron
- Unattended security upgrades enabled

## Local Development

```bash
cp .env.example .env
# Add your GOOGLE_API_KEY to .env

docker compose up --build
# Site at http://localhost:80
# API at http://localhost:80/api/articles
```

## Deployment (Hetzner CX22)

```bash
# On your local machine
rsync -avz ./ countersteer@95.217.27.196:/opt/countersteer/

# On Hetzner
cd /opt/countersteer
docker compose build --no-cache
docker compose up -d
```

## API Endpoints

| Endpoint | Description |
|---------|-------------|
| `GET /api/articles` | Paginated articles. Supports `?category=`, `?source=`, `?search=`, `?is_video=`, `?page=`, `?per_page=` |
| `GET /api/articles/{id}` | Single article |
| `GET /api/videos/latest` | Latest video entries |
| `GET /api/categories` | List of active categories |
| `GET /api/sources` | List of active sources |
| `GET /api/stats` | Totals, breakdown by category/source, last updated |
| `GET /health` | Health check |

## Adding Sources

Edit `sources.yaml`:

```yaml
- name: My New Source
  url: https://example.com/feed
  enabled: true
  # For YouTube channels:
  # type: youtube
```

Then restart the scraper:
```bash
docker compose restart scraper
```

## Environment Variables

| Variable | Description |
|---------|-------------|
| `GOOGLE_API_KEY` | Gemini API key for summarization |
| `UMAMI_DB_PASSWORD` | Postgres password for Umami |
| `UMAMI_APP_SECRET` | Umami session secret (random hex string) |

## Backfilling Categories

After updating category definitions in `scraper.py`:

```bash
docker compose exec -T scraper python3 /app/backfill_categories.py
```
