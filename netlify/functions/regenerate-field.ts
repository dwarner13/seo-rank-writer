import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  if (!ANTHROPIC_API_KEY) return { statusCode: 500, body: '{"error":"ANTHROPIC_API_KEY not configured"}' };

  const { field, currentContent, context } = JSON.parse(event.body || "{}");
  if (!field || !currentContent) return { statusCode: 400, body: '{"error":"Field and content required."}' };

  const instructions: Record<string, string> = {
    metaTitle: "Write a new SEO meta title (50-60 chars). Include the main keyword.",
    metaDescription: "Write a new SEO meta description (150-160 chars). Include keyword and CTA.",
    focusKeyword: "Suggest a better focus keyword (2-4 words).",
    urlSlug: "Suggest a better URL slug. Lowercase, hyphens, include keyword.",
    keywordSuggestions: "Generate 10 keyword suggestions. Return as JSON array of strings.",
    schema: "Generate new valid JSON-LD schema markup. Return as JSON string.",
    facebook: "Write a new engaging Facebook post.",
    instagram: "Write a new Instagram caption with line breaks and CTA.",
    linkedin: "Write a new professional LinkedIn post.",
    tiktokScript: "Write a new TikTok script with [HOOK], [BODY], [CTA].",
    hashtags: "Generate 10 relevant hashtags. Return as JSON array of strings.",
    videoConcept: "Write a new short video concept.",
    article: "Rewrite the full SEO article. Keep structure. Output as HTML.",
  };

  const instruction = instructions[field];
  if (!instruction) return { statusCode: 400, body: JSON.stringify({ error: `Unknown field: ${field}` }) };

  const isArray = field === "keywordSuggestions" || field === "hashtags";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: field === "article" ? 8192 : 2048,
        system: `You are an expert SEO content writer. Respond with JSON only: { "value": <content> }. ${isArray ? '"value" must be a JSON array of strings.' : '"value" must be a string.'}
Business: ${context?.businessName || ""}, Keyword: ${context?.mainKeyword || ""}, Location: ${context?.location || ""}`,
        messages: [{ role: "user", content: `${instruction}\n\nCurrent:\n${currentContent}` }],
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
