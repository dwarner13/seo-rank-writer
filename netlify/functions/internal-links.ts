import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  if (!ANTHROPIC_API_KEY) return { statusCode: 500, body: '{"error":"ANTHROPIC_API_KEY not configured"}' };

  const { sitemapUrls, mainKeyword, location, businessName } = JSON.parse(event.body || "{}");
  if (!sitemapUrls?.trim()) return { statusCode: 400, body: '{"error":"Paste sitemap URLs first."}' };

  const urlList = sitemapUrls.split("\n").map((u: string) => u.trim()).filter((u: string) => u.startsWith("http"));
  if (urlList.length === 0) return { statusCode: 400, body: '{"error":"No valid URLs found."}' };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 2048,
        system: `You are an SEO internal linking expert. Respond with valid JSON only — no markdown fences. ONLY use URLs from the provided list. Return: [{ "anchorText": "string", "url": "exact URL from list", "reason": "brief reason" }]. Return 5-10 links.`,
        messages: [{ role: "user", content: `URLs:\n${urlList.join("\n")}\n\nKeyword: "${mainKeyword || "general"}"\nLocation: "${location || "general"}"\nBusiness: "${businessName || ""}"` }],
      }),
    });
    if (!res.ok) return { statusCode: 502, body: '{"error":"AI service error"}' };
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const urlSet = new Set(urlList);
    const verified = parsed.filter((l: { url: string }) => urlSet.has(l.url));
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ links: verified }) };
  } catch (err: unknown) {
    return { statusCode: 500, body: JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }) };
  }
};
export { handler };
