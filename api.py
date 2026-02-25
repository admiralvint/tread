#!/usr/bin/env python3
"""
REST API for the motorcycle news aggregator.
Serves article data from SQLite to the React frontend.
"""

import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = Path(os.getenv("DB_PATH", "/data/articles.db"))

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Article(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary: Optional[str]
    category: str
    image_url: Optional[str]
    is_video: bool = False
    created_at: str


class ArticlesResponse(BaseModel):
    articles: list[Article]
    total: int
    page: int
    per_page: int
    total_pages: int


class StatsResponse(BaseModel):
    total_articles: int
    summarized: int
    by_category: dict[str, int]
    by_source: dict[str, int]
    last_updated: Optional[str]


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_article(row) -> Article:
    return Article(**{**dict(row), "is_video": bool(row["is_video"])})


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not DB_PATH.exists():
        raise RuntimeError(f"Database not found at {DB_PATH}. Has the scraper run yet?")
    yield


app = FastAPI(
    title="Moto News API",
    description="Adventure motorcycle news aggregator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/api/articles", response_model=ArticlesResponse)
def list_articles(
    category: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_video: Optional[bool] = Query(None, description="true=videos only, false=articles only"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    conn = get_db()
    try:
        where_clauses = ["summary IS NOT NULL"]
        params: list = []

        if category and category != "All":
            where_clauses.append("category = ?")
            params.append(category)

        if source:
            where_clauses.append("source = ?")
            params.append(source)

        if search:
            where_clauses.append("(title LIKE ? OR summary LIKE ?)")
            like = f"%{search}%"
            params.extend([like, like])

        if is_video is not None:
            where_clauses.append("is_video = ?")
            params.append(int(is_video))

        where_sql = " AND ".join(where_clauses)
        total = conn.execute(
            f"SELECT COUNT(*) FROM articles WHERE {where_sql}", params
        ).fetchone()[0]

        offset = (page - 1) * per_page
        rows = conn.execute(
            f"""SELECT id, source, title, url, summary, category, image_url, is_video, created_at
                FROM articles
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        return ArticlesResponse(
            articles=[row_to_article(r) for r in rows],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=max(1, (total + per_page - 1) // per_page),
        )
    finally:
        conn.close()


@app.get("/api/videos/latest", response_model=list[Article])
def latest_videos(limit: int = Query(8, ge=1, le=20)):
    """Returns the most recent video entries for the homepage strip."""
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT id, source, title, url, summary, category, image_url, is_video, created_at
               FROM articles
               WHERE is_video = 1 AND summary IS NOT NULL
               ORDER BY created_at DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        return [row_to_article(r) for r in rows]
    finally:
        conn.close()


@app.get("/api/articles/{article_id}", response_model=Article)
def get_article(article_id: str):
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT id, source, title, url, summary, category, image_url, is_video, created_at
               FROM articles WHERE id = ?""",
            (article_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Article not found")
        return row_to_article(row)
    finally:
        conn.close()


@app.get("/api/categories")
def list_categories():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT DISTINCT category FROM articles WHERE summary IS NOT NULL AND is_video = 0 ORDER BY category"
        ).fetchall()
        return {"categories": ["All"] + [r["category"] for r in rows] + ["Videos"]}
    finally:
        conn.close()


@app.get("/api/sources")
def list_sources():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT DISTINCT source FROM articles WHERE summary IS NOT NULL ORDER BY source"
        ).fetchall()
        return {"sources": [r["source"] for r in rows]}
    finally:
        conn.close()


@app.get("/api/stats", response_model=StatsResponse)
def get_stats():
    conn = get_db()
    try:
        total = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        summarized = conn.execute(
            "SELECT COUNT(*) FROM articles WHERE summary IS NOT NULL"
        ).fetchone()[0]

        cat_rows = conn.execute(
            "SELECT category, COUNT(*) as n FROM articles WHERE summary IS NOT NULL GROUP BY category"
        ).fetchall()
        by_category = {r["category"]: r["n"] for r in cat_rows}

        src_rows = conn.execute(
            "SELECT source, COUNT(*) as n FROM articles WHERE summary IS NOT NULL GROUP BY source ORDER BY n DESC"
        ).fetchall()
        by_source = {r["source"]: r["n"] for r in src_rows}

        last_row = conn.execute("SELECT MAX(created_at) as last FROM articles").fetchone()

        return StatsResponse(
            total_articles=total,
            summarized=summarized,
            by_category=by_category,
            by_source=by_source,
            last_updated=last_row["last"],
        )
    finally:
        conn.close()


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
