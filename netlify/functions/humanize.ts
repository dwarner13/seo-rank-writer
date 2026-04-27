import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  if (!ANTHROPIC_API_KEY) return { statusCode: 500, body: '{"error":"ANTHROPIC_API_KEY not configured"}' };

  const { article, mainKeyword, location, tone } = JSON.parse(event.body || "{}");
  if (!article) return { statusCode: 400, body: '{"error":"Article content is required."}' };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 8192,
        system: `You are an expert copy editor. Make AI content sound natural and human. Respond with JSON only: { "article": "..." }. Keep ALL HTML tags, links, headings, FAQ section. Vary sentence lengths, remove robotic patterns, add conversational touches.`,
        messages: [{ role: "user", content: `Humanize this article. Keyword: "${mainKeyword || ""}". Location: "${location || ""}".\n\n${article}` }],
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
