import { useState } from "react";
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

export default function KeywordResearch({ businessName, location: defaultLocation, mainKeyword, onUseKeyword }: KeywordResearchProps) {
  const { canUse } = usePlan();
  const [businessType, setBusinessType] = useState(businessName || "");
  const [locationInput, setLocationInput] = useState(defaultLocation || "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [seedKeyword, setSeedKeyword] = useState(mainKeyword || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<KeywordData | null>(null);
  const [copied, setCopied] = useState("");

  async function handleGenerate() {
    if (!businessType.trim() && !seedKeyword.trim()) {
      setError("Enter a business type or seed keyword.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/.netlify/functions/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: businessType.trim(),
          location: locationInput.trim(),
          websiteUrl: websiteUrl.trim() || undefined,
          seedKeyword: seedKeyword.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      setData(await res.json());
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

  function handleUse(kw: Keyword) {
    localStorage.setItem("seo_selected_keyword", kw.keyword);
    localStorage.setItem("seo_selected_location", locationInput);
    onUseKeyword(kw.keyword, locationInput);
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

  function renderGroup(title: string, icon: string, keywords: Keyword[], locked: boolean = false) {
    return (
      <div className="kw-group">
        <div className="kw-group-header">
          <span className="kw-group-icon">{icon}</span>
          <h3 className="kw-group-title">{title}</h3>
          <span className="kw-group-count">{keywords.length}</span>
        </div>
        <div className={`kw-group-list ${locked ? "kw-group-list--locked" : ""}`}>
          {locked && (
            <div className="kw-locked-overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Upgrade to Growth or Domination to unlock all keywords</span>
              <a href="/#pricing" className="kw-locked-btn">View Plans</a>
            </div>
          )}
          {keywords.map((kw, i) => {
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
                  <button className="kw-action-btn" onClick={() => handleCopy(kw.keyword)} title="Copy keyword">
                    {copied === kw.keyword ? "\u2713" : "Copy"}
                  </button>
                  <button className="kw-action-btn kw-action-btn--primary" onClick={() => handleUse(kw)} title="Use in SEO Article">
                    Use in Article
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const isPro = canUse("generate"); // simplified check

  return (
    <div className="kw-page">
      <div className="kw-wrap">
        {/* Input Form */}
        <div className="kw-form-card">
          <h2 className="kw-form-title">Keyword Research</h2>
          <p className="kw-form-desc">Enter your business details to discover high-value SEO keyword opportunities.</p>
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
          <button className="kw-gen-btn" onClick={handleGenerate} disabled={loading || (!businessType.trim() && !seedKeyword.trim())}>
            {loading ? "Researching keywords..." : "Generate Keyword Research"}
          </button>
          {error && <div className="kw-error">{error}</div>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="kw-loading">
            <div className="kw-spinner" />
            <p>Analyzing keyword opportunities...</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="kw-results">
            {renderGroup("Money Keywords", "\uD83D\uDCB0", data.topMoneyKeywords)}
            {renderGroup("Long-Tail Keywords", "\uD83C\uDFAF", data.longTailKeywords, !isPro)}
            {renderGroup("Question Keywords", "\u2753", data.questionKeywords, !isPro)}
            {renderGroup("Local SEO Keywords", "\uD83D\uDCCD", data.localSeoKeywords)}
            {renderGroup("Content Ideas", "\uD83D\uDCA1", data.contentIdeas, !isPro)}
          </div>
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
