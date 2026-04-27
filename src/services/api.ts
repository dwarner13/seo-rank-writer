import type { GeneratedContent, GenerateOptions, PageType } from "../types";

/**
 * Try Express server first (local dev via Vite proxy), fall back to Netlify function (production).
 */
async function apiFetch(expressPath: string, netlifyFunc: string, options: RequestInit): Promise<Response> {
  // Try Express server (local dev). On Netlify, /api/* returns HTML 404 page.
  try {
    const res = await fetch(expressPath, options);
    // If Express is running and returned a real JSON response, use it
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res;
  } catch {
    // Network error — Express not running
  }
  // Fall back to Netlify function
  return fetch(`/.netlify/functions/${netlifyFunc}`, options);
}

function postJson(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function generateContent(options: GenerateOptions): Promise<GeneratedContent> {
  const res = await apiFetch("/api/generate", "generate", postJson(options));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  return res.json();
}

export async function humanizeArticle(options: {
  article: string; mainKeyword: string; location: string; tone: string;
}): Promise<string> {
  const res = await apiFetch("/api/humanize", "humanize", postJson(options));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.article;
}

export interface InternalLink {
  anchorText: string;
  url: string;
  reason: string;
}

export async function generateInternalLinks(options: {
  sitemapUrls: string; mainKeyword: string; location: string; businessName: string;
}): Promise<InternalLink[]> {
  const res = await apiFetch("/api/internal-links", "internal-links", postJson(options));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.links;
}

export async function fetchSitemapUrls(websiteUrl: string): Promise<string[]> {
  const res = await apiFetch("/api/fetch-sitemap", "fetch-sitemap", postJson({ websiteUrl }));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.urls;
}

export interface UrlValidationResult {
  url: string;
  status: number;
  label: "valid" | "redirect" | "broken" | "skipped";
  finalUrl?: string;
}

export async function validateUrls(urls: string[]): Promise<UrlValidationResult[]> {
  const res = await apiFetch("/api/validate-urls", "validate-urls", postJson({ urls }));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.results;
}

export async function generateKeywords(options: {
  mainKeyword: string; location: string; businessName: string; pageType: PageType;
}): Promise<string[]> {
  const res = await apiFetch("/api/generate-keywords", "generate-keywords", postJson(options));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.keywords;
}

export async function regenerateField(options: {
  field: string; currentContent: string;
  context: { mainKeyword: string; location: string; businessName: string; pageType: string; tone: string; };
}): Promise<unknown> {
  const res = await apiFetch("/api/regenerate-field", "regenerate-field", postJson(options));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  const data = await res.json();
  return data.value;
}
