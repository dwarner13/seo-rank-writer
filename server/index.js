import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "200kb" }));

// ── Google OAuth Setup ─────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/google/auth/callback";
const GOOGLE_TOKENS_PATH = join(__dirname, "google-tokens.json");

function getOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function loadTokens() {
  if (!existsSync(GOOGLE_TOKENS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(GOOGLE_TOKENS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  writeFileSync(GOOGLE_TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

function deleteTokens() {
  if (existsSync(GOOGLE_TOKENS_PATH)) {
    writeFileSync(GOOGLE_TOKENS_PATH, "", "utf-8");
  }
}

function getAuthenticatedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials(tokens);
  // Auto-refresh: save new tokens when refreshed
  oauth2.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    saveTokens(merged);
  });
  return oauth2;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Parse approved internal URLs from the "anchor | url | reason" format
function parseApprovedUrls(internalLinks) {
  if (!internalLinks) return [];
  return internalLinks
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const parts = l.split("|").map((p) => p.trim());
      return parts.length >= 2 ? parts[1] : parts[0];
    })
    .filter((u) => u.startsWith("http"));
}

// Audit and strip unapproved internal links from generated HTML
function enforceApprovedLinks(html, approvedUrls, websiteUrl) {
  if (!html) return { html, linksUsed: [], linksRemoved: [] };

  const approvedSet = new Set(approvedUrls);
  // Also normalize without trailing slash for comparison
  const approvedNormalized = new Set(approvedUrls.map((u) => u.replace(/\/+$/, "")));

  const siteDomain = websiteUrl
    ? new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname
    : null;

  const linksUsed = [];
  const linksRemoved = [];

  // Match all <a> tags
  const cleaned = html.replace(/<a\s+([^>]*?)>(.*?)<\/a>/gi, (fullMatch, attrs, innerText) => {
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) return fullMatch; // no href, keep as-is

    const href = hrefMatch[1];

    // External links — keep them
    if (siteDomain) {
      try {
        const linkHost = new URL(href.startsWith("http") ? href : `https://${href}`).hostname;
        if (linkHost !== siteDomain) return fullMatch; // external, keep
      } catch {
        return fullMatch; // malformed URL, keep as text
      }
    }

    // Internal link — check if approved
    const hrefNorm = href.replace(/\/+$/, "");
    if (approvedSet.has(href) || approvedNormalized.has(hrefNorm)) {
      linksUsed.push({ url: href, anchorText: innerText.replace(/<[^>]*>/g, "").trim() });
      return fullMatch; // approved, keep
    }

    // Unapproved internal link — strip the <a> tag, keep the text
    linksRemoved.push({ url: href, anchorText: innerText.replace(/<[^>]*>/g, "").trim() });
    return innerText; // remove link, keep anchor text
  });

  return { html: cleaned, linksUsed, linksRemoved };
}

// Strip markdown code fences that Claude sometimes adds despite instructions
function extractJson(text) {
  // Remove ```json ... ``` or ``` ... ```
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/,  "");
  return cleaned.trim();
}

const TONE_LABELS = {
  professional: "Use a polished, professional, authoritative tone.",
  friendly: "Use a warm, friendly, approachable tone — like talking to a neighbor.",
  "local-expert": "Write as a trusted local expert who knows the area inside and out. Reference local landmarks, neighborhoods, and community details.",
  sales: "Use a persuasive, sales-focused tone with clear calls-to-action and urgency.",
  trust: "Use a trust-building tone — emphasize reliability, experience, testimonials-style language, and credibility.",
};

const PAGE_TYPE_LABELS = {
  location: "Location page",
  service: "Service page",
  blog: "Blog post",
  homepage: "Homepage section",
  landing: "Landing page",
  faq: "FAQ page",
};

const SCHEMA_INSTRUCTIONS = {
  location: 'Include LocalBusiness schema and Service schema. If FAQs are present, also include FAQPage schema.',
  service: 'Include Service schema. If FAQs are present, also include FAQPage schema.',
  blog: 'Include Article or BlogPosting schema. If FAQs are present, also include FAQPage schema.',
  homepage: 'Include WebPage schema and Organization schema.',
  landing: 'Include WebPage schema. If FAQs are present, also include FAQPage schema.',
  faq: 'Include FAQPage schema as the primary schema.',
};

