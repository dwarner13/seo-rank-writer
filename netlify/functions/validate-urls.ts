import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };

  const { urls } = JSON.parse(event.body || "{}");
  if (!urls || !Array.isArray(urls)) return { statusCode: 400, body: '{"error":"No URLs to validate."}' };

  const skipPatterns = [/\/wp-admin/i, /\/wp-content\/uploads/i, /\/feed\/?$/i, /\/tag\//i, /\/category\//i, /\/author\//i, /\.(jpg|jpeg|png|gif|svg|pdf|zip)$/i];

  async function check(url: string) {
    for (const p of skipPatterns) { if (p.test(url)) return { url, status: 0, label: "skipped" }; }
    try {
      const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": "SEORankWriter/1.0" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (r.ok) return r.redirected ? { url, status: r.status, label: "redirect", finalUrl: r.url } : { url, status: r.status, label: "valid" };
      if (r.status === 405) {
        const g = await fetch(url, { method: "GET", headers: { "User-Agent": "SEORankWriter/1.0" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
        if (g.ok) return g.redirected ? { url, status: g.status, label: "redirect", finalUrl: g.url } : { url, status: g.status, label: "valid" };
        return { url, status: g.status, label: "broken" };
      }
      return { url, status: r.status, label: "broken" };
    } catch { return { url, status: 0, label: "broken" }; }
  }

  try {
    const results = [];
    for (let i = 0; i < urls.length; i += 10) {
      const batch = urls.slice(i, i + 10);
      results.push(...await Promise.all(batch.map(check)));
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results }) };
  } catch (err: unknown) {
    return { statusCode: 500, body: JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }) };
  }
};
export { handler };
