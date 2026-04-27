import { useState, useEffect, useCallback } from "react";
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

interface SavedKeyword extends Keyword {
  businessType: string;
  location: string;
  createdAt: string;
}

interface KeywordResearchProps {
  businessName: string;
  location: string;
  mainKeyword: string;
  websiteUrl: string;
  onUseKeyword: (keyword: string, location: string, pageType: string) => void;
}

const KW_STORAGE_KEY = "seo-keyword-research";
const SAVED_KW_KEY = "saved_seo_keywords";
const PAGE_TYPE_MAP: Record<string, string> = {
  "Service Page": "service",
  "Location Page": "location",
  "Blog Post": "blog",
  "FAQ": "faq",
  "GBP Post": "service",
};

function loadResearch(): { data: KeywordData; input: { businessType: string; location: string; seedKeyword: string } } | null {
  try { const r = localStorage.getItem(KW_STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return null;
}
function saveResearch(data: KeywordData, input: { businessType: string; location: string; seedKeyword: string }) {
  try { localStorage.setItem(KW_STORAGE_KEY, JSON.stringify({ data, input })); } catch {}
}
function loadSavedKw(): SavedKeyword[] {
  try { const r = localStorage.getItem(SAVED_KW_KEY); if (r) return JSON.parse(r); } catch {} return [];
}
function persistSavedKw(list: SavedKeyword[]) {
  try { localStorage.setItem(SAVED_KW_KEY, JSON.stringify(list)); } catch {}
}

export default function KeywordResearch({ businessName, location: defaultLocation, mainKeyword, websiteUrl: defaultUrl, onUseKeyword }: KeywordResearchProps) {
  const { plan } = usePlan();
  const isPaid = plan === "pro" || plan === "agency";
  const FREE_LIMIT = 3;

  const prev = loadResearch();
  const [businessType, setBusinessType] = useState(prev?.input.businessType || businessName || "");
  const [locationInput, setLocationInput] = useState(prev?.input.location || defaultLocation || "");
  const [websiteUrl, setWebsiteUrl] = useState(defaultUrl || "");
  const [seedKeyword, setSeedKeyword] = useState(prev?.input.seedKeyword || mainKeyword || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<KeywordData | null>(prev?.data || null);
  const [toast, setToast] = useState("");
  const [savedKws, setSavedKws] = useState<SavedKeyword[]>(loadSavedKw);
  const [selected, setSelected] = useState<Keyword | null>(null);

  useEffect(() => {
    if (businessName && !businessType) setBusinessType(businessName);
    if (defaultLocation && !locationInput) setLocationInput(defaultLocation);
    if (mainKeyword && !seedKeyword) setSeedKeyword(mainKeyword);
  }, [businessName, defaultLocation, mainKeyword]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  async function handleGenerate() {
    if (!businessType.trim() && !seedKeyword.trim()) { setError("Enter a business type or seed keyword."); return; }
    setLoading(true); setError(""); setData(null); setSelected(null);
    try {
      const payload = JSON.stringify({ businessType: businessType.trim(), location: locationInput.trim(), websiteUrl: websiteUrl.trim() || undefined, seedKeyword: seedKeyword.trim() || undefined });
      const hdrs = { "Content-Type": "application/json" };
      let res = await fetch("/api/keyword-research", { method: "POST", headers: hdrs, body: payload }).catch(() => null);
      if (!res || !(res.headers.get("content-type") || "").includes("json")) {
        res = await fetch("/.netlify/functions/keyword-research", { method: "POST", headers: hdrs, body: payload });
      }
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `Error ${res.status}`); }
      const result: KeywordData = await res.json();
      setData(result);
      saveResearch(result, { businessType: businessType.trim(), location: locationInput.trim(), seedKeyword: seedKeyword.trim() });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to generate keywords."); }
    finally { setLoading(false); }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    showToast("Keyword copied");
  }

  function handleCopyAll(title: string, keywords: Keyword[]) {
    navigator.clipboard.writeText(keywords.map(k => k.keyword).join("\n"));
    showToast(`${keywords.length} ${title} copied`);
  }

  function handleSave(kw: Keyword) {
    const exists = savedKws.some(s => s.keyword === kw.keyword);
    if (exists) { showToast("Already saved"); return; }
    const entry: SavedKeyword = { ...kw, businessType: businessType, location: locationInput, createdAt: new Date().toISOString() };
    const next = [entry, ...savedKws];
    setSavedKws(next);
    persistSavedKw(next);
    showToast("Keyword saved");
  }

  function isSaved(keyword: string) { return savedKws.some(s => s.keyword === keyword); }

  function handleUse(kw: Keyword) {
    // Save full context for article form
    localStorage.setItem("seo_selected_keyword", kw.keyword);
    localStorage.setItem("seo_selected_location", locationInput);
    localStorage.setItem("seo_selected_business_type", businessType);
    localStorage.setItem("seo_selected_seed_keyword", seedKeyword);
    localStorage.setItem("seo_selected_keyword_intent", kw.intent);
    localStorage.setItem("seo_selected_keyword_page_type", kw.pageType);
    localStorage.setItem("seo_selected_keyword_reason", kw.reason);
    onUseKeyword(kw.keyword, locationInput, PAGE_TYPE_MAP[kw.pageType] || "service");
  }

  const ic = (i: string) => {
    switch (i) { case "Transactional": return { bg: "#ede9fe", c: "#5b21b6" }; case "Commercial": return { bg: "#dbeafe", c: "#1e40af" }; case "Local": return { bg: "#dcfce7", c: "#166534" }; case "Informational": return { bg: "#fef3c7", c: "#92400e" }; default: return { bg: "#f1f5f9", c: "#475569" }; }
  };
  const dc = (d: string) => {
    switch (d) { case "Easy": return { bg: "#dcfce7", c: "#166534" }; case "Medium": return { bg: "#fef3c7", c: "#92400e" }; case "Hard": return { bg: "#fee2e2", c: "#991b1b" }; default: return { bg: "#f1f5f9", c: "#475569" }; }
  };

  function renderCard(title: string, icon: string, keywords: Keyword[], gated: boolean, fullWidth?: boolean) {
    const limit = (!gated || isPaid) ? keywords.length : FREE_LIMIT;
    const vis = keywords.slice(0, limit);
    const locked = keywords.slice(limit);

    return (
      <div className={`kw-card ${fullWidth ? "kw-card--full" : ""}`}>
        <div className="kw-card-hdr">
          <span className="kw-card-icon">{icon}</span>
          <span className="kw-card-title">{title}</span>
          <span className="kw-card-count">{keywords.length}</span>
          {vis.length > 0 && <button className="kw-copy-all" onClick={() => handleCopyAll(title, vis)}>Copy All</button>}
        </div>
        <div className="kw-card-body">
          {vis.map((kw, i) => {
            const intent = ic(kw.intent);
            const diff = dc(kw.difficulty);
            const saved = isSaved(kw.keyword);
            return (
              <div key={i} className={`kw-row ${selected?.keyword === kw.keyword ? "kw-row--selected" : ""}`} onClick={() => setSelected(kw)}>
                <div className="kw-row-main">
                  <div className="kw-row-kw">{kw.keyword}</div>
                  <div className="kw-row-tags">
                    <span className="kw-tag" style={{ background: intent.bg, color: intent.c }}>{kw.intent}</span>
                    <span className="kw-tag" style={{ background: diff.bg, color: diff.c }}>{kw.difficulty}</span>
                    <span className="kw-tag kw-tag--type">{kw.pageType}</span>
                    <span className="kw-tag kw-tag--score">{kw.priorityScore}</span>
                  </div>
                  <div className="kw-row-reason">{kw.reason}</div>
                </div>
                <div className="kw-row-actions">
                  <button className="kw-btn" onClick={e => { e.stopPropagation(); handleCopy(kw.keyword); }}>Copy</button>
                  <button className={`kw-btn ${saved ? "kw-btn--saved" : ""}`} onClick={e => { e.stopPropagation(); handleSave(kw); }} disabled={saved}>{saved ? "Saved" : "Save"}</button>
                  <button className="kw-btn kw-btn--primary" onClick={e => { e.stopPropagation(); handleUse(kw); }}>Use in Article</button>
                </div>
              </div>
            );
          })}
          {locked.length > 0 && (
            <div className="kw-card-locked">
              <div className="kw-card-locked-ov">
                <span>+{locked.length} more</span>
                <a href="/#pricing" className="kw-locked-btn">Upgrade</a>
              </div>
              <div className="kw-card-locked-blur">
                {locked.slice(0, 2).map((kw, i) => <div key={i} className="kw-row"><div className="kw-row-main"><div className="kw-row-kw">{kw.keyword}</div></div></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const total = data ? data.topMoneyKeywords.length + data.longTailKeywords.length + data.questionKeywords.length + data.localSeoKeywords.length + data.contentIdeas.length : 0;

  return (
    <div className="kw-page">
      {/* Toast */}
      {toast && <div className="kw-toast">{toast}</div>}

      <div className="kw-wrap">
        {/* Form */}
        <div className="kw-form-card">
          <div className="kw-form-header">
            <div>
              <h2 className="kw-form-title">Keyword Research</h2>
              <p className="kw-form-desc">Discover high-value SEO keyword opportunities.</p>
            </div>
            <div className="kw-form-meta">
              {savedKws.length > 0 && <span className="kw-saved-count">{savedKws.length} saved</span>}
              {!isPaid && <div className="kw-plan-badge">Free — {FREE_LIMIT}/group <a href="/#pricing">Upgrade</a></div>}
            </div>
          </div>
          <div className="kw-form-grid">
            <div className="field"><label>Business / Niche</label><input type="text" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Cash for Cars" /></div>
            <div className="field"><label>Location / City</label><input type="text" value={locationInput} onChange={e => setLocationInput(e.target.value)} placeholder="e.g. Vancouver BC" /></div>
            <div className="field"><label>Seed Keyword <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opt)</span></label><input type="text" value={seedKeyword} onChange={e => setSeedKeyword(e.target.value)} placeholder="e.g. cash for cars" /></div>
            <div className="field"><label>Website URL <span style={{ color: "#94a3b8", fontWeight: 400 }}>(opt)</span></label><input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="e.g. https://example.com" /></div>
          </div>
          <div className="kw-form-actions">
            <button className="kw-gen-btn" onClick={handleGenerate} disabled={loading || (!businessType.trim() && !seedKeyword.trim())}>{loading ? "Researching..." : "Generate Keyword Research"}</button>
            {data && <button className="kw-clear-btn" onClick={() => { setData(null); setSelected(null); localStorage.removeItem(KW_STORAGE_KEY); }}>Clear</button>}
          </div>
          {error && <div className="kw-error">{error}</div>}
        </div>

        {loading && <div className="kw-loading"><div className="kw-spinner" /><p>Analyzing keyword opportunities...</p></div>}

        {/* Selected Keyword Panel */}
        {selected && !loading && (
          <div className="kw-selected-panel">
            <div className="kw-selected-info">
              <div className="kw-selected-kw">{selected.keyword}</div>
              <div className="kw-row-tags">
                <span className="kw-tag" style={{ background: ic(selected.intent).bg, color: ic(selected.intent).c }}>{selected.intent}</span>
                <span className="kw-tag" style={{ background: dc(selected.difficulty).bg, color: dc(selected.difficulty).c }}>{selected.difficulty}</span>
                <span className="kw-tag kw-tag--type">{selected.pageType}</span>
                <span className="kw-tag kw-tag--score">{selected.priorityScore}</span>
              </div>
              <div className="kw-selected-reason">{selected.reason}</div>
            </div>
            <div className="kw-selected-actions">
              <button className="kw-btn kw-btn--primary" onClick={() => handleUse(selected)}>Generate Article</button>
              <button className="kw-btn" onClick={() => handleCopy(selected.keyword)}>Copy</button>
              <button className={`kw-btn ${isSaved(selected.keyword) ? "kw-btn--saved" : ""}`} onClick={() => handleSave(selected)} disabled={isSaved(selected.keyword)}>{isSaved(selected.keyword) ? "Saved" : "Save"}</button>
              <button className="kw-btn kw-btn--close" onClick={() => setSelected(null)}>&times;</button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {data && !loading && (
          <>
            <div className="kw-results-header">
              <span>{total} keywords found</span>
              {!isPaid && <span className="kw-results-limit">{FREE_LIMIT * 5} visible</span>}
            </div>
            <div className="kw-grid">
              {renderCard("Money Keywords", "\uD83D\uDCB0", data.topMoneyKeywords, true, true)}
              {renderCard("Long-Tail Keywords", "\uD83C\uDFAF", data.longTailKeywords, true)}
              {renderCard("Question Keywords", "\u2753", data.questionKeywords, true)}
              {renderCard("Local SEO Keywords", "\uD83D\uDCCD", data.localSeoKeywords, true)}
              {renderCard("Content Ideas", "\uD83D\uDCA1", data.contentIdeas, true)}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="kw-empty"><div className="kw-empty-icon">{"\uD83D\uDD0D"}</div><h3>Discover Keywords That Drive Traffic</h3><p>Enter your business type and location to find SEO opportunities.</p></div>
        )}
      </div>
    </div>
  );
}
