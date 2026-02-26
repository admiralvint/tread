#!/usr/bin/env python3
"""
Backfill script: re-categorizes all existing articles in the DB
using the current CATEGORIES definition from scraper.py.

Run inside the scraper container:
  docker compose exec -T scraper python3 /app/backfill_categories.py
"""

import sqlite3
import os
from pathlib import Path
from difflib import SequenceMatcher

DB_PATH = Path(os.getenv("DB_PATH", "/data/articles.db"))

# ── Same CATEGORIES as scraper.py ─────────────────────────────────────────────

CATEGORIES = {
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


def run():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        "SELECT id, source, title, content, category FROM articles WHERE is_video = 0"
    ).fetchall()

    print(f"Re-categorizing {len(rows)} articles...")

    from collections import Counter
    old_cats = Counter()
    new_cats = Counter()
    changed = 0

    for row in rows:
        old_cat = row["category"] or "General"
        new_cat = categorize_article(
            row["title"] or "",
            row["content"] or "",
            row["source"] or "",
        )
        old_cats[old_cat] += 1
        new_cats[new_cat] += 1
        if old_cat != new_cat:
            changed += 1
            conn.execute(
                "UPDATE articles SET category = ? WHERE id = ?",
                (new_cat, row["id"]),
            )

    conn.commit()
    conn.close()

    print(f"\nDone. {changed}/{len(rows)} articles re-categorized.\n")
    print("── Before ──────────────────")
    for cat, count in sorted(old_cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:<28} {count:>4}")
    print("\n── After ───────────────────")
    for cat, count in sorted(new_cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:<28} {count:>4}")


if __name__ == "__main__":
    run()
