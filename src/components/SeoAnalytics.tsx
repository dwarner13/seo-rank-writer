import { useState, useEffect, useCallback } from "react";
import {
  getGscAuthStatus,
  getGscSites,
  getSearchAnalytics,
  disconnectGoogle,
  daysAgo,
} from "../services/gsc";
import type { GscSite, GscRow } from "../services/gsc";

type DateRange = "7" | "28" | "90";
type Section = "pages" | "keywords" | "opportunities" | "losing";

interface AnalyticsData {
  pages: GscRow[];
  queries: GscRow[];
  dates: GscRow[];
}

// AI opportunity types
interface Opportunity {
  type: "high-impr-low-ctr" | "position-5-20" | "losing-traffic";
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  suggestions: string[];
}

export default function SeoAnalytics() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("28");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("pages");
  const [prevPages, setPrevPages] = useState<GscRow[]>([]);

  // Check connection on mount + URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc_connected")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gsc_error")) {
      setError("Google connection failed: " + params.get("gsc_error"));
      window.history.replaceState({}, "", window.location.pathname);
    }
    getGscAuthStatus()
      .then((s) => {
        setConnected(s.connected);
        if (s.connected) loadSites();
      })
      .finally(() => setChecking(false));
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const s = await getGscSites();
      setSites(s);
      if (s.length > 0 && !selectedSite) {
        setSelectedSite(s[0].siteUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    }
  }, [selectedSite]);

  const fetchData = useCallback(async () => {
    if (!selectedSite) return;
    setLoading(true);
    setError("");

    const days = parseInt(dateRange);
    const endDate = daysAgo(3); // GSC data has ~3 day delay
    const startDate = daysAgo(days + 3);

    try {
      const [pages, queries, dates] = await Promise.all([
        getSearchAnalytics({ siteUrl: selectedSite, startDate, endDate, dimensions: ["page"], rowLimit: 100 }),
        getSearchAnalytics({ siteUrl: selectedSite, startDate, endDate, dimensions: ["query"], rowLimit: 100 }),
        getSearchAnalytics({ siteUrl: selectedSite, startDate, endDate, dimensions: ["date"], rowLimit: 100 }),
      ]);

      // Fetch previous period for comparison (losing traffic)
      const prevEnd = startDate;
      const prevStart = daysAgo(days * 2 + 3);
      try {
        const prev = await getSearchAnalytics({
          siteUrl: selectedSite,
          startDate: prevStart,
          endDate: prevEnd,
          dimensions: ["page"],
          rowLimit: 100,
        });
        setPrevPages(prev);
      } catch {
        setPrevPages([]);
      }

      setData({ pages, queries, dates });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedSite, dateRange]);

  // Auto-fetch when site or date range changes
  useEffect(() => {
    if (connected && selectedSite) fetchData();
  }, [connected, selectedSite, dateRange, fetchData]);

  const handleConnect = () => {
    window.location.href = "/api/google/auth/start";
  };

  const handleDisconnect = async () => {
    await disconnectGoogle();
    setConnected(false);
    setSites([]);
    setSelectedSite("");
    setData(null);
  };

  // Compute opportunities
  const opportunities: Opportunity[] = [];
  if (data) {
    // High impressions, low CTR
    data.pages
      .filter((p) => p.impressions >= 50 && p.ctr < 0.03)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .forEach((p) => {
        opportunities.push({
          type: "high-impr-low-ctr",
          page: p.keys[0],
          clicks: p.clicks,
          impressions: p.impressions,
          ctr: p.ctr,
          position: p.position,
          suggestions: [
            "Rewrite meta title with stronger CTR hook",
            "Improve meta description with clear CTA",
            "Add FAQ schema for rich snippets",
          ],
        });
      });

    // Positions 5-20 (striking distance)
    data.queries
      .filter((q) => q.position >= 5 && q.position <= 20 && q.impressions >= 10)
      .sort((a, b) => a.position - b.position)
      .slice(0, 10)
      .forEach((q) => {
        opportunities.push({
          type: "position-5-20",
          page: q.keys[0],
          clicks: q.clicks,
          impressions: q.impressions,
          ctr: q.ctr,
          position: q.position,
          suggestions: [
            "Add more content targeting this keyword",
            "Build internal links to boost authority",
            "Refresh content with updated information",
          ],
        });
      });

    // Pages losing traffic
    if (prevPages.length > 0) {
      const prevMap = new Map(prevPages.map((p) => [p.keys[0], p]));
      data.pages
        .filter((p) => {
          const prev = prevMap.get(p.keys[0]);
          return prev && prev.clicks > p.clicks && prev.clicks >= 5;
        })
        .sort((a, b) => {
          const prevA = prevMap.get(a.keys[0]);
          const prevB = prevMap.get(b.keys[0]);
          const dropA = (prevA?.clicks || 0) - a.clicks;
          const dropB = (prevB?.clicks || 0) - b.clicks;
          return dropB - dropA;
        })
        .slice(0, 10)
        .forEach((p) => {
          const prev = prevMap.get(p.keys[0]);
          opportunities.push({
            type: "losing-traffic",
            page: p.keys[0],
            clicks: p.clicks,
            impressions: p.impressions,
            ctr: p.ctr,
            position: p.position,
            suggestions: [
              `Was ${prev?.clicks || 0} clicks, now ${p.clicks} clicks`,
              "Refresh article content with new information",
              "Check for keyword cannibalization",
              "Add new internal links from high-authority pages",
            ],
          });
        });
    }
  }

  // Summary stats
  const totalClicks = data?.pages.reduce((s, p) => s + p.clicks, 0) || 0;
  const totalImpressions = data?.pages.reduce((s, p) => s + p.impressions, 0) || 0;
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = data?.pages.length
    ? data.pages.reduce((s, p) => s + p.position, 0) / data.pages.length
    : 0;

  function shortUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.pathname === "/" ? "/" : u.pathname.replace(/\/$/, "");
    } catch {
      return url;
    }
  }

  if (checking) {
    return <div className="gsc-loading">Checking Google connection...</div>;
  }

  return (
    <div className="gsc-panel">
      {/* Connection header */}
      <div className="gsc-header">
        <div className="gsc-header-left">
          <h3 className="gsc-title">SEO Analytics</h3>
          <span className="gsc-subtitle">Google Search Console</span>
        </div>
        {connected ? (
          <div className="gsc-header-right">
            <select
              className="gsc-select"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              {sites.map((s) => (
                <option key={s.siteUrl} value={s.siteUrl}>
                  {s.siteUrl.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </option>
              ))}
            </select>
            <div className="gsc-range-btns">
              {(["7", "28", "90"] as DateRange[]).map((r) => (
                <button
                  key={r}
                  className={`gsc-range-btn ${dateRange === r ? "active" : ""}`}
                  onClick={() => setDateRange(r)}
                >
                  {r}d
                </button>
              ))}
            </div>
            <button className="gsc-disconnect-btn" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="gsc-connect-btn" onClick={handleConnect}>
            Connect Google Search Console
          </button>
        )}
      </div>

      {error && <div className="gsc-error">{error}</div>}

      {!connected && (
        <div className="gsc-empty">
          <div className="gsc-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="#94a3b8" strokeWidth="2" fill="none" />
              <path d="M14 28l6-8 6 4 8-10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="28" r="2" fill="#2563eb" />
              <circle cx="20" cy="20" r="2" fill="#2563eb" />
              <circle cx="26" cy="24" r="2" fill="#2563eb" />
              <circle cx="34" cy="14" r="2" fill="#2563eb" />
            </svg>
          </div>
          <h4>Connect Google Search Console</h4>
          <p>See your real search performance: clicks, impressions, CTR, and keyword rankings.</p>
          <div className="gsc-setup-steps">
            <div className="gsc-step"><span className="gsc-step-num">1</span> Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your <code>.env</code> file</div>
            <div className="gsc-step"><span className="gsc-step-num">2</span> Create OAuth credentials at <strong>Google Cloud Console</strong> &gt; APIs &amp; Credentials</div>
            <div className="gsc-step"><span className="gsc-step-num">3</span> Enable <strong>Google Search Console API</strong> in your project</div>
            <div className="gsc-step"><span className="gsc-step-num">4</span> Set redirect URI to <code>http://localhost:3001/api/google/auth/callback</code></div>
          </div>
          <button className="gsc-connect-btn" onClick={handleConnect} style={{ marginTop: 16 }}>
            Connect Google Account
          </button>
        </div>
      )}

      {connected && loading && <div className="gsc-loading">Loading search analytics...</div>}

      {connected && data && !loading && (
        <>
          {/* Summary cards */}
          <div className="gsc-summary">
            <div className="gsc-stat-card">
              <div className="gsc-stat-value gsc-stat-clicks">{totalClicks.toLocaleString()}</div>
              <div className="gsc-stat-label">Total Clicks</div>
            </div>
            <div className="gsc-stat-card">
              <div className="gsc-stat-value gsc-stat-impressions">{totalImpressions.toLocaleString()}</div>
              <div className="gsc-stat-label">Impressions</div>
            </div>
            <div className="gsc-stat-card">
              <div className="gsc-stat-value gsc-stat-ctr">{(avgCtr * 100).toFixed(1)}%</div>
              <div className="gsc-stat-label">Avg CTR</div>
            </div>
            <div className="gsc-stat-card">
              <div className="gsc-stat-value gsc-stat-position">{avgPosition.toFixed(1)}</div>
              <div className="gsc-stat-label">Avg Position</div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="gsc-section-tabs">
            {([
              { key: "pages", label: "Top Pages" },
              { key: "keywords", label: "Top Keywords" },
              { key: "opportunities", label: `Opportunities (${opportunities.filter((o) => o.type !== "losing-traffic").length})` },
              { key: "losing", label: `Losing Traffic (${opportunities.filter((o) => o.type === "losing-traffic").length})` },
            ] as { key: Section; label: string }[]).map((s) => (
              <button
                key={s.key}
                className={`gsc-section-tab ${activeSection === s.key ? "active" : ""}`}
                onClick={() => setActiveSection(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Top Pages */}
          {activeSection === "pages" && (
            <div className="gsc-table-wrap">
              <table className="gsc-table">
                <thead>
                  <tr>
                    <th className="gsc-th-page">Page</th>
                    <th>Clicks</th>
                    <th>Impressions</th>
                    <th>CTR</th>
                    <th>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 25)
                    .map((row, i) => (
                      <tr key={i}>
                        <td className="gsc-td-page" title={row.keys[0]}>
                          {shortUrl(row.keys[0])}
                        </td>
                        <td className="gsc-td-num">{row.clicks.toLocaleString()}</td>
                        <td className="gsc-td-num">{row.impressions.toLocaleString()}</td>
                        <td className="gsc-td-num">{(row.ctr * 100).toFixed(1)}%</td>
                        <td className="gsc-td-num">{row.position.toFixed(1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {data.pages.length === 0 && (
                <div className="gsc-empty-table">No page data for this period.</div>
              )}
            </div>
          )}

          {/* Top Keywords */}
          {activeSection === "keywords" && (
            <div className="gsc-table-wrap">
              <table className="gsc-table">
                <thead>
                  <tr>
                    <th className="gsc-th-page">Query</th>
                    <th>Clicks</th>
                    <th>Impressions</th>
                    <th>CTR</th>
                    <th>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queries
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 25)
                    .map((row, i) => (
                      <tr key={i}>
                        <td className="gsc-td-query">{row.keys[0]}</td>
                        <td className="gsc-td-num">{row.clicks.toLocaleString()}</td>
                        <td className="gsc-td-num">{row.impressions.toLocaleString()}</td>
                        <td className="gsc-td-num">{(row.ctr * 100).toFixed(1)}%</td>
                        <td className="gsc-td-num">{row.position.toFixed(1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {data.queries.length === 0 && (
                <div className="gsc-empty-table">No keyword data for this period.</div>
              )}
            </div>
          )}

          {/* Opportunities: high impr/low CTR + striking distance */}
          {activeSection === "opportunities" && (
            <div className="gsc-opportunities">
              {opportunities.filter((o) => o.type !== "losing-traffic").length === 0 ? (
                <div className="gsc-empty-table">No opportunities found. Try a longer date range.</div>
              ) : (
                <>
                  {opportunities
                    .filter((o) => o.type === "high-impr-low-ctr")
                    .length > 0 && (
                    <>
                      <h4 className="gsc-opp-heading">High Impressions, Low CTR</h4>
                      <p className="gsc-opp-desc">These pages show up in search but few people click. Improve titles and descriptions.</p>
                      {opportunities
                        .filter((o) => o.type === "high-impr-low-ctr")
                        .map((opp, i) => (
                          <OpportunityCard key={`hilo-${i}`} opp={opp} />
                        ))}
                    </>
                  )}
                  {opportunities
                    .filter((o) => o.type === "position-5-20")
                    .length > 0 && (
                    <>
                      <h4 className="gsc-opp-heading" style={{ marginTop: 24 }}>Keywords in Striking Distance (Pos 5-20)</h4>
                      <p className="gsc-opp-desc">These keywords are close to page 1. A small boost could bring significant traffic.</p>
                      {opportunities
                        .filter((o) => o.type === "position-5-20")
                        .map((opp, i) => (
                          <OpportunityCard key={`pos-${i}`} opp={opp} />
                        ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Losing Traffic */}
          {activeSection === "losing" && (
            <div className="gsc-opportunities">
              {opportunities.filter((o) => o.type === "losing-traffic").length === 0 ? (
                <div className="gsc-empty-table">No pages losing traffic compared to previous period.</div>
              ) : (
                <>
                  <p className="gsc-opp-desc">
                    These pages had more clicks in the previous {dateRange}-day period. Consider refreshing content.
                  </p>
                  {opportunities
                    .filter((o) => o.type === "losing-traffic")
                    .map((opp, i) => (
                      <OpportunityCard key={`lose-${i}`} opp={opp} />
                    ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel =
    opp.type === "high-impr-low-ctr"
      ? "Low CTR"
      : opp.type === "position-5-20"
      ? `Pos ${opp.position.toFixed(1)}`
      : "Losing Clicks";
  const typeClass =
    opp.type === "high-impr-low-ctr"
      ? "gsc-badge-warn"
      : opp.type === "position-5-20"
      ? "gsc-badge-info"
      : "gsc-badge-danger";

  let shortPage: string;
  try {
    const u = new URL(opp.page);
    shortPage = u.pathname === "/" ? "/" : u.pathname.replace(/\/$/, "");
  } catch {
    shortPage = opp.page;
  }

  return (
    <div className="gsc-opp-card">
      <div className="gsc-opp-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="gsc-opp-card-left">
          <span className={`gsc-badge ${typeClass}`}>{typeLabel}</span>
          <span className="gsc-opp-page" title={opp.page}>{shortPage}</span>
        </div>
        <div className="gsc-opp-card-stats">
          <span>{opp.clicks} clicks</span>
          <span>{opp.impressions.toLocaleString()} impr</span>
          <span>{(opp.ctr * 100).toFixed(1)}% CTR</span>
          <span className="gsc-expand-icon">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </div>
      {expanded && (
        <div className="gsc-opp-card-body">
          <div className="gsc-suggestions-label">AI Suggestions:</div>
          <ul className="gsc-suggestions">
            {opp.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
