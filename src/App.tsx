import { useState, useEffect, useCallback, useRef } from "react";
import type { GeneratedContent, PageType, WordCount, Tone } from "./types";
import { generateContent, generateKeywords, humanizeArticle, generateInternalLinks, fetchSitemapUrls, regenerateField, validateUrls } from "./services/api";
import type { UrlValidationResult } from "./services/api";
import { downloadCsv } from "./services/csvExport";
import { buildWordPressPayload, sendToWordPress, testWordPressConnection } from "./services/wordpress";
import type { WordPressConfig } from "./services/wordpress";
import { generateFeaturedImagePrompt, generateSocialImagePrompts, generateVideoPlan } from "./services/media";
import OutputCard from "./components/OutputCard";
import SeoScore from "./components/SeoScore";
import SeoAnalytics from "./components/SeoAnalytics";
import MediaGenerator from "./components/MediaGenerator";
import type { VideoPromptSet } from "./types";
import type { ImagePromptSet } from "./services/media";
import { useAuth } from "./lib/AuthContext";
import "./App.css";

const STORAGE_KEY = "seo-content-factory-state";
const WP_CREDS_KEY = "seo-content-factory-wp-creds";
const SETTINGS_KEY = "seo-content-factory-settings";

interface AppSettings {
  phone: string;
  email: string;
  serviceArea: string;
  defaultKeyword: string;
  brandTone: string;
  socialFacebook: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialTiktok: string;
  gscProperty: string;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { phone: "", email: "", serviceArea: "", defaultKeyword: "", brandTone: "professional", socialFacebook: "", socialInstagram: "", socialLinkedin: "", socialTiktok: "", gscProperty: "" };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

type Tab = "dashboard" | "article" | "metadata" | "schema" | "social" | "gbp" | "media" | "mediagen" | "score" | "wordpress" | "analytics" | "settings" | "insights";

const SIDEBAR_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "\u2302" },
  { key: "article", label: "SEO Article", icon: "\uD83D\uDCDD" },
  { key: "metadata", label: "Metadata", icon: "\uD83C\uDFF7\uFE0F" },
  { key: "schema", label: "Schema", icon: "\u007B\u007D" },
  { key: "social", label: "Social Posts", icon: "\uD83D\uDCF1" },
  { key: "gbp", label: "GBP Posts", icon: "\uD83D\uDCCD" },
  { key: "mediagen", label: "Media Engine", icon: "\uD83C\uDFA5" },
  { key: "insights", label: "Insights", icon: "\uD83D\uDCC8" },
  { key: "analytics", label: "SEO Analytics", icon: "\uD83D\uDCCA" },
  { key: "wordpress", label: "WordPress", icon: "\uD83C\uDF10" },
  { key: "score", label: "SEO Score", icon: "\u2713" },
  { key: "settings", label: "Settings", icon: "\u2699" },
];

// Keep old TABS for backward compat
const TABS = SIDEBAR_ITEMS.filter(s => s.key !== "dashboard");

interface SavedState {
  businessName: string;
  websiteUrl: string;
  pageType: PageType;
  mainKeyword: string;
  location: string;
  secondaryKeywords: string;
  internalLinks: string;
  externalLinks: string;
  wordCount: WordCount;
  tone: Tone;
  customInstructions: string;
  existingArticle: string;
  sitemapUrls: string;
  result: GeneratedContent | null;
  wpSiteUrl?: string;
  wpUsername?: string;
  videoPrompts?: VideoPromptSet | null;
  imagePrompts?: ImagePromptSet | null;
}

function loadSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function generateGbpContent(opts: { businessName: string; mainKeyword: string; location: string; tone: Tone }): Pick<GeneratedContent, "gbpUpdate" | "gbpOffer" | "gbpCta" | "gbpImagePrompt" | "gbpButtonText"> {
  const biz = opts.businessName || "Our Business";
  const kw = opts.mainKeyword || "our services";
  const loc = opts.location || "your area";

  const toneOpener: Record<Tone, string> = {
    professional: `${biz} is proud to offer`,
    friendly: `Hey ${loc}! ${biz} is here to help with`,
    "local-expert": `As ${loc}'s trusted experts, ${biz} offers`,
    sales: `LIMITED TIME — ${biz} is offering`,
    trust: `For years, ${biz} has been the name ${loc} trusts for`,
  };

  const opener = toneOpener[opts.tone] || toneOpener.professional;

  return {
    gbpUpdate: `${opener} ${kw} in ${loc}.\n\nWhether you need quick service or a free consultation, our team is ready to help. We serve all of ${loc} and surrounding areas with fast, reliable results.\n\nContact us today to learn more!`,
    gbpOffer: `SPECIAL OFFER: Get a free quote for ${kw} in ${loc}!\n\n${biz} is running a limited-time promotion for ${loc} residents. Don't miss out — reach out today and save.\n\nMention this post when you call for your exclusive deal.`,
    gbpCta: `Need ${kw} in ${loc}? ${biz} makes it easy.\n\nStep 1: Call us or fill out our online form\nStep 2: Get your free, no-obligation quote\nStep 3: We handle the rest — fast and hassle-free\n\nCall now and let's get started!`,
    gbpImagePrompt: `Professional photo of a ${biz} team member helping a customer in ${loc}. Clean, well-lit, showing the business storefront or service vehicle. Friendly and trustworthy atmosphere. Include branding elements. Realistic photography style, 4:3 aspect ratio suitable for Google Business Profile.`,
    gbpButtonText: "Call Now",
  };
}

