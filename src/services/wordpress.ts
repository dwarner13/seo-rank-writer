import type { GeneratedContent } from "../types";

/**
 * The full SEO package sent to WordPress.
 * V1 uses standard WP REST API (creates draft with article content).
 * V2 will use a custom plugin endpoint that saves RankMath fields, schema, etc.
 */
export interface WordPressPayload {
  // Page basics
  title: string;
  slug: string;
  content: string;

  // SEO metadata (used by V2 plugin)
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywordSuggestions: string[];
  schema: string;

  // Links
  internalLinks: string;

  // Social content (used by V2 plugin)
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktokScript: string;
  hashtags: string[];

  // GBP content (used by V2 plugin)
  gbpUpdate: string;
  gbpOffer: string;
  gbpCta: string;

  // SEO score from app
  seoScore?: number;
  seoBreakdown?: Record<string, { earned: number; max: number }>;

  // Post type: page or post
  postType?: "page" | "post";

  // Future: Elementor template ID (left empty for now)
  elementorTemplateId?: string;
}

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
  apiKey?: string;
}

export interface WordPressResult {
  id: number;
  link: string;
  status: string;
  postType?: string;
  method?: string;
}

/**
 * Build a short, keyword-rich slug from mainKeyword + location.
 * Example: "Top Cash for Cars McNair BC | Same-Day Pickup Service"
 *       -> "cash-for-cars-mcnair-bc"
 */
export function buildCleanSlug(mainKeyword: string, location: string): string {
  const raw = [mainKeyword, location].filter(Boolean).join(" ");
  const stripWords =
    /\b(top|best|same[- ]?day|pickup|pick[- ]?up|service|services|near[- ]?me|the|a|an|in|for|and|or|of|with|your|our|get|free|most|trusted|reliable|affordable|cheap|premium|expert|professional)\b/gi;
  return raw
    .toLowerCase()
    .replace(stripWords, "")
    .replace(/\|/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Build the full payload from generated content + user inputs.
 */
export function buildWordPressPayload(
  result: GeneratedContent,
  internalLinks: string,
  mainKeyword: string,
  location: string,
  seoScore?: number,
  seoBreakdown?: Record<string, { earned: number; max: number }>
): WordPressPayload {
  return {
    title: result.metaTitle,
    slug: buildCleanSlug(mainKeyword, location),
    content: result.article,
    metaTitle: result.metaTitle,
    metaDescription: result.metaDescription,
    focusKeyword: result.focusKeyword,
    keywordSuggestions: result.keywordSuggestions,
    schema: result.schema,
    internalLinks,
    facebook: result.facebook,
    instagram: result.instagram,
    linkedin: result.linkedin,
    tiktokScript: result.tiktokScript,
    hashtags: result.hashtags,
    gbpUpdate: result.gbpUpdate,
    gbpOffer: result.gbpOffer,
    gbpCta: result.gbpCta,
    seoScore,
    seoBreakdown,
  };
}

/**
 * Send the SEO package to WordPress via our backend proxy.
 * The backend handles auth and decides V1 vs V2 endpoint.
 */
export async function sendToWordPress(
  config: WordPressConfig,
  payload: WordPressPayload
): Promise<WordPressResult> {
  const res = await fetch("/api/wordpress/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, payload }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `WordPress error (${res.status})`);
  }

  return res.json();
}

/**
 * Test WordPress connection using /wp-json/wp/v2/users/me.
 */
export async function testWordPressConnection(config: WordPressConfig): Promise<{ ok: boolean; name?: string; error?: string }> {
  const res = await fetch("/api/wordpress/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    return { ok: false, error: `Server error (${res.status})` };
  }

  return res.json();
}
