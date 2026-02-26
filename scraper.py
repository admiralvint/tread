#!/usr/bin/env python3
"""
Adventure motorcycle news aggregator.
Covers: ride reports, industry news, gear reviews.
Summarization via Google Gemini 2.5 Flash.
"""

import asyncio
import hashlib
import logging
import sqlite3
import time
import os
from collections import deque
from contextlib import contextmanager
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import aiohttp
import feedparser
import requests
import yaml
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
CONFIG_PATH = Path(os.getenv("CONFIG_PATH", BASE_DIR / "config" / "sources.yaml"))
DB_PATH = Path(os.getenv("DB_PATH", BASE_DIR / "data" / "articles.db"))

# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

CATEGORIES: dict[str, dict] = {
    "Adventure Riding": {
        "keywords": [
            "adventure bike", "adventure riding", "adv riding", "dual sport",
            "off-road", "gravel road", "dirt road", "trail riding", "enduro",
            "adventure motorcycle", "tenere", "ktm adventure",
            "adventure route", "forest road", "fire road",
            "backcountry", "mountain pass", "gravel riding",
        ],
        "sources": ["ADVRider", "Adventure Rider Radio", "ADV Pulse",
                    "Adventure Bike Rider", "Motorcycle Adventure Dirtbike TV"],
    },
    "Overland & Expeditions": {
        "keywords": [
            "overland", "overlanding", "expedition", "long distance",
            "round the world", "rtw", "trans", "crossing continents",
            "silk road", "pan-american", "multi-day tour", "border crossing",
            "wild camping", "off the beaten path", "remote destination",
            "moto camping", "motorcycle tour", "bikepacking",
        ],
        "sources": ["Itchy Boots", "ARiemann1 (Motology Films)"],
    },
    "Ride Reports": {
        "keywords": [
            "ride report", "trip report", "day ride", "road trip", "route report",
            "canyon run", "weekend ride", "morning ride", "spirited ride", "group ride",
            "sunday ride", "moto meetup", "twisties", "favourite road",
        ],
        "sources": [],
    },
    "New Models": {
        "keywords": [
            "new model", "new bike", "officially revealed", "unveiled", "world debut",
            "spy shot", "leaked", "concept bike", "prototype", "msrp", "pricing announced",
            "order books open", "specs confirmed", "first ride review", "launch event",
        ],
        "sources": [],
    },
    "Racing": {
        "keywords": [
            "motogp", "moto2", "moto3", "wsbk", "world superbike", "supersport",
            "isle of man tt", "tt race", "dakar", "rally raid", "erzbergrodeo",
            "supercross", "motocross", "enduro gp", "racing championship",
            "grand prix", "race result", "qualifying", "podium", "pole position",
            "lap record", "race win", "championship standings", "marc marquez",
            "pecco bagnaia", "jorge martin", "toprak", "jonathan rea",
            "race team", "race bike", "factory team", "wildcard",
        ],
        "sources": [],
    },
    "Industry News": {
        "keywords": [
            "recall", "safety notice", "nhtsa", "sales figures", "market share",
            "factory", "production halt", "bankruptcy", "acquisition",
            "electric motorcycle", "ev range", "battery", "emissions regulation",
            "import tariff", "import duty", "industry report",
        ],
        "sources": [],
    },
    "Gear Reviews": {
        "keywords": [
            "helmet", "jacket", "gloves", "boots", "pants", "riding suit", "luggage",
            "top case", "panniers", "tank bag", "gps", "intercom",
            "tires", "tyres", "armour", "armor", "gear review", "gear tested",
            "gore-tex", "waterproof", "ce certified", "airbag vest",
            "heated gear", "rain gear",
        ],
        "sources": ["WebBikeWorld", "Wired2Ride"],
    },
    "Custom & Culture": {
        "keywords": [
            "custom build", "custom motorcycle", "cafe racer", "scrambler build",
            "bobber", "chopper", "tracker", "brat style", "restomod", "restoration",
            "one-off", "bespoke", "handbuilt", "fabricated", "show bike",
            "motorcycle art", "vintage motorcycle", "classic motorcycle",
        ],
        "sources": ["Bike EXIF", "Return of the Cafe Racers", "Pipeburn"],
    },
    "Street & Sport": {
        "keywords": [
            "naked bike", "streetfighter", "sport bike", "supersport", "superbike",
            "sport touring", "faired motorcycle", "commuter", "urban riding",
            "city riding", "sport riding", "canyon carving", "lap time", "lean angle",
        ],
        "sources": [],
    },
    "How-To & Tech": {
        "keywords": [
            "how to", "diy", "tutorial", "step by step", "tips and tricks",
            "maintenance", "oil change", "valve clearance", "chain lube",
            "suspension setup", "sag setting", "modification", "upgrade guide",
            "troubleshoot", "repair guide", "tyre change", "tire change",
            "brake bleed", "coolant flush",
        ],
        "sources": [],
    },
}

HARM_CATEGORIES = [
    "HATE_SPEECH",
    "HARASSMENT",
    "DANGEROUS_CONTENT",
    "SEXUALLY_EXPLICIT",
]

