import type { GeneratedContent, GenerateOptions, PageType } from "../types";

export async function generateContent(
  options: GenerateOptions
): Promise<GeneratedContent> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }

  return res.json();
}

export async function humanizeArticle(options: {
  article: string;
  mainKeyword: string;
  location: string;
  tone: string;
}): Promise<string> {
  const res = await fetch("/api/humanize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

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
  sitemapUrls: string;
  mainKeyword: string;
  location: string;
  businessName: string;
}): Promise<InternalLink[]> {
  const res = await fetch("/api/internal-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.links;
}

export async function fetchSitemapUrls(websiteUrl: string): Promise<string[]> {
  const res = await fetch("/api/fetch-sitemap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ websiteUrl }),
  });

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
  const res = await fetch("/api/validate-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.results;
}

export async function generateKeywords(options: {
  mainKeyword: string;
  location: string;
  businessName: string;
  pageType: PageType;
}): Promise<string[]> {
  const res = await fetch("/api/generate-keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.keywords;
}

export async function regenerateField(options: {
  field: string;
  currentContent: string;
  context: {
    mainKeyword: string;
    location: string;
    businessName: string;
    pageType: string;
    tone: string;
  };
}): Promise<unknown> {
  const res = await fetch("/api/regenerate-field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.value;
}