function App() {
  const { user, signOut, enabled: authEnabled } = useAuth();
  const saved = loadSaved();
  const restoredFromSave = !!saved;

  const [businessName, setBusinessName] = useState(saved?.businessName ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(saved?.websiteUrl ?? "");
  const [pageType, setPageType] = useState<PageType>(saved?.pageType ?? "location");
  const [mainKeyword, setMainKeyword] = useState(saved?.mainKeyword ?? "");
  const [location, setLocation] = useState(saved?.location ?? "");
  const [secondaryKeywords, setSecondaryKeywords] = useState(saved?.secondaryKeywords ?? "");
  const [sitemapUrls, setSitemapUrls] = useState(saved?.sitemapUrls ?? "");
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [urlValidation, setUrlValidation] = useState<UrlValidationResult[]>([]);
  const [urlValidating, setUrlValidating] = useState(false);
  const [internalLinks, setInternalLinks] = useState(saved?.internalLinks ?? "");
  const [externalLinks, setExternalLinks] = useState(saved?.externalLinks ?? "");
  const [wordCount, setWordCount] = useState<WordCount>(saved?.wordCount ?? "1200");
  const [tone, setTone] = useState<Tone>(saved?.tone ?? "professional");
  const [customInstructions, setCustomInstructions] = useState(saved?.customInstructions ?? "");
  const [existingArticle, setExistingArticle] = useState(saved?.existingArticle ?? "");

  const [result, setResult] = useState<GeneratedContent | null>(() => {
    if (!saved?.result) return null;
    let r = saved.result;
    // Backfill GBP fields for results saved before this feature existed
    if (!r.gbpUpdate) {
      const gbp = generateGbpContent({
        businessName: saved.businessName,
        mainKeyword: saved.mainKeyword,
        location: saved.location,
        tone: saved.tone,
      });
      r = { ...r, ...gbp };
    }
    // Backfill media fields
    if (!r.featuredImagePrompt) {
      const ctx = { businessName: saved.businessName, mainKeyword: saved.mainKeyword, location: saved.location, pageType: saved.pageType, tone: saved.tone };
      r = { ...r, featuredImagePrompt: generateFeaturedImagePrompt(ctx), socialImagePrompts: generateSocialImagePrompts(ctx), videoPlan: generateVideoPlan(ctx) };
    }
    return r;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kwLoading, setKwLoading] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(restoredFromSave ? "Restored from last session" : "");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // WordPress
  const [wpSiteUrl, setWpSiteUrl] = useState(() => {
    if (saved?.wpSiteUrl) return saved.wpSiteUrl;
    try { const c = localStorage.getItem(WP_CREDS_KEY); if (c) return JSON.parse(c).siteUrl || ""; } catch { /* */ }
    return "";
  });
  const [wpUsername, setWpUsername] = useState(() => {
    if (saved?.wpUsername) return saved.wpUsername;
    try { const c = localStorage.getItem(WP_CREDS_KEY); if (c) return JSON.parse(c).username || ""; } catch { /* */ }
    return "";
  });
  const [wpAppPassword, setWpAppPassword] = useState(() => {
    try {
      const creds = localStorage.getItem(WP_CREDS_KEY);
      if (creds) return JSON.parse(creds).appPassword || "";
    } catch { /* ignore */ }
    return "";
  });
  const [wpApiKey, setWpApiKey] = useState(() => {
    try {
      const creds = localStorage.getItem(WP_CREDS_KEY);
      if (creds) return JSON.parse(creds).apiKey || "";
    } catch { /* ignore */ }
    return "";
  });
  const [wpAuthMode, setWpAuthMode] = useState<"plugin" | "basic">(() => {
    try {
      const creds = localStorage.getItem(WP_CREDS_KEY);
      if (creds && JSON.parse(creds).apiKey) return "plugin";
    } catch { /* ignore */ }
    return "plugin";
  });
  const [wpCredsSaved, setWpCredsSaved] = useState(() => !!localStorage.getItem(WP_CREDS_KEY));
  const [wpShowSetup, setWpShowSetup] = useState(false);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpConnected, setWpConnected] = useState(false);
  const [wpConnectedName, setWpConnectedName] = useState("");
  const [wpConnectError, setWpConnectError] = useState("");
  const [wpPostType, setWpPostType] = useState<"page" | "post">(() => {
    try { const c = localStorage.getItem(WP_CREDS_KEY); if (c) { const v = JSON.parse(c).postType; if (v === "post") return "post"; } } catch { /* */ }
    return "page";
  });
  const [wpPublishing, setWpPublishing] = useState(false);
  const [wpResult, setWpResult] = useState<{ id: number; link: string; editLink: string; postType: string } | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const updateSetting = (key: keyof AppSettings, val: string) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveSettings(next);
  };

  // Media Generator
  const [videoPrompts, setVideoPrompts] = useState<VideoPromptSet | null>(saved?.videoPrompts ?? null);
  const [imagePrompts, setImagePrompts] = useState<ImagePromptSet | null>(saved?.imagePrompts ?? null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const canGenerate = mainKeyword.trim() || existingArticle.trim();

  // Auto-save
  const saveToStorage = useCallback(() => {
    const state: SavedState = {
      businessName, websiteUrl, pageType, mainKeyword, location,
      secondaryKeywords, sitemapUrls, internalLinks, externalLinks,
      wordCount, tone, customInstructions, existingArticle, result,
      wpSiteUrl, wpUsername, videoPrompts, imagePrompts,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("Saved locally");
    } catch { /* storage full */ }
  }, [
    businessName, websiteUrl, pageType, mainKeyword, location,
    secondaryKeywords, sitemapUrls, internalLinks, externalLinks,
    wordCount, tone, customInstructions, existingArticle, result,
    wpSiteUrl, wpUsername, videoPrompts, imagePrompts,
  ]);

  useEffect(() => {
    const timer = setTimeout(saveToStorage, 500);
    return () => clearTimeout(timer);
  }, [saveToStorage]);

  const [demoMode, setDemoMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLoadDemo = () => {
    setBusinessName("Calgary Emergency Plumbing");
    setWebsiteUrl("https://www.calgaryemergencyplumbing.ca");
    setMainKeyword("emergency plumber calgary");
    setLocation("Calgary AB");
    setSecondaryKeywords("plumber calgary\n24 hour plumber calgary\ndrain cleaning calgary\nwater heater repair calgary\nplumbing services calgary");
    setTone("trust");
    setPageType("service");
    setWordCount("1500");

    // Simulated sitemap
    const demoUrls = [
      "https://www.calgaryemergencyplumbing.ca/",
      "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary/",
      "https://www.calgaryemergencyplumbing.ca/drain-cleaning-calgary/",
      "https://www.calgaryemergencyplumbing.ca/water-heater-repair-calgary/",
      "https://www.calgaryemergencyplumbing.ca/plumbing-services-airdrie/",
      "https://www.calgaryemergencyplumbing.ca/plumbing-services-okotoks/",
      "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-nw/",
      "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-ne/",
      "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-sw/",
      "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-se/",
      "https://www.calgaryemergencyplumbing.ca/about/",
      "https://www.calgaryemergencyplumbing.ca/contact/",
      "https://www.calgaryemergencyplumbing.ca/reviews/",
      "https://www.calgaryemergencyplumbing.ca/blog/",
    ].join("\n");
    setSitemapUrls(demoUrls);
    // Mark all as valid
    setUrlValidation(demoUrls.split("\n").map(u => ({ url: u, status: 200, label: "valid" as const })));

    setInternalLinks(
      "emergency plumber Calgary NW | https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-nw/ | covers NW quadrant\n" +
      "drain cleaning services | https://www.calgaryemergencyplumbing.ca/drain-cleaning-calgary/ | core service page\n" +
      "water heater repair | https://www.calgaryemergencyplumbing.ca/water-heater-repair-calgary/ | high-value service\n" +
      "Airdrie plumbing services | https://www.calgaryemergencyplumbing.ca/plumbing-services-airdrie/ | nearby city coverage\n" +
      "about our team | https://www.calgaryemergencyplumbing.ca/about/ | trust building\n" +
      "customer reviews | https://www.calgaryemergencyplumbing.ca/reviews/ | social proof"
    );

    // Demo article
    const demoArticle = `<h1>Emergency Plumber Calgary — 24/7 Fast Response</h1>
<p>When a plumbing emergency strikes in Calgary, you need a team that responds fast and gets the job done right. <strong>Calgary Emergency Plumbing</strong> provides 24/7 emergency plumbing services across Calgary, Airdrie, Okotoks, and Chestermere.</p>
<h2>Why Choose Calgary Emergency Plumbing?</h2>
<p>With over 15 years of experience serving the Calgary area, our licensed plumbers handle everything from burst pipes to <a href="https://www.calgaryemergencyplumbing.ca/drain-cleaning-calgary/">drain cleaning</a> and <a href="https://www.calgaryemergencyplumbing.ca/water-heater-repair-calgary/">water heater repair</a>. We arrive within 60 minutes — guaranteed.</p>
<h2>Our Emergency Plumbing Services</h2>
<ul>
<li><strong>Burst pipe repair</strong> — fast response to minimize water damage</li>
<li><strong>Drain cleaning &amp; unclogging</strong> — residential and commercial drains</li>
<li><strong>Water heater emergencies</strong> — no hot water? We fix it same-day</li>
<li><strong>Sewer line repair</strong> — camera inspections and trenchless solutions</li>
<li><strong>Gas line emergencies</strong> — licensed gas fitters on every call</li>
</ul>
<h2>Serving All Calgary Quadrants</h2>
<p>We serve <a href="https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-nw/">Calgary NW</a>, NE, SW, and SE. Our trucks are positioned across the city so we can reach you fast, day or night. We also cover <a href="https://www.calgaryemergencyplumbing.ca/plumbing-services-airdrie/">Airdrie</a> and surrounding communities.</p>
<h2>What Our Customers Say</h2>
<p>"Called at 2am with a flooded basement. They were here in 40 minutes and had everything fixed by sunrise. Incredible service." — Sarah M., Calgary NW</p>
<h2>Frequently Asked Questions</h2>
<h3>How fast can you respond to an emergency?</h3>
<p>We guarantee arrival within 60 minutes anywhere in Calgary. Most calls are answered within 30 minutes.</p>
<h3>Do you charge extra for after-hours service?</h3>
<p>Our emergency rates are transparent with no hidden fees. We provide upfront pricing before any work begins.</p>
<h3>Are your plumbers licensed?</h3>
<p>Yes. Every plumber on our team is fully licensed, insured, and background-checked.</p>
<h3>Do you offer warranties on repairs?</h3>
<p>All repairs come with a minimum 1-year warranty on parts and labor.</p>
<h2>Call Calgary Emergency Plumbing Now</h2>
<p>Don't wait for a small leak to become a big problem. Call <strong>Calgary Emergency Plumbing</strong> at <strong>(403) 555-0199</strong> or <a href="https://www.calgaryemergencyplumbing.ca/contact/">request a quote online</a>. Available 24/7, 365 days a year.</p>`;

    setResult({
      article: demoArticle,
      metaTitle: "Emergency Plumber Calgary | 24/7 Fast Response | Calgary Emergency Plumbing",
      metaDescription: "Need an emergency plumber in Calgary? We respond within 60 minutes, 24/7. Licensed plumbers for burst pipes, drain cleaning, water heater repair. Call now!",
      focusKeyword: "emergency plumber calgary",
      keywordSuggestions: ["24 hour plumber calgary","drain cleaning calgary","water heater repair calgary","burst pipe repair calgary","plumber near me calgary","emergency plumbing services calgary","sewer line repair calgary","gas line plumber calgary","affordable plumber calgary","plumbing company calgary"],
      urlSlug: "emergency-plumber-calgary",
      schema: JSON.stringify({"@context":"https://schema.org","@type":"LocalBusiness","name":"Calgary Emergency Plumbing","url":"https://www.calgaryemergencyplumbing.ca","telephone":"(403) 555-0199","address":{"@type":"PostalAddress","streetAddress":"123 Centre St","addressLocality":"Calgary","addressRegion":"AB","postalCode":"T2E 0A1","addressCountry":"CA"},"geo":{"@type":"GeoCoordinates","latitude":51.0447,"longitude":-114.0719},"openingHours":"Mo-Su 00:00-23:59","areaServed":["Calgary","Airdrie","Okotoks","Chestermere"],"sameAs":["https://facebook.com/calgaryemergencyplumbing","https://instagram.com/calgaryplumbing"]}, null, 2),
      facebook: "🔧 Plumbing emergency in Calgary? Don't panic — we're available 24/7!\n\nBurst pipe? Clogged drain? No hot water? Our licensed plumbers respond within 60 minutes, anywhere in Calgary.\n\nCall (403) 555-0199 or visit calgaryemergencyplumbing.ca\n\nWhat's the worst plumbing emergency you've dealt with? 👇",
      instagram: "🚨 PLUMBING EMERGENCY?\n\nWe've got you covered — 24/7, 365 days.\n\n✅ 60-minute response\n✅ Licensed & insured\n✅ Upfront pricing\n✅ All Calgary quadrants\n\nBurst pipes 💧 Drain cleaning 🚿 Water heaters 🔥\n\nCall us NOW: (403) 555-0199\n\n📍 Calgary • Airdrie • Okotoks\n\n🔗 Link in bio\n\n#calgaryplumber #emergencyplumber #plumbingcalgary #24hourplumber #draincleaningcalgary",
      linkedin: "As a local plumbing company serving Calgary for 15+ years, we've seen it all — from frozen pipes in January to flooded basements during spring thaw.\n\nHere's what we've learned about emergency plumbing:\n\n• Response time matters more than anything\n• Transparent pricing builds trust\n• Licensed plumbers = fewer callbacks\n• Serving all quadrants means no one waits\n\nIf your business or property needs reliable emergency plumbing, Calgary Emergency Plumbing is available 24/7.\n\n🔗 calgaryemergencyplumbing.ca",
      tiktokScript: "[HOOK 0-3s] POV: Your basement is flooding at 2am in Calgary 😱\n\n[BODY 3-12s] We got the call. Truck was rolling in 8 minutes. On-site in 35. Burst pipe isolated, water extracted, repair complete by sunrise. That's what 24/7 emergency plumbing looks like.\n\n[CTA 12-15s] Save this for when you need us. Calgary Emergency Plumbing — (403) 555-0199",
      hashtags: ["#calgaryplumber","#emergencyplumber","#plumbingcalgary","#24hourplumber","#draincleaningcalgary","#waterheaterrepair","#calgaryservices","#yycplumber","#localcalgary","#plumbinglife"],
      imagePrompts: ["Professional photo of a licensed plumber repairing a burst pipe under a kitchen sink in a modern Calgary home, well-lit, clean uniform with Calgary Emergency Plumbing branding","Aerial view of Calgary skyline at night with emergency plumbing van with lights on driving through residential neighborhood","Before and after split image: flooded basement on left, completely dry restored basement on right, professional lighting"],
      videoConcept: "Title: '60-Minute Emergency Response'\nFormat: Vertical (9:16) — 15 seconds\nScene 1: Phone ringing at 2am, customer panicking\nScene 2: Plumber gearing up, truck rolling\nScene 3: On-site repair montage, water being pumped\nScene 4: Relieved customer, thumbs up, CTA card",
      gbpUpdate: "Calgary Emergency Plumbing is proud to offer 24/7 emergency plumbing services across Calgary, Airdrie, and Okotoks. Our licensed team handles burst pipes, drain cleaning, and water heater repair with a 60-minute response guarantee. Contact us today!",
      gbpOffer: "SPECIAL OFFER: Free plumbing inspection with any emergency service call this month! Calgary Emergency Plumbing — (403) 555-0199. Mention this post for your free inspection.",
      gbpCta: "Need an emergency plumber? Calgary Emergency Plumbing makes it easy.\n\nStep 1: Call (403) 555-0199\nStep 2: We arrive within 60 minutes\nStep 3: Upfront quote before any work\n\nCall now — available 24/7!",
      gbpImagePrompt: "Professional photo of Calgary Emergency Plumbing team standing in front of their branded service van, clean uniforms, friendly expressions, Calgary residential neighborhood in background, daytime, trustworthy atmosphere",
      gbpButtonText: "Call Now",
      linkAudit: { approved: 6, used: [{ url: "https://www.calgaryemergencyplumbing.ca/drain-cleaning-calgary/", anchorText: "drain cleaning" },{ url: "https://www.calgaryemergencyplumbing.ca/water-heater-repair-calgary/", anchorText: "water heater repair" },{ url: "https://www.calgaryemergencyplumbing.ca/emergency-plumber-calgary-nw/", anchorText: "Calgary NW" },{ url: "https://www.calgaryemergencyplumbing.ca/plumbing-services-airdrie/", anchorText: "Airdrie" },{ url: "https://www.calgaryemergencyplumbing.ca/contact/", anchorText: "request a quote online" }], removed: [] },
      featuredImagePrompt: "Professional photograph of a Calgary Emergency Plumbing team member in branded uniform, working on a residential plumbing repair. Modern Calgary home setting, bright natural lighting, trustworthy and professional atmosphere. 16:9 aspect ratio, 1200x628px.",
      socialImagePrompts: [{ platform: "Featured Image", dimensions: "1200x628", prompt: "Calgary plumber repairing pipes in a modern home" },{ platform: "Facebook/Instagram", dimensions: "1080x1080", prompt: "Emergency plumbing service branded square image" },{ platform: "Google Business Profile", dimensions: "720x720", prompt: "Team photo in front of Calgary Emergency Plumbing van" }],
      videoPlan: { title: "60-Minute Emergency Response — Calgary Emergency Plumbing", format: "Vertical 9:16", totalDuration: "15 seconds", script: "[HOOK] Your basement is flooding. [BODY] We respond in 60 minutes. [CTA] Call now!", scenes: [{ sceneNumber: 1, duration: "0-3s", visual: "Phone ringing, water on floor", caption: "Plumbing emergency?", voiceover: "When disaster strikes...", imagePrompt: "Dramatic shot of water flooding a basement" },{ sceneNumber: 2, duration: "3-8s", visual: "Plumber arriving, tools ready", caption: "We're on our way", voiceover: "We respond in 60 minutes", imagePrompt: "Plumber stepping out of branded van" },{ sceneNumber: 3, duration: "8-12s", visual: "Repair in progress", caption: "Problem solved", voiceover: "Licensed, fast, guaranteed", imagePrompt: "Close-up of pipe repair" },{ sceneNumber: 4, duration: "12-13s", visual: "Happy customer", caption: "Happy customers", voiceover: "Every time", imagePrompt: "Smiling homeowner" },{ sceneNumber: 5, duration: "13-15s", visual: "Logo + phone number", caption: "Call (403) 555-0199", voiceover: "Call Calgary Emergency Plumbing", imagePrompt: "End card with logo" }], cta: "Call (403) 555-0199 — 24/7 Emergency Plumbing" },
    } as GeneratedContent);

    setWpSiteUrl("https://www.calgaryemergencyplumbing.ca");
    setWpConnected(true);
    setWpConnectedName("admin");
    setWpAuthMode("plugin");
    setWpApiKey("demo-key-xxxxx");

    updateSetting("phone", "(403) 555-0199");
    updateSetting("email", "info@calgaryemergencyplumbing.ca");
    updateSetting("serviceArea", "Calgary, Airdrie, Okotoks, Chestermere");
    updateSetting("defaultKeyword", "emergency plumber calgary");
    updateSetting("brandTone", "trust");

    setDemoMode(true);
    setActiveTab("dashboard");
    setSaveStatus("Demo project loaded");
  };

  const handleClearProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBusinessName(""); setWebsiteUrl(""); setPageType("location");
    setMainKeyword(""); setLocation(""); setSecondaryKeywords("");
    setSitemapUrls(""); setUrlValidation([]); setInternalLinks(""); setExternalLinks(""); setWordCount("1200");
    setTone("professional"); setCustomInstructions(""); setExistingArticle("");
    setResult(null); setError(""); setSaveStatus(""); setActiveTab("article");
    setWpSiteUrl(""); setWpUsername(""); setWpAppPassword(""); setWpResult(null);
    setWpCredsSaved(false);
    setVideoPrompts(null); setImagePrompts(null);
  };

  const handleSaveWpCreds = () => {
    try {
      localStorage.setItem(WP_CREDS_KEY, JSON.stringify({
        siteUrl: wpSiteUrl.trim(),
        username: wpUsername.trim(),
        appPassword: wpAppPassword.trim(),
        apiKey: wpApiKey.trim(),
        postType: wpPostType,
      }));
      setWpCredsSaved(true);
    } catch { /* storage full */ }
  };

  const handleClearWpCreds = () => {
    localStorage.removeItem(WP_CREDS_KEY);
    setWpSiteUrl(""); setWpUsername(""); setWpAppPassword(""); setWpApiKey("");
    setWpCredsSaved(false); setWpConnected(false); setWpConnectedName("");
    setWpShowSetup(false);
  };

  const handleTestWpConnection = async () => {
    if (!wpSiteUrl.trim()) return;
    if (wpAuthMode === "plugin" && !wpApiKey.trim()) return;
    if (wpAuthMode === "basic" && (!wpUsername.trim() || !wpAppPassword.trim())) return;
    setWpTesting(true); setWpConnectError("");
    try {
      const res = await testWordPressConnection({
        siteUrl: wpSiteUrl.trim(),
        username: wpUsername.trim(),
        appPassword: wpAppPassword.trim(),
        apiKey: wpAuthMode === "plugin" ? wpApiKey.trim() : undefined,
      });
      if (res.ok) {
        setWpConnected(true);
        setWpConnectedName(res.name || wpUsername);
        handleSaveWpCreds();
        setWpShowSetup(false);
      } else {
        setWpConnectError(res.error || "Connection failed.");
        setWpConnected(false);
      }
    } catch {
      setWpConnectError("Could not reach the server. Make sure the backend is running.");
      setWpConnected(false);
    } finally { setWpTesting(false); }
  };

  const handleGenerateKeywords = async () => {
    if (!mainKeyword.trim()) return;
    setKwLoading(true); setError("");
    try {
      const keywords = await generateKeywords({ mainKeyword, location, businessName, pageType });
      setSecondaryKeywords(keywords.join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate keywords.");
    } finally { setKwLoading(false); }
  };

  const handleValidateUrls = async (urlText?: string) => {
    const text = urlText ?? sitemapUrls;
    const urls = text.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) return;
    setUrlValidating(true); setError("");
    try {
      const results = await validateUrls(urls);
      setUrlValidation(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate URLs.");
    } finally { setUrlValidating(false); }
  };

  const handleFetchSitemap = async () => {
    if (!websiteUrl.trim()) return;
    setSitemapLoading(true); setError("");
    try {
      const urls = await fetchSitemapUrls(websiteUrl.trim());
      if (urls.length === 0) {
        setError("No URLs found in sitemap. Try pasting your URLs manually.");
      } else {
        const joined = urls.join("\n");
        setSitemapUrls(joined);
        // Auto-validate after fetch
        await handleValidateUrls(joined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sitemap.");
    } finally { setSitemapLoading(false); }
  };

  // Build set of valid-only URLs for link generation and export checks
  const validUrlSet = new Set<string>();
  urlValidation.forEach(r => {
    if (r.label === "valid") {
      validUrlSet.add(r.url);
      validUrlSet.add(r.url.replace(/\/+$/, ""));
    }
  });
  const hasValidation = urlValidation.length > 0;

  const handleGenerateLinks = async () => {
    if (!sitemapUrls.trim()) {
      setError("Add your sitemap URLs first so we do not create broken internal links.");
      return;
    }
    // If validated, only use valid URLs
    let urlsToUse = sitemapUrls;
    if (hasValidation) {
      const validOnly = urlValidation
        .filter(r => r.label === "valid")
        .map(r => r.url);
      if (validOnly.length === 0) {
        setError("No valid URLs found. Validate your URLs first and fix broken ones.");
        return;
      }
      urlsToUse = validOnly.join("\n");
    }
    setLinksLoading(true); setError("");
    try {
      const links = await generateInternalLinks({ sitemapUrls: urlsToUse, mainKeyword, location, businessName });
      setInternalLinks(links.map((l) => `${l.anchorText} | ${l.url} | ${l.reason}`).join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate internal links.");
    } finally { setLinksLoading(false); }
  };

  const handleHumanize = async () => {
    if (!result) return;
    setHumanizing(true); setError("");
    try {
      const humanized = await humanizeArticle({ article: result.article, mainKeyword, location, tone });
      setResult({ ...result, article: humanized });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to humanize article.");
    } finally { setHumanizing(false); }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true); setError("");
    try {
      const generated = await generateContent({
        businessName, websiteUrl, pageType, mainKeyword, location,
        secondaryKeywords, internalLinks, externalLinks,
        wordCount, tone, customInstructions, existingArticle,
      });
      const gbp = generateGbpContent({ businessName, mainKeyword, location, tone });
      const mediaCtx = { businessName, mainKeyword, location, pageType, tone };
      const media = {
        featuredImagePrompt: generateFeaturedImagePrompt(mediaCtx),
        socialImagePrompts: generateSocialImagePrompts(mediaCtx),
        videoPlan: generateVideoPlan(mediaCtx),
      };
      setResult({ ...generated, ...gbp, ...media });
      setActiveTab("article");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  const handlePublishToWordPress = async () => {
    if (!result || !wpSiteUrl.trim() || !wpUsername.trim() || !wpAppPassword.trim()) return;
    // Block export if article has invalid internal links
    if (hasInvalidLinks) {
      setError("Fix broken/invalid internal links before exporting. Go to the Article tab and click 'Remove Invalid Links'.");
      return;
    }
    setWpPublishing(true); setError(""); setWpResult(null);
    try {
      const config: WordPressConfig = {
        siteUrl: wpSiteUrl.trim(),
        username: wpUsername.trim(),
        appPassword: wpAppPassword.trim(),
        apiKey: wpAuthMode === "plugin" ? wpApiKey.trim() : undefined,
      };
      const breakdown: Record<string, { earned: number; max: number }> = {};
      for (const [k, v] of Object.entries(seoScore.categories)) {
        breakdown[k] = { earned: v.earned, max: v.max };
      }
      const payload = buildWordPressPayload(result, internalLinks, mainKeyword, location, seoScore.score, breakdown);
      const wpRes = await sendToWordPress(config, { ...payload, postType: wpPostType });
      const siteBase = wpSiteUrl.trim().replace(/\/+$/, "");
      setWpResult({
        id: wpRes.id,
        link: wpRes.link,
        editLink: `${siteBase}/wp-admin/post.php?post=${wpRes.id}&action=edit`,
        postType: wpRes.postType || wpPostType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish to WordPress.");
    } finally { setWpPublishing(false); }
  };

  const [regenField, setRegenField] = useState<string | null>(null);

  const regenContext = { mainKeyword, location, businessName, pageType, tone };

  const handleRegen = async (field: string, currentContent: string) => {
    if (!result) return;
    setRegenField(field); setError("");
    try {
      const value = await regenerateField({ field, currentContent, context: regenContext });
      if (field === "keywordSuggestions") {
        setResult({ ...result, keywordSuggestions: value as string[] });
      } else if (field === "hashtags") {
        setResult({ ...result, hashtags: value as string[] });
      } else {
        setResult({ ...result, [field]: value as string });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate.");
    } finally { setRegenField(null); }
  };

  // Client-side link validation — live scan of article HTML against approved list
  const validateArticleLinks = useCallback((articleHtml: string) => {
    const approvedUrls = new Set<string>();
    // Parse internal links field: "anchor | url | reason"
    internalLinks.split("\n").filter(Boolean).forEach((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const url = parts.length >= 2 ? parts[1] : parts[0];
      if (url.startsWith("http")) {
        approvedUrls.add(url);
        approvedUrls.add(url.replace(/\/+$/, "")); // also without trailing slash
      }
    });

    // Also parse sitemapUrls as approved
    sitemapUrls.split("\n").filter(Boolean).forEach((url) => {
      const u = url.trim();
      if (u.startsWith("http")) {
        approvedUrls.add(u);
        approvedUrls.add(u.replace(/\/+$/, ""));
      }
    });

    // Extract website domain for internal vs external check
    let siteDomain = "";
    if (websiteUrl) {
      try {
        siteDomain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
      } catch { /* ignore */ }
    }

    const validLinks: { anchorText: string; url: string }[] = [];
    const invalidLinks: { anchorText: string; url: string }[] = [];

    const linkRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(articleHtml)) !== null) {
      const href = match[1];
      const anchor = match[2].replace(/<[^>]*>/g, "").trim();

      // Skip external links
      if (siteDomain) {
        try {
          const linkHost = new URL(href.startsWith("http") ? href : `https://${href}`).hostname;
          if (linkHost !== siteDomain) continue;
        } catch { continue; }
      }

      const hrefNorm = href.replace(/\/+$/, "");
      if (approvedUrls.has(href) || approvedUrls.has(hrefNorm)) {
        validLinks.push({ anchorText: anchor, url: href });
      } else {
        invalidLinks.push({ anchorText: anchor, url: href });
      }
    }

    return { validLinks, invalidLinks };
  }, [internalLinks, sitemapUrls, websiteUrl]);

  const linkValidation = result ? validateArticleLinks(result.article) : { validLinks: [], invalidLinks: [] };
  const hasInvalidLinks = linkValidation.invalidLinks.length > 0;

  const handleRemoveInvalidLinks = () => {
    if (!result) return;
    let cleaned = result.article;
    for (const inv of linkValidation.invalidLinks) {
      // Replace <a href="inv.url">...text...</a> with just the text
      const escaped = inv.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`<a\\s+[^>]*href\\s*=\\s*["']${escaped}["'][^>]*>(.*?)<\\/a>`, "gi");
      cleaned = cleaned.replace(regex, "$1");
    }
    setResult({ ...result, article: cleaned });
  };

  const renderTabContent = () => {
    if (!result) return null;

    switch (activeTab) {
      case "article":
        return (
          <div className="tab-content">
            <div className="tab-actions">
              <button className="humanize-btn" onClick={handleHumanize} disabled={humanizing}>
                {humanizing ? "Humanizing..." : "Humanize Copy"}
              </button>
            </div>
            <OutputCard title="Full Article" content={result.article} accent="#2563eb" isHtml
              onRegenerate={() => handleRegen("article", result.article)} regenerating={regenField === "article"} />

            {result.linkAudit && result.linkAudit.removed && result.linkAudit.removed.length > 0 && (
              <div className="link-warning-banner" style={{ borderRadius: 8, marginBottom: 10 }}>
                <span>{result.linkAudit.removed.length} internal link(s) were removed during generation because they were not found in your validated sitemap.</span>
              </div>
            )}

            {(linkValidation.validLinks.length > 0 || linkValidation.invalidLinks.length > 0) && (
              <div className="links-used-panel">
                <div className="links-used-header">
                  <h4>Internal Link Validation</h4>
                  <span className="links-used-count">
                    {linkValidation.validLinks.length} valid{linkValidation.invalidLinks.length > 0 && <>, {linkValidation.invalidLinks.length} invalid</>}
                  </span>
                </div>

                {hasInvalidLinks && (
                  <div className="link-warning-banner">
                    <span>Some links are not from your sitemap. Fix before publishing.</span>
                    <button className="remove-invalid-btn" onClick={handleRemoveInvalidLinks}>
                      Remove Invalid Links
                    </button>
                  </div>
                )}

                <table className="links-used-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Anchor Text</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkValidation.validLinks.map((l, i) => (
                      <tr key={`v-${i}`}>
                        <td><span className="link-badge link-valid">VALID</span></td>
                        <td className="link-anchor">{l.anchorText}</td>
                        <td><a href={l.url} target="_blank" rel="noopener noreferrer" className="link-url">{l.url}</a></td>
                      </tr>
                    ))}
                    {linkValidation.invalidLinks.map((l, i) => (
                      <tr key={`r-${i}`} className="link-row-invalid">
                        <td><span className="link-badge link-invalid">INVALID</span></td>
                        <td className="link-anchor">{l.anchorText}</td>
                        <td><span className="link-url link-url-struck">{l.url}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "metadata":
        return (
          <div className="tab-content">
            <div className="cards-grid">
              <OutputCard title="Meta Title" content={result.metaTitle} accent="#059669"
                onRegenerate={() => handleRegen("metaTitle", result.metaTitle)} regenerating={regenField === "metaTitle"} />
              <OutputCard title="Meta Description" content={result.metaDescription} accent="#059669"
                onRegenerate={() => handleRegen("metaDescription", result.metaDescription)} regenerating={regenField === "metaDescription"} />
              <OutputCard title="Focus Keyword" content={result.focusKeyword} accent="#059669"
                onRegenerate={() => handleRegen("focusKeyword", result.focusKeyword)} regenerating={regenField === "focusKeyword"} />
              <OutputCard title="URL Slug" content={result.urlSlug} accent="#059669"
                onRegenerate={() => handleRegen("urlSlug", result.urlSlug)} regenerating={regenField === "urlSlug"} />
            </div>
            <div className="cards-grid single" style={{ marginTop: "0.75rem" }}>
              <OutputCard title="Keyword Suggestions" content={result.keywordSuggestions.join("\n")} accent="#059669"
                onRegenerate={() => handleRegen("keywordSuggestions", result.keywordSuggestions.join("\n"))} regenerating={regenField === "keywordSuggestions"} />
            </div>
          </div>
        );

      case "schema":
        return (
          <div className="tab-content">
            <OutputCard title="Schema JSON-LD" content={result.schema} accent="#7c3aed"
              onRegenerate={() => handleRegen("schema", result.schema)} regenerating={regenField === "schema"} />
          </div>
        );

      case "social":
        return (
          <div className="tab-content">
            <div className="cards-grid">
              <OutputCard title="Facebook Post" content={result.facebook} accent="#1877F2"
                onRegenerate={() => handleRegen("facebook", result.facebook)} regenerating={regenField === "facebook"} />
              <OutputCard title="Instagram Caption" content={result.instagram} accent="#E4405F"
                onRegenerate={() => handleRegen("instagram", result.instagram)} regenerating={regenField === "instagram"} />
              <OutputCard title="LinkedIn Post" content={result.linkedin} accent="#0A66C2"
                onRegenerate={() => handleRegen("linkedin", result.linkedin)} regenerating={regenField === "linkedin"} />
              <OutputCard title="TikTok / Reel Script" content={result.tiktokScript} accent="#000000"
                onRegenerate={() => handleRegen("tiktokScript", result.tiktokScript)} regenerating={regenField === "tiktokScript"} />
            </div>
            <div className="cards-grid single" style={{ marginTop: "0.75rem" }}>
              <OutputCard title="Hashtags" content={result.hashtags.join("  ")} accent="#6C63FF"
                onRegenerate={() => handleRegen("hashtags", result.hashtags.join("  "))} regenerating={regenField === "hashtags"} />
            </div>
          </div>
        );

      case "gbp":
        return (
          <div className="tab-content">
            <div className="gbp-notice">These are locally generated drafts. API generation coming soon.</div>
            <div className="cards-grid">
              <OutputCard title="Update Post" content={result.gbpUpdate} accent="#4285F4" />
              <OutputCard title="Offer Post" content={result.gbpOffer} accent="#34A853" />
              <OutputCard title="CTA Post" content={result.gbpCta} accent="#EA4335" />
              <OutputCard title="Suggested Image Prompt" content={result.gbpImagePrompt} accent="#FBBC05" />
            </div>
            <div className="cards-grid single" style={{ marginTop: "0.75rem" }}>
              <OutputCard title="Suggested Button Text" content={result.gbpButtonText} accent="#4285F4" />
            </div>
          </div>
        );

      case "media":
        return (
          <div className="tab-content">
            <div className="gbp-notice">Image/video prompts are generated locally. API generation (DALL-E, Sora) coming soon.</div>

            <h3 className="media-section-title">Featured Image</h3>
            <OutputCard title="Featured Image Prompt" content={result.featuredImagePrompt} accent="#FF9800" />
            <div className="image-placeholder">
              <div className="placeholder-icon">🖼</div>
              <span>Image preview will appear here when API is connected</span>
            </div>

            <h3 className="media-section-title">Social Images</h3>
            <div className="cards-grid">
              {result.socialImagePrompts.map((sip) => (
                <OutputCard
                  key={sip.platform}
                  title={`${sip.platform} (${sip.dimensions})`}
                  content={sip.prompt}
                  accent="#E91E63"
                />
              ))}
            </div>

            <h3 className="media-section-title">Short Video Plan</h3>
            {result.videoPlan && (
              <>
                <div className="cards-grid">
                  <OutputCard title="Video Title" content={result.videoPlan.title} accent="#7c3aed" />
                  <OutputCard title="Format & Duration" content={`${result.videoPlan.format}\n${result.videoPlan.totalDuration}`} accent="#7c3aed" />
                </div>
                <div className="cards-grid single" style={{ marginTop: "0.75rem" }}>
                  <OutputCard title="Full Script" content={result.videoPlan.script} accent="#7c3aed" />
                </div>

                <h4 className="media-scene-title">Scene Breakdown (5 Scenes)</h4>
                {result.videoPlan.scenes.map((scene) => (
                  <div key={scene.sceneNumber} className="scene-card">
                    <div className="scene-header">
                      <span className="scene-number">Scene {scene.sceneNumber}</span>
                      <span className="scene-duration">{scene.duration}</span>
                    </div>
                    <div className="scene-grid">
                      <div className="scene-field">
                        <strong>Visual</strong>
                        <p>{scene.visual}</p>
                      </div>
                      <div className="scene-field">
                        <strong>Caption</strong>
                        <p>{scene.caption}</p>
                      </div>
                      <div className="scene-field">
                        <strong>Voiceover</strong>
                        <p>{scene.voiceover}</p>
                      </div>
                      <div className="scene-field">
                        <strong>Image/Video Prompt</strong>
                        <p>{scene.imagePrompt}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="cards-grid single" style={{ marginTop: "0.75rem" }}>
                  <OutputCard title="Call-to-Action" content={result.videoPlan.cta} accent="#E91E63" />
                </div>
              </>
            )}
          </div>
        );

      case "mediagen":
        return (
          <div className="tab-content">
            <MediaGenerator
              businessName={businessName}
              mainKeyword={mainKeyword}
              location={location}
              pageType={pageType}
              tone={tone}
              metaTitle={result.metaTitle}
              metaDescription={result.metaDescription}
              cta={result.videoPlan?.cta}
              savedVideoPrompts={videoPrompts}
              savedImagePrompts={imagePrompts}
              onVideoPromptsGenerated={setVideoPrompts}
              onImagePromptsGenerated={setImagePrompts}
            />
          </div>
        );

      case "score":
        return (
          <div className="tab-content">
            <SeoScore
              result={result}
              mainKeyword={mainKeyword}
              targetWordCount={wordCount}
              secondaryKeywords={secondaryKeywords}
              internalLinks={internalLinks}
            />
          </div>
        );

      case "wordpress": {
        const articleWordCount = result.article.replace(/<[^>]*>/g, "").trim().split(/\s+/).length;
        const wpReady = wpSiteUrl.trim() && (wpAuthMode === "plugin" ? wpApiKey.trim() : (wpUsername.trim() && wpAppPassword.trim()));
        return (
          <div className="tab-content">
            <div className="wp-export-panel">
              <h3 className="media-section-title" style={{ marginTop: 0 }}>WordPress Export</h3>

              {/* ── Connection status ── */}
              {wpConnected ? (
                <div className="wp-connected-bar">
                  <div className="wp-connected-info">
                    <span className="wp-connected-dot" />
                    <span>Connected to <strong>{wpSiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}</strong> as <strong>{wpConnectedName}</strong></span>
                  </div>
                  <div className="wp-connected-actions">
                    <button className="wp-clear-creds-btn" onClick={handleClearWpCreds}>Disconnect</button>
                  </div>
                </div>
              ) : wpCredsSaved && !wpShowSetup ? (
                <div className="wp-saved-bar">
                  <span>WordPress settings saved. <button className="wp-link-btn" onClick={handleTestWpConnection} disabled={wpTesting}>{wpTesting ? "Testing..." : "Test Connection"}</button></span>
                  <button className="wp-link-btn" onClick={() => setWpShowSetup(true)}>Edit</button>
                </div>
              ) : !wpShowSetup ? (
                <div className="wp-connect-prompt">
                  <p>Connect your WordPress site to export SEO content as draft pages or posts.</p>
                  <button className="wp-connect-btn" onClick={() => setWpShowSetup(true)}>Connect WordPress</button>
                </div>
              ) : null}

              {/* ── Setup form ── */}
              {wpShowSetup && (
                <div className="wp-setup-card">
                  <h4>Connect your WordPress site</h4>

                  <div className="wp-auth-toggle">
                    <button className={`wp-auth-option ${wpAuthMode === "plugin" ? "active" : ""}`} onClick={() => setWpAuthMode("plugin")}>SSF Plugin (Recommended)</button>
                    <button className={`wp-auth-option ${wpAuthMode === "basic" ? "active" : ""}`} onClick={() => setWpAuthMode("basic")}>Basic Auth (No Plugin)</button>
                  </div>

                  {wpAuthMode === "plugin" ? (
                    <>
                      <div className="wp-setup-steps">
                        <div className="wp-step"><span className="wp-step-num">1</span><span>Install and activate the <strong>SEO Rank Writer Connector</strong> plugin on your WordPress site</span></div>
                        <div className="wp-step"><span className="wp-step-num">2</span><span>Go to <strong>SEO Rank Writer</strong> in your WordPress admin menu</span></div>
                        <div className="wp-step"><span className="wp-step-num">3</span><span>Copy the <strong>API Key</strong> and paste it below</span></div>
                      </div>
                      <div className="field">
                        <label htmlFor="wpSiteUrl">WordPress Site URL</label>
                        <input id="wpSiteUrl" type="text" placeholder="e.g. https://yoursite.com"
                          value={wpSiteUrl} onChange={(e) => { setWpSiteUrl(e.target.value); setWpConnected(false); }} />
                      </div>
                      <div className="field">
                        <label htmlFor="wpApiKey">Plugin API Key</label>
                        <input id="wpApiKey" type="password" placeholder="Paste your SSF API key here"
                          value={wpApiKey} onChange={(e) => { setWpApiKey(e.target.value); setWpConnected(false); }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="wp-setup-steps">
                        <div className="wp-step"><span className="wp-step-num">1</span><span>Enter your WordPress site URL below</span></div>
                        <div className="wp-step"><span className="wp-step-num">2</span><span>Open your WordPress profile and create an Application Password</span></div>
                        <div className="wp-step"><span className="wp-step-num">3</span><span>Paste the app password below and click Test Connection</span></div>
                      </div>

                      {wpSiteUrl.trim() && (
                        <a href={`${wpSiteUrl.trim().replace(/\/+$/, "")}/wp-admin/profile.php`} target="_blank" rel="noopener noreferrer" className="wp-profile-link">
                          Open WordPress Profile Page
                        </a>
                      )}

                      <div className="field">
                        <label htmlFor="wpSiteUrl">WordPress Site URL</label>
                        <input id="wpSiteUrl" type="text" placeholder="e.g. https://yoursite.com"
                          value={wpSiteUrl} onChange={(e) => { setWpSiteUrl(e.target.value); setWpConnected(false); }} />
                      </div>
                      <div className="controls-row two-col">
                        <div className="field">
                          <label htmlFor="wpUsername">Username</label>
                          <input id="wpUsername" type="text" placeholder="admin"
                            value={wpUsername} onChange={(e) => { setWpUsername(e.target.value); setWpConnected(false); }} />
                        </div>
                        <div className="field">
                          <label htmlFor="wpAppPassword">Application Password</label>
                          <input id="wpAppPassword" type="password" placeholder="xxxx xxxx xxxx xxxx"
                            value={wpAppPassword} onChange={(e) => { setWpAppPassword(e.target.value); setWpConnected(false); }} />
                        </div>
                      </div>
                    </>
                  )}

                  {wpConnectError && <div className="wp-connect-error">{wpConnectError}</div>}

                  <div className="wp-setup-actions">
                    <button className="wp-test-btn" onClick={handleTestWpConnection}
                      disabled={!wpSiteUrl.trim() || (wpAuthMode === "plugin" ? !wpApiKey.trim() : (!wpUsername.trim() || !wpAppPassword.trim())) || wpTesting}>
                      {wpTesting ? "Testing..." : "Test Connection"}
                    </button>
                    <button className="wp-link-btn" onClick={() => setWpShowSetup(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Send preview + publish (only when connected or creds exist) ── */}
              {wpReady && (
                <>
                  <div className="wp-preview-box">
                    <h4>What will be sent:</h4>
                    <div className="wp-preview-row"><span className="wp-preview-label">Title</span><span className="wp-preview-value">{result.metaTitle}</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">Slug</span><span className="wp-preview-value">/{result.urlSlug}</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">Excerpt</span><span className="wp-preview-value">{result.metaDescription}</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">Content</span><span className="wp-preview-value">{articleWordCount.toLocaleString()} words (H1 removed, body only)</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">Schema</span><span className="wp-preview-value">{result.schema ? "Yes — saved to _ssf_schema_json" : "No"}</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">SEO Meta</span><span className="wp-preview-value">SSF fields — title, description, keyword, OG tags</span></div>
                    <div className="wp-preview-row"><span className="wp-preview-label">Status</span><span className="wp-preview-value">Draft</span></div>
                  </div>

                  <div className="field" style={{ maxWidth: 200 }}>
                    <label htmlFor="wpPostType">Post Type</label>
                    <select id="wpPostType" value={wpPostType} onChange={(e) => setWpPostType(e.target.value as "page" | "post")}>
                      <option value="page">Page</option>
                      <option value="post">Post</option>
                    </select>
                  </div>

                  <button className="wp-publish-btn" onClick={handlePublishToWordPress} disabled={wpPublishing || hasInvalidLinks}>
                    {wpPublishing ? "Sending to WordPress..." : "Send to WordPress (Draft)"}
                  </button>
                  {hasInvalidLinks && (
                    <div className="wp-preview-warn">Fix broken/invalid internal links before exporting. Go to the Article tab to remove them.</div>
                  )}

                  {wpResult && (
                    <div className="wp-success">
                      <strong>{wpResult.postType === "post" ? "Post" : "Page"} draft created successfully!</strong>
                      <div className="wp-success-details">
                        {wpResult.postType === "post" ? "Post" : "Page"} ID: {wpResult.id}
                      </div>
                      <div className="wp-success-actions">
                        <a href={wpResult.editLink} target="_blank" rel="noopener noreferrer" className="wp-open-btn">Open in WordPress</a>
                        <a href={wpResult.link} target="_blank" rel="noopener noreferrer" className="wp-preview-link">Preview Draft</a>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }
    }
  };

  const articleWordCountDash = result ? result.article.replace(/<[^>]*>/g, "").trim().split(/\s+/).length : 0;

  // Validated sitemap URL counts
  const validUrlCount = urlValidation.filter(r => r.label === "valid").length;
  const brokenUrlCount = urlValidation.filter(r => r.label === "broken").length;

  // ── Real SEO Score Calculator (0-100, 6 categories) ──
  const seoScore = (() => {
    const kw = mainKeyword.trim().toLowerCase();
    const articleText = result ? result.article.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase() : "";
    const wordCount = articleText ? articleText.split(" ").length : 0;

    // 1. Content Quality — 25 points
    const content = { earned: 0, max: 25, items: [] as { label: string; pass: boolean; detail: string }[] };
    const hasArticle = !!result && wordCount >= 100;
    const wordCountOk = wordCount >= 800;
    const hasH2 = !!result && /<h2[\s>]/i.test(result.article);
    const hasFaq = !!result && (result.article.toLowerCase().includes("faq") || result.article.toLowerCase().includes("frequently asked"));
    const kwInContent = !!(kw && articleText.includes(kw));
    const kwInH1 = !!(kw && result && new RegExp(`<h1[^>]*>[^<]*${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(result.article));
    if (hasArticle) content.earned += 5;
    if (wordCountOk) content.earned += 6;
    if (hasH2) content.earned += 4;
    if (hasFaq) content.earned += 4;
    if (kwInContent) content.earned += 3;
    if (kwInH1) content.earned += 3;
    content.items = [
      { label: "Article generated", pass: hasArticle, detail: hasArticle ? `${wordCount} words` : "No content yet" },
      { label: "Word count 800+", pass: wordCountOk, detail: `${wordCount} words` },
      { label: "Has H2 headings", pass: hasH2, detail: hasH2 ? "Found" : "Missing subheadings" },
      { label: "FAQ section", pass: hasFaq, detail: hasFaq ? "Found" : "No FAQ detected" },
      { label: "Keyword in content", pass: kwInContent, detail: kw || "No keyword set" },
      { label: "Keyword in H1", pass: kwInH1, detail: kwInH1 ? "Found" : "Missing from H1" },
    ];

    // 2. Metadata — 15 points
    const meta = { earned: 0, max: 15, items: [] as { label: string; pass: boolean; detail: string }[] };
    const titleLen = result ? result.metaTitle.length : 0;
    const titleOk = titleLen >= 30 && titleLen <= 65;
    const titleHasKw = kw && result ? result.metaTitle.toLowerCase().includes(kw) : false;
    const descLen = result ? result.metaDescription.length : 0;
    const descOk = descLen >= 120 && descLen <= 165;
    const descHasKw = kw && result ? result.metaDescription.toLowerCase().includes(kw) : false;
    const hasSlug = !!result && !!result.urlSlug;
    if (titleOk) meta.earned += 4; else if (titleLen > 0) meta.earned += 2;
    if (titleHasKw) meta.earned += 2;
    if (descOk) meta.earned += 4; else if (descLen > 0) meta.earned += 2;
    if (descHasKw) meta.earned += 2;
    if (hasSlug) meta.earned += 3;
    meta.items = [
      { label: "Title length (30-65)", pass: titleOk, detail: titleLen > 0 ? `${titleLen} chars` : "No title" },
      { label: "Keyword in title", pass: titleHasKw, detail: titleHasKw ? "Found" : "Missing" },
      { label: "Description length (120-165)", pass: descOk, detail: descLen > 0 ? `${descLen} chars` : "No description" },
      { label: "Keyword in description", pass: descHasKw, detail: descHasKw ? "Found" : "Missing" },
      { label: "URL slug set", pass: hasSlug, detail: hasSlug ? `/${result!.urlSlug}` : "No slug" },
    ];

    // 3. Schema — 15 points
    const schema = { earned: 0, max: 15, items: [] as { label: string; pass: boolean; detail: string }[] };
    const schemaStr = result?.schema || "";
    const hasSchema = schemaStr.length > 20;
    let schemaValid = false;
    let hasAddress = false;
    let hasFaqSchema = false;
    if (hasSchema) {
      try { const parsed = JSON.parse(schemaStr); schemaValid = !!parsed["@context"]; hasAddress = !!parsed.address || JSON.stringify(parsed).includes('"address"'); hasFaqSchema = JSON.stringify(parsed).includes("FAQPage"); } catch { /* invalid JSON */ }
    }
    if (hasSchema) schema.earned += 5;
    if (schemaValid) schema.earned += 4;
    if (hasAddress) schema.earned += 3;
    if (hasFaqSchema) schema.earned += 3;
    schema.items = [
      { label: "Schema present", pass: hasSchema, detail: hasSchema ? "JSON-LD found" : "No schema" },
      { label: "Valid JSON-LD", pass: schemaValid, detail: schemaValid ? "Valid" : hasSchema ? "Invalid JSON" : "N/A" },
      { label: "Address/location data", pass: hasAddress, detail: hasAddress ? "Found" : "Missing" },
      { label: "FAQ schema", pass: hasFaqSchema, detail: hasFaqSchema ? "Found" : "Not included" },
    ];

    // 4. Internal Links — 20 points
    const links = { earned: 0, max: 20, items: [] as { label: string; pass: boolean; detail: string }[] };
    const sitemapUrlCount = sitemapUrls.trim() ? sitemapUrls.trim().split("\n").filter(Boolean).length : 0;
    const hasSitemap = sitemapUrlCount >= 3;
    const hasValidated = urlValidation.length > 0;
    const noBroken = hasValidated && brokenUrlCount === 0;
    const linkLines = internalLinks.trim() ? internalLinks.trim().split("\n").filter(Boolean) : [];
    const hasInternalLinks = linkLines.length >= 3;
    const linksInArticle = result ? (result.article.match(/<a\s+[^>]*href/gi) || []).length : 0;
    const articleHasLinks = linksInArticle >= 2;
    if (hasSitemap) links.earned += 4;
    if (hasValidated) links.earned += 4;
    if (noBroken) links.earned += 3; else if (hasValidated) links.earned += 1;
    if (hasInternalLinks) links.earned += 5;
    if (articleHasLinks) links.earned += 4;
    links.items = [
      { label: "Sitemap loaded (3+ URLs)", pass: hasSitemap, detail: `${sitemapUrlCount} URLs` },
      { label: "URLs validated", pass: hasValidated, detail: hasValidated ? `${validUrlCount} valid, ${brokenUrlCount} broken` : "Not validated" },
      { label: "No broken links", pass: noBroken, detail: noBroken ? "All clean" : brokenUrlCount > 0 ? `${brokenUrlCount} broken` : "Not checked" },
      { label: "Internal links generated (3+)", pass: hasInternalLinks, detail: `${linkLines.length} links` },
      { label: "Links in article (2+)", pass: articleHasLinks, detail: `${linksInArticle} links` },
    ];

    // 5. GSC Data — 15 points (placeholder until GSC connected)
    const gsc = { earned: 0, max: 15, items: [] as { label: string; pass: boolean; detail: string }[] };
    // GSC connection is managed by the SeoAnalytics component; we check localStorage for token presence
    let gscConnected = false;
    try { const t = localStorage.getItem("seo-content-factory-settings"); if (t) { const p = JSON.parse(t); if (p.gscProperty) gscConnected = true; } } catch { /* */ }
    // For now, award partial points for having GSC ready to connect
    if (gscConnected) gsc.earned += 8;
    if (gscConnected) gsc.earned += 7; // future: award based on actual CTR/position data
    gsc.items = [
      { label: "GSC connected", pass: gscConnected, detail: gscConnected ? "Connected" : "Not connected" },
      { label: "Search data available", pass: gscConnected, detail: gscConnected ? "Receiving data" : "Connect GSC for insights" },
      { label: "CTR optimization", pass: false, detail: "Connect GSC to analyze" },
    ];

    // 6. WordPress Readiness — 10 points
    const wp = { earned: 0, max: 10, items: [] as { label: string; pass: boolean; detail: string }[] };
    const wpSiteSet = !!wpSiteUrl.trim();
    const wpHasAuth = wpAuthMode === "plugin" ? !!wpApiKey.trim() : (!!wpUsername.trim() && !!wpAppPassword.trim());
    if (wpSiteSet) wp.earned += 2;
    if (wpHasAuth) wp.earned += 3;
    if (wpConnected) wp.earned += 5;
    wp.items = [
      { label: "Site URL configured", pass: wpSiteSet, detail: wpSiteSet ? wpSiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") : "Not set" },
      { label: "Authentication set", pass: wpHasAuth, detail: wpHasAuth ? (wpAuthMode === "plugin" ? "API key" : "App password") : "Not configured" },
      { label: "Connection verified", pass: wpConnected, detail: wpConnected ? "Connected" : "Not tested" },
    ];

    const totalEarned = content.earned + meta.earned + schema.earned + links.earned + gsc.earned + wp.earned;
    const totalMax = content.max + meta.max + schema.max + links.max + gsc.max + wp.max;
    const score = Math.round((totalEarned / totalMax) * 100);
    const status = score >= 80 ? "Ready" as const : score >= 50 ? "Needs Work" as const : "Missing Data" as const;

    return { score, status, totalEarned, totalMax, categories: { content, meta, schema, links, gsc, wp } };
  })();

  // Backward-compat alias used by dashboard/topbar
  const seoHealth = {
    score: seoScore.score,
    status: seoScore.status,
    hasTitle: seoScore.categories.meta.items[0]?.pass || false,
    hasDesc: seoScore.categories.meta.items[2]?.pass || false,
    hasSchema: seoScore.categories.schema.items[0]?.pass || false,
    hasLinks: seoScore.categories.links.items[3]?.pass || false,
    wpOk: seoScore.categories.wp.items[2]?.pass || false,
  };

  const renderDashboardHome = () => (
    <div className="dash-home">
      <div className="dash-welcome">
        <h2>Welcome back{businessName ? `, ${businessName}` : ""}</h2>
        <p>Your SEO content workspace. Generate, optimize, and publish.</p>
      </div>
      <div className="dash-stats">
        <div className="dash-stat-card dash-stat--score">
          <div className="dash-stat-icon">{"\u2713"}</div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{result ? "Ready" : "—"}</div>
            <div className="dash-stat-label">SEO Score</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat--content">
          <div className="dash-stat-icon">{"\uD83D\uDCDD"}</div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{result ? `${articleWordCountDash.toLocaleString()} words` : "0"}</div>
            <div className="dash-stat-label">Content Generated</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat--wp">
          <div className="dash-stat-icon">{"\uD83C\uDF10"}</div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{wpConnected ? "Connected" : "Not connected"}</div>
            <div className="dash-stat-label">WordPress</div>
          </div>
        </div>
        <div className="dash-stat-card dash-stat--kw">
          <div className="dash-stat-icon">{"\uD83D\uDD0D"}</div>
          <div className="dash-stat-info">
            <div className="dash-stat-val">{mainKeyword || "None set"}</div>
            <div className="dash-stat-label">Focus Keyword</div>
          </div>
        </div>
      </div>
      {/* SEO Score Card — Full Breakdown */}
      <div className="dash-perf-card">
        <div className="dash-perf-header">
          <h3>SEO Score</h3>
          <span className={`dash-perf-badge dash-perf-badge--${seoScore.score >= 80 ? "green" : seoScore.score >= 50 ? "yellow" : "red"}`}>
            {seoScore.status}
          </span>
        </div>
        <div className="dash-perf-score">
          <div className="dash-perf-ring" style={{ borderColor: seoScore.score >= 80 ? "#16a34a" : seoScore.score >= 50 ? "#ca8a04" : "#dc2626" }}>
            <span className="dash-perf-num">{seoScore.score}</span>
          </div>
          <div className="dash-perf-summary">
            <div className="dash-perf-earned">{seoScore.totalEarned} / {seoScore.totalMax} points</div>
            <div className="dash-perf-sub">{seoScore.score >= 80 ? "Your SEO is in great shape." : seoScore.score >= 50 ? "Some areas need improvement." : "Generate content and connect services to improve."}</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="dash-breakdown">
        {([
          { key: "content", label: "Content Quality", icon: "\uD83D\uDCDD", data: seoScore.categories.content },
          { key: "meta", label: "Metadata", icon: "\uD83C\uDFF7\uFE0F", data: seoScore.categories.meta },
          { key: "schema", label: "Schema", icon: "\u007B\u007D", data: seoScore.categories.schema },
          { key: "links", label: "Internal Links", icon: "\uD83D\uDD17", data: seoScore.categories.links },
          { key: "gsc", label: "Search Console", icon: "\uD83D\uDCCA", data: seoScore.categories.gsc },
          { key: "wp", label: "WordPress", icon: "\uD83C\uDF10", data: seoScore.categories.wp },
        ] as const).map(({ key, label, icon, data }) => (
          <div key={key} className="dash-cat-card">
            <div className="dash-cat-header">
              <span className="dash-cat-icon">{icon}</span>
              <span className="dash-cat-label">{label}</span>
              <span className={`dash-cat-score ${data.earned === data.max ? "dash-cat-score--full" : data.earned > 0 ? "dash-cat-score--partial" : "dash-cat-score--zero"}`}>
                {data.earned}/{data.max}
              </span>
            </div>
            <div className="dash-cat-bar">
              <div className="dash-cat-bar-fill" style={{ width: `${(data.earned / data.max) * 100}%` }} />
            </div>
            <div className="dash-cat-items">
              {data.items.map((item, i) => (
                <div key={i} className={`dash-cat-item ${item.pass ? "pass" : "fail"}`}>
                  <span className="dash-cat-check">{item.pass ? "\u2713" : "\u2717"}</span>
                  <span className="dash-cat-item-label">{item.label}</span>
                  <span className="dash-cat-item-detail">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-actions-section">
        <h3>Quick Actions</h3>
        <div className="dash-quick-actions">
          <button className="dash-action-card" onClick={() => { setActiveTab("article"); }}>
            <span className="dash-action-icon">{"\u26A1"}</span>
            <span className="dash-action-label">Generate Content</span>
            <span className="dash-action-desc">Create a full SEO article</span>
          </button>
          <button className="dash-action-card" onClick={() => setActiveTab("mediagen")}>
            <span className="dash-action-icon">{"\uD83C\uDFA5"}</span>
            <span className="dash-action-label">Media Engine</span>
            <span className="dash-action-desc">Image & video prompts</span>
          </button>
          <button className="dash-action-card" onClick={() => setActiveTab("wordpress")}>
            <span className="dash-action-icon">{"\uD83D\uDE80"}</span>
            <span className="dash-action-label">Publish to WordPress</span>
            <span className="dash-action-desc">Send draft to your site</span>
          </button>
          <button className="dash-action-card" onClick={() => setActiveTab("analytics")}>
            <span className="dash-action-icon">{"\uD83D\uDCCA"}</span>
            <span className="dash-action-label">SEO Analytics</span>
            <span className="dash-action-desc">Search Console data</span>
          </button>
        </div>
      </div>
      {result && (
        <div className="dash-preview-section">
          <h3>Generated Content Preview</h3>
          <div className="dash-preview-card">
            <div className="dash-preview-title">{result.metaTitle}</div>
            <div className="dash-preview-desc">{result.metaDescription}</div>
            <div className="dash-preview-meta">
              <span>Slug: /{result.urlSlug}</span>
              <span>Keywords: {result.keywordSuggestions?.length || 0}</span>
              <span>Schema: {result.schema ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app app--v2">
      {/* ── Mobile overlay ── */}
      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">SR</div>
          <div className="sidebar__brand-text">
            <span className="sidebar__name">SEO Rank Writer</span>
            <span className="sidebar__plan">Pro</span>
          </div>
        </div>
        <nav className="sidebar__nav">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sidebar__item ${activeTab === item.key ? "sidebar__item--active" : ""}`}
              onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          {demoMode && <span className="sidebar__demo-tag">Demo Project</span>}
          {saveStatus && <span className="sidebar__status">{saveStatus}</span>}
          <button className="sidebar__demo-btn" onClick={handleLoadDemo}>Load Demo</button>
          <button className="sidebar__clear" onClick={() => { handleClearProject(); setDemoMode(false); }}>Clear Project</button>
          {authEnabled && user && (
            <button className="sidebar__signout" onClick={() => { signOut(); window.location.href = "/"; }}>Sign Out</button>
          )}
          <a href="/" className="sidebar__home-link">Home</a>
        </div>
      </aside>

      {/* ── Top Header ── */}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="topbar__hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1 className="topbar__title">
              {SIDEBAR_ITEMS.find(s => s.key === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="topbar__right">
            {seoHealth.score > 0 && (
              <span className={`topbar__score topbar__score--${seoHealth.score >= 80 ? "green" : seoHealth.score >= 40 ? "yellow" : "red"}`}>
                SEO {seoHealth.score}
              </span>
            )}
            {wpConnected && <span className="topbar__badge topbar__badge--green">WP Connected</span>}
            <button className="topbar__profile" onClick={() => setActiveTab("settings")} title="Settings">
              <span className="topbar__profile-avatar">{user?.email ? user.email[0].toUpperCase() : businessName ? businessName[0].toUpperCase() : "U"}</span>
              <span className="topbar__profile-name">{user?.user_metadata?.full_name || user?.email?.split("@")[0] || businessName || "Settings"}</span>
            </button>
          </div>
        </header>

        <div className="app-content-area">
          {activeTab === "dashboard" ? (
            renderDashboardHome()
          ) : activeTab === "settings" ? (
            <div className="settings-page">
              <div className="settings-wrap">
                <h2 className="settings-section-title">Business Profile</h2>
                <div className="settings-grid">
                  <div className="field"><label>Business Name</label><input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" /></div>
                  <div className="field"><label>Website URL</label><input type="text" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" /></div>
                  <div className="field"><label>Phone Number</label><input type="text" value={settings.phone} onChange={(e) => updateSetting("phone", e.target.value)} placeholder="+1 604 555 1234" /></div>
                  <div className="field"><label>Email</label><input type="email" value={settings.email} onChange={(e) => updateSetting("email", e.target.value)} placeholder="info@example.com" /></div>
                  <div className="field"><label>Default Service Area</label><input type="text" value={settings.serviceArea} onChange={(e) => updateSetting("serviceArea", e.target.value)} placeholder="Vancouver, Richmond, Burnaby" /></div>
                  <div className="field"><label>Default Focus Keyword</label><input type="text" value={settings.defaultKeyword} onChange={(e) => updateSetting("defaultKeyword", e.target.value)} placeholder="cash for cars" /></div>
                </div>
                <div className="field" style={{ maxWidth: 360 }}><label>Brand Tone</label>
                  <select value={settings.brandTone} onChange={(e) => updateSetting("brandTone", e.target.value)}>
                    <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="local-expert">Local Expert</option><option value="sales">Sales-focused</option><option value="trust">Trust-building</option>
                  </select>
                </div>
                <h2 className="settings-section-title">Social Media Links</h2>
                <div className="settings-grid">
                  <div className="field"><label>Facebook</label><input type="url" value={settings.socialFacebook} onChange={(e) => updateSetting("socialFacebook", e.target.value)} placeholder="https://facebook.com/..." /></div>
                  <div className="field"><label>Instagram</label><input type="url" value={settings.socialInstagram} onChange={(e) => updateSetting("socialInstagram", e.target.value)} placeholder="https://instagram.com/..." /></div>
                  <div className="field"><label>LinkedIn</label><input type="url" value={settings.socialLinkedin} onChange={(e) => updateSetting("socialLinkedin", e.target.value)} placeholder="https://linkedin.com/company/..." /></div>
                  <div className="field"><label>TikTok</label><input type="url" value={settings.socialTiktok} onChange={(e) => updateSetting("socialTiktok", e.target.value)} placeholder="https://tiktok.com/@..." /></div>
                </div>
                <h2 className="settings-section-title">Connections</h2>
                <div className="settings-connections">
                  <div className="settings-conn-card">
                    <div className="settings-conn-header"><span>{"\uD83C\uDF10"}</span> WordPress</div>
                    <div className="settings-conn-status">{wpConnected ? <><span className="settings-dot settings-dot--on" /> Connected to {wpSiteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}</> : <><span className="settings-dot settings-dot--off" /> Not connected</>}</div>
                    <button className="inline-btn" style={{ marginTop: 8 }} onClick={() => setActiveTab("wordpress")}>Configure</button>
                  </div>
                  <div className="settings-conn-card">
                    <div className="settings-conn-header"><span>{"\uD83D\uDCCA"}</span> Google Search Console</div>
                    <div className="settings-conn-status"><span className="settings-dot settings-dot--off" /> Configure in SEO Analytics tab</div>
                    {settings.gscProperty && <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>Property: {settings.gscProperty}</div>}
                    <button className="inline-btn" style={{ marginTop: 8 }} onClick={() => setActiveTab("analytics")}>Configure</button>
                  </div>
                </div>
                {authEnabled && user && (
                  <>
                    <h2 className="settings-section-title">Account</h2>
                    <div className="settings-grid">
                      <div className="field"><label>Email</label><input type="text" value={user.email || ""} readOnly style={{ background: "#f8fafc" }} /></div>
                      <div className="field"><label>User ID</label><input type="text" value={user.id.slice(0, 16) + "..."} readOnly style={{ background: "#f8fafc", fontFamily: "monospace", fontSize: "0.82rem" }} /></div>
                    </div>
                  </>
                )}
                <h2 className="settings-section-title">Plan</h2>
                <div className="settings-plan-card">
                  <div className="settings-plan-name">Free Plan</div>
                  <div className="settings-plan-desc">Upgrade to Pro for unlimited pages, WordPress publishing, and more.</div>
                  <a href="/plugins" className="inline-btn" style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>Upgrade to Pro</a>
                </div>
              </div>
            </div>
          ) : activeTab === "insights" ? (
            <div className="insights-page">
              <div className="insights-wrap">
                <div className="insights-header">
                  <h2>SEO Insights</h2>
                  <p>Data from Google Search Console. Connect in <button className="inline-btn" style={{ padding: "2px 10px", fontSize: "0.78rem" }} onClick={() => setActiveTab("analytics")}>SEO Analytics</button> to see real data.</p>
                </div>
                <div className="insights-notice">Connect Google Search Console to view insights. Go to the SEO Analytics tab to connect your Google account.</div>
                <div className="insights-demo-grid">
                  <div className="insights-demo-card"><div className="insights-demo-val">—</div><div className="insights-demo-label">Clicks</div></div>
                  <div className="insights-demo-card"><div className="insights-demo-val">—</div><div className="insights-demo-label">Impressions</div></div>
                  <div className="insights-demo-card"><div className="insights-demo-val">—</div><div className="insights-demo-label">Avg CTR</div></div>
                  <div className="insights-demo-card"><div className="insights-demo-val">—</div><div className="insights-demo-label">Avg Position</div></div>
                </div>
                <h3 style={{ marginTop: 24 }}>Top Local Areas</h3>
                <p className="insights-sub">Based on query patterns from your search data.</p>
                <div className="insights-areas">
                  {["Vancouver", "Richmond", "Burnaby", "Surrey", "McNair", "Steveston", "East Vancouver"].map((area) => (
                    <div key={area} className="insights-area-card">
                      <div className="insights-area-name">{area}</div>
                      <div className="insights-area-stats"><span>— clicks</span><span>— impressions</span></div>
                      <div className="insights-area-action">Suggested: Create a "{mainKeyword || "service"} in {area}" page</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="layout">
            {/* LEFT PANEL — Inputs */}
            <aside className="input-panel">
          <h2 className="section-title">Business Info</h2>
          <div className="field">
            <label htmlFor="businessName">Business Name</label>
            <input id="businessName" type="text" placeholder="e.g. Cash for Cars Vancouver"
              value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="websiteUrl">Website URL</label>
            <input id="websiteUrl" type="text" placeholder="e.g. https://cashforcarsvancouver.ca"
              value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </div>
          <div className="controls-row three-col">
            <div className="field">
              <label htmlFor="pageType">Page Type</label>
              <select id="pageType" value={pageType} onChange={(e) => setPageType(e.target.value as PageType)}>
                <option value="location">Location page</option>
                <option value="service">Service page</option>
                <option value="blog">Blog post</option>
                <option value="homepage">Homepage section</option>
                <option value="landing">Landing page</option>
                <option value="faq">FAQ page</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="wordCount">Word Count</label>
              <select id="wordCount" value={wordCount} onChange={(e) => setWordCount(e.target.value as WordCount)}>
                <option value="800">800</option>
                <option value="1200">1,200</option>
                <option value="1500">1,500</option>
                <option value="2000">2,000</option>
                <option value="2500">2,500</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="local-expert">Local expert</option>
                <option value="sales">Sales-focused</option>
                <option value="trust">Trust-building</option>
              </select>
            </div>
          </div>

          <h2 className="section-title">Keywords &amp; Location</h2>
          <div className="field">
            <label htmlFor="mainKeyword">Main Keyword</label>
            <input id="mainKeyword" type="text" placeholder="e.g. cash for cars McNair"
              value={mainKeyword} onChange={(e) => setMainKeyword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="location">Location / City / Area</label>
            <input id="location" type="text" placeholder="e.g. McNair Richmond BC"
              value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="field">
            <div className="label-with-action">
              <label htmlFor="secondaryKeywords">Secondary Keywords</label>
              <button className="inline-btn" onClick={handleGenerateKeywords}
                disabled={!mainKeyword.trim() || kwLoading}>
                {kwLoading ? "Generating..." : "Generate"}
              </button>
            </div>
            <textarea id="secondaryKeywords" rows={3}
              placeholder={"scrap car removal McNair\njunk car removal Richmond BC\nsell my car McNair"}
              value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} />
          </div>

          <h2 className="section-title">Links</h2>
          <div className="field">
            <div className="label-with-action">
              <label htmlFor="sitemapUrls">Sitemap / Existing Website URLs</label>
              <button className="inline-btn" onClick={handleFetchSitemap}
                disabled={!websiteUrl.trim() || sitemapLoading}>
                {sitemapLoading ? "Fetching..." : "Fetch Sitemap URLs"}
              </button>
            </div>
            <textarea id="sitemapUrls" rows={4}
              placeholder={"Paste your real website URLs here, one per line:\nhttps://yoursite.com/\nhttps://yoursite.com/services/\nhttps://yoursite.com/about/"}
              value={sitemapUrls} onChange={(e) => { setSitemapUrls(e.target.value); setUrlValidation([]); }} />
            <div className="sitemap-status-row">
              <span className="field-hint">{sitemapUrls.trim() ? `${sitemapUrls.trim().split("\n").filter(Boolean).length} URLs loaded` : ""}</span>
              {sitemapUrls.trim() && (
                <button className="inline-btn" onClick={() => handleValidateUrls()} disabled={urlValidating}>
                  {urlValidating ? "Checking..." : hasValidation ? "Recheck Internal Links" : "Validate URLs"}
                </button>
              )}
            </div>
            {hasValidation && (
              <div className="url-validation-summary">
                <span className="url-stat url-stat-valid">{urlValidation.filter(r => r.label === "valid").length} Valid</span>
                <span className="url-stat url-stat-redirect">{urlValidation.filter(r => r.label === "redirect").length} Redirect</span>
                <span className="url-stat url-stat-broken">{urlValidation.filter(r => r.label === "broken").length} Broken</span>
                <span className="url-stat url-stat-skipped">{urlValidation.filter(r => r.label === "skipped").length} Skipped</span>
              </div>
            )}
            {hasValidation && urlValidation.some(r => r.label !== "valid") && (
              <div className="url-validation-list">
                {urlValidation.filter(r => r.label !== "valid").map((r, i) => (
                  <div key={i} className="url-validation-row">
                    <span className={`url-label url-label-${r.label}`}>
                      {r.label === "redirect" ? "Redirect" : r.label === "broken" ? `Broken ${r.status || ""}` : "Skipped"}
                    </span>
                    <span className="url-validation-url">{r.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <div className="label-with-action">
              <label htmlFor="internalLinks">Internal Links</label>
              <button className="inline-btn" onClick={handleGenerateLinks}
                disabled={!sitemapUrls.trim() || linksLoading}>
                {linksLoading ? "Generating..." : "Generate from Sitemap"}
              </button>
            </div>
            {!sitemapUrls.trim() && (
              <div className="links-warning">Add your sitemap URLs first so we do not create broken internal links.</div>
            )}
            {internalLinks.trim() && (
              <div className="generated-links-preview">
                {internalLinks.trim().split("\n").filter(Boolean).map((line, i) => {
                  const parts = line.split("|").map(p => p.trim());
                  const anchor = parts[0] || "";
                  const url = parts.length >= 2 ? parts[1] : "";
                  const reason = parts.length >= 3 ? parts[2] : "";
                  return (
                    <div key={i} className="gen-link-row">
                      <div className="gen-link-main">
                        <span className="gen-link-anchor">{anchor}</span>
                        <span className="gen-link-arrow">&rarr;</span>
                        {url.startsWith("http") ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="gen-link-url">{url}</a>
                        ) : (
                          <span className="gen-link-url">{url || line}</span>
                        )}
                      </div>
                      {reason && <span className="gen-link-reason">{reason}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <textarea id="internalLinks" rows={2}
              placeholder={"anchor text | exact URL | reason\n(Click 'Generate from Sitemap' to auto-fill)"}
              value={internalLinks} onChange={(e) => setInternalLinks(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="externalLinks">External Links</label>
            <textarea id="externalLinks" rows={2}
              placeholder={"https://authority-site.com/page\nhttps://gov-site.ca/resource"}
              value={externalLinks} onChange={(e) => setExternalLinks(e.target.value)} />
          </div>

          <h2 className="section-title">Additional</h2>
          <div className="field">
            <label htmlFor="existingArticle">Existing Article (optional)</label>
            <textarea id="existingArticle" rows={4}
              placeholder="Paste an article to rewrite/improve. Leave blank to generate from scratch."
              value={existingArticle} onChange={(e) => setExistingArticle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="customInstructions">Custom Instructions</label>
            <textarea id="customInstructions" rows={2}
              placeholder="e.g. Add more Richmond references, make it better for leads."
              value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
          </div>

          <div className="sticky-generate">
            <button className="generate-btn" onClick={handleGenerate} disabled={!canGenerate || loading}>
              {loading ? "Generating..." : "Generate SEO Content"}
            </button>
          </div>

          {error && <p className="error-msg">{error}</p>}

          {loading && (
            <div className="loading-indicator">
              <div className="spinner" />
              Generating your SEO content...
            </div>
          )}
        </aside>

        {/* RIGHT PANEL — Results */}
        <main className="results-panel" ref={resultsRef}>
          {!result && !loading && (
            <div className="empty-results">
              <p>Fill in the fields on the left and click <strong>Generate SEO Content</strong> to see results here.</p>
            </div>
          )}

          {/* Secondary tab bar (hidden in sidebar layout, visible as fallback) */}
          <div className="tabs tabs--hidden">
            {TABS.map((tab) => {
              const alwaysEnabled = tab.key === "analytics" || tab.key === "mediagen";
              return (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={!alwaysEnabled && !result}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "analytics" ? (
            <div className="tab-content">
              <SeoAnalytics />
            </div>
          ) : activeTab === "mediagen" && !result ? (
            <div className="tab-content">
              <MediaGenerator
                businessName={businessName}
                mainKeyword={mainKeyword}
                location={location}
                pageType={pageType}
                tone={tone}
                savedVideoPrompts={videoPrompts}
                savedImagePrompts={imagePrompts}
                onVideoPromptsGenerated={setVideoPrompts}
                onImagePromptsGenerated={setImagePrompts}
              />
            </div>
          ) : result ? (
            <>
              <div className="results-toolbar">
                <button className="csv-btn" onClick={() => downloadCsv(result, mainKeyword || location || "export")}>
                  Download CSV
                </button>
              </div>
              {renderTabContent()}
            </>
          ) : null}
        </main>
      </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