DAILY_REQUEST_LIMIT = 1000
RATE_LIMIT_RPM = 12

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def init_database() -> None:
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                content TEXT,
                summary TEXT,
                category TEXT,
                image_url TEXT,
                is_video INTEGER DEFAULT 0,
                duplicate_of TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                summarized_at TIMESTAMP,
                FOREIGN KEY (duplicate_of) REFERENCES articles(id)
            )
        """)
        conn.commit()
    logger.info("Database initialized.")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Content helpers
# ---------------------------------------------------------------------------


def get_article_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def article_exists(conn: sqlite3.Connection, article_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM articles WHERE id = ?", (article_id,)
    ).fetchone()
    return row is not None


def calculate_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1[:500].lower(), text2[:500].lower()).ratio()


def find_similar_article(
    conn: sqlite3.Connection,
    title: str,
    threshold: float = 0.85,
) -> str | None:
    rows = conn.execute(
        "SELECT id, title FROM articles WHERE created_at > datetime('now', '-3 days')"
    ).fetchall()
    for row in rows:
        if calculate_similarity(title, row["title"]) > threshold:
            return row["id"]
    return None


def categorize_article(title: str, content: str, source: str) -> str:
    for category, cfg in CATEGORIES.items():
        if source in cfg["sources"]:
            return category
    text = f"{title} {content}".lower()
    best_match, best_score = "General", 0
    for category, cfg in CATEGORIES.items():
        score = sum(1 for kw in cfg["keywords"] if kw in text)
        if score > best_score:
            best_score, best_match = score, category
    return best_match if best_score >= 2 else "General"


def extract_image_url(entry: Any, source_type: str = "rss") -> str | None:
    """Try to pull a thumbnail/image from an RSS or YouTube Atom entry."""
    if source_type == "youtube":
        video_id = getattr(entry, "yt_videoid", None)
        if video_id:
            return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")
    if hasattr(entry, "media_content") and entry.media_content:
        for media in entry.media_content:
            if media.get("medium") == "image" or media.get("url", "").endswith(
                (".jpg", ".jpeg", ".png", ".webp")
            ):
                return media.get("url")
    if hasattr(entry, "enclosures") and entry.enclosures:
        for enc in entry.enclosures:
            if "image" in enc.get("type", ""):
                return enc.get("href")
    return None


def extract_youtube_content(entry: Any) -> str:
    """Pull usable text from a YouTube Atom entry."""
    summary = entry.get("summary", "")
    if summary:
        soup = BeautifulSoup(summary, "html.parser")
        return soup.get_text(" ", strip=True)[:5000]
    return ""


def fetch_article_content(url: str) -> tuple[str | None, str | None]:
    """
    Fetch full article text and OG image from a URL.
    Returns (content, og_image_url).
    """
    try:
        res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # Extract OG image
        og_image = None
        og_tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
        if og_tag and og_tag.get("content"):
            og_image = og_tag["content"].strip()

        # Extract text content
        content = " ".join(p.get_text().strip() for p in soup.find_all("p")[:20])
        return content or None, og_image

    except Exception as exc:
        logger.warning("Could not fetch article content from %s: %s", url, exc)
        return None, None


def save_article(
    conn: sqlite3.Connection,
    source: str,
    title: str,
    url: str,
    content: str,
    image_url: str | None = None,
    is_video: bool = False,
) -> str | None:
    article_id = get_article_id(url)
    if article_exists(conn, article_id):
        return None
    if find_similar_article(conn, title):
        return None
    category = categorize_article(title, content, source)
    conn.execute(
        """INSERT INTO articles (id, source, title, url, content, category, image_url, is_video)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (article_id, source, title, url, content, category, image_url, int(is_video)),
    )
    conn.commit()
    return article_id


def update_summary(conn: sqlite3.Connection, article_id: str, summary: str) -> None:
    conn.execute(
        "UPDATE articles SET summary = ?, summarized_at = ? WHERE id = ?",
        (summary, datetime.now().isoformat(), article_id),
    )
    conn.commit()


def cleanup_old_articles(conn: sqlite3.Connection, retention_days: int) -> None:
    cutoff = (datetime.now() - timedelta(days=retention_days)).isoformat()
    conn.execute("DELETE FROM articles WHERE created_at < ?", (cutoff,))
    conn.commit()


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


class RateLimiter:
    """Sliding-window rate limiter with a DB-backed daily cap."""

    def __init__(self, rpm: int = RATE_LIMIT_RPM, daily_cap: int = DAILY_REQUEST_LIMIT) -> None:
        self.rpm = rpm
        self.daily_cap = daily_cap
        self._window: deque[datetime] = deque()

    def _daily_count(self, conn: sqlite3.Connection) -> int:
        today = datetime.now().strftime("%Y-%m-%d")
        row = conn.execute(
            "SELECT COUNT(*) FROM articles WHERE date(summarized_at) = ?", (today,)
        ).fetchone()
        return row[0] if row else 0

    def _prune_window(self) -> None:
        now = datetime.now()
        while self._window and now - self._window[0] >= timedelta(seconds=60):
            self._window.popleft()

    def acquire(self, conn: sqlite3.Connection) -> bool:
        if self._daily_count(conn) >= self.daily_cap:
            logger.warning("Daily summarization limit reached (%d). Skipping.", self.daily_cap)
            return False
        while True:
            self._prune_window()
            if len(self._window) < self.rpm:
                self._window.append(datetime.now())
                return True
            sleep_secs = 60 - (datetime.now() - self._window[0]).total_seconds() + 1
            logger.info("RPM limit reached. Sleeping %.1fs…", sleep_secs)
            time.sleep(max(sleep_secs, 1))


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------


