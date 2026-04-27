import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };

  const { websiteUrl } = JSON.parse(event.body || "{}");
  if (!websiteUrl) return { statusCode: 400, body: '{"error":"Website URL is required."}' };

  const base = websiteUrl.replace(/\/+$/, "");
  const paths = ["/sitemap_index.xml", "/page-sitemap.xml", "/sitemap.xml"];
  const allUrls = new Set<string>();

  async function extract(url: string): Promise<string[]> {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "SEORankWriter/1.0" }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      const xml = await r.text();
      const urls: string[] = [];
      const re = /<loc>\s*(.*?)\s*<\/loc>/gi;
      let m;
      while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
      return urls;
    } catch { return []; }
  }

  try {
    for (const p of paths) {
      const urls = await extract(base + p);
      for (const u of urls) {
        if (u.endsWith(".xml") || u.endsWith(".xml.gz")) {
          const sub = await extract(u);
          for (const s of sub) { if (!s.endsWith(".xml") && !s.endsWith(".xml.gz")) allUrls.add(s); }
        } else { allUrls.add(u); }
      }
      if (allUrls.size > 0) break;
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: Array.from(allUrls) }) };
  } catch (err: unknown) {
    return { statusCode: 500, body: JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }) };
  }
};
export { handler };