function buildSystemPrompt(options) {
  const {
    businessName,
    websiteUrl,
    pageType,
    mainKeyword,
    location,
    secondaryKeywords,
    internalLinks,
    externalLinks,
    wordCount,
    tone,
    customInstructions,
  } = options;

  return `You are an expert SEO content writer and social media strategist. You create high-quality, optimized content for any business, any service, and any page type.

You MUST respond with valid JSON only — no markdown code fences, no explanation outside the JSON. Just the raw JSON object.

The JSON must have exactly these keys:
{
  "article": "string (the full SEO article/page content in HTML format with h1, h2, h3, p, ul, li, a tags)",
  "metaTitle": "string (50-60 characters, include main keyword)",
  "metaDescription": "string (150-160 characters, compelling with keyword)",
  "focusKeyword": "string (RankMath focus keyword)",
  "keywordSuggestions": ["10 RankMath keyword suggestions as strings"],
  "urlSlug": "string (SEO-friendly URL slug)",
  "schema": "string (valid JSON-LD schema markup as a string)",
  "facebookPost": "string",
  "instagramCaption": "string",
  "linkedinPost": "string",
  "tiktokScript": "string",
  "hashtags": ["exactly 10 hashtags"],
  "imagePrompts": ["exactly 3 AI image generation prompts"],
  "videoConcept": "string"
}

--- BUSINESS CONTEXT ---
Business: ${businessName || "Not specified"}
Website: ${websiteUrl || "Not specified"}
Page Type: ${PAGE_TYPE_LABELS[pageType] || "General page"}
Main Keyword: ${mainKeyword || "Not specified"}
Location: ${location || "Not specified"}

${secondaryKeywords ? `--- SECONDARY KEYWORDS (weave these naturally into the article) ---\n${secondaryKeywords}` : ""}

${(() => {
  if (!internalLinks) return "--- INTERNAL LINKS ---\nNo internal links provided. Do NOT add ANY internal links to the article. Do NOT invent or guess URLs.";
  // Parse the "anchor | url | reason" format to extract just the URLs
  const lines = internalLinks.split("\n").filter(l => l.trim());
  const urls = lines.map(l => {
    const parts = l.split("|").map(p => p.trim());
    // If the line has pipes, URL is the second part; otherwise treat the whole line as URL
    return parts.length >= 2 ? parts[1] : parts[0];
  }).filter(u => u.startsWith("http"));
  return `--- INTERNAL LINK RULES (STRICT) ---

You are ONLY allowed to use internal links from this approved list:

${urls.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Rules:
- DO NOT create or guess URLs — every href must be copied exactly from the list above
- DO NOT modify URLs — no adding paths, parameters, or fragments
- Only use links from the list above — if no relevant link exists, DO NOT add a link
- Use natural, descriptive anchor text (do NOT use the raw URL as anchor text)
- Maximum 5–8 internal links in the article
- Spread links naturally throughout the article, not clustered together`;
})()}

${externalLinks ? `--- EXTERNAL LINKS (reference these as authoritative sources where relevant) ---\n${externalLinks}` : ""}

--- ARTICLE REQUIREMENTS ---
- Target word count: approximately ${wordCount || "1200"} words
- Write a strong, CTR-optimized H1 title that includes the main keyword
- Use H2 and H3 subheadings with long-tail keywords naturally included
- Write natural, flowing paragraphs — NO keyword stuffing
- Include clear CTA (call-to-action) sections
- ONLY use internal links from the APPROVED LIST above — violating this rule is not acceptable
- Include external links if provided, as authoritative references
- Include a FAQ section with 4-6 relevant questions and answers
- Output the article as clean HTML (h1, h2, h3, p, ul, li, a, strong tags)

--- TONE ---
${TONE_LABELS[tone] || TONE_LABELS["professional"]}

--- SCHEMA REQUIREMENTS ---
${SCHEMA_INSTRUCTIONS[pageType] || SCHEMA_INSTRUCTIONS["location"]}
Generate valid JSON-LD schema. Use the business name, website URL, and location provided. Output the schema as a JSON string.

--- SOCIAL MEDIA CONTENT ---
Based on the generated article, also create:
- facebookPost: engaging, conversational, include a question to drive comments
- instagramCaption: punchy, line breaks, CTA, mention "link in bio"
- linkedinPost: professional thought-leadership angle with bullet points
- tiktokScript: include [HOOK 0-3s], [BODY 3-15s], [CTA 15-20s] sections
- hashtags: exactly 10 relevant hashtags for the business and location
- imagePrompts: exactly 3 detailed AI image generation prompts
- videoConcept: short video concept with title, format, structure, music

${customInstructions ? `--- CUSTOM INSTRUCTIONS (follow these closely) ---\n${customInstructions}` : ""}`;
}

// ── Fetch Sitemap URLs ────────────────────────────────────────────
// Tries multiple common sitemap locations and extracts all page URLs.
app.post("/api/fetch-sitemap", async (req, res) => {
  const { websiteUrl } = req.body;

  if (!websiteUrl) {
    return res.status(400).json({ error: "Website URL is required." });
  }

  const base = websiteUrl.replace(/\/+$/, "");
  const sitemapPaths = [
    "/sitemap_index.xml",
    "/page-sitemap.xml",
    "/sitemap.xml",
  ];

  const allUrls = new Set();

  async function extractUrlsFromSitemap(url) {
    try {
      const sitemapRes = await fetch(url, {
        headers: { "User-Agent": "SEOContentFactory/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!sitemapRes.ok) return [];

      const xml = await sitemapRes.text();
      const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
      const urls = [];
      let match;
      while ((match = locRegex.exec(xml)) !== null) {
        urls.push(match[1].trim());
      }
      return urls;
    } catch {
      return [];
    }
  }

  try {
    for (const path of sitemapPaths) {
      const urls = await extractUrlsFromSitemap(base + path);
      for (const url of urls) {
        // If it's a sub-sitemap XML, fetch that too
        if (url.endsWith(".xml") || url.endsWith(".xml.gz")) {
          const subUrls = await extractUrlsFromSitemap(url);
          for (const subUrl of subUrls) {
            if (!subUrl.endsWith(".xml") && !subUrl.endsWith(".xml.gz")) {
              allUrls.add(subUrl);
            }
          }
        } else {
          allUrls.add(url);
        }
      }
      // If we found URLs, no need to try other sitemap paths
      if (allUrls.size > 0) break;
    }

    res.json({ urls: Array.from(allUrls) });
  } catch (err) {
    console.error("Sitemap fetch error:", err);
    res.status(500).json({ error: "Failed to fetch sitemap." });
  }
});

// ── Validate URLs ────────────────────────────────────────────────
// HEAD-check each URL and return status labels.
app.post("/api/validate-urls", async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "No URLs to validate." });
  }

  // Skip patterns: admin, media, tags, categories, feeds
  const skipPatterns = [
    /\/wp-admin/i,
    /\/wp-content\/uploads/i,
    /\/wp-login/i,
    /\/feed\/?$/i,
    /\/tag\//i,
    /\/category\//i,
    /\/author\//i,
    /\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3|webp)$/i,
  ];

  async function checkUrl(url) {
    // Skip known non-page URLs
    for (const pattern of skipPatterns) {
      if (pattern.test(url)) {
        return { url, status: 0, label: "skipped" };
      }
    }

    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": "SEOContentFactory/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        // Check if it was redirected
        if (response.redirected) {
          return { url, status: response.status, label: "redirect", finalUrl: response.url };
        }
        return { url, status: response.status, label: "valid" };
      }

      if (response.status === 405) {
        // HEAD not supported, try GET
        const getRes = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": "SEOContentFactory/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        if (getRes.ok) {
          if (getRes.redirected) {
            return { url, status: getRes.status, label: "redirect", finalUrl: getRes.url };
          }
          return { url, status: getRes.status, label: "valid" };
        }
        return { url, status: getRes.status, label: "broken" };
      }

      return { url, status: response.status, label: "broken" };
    } catch {
      return { url, status: 0, label: "broken" };
    }
  }

  try {
    // Process in batches of 10 to avoid overwhelming servers
    const results = [];
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(checkUrl));
      results.push(...batchResults);
    }

    res.json({ results });
  } catch (err) {
    console.error("URL validation error:", err);
    res.status(500).json({ error: "Failed to validate URLs." });
  }
});

