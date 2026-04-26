import type { GeneratedContent } from "../types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(content: GeneratedContent, label: string) {
  const rows = [
    ["Section", "Content"],
    ["SEO Article", content.article],
    ["Meta Title", content.metaTitle],
    ["Meta Description", content.metaDescription],
    ["Focus Keyword", content.focusKeyword],
    ["Keyword Suggestions", content.keywordSuggestions.join(", ")],
    ["URL Slug", content.urlSlug],
    ["Schema JSON-LD", content.schema],
    ["Facebook", content.facebook],
    ["Instagram", content.instagram],
    ["LinkedIn", content.linkedin],
    ["TikTok/Reel Script", content.tiktokScript],
    ["Hashtags", content.hashtags.join(" ")],
    ["Image Prompt 1", content.imagePrompts[0]],
    ["Image Prompt 2", content.imagePrompts[1]],
    ["Image Prompt 3", content.imagePrompts[2]],
    ["Video Concept", content.videoConcept],
    ["GBP Update Post", content.gbpUpdate],
    ["GBP Offer Post", content.gbpOffer],
    ["GBP CTA Post", content.gbpCta],
    ["GBP Image Prompt", content.gbpImagePrompt],
    ["GBP Button Text", content.gbpButtonText],
    ["Featured Image Prompt", content.featuredImagePrompt],
    ...content.socialImagePrompts.map((sip) => [`Social Image: ${sip.platform}`, `${sip.dimensions}\n${sip.prompt}`]),
    ...(content.videoPlan ? [
      ["Video Title", content.videoPlan.title],
      ["Video Format", content.videoPlan.format],
      ["Video Script", content.videoPlan.script],
      ["Video CTA", content.videoPlan.cta],
      ...content.videoPlan.scenes.map((s) => [`Video Scene ${s.sceneNumber} (${s.duration})`, `Visual: ${s.visual}\nCaption: ${s.caption}\nVoiceover: ${s.voiceover}\nPrompt: ${s.imagePrompt}`]),
    ] : []),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `seo-content-${label.replace(/\s+/g, "-").toLowerCase() || "export"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
