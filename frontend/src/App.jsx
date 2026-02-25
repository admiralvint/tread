import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_ICONS = {
  "Ride Reports": "🏔️",
  "Industry News": "📰",
  "Gear Reviews": "🧤",
  "Videos": "🎬",
  General: "🏍️",
};

// ─── SVG Category Placeholders ───────────────────────────────────────────────

const PLACEHOLDERS = {
  "Ride Reports": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="rr-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2318"/>
          <stop offset="100%" stopColor="#0f1a0d"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#rr-bg)"/>
      {/* Mountains */}
      <polygon points="0,160 80,60 160,160" fill="#1f3020" opacity="0.8"/>
      <polygon points="60,160 160,40 260,160" fill="#243824" opacity="0.9"/>
      <polygon points="150,160 260,70 370,160" fill="#1a2e1b" opacity="0.7"/>
      <polygon points="250,160 340,90 400,140 400,160" fill="#1f3020" opacity="0.8"/>
      {/* Snow caps */}
      <polygon points="160,40 145,75 175,75" fill="#2a4a2c" opacity="0.6"/>
      <polygon points="80,60 68,88 92,88" fill="#2a4a2c" opacity="0.5"/>
      {/* Road */}
      <path d="M 20 210 Q 200 155 380 210" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.4"/>
      <path d="M 80 210 Q 200 165 320 210" stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.2" strokeDasharray="8 6"/>
      {/* Stars */}
      <circle cx="50" cy="25" r="1" fill="#E8A020" opacity="0.6"/>
      <circle cx="120" cy="15" r="1.5" fill="#E8A020" opacity="0.4"/>
      <circle cx="300" cy="20" r="1" fill="#E8A020" opacity="0.5"/>
      <circle cx="350" cy="35" r="1" fill="#E8A020" opacity="0.3"/>
      <circle cx="200" cy="10" r="1" fill="#fff" opacity="0.3"/>
      {/* Label */}
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5" textTransform="uppercase">RIDE REPORTS</text>
    </svg>
  ),
  "Industry News": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="in-bg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a1510"/>
          <stop offset="100%" stopColor="#221c12"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#in-bg)"/>
      {/* Abstract bike silhouette */}
      <circle cx="130" cy="140" r="38" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.25"/>
      <circle cx="130" cy="140" r="24" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.15"/>
      <circle cx="270" cy="140" r="38" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.25"/>
      <circle cx="270" cy="140" r="24" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.15"/>
      <path d="M 130 140 L 175 100 L 220 100 L 270 140" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.3"/>
      <path d="M 175 100 L 185 70 L 215 70 L 220 100" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <path d="M 130 140 L 160 120 L 190 115" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      {/* Speed lines */}
      <line x1="10" y1="130" x2="80" y2="130" stroke="#E8A020" strokeWidth="0.5" opacity="0.15"/>
      <line x1="10" y1="140" x2="70" y2="140" stroke="#E8A020" strokeWidth="0.5" opacity="0.1"/>
      <line x1="10" y1="150" x2="75" y2="150" stroke="#E8A020" strokeWidth="0.5" opacity="0.12"/>
      <line x1="320" y1="130" x2="390" y2="130" stroke="#E8A020" strokeWidth="0.5" opacity="0.15"/>
      <line x1="330" y1="140" x2="390" y2="140" stroke="#E8A020" strokeWidth="0.5" opacity="0.1"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">INDUSTRY NEWS</text>
    </svg>
  ),
  "Gear Reviews": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="gr-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#141820"/>
          <stop offset="100%" stopColor="#0e1218"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#gr-bg)"/>
      {/* Helmet outline */}
      <ellipse cx="200" cy="115" rx="65" ry="60" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.25"/>
      <path d="M 145 115 Q 145 75 200 65 Q 255 75 255 115" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      {/* Visor */}
      <path d="M 152 118 Q 165 138 200 142 Q 235 138 248 118" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.35"/>
      <path d="M 155 112 Q 168 130 200 134 Q 232 130 245 112" stroke="#fff" strokeWidth="0.5" fill="none" opacity="0.08"/>
      {/* Chin strap hint */}
      <path d="M 148 130 Q 148 165 200 170 Q 252 165 252 130" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.15"/>
      {/* Grid lines background */}
      {[...Array(6)].map((_, i) => (
        <line key={i} x1={50 + i*50} y1="20" x2={50 + i*50} y2="190" stroke="#E8A020" strokeWidth="0.3" opacity="0.05"/>
      ))}
      {[...Array(4)].map((_, i) => (
        <line key={i} x1="50" y1={40 + i*45} x2="350" y2={40 + i*45} stroke="#E8A020" strokeWidth="0.3" opacity="0.05"/>
      ))}
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">GEAR REVIEWS</text>
    </svg>
  ),
  "General": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="gen-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#161614"/>
          <stop offset="100%" stopColor="#111210"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#gen-bg)"/>
      {/* Tread pattern */}
      {[...Array(5)].map((_, i) => (
        <rect key={i} x={80 + i*48} y="75" width="28" height="60" rx="3"
          stroke="#E8A020" strokeWidth="1" fill="none" opacity={0.08 + i*0.02}/>
      ))}
      {[...Array(5)].map((_, i) => (
        <rect key={i} x={104 + i*48} y="85" width="14" height="40" rx="2"
          stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.05"/>
      ))}
      <circle cx="200" cy="105" r="55" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.1"/>
      <circle cx="200" cy="105" r="38" stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.07"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.4">MOTO NEWS</text>
    </svg>
  ),
};