// ── Generate Internal Links ──────────────────────────────────────
// ONLY selects from user-provided URLs. Never invents URLs.
app.post("/api/internal-links", async (req, res) => {
  const { sitemapUrls, mainKeyword, location, businessName } = req.body;

  if (!sitemapUrls || !sitemapUrls.trim()) {
    return res.status(400).json({ error: "Paste your sitemap URLs first. We only use real URLs — never invented ones." });
  }

  // Parse the URLs from the text (one per line)
  const urlList = sitemapUrls
    .split("\n")
    .map((u) => u.trim())
    .filter((u) => u && u.startsWith("http"));

  if (urlList.length === 0) {
    return res.status(400).json({ error: "No valid URLs found. Paste URLs starting with http/https, one per line." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are an SEO internal linking expert.

You MUST respond with valid JSON only — no markdown, no code fences, no explanation. Just the raw JSON array.

CRITICAL RULE: You may ONLY use URLs from the provided list below. Do NOT create, guess, or invent any URLs. Every "url" value in your response MUST be copied exactly from the list.

Return a JSON array of 5-10 internal link suggestions:
[
  {
    "anchorText": "descriptive anchor text with keyword",
    "url": "exact URL from the provided list",
    "reason": "brief reason this link is relevant"
  }
]

Rules:
- ONLY use URLs from the provided list — copy them exactly, character for character
- Every anchor text MUST be unique — no two links can share the same anchor text
- Anchor text should be descriptive, natural phrases (3-7 words), not raw URLs
- Include relevant keywords in anchor text but vary the wording each time
- Do NOT use generic anchors like "click here", "learn more", or "read more"
- Reasons should be brief (5-10 words)
- Prioritize pages most relevant to the main keyword and location
- If fewer than 5 URLs are relevant, return only the relevant ones`,
      messages: [{
        role: "user",
        content: `Here are the ONLY URLs you may use:\n${urlList.join("\n")}\n\nSelect 5-10 of the most relevant pages for internal linking.\nMain keyword: "${mainKeyword || "general"}"\nLocation: "${location || "general"}"\nBusiness: "${businessName || "not specified"}"`,
      }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));

    // Safety filter: remove any URL that isn't in the original list
    const urlSet = new Set(urlList);
    const verified = parsed.filter((link) => urlSet.has(link.url));

    // Deduplicate anchor texts — keep first occurrence, append suffix to duplicates
    const seenAnchors = new Set();
    for (const link of verified) {
      const lower = link.anchorText.toLowerCase().trim();
      if (seenAnchors.has(lower)) {
        // Extract page name from URL to make it unique
        const slug = link.url.replace(/\/+$/, "").split("/").pop() || "";
        const words = slug.replace(/-/g, " ").trim();
        link.anchorText = words ? `${link.anchorText} — ${words}` : `${link.anchorText} (${link.url.split("/").filter(Boolean).pop()})`;
      }
      seenAnchors.add(lower);
    }

    res.json({ links: verified });
  } catch (err) {
    console.error("Internal links error:", err);

    if (err instanceof SyntaxError) {
      return res
        .status(502)
        .json({ error: "Claude returned invalid JSON. Please try again." });
    }

    const status = err?.status || 500;
    const errMessage = err?.message || "Failed to generate internal links.";
    res.status(status).json({ error: errMessage });
  }
});

// ── Regenerate a single content field ─────────────────────────────
app.post("/api/regenerate-field", async (req, res) => {
  const { field, currentContent, context } = req.body;
  // context = { mainKeyword, location, businessName, pageType, tone, article }

  if (!field || !currentContent) {
    return res.status(400).json({ error: "Field name and current content are required." });
  }

  const fieldInstructions = {
    metaTitle: "Write a new SEO meta title (50-60 characters). Include the main keyword. Make it compelling for clicks.",
    metaDescription: "Write a new SEO meta description (150-160 characters). Include the main keyword. Make it compelling with a call-to-action.",
    focusKeyword: "Suggest a better focus keyword (2-4 words) for RankMath. It should be the most searchable version of the main topic.",
    urlSlug: "Suggest a better SEO-friendly URL slug. Lowercase, hyphens, include the main keyword, keep it short.",
    keywordSuggestions: "Generate 10 new RankMath keyword suggestions. Return as a JSON array of strings. Mix long-tail and short-tail keywords relevant to the topic and location.",
    schema: "Generate new valid JSON-LD schema markup for this page. Return the schema as a JSON string.",
    facebook: "Write a new Facebook post. Make it engaging, conversational, include a question to drive comments. 2-3 paragraphs.",
    instagram: "Write a new Instagram caption. Punchy, with line breaks, a CTA, and mention 'link in bio'.",
    linkedin: "Write a new LinkedIn post. Professional thought-leadership angle with bullet points.",
    tiktokScript: "Write a new TikTok/Reel script with [HOOK 0-3s], [BODY 3-15s], [CTA 15-20s] sections.",
    hashtags: "Generate 10 new relevant hashtags. Return as a JSON array of strings. Include mix of broad and niche hashtags.",
    videoConcept: "Write a new short video concept with title, format, structure, and music suggestion.",
    article: "Rewrite the full SEO article. Keep the same structure (H1, H2, H3, FAQ) and internal/external links. Make it fresh and different from the current version. Output as HTML.",
  };

  const instruction = fieldInstructions[field];
  if (!instruction) {
    return res.status(400).json({ error: `Unknown field: ${field}` });
  }

  const isArrayField = field === "keywordSuggestions" || field === "hashtags";
  const isJsonField = field === "schema";

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: field === "article" ? 8192 : 2048,
      system: `You are an expert SEO content writer. You will regenerate a single piece of content.

You MUST respond with valid JSON only — no markdown code fences, no explanation. Just the raw JSON object.

Response format: { "value": <the new content> }

${isArrayField ? 'The "value" must be a JSON array of strings.' : isJsonField ? 'The "value" must be a valid JSON-LD string.' : 'The "value" must be a string.'}

Business: ${context?.businessName || "Not specified"}
Main Keyword: ${context?.mainKeyword || "Not specified"}
Location: ${context?.location || "Not specified"}
Page Type: ${context?.pageType || "general"}
Tone: ${TONE_LABELS[context?.tone] || "professional"}`,
      messages: [{
        role: "user",
        content: `${instruction}\n\nCurrent content to improve upon (write something DIFFERENT):\n${currentContent}`,
      }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));
    res.json({ value: parsed.value });
  } catch (err) {
    console.error("Regenerate field error:", err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Claude returned invalid JSON. Please try again." });
    }
    const status = err?.status || 500;
    const errMessage = err?.message || "Failed to regenerate content.";
    res.status(status).json({ error: errMessage });
  }
});

app.post("/api/humanize", async (req, res) => {
  const { article, mainKeyword, location, tone } = req.body;

  if (!article) {
    return res.status(400).json({ error: "Article content is required." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: `You are an expert copy editor who makes AI-generated content sound natural and human.

You MUST respond with valid JSON only — no markdown code fences, no explanation. Just: { "article": "..." }

Rules:
- Rewrite the article to sound natural, warm, and human — like a real local expert wrote it
- Vary sentence lengths: mix short punchy sentences with longer flowing ones
- Remove robotic patterns like "In conclusion", "It's important to note", "Whether you're looking for"
- Add conversational touches — contractions, local flavor, real-world references
- Keep ALL existing HTML tags (h1, h2, h3, p, ul, li, a, strong)
- Keep ALL internal and external links exactly as they are
- Keep ALL SEO keywords but weave them more naturally
- Keep ALL CTA sections
- Keep the FAQ section
- Keep the same heading structure
- Do NOT add or remove headings
- Do NOT change the topic or meaning
- Maintain approximately the same word count
- Tone: ${TONE_LABELS[tone] || "natural and approachable"}`,
      messages: [
        {
          role: "user",
          content: `Humanize this article. Main keyword: "${mainKeyword || "not specified"}". Location: "${location || "not specified"}".\n\nArticle:\n${article}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));
    res.json({ article: parsed.article });
  } catch (err) {
    console.error("Humanize error:", err);

    if (err instanceof SyntaxError) {
      return res
        .status(502)
        .json({ error: "Claude returned invalid JSON. Please try again." });
    }

    const status = err?.status || 500;
    const errMessage = err?.message || "Failed to humanize article.";
    res.status(status).json({ error: errMessage });
  }
});

