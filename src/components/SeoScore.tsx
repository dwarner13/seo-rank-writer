import type { GeneratedContent } from "../types";

interface SeoScoreProps {
  result: GeneratedContent;
  mainKeyword: string;
  targetWordCount: string;
  secondaryKeywords: string;
  internalLinks: string;
}

interface CheckItem {
  label: string;
  passed: boolean;
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

function checkKeywordInTag(html: string, keyword: string, tag: string): boolean {
  const kw = keyword.toLowerCase();
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1].toLowerCase().includes(kw)) return true;
  }
  return false;
}

function getFirstParagraphText(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return match ? match[1].replace(/<[^>]*>/g, "").toLowerCase() : "";
}

function checkLongTailInHeadings(html: string, secondaryKeywords: string): boolean {
  const keywords = secondaryKeywords
    .split("\n")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (keywords.length === 0) return false;

  const headings: string[] = [];
  const regex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push(match[1].replace(/<[^>]*>/g, "").toLowerCase());
  }

  const headingText = headings.join(" ");
  return keywords.some((kw) => headingText.includes(kw));
}

function checkHasLinks(html: string): boolean {
  return /<a\s+[^>]*href=/i.test(html);
}

function checkHasFaq(html: string): boolean {
  const lower = html.toLowerCase();
  return lower.includes("faq") || lower.includes("frequently asked") || lower.includes("common questions");
}

function checkHasCta(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("call us") ||
    lower.includes("contact us") ||
    lower.includes("get a quote") ||
    lower.includes("get started") ||
    lower.includes("book now") ||
    lower.includes("free quote") ||
    lower.includes("call today") ||
    lower.includes("reach out") ||
    lower.includes("schedule") ||
    lower.includes("sign up")
  );
}

function checkNotStuffed(html: string, keyword: string): boolean {
  if (!keyword) return true;
  const text = html.replace(/<[^>]*>/g, " ").toLowerCase();
  const words = text.split(/\s+/).length;
  const kw = keyword.toLowerCase();
  const occurrences = text.split(kw).length - 1;
  // Keyword density above 3% is considered stuffing
  const density = (occurrences * kw.split(/\s+/).length) / words;
  return density <= 0.03;
}

export default function SeoScore({
  result,
  mainKeyword,
  targetWordCount,
  secondaryKeywords,
  internalLinks,
}: SeoScoreProps) {
  const article = result.article;
  const kw = mainKeyword.trim();
  const wordCount = countWords(article);
  const target = parseInt(targetWordCount, 10);
  const wordCountClose = Math.abs(wordCount - target) / target <= 0.25;

  const checks: CheckItem[] = [
    { label: "Main keyword in H1", passed: !!kw && checkKeywordInTag(article, kw, "h1") },
    { label: "Main keyword in first paragraph", passed: !!kw && getFirstParagraphText(article).includes(kw.toLowerCase()) },
    { label: "Long-tail keywords in H2/H3 headings", passed: checkLongTailInHeadings(article, secondaryKeywords) },
    { label: "Meta title created", passed: !!result.metaTitle },
    { label: "Meta description created", passed: !!result.metaDescription },
    { label: "FAQ section included", passed: checkHasFaq(article) },
    { label: "Schema JSON-LD included", passed: !!result.schema && result.schema.length > 10 },
    { label: "Internal links included", passed: !internalLinks.trim() || checkHasLinks(article) },
    { label: "CTA included", passed: checkHasCta(article) },
    { label: `Word count close to target (${wordCount}/${target})`, passed: wordCountClose },
    { label: "Content sounds natural (not keyword stuffed)", passed: checkNotStuffed(article, kw) },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const pct = Math.round((passed / total) * 100);

  let overallColor = "#dc2626"; // red
  let overallLabel = "Needs Work";
  if (pct >= 80) {
    overallColor = "#16a34a";
    overallLabel = "Ready to Publish";
  } else if (pct >= 55) {
    overallColor = "#ca8a04";
    overallLabel = "Almost Ready";
  }

  return (
    <div className="seo-score-panel">
      <div className="score-header">
        <div className="score-ring" style={{ borderColor: overallColor }}>
          <span className="score-number" style={{ color: overallColor }}>{pct}</span>
        </div>
        <div className="score-summary">
          <h3>SEO Readiness Score</h3>
          <p style={{ color: overallColor, fontWeight: 700 }}>{overallLabel}</p>
          <p className="score-fraction">{passed} of {total} checks passed</p>
        </div>
      </div>
      <ul className="score-checks">
        {checks.map((check, i) => (
          <li key={i} className={check.passed ? "check-pass" : "check-fail"}>
            <span className="check-icon">{check.passed ? "\u2713" : "\u2717"}</span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
