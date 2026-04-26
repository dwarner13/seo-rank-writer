import { useState, useEffect } from "react";
import "./PluginDownloads.css";

interface LicenseInfo {
  hasLicense: boolean;
  licenseKey?: string;
  plan: string;
  activatedAt?: string;
  expiresAt?: string | null;
  sites?: number;
}

export default function PluginDownloads() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    fetchLicense();
  }, []);

  async function fetchLicense() {
    try {
      const res = await fetch("/api/plugins/license");
      const data = await res.json();
      setLicense(data);
    } catch {
      setError("Failed to check license status.");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    if (!keyInput.trim()) return;
    setActivating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/plugins/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed.");
      setSuccess("License activated successfully!");
      setKeyInput("");
      fetchLicense();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed.");
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate your license? You will lose access to Pro plugin downloads.")) return;
    try {
      await fetch("/api/plugins/license/deactivate", { method: "POST" });
      setLicense({ hasLicense: false, plan: "free" });
      setSuccess("License deactivated.");
    } catch {
      setError("Failed to deactivate.");
    }
  }

  async function handleGenerateKey() {
    try {
      const res = await fetch("/api/plugins/license/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", sites: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`License key generated: ${data.licenseKey}`);
      fetchLicense();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key.");
    }
  }

  function handleDownload(type: "free" | "pro") {
    setDownloadError("");
    if (type === "pro" && (!license || !license.hasLicense)) {
      setDownloadError("Activate a Pro license to download the Pro plugin.");
      return;
    }
    // Use window.location for file download
    const url = `/api/plugins/download?type=${type}`;
    // Use fetch first to check for errors (JSON error vs file)
    fetch(url).then((res) => {
      if (!res.ok) {
        res.json().then((d) => setDownloadError(d.error || "Download failed.")).catch(() => setDownloadError("Download failed."));
        return;
      }
      // Trigger actual download
      window.location.href = url;
    }).catch(() => setDownloadError("Download failed."));
  }

  const isPro = license?.hasLicense && license.plan === "pro";

  return (
    <div className="pd">
      {/* Nav */}
      <nav className="pd-nav">
        <div className="pd-nav__inner">
          <a href="/" className="pd-nav__logo">SEO Rank Writer</a>
          <div className="pd-nav__links">
            <a href="/app">Open App</a>
            <a href="/">Home</a>
          </div>
        </div>
      </nav>

      <div className="pd-wrap">
        {/* Header */}
        <div className="pd-header">
          <h1 className="pd-header__title">Plugin Downloads</h1>
          <p className="pd-header__sub">Download the SEO Rank Writer WordPress plugin to connect your site.</p>
        </div>

        {error && <div className="pd-alert pd-alert--error">{error}</div>}
        {success && <div className="pd-alert pd-alert--success">{success}</div>}
        {downloadError && <div className="pd-alert pd-alert--error">{downloadError}</div>}

        {/* License Status */}
        <div className="pd-license-card">
          <div className="pd-license-header">
            <h2 className="pd-license-title">License Status</h2>
            <span className={`pd-license-badge ${isPro ? "pd-license-badge--pro" : "pd-license-badge--free"}`}>
              {isPro ? "Pro" : "Free"}
            </span>
          </div>

          {loading ? (
            <p className="pd-license-loading">Checking license...</p>
          ) : isPro ? (
            <div className="pd-license-active">
              <div className="pd-license-row">
                <span className="pd-license-label">License Key</span>
                <code className="pd-license-key">{license?.licenseKey}</code>
              </div>
              <div className="pd-license-row">
                <span className="pd-license-label">Plan</span>
                <span className="pd-license-value">Pro</span>
              </div>
              <div className="pd-license-row">
                <span className="pd-license-label">Activated</span>
                <span className="pd-license-value">
                  {license?.activatedAt ? new Date(license.activatedAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="pd-license-row">
                <span className="pd-license-label">Sites Allowed</span>
                <span className="pd-license-value">{license?.sites || 1}</span>
              </div>
              <div className="pd-license-row">
                <span className="pd-license-label">Status</span>
                <span className="pd-license-value pd-license-value--active">Active</span>
              </div>
              <button className="pd-btn pd-btn--text" onClick={handleDeactivate}>Deactivate License</button>
            </div>
          ) : (
            <div className="pd-license-activate">
              <p className="pd-license-info">Enter your Pro license key to unlock Pro plugin downloads and features.</p>
              <div className="pd-license-form">
                <input
                  type="text"
                  className="pd-license-input"
                  placeholder="SSF-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  maxLength={27}
                />
                <button
                  className="pd-btn pd-btn--primary"
                  onClick={handleActivate}
                  disabled={!keyInput.trim() || activating}
                >
                  {activating ? "Activating..." : "Activate"}
                </button>
              </div>
              <p className="pd-license-hint">
                Don't have a key? <button className="pd-link-btn" onClick={handleGenerateKey}>Generate a dev key</button>
              </p>
            </div>
          )}
        </div>

        {/* Plugin Cards */}
        <div className="pd-plugins">
          {/* Free Plugin */}
          <div className="pd-plugin-card">
            <div className="pd-plugin-badge pd-plugin-badge--free">Free</div>
            <h3 className="pd-plugin-name">SSF Connector</h3>
            <p className="pd-plugin-desc">Connect your WordPress site to SEO Rank Writer. Receive drafts with SEO meta fields, schema, and clean slugs.</p>
            <ul className="pd-plugin-features">
              <li>API key authentication</li>
              <li>Draft creation with SEO fields</li>
              <li>RankMath-style SEO meta box</li>
              <li>Schema JSON-LD output</li>
              <li>Open Graph + Twitter cards</li>
              <li>5 Elementor widgets</li>
            </ul>
            <button className="pd-btn pd-btn--primary pd-btn--full" onClick={() => handleDownload("free")}>
              Download Free Plugin
            </button>
          </div>

          {/* Pro Plugin */}
          <div className={`pd-plugin-card pd-plugin-card--pro ${!isPro ? "pd-plugin-card--locked" : ""}`}>
            <div className="pd-plugin-badge pd-plugin-badge--pro">Pro</div>
            <h3 className="pd-plugin-name">SSF Connector Pro</h3>
            <p className="pd-plugin-desc">Everything in Free plus advanced automation, bulk publishing, media features, and white-label settings.</p>
            <ul className="pd-plugin-features">
              <li>Everything in Free</li>
              <li>Advanced Elementor layouts</li>
              <li>Auto Elementor page builder</li>
              <li>Bulk publishing queue</li>
              <li>Image/video generation</li>
              <li>GSC/Analytics dashboard</li>
              <li>White-label settings</li>
              <li>Priority support</li>
            </ul>
            {isPro ? (
              <button className="pd-btn pd-btn--pro pd-btn--full" onClick={() => handleDownload("pro")}>
                Download Pro Plugin
              </button>
            ) : (
              <div className="pd-plugin-locked">
                <div className="pd-lock-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span>Activate a Pro license to download</span>
              </div>
            )}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="pd-install-card">
          <h2 className="pd-install-title">Installation Instructions</h2>
          <div className="pd-install-steps">
            <div className="pd-install-step">
              <span className="pd-install-num">1</span>
              <div>
                <strong>Download the plugin</strong>
                <p>Click the download button above to get the .zip file.</p>
              </div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">2</span>
              <div>
                <strong>Upload to WordPress</strong>
                <p>Go to <strong>Plugins &gt; Add New &gt; Upload Plugin</strong> in your WordPress admin. Select the .zip file and click Install Now.</p>
              </div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">3</span>
              <div>
                <strong>Activate the plugin</strong>
                <p>Click Activate after installation completes.</p>
              </div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">4</span>
              <div>
                <strong>Copy your API key</strong>
                <p>Go to <strong>SEO Rank Writer</strong> in your WordPress admin menu. Copy the API key shown on the settings page.</p>
              </div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">5</span>
              <div>
                <strong>Connect in the app</strong>
                <p>Open the <a href="/app">SEO Rank Writer app</a>, go to the WordPress tab, select SSF Plugin mode, paste your site URL and API key, then click Test Connection.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pd-footer">
        <div className="pd-wrap">
          <span className="pd-footer__brand">SEO Rank Writer</span>
          <span className="pd-footer__text">Generate. Publish. Rank.</span>
        </div>
      </footer>
    </div>
  );
}