app.post("/api/generate-keywords", async (req, res) => {
  const { mainKeyword, location, businessName, pageType } = req.body;

  if (!mainKeyword) {
    return res.status(400).json({ error: "Main keyword is required." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a local SEO keyword research expert. You generate long-tail keyword ideas that real people search for on Google.

You MUST respond with valid JSON only — no markdown, no code fences, no explanation. Just the raw JSON object.

The JSON must be: { "keywords": ["keyword1", "keyword2", ...] }

Rules:
- Return exactly 10 keywords
- Every keyword must be a long-tail phrase (3-6 words)
- Include the location/area name in most keywords
- Mix keyword types: "service + location", "action + location", "problem + location", "near me" variants
- Make them specific to the business type and service
- Avoid generic single-word keywords
- Order from highest to lowest estimated search intent`,
      messages: [
        {
          role: "user",
          content: `Generate 10 local SEO long-tail keywords for:
Main Keyword: ${mainKeyword}
Location: ${location || "not specified"}
Business: ${businessName || "not specified"}
Page Type: ${PAGE_TYPE_LABELS[pageType] || "general page"}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));
    res.json({ keywords: parsed.keywords });
  } catch (err) {
    console.error("Keyword generation error:", err);

    if (err instanceof SyntaxError) {
      return res
        .status(502)
        .json({ error: "Claude returned invalid JSON. Please try again." });
    }

    const status = err?.status || 500;
    const errMessage = err?.message || "Failed to generate keywords.";
    res.status(status).json({ error: errMessage });
  }
});

app.post("/api/generate", async (req, res) => {
  const options = req.body;

  if (!options.mainKeyword && !options.existingArticle) {
    return res.status(400).json({
      error: "Please provide a main keyword or paste an existing article.",
    });
  }

  const userContent = options.existingArticle
    ? `Here is the existing article/content to work with:\n\n${options.existingArticle}\n\nUse this as the basis for generating the optimized content, SEO metadata, schema, and social media posts.`
    : `Generate a brand new ${PAGE_TYPE_LABELS[options.pageType] || "page"} targeting the keyword "${options.mainKeyword}" for the location "${options.location || "general"}".`;

  const systemPrompt = buildSystemPrompt(options);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      system: systemPrompt,
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));

    // Enforce approved internal links — strip any the AI invented
    const approvedUrls = parseApprovedUrls(options.internalLinks);
    const linkAudit = enforceApprovedLinks(parsed.article, approvedUrls, options.websiteUrl);

    res.json({
      article: linkAudit.html,
      metaTitle: parsed.metaTitle,
      metaDescription: parsed.metaDescription,
      focusKeyword: parsed.focusKeyword,
      keywordSuggestions: parsed.keywordSuggestions,
      urlSlug: parsed.urlSlug,
      schema: typeof parsed.schema === "string" ? parsed.schema : JSON.stringify(parsed.schema, null, 2),
      facebook: parsed.facebookPost,
      instagram: parsed.instagramCaption,
      linkedin: parsed.linkedinPost,
      tiktokScript: parsed.tiktokScript,
      hashtags: parsed.hashtags,
      imagePrompts: parsed.imagePrompts,
      videoConcept: parsed.videoConcept,
      linkAudit: {
        approved: approvedUrls.length,
        used: linkAudit.linksUsed,
        removed: linkAudit.linksRemoved,
      },
    });
  } catch (err) {
    console.error("Generation error:", err);

    if (err instanceof SyntaxError) {
      return res
        .status(502)
        .json({ error: "Claude returned invalid JSON. Please try again." });
    }

    const status = err?.status || 500;
    const errMessage =
      err?.message || "Something went wrong generating content.";
    res.status(status).json({ error: errMessage });
  }
});

// ── Google OAuth ───────────────────────────────────────────────────
// Start OAuth flow — redirects browser to Google consent screen
app.get("/api/google/auth/start", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: "Google OAuth credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env" });
  }
  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });
  res.redirect(url);
});

// OAuth callback — exchanges code for tokens and redirects back to app
app.get("/api/google/auth/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect("/?gsc_error=" + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect("/?gsc_error=no_code");
  }
  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    saveTokens(tokens);
    res.redirect("/?gsc_connected=1");
  } catch (err) {
    console.error("Google OAuth error:", err.message);
    res.redirect("/?gsc_error=" + encodeURIComponent(err.message));
  }
});

// Check connection status
app.get("/api/google/auth/status", (req, res) => {
  const tokens = loadTokens();
  res.json({ connected: !!tokens && !!tokens.access_token });
});

// Disconnect — delete stored tokens
app.post("/api/google/auth/disconnect", (req, res) => {
  deleteTokens();
  res.json({ ok: true });
});

