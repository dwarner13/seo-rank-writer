// Google Search Console API client

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getGscAuthStatus(): Promise<{ connected: boolean }> {
  const res = await fetch("/api/google/auth/status");
  return res.json();
}

export async function disconnectGoogle(): Promise<void> {
  await fetch("/api/google/auth/disconnect", { method: "POST" });
}

export async function getGscSites(): Promise<GscSite[]> {
  const res = await fetch("/api/google/gsc/sites");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.sites;
}

export async function getSearchAnalytics(options: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<GscRow[]> {
  const res = await fetch("/api/google/gsc/search-analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.rows;
}

/** Returns ISO date string for N days ago */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
