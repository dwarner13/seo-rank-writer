import { useState } from "react";
import "./SeoReport.css";

interface SeoScore {
  score: number;
  grade: string;
  summary: string;
}

interface KeywordOpp {
  keyword: string;
  intent: string;
  suggestedTitle: string;
  whyItMatters: string;
  estimatedDifficulty: string;
  estimatedVolume: string;
}

interface SuggestedPage {
  title: string;
  slug: string;
  pageType: string;
  targetKeyword: string;
  priority: string;
}

interface LinkPlan {
  fromPage: string;
  toPage: string;
  anchorText: string;
  reason: string;
}

interface BacklinkHealth {
  total: number;
  good: number;
  warning: number;
  bad: number;
  uniqueDomains: number;
  isDemo: boolean;
}

interface AiRec {
  category: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
}

interface ReportData {
  domain: string;
  businessName: string;
  mainKeyword: string;
  location: string;
  generatedAt: string;
  seoScore: SeoScore;
  keywordOpportunities: KeywordOpp[];
  suggestedPages: SuggestedPage[];
  internalLinkingPlan: LinkPlan[];
  backlinkHealth: BacklinkHealth;
  aiRecommendations: AiRec[];
}

export default function SeoReport() {
  const [url, setUrl] = useState("");
  const [biz, setBiz] = useState("");
  const [kw, setKw] = useState("");
  const [loc, setLoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  async function handleGenerate() {
    if (!url.trim() && !kw.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url.trim(), businessName: biz.trim(), mainKeyword: kw.trim(), location: loc.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      setReport(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const scoreColor = (s: number) => s >= 80 ? "#16a34a" : s >= 50 ? "#ca8a04" : "#dc2626";
  const prioColor = (p: string) => p === "high" ? "#dc2626" : p === "medium" ? "#ca8a04" : "#64748b";
  const prioBg = (p: string) => p === "high" ? "#fef2f2" : p === "medium" ? "#fffbeb" : "#f8fafc";
  const intentColor = (i: string) => i === "transactional" ? "#7c3aed" : i === "commercial" ? "#2563eb" : i === "informational" ? "#059669" : "#64748b";

  return (
    <div className="rp">
      <nav className="rp-nav">
        <div className="rp-wrap">
          <a href="/" className="rp-nav__logo"><img src="/logo.png" alt="SEO Rank Writer Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" as const }} /> SEO Rank Writer</a>
          <div className="rp-nav__links">
            <a href="/app">Open App</a>
            <a href="/backlinks">Backlinks</a>
            <a href="/">Home</a>
          </div>
        </div>
      </nav>

      {/* Input Section */}
      {!report && (
        <section className="rp-hero">
          <div className="rp-wrap">
            <div className="rp-hero__badge">SEO Audit Tool</div>
            <h1 className="rp-hero__h1">SEO Report Builder</h1>
            <p className="rp-hero__sub">
              Generate a professional SEO report with keyword opportunities, backlink health, internal linking plan, and AI recommendations.
            </p>
            <div className="rp-form">
              <div className="rp-form-row">
                <div className="rp-field">
                  <label>Website URL</label>
                  <input type="text" placeholder="example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <div className="rp-field">
                  <label>Business Name</label>
                  <input type="text" placeholder="My Business" value={biz} onChange={(e) => setBiz(e.target.value)} />
                </div>
              </div>
              <div className="rp-form-row">
                <div className="rp-field">
                  <label>Main Keyword</label>
                  <input type="text" placeholder="cash for cars" value={kw} onChange={(e) => setKw(e.target.value)} />
                </div>
                <div className="rp-field">
                  <label>Location</label>
                  <input type="text" placeholder="Vancouver BC" value={loc} onChange={(e) => setLoc(e.target.value)} />
                </div>
              </div>
              <button className="rp-gen-btn" onClick={handleGenerate} disabled={(!url.trim() && !kw.trim()) || loading}>
                {loading ? "Generating Report..." : "Generate SEO Report"}
              </button>
            </div>
            {error && <div className="rp-error">{error}</div>}
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="rp-loading">
          <div className="rp-spinner" />
          <p>Analyzing your website and generating report...</p>
          <p className="rp-loading-sub">This takes 15-30 seconds</p>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <div className="rp-report">
          <div className="rp-wrap">
            {/* Report Header */}
            <div className="rp-report-header">
              <div className="rp-report-header__left">
                <h1 className="rp-report-title">SEO Report</h1>
                <p className="rp-report-domain">{report.domain}</p>
                <p className="rp-report-date">Generated {new Date(report.generatedAt).toLocaleDateString()}</p>
              </div>
              <div className="rp-report-header__right">
                <button className="rp-action-btn" onClick={handlePrint}>Export / Print</button>
                <button className="rp-action-btn rp-action-btn--outline" onClick={() => setReport(null)}>New Report</button>
              </div>
            </div>

            {/* 1. SEO Score */}
            <div className="rp-card rp-score-card">
              <div className="rp-score-ring" style={{ borderColor: scoreColor(report.seoScore.score) }}>
                <span className="rp-score-num" style={{ color: scoreColor(report.seoScore.score) }}>{report.seoScore.score}</span>
                <span className="rp-score-grade">{report.seoScore.grade}</span>
              </div>
              <div className="rp-score-info">
                <h2 className="rp-card-title">Website SEO Score</h2>
                <p className="rp-score-summary">{report.seoScore.summary}</p>
              </div>
            </div>

            {/* 2. Keyword Opportunities */}
            <div className="rp-card">
              <h2 className="rp-card-title">Keyword Opportunities</h2>
              <p className="rp-card-desc">Top keyword ideas to target for {report.location || report.domain}</p>
              <div className="rp-kw-list">
                {report.keywordOpportunities.slice(0, 5).map((k, i) => (
                  <div key={i} className="rp-kw-item">
                    <div className="rp-kw-header">
                      <span className="rp-kw-name">{k.keyword}</span>
                      <span className="rp-kw-intent" style={{ color: intentColor(k.intent), background: intentColor(k.intent) + "15" }}>
                        {k.intent}
                      </span>
                    </div>
                    <div className="rp-kw-title">{k.suggestedTitle}</div>
                    <div className="rp-kw-why">{k.whyItMatters}</div>
                    <div className="rp-kw-meta">
                      <span>Difficulty: <strong>{k.estimatedDifficulty}</strong></span>
                      <span>Volume: <strong>{k.estimatedVolume}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Locked remaining */}
              {report.keywordOpportunities.length > 5 && (
                <div className="rp-locked">
                  <div className="rp-locked-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>{report.keywordOpportunities.length - 5} more keywords available with Pro</span>
                    <a href="/plugins" className="rp-locked-btn">Upgrade to Pro</a>
                  </div>
                  <div className="rp-locked-blur">
                    {report.keywordOpportunities.slice(5, 8).map((k, i) => (
                      <div key={i} className="rp-kw-item"><div className="rp-kw-header"><span className="rp-kw-name">{k.keyword}</span></div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Suggested Pages */}
            <div className="rp-card">
              <h2 className="rp-card-title">Suggested Pages to Build</h2>
              <p className="rp-card-desc">Priority pages to create for maximum SEO impact</p>
              <div className="rp-pages-grid">
                {report.suggestedPages.map((p, i) => (
                  <div key={i} className="rp-page-card">
                    <div className="rp-page-prio" style={{ color: prioColor(p.priority), background: prioBg(p.priority) }}>
                      {p.priority}
                    </div>
                    <h3 className="rp-page-title">{p.title}</h3>
                    <div className="rp-page-meta">
                      <span>/{p.slug}</span>
                      <span>{p.pageType}</span>
                    </div>
                    <div className="rp-page-kw">Target: {p.targetKeyword}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Internal Linking Plan */}
            <div className="rp-card">
              <h2 className="rp-card-title">Internal Linking Plan</h2>
              <p className="rp-card-desc">Recommended internal links to build site authority</p>
              <div className="rp-link-table">
                <div className="rp-link-row rp-link-row--header">
                  <span>From Page</span>
                  <span>To Page</span>
                  <span>Anchor Text</span>
                  <span>Reason</span>
                </div>
                {report.internalLinkingPlan.map((l, i) => (
                  <div key={i} className="rp-link-row">
                    <span>{l.fromPage}</span>
                    <span>{l.toPage}</span>
                    <span className="rp-link-anchor">"{l.anchorText}"</span>
                    <span className="rp-link-reason">{l.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Backlink Health */}
            <div className="rp-card">
              <h2 className="rp-card-title">Backlink Health</h2>
              {report.backlinkHealth.isDemo && (
                <div className="rp-demo-tag">Demo data — connect a backlink API for real results</div>
              )}
              <div className="rp-bl-summary">
                <div className="rp-bl-stat"><span className="rp-bl-num">{report.backlinkHealth.total}</span><span className="rp-bl-label">Total</span></div>
                <div className="rp-bl-stat"><span className="rp-bl-num" style={{ color: "#2563eb" }}>{report.backlinkHealth.uniqueDomains}</span><span className="rp-bl-label">Domains</span></div>
                <div className="rp-bl-stat"><span className="rp-bl-num" style={{ color: "#16a34a" }}>{report.backlinkHealth.good}</span><span className="rp-bl-label">Good</span></div>
                <div className="rp-bl-stat"><span className="rp-bl-num" style={{ color: "#ca8a04" }}>{report.backlinkHealth.warning}</span><span className="rp-bl-label">Warning</span></div>
                <div className="rp-bl-stat"><span className="rp-bl-num" style={{ color: "#dc2626" }}>{report.backlinkHealth.bad}</span><span className="rp-bl-label">Toxic</span></div>
              </div>
              <div className="rp-locked">
                <div className="rp-locked-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Full backlink report, toxic link analysis, and AI cleanup plan</span>
                  <a href="/plugins" className="rp-locked-btn">Upgrade to Pro</a>
                </div>
                <div className="rp-locked-blur">
                  <div className="rp-bl-placeholder">Detailed backlink table with domain authority, spam score, anchor distribution...</div>
                </div>
              </div>
            </div>

            {/* 6. GSC Insights */}
            <div className="rp-card">
              <h2 className="rp-card-title">Google Search Console Insights</h2>
              <div className="rp-gsc-empty">
                <p>Connect Google Search Console in the <a href="/app">app dashboard</a> to include real search performance data in your report.</p>
                <div className="rp-locked">
                  <div className="rp-locked-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>Full GSC insights, top pages, keywords, and CTR opportunities</span>
                    <a href="/plugins" className="rp-locked-btn">Upgrade to Pro</a>
                  </div>
                  <div className="rp-locked-blur">
                    <div className="rp-bl-placeholder">Click trends, keyword rankings, CTR analysis, position tracking...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. AI Recommendations */}
            <div className="rp-card">
              <h2 className="rp-card-title">AI Recommendations</h2>
              <p className="rp-card-desc">Prioritized actions to improve your SEO performance</p>
              <div className="rp-recs">
                {report.aiRecommendations.map((r, i) => (
                  <div key={i} className="rp-rec">
                    <div className="rp-rec-header">
                      <span className="rp-rec-prio" style={{ color: prioColor(r.priority), background: prioBg(r.priority) }}>
                        {r.priority}
                      </span>
                      <span className="rp-rec-cat">{r.category}</span>
                    </div>
                    <h3 className="rp-rec-title">{r.title}</h3>
                    <p className="rp-rec-desc">{r.description}</p>
                    <div className="rp-rec-impact">Impact: {r.impact}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      <footer className="rp-footer">
        <div className="rp-wrap">
          <span className="rp-footer__brand">SEO Rank Writer</span>
          <span className="rp-footer__text">Generate. Publish. Rank.</span>
        </div>
      </footer>
    </div>
  );
}