// ── Google Search Console: List Sites ──────────────────────────────
app.get("/api/google/gsc/sites", async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: "Not connected to Google." });

  try {
    const webmasters = google.webmasters({ version: "v3", auth });
    const result = await webmasters.sites.list();
    const sites = (result.data.siteEntry || []).map((s) => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
    }));
    res.json({ sites });
  } catch (err) {
    console.error("GSC sites error:", err.message);
    if (err.status === 401) {
      deleteTokens();
      return res.status(401).json({ error: "Google token expired. Please reconnect." });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Google Search Console: Search Analytics ────────────────────────
app.post("/api/google/gsc/search-analytics", async (req, res) => {
  const auth = getAuthenticatedClient();
  if (!auth) return res.status(401).json({ error: "Not connected to Google." });

  const { siteUrl, startDate, endDate, dimensions, rowLimit } = req.body;
  if (!siteUrl || !startDate || !endDate) {
    return res.status(400).json({ error: "siteUrl, startDate, and endDate are required." });
  }

  try {
    const webmasters = google.webmasters({ version: "v3", auth });
    const result = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: dimensions || ["page"],
        rowLimit: rowLimit || 100,
      },
    });

    const rows = (result.data.rows || []).map((row) => ({
      keys: row.keys,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));

    res.json({ rows });
  } catch (err) {
    console.error("GSC search-analytics error:", err.message);
    if (err.status === 401) {
      deleteTokens();
      return res.status(401).json({ error: "Google token expired. Please reconnect." });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Media: AI Video Prompt Generation ──────────────────────────────
app.post("/api/media/video/prompts", async (req, res) => {
  const { businessName, mainKeyword, location, pageType, tone, metaTitle, metaDescription, cta } = req.body;

  if (!mainKeyword) {
    return res.status(400).json({ error: "Main keyword is required." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an expert video marketing strategist for local businesses. You create short-form video storyboards and prompts optimized for TikTok, Instagram Reels, and YouTube Shorts.

You MUST respond with valid JSON only — no markdown code fences, no explanation. Just the raw JSON object.

The JSON must have exactly these keys:
{
  "script": "string — full video script with [HOOK], [BODY], [CTA] sections",
  "storyboard": [
    {
      "sceneNumber": 1,
      "duration": "0-3s",
      "description": "what happens in this scene",
      "visualPrompt": "detailed AI video generation prompt for this scene",
      "textOverlay": "text shown on screen"
    }
  ],
  "verticalPrompt": "string — complete Sora/AI video prompt for 9:16 vertical format",
  "horizontalPrompt": "string — complete Sora/AI video prompt for 16:9 horizontal format",
  "textOverlays": ["array of 4-6 text overlay strings to show during video"],
  "ctaEnding": "string — the final call-to-action text and action"
}

Rules:
- Storyboard must have exactly 3 scenes
- Each scene should be 3-5 seconds
- verticalPrompt and horizontalPrompt should be standalone, complete prompts ready for Sora API
- Include specific visual details: camera angles, lighting, movement, colors
- Make prompts feel authentic and local, not stock-video generic
- Text overlays should be short, punchy, and readable on mobile
- CTA should drive calls, visits, or form submissions`,
      messages: [{
        role: "user",
        content: `Create a short-form marketing video plan for:

Business: ${businessName || "Local Service Business"}
Service/Keyword: ${mainKeyword}
Location: ${location || "local area"}
Page Type: ${pageType || "service"}
Tone: ${tone || "professional"}
${metaTitle ? `Article Title: ${metaTitle}` : ""}
${metaDescription ? `Description: ${metaDescription}` : ""}
${cta ? `Existing CTA: ${cta}` : ""}

Create an engaging 10-15 second video concept that would work for TikTok/Reels/Shorts.`,
      }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));
    res.json(parsed);
  } catch (err) {
    console.error("Video prompt generation error:", err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Claude returned invalid JSON. Please try again." });
    }
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to generate video prompts." });
  }
});

// ── Media: AI Image Prompt Generation ──────────────────────────────
app.post("/api/media/image/prompts", async (req, res) => {
  const { businessName, mainKeyword, location, pageType, tone } = req.body;

  if (!mainKeyword) {
    return res.status(400).json({ error: "Main keyword is required." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are an expert marketing photographer and visual content strategist. You create detailed AI image generation prompts for local business marketing.

You MUST respond with valid JSON only — no markdown code fences, no explanation. Just the raw JSON object.

The JSON must be:
{
  "featuredImage": "string — detailed prompt for 16:9 featured/hero image",
  "socialSquare": "string — detailed prompt for 1:1 social media image",
  "socialStory": "string — detailed prompt for 9:16 story/reel cover image",
  "gbpImage": "string — detailed prompt for Google Business Profile photo"
}

Rules:
- Each prompt should be 2-3 sentences, highly detailed
- Include lighting, composition, mood, camera angle, color palette
- Make images feel authentic and local, not stock-photo generic
- No text in images unless specifically for social overlays
- Featured image should have space for text overlay
- All prompts should be ready for DALL-E or Midjourney`,
      messages: [{
        role: "user",
        content: `Create marketing image prompts for:
Business: ${businessName || "Local Service Business"}
Service/Keyword: ${mainKeyword}
Location: ${location || "local area"}
Page Type: ${pageType || "service"}
Tone: ${tone || "professional"}`,
      }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = JSON.parse(extractJson(text));
    res.json(parsed);
  } catch (err) {
    console.error("Image prompt generation error:", err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "Claude returned invalid JSON. Please try again." });
    }
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message || "Failed to generate image prompts." });
  }
});

// ── Media: Sora Video Generation ───────────────────────────────────
app.post("/api/media/video/generate", async (req, res) => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured in .env" });
  }

  const { prompt, duration, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Video prompt is required." });
  }

  // Map aspect ratio to Sora size
  const sizeMap = {
    "9:16": "1080x1920",
    "16:9": "1920x1080",
    "1:1": "1080x1080",
  };

  try {
    const soraRes = await fetch("https://api.openai.com/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sora",
        prompt,
        n: 1,
        size: sizeMap[aspectRatio] || "1080x1920",
        duration: duration || 5,
      }),
      signal: AbortSignal.timeout(300000), // 5 min timeout for video gen
    });

    if (!soraRes.ok) {
      const errBody = await soraRes.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Sora API error (${soraRes.status})`);
    }

    const data = await soraRes.json();
    // Sora returns video data — extract the result
    const video = data.data?.[0];
    res.json({
      id: video?.id || data.id || "unknown",
      status: "completed",
      url: video?.url || video?.video?.url || null,
    });
  } catch (err) {
    console.error("Sora video generation error:", err);
    res.status(502).json({
      error: err?.message || "Failed to generate video.",
      id: null,
      status: "failed",
    });
  }
});

// ── WordPress Publish ──────────────────────────────────────────────
// ── Test WordPress Connection ────────────────────────────────────
// Supports two auth methods: API Key (SSF plugin) or Basic Auth (standard WP)
app.post("/api/wordpress/test", async (req, res) => {
  const { siteUrl, username, appPassword, apiKey } = req.body;

  if (!siteUrl) {
    return res.status(400).json({ ok: false, error: "Site URL is required." });
  }

  const base = siteUrl.replace(/\/+$/, "");

  try {
    // If API key provided, test via plugin endpoint
    if (apiKey) {
      const pluginRes = await fetch(`${base}/wp-json/seo-social-factory/v1/test`, {
        headers: { "X-SSF-API-Key": apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (!pluginRes.ok) {
        const body = await pluginRes.json().catch(() => ({}));
        if (pluginRes.status === 401) return res.json({ ok: false, error: "Invalid API key." });
        return res.json({ ok: false, error: body?.message || `Plugin returned ${pluginRes.status}` });
      }

      const data = await pluginRes.json();
      return res.json({ ok: true, name: data.name || "WordPress", url: base, method: "plugin" });
    }

    // Otherwise, test via Basic Auth
    if (!username || !appPassword) {
      return res.json({ ok: false, error: "Provide either an API key or username + app password." });
    }

    const authHeader = "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
    const wpRes = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    });

    if (!wpRes.ok) {
      const body = await wpRes.json().catch(() => ({}));
      const msg = body?.message || `WordPress returned ${wpRes.status}`;
      const code = body?.code || "";
      if (wpRes.status === 401) return res.json({ ok: false, error: "Invalid username or app password." });
      if (wpRes.status === 403) return res.json({ ok: false, error: "Access forbidden. Check your user permissions or security plugin." });
      return res.json({ ok: false, error: `${msg}${code ? ` (${code})` : ""}` });
    }

    const user = await wpRes.json();
    res.json({ ok: true, name: user.name || username, url: base, method: "basic-auth" });
  } catch (err) {
    const msg = err?.message || "Connection failed.";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      return res.json({ ok: false, error: "Could not reach the site. Check the URL." });
    }
    res.json({ ok: false, error: msg });
  }
});
//   - Create draft page
//   - Save RankMath meta fields (meta title, description, focus keyword, suggestions)
//   - Inject schema JSON-LD
//   - Optionally apply an Elementor template (via elementorTemplateId)

app.post("/api/wordpress/publish", async (req, res) => {
  const { config, payload } = req.body;

  if (!config?.siteUrl) {
    return res.status(400).json({ error: "WordPress site URL is required." });
  }

  if (!payload?.content) {
    return res.status(400).json({ error: "No content to publish." });
  }

  const siteUrl = config.siteUrl.replace(/\/+$/, "");
  const postType = payload.postType === "post" ? "post" : "page";

  // Clean article content: remove first <h1> to avoid duplicate title
  const cleanContent = (payload.content || "").replace(/<h1[^>]*>.*?<\/h1>\s*/i, "").trim();

  // Build a clean, short slug from the payload slug or keyword+location
  let cleanSlug = payload.slug || "";
  if (cleanSlug) {
    // Strip common filler words that bloat slugs
    const stripWords = /\b(top|best|same-day|same day|pickup|pick-up|service|services|near-me|near me|the|a|an|in|for|and|or|of|with|your|our|get|free)\b/gi;
    cleanSlug = cleanSlug
      .toLowerCase()
      .replace(stripWords, "")
      .replace(/\|/g, "")           // remove pipe characters
      .replace(/[^a-z0-9-\s]/g, "") // keep only alphanumeric, hyphens, spaces
      .replace(/\s+/g, "-")         // spaces to hyphens
      .replace(/-{2,}/g, "-")       // collapse multiple hyphens
      .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
  }

  // Decide auth method: API Key (plugin) or Basic Auth (standard WP REST)
  const usePlugin = !!config.apiKey;

  console.log(`[WP Export] Post type: ${postType}, Site: ${siteUrl}, Method: ${usePlugin ? "SSF Plugin" : "Basic Auth"}`);

  try {
    let wpRes, wpData;

    if (usePlugin) {
      // ── SSF Plugin endpoint ──
      const pluginUrl = `${siteUrl}/wp-json/seo-social-factory/v1/create-draft`;
      console.log(`[WP Export] Plugin endpoint: ${pluginUrl}`);

      const pluginBody = {
        title: payload.metaTitle || payload.title || "",
        slug: cleanSlug,
        content: cleanContent,
        status: "draft",
        postType,
        excerpt: payload.metaDescription || "",
        metaTitle: payload.metaTitle || "",
        metaDescription: payload.metaDescription || "",
        focusKeyword: payload.focusKeyword || "",
        schemaJson: payload.schema || "",
        ogTitle: payload.metaTitle || "",
        ogDescription: payload.metaDescription || "",
        ogImage: "",
        seoScore: payload.seoScore ?? null,
        seoBreakdown: payload.seoBreakdown ? JSON.stringify(payload.seoBreakdown) : "",
      };

      wpRes = await fetch(pluginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SSF-API-Key": config.apiKey,
        },
        body: JSON.stringify(pluginBody),
        signal: AbortSignal.timeout(30000),
      });

      console.log(`[WP Export] Response status: ${wpRes.status}`);

      if (!wpRes.ok) {
        const errBody = await wpRes.json().catch(() => ({}));
        const msg = errBody?.message || errBody?.data?.message || `WordPress returned status ${wpRes.status}`;
        throw new Error(msg);
      }

      wpData = await wpRes.json();
      console.log(`[WP Export] Plugin success — ID: ${wpData.id}`);

      return res.json({
        id: wpData.id,
        link: wpData.link || `${siteUrl}/?p=${wpData.id}`,
        editLink: wpData.editLink || `${siteUrl}/wp-admin/post.php?post=${wpData.id}&action=edit`,
        status: wpData.status || "draft",
        postType: wpData.type || postType,
        method: "plugin",
      });

    } else {
      // ── Standard WP REST API with Basic Auth ──
      if (!config.username || !config.appPassword) {
        return res.status(400).json({ error: "Username and app password are required for Basic Auth." });
      }

      const authHeader = "Basic " + Buffer.from(`${config.username}:${config.appPassword}`).toString("base64");
      const wpEndpoint = postType === "post" ? "posts" : "pages";
      const wpUrl = `${siteUrl}/wp-json/wp/v2/${wpEndpoint}`;
      console.log(`[WP Export] Standard endpoint: ${wpUrl}`);

      wpRes = await fetch(wpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          title: payload.metaTitle || payload.title || "",
          slug: cleanSlug,
          content: cleanContent,
          excerpt: payload.metaDescription || "",
          status: "draft",
        }),
        signal: AbortSignal.timeout(30000),
      });

      console.log(`[WP Export] Response status: ${wpRes.status}`);

      if (!wpRes.ok) {
        const errBody = await wpRes.json().catch(() => ({}));
        const msg = errBody?.message || errBody?.data?.message || `WordPress returned status ${wpRes.status}`;
        const code = errBody?.code || "";
        throw new Error(`${msg}${code ? ` (${code})` : ""}`);
      }

      wpData = await wpRes.json();
      console.log(`[WP Export] Success — ID: ${wpData.id}, Type: ${wpData.type}`);

      return res.json({
        id: wpData.id,
        link: wpData.link || `${siteUrl}/wp-admin/post.php?post=${wpData.id}&action=edit`,
        status: wpData.status || "draft",
        postType: wpData.type || postType,
        method: "basic-auth",
      });
    }
  } catch (err) {
    console.error("[WP Export] Error:", err?.message || err);
    const errMessage = err?.message || "Failed to publish to WordPress.";
    res.status(502).json({ error: errMessage });
  }
});

// ── Plugin Licensing & Downloads ────────────────────────────────────
const LICENSES_PATH = join(__dirname, "licenses.json");
const PLUGINS_DIR = join(__dirname, "plugins");

function loadLicenses() {
  if (!existsSync(LICENSES_PATH)) return {};
  try {
    return JSON.parse(readFileSync(LICENSES_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveLicenses(data) {
  writeFileSync(LICENSES_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function generateLicenseKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SSF-${seg()}-${seg()}-${seg()}-${seg()}`;
}

// Get license status for current user/session
app.get("/api/plugins/license", (req, res) => {
  const licenses = loadLicenses();
  // For V1 (local app, no auth), use a single default license entry
  const entry = licenses.default || null;
  if (!entry) {
    return res.json({ hasLicense: false, plan: "free" });
  }
  res.json({
    hasLicense: true,
    licenseKey: entry.licenseKey,
    plan: entry.plan || "pro",
    activatedAt: entry.activatedAt,
    expiresAt: entry.expiresAt || null,
    sites: entry.sites || 1,
  });
});

// Activate a license key (validates format, stores it)
app.post("/api/plugins/license/activate", (req, res) => {
  const { licenseKey } = req.body;
  if (!licenseKey || typeof licenseKey !== "string") {
    return res.status(400).json({ error: "License key is required." });
  }

  // Validate format: SSF-XXXXX-XXXXX-XXXXX-XXXXX
  const keyPattern = /^SSF-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  if (!keyPattern.test(licenseKey.trim().toUpperCase())) {
    return res.status(400).json({ error: "Invalid license key format." });
  }

  const licenses = loadLicenses();
  licenses.default = {
    licenseKey: licenseKey.trim().toUpperCase(),
    plan: "pro",
    activatedAt: new Date().toISOString(),
    expiresAt: null, // null = lifetime or managed by Stripe
    sites: 5,
  };
  saveLicenses(licenses);

  res.json({ ok: true, ...licenses.default });
});

// Deactivate license
app.post("/api/plugins/license/deactivate", (req, res) => {
  const licenses = loadLicenses();
  delete licenses.default;
  saveLicenses(licenses);
  res.json({ ok: true });
});

// Generate a new license key (admin/dev use — will be Stripe webhook in production)
app.post("/api/plugins/license/generate", (req, res) => {
  const licenses = loadLicenses();
  const key = generateLicenseKey();
  licenses.default = {
    licenseKey: key,
    plan: req.body?.plan || "pro",
    activatedAt: new Date().toISOString(),
    expiresAt: null,
    sites: req.body?.sites || 5,
  };
  saveLicenses(licenses);
  res.json({ ok: true, licenseKey: key, ...licenses.default });
});

// Download plugin ZIP
app.get("/api/plugins/download", (req, res) => {
  const type = req.query.type || "free";

  if (type === "pro") {
    // Check license before allowing pro download
    const licenses = loadLicenses();
    const entry = licenses.default;
    if (!entry || !entry.licenseKey) {
      return res.status(403).json({ error: "Pro plugin requires an active license. Activate your license key first." });
    }
    // Check expiry if set
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return res.status(403).json({ error: "License has expired. Please renew your subscription." });
    }
  }

  const filename = type === "pro"
    ? "seo-social-factory-pro.zip"
    : "seo-social-factory-free.zip";
  const filepath = join(PLUGINS_DIR, filename);

  if (!existsSync(filepath)) {
    return res.status(404).json({
      error: `Plugin file not found. Place ${filename} in server/plugins/ to enable downloads.`,
    });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.sendFile(filepath);
});

// ── Backlink Checker ───────────────────────────────────────────────
const BACKLINK_API_KEY = process.env.DATAFORSEO_API_KEY || "";

function scoreBacklink(link) {
  let score = "good";
  const reasons = [];

  // Spam signals
  const spamTlds = [".xyz", ".top", ".loan", ".click", ".win", ".bid", ".stream", ".gdn"];
  const domain = (link.referringDomain || "").toLowerCase();
  if (spamTlds.some((t) => domain.endsWith(t))) {
    score = "bad";
    reasons.push("Spammy TLD");
  }

  // Exact-match anchor over-optimization
  const anchor = (link.anchorText || "").toLowerCase().trim();
  if (anchor && anchor.split(/\s+/).length <= 2 && anchor.length > 3) {
    // Crude check — short exact anchors are risky at scale
    if (score !== "bad") score = "warning";
    reasons.push("Short exact-match anchor text");
  }

  // Generic anchors
  const genericAnchors = ["click here", "read more", "here", "website", "link", "this"];
  if (genericAnchors.includes(anchor)) {
    if (score !== "bad") score = "warning";
    reasons.push("Generic anchor text");
  }

  // Forum/comment patterns
  const commentPatterns = ["/comment", "/forum", "/profile", "guestbook", "/user/"];
  if (commentPatterns.some((p) => (link.backlinkUrl || "").toLowerCase().includes(p))) {
    if (score !== "bad") score = "warning";
    reasons.push("Forum/comment link");
  }

  // No-follow isn't bad but worth noting
  if (link.nofollow) {
    reasons.push("Nofollow link");
  }

  if (reasons.length === 0) {
    reasons.push("Natural backlink from relevant domain");
  }

  return { score, reasons };
}

// Generate demo backlink data when no API provider is configured
function generateDemoBacklinks(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  return [
    { referringDomain: "localbusinessdirectory.com", backlinkUrl: "https://localbusinessdirectory.com/listing/" + cleanDomain, targetPage: "https://" + cleanDomain + "/", anchorText: cleanDomain, nofollow: false, firstSeen: "2025-11-15" },
    { referringDomain: "cityreviews.ca", backlinkUrl: "https://cityreviews.ca/best-services/" + cleanDomain.split(".")[0], targetPage: "https://" + cleanDomain + "/", anchorText: "top rated local service", nofollow: false, firstSeen: "2025-09-22" },
    { referringDomain: "forum.webmasterworld.com", backlinkUrl: "https://forum.webmasterworld.com/comment/thread-4821", targetPage: "https://" + cleanDomain + "/services/", anchorText: "click here", nofollow: true, firstSeen: "2025-08-10" },
    { referringDomain: "spamlinks.xyz", backlinkUrl: "https://spamlinks.xyz/pages/links-2025.html", targetPage: "https://" + cleanDomain + "/", anchorText: cleanDomain.split(".")[0], nofollow: false, firstSeen: "2026-01-05" },
    { referringDomain: "chamberofcommerce.org", backlinkUrl: "https://chamberofcommerce.org/members/" + cleanDomain.split(".")[0], targetPage: "https://" + cleanDomain + "/", anchorText: cleanDomain.split(".")[0].replace(/-/g, " ") + " - official member", nofollow: false, firstSeen: "2025-06-18" },
    { referringDomain: "bloggersnetwork.top", backlinkUrl: "https://bloggersnetwork.top/profile/user8832", targetPage: "https://" + cleanDomain + "/blog/", anchorText: "website", nofollow: true, firstSeen: "2026-02-01" },
    { referringDomain: "industryinsider.com", backlinkUrl: "https://industryinsider.com/resources/recommended", targetPage: "https://" + cleanDomain + "/about/", anchorText: "recommended " + cleanDomain.split(".")[0].replace(/-/g, " ") + " provider", nofollow: false, firstSeen: "2025-07-30" },
    { referringDomain: "localnews.ca", backlinkUrl: "https://localnews.ca/business-spotlight-" + cleanDomain.split(".")[0], targetPage: "https://" + cleanDomain + "/", anchorText: cleanDomain.split(".")[0].replace(/-/g, " ") + " featured in local news", nofollow: false, firstSeen: "2025-10-12" },
  ];
}

app.post("/api/backlinks/check", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Website URL or domain is required." });
  }

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  try {
    let rawLinks;

    if (BACKLINK_API_KEY) {
      // Future: call DataForSEO / Ahrefs / Semrush API here
      // For now, fall through to demo data even with key set
      rawLinks = generateDemoBacklinks(domain);
    } else {
      rawLinks = generateDemoBacklinks(domain);
    }

    // Score each backlink
    const backlinks = rawLinks.map((link) => {
      const { score, reasons } = scoreBacklink(link);
      return { ...link, rating: score, reasons };
    });

    // Summary stats
    const total = backlinks.length;
    const good = backlinks.filter((b) => b.rating === "good").length;
    const warning = backlinks.filter((b) => b.rating === "warning").length;
    const bad = backlinks.filter((b) => b.rating === "bad").length;
    const uniqueDomains = new Set(backlinks.map((b) => b.referringDomain)).size;

    res.json({
      domain,
      summary: { total, good, warning, bad, uniqueDomains },
      backlinks,
      isDemo: !BACKLINK_API_KEY,
    });
  } catch (err) {
    console.error("Backlink check error:", err);
    res.status(500).json({ error: err?.message || "Failed to check backlinks." });
  }
});

