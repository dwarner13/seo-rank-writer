import { useState } from "react";
import "./LandingPage.css";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="lp-img-placeholder">
        <div className="lp-img-placeholder__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        </div>
        <span>Product screenshot coming soon</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className="lp-product-img" onError={() => setFailed(true)} loading="lazy" />;
}

export default function LandingPage() {
  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav__inner">
          <a href="/" className="lp-nav__logo">SEO Rank Writer</a>
          <div className="lp-nav__links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/plugins">Plugin</a>
            <a href="/backlinks">Backlinks</a>
            <a href="/report">SEO Report</a>
            <a href="#faq">FAQ</a>
            <a href="/app" className="lp-nav__cta">Open App</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero__badge">AI-Powered SEO Platform</div>
          <h1 className="lp-hero__h1">
            AI-Powered SEO Content<br />That Ranks, Converts, and<br />Publishes Itself
          </h1>
          <p className="lp-hero__sub">
            Generate full SEO articles, metadata, schema, images, and videos — then publish to WordPress in one click.
          </p>
          <div className="lp-hero__ctas">
            <a href="/app" className="lp-btn lp-btn--primary">Start Free Trial</a>
            <a href="#how" className="lp-btn lp-btn--outline">Watch Demo</a>
          </div>
          <div className="lp-hero__proof">
            <span className="lp-hero__dot" />
            Trusted by local businesses across North America
          </div>

          {/* Hero Product Preview */}
          <div className="lp-hero-preview">
            <div className="lp-browser-frame">
              <div className="lp-browser-dots">
                <span /><span /><span />
              </div>
              <ProductImage src="/marketing/dashboard-demo.png" alt="SEO Rank Writer Dashboard" />
            </div>
            <div className="lp-hero-badges">
              <span className="lp-hero-fbadge lp-hero-fbadge--green">SEO Score 72</span>
              <span className="lp-hero-fbadge lp-hero-fbadge--blue">WP Connected</span>
              <span className="lp-hero-fbadge lp-hero-fbadge--purple">Demo Project</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="lp-section lp-section--light">
        <div className="lp-wrap">
          <div className="lp-section__label">The Problem</div>
          <h2 className="lp-section__h2">SEO Shouldn't Be This Hard</h2>
          <p className="lp-section__intro">
            Most businesses know they need SEO. But the reality is painful.
          </p>
          <div className="lp-problems">
            {[
              { icon: "\u23F3", title: "Content takes forever", desc: "Writing one page takes days. Optimizing it takes longer. You need dozens of pages." },
              { icon: "\uD83D\uDD17", title: "No internal linking", desc: "You publish pages with zero links between them. Google can't understand your site structure." },
              { icon: "\uD83D\uDCC9", title: "Pages don't rank", desc: "Meta titles, descriptions, and schema get skipped. Pages sit at position 30+ with zero traffic." },
              { icon: "\uD83D\uDCB8", title: "Agencies are slow", desc: "You hire a freelancer or agency and wait 2-4 weeks for a single page. The ROI math doesn't work." },
            ].map((p, i) => (
              <div key={i} className="lp-problem-card">
                <div className="lp-problem-card__icon">{p.icon}</div>
                <h3 className="lp-problem-card__title">{p.title}</h3>
                <p className="lp-problem-card__desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section__label">The Solution</div>
          <h2 className="lp-section__h2">One Tool. Complete SEO Pages. Published in Minutes.</h2>
          <div className="lp-solutions">
            {[
              { icon: "\u26A1", title: "Generate SEO pages instantly", desc: "Full articles with H1-H3 headings, FAQ sections, CTAs, and natural keyword placement. Not thin AI content — real, rankable pages." },
              { icon: "\uD83D\uDD17", title: "Built-in internal linking", desc: "Fetches your sitemap, validates every URL, and selects relevant internal links with proper anchor text. No broken links." },
              { icon: "\uD83D\uDE80", title: "Auto-publish to WordPress", desc: "One click sends your page as a draft with SEO title, meta description, schema JSON-LD, and a clean URL slug." },
              { icon: "\uD83D\uDCCA", title: "Built-in SEO analytics", desc: "Connect Google Search Console. See clicks, keywords, CTR opportunities, and pages losing traffic — all in one dashboard." },
            ].map((s, i) => (
              <div key={i} className="lp-solution-card">
                <div className="lp-solution-card__icon">{s.icon}</div>
                <h3 className="lp-solution-card__title">{s.title}</h3>
                <p className="lp-solution-card__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="lp-section lp-section--dark" id="how">
        <div className="lp-wrap">
          <div className="lp-section__label lp-section__label--light">How It Works</div>
          <h2 className="lp-section__h2 lp-section__h2--light">Three Steps to Rankable Pages</h2>
          <div className="lp-hiw-cards">
            <div className="lp-hiw-card">
              <div className="lp-hiw-card__num">1</div>
              <h3 className="lp-hiw-card__title">Generate SEO Content</h3>
              <p className="lp-hiw-card__desc">Enter your keyword and location. AI creates a full article, meta tags, schema, social posts, and media prompts.</p>
              <div className="lp-hiw-card__img">
                <ProductImage src="/marketing/article-generator-demo.png" alt="SEO Content Generator" />
              </div>
            </div>
            <div className="lp-hiw-card">
              <div className="lp-hiw-card__num">2</div>
              <h3 className="lp-hiw-card__title">Optimize with SEO Score</h3>
              <p className="lp-hiw-card__desc">Real-time scoring across 6 categories: content, metadata, schema, internal links, GSC, and WordPress readiness.</p>
              <div className="lp-hiw-card__img">
                <ProductImage src="/marketing/dashboard-demo.png" alt="SEO Score Dashboard" />
              </div>
            </div>
            <div className="lp-hiw-card">
              <div className="lp-hiw-card__num">3</div>
              <h3 className="lp-hiw-card__title">Publish to WordPress</h3>
              <p className="lp-hiw-card__desc">One click sends your page as a draft with all SEO fields filled — title, description, slug, schema, Open Graph.</p>
              <div className="lp-hiw-card__img">
                <ProductImage src="/marketing/wordpress-publish-demo.png" alt="WordPress Publishing" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Media Engine Feature ── */}
      <section className="lp-section lp-section--light">
        <div className="lp-wrap">
          <div className="lp-showcase">
            <div className="lp-showcase__text">
              <div className="lp-section__label">Media Engine</div>
              <h2 className="lp-section__h2">AI Images &amp; Video Prompts Built In</h2>
              <p className="lp-showcase__desc">Create SEO content, social posts, image ideas, and video scenes from one local keyword. Featured images, social squares, story covers, 3-scene storyboards, and Sora-ready video prompts.</p>
              <a href="/app" className="lp-btn lp-btn--primary" style={{ marginTop: 16 }}>Try Media Engine</a>
            </div>
            <div className="lp-showcase__img">
              <ProductImage src="/marketing/media-engine-demo.png" alt="Media Engine" />
            </div>
          </div>
        </div>
      </section>

      {/* ── WordPress Publishing Feature ── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-showcase lp-showcase--reverse">
            <div className="lp-showcase__text">
              <div className="lp-section__label">WordPress</div>
              <h2 className="lp-section__h2">Publish SEO Pages to WordPress in One Click</h2>
              <p className="lp-showcase__desc">Send content, meta title, description, schema, SEO score, and all fields directly to your WordPress site as a draft. Our plugin saves everything — ready to review and publish.</p>
              <a href="/plugins" className="lp-btn lp-btn--outline" style={{ marginTop: 16 }}>Get the Plugin</a>
            </div>
            <div className="lp-showcase__img">
              <ProductImage src="/marketing/wordpress-publish-demo.png" alt="WordPress Publishing" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-section__label">Features</div>
          <h2 className="lp-section__h2">Everything You Need to Rank</h2>
          <div className="lp-features">
            {[
              { icon: "\uD83D\uDCDD", title: "SEO Content Generator", desc: "Full articles with heading structure, FAQ sections, CTAs, and natural keyword density. Adjustable word count, tone, and page type." },
              { icon: "\uD83D\uDD17", title: "Internal Linking System", desc: "Fetches your sitemap, validates URLs, selects relevant links with anchor text. Strips unapproved links automatically." },
              { icon: "\uD83C\uDF10", title: "WordPress Publishing", desc: "SSF Connector plugin creates drafts with all meta fields. RankMath-style SEO panel in the editor. Clean keyword-based slugs." },
              { icon: "\uD83C\uDFF7\uFE0F", title: "SEO Meta + Schema", desc: "Meta title, description, Open Graph, Twitter cards, and JSON-LD schema. LocalBusiness, Service, FAQPage, Article schemas." },
              { icon: "\uD83D\uDCCA", title: "Search Console Analytics", desc: "Top pages, top keywords, CTR opportunities, striking distance keywords, and pages losing traffic. All in one dashboard." },
              { icon: "\uD83C\uDFA5", title: "Media Generator", desc: "AI image prompts, video storyboards, vertical and horizontal Sora-ready prompts, text overlays, and CTA endings." },
              { icon: "\uD83D\uDCF1", title: "Social Media Content", desc: "Facebook, Instagram, LinkedIn, TikTok content from your article. 10 hashtags, image prompts, and video concepts." },
              { icon: "\uD83D\uDCCD", title: "Google Business Profile", desc: "Update posts, offer posts, and CTA posts generated automatically. Ready to paste into your GBP dashboard." },
            ].map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Offer ── */}
      <section className="lp-section lp-section--light">
        <div className="lp-wrap">
          <div className="lp-section__label">Done for You</div>
          <h2 className="lp-section__h2">We'll Build Your Pages</h2>
          <p className="lp-section__intro">
            Not every business owner has time to run a tool. We'll generate, optimize, and publish SEO pages to your WordPress site.
          </p>
          <div className="lp-services">
            {[
              { name: "Single Page", price: "$150", desc: "One fully optimized SEO page with meta fields, schema, and internal links." },
              { name: "5-Page Package", price: "$600", per: "$120/page", desc: "Five pages with internal linking strategy connecting all pages together.", popular: false },
              { name: "10-Page Package", price: "$1,000", per: "$100/page", desc: "Ten pages with full linking, schema, social content, and GBP posts.", popular: true },
              { name: "Monthly Retainer", price: "$800/mo", desc: "Four new pages/month, ongoing linking, Search Console reporting, content refreshes." },
            ].map((s, i) => (
              <div key={i} className={`lp-service-card${s.popular ? " lp-service-card--popular" : ""}`}>
                {s.popular && <div className="lp-service-card__badge">Most Popular</div>}
                <h3 className="lp-service-card__name">{s.name}</h3>
                <div className="lp-service-card__price">{s.price}</div>
                {s.per && <div className="lp-service-card__per">{s.per}</div>}
                <p className="lp-service-card__desc">{s.desc}</p>
                <a href="#" className="lp-btn lp-btn--sm">Get a Quote</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SaaS Pricing ── */}
      <section className="lp-section" id="pricing">
        <div className="lp-wrap">
          <div className="lp-section__label">SaaS Pricing</div>
          <h2 className="lp-section__h2">Or Use the Tool Yourself</h2>
          <div className="lp-pricing">
            <div className="lp-price-card">
              <h3 className="lp-price-card__name">Free</h3>
              <div className="lp-price-card__price">$0</div>
              <div className="lp-price-card__period">forever</div>
              <ul className="lp-price-card__list">
                <li>3 pages per month</li>
                <li>SEO content generator</li>
                <li>Meta tags and schema</li>
                <li>CSV export</li>
              </ul>
              <a href="/app" className="lp-btn lp-btn--outline lp-btn--full">Start Free</a>
            </div>
            <div className="lp-price-card lp-price-card--featured">
              <div className="lp-price-card__badge">Best Value</div>
              <h3 className="lp-price-card__name">Pro</h3>
              <div className="lp-price-card__price">$29</div>
              <div className="lp-price-card__period">per month</div>
              <ul className="lp-price-card__list">
                <li>Unlimited pages</li>
                <li>WordPress publishing</li>
                <li>Internal linking system</li>
                <li>Search Console analytics</li>
                <li>Media generator</li>
                <li>Priority support</li>
              </ul>
              <a href="/app" className="lp-btn lp-btn--primary lp-btn--full">Get Started</a>
            </div>
            <div className="lp-price-card">
              <h3 className="lp-price-card__name">Agency</h3>
              <div className="lp-price-card__price">$79</div>
              <div className="lp-price-card__period">per month</div>
              <ul className="lp-price-card__list">
                <li>Everything in Pro</li>
                <li>5 WordPress sites</li>
                <li>White-label exports</li>
                <li>Team access (3 seats)</li>
                <li>Bulk generation queue</li>
              </ul>
              <a href="/app" className="lp-btn lp-btn--outline lp-btn--full">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="lp-section lp-section--dark">
        <div className="lp-wrap">
          <h2 className="lp-section__h2 lp-section__h2--light">Trusted by Local Businesses</h2>
          <div className="lp-testimonials">
            {[
              { quote: "We went from 0 to 47 indexed pages in 6 weeks. Every page was published with proper schema and internal links. Our organic traffic tripled.", author: "Local service business owner" },
              { quote: "I used to spend $2,000/month on an agency that delivered 4 blog posts. Now I generate and publish a full SEO page in 15 minutes.", author: "Small business operator" },
              { quote: "The internal linking feature alone is worth it. I had 200 pages with zero links between them. Now every page connects to the right related pages.", author: "WordPress site owner" },
            ].map((t, i) => (
              <div key={i} className="lp-testimonial">
                <p className="lp-testimonial__quote">"{t.quote}"</p>
                <div className="lp-testimonial__author">— {t.author}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" id="faq">
        <div className="lp-wrap">
          <div className="lp-section__label">FAQ</div>
          <h2 className="lp-section__h2">Frequently Asked Questions</h2>
          <div className="lp-faq">
            {[
              { q: "Do I need technical knowledge to use this?", a: "No. Enter your keyword and business info, click generate, click send to WordPress. The tool handles heading structure, meta tags, schema, and internal linking automatically." },
              { q: "Does this work with any WordPress site?", a: "Yes. Install the free SSF Connector plugin and connect with an API key. Works with any theme and alongside existing plugins like RankMath or Yoast." },
              { q: "Is the content unique?", a: "Yes. Every page is generated fresh from your specific keyword, location, and business context. No templates, no spinning, no duplicate content." },
              { q: "Can I edit the content before publishing?", a: "Yes. Pages are sent as drafts. You can edit everything in WordPress before publishing — the SEO panel lets you adjust the title, description, slug, and schema right in the editor." },
              { q: "What if I already have RankMath or Yoast?", a: "The SSF plugin works alongside them. It saves to its own meta fields and outputs its own head tags. You can use both during transition." },
              { q: "Do you offer refunds?", a: "Yes. 14-day money-back guarantee on all plans. If the tool doesn't work for your workflow, we'll refund you." },
            ].map((faq, i) => (
              <details key={i} className="lp-faq__item">
                <summary className="lp-faq__q">{faq.q}</summary>
                <p className="lp-faq__a">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-final">
        <div className="lp-wrap">
          <h2 className="lp-cta-final__h2">Stop Publishing Pages That Don't Rank</h2>
          <p className="lp-cta-final__sub">
            Every day without proper SEO is traffic going to your competitors. Start generating optimized pages now — or let us build them for you.
          </p>
          <div className="lp-hero__ctas">
            <a href="/app" className="lp-btn lp-btn--primary lp-btn--lg">Get Started Free</a>
            <a href="#" className="lp-btn lp-btn--outline lp-btn--outline-light lp-btn--lg">Book a Done-for-You Call</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer__inner">
            <div className="lp-footer__brand">SEO Rank Writer</div>
            <div className="lp-footer__text">Generate. Publish. Rank.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
