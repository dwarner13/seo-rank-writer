import type { Handler } from "@netlify/functions";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const TONE_LABELS: Record<string, string> = {
  professional: "Use a polished, professional, authoritative tone.",
  friendly: "Use a warm, friendly, approachable tone.",
  "local-expert": "Write as a trusted local expert.",
  sales: "Use a persuasive, sales-focused tone with clear calls-to-action.",
  trust: "Use a trust-building tone — emphasize reliability and experience.",
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: '{"error":"Method not allowed"}' };
  if (!ANTHROPIC_API_KEY) return { statusCode: 500, body: '{"error":"ANTHROPIC_API_KEY not configured"}' };

  const opts = JSON.parse(event.body || "{}");
  if (!opts.mainKeyword && !opts.existingArticle) {
    return { statusCode: 400, body: '{"error":"Provide a main keyword or existing article."}' };
  }

  const systemPrompt = `You are an expert SEO content writer. Respond with valid JSON only — no markdown fences.

The JSON must have these keys:
{ "article": "HTML string", "metaTitle": "string 50-60 chars", "metaDescription": "string 150-160 chars", "focusKeyword": "string", "keywordSuggestions": ["10 strings"], "urlSlug": "string", "schema": "JSON-LD string", "facebookPost": "string", "instagramCaption": "string", "linkedinPost": "string", "tiktokScript": "string", "hashtags": ["10 strings"], "imagePrompts": ["3 strings"], "videoConcept": "string" }

Business: ${opts.businessName || "Not specified"}
Website: ${opts.websiteUrl || "Not specified"}
Main Keyword: ${opts.mainKeyword || "Not specified"}
Location: ${opts.location || "Not specified"}
Word count: ~${opts.wordCount || "1200"} words
Tone: ${TONE_LABELS[opts.tone] || TONE_LABELS.professional}

Write a full SEO article with H1/H2/H3, FAQ section, CTAs. Include meta title, description, schema, social posts.`;

  const userContent = opts.existingArticle
    ? `Optimize this existing article:\n\n${opts.existingArticle}`
    : `Generate a new SEO page for "${opts.mainKeyword}" in "${opts.location || "general"}".`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: userContent }] }),
    });
    if (!res.ok) { const e = await res.text(); console.error("API error:", e); return { statusCode: 502, body: '{"error":"AI service error"}' }; }
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article: parsed.article, metaTitle: parsed.metaTitle, metaDescription: parsed.metaDescription,
        focusKeyword: parsed.focusKeyword, keywordSuggestions: parsed.keywordSuggestions, urlSlug: parsed.urlSlug,
        schema: typeof parsed.schema === "string" ? parsed.schema : JSON.stringify(parsed.schema, null, 2),
        facebook: parsed.facebookPost, instagram: parsed.instagramCaption, linkedin: parsed.linkedinPost,
        tiktokScript: parsed.tiktokScript, hashtags: parsed.hashtags, imagePrompts: parsed.imagePrompts,
        videoConcept: parsed.videoConcept, linkAudit: { approved: 0, used: [], removed: [] },
      }),
    };
  } catch (err: unknown) {
    return { statusCode: 500, body: JSON.stringify({ error: err instanceof Error ? err.message : "Generation failed" }) };
  }
};
export { handler };