// ── SEO Report Builder ─────────────────────────────────────────────
app.post("/api/report/generate", async (req, res) => {
  const { websiteUrl, businessName, mainKeyword, location, pageType } = req.body;

  if (!websiteUrl && !mainKeyword) {
    return res.status(400).json({ error: "Provide a website URL or main keyword." });
  }

  const domain = (websiteUrl || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") || "example.com";
  const biz = businessName || domain.split(".")[0].replace(/-/g, " ");
  const kw = mainKeyword || biz;
  const loc = location || "your area";

  try {
    // AI-generated recommendations
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3072,
      system: `You are an expert SEO auditor. You MUST respond with valid JSON only — no markdown code fences, no explanation.

Return this exact structure:
{
  "seoScore": { "score": number 0-100, "grade": "A/B/C/D/F", "summary": "string" },
  "keywordOpportunities": [
    { "keyword": "string", "intent": "informational|transactional|navigational|commercial", "suggestedTitle": "string", "whyItMatters": "string", "estimatedDifficulty": "low|medium|high", "estimatedVolume": "low|medium|high" }
  ],
  "suggestedPages": [
    { "title": "string", "slug": "string", "pageType": "string", "targetKeyword": "string", "priority": "high|medium|low" }
  ],
  "internalLinkingPlan": [
    { "fromPage": "string", "toPage": "string", "anchorText": "string", "reason": "string" }
  ],
  "aiRecommendations": [
    { "category": "string", "priority": "high|medium|low", "title": "string", "description": "string", "impact": "string" }
  ]
}

Rules:
- keywordOpportunities: exactly 10 items, mix of transactional and informational
- suggestedPages: exactly 6 items
- internalLinkingPlan: exactly 5 items
- aiRecommendations: exactly 8 items covering technical SEO, content, links, and local SEO
- Be specific to the business, keyword, and location provided`,
      messages: [{
        role: "user",
        content: `Generate a full SEO audit report for:\nBusiness: ${biz}\nWebsite: ${domain}\nMain Keyword: ${kw}\nLocation: ${loc}\nPage Type: ${pageType || "service"}`,
      }],
    });

    const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const aiData = JSON.parse(extractJson(text));

    // Build backlink summary (demo)
    const backlinkDemo = generateDemoBacklinks(domain);
    const blScored = backlinkDemo.map((l) => ({ ...l, ...scoreBacklink(l) }));
    const backlinkHealth = {
      total: blScored.length,
      good: blScored.filter((b) => b.score === "good").length,
      warning: blScored.filter((b) => b.score === "warning").length,
      bad: blScored.filter((b) => b.score === "bad").length,
      uniqueDomains: new Set(blScored.map((b) => b.referringDomain)).size,
      topLinks: blScored.slice(0, 5),
      isDemo: true,
    };

    // GSC placeholder (real data comes from frontend if connected)
    const gscPlaceholder = {
      connected: false,
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      avgPosition: 0,
      topPages: [],
      topKeywords: [],
    };

    res.json({
      domain,
      businessName: biz,
      mainKeyword: kw,
      location: loc,
      generatedAt: new Date().toISOString(),
      seoScore: aiData.seoScore,
      keywordOpportunities: aiData.keywordOpportunities,
      suggestedPages: aiData.suggestedPages,
      internalLinkingPlan: aiData.internalLinkingPlan,
      backlinkHealth,
      gsc: gscPlaceholder,
      aiRecommendations: aiData.aiRecommendations,
    });
  } catch (err) {
    console.error("Report generation error:", err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned invalid data. Please try again." });
    }
    res.status(err?.status || 500).json({ error: err?.message || "Failed to generate report." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