async def fetch_rss_feed_async(
    session: aiohttp.ClientSession,
    source: dict,
    semaphore: asyncio.Semaphore,
) -> list[dict]:
    articles: list[dict] = []
    source_type = source.get("type", "rss")
    async with semaphore:
        try:
            async with session.get(
                source["url"], timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                if response.status == 200:
                    feed = feedparser.parse(await response.text())
                    for entry in feed.entries[:10]:
                        if source_type == "youtube":
                            content = extract_youtube_content(entry)
                        else:
                            content = entry.get("summary", "")[:5000]
                        articles.append({
                            "source": source["name"],
                            "title": entry.get("title", "No title"),
                            "url": entry.get("link", ""),
                            "content": content,
                            "image_url": extract_image_url(entry, source_type),
                            "is_video": source_type == "youtube",
                        })
        except Exception as exc:
            logger.error("Error fetching %s: %s", source["name"], exc)
    return articles


async def fetch_all_sources_async(sources: list[dict]) -> list[dict]:
    semaphore = asyncio.Semaphore(5)
    async with aiohttp.ClientSession(headers={"User-Agent": "Mozilla/5.0"}) as session:
        tasks = [
            fetch_rss_feed_async(session, s, semaphore)
            for s in sources
            if s.get("enabled", True)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    all_articles: list[dict] = []
    for res in results:
        if isinstance(res, list):
            all_articles.extend(res)
    return all_articles


# ---------------------------------------------------------------------------
# Summarization
# ---------------------------------------------------------------------------

SUMMARY_PROMPT = (
    "You are an editor for an adventure motorcycle news site. "
    "Summarize the following article in 3-4 punchy, engaging sentences "
    "aimed at adventure riders. Focus on what's new, useful, or exciting. "
    "Do not start with 'This article'.\n\n"
    "Title: {title}\n\nContent: {content}"
)


def summarize_with_gemini(
    article: dict,
    limiter: RateLimiter,
    conn: sqlite3.Connection,
) -> str | None:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip().strip("'\"")
    if not api_key:
        logger.error("GOOGLE_API_KEY is not set.")
        return None

    if not limiter.acquire(conn):
        return None

    content = article.get("content", "").encode("utf-8", "ignore").decode("utf-8")
    prompt = SUMMARY_PROMPT.format(title=article["title"], content=content[:8000])

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-2.5-flash:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "safetySettings": [
            {"category": f"HARM_CATEGORY_{cat}", "threshold": "BLOCK_NONE"}
            for cat in HARM_CATEGORIES
        ],
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            return (
                response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            )
        logger.error("Gemini API error %d: %s", response.status_code, response.text)
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)

    return None


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


def load_config() -> dict[str, Any]:
    try:
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f)
    except (yaml.YAMLError, FileNotFoundError) as exc:
        logger.error("Failed to load config at %s: %s", CONFIG_PATH, exc)
        raise


# ---------------------------------------------------------------------------
# Scrape cycle
# ---------------------------------------------------------------------------


def run_scrape_cycle(config: dict) -> None:
    start = time.time()
    logger.info("Starting motorcycle scrape cycle…")

    all_articles = asyncio.run(fetch_all_sources_async(config["sources"]))
    limiter = RateLimiter()
    new_count = 0

    with get_db() as conn:
        for article in all_articles:
            needs_full_fetch = not article["content"] or len(article["content"]) < 400
            has_image = bool(article.get("image_url"))

            if needs_full_fetch or not has_image:
                full_content, og_image = fetch_article_content(article["url"])
                if full_content and needs_full_fetch:
                    article["content"] = full_content
                if og_image and not has_image:
                    article["image_url"] = og_image

            article_id = save_article(
                conn,
                article["source"],
                article["title"],
                article["url"],
                article["content"],
                article.get("image_url"),
                article.get("is_video", False),
            )

            if article_id:
                new_count += 1
                logger.info("Summarizing: %.50s…", article["title"])
                summary = summarize_with_gemini(article, limiter, conn)
                if summary:
                    update_summary(conn, article_id, summary)
                time.sleep(4)

        cleanup_old_articles(conn, config.get("retention_days", 14))

    logger.info(
        "Cycle complete. %d new articles processed in %.1fs.",
        new_count,
        time.time() - start,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    import schedule

    logger.info("Moto Aggregator starting…")
    config = load_config()
    init_database()
    run_scrape_cycle(config)

    interval = config.get("scrape_interval_minutes", 60)
    schedule.every(interval).minutes.do(run_scrape_cycle, config)

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