function CategoryPlaceholder({ category }) {
  return (
    <div className="card-image-fallback">
      {PLACEHOLDERS[category] || PLACEHOLDERS["General"]}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
    </div>
  );
}

function ArticleCard({ article, index }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="card-image-wrap">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="card-image"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
            }}
          />
        ) : null}
        <CategoryPlaceholder category={article.category} />
        {article.is_video && (
          <div className="card-play-btn" aria-label="Watch video">▶</div>
        )}
        <span className="card-category">{article.category}</span>
      </div>
      <div className="card-body">
        <p className="card-meta">
          <span className="card-source">{article.source}</span>
          <span className="card-dot">·</span>
          <span className="card-time">{timeAgo(article.created_at)}</span>
        </p>
        <h2 className="card-title">{article.title}</h2>
        <p className="card-summary">{article.summary}</p>
        <span className="card-read">{article.is_video ? "Watch video ↗" : "Read full story ↗"}</span>
      </div>
    </a>
  );
}

function VideoStripCard({ article }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" className="video-strip-card">
      <div className="video-strip-thumb">
        {article.image_url ? (
          <img src={article.image_url} alt={article.title} loading="lazy" />
        ) : (
          <div className="video-strip-fallback">🎬</div>
        )}
        <div className="video-strip-play">▶</div>
      </div>
      <div className="video-strip-body">
        <p className="video-strip-source">{article.source}</p>
        <p className="video-strip-title">{article.title}</p>
        <p className="video-strip-time">{timeAgo(article.created_at)}</p>
      </div>
    </a>
  );
}

function VideoStrip({ videos }) {
  if (!videos || videos.length === 0) return null;
  return (
    <div className="video-strip-section">
      <div className="video-strip-header">
        <span className="video-strip-label">🎬 Latest Videos</span>
        <div className="video-strip-rule" />
      </div>
      <div className="video-strip">
        {videos.map((v) => <VideoStripCard key={v.id} article={v} />)}
      </div>
    </div>
  );
}

function FilterBar({ categories, activeCategory, onCategory, search, onSearch, sources, activeSource, onSource }) {
  return (
    <div className="filters">
      <div className="filters-row">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search"
            type="text"
            placeholder="Search articles…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => onSearch("")}>✕</button>}
        </div>
        <select className="source-select" value={activeSource} onChange={(e) => onSource(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="category-pills">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`pill ${activeCategory === cat ? "pill--active" : ""} ${cat === "Videos" ? "pill--videos" : ""}`}
            onClick={() => onCategory(cat)}
          >
            {CATEGORY_ICONS[cat] && cat !== "All" ? `${CATEGORY_ICONS[cat]} ` : ""}{cat}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="statsbar">
      <span>{stats.total_articles} articles indexed</span>
      <span className="statsbar-dot">·</span>
      <span>{stats.summarized} summarized</span>
      <span className="statsbar-dot">·</span>
      <span>{Object.keys(stats.by_source).length} sources</span>
      {stats.last_updated && (<><span className="statsbar-dot">·</span><span>Updated {timeAgo(stats.last_updated)}</span></>)}
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState(null);
  const [latestVideos, setLatestVideos] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSource, setActiveSource] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("tread-theme") || "dark");
  const searchTimer = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tread-theme", theme);
  }, [theme]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeCategory, activeSource]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, per_page: 18 });
      if (activeCategory === "Videos") {
        params.set("is_video", "true");
      } else {
        params.set("is_video", "false");
        if (activeCategory && activeCategory !== "All") params.set("category", activeCategory);
      }
      if (activeSource) params.set("source", activeSource);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`${API_BASE}/api/articles?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setArticles(data.articles);
      setTotalPages(data.total_pages);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeSource, debouncedSearch, page]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  useEffect(() => {
    if (activeCategory !== "All") return;
    fetch(`${API_BASE}/api/videos/latest?limit=8`).then((r) => r.json()).then(setLatestVideos).catch(() => {});
  }, [activeCategory]);

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`).then((r) => r.json()).then((d) => setCategories(d.categories)).catch(() => {});
    fetch(`${API_BASE}/api/sources`).then((r) => r.json()).then((d) => setSources(d.sources)).catch(() => {});
    fetch(`${API_BASE}/api/stats`).then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <div>
              <span className="logo-title">TREAD</span>
              <span className="logo-sub">Adventure Moto News</span>
            </div>
          </div>
          <div className="header-right">
            <StatsBar stats={stats} />
            <button
              className="theme-toggle"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀" : "◑"}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <FilterBar
          categories={categories} activeCategory={activeCategory} onCategory={setActiveCategory}
          search={search} onSearch={setSearch}
          sources={sources} activeSource={activeSource} onSource={setActiveSource}
        />

        {error && (
          <div className="error">
            <span>⚠ Could not load articles: {error}</span>
            <button onClick={fetchArticles}>Retry</button>
          </div>
        )}

        {loading ? <Spinner /> : articles.length === 0 ? (
          <div className="empty">
            <p>🏜️ No articles found</p>
            <p className="empty-sub">Try adjusting your filters or check back after the next scrape.</p>
          </div>
        ) : (
          <div className="grid">
            {articles.map((a, i) => <ArticleCard key={a.id} article={a} index={i} />)}
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

        {activeCategory === "All" && !loading && <VideoStrip videos={latestVideos} />}
      </main>

      <footer className="footer">
        <p>TREAD · Aggregated adventure moto news · AI-summarized via Gemini</p>
      </footer>
    </>
  );
}
