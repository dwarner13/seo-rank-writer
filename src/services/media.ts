import type { SocialImagePrompt, VideoPlan, VideoPromptSet, SoraVideoResult, PageType } from "../types";

/**
 * Media generation service.
 * Local generators for backward compat + API-powered generators for new features.
 */

interface MediaContext {
  businessName: string;
  mainKeyword: string;
  location: string;
  pageType: PageType;
  tone: string;
}

interface VideoPromptContext extends MediaContext {
  metaTitle?: string;
  metaDescription?: string;
  cta?: string;
}

// ── AI-powered video prompt generation (calls Claude via backend) ──
export async function generateVideoPromptsAI(ctx: VideoPromptContext): Promise<VideoPromptSet> {
  const res = await fetch("/api/media/video/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  return res.json();
}

// ── AI-powered image prompt generation (calls Claude via backend) ──
export interface ImagePromptSet {
  featuredImage: string;
  socialSquare: string;
  socialStory: string;
  gbpImage: string;
}

export async function generateImagePromptsAI(ctx: MediaContext): Promise<ImagePromptSet> {
  const res = await fetch("/api/media/image/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ctx),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  return res.json();
}

// ── Sora video generation ──
export async function generateSoraVideo(options: {
  prompt: string;
  duration: 4 | 8;
  aspectRatio: "9:16" | "16:9" | "1:1";
}): Promise<SoraVideoResult> {
  const res = await fetch("/api/media/video/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${res.status})`);
  }
  return res.json();
}

const PAGE_STYLES: Record<PageType, string> = {
  location: "a local service location, showing the neighborhood and professional team",
  service: "a professional service in action, showing expertise and quality work",
  blog: "an engaging editorial-style photo related to the topic",
  homepage: "a hero banner showing the business brand, team, and location",
  landing: "a high-conversion marketing image with bold visuals and clear focus",
  faq: "a friendly, approachable help-desk or customer service scene",
};

/**
 * Generate a featured image prompt for the SEO article.
 * Future: call OpenAI DALL-E API here.
 */
export function generateFeaturedImagePrompt(ctx: MediaContext): string {
  const style = PAGE_STYLES[ctx.pageType] || PAGE_STYLES.service;
  return [
    `Professional, high-quality photograph of ${style}.`,
    `Business: ${ctx.businessName || "a local service business"}.`,
    `Location: ${ctx.location || "a professional setting"}.`,
    `Theme: ${ctx.mainKeyword || "professional service"}.`,
    `Style: Clean, well-lit, modern. Natural colors, no text overlays.`,
    `Aspect ratio: 16:9, suitable for a WordPress featured image (1200x628px).`,
    `Mood: Trustworthy, professional, inviting.`,
  ].join("\n");
}

/**
 * Generate platform-specific social image prompts.
 * Future: call OpenAI DALL-E API here for each platform.
 */
export function generateSocialImagePrompts(ctx: MediaContext): SocialImagePrompt[] {
  const biz = ctx.businessName || "the business";
  const kw = ctx.mainKeyword || "professional service";
  const loc = ctx.location || "the local area";

  return [
    {
      platform: "Featured Image (Blog/Page)",
      dimensions: "1200 x 628px (16:9)",
      prompt: `Professional wide-format photo for a ${ctx.pageType} page about ${kw} in ${loc}. Shows ${biz} team or service in action. Clean, editorial style. Natural lighting. No text. 16:9 aspect ratio.`,
    },
    {
      platform: "Facebook / Instagram",
      dimensions: "1080 x 1080px (1:1)",
      prompt: `Square social media image for ${biz}. Theme: ${kw} in ${loc}. Eye-catching, vibrant colors. Professional but approachable. Could include a team member or service shot. Clean background. Instagram-ready quality. 1:1 aspect ratio.`,
    },
    {
      platform: "Google Business Profile",
      dimensions: "720 x 720px (1:1)",
      prompt: `Google Business Profile photo for ${biz} in ${loc}. Shows the business location, team, or service related to ${kw}. Authentic, trustworthy feel. Good lighting. Real-world look (not too polished). 1:1 aspect ratio, minimum 720px.`,
    },
  ];
}

/**
 * Generate a detailed short video plan with scene breakdown.
 * Future: call OpenAI Sora or similar video API here.
 */
export function generateVideoPlan(ctx: MediaContext): VideoPlan {
  const biz = ctx.businessName || "Our Business";
  const kw = ctx.mainKeyword || "our service";
  const loc = ctx.location || "your area";

  return {
    title: `${kw} in ${loc} — ${biz}`,
    format: "Vertical (9:16) — TikTok / Instagram Reels / YouTube Shorts",
    totalDuration: "15 seconds",
    script: `[HOOK 0-3s] Need ${kw} in ${loc}? [BODY 3-12s] ${biz} delivers fast, reliable results. Here's what we do... [CTA 12-15s] Call now or visit our website!`,
    scenes: [
      {
        sceneNumber: 1,
        duration: "0-3s",
        visual: "Bold text overlay on attention-grabbing background. Quick zoom or motion effect.",
        caption: `Need ${kw} in ${loc}?`,
        voiceover: `Looking for ${kw} in ${loc}?`,
        imagePrompt: `Dynamic opening shot — bold text "${kw}" over a ${loc} cityscape or street scene. Motion blur effect. Vertical 9:16 format.`,
      },
      {
        sceneNumber: 2,
        duration: "3-6s",
        visual: `Show ${biz} team arriving or starting work. Professional uniforms/branding visible.`,
        caption: `${biz} is here to help`,
        voiceover: `${biz} has been serving ${loc} with top-quality service.`,
        imagePrompt: `${biz} team member arriving at a job site in ${loc}. Professional look, branded vehicle or uniform. Action shot. Vertical 9:16.`,
      },
      {
        sceneNumber: 3,
        duration: "6-9s",
        visual: "Service in action — the main work being performed. Close-up details.",
        caption: "Fast, reliable service",
        voiceover: "We handle everything from start to finish — fast and hassle-free.",
        imagePrompt: `Close-up of ${kw} service being performed. Hands-on, detailed work shot. Professional quality. Vertical 9:16.`,
      },
      {
        sceneNumber: 4,
        duration: "9-12s",
        visual: "Happy customer or finished result. Before/after if applicable.",
        caption: "Happy customers, every time",
        voiceover: "Our customers love the results. See for yourself.",
        imagePrompt: `Satisfied customer smiling, shaking hands with ${biz} team member in ${loc}. Warm, genuine moment. Vertical 9:16.`,
      },
      {
        sceneNumber: 5,
        duration: "12-15s",
        visual: "Business logo, phone number, website. Strong CTA text overlay.",
        caption: "Call now for a free quote!",
        voiceover: `Call ${biz} today or visit our website. We're ready to help!`,
        imagePrompt: `End card with ${biz} logo and "Call Now" button. Clean design on branded background. Phone number and website visible. Vertical 9:16.`,
      },
    ],
    cta: `Call ${biz} today for a free quote! Fast, reliable ${kw} in ${loc}.`,
  };
}
