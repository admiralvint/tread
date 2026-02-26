import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_ICONS = {
  "Adventure Riding":      "🏍️",
  "Overland & Expeditions": "🌍",
  "Ride Reports":          "🏔️",
  "Racing":                "🏁",
  "New Models":            "✨",
  "Industry News":         "📰",
  "Gear Reviews":          "🧤",
  "Custom & Culture":      "🎨",
  "Street & Sport":        "⚡",
  "How-To & Tech":         "🔩",
  "Videos":                "🎬",
  General:                 "🏍️",
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
  "Adventure Riding": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="ar-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1510"/>
          <stop offset="100%" stopColor="#141e12"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#ar-bg)"/>
      {/* Winding gravel road */}
      <path d="M 60 200 Q 100 160 140 140 Q 180 120 160 90 Q 140 60 200 45" stroke="#E8A020" strokeWidth="2" fill="none" opacity="0.3"/>
      <path d="M 90 200 Q 125 162 162 143 Q 198 123 178 92 Q 158 62 215 47" stroke="#E8A020" strokeWidth="0.8" fill="none" opacity="0.15" strokeDasharray="6 5"/>
      {/* Trees */}
      <polygon points="290,160 300,120 310,160" fill="#1f3020" opacity="0.5"/>
      <polygon points="320,165 332,118 344,165" fill="#243824" opacity="0.4"/>
      <polygon points="350,155 360,125 370,155" fill="#1a2e1b" opacity="0.5"/>
      {/* Rocks */}
      <ellipse cx="240" cy="168" rx="12" ry="7" fill="#1a2010" opacity="0.4"/>
      <ellipse cx="265" cy="172" rx="8" ry="5" fill="#1a2010" opacity="0.3"/>
      {/* Horizon */}
      <line x1="0" y1="115" x2="400" y2="115" stroke="#E8A020" strokeWidth="0.4" opacity="0.1"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">ADVENTURE RIDING</text>
    </svg>
  ),
  "Overland & Expeditions": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="oe-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f1a10"/>
          <stop offset="100%" stopColor="#1a2510"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#oe-bg)"/>
      {/* Wide landscape mountains */}
      <polygon points="0,170 60,90 120,140 180,70 260,130 320,80 400,120 400,170" fill="#1a2e1a" opacity="0.7"/>
      <polygon points="0,170 60,110 100,150 160,95 220,145 300,100 400,130 400,170" fill="#243824" opacity="0.5"/>
      {/* Sun */}
      <circle cx="200" cy="55" r="22" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.3"/>
      <circle cx="200" cy="55" r="12" fill="#E8A020" opacity="0.07"/>
      {/* Horizon line */}
      <line x1="0" y1="118" x2="400" y2="118" stroke="#E8A020" strokeWidth="0.5" opacity="0.15"/>
      {/* Compass */}
      <circle cx="340" cy="38" r="14" stroke="#E8A020" strokeWidth="0.8" fill="none" opacity="0.2"/>
      <line x1="340" y1="26" x2="340" y2="50" stroke="#E8A020" strokeWidth="0.8" opacity="0.3"/>
      <line x1="326" y1="38" x2="354" y2="38" stroke="#E8A020" strokeWidth="0.8" opacity="0.3"/>
      <polygon points="340,26 337,35 343,35" fill="#E8A020" opacity="0.3"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">OVERLAND &amp; EXPEDITIONS</text>
    </svg>
  ),
  "Racing": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="rc-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14100a"/>
          <stop offset="100%" stopColor="#1c1206"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#rc-bg)"/>
      {/* Chequered flag pattern */}
      {[...Array(4)].map((_, row) =>
        [...Array(5)].map((_, col) => (
          <rect key={row * 5 + col}
            x={290 + col * 20} y={20 + row * 20}
            width="20" height="20"
            fill="#E8A020"
            opacity={(row + col) % 2 === 0 ? 0.18 : 0.04}
          />
        ))
      )}
      {/* Speed lines */}
      {[0,1,2,3,4,5,6,7].map((i) => (
        <line key={i} x1="0" y1={40 + i * 18} x2={120 + i * 8} y2={40 + i * 18}
          stroke="#E8A020" strokeWidth="0.7" opacity={0.05 + i * 0.012}/>
      ))}
      {/* Leaning bike silhouette */}
      <ellipse cx="155" cy="148" rx="30" ry="30" stroke="#E8A020" strokeWidth="1.2" fill="none" opacity="0.22" transform="rotate(-15 155 148)"/>
      <ellipse cx="265" cy="148" rx="30" ry="30" stroke="#E8A020" strokeWidth="1.2" fill="none" opacity="0.22" transform="rotate(-15 265 148)"/>
      <path d="M 155 148 L 192 108 L 228 105 L 265 148" stroke="#E8A020" strokeWidth="1.5" fill="none" opacity="0.28" transform="rotate(-8 210 130)"/>
      <path d="M 192 108 L 198 82 L 222 80 L 228 105" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.18" transform="rotate(-8 210 93)"/>
      {/* Track line */}
      <path d="M 0 175 Q 100 165 200 170 Q 300 175 400 160" stroke="#E8A020" strokeWidth="0.6" fill="none" opacity="0.12"/>
      <text x="200" y="196" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">RACING</text>
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
  "New Models": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="nm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#141518"/>
          <stop offset="100%" stopColor="#1a1c22"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#nm-bg)"/>
      {/* Spotlight beams */}
      <polygon points="200,10 130,170 270,170" fill="#E8A020" opacity="0.04"/>
      <polygon points="200,10 150,170 250,170" fill="#E8A020" opacity="0.04"/>
      {/* Platform circle */}
      <ellipse cx="200" cy="158" rx="80" ry="16" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <ellipse cx="200" cy="158" rx="55" ry="10" stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.12"/>
      {/* Star sparkles */}
      <text x="80" y="55" fontFamily="sans-serif" fontSize="16" fill="#E8A020" opacity="0.35">✦</text>
      <text x="295" y="70" fontFamily="sans-serif" fontSize="12" fill="#E8A020" opacity="0.25">✦</text>
      <text x="310" y="40" fontFamily="sans-serif" fontSize="8" fill="#E8A020" opacity="0.2">✦</text>
      <text x="65" y="80" fontFamily="sans-serif" fontSize="8" fill="#E8A020" opacity="0.2">✦</text>
      {/* NEW badge */}
      <rect x="160" y="80" width="80" height="28" rx="2" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.3"/>
      <text x="200" y="99" textAnchor="middle" fontFamily="sans-serif" fontSize="13" letterSpacing="4" fill="#E8A020" opacity="0.4">NEW</text>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">NEW MODELS</text>
    </svg>
  ),
  "Custom & Culture": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="cc-bg" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1310"/>
          <stop offset="100%" stopColor="#120f0c"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#cc-bg)"/>
      {/* Wrench silhouette */}
      <path d="M 155 155 L 175 100 L 190 95 L 200 105 L 185 110 L 175 165 Z" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      {/* Abstract flame / custom shape */}
      <path d="M 220 155 Q 200 120 215 100 Q 205 115 195 105 Q 210 85 225 100 Q 240 85 235 115 Q 250 95 245 120 Q 260 105 250 130 Q 245 155 220 155 Z" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.25"/>
      {/* Grid background */}
      {[...Array(8)].map((_, i) => (
        <line key={`v${i}`} x1={50 + i*40} y1="20" x2={50 + i*40} y2="180" stroke="#E8A020" strokeWidth="0.3" opacity="0.04"/>
      ))}
      {[...Array(5)].map((_, i) => (
        <line key={`h${i}`} x1="50" y1={30 + i*38} x2="350" y2={30 + i*38} stroke="#E8A020" strokeWidth="0.3" opacity="0.04"/>
      ))}
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">CUSTOM &amp; CULTURE</text>
    </svg>
  ),
  "Street & Sport": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="ss-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10121a"/>
          <stop offset="100%" stopColor="#181a22"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#ss-bg)"/>
      {/* Speed lines */}
      {[...Array(8)].map((_, i) => (
        <line key={i} x1="0" y1={50 + i*16} x2={80 + i*10} y2={50 + i*16} stroke="#E8A020" strokeWidth="0.6" opacity={0.06 + i*0.01}/>
      ))}
      {/* Faired bike profile hint */}
      <path d="M 100 140 Q 140 100 200 90 Q 260 80 310 100 L 320 140 Q 280 150 200 155 Q 120 150 100 140 Z" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <path d="M 200 90 Q 220 70 250 68 Q 280 68 295 80" stroke="#E8A020" strokeWidth="0.8" fill="none" opacity="0.15"/>
      {/* Wheel circles */}
      <circle cx="135" cy="148" r="32" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <circle cx="290" cy="148" r="32" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <circle cx="135" cy="148" r="14" stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.1"/>
      <circle cx="290" cy="148" r="14" stroke="#E8A020" strokeWidth="0.5" fill="none" opacity="0.1"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">STREET &amp; SPORT</text>
    </svg>
  ),
  "How-To & Tech": (
    <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" className="placeholder-svg">
      <defs>
        <linearGradient id="ht-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#121518"/>
          <stop offset="100%" stopColor="#181a1c"/>
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill="url(#ht-bg)"/>
      {/* Gear/cog */}
      <circle cx="200" cy="100" r="42" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      <circle cx="200" cy="100" r="22" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.15"/>
      <circle cx="200" cy="100" r="8" stroke="#E8A020" strokeWidth="1" fill="none" opacity="0.2"/>
      {/* Cog teeth */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30) * Math.PI / 180;
        const x1 = 200 + 42 * Math.cos(angle);
        const y1 = 100 + 42 * Math.sin(angle);
        const x2 = 200 + 52 * Math.cos(angle);
        const y2 = 100 + 52 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E8A020" strokeWidth="3" opacity="0.18"/>;
      })}
      {/* Cross lines through center */}
      <line x1="200" y1="58" x2="200" y2="142" stroke="#E8A020" strokeWidth="0.5" opacity="0.1"/>
      <line x1="158" y1="100" x2="242" y2="100" stroke="#E8A020" strokeWidth="0.5" opacity="0.1"/>
      <text x="200" y="195" textAnchor="middle" fontFamily="sans-serif" fontSize="9" letterSpacing="3" fill="#E8A020" opacity="0.5">HOW-TO &amp; TECH</text>
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
  const [expanded, setExpanded] = useState(false);

  function handleCardClick(e) {
    if (e.target.closest(".card-read-link")) return;
    e.preventDefault();
    setExpanded(v => !v);
  }

  return (
    <div
      className={`card ${expanded ? "card--expanded" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={handleCardClick}
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
        <div className="card-footer">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-read-link"
            onClick={e => e.stopPropagation()}
          >
            {article.is_video ? "Watch video ↗" : "Read full story ↗"}
          </a>
          <span className="card-expand-hint">{expanded ? "Show less ↑" : "Show more ↓"}</span>
        </div>
      </div>
    </div>
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

  // Load saved preferences from localStorage
  const savedPrefs = (() => {
    try { return JSON.parse(localStorage.getItem("tread-prefs") || "{}"); }
    catch { return {}; }
  })();

  const [activeCategory, setActiveCategory] = useState(savedPrefs.category || "All");
  const [activeSource, setActiveSource] = useState(savedPrefs.source || "");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("tread-theme") || "dark"; }
    catch { return "dark"; }
  });
  const searchTimer = useRef(null);

  // Persist category and source preferences
  useEffect(() => {
    try {
      localStorage.setItem("tread-prefs", JSON.stringify({
        category: activeCategory,
        source: activeSource,
      }));
    } catch {}
  }, [activeCategory, activeSource]);

  // Apply and persist theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("tread-theme", theme); } catch {}
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
            <a href="/" className="logo-link">
              <span className="logo-icon">⟲</span>
              <div>
                <span className="logo-title">COUNTERSTEER</span>
                <span className="logo-sub">Moto News · Aggregated & Summarized</span>
              </div>
            </a>
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
        <div className="footer-inner">
          <p className="footer-copy">© countersteer.cc · Moto news aggregated &amp; summarized by AI · Not affiliated with any manufacturer</p>
          <a
            href="https://buymeacoffee.com/admiralvint"
            target="_blank"
            rel="noopener noreferrer"
            className="bmc-btn"
          >
            ☕ Buy me a coffee
          </a>
        </div>
      </footer>
    </>
  );
}
