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

  const systemPrompt = `You are a professional SEO strategist who generates ONLY realistic Google search keywords.

CRITICAL RULES:
- Every keyword must sound like something a REAL person would type into Google
- Do NOT force the location name into every keyword — only add location where it sounds natural
- Do NOT create awkward word combinations just to include a neighborhood name
- Use the CITY name more than the neighborhood name
- "near me" keywords should NOT include a specific location
- Start from real base search patterns, then add natural modifiers
- Think about what someone with a phone in their hand would actually type

GOOD examples: "cash for cars Vancouver", "sell my car for cash near me", "how much is my junk car worth"
BAD examples: "cash for cars Ironwood Vancouver BC area", "how fast cash for cars Ironwood"`;

  const userPrompt = `Generate keyword research for:

Business: ${businessType || "local service business"}
Location: ${location || "general"}
${seedKeyword ? `Seed Keyword: ${seedKeyword}` : ""}
${websiteUrl ? `Website: ${websiteUrl}` : ""}

Step 1: Identify 5-8 realistic BASE keywords people search for this business type.
Step 2: Add natural modifiers: city name, "near me", "same day", "free", "best", etc.
Step 3: Generate keywords that pass the "would a real person type this?" test.

Return ONLY valid JSON, no markdown fences:
{
  "topMoneyKeywords": [5 — high buyer intent, ready to buy NOW],
  "longTailKeywords": [5 — 4-7 words, specific situations],
  "questionKeywords": [5 — start with how/what/where/can/do/is],
  "localSeoKeywords": [5 — city name used naturally, "near me" variants],
  "contentIdeas": [5 — compelling blog/article titles targeting real searches]
}

Each item: { "keyword": "the search phrase", "intent": "Commercial|Local|Informational|Transactional", "difficulty": "Easy|Medium|Hard", "priorityScore": 1-100, "pageType": "Service Page|Blog Post|Location Page|FAQ|GBP Post", "reason": "why this keyword matters" }

Priority: money 85-98, local 70-90, long-tail 55-75, questions 40-65. Each group exactly 5 items.`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
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
