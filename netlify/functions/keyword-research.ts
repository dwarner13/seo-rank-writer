import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  let body: { businessType?: string; location?: string; websiteUrl?: string; seedKeyword?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { businessType, location, seedKeyword, websiteUrl } = body;
  if (!businessType && !seedKeyword) {
    return { statusCode: 400, body: JSON.stringify({ error: "Provide a business type or seed keyword." }) };
  }

  const prompt = `You are an expert local SEO strategist. Generate keyword research for:

Business Type: ${businessType || "local service business"}
Location: ${location || "general"}
${websiteUrl ? `Website: ${websiteUrl}` : ""}
${seedKeyword ? `Seed Keyword: ${seedKeyword}` : ""}

Return ONLY valid JSON, no markdown fences, no explanation. Use this exact structure:

{
  "topMoneyKeywords": [5 high buyer-intent keywords],
  "longTailKeywords": [5 easier-to-rank long-tail phrases],
  "questionKeywords": [5 question-based keywords for FAQ/blog],
  "localSeoKeywords": [5 location-specific keywords with city/neighborhood/near me],
  "contentIdeas": [5 article/page title suggestions]
}

Each keyword object must be:
{
  "keyword": "string",
  "intent": "Commercial" | "Local" | "Informational" | "Transactional",
  "difficulty": "Easy" | "Medium" | "Hard",
  "priorityScore": number 1-100,
  "pageType": "Service Page" | "Blog Post" | "Location Page" | "FAQ" | "GBP Post",
  "reason": "brief reason this keyword matters"
}

Rules:
- All keywords must be specific to the business type and location
- Money keywords should have high commercial/transactional intent
- Long-tail keywords should be 4-7 words, easier to rank
- Question keywords should start with how, what, why, when, where, which, can, do, is
- Local keywords must include the city/area name or "near me"
- Content ideas should be compelling article titles
- Priority scores: money keywords 80-100, local 70-90, long-tail 50-75, questions 40-65
- Each group must have exactly 5 items`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", res.status, err);
      return { statusCode: 502, body: JSON.stringify({ error: "AI service error" }) };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Keyword research failed";
    console.error("Keyword research error:", msg);
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
};

export { handler };
