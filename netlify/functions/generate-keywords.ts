import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  if (!ANTHROPIC_API_KEY) return { statusCode: 500, body: '{"error":"ANTHROPIC_API_KEY not configured"}' };

  const { mainKeyword, location, businessName, pageType } = JSON.parse(event.body || "{}");
  if (!mainKeyword) return { statusCode: 400, body: '{"error":"Main keyword is required."}' };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are a local SEO keyword research expert. Respond with valid JSON only — no markdown fences.",
        messages: [{ role: "user", content: `Generate 10 long-tail keyword ideas for:\nKeyword: ${mainKeyword}\nLocation: ${location || "general"}\nBusiness: ${businessName || "not specified"}\nPage Type: ${pageType || "general"}\n\nReturn: { "keywords": ["keyword1", "keyword2", ...] }\n\nRules: exactly 10 keywords, 3-6 words each, include location in most, mix of service+location and action+location phrases.` }],
      }),
    });
    if (!res.ok) return { statusCode: 502, body: '{"error":"AI service error"}' };
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(JSON.parse(cleaned)) };
  } catch (err: unknown) {
    return { statusCode: 500, body: JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }) };
  }
};
export { handler };
