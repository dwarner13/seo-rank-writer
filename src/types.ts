export type PageType =
  | "location"
  | "service"
  | "blog"
  | "homepage"
  | "landing"
  | "faq";

export type WordCount = "800" | "1200" | "1500" | "2000" | "2500";

export type Tone =
  | "professional"
  | "friendly"
  | "local-expert"
  | "sales"
  | "trust";

export interface GenerateOptions {
  businessName: string;
  websiteUrl: string;
  pageType: PageType;
  mainKeyword: string;
  location: string;
  secondaryKeywords: string;
  internalLinks: string;
  externalLinks: string;
  wordCount: WordCount;
  tone: Tone;
  customInstructions: string;
  existingArticle: string;
}

export interface GeneratedContent {
  // A. Full SEO article
  article: string;

  // B. SEO metadata
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywordSuggestions: string[];
  urlSlug: string;

  // C. Schema JSON-LD
  schema: string;

  // D. Social repurposing
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktokScript: string;
  hashtags: string[];
  imagePrompts: string[];
  videoConcept: string;

  // E. Google Business Profile posts
  gbpUpdate: string;
  gbpOffer: string;
  gbpCta: string;
  gbpImagePrompt: string;
  gbpButtonText: string;

  // F. Link audit
  linkAudit?: {
    approved: number;
    used: { url: string; anchorText: string }[];
    removed: { url: string; anchorText: string }[];
  };

  // G. Enhanced media
  featuredImagePrompt: string;
  socialImagePrompts: SocialImagePrompt[];
  videoPlan: VideoPlan | null;
}

export interface SocialImagePrompt {
  platform: string;
  prompt: string;
  dimensions: string;
}

export interface VideoScene {
  sceneNumber: number;
  duration: string;
  visual: string;
  caption: string;
  voiceover: string;
  imagePrompt: string;
}

export interface VideoPlan {
  title: string;
  format: string;
  totalDuration: string;
  script: string;
  scenes: VideoScene[];
  cta: string;
}

export interface VideoPromptSet {
  script: string;
  storyboard: VideoStoryboardScene[];
  verticalPrompt: string;
  horizontalPrompt: string;
  textOverlays: string[];
  ctaEnding: string;
}

export interface VideoStoryboardScene {
  sceneNumber: number;
  duration: string;
  description: string;
  visualPrompt: string;
  textOverlay: string;
}

export interface SoraVideoRequest {
  prompt: string;
  duration: 4 | 8;
  aspectRatio: "9:16" | "16:9" | "1:1";
}

export interface SoraVideoResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  error?: string;
}
