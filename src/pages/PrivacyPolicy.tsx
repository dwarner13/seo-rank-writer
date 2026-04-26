import "./LegalPages.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal">
      <nav className="legal-nav">
        <div className="legal-nav__inner">
          <a href="/" className="legal-nav__logo"><img src="/logo.png" alt="SEO Rank Writer Logo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" as const }} /> SEO Rank Writer</a>
          <div className="legal-nav__links">
            <a href="/app">Open App</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </nav>

      <div className="legal-wrap">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: April 26, 2026</p>

        <p>SEO Rank Writer ("we", "our", "us") operates the website <a href="https://seorankwriter.com">seorankwriter.com</a> and the SEO Rank Writer application (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li><strong>Email address</strong> — provided during signup or via Google login</li>
          <li><strong>Name</strong> — if provided in your profile or Google account</li>
          <li><strong>Authentication data</strong> — managed by Supabase (our authentication provider)</li>
        </ul>

        <h3>1.2 Usage Data</h3>
        <p>We automatically collect:</p>
        <ul>
          <li>Number of articles generated per month</li>
          <li>Features used (content generation, WordPress publishing, media engine)</li>
          <li>Timestamps of account activity</li>
          <li>Browser type, device type, and IP address (via server logs)</li>
        </ul>

        <h3>1.3 Generated Content</h3>
        <p>We store content you create through the Service, including:</p>
        <ul>
          <li>SEO articles, meta titles, meta descriptions, and schema markup</li>
          <li>Social media posts and media prompts</li>
          <li>Internal link configurations and sitemap data</li>
          <li>Project settings (business name, website URL, keywords, service area)</li>
        </ul>

        <h3>1.4 Third-Party Service Data</h3>
        <p>If you connect external services, we may access:</p>
        <ul>
          <li><strong>Google Search Console</strong> — search performance data (clicks, impressions, keywords, pages) for sites you authorize</li>
          <li><strong>WordPress</strong> — site URL and authentication credentials (stored encrypted) to publish content on your behalf</li>
        </ul>

        <h3>1.5 Payment Information</h3>
        <p>Payment processing is handled entirely by Stripe. We do not store credit card numbers, bank account details, or full payment credentials. We receive from Stripe:</p>
        <ul>
          <li>Subscription status (active, canceled, past due)</li>
          <li>Customer ID and subscription ID</li>
          <li>Billing period dates</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service</li>
          <li>Process your transactions and manage subscriptions</li>
          <li>Generate and store SEO content on your behalf</li>
          <li>Connect to third-party services you authorize (Google Search Console, WordPress)</li>
          <li>Monitor usage to enforce plan limits (free, pro, agency)</li>
          <li>Send service-related communications (account verification, subscription updates)</li>
          <li>Improve the Service based on usage patterns</li>
          <li>Detect and prevent fraud, abuse, or violations of our Terms of Service</li>
        </ul>

        <h2>3. Third-Party Services</h2>
        <p>We use the following third-party services that may process your data:</p>

        <table className="legal-table">
          <thead>
            <tr><th>Service</th><th>Purpose</th><th>Privacy Policy</th></tr>
          </thead>
          <tbody>
            <tr><td>Supabase</td><td>Authentication, database storage</td><td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></td></tr>
            <tr><td>Stripe</td><td>Payment processing, subscriptions</td><td><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></td></tr>
            <tr><td>Google</td><td>OAuth login, Search Console API</td><td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></td></tr>
            <tr><td>Anthropic (Claude)</td><td>AI content generation</td><td><a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a></td></tr>
            <tr><td>Netlify</td><td>Hosting, serverless functions</td><td><a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener noreferrer">netlify.com/privacy</a></td></tr>
          </tbody>
        </table>

        <h2>4. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies for:</p>
        <ul>
          <li><strong>Authentication</strong> — Session cookies to keep you logged in (essential, cannot be disabled)</li>
          <li><strong>Preferences</strong> — Storing your project settings and UI preferences in local storage</li>
          <li><strong>Analytics</strong> — We may use privacy-friendly analytics to understand how the Service is used. We do not sell your data to advertisers.</li>
        </ul>
        <p>You can control cookies through your browser settings. Disabling essential cookies may prevent you from using parts of the Service.</p>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Account data</strong> — Retained as long as your account is active</li>
          <li><strong>Generated content</strong> — Retained as long as your account is active or until you delete it</li>
          <li><strong>Usage data</strong> — Retained for up to 24 months for service improvement</li>
          <li><strong>Payment records</strong> — Retained as required by law (typically 7 years)</li>
        </ul>
        <p>After account deletion, we will remove your personal data within 30 days, except where retention is required by law.</p>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
          <li><strong>Correction</strong> — Request correction of inaccurate data</li>
          <li><strong>Deletion</strong> — Request deletion of your account and associated data</li>
          <li><strong>Export</strong> — Request a machine-readable export of your data</li>
          <li><strong>Objection</strong> — Object to certain processing of your data</li>
          <li><strong>Withdraw consent</strong> — Withdraw consent for optional data processing at any time</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:support@seorankwriter.com">support@seorankwriter.com</a>.</p>

        <h2>7. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>Encrypted data transmission (HTTPS/TLS)</li>
          <li>Row-level security on all database tables (users can only access their own data)</li>
          <li>Encrypted storage of sensitive credentials (WordPress passwords, API keys)</li>
          <li>Secure authentication via Supabase with support for multi-factor authentication</li>
        </ul>
        <p>No method of transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>

        <h2>8. Children's Privacy</h2>
        <p>The Service is not intended for users under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 16, we will delete it promptly.</p>

        <h2>9. International Data Transfers</h2>
        <p>Your data may be processed in countries other than your own, including the United States and Canada. By using the Service, you consent to the transfer of your data to these countries. We ensure that appropriate safeguards are in place for international transfers.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

        <h2>11. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or your data, contact us at:</p>
        <p>
          <strong>SEO Rank Writer</strong><br />
          Email: <a href="mailto:support@seorankwriter.com">support@seorankwriter.com</a><br />
          Website: <a href="https://seorankwriter.com">seorankwriter.com</a>
        </p>
      </div>

      <footer className="legal-footer">
        <div className="legal-wrap">
          <span>SEO Rank Writer</span>
          <span>Generate. Publish. Rank.</span>
        </div>
      </footer>
    </div>
  );
}
