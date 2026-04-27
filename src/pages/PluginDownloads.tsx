import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { usePlan } from "../lib/PlanContext";
import "./PluginDownloads.css";

export default function PluginDownloads() {
  const { user, enabled: authEnabled } = useAuth();
  const { plan } = usePlan();
  const [downloadStarted, setDownloadStarted] = useState(false);

  const isPro = plan === "pro" || plan === "agency";

  function handleDownload() {
    setDownloadStarted(true);
    // Direct download from public folder
    window.location.href = "/seo-rank-writer-plugin.zip";
    setTimeout(() => setDownloadStarted(false), 3000);
  }

  return (
    <div className="pd">
      <nav className="pd-nav">
        <div className="pd-nav__inner">
          <a href="/" className="pd-nav__logo"><img src="/logo.png" alt="SEO Rank Writer Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" as const }} /> SEO Rank Writer</a>
          <div className="pd-nav__links">
            <a href="/app">Open App</a>
            <a href="/">Home</a>
          </div>
        </div>
      </nav>

      <div className="pd-wrap">
        <div className="pd-header">
          <h1 className="pd-header__title">WordPress Plugin</h1>
          <p className="pd-header__sub">Download the SEO Rank Writer connector plugin to publish SEO content directly to WordPress.</p>
        </div>

        {/* Plan Status */}
        <div className="pd-license-card">
          <div className="pd-license-header">
            <h2 className="pd-license-title">Your Plan</h2>
            <span className={`pd-license-badge ${isPro ? "pd-license-badge--pro" : "pd-license-badge--free"}`}>
              {plan === "agency" ? "Agency" : isPro ? "Pro" : "Free"}
            </span>
          </div>
          {authEnabled && user ? (
            <div className="pd-license-row">
              <span className="pd-license-label">Account</span>
              <span className="pd-license-value">{user.email}</span>
            </div>
          ) : (
            <p style={{ fontSize: "0.88rem", color: "#64748b" }}>
              <a href="/login" style={{ color: "#6366f1", fontWeight: 600 }}>Sign in</a> to see your plan and access Pro features.
            </p>
          )}
        </div>

        {/* Plugin Download */}
        <div className="pd-plugins">
          <div className="pd-plugin-card">
            <div className="pd-plugin-badge pd-plugin-badge--free">WordPress Plugin</div>
            <h3 className="pd-plugin-name">SEO Rank Writer Connector</h3>
            <p className="pd-plugin-desc">Connect your WordPress site to SEO Rank Writer. Receive drafts with SEO meta fields, schema, and clean slugs.</p>
            <ul className="pd-plugin-features">
              <li>API key authentication</li>
              <li>Draft creation with SEO fields</li>
              <li>RankMath-style SEO meta box</li>
              <li>Schema JSON-LD output</li>
              <li>Open Graph + Twitter cards</li>
              <li>SEO score display</li>
              <li>6 Elementor widgets</li>
            </ul>
            <button className="pd-btn pd-btn--primary pd-btn--full" onClick={handleDownload}>
              {downloadStarted ? "Downloading..." : "Download Plugin (.zip)"}
            </button>
          </div>

          <div className="pd-plugin-card">
            <div className="pd-plugin-badge pd-plugin-badge--pro">Pro Features</div>
            <h3 className="pd-plugin-name">Included with Growth &amp; Domination</h3>
            <p className="pd-plugin-desc">Pro plan subscribers get access to all plugin features plus advanced automation.</p>
            <ul className="pd-plugin-features">
              <li>Everything in free plugin</li>
              <li>Auto Elementor page layouts</li>
              <li>Bulk publishing queue</li>
              <li>Advanced SEO score breakdown</li>
              <li>White-label settings</li>
              <li>Priority support</li>
            </ul>
            {isPro ? (
              <div style={{ padding: "10px 0", color: "#16a34a", fontWeight: 600, fontSize: "0.88rem" }}>Included in your {plan} plan</div>
            ) : (
              <a href="/#pricing" className="pd-btn pd-btn--pro pd-btn--full">Upgrade to Pro</a>
            )}
          </div>
        </div>

        {/* Installation */}
        <div className="pd-install-card">
          <h2 className="pd-install-title">Installation Instructions</h2>
          <div className="pd-install-steps">
            <div className="pd-install-step">
              <span className="pd-install-num">1</span>
              <div><strong>Download the plugin</strong><p>Click the download button above to get the .zip file.</p></div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">2</span>
              <div><strong>Upload to WordPress</strong><p>Go to <strong>Plugins &gt; Add New &gt; Upload Plugin</strong> in your WordPress admin. Select the .zip file and click Install Now.</p></div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">3</span>
              <div><strong>Activate the plugin</strong><p>Click Activate after installation completes.</p></div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">4</span>
              <div><strong>Copy your API key</strong><p>Go to <strong>SEO Rank Writer</strong> in your WordPress admin menu. Copy the API key shown on the settings page.</p></div>
            </div>
            <div className="pd-install-step">
              <span className="pd-install-num">5</span>
              <div><strong>Connect in the app</strong><p>Open the <a href="/app">SEO Rank Writer app</a>, go to the WordPress tab, select SSF Plugin mode, paste your site URL and API key, then click Test Connection.</p></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="pd-footer">
        <div className="pd-wrap">
          <span className="pd-footer__brand">SEO Rank Writer</span>
          <span className="pd-footer__text">Generate. Publish. Rank.</span>
        </div>
      </footer>
    </div>
  );
}
