import { useState, useEffect } from "react";
import { usePlan } from "../lib/PlanContext";

interface Keyword {
  keyword: string;
  intent: string;
  difficulty: string;
  priorityScore: number;
  pageType: string;
  reason: string;
}

interface KeywordData {
  topMoneyKeywords: Keyword[];
  longTailKeywords: Keyword[];
  questionKeywords: Keyword[];
  localSeoKeywords: Keyword[];
  contentIdeas: Keyword[];
}

interface KeywordResearchProps {
  businessName: string;
  location: string;
  mainKeyword: string;
  onUseKeyword: (keyword: string, location: string) => void;
}

const KW_STORAGE_KEY = "seo-keyword-research";

function loadSavedKeywords(): { data: KeywordData; input: { businessType: string; location: string; seedKeyword: string } } | null {
  try {
    const raw = localStorage.getItem(KW_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveKeywords(data: KeywordData, input: { businessType: string; location: string; seedKeyword: string }) {
  try {
    localStorage.setItem(KW_STORAGE_KEY, JSON.stringify({ data, input }));
  } catch { /* storage full */ }
}

export default function KeywordResearch({ businessName, location: defaultLocation, mainKeyword, onUseKeyword }: KeywordResearchProps) {
  const { plan } = usePlan();
  const isPaid = plan === "pro" || plan === "agency";

  // Restore saved results
  const saved = loadSavedKeywords();
  const [businessType, setBusinessType] = useState(saved?.input.businessType || businessName || "");
  const [locationInput, setLocationInput] = useState(saved?.input.location || defaultLocation || "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [seedKeyword, setSeedKeyword] = useState(saved?.input.seedKeyword || mainKeyword || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<KeywordData | null>(saved?.data || null);
  const [copied, setCopied] = useState("");

  // Sync props if they change (e.g. user updates business name in sidebar)
  useEffect(() => {
    if (businessName && !businessType) setBusinessType(businessName);
    if (defaultLocation && !locationInput) setLocationInput(defaultLocation);
    if (mainKeyword && !seedKeyword) setSeedKeyword(mainKeyword);
  }, [businessName, defaultLocation, mainKeyword]);

  async function handleGenerate() {
    if (!businessType.trim() && !seedKeyword.trim()) {
      setError("Enter a business type or seed keyword.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const payload = JSON.stringify({
        businessType: businessType.trim(),
        location: locationInput.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        seedKeyword: seedKeyword.trim() || undefined,
      });
      const headers = { "Content-Type": "application/json" };

      let res = await fetch("/api/keyword-research", { method: "POST", headers, body: payload }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("/.netlify/functions/keyword-research", { method: "POST", headers, body: payload });
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const result: KeywordData = await res.json();
      setData(result);
      // Persist to localStorage so results survive tab switches
      saveKeywords(result, { businessType: businessType.trim(), location: locationInput.trim(), seedKeyword: seedKeyword.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate keywords.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  }

  function handleCopyAll(keywords: Keyword[]) {
    const text = keywords.map(k => k.keyword).join("\n");
    navigator.clipboard.writeText(text);
    setCopied("__all__");
    setTimeout(() => setCopied(""), 2000);
  }

  function handleUse(kw: Keyword) {
    localStorage.setItem("seo_selected_keyword", kw.keyword);
    localStorage.setItem("seo_selected_location", locationInput);
    onUseKeyword(kw.keyword, locationInput);
  }

  function handleClearResults() {
    setData(null);
    localStorage.removeItem(KW_STORAGE_KEY);
  }

  const intentColor = (i: string) => {
    switch (i) {
      case "Transactional": return { bg: "#ede9fe", color: "#5b21b6" };
      case "Commercial": return { bg: "#dbeafe", color: "#1e40af" };
      case "Local": return { bg: "#dcfce7", color: "#166534" };
      case "Informational": return { bg: "#fef3c7", color: "#92400e" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  const diffColor = (d: string) => {
    switch (d) {
      case "Easy": return { bg: "#dcfce7", color: "#166534" };
      case "Medium": return { bg: "#fef3c7", color: "#92400e" };
      case "Hard": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  // Free users: 3 per group visible, rest blurred
  // Paid users: all visible
  const FREE_LIMIT = 3;

  function renderGroup(title: string, icon: string, keywords: Keyword[], requiresPaid: boolean = false) {
    const visibleCount = (!requiresPaid || isPaid) ? keywords.length : FREE_LIMIT;
    const visible = keywords.slice(0, visibleCount);
    const locked = keywords.slice(visibleCount);
    const hasLocked = locked.length > 0;

    return (
      <div className="kw-group">
        <div className="kw-group-header">
          <span className="kw-group-icon">{icon}</span>
          <h3 className="kw-group-title">{title}</h3>
          <span className="kw-group-count">{keywords.length}</span>
          {keywords.length > 0 && (
            <button className="kw-copy-all" onClick={() => handleCopyAll(isPaid ? keywords : visible)} title="Copy all keywords">
              {copied === "__all__" ? "\u2713 Copied" : "Copy All"}
            </button>
          )}
        </div>
        <div className="kw-group-list">
          {visible.map((kw, i) => {
            const ic = intentColor(kw.intent);
            const dc = diffColor(kw.difficulty);
            return (
              <div key={i} className="kw-item">
                <div className="kw-item-main">
                  <div className="kw-item-keyword">{kw.keyword}</div>
                  <div className="kw-item-tags">
                    <span className="kw-tag" style={{ background: ic.bg, color: ic.color }}>{kw.intent}</span>
                    <span className="kw-tag" style={{ background: dc.bg, color: dc.color }}>{kw.difficulty}</span>
                    <span className="kw-tag kw-tag--type">{kw.pageType}</span>
                    <span className="kw-tag kw-tag--score">Score: {kw.priorityScore}</span>
                  </div>
                  <div className="kw-item-reason">{kw.reason}</div>
                </div>
                <div className="kw-item-actions">
                  <button className="kw-action-btn" onClick={() => handleCopy(kw.keyword)}>
                    {copied === kw.keyword ? "\u2713" : "Copy"}
                  </button>
                  <button className="kw-action-btn kw-action-btn--primary" onClick={() => handleUse(kw)}>
                    Use in Article
                  </button>
                </div>
              </div>
            );
          })}

          {/* Locked keywords for free users */}
          {hasLocked && (
            <div className="kw-locked-section">
              <div className="kw-locked-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>+{locked.length} more keywords</span>
                <a href="/#pricing" className="kw-locked-btn">Upgrade to unlock</a>
              </div>
              <div className="kw-locked-blur">
                {locked.slice(0, 2).map((kw, i) => (
                  <div key={i} className="kw-item">
                    <div className="kw-item-main">
                      <div className="kw-item-keyword">{kw.keyword}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Count total keywords
  const totalKeywords = data
    ? data.topMoneyKeywords.length + data.longTailKeywords.length + data.questionKeywords.length + data.localSeoKeywords.length + data.contentIdeas.length
    : 0;

  return (
    <div className="kw-page">
      <div className="kw-wrap">
        {/* Input Form */}
        <div className="kw-form-card">
          <div className="kw-form-header">
            <div>
              <h2 className="kw-form-title">Keyword Research</h2>
              <p className="kw-form-desc">Enter your business details to discover high-value SEO keyword opportunities.</p>
            </div>
            {!isPaid && (
              <div className="kw-plan-badge">
                Free — {FREE_LIMIT} keywords per group
                <a href="/#pricing">Upgrade for full access</a>
              </div>
            )}
          </div>
          <div className="kw-form-grid">
            <div className="field">
              <label>Business Type / Niche</label>
              <input type="text" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Emergency Plumber" />
            </div>
            <div className="field">
              <label>Location / City</label>
              <input type="text" value={locationInput} onChange={e => setLocationInput(e.target.value)} placeholder="e.g. Calgary AB" />
            </div>
            <div className="field">
              <label>Seed Keyword <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={seedKeyword} onChange={e => setSeedKeyword(e.target.value)} placeholder="e.g. emergency plumber" />
            </div>
            <div className="field">
              <label>Website URL <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="e.g. https://example.com" />
            </div>
          </div>
          <div className="kw-form-actions">
            <button className="kw-gen-btn" onClick={handleGenerate} disabled={loading || (!businessType.trim() && !seedKeyword.trim())}>
              {loading ? "Researching keywords..." : "Generate Keyword Research"}
            </button>
            {data && (
              <button className="kw-clear-btn" onClick={handleClearResults}>Clear Results</button>
            )}
          </div>
          {error && <div className="kw-error">{error}</div>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="kw-loading">
            <div className="kw-spinner" />
            <p>Analyzing keyword opportunities...</p>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>This takes 10-20 seconds</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            <div className="kw-results-header">
              <span>{totalKeywords} keywords found</span>
              {!isPaid && <span className="kw-results-limit">{FREE_LIMIT * 5} visible — upgrade for all {totalKeywords}</span>}
            </div>
            <div className="kw-results">
              {renderGroup("Money Keywords", "\uD83D\uDCB0", data.topMoneyKeywords, true)}
              {renderGroup("Long-Tail Keywords", "\uD83C\uDFAF", data.longTailKeywords, true)}
              {renderGroup("Question Keywords", "\u2753", data.questionKeywords, true)}
              {renderGroup("Local SEO Keywords", "\uD83D\uDCCD", data.localSeoKeywords, true)}
              {renderGroup("Content Ideas", "\uD83D\uDCA1", data.contentIdeas, true)}
            </div>
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="kw-empty">
            <div className="kw-empty-icon">{"\uD83D\uDD0D"}</div>
            <h3>Discover Keywords That Drive Traffic</h3>
            <p>Enter your business type and location above to find high-value keyword opportunities for SEO content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
