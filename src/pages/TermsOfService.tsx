import "./LegalPages.css";

export default function TermsOfService() {
  return (
    <div className="legal">
      <nav className="legal-nav">
        <div className="legal-nav__inner">
          <a href="/" className="legal-nav__logo">SEO Rank Writer</a>
          <div className="legal-nav__links">
            <a href="/app">Open App</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </nav>

      <div className="legal-wrap">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: April 26, 2026</p>

        <p>These Terms of Service ("Terms") govern your access to and use of SEO Rank Writer ("the Service"), operated by SEO Rank Writer ("we", "our", "us"). By creating an account or using the Service, you agree to these Terms.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the Service, you confirm that you are at least 16 years old and agree to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>. If you do not agree to these Terms, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>SEO Rank Writer is an AI-powered SaaS platform that enables users to:</p>
        <ul>
          <li>Generate SEO-optimized articles, metadata, and schema markup using artificial intelligence</li>
          <li>Create social media content, image prompts, and video storyboards</li>
          <li>Manage internal linking strategies</li>
          <li>Publish content directly to WordPress sites</li>
          <li>Analyze search performance via Google Search Console integration</li>
          <li>Track SEO scores and content performance</li>
        </ul>

        <h2>3. Account Registration</h2>
        <ul>
          <li>You must provide a valid email address to create an account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must not share your account with others or allow unauthorized access.</li>
          <li>You must notify us immediately if you suspect unauthorized use of your account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>

        <h2>4. Subscription Plans and Payments</h2>

        <h3>4.1 Plans</h3>
        <p>The Service offers the following plans:</p>
        <ul>
          <li><strong>Free</strong> — Limited features, 3 article generations per month</li>
          <li><strong>Pro ($29/month)</strong> — Full features, 100 articles per month, WordPress publishing, media engine, GSC analytics</li>
          <li><strong>Agency ($79/month)</strong> — Everything in Pro, plus multiple sites, team access, and bulk generation</li>
        </ul>

        <h3>4.2 Billing</h3>
        <ul>
          <li>Paid subscriptions are billed monthly through Stripe.</li>
          <li>Your subscription renews automatically unless you cancel before the renewal date.</li>
          <li>Prices are in USD and may be subject to applicable taxes.</li>
          <li>We reserve the right to change pricing with 30 days' notice to existing subscribers.</li>
        </ul>

        <h3>4.3 Refunds</h3>
        <ul>
          <li>We offer a 14-day money-back guarantee on all paid plans.</li>
          <li>To request a refund, contact <a href="mailto:support@seorankwriter.com">support@seorankwriter.com</a> within 14 days of your initial subscription.</li>
          <li>Refunds are not available after the 14-day period or for renewal payments.</li>
          <li>Refunds are processed through Stripe and may take 5-10 business days to appear.</li>
        </ul>

        <h3>4.4 Cancellation</h3>
        <ul>
          <li>You may cancel your subscription at any time through the Account Settings page or Stripe Customer Portal.</li>
          <li>Upon cancellation, you retain access to paid features until the end of your current billing period.</li>
          <li>After the billing period ends, your account reverts to the Free plan.</li>
          <li>Your data is retained after cancellation. You can delete it by contacting us.</li>
        </ul>

        <h2>5. Acceptable Use</h2>
        <p>You agree NOT to use the Service to:</p>
        <ul>
          <li>Generate content that is illegal, defamatory, threatening, or harassing</li>
          <li>Create spam, phishing content, or misleading material</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Generate content designed to deceive search engines through black-hat SEO techniques</li>
          <li>Attempt to reverse-engineer, decompile, or exploit the Service</li>
          <li>Use automated tools or bots to access the Service beyond normal usage</li>
          <li>Share, resell, or redistribute the Service without written permission</li>
          <li>Use the Service to generate content that promotes violence, hate, or discrimination</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that violate these guidelines without notice or refund.</p>

        <h2>6. AI-Generated Content</h2>

        <h3>6.1 Content Ownership</h3>
        <p>Content generated through the Service belongs to you. You retain full ownership and rights to all content you create using the Service, subject to these Terms.</p>

        <h3>6.2 Content Accuracy</h3>
        <ul>
          <li>Content is generated by artificial intelligence and may contain errors, inaccuracies, or outdated information.</li>
          <li>You are responsible for reviewing, editing, and verifying all generated content before publishing.</li>
          <li>We do not guarantee that generated content will achieve specific search rankings or business results.</li>
          <li>We are not liable for any consequences of publishing AI-generated content without review.</li>
        </ul>

        <h3>6.3 Content Storage</h3>
        <p>Generated content is stored in our database for your access. We do not use your generated content to train AI models or share it with other users.</p>

        <h2>7. Third-Party Integrations</h2>
        <ul>
          <li><strong>WordPress</strong> — When you connect your WordPress site, you authorize us to create draft posts/pages on your behalf. You are responsible for reviewing and publishing content.</li>
          <li><strong>Google Search Console</strong> — When you connect GSC, you authorize us to read your search performance data. We do not modify your Google account or search settings.</li>
          <li><strong>Stripe</strong> — Payment processing is handled by Stripe. Your use of Stripe is subject to <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer">Stripe's Terms of Service</a>.</li>
        </ul>
        <p>We are not responsible for the availability, accuracy, or performance of third-party services.</p>

        <h2>8. Intellectual Property</h2>
        <ul>
          <li>The Service, including its design, code, features, and branding, is owned by SEO Rank Writer and protected by intellectual property laws.</li>
          <li>You may not copy, modify, distribute, or create derivative works of the Service without written permission.</li>
          <li>The SEO Rank Writer name, logo, and associated marks are trademarks of SEO Rank Writer.</li>
        </ul>

        <h2>9. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
        <ul>
          <li>The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied.</li>
          <li>We do not warrant that the Service will be uninterrupted, error-free, or secure.</li>
          <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages.</li>
          <li>Our total liability for any claim arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</li>
          <li>We are not liable for any loss of data, revenue, or business opportunities resulting from your use of the Service.</li>
        </ul>

        <h2>10. Indemnification</h2>
        <p>You agree to indemnify and hold harmless SEO Rank Writer, its officers, employees, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:</p>
        <ul>
          <li>Your use of the Service</li>
          <li>Content you generate, publish, or distribute using the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
        </ul>

        <h2>11. Service Availability</h2>
        <ul>
          <li>We strive for high availability but do not guarantee 100% uptime.</li>
          <li>We may perform maintenance, updates, or modifications that temporarily affect availability.</li>
          <li>We reserve the right to modify, suspend, or discontinue the Service (or any part of it) with reasonable notice.</li>
        </ul>

        <h2>12. Termination</h2>
        <ul>
          <li>You may terminate your account at any time by contacting us or deleting your account.</li>
          <li>We may terminate or suspend your account for violations of these Terms.</li>
          <li>Upon termination, your right to use the Service ceases immediately.</li>
          <li>Sections 6, 8, 9, 10, and 14 survive termination.</li>
        </ul>

        <h2>13. Changes to Terms</h2>
        <p>We may update these Terms from time to time. We will notify you of material changes by posting updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by the laws of the Province of British Columbia, Canada, without regard to conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of British Columbia, Canada.</p>

        <h2>15. Contact Us</h2>
        <p>If you have questions about these Terms of Service, contact us at:</p>
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
