# TREAD — Adventure Moto News Aggregator

A self-hosted, AI-summarized adventure motorcycle news site.
Pulls from 12 RSS sources, categorizes into **Ride Reports**, **Industry News**, and **Gear Reviews**, summarizes each article with Gemini 2.5 Flash, and serves everything through a filterable React frontend.

## Stack

| Container    | Role |
|-------------|------|
| `scraper`   | Fetches RSS feeds, deduplicates, summarizes via Gemini, writes to SQLite |
| `api`       | FastAPI — serves `/api/articles`, `/api/categories`, `/api/stats` |
| `frontend`  | Nginx — serves built React app, proxies `/api` to FastAPI |

---

## Local Development

```bash
cp .env.example .env
# Add your GOOGLE_API_KEY to .env

docker compose up --build
# Site at http://localhost:80
# API at http://localhost:80/api/articles
```

---

## Cloud Deployment

### AWS (EC2 + EBS)

1. **Launch an EC2 instance** — `t3.small` or larger, Ubuntu 24.04 LTS
2. **Attach an EBS volume** for persistent article data (e.g. 10GB at `/mnt/data`)
3. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu
   ```
4. **Clone and configure:**
   ```bash
   git clone <your-repo>
   cd moto-aggregator
   cp .env.example .env && nano .env
   ```
5. **Mount your EBS volume** and update `docker-compose.yml` volumes section:
   ```yaml
   article_data:
     driver: local
     driver_opts:
       type: none
       device: /mnt/data/moto-articles
       o: bind
   ```
6. **Deploy:**
   ```bash
   docker compose up -d --build
   ```
7. **Open port 80** in your EC2 security group.
8. **(Optional) HTTPS:** Put Caddy or Certbot in front of port 80.

---

### GCP (Compute Engine)

1. **Create a VM** — `e2-small`, Ubuntu 24.04, with an attached persistent disk
2. Same Docker install steps as above
3. **Firewall rule:** Allow TCP port 80 (and 443 if using HTTPS)
4. Mount your persistent disk at `/mnt/data` and follow same volume swap as AWS

---

## API Endpoints

| Endpoint | Description |
|---------|-------------|
| `GET /api/articles` | Paginated articles. Supports `?category=`, `?source=`, `?search=`, `?page=`, `?per_page=` |
| `GET /api/articles/{id}` | Single article |
| `GET /api/categories` | List of categories |
| `GET /api/sources` | List of sources |
| `GET /api/stats` | Totals, breakdown by category/source |
| `GET /health` | Health check |

---

## Adding Sources

Edit `sources.yaml`:

```yaml
- name: My New Source
  url: https://example.com/feed
  enabled: true
```

Then restart the scraper container:
```bash
docker compose restart scraper
```

## Adjusting Scrape Interval

In `sources.yaml`:
```yaml
scrape_interval_minutes: 60  # default
```
