import type { GeneratedContent } from "../types";

export function mockGenerate(article: string, location: string): Partial<GeneratedContent> {
  const snippet = article.slice(0, 80).replace(/\n/g, " ").trim();
  const loc = location || "this amazing destination";

  return {
    facebook: `Have you ever dreamed of visiting ${loc}? We just published a deep-dive guide and honestly... it's a must-read before you book your trip!\n\n"${snippet}..."\n\nDrop a comment if ${loc} is on your bucket list!`,

    instagram: `${loc} is calling and you MUST go.\n\nWe broke down everything you need to know -- the hidden gems, the best eats, the spots tourists always miss.\n\nSave this post. Share it with your travel buddy. You'll thank us later.\n\nLink in bio for the full article.`,

    linkedin: `I just published a comprehensive location guide on ${loc}.\n\nKey takeaways:\n- Why ${loc} is trending for 2026 travel\n- 5 insider tips most guides won't tell you\n- The best time of year to visit\n- Budget breakdown for solo and family travelers\n\nIf you're in the travel, hospitality, or content creation space, this is worth a read. Full article linked below.`,

    tiktokScript: `[HOOK - 0-3s]\n"POV: You just found the ultimate guide to ${loc}"\n\n[BODY - 3-15s]\nShow quick cuts of ${loc} scenery.\nVoiceover: "Most people visit ${loc} and only see the tourist traps. But this guide covers the REAL spots -- the ones locals actually go to."\n\n[CTA - 15-20s]\n"Full guide link in bio. Follow for more hidden gems."\n\n[TEXT ON SCREEN]\n"${loc} Guide - Save This"`,

    hashtags: [
      `#${location.replace(/[^a-zA-Z0-9]/g, "") || "Travel"}`,
      "#TravelGuide",
      "#HiddenGems",
      "#BucketList",
      "#TravelTips",
      "#Wanderlust",
      "#ExploreMore",
      "#TravelContent",
      "#SEO",
      "#ContentCreator",
    ],

    imagePrompts: [
      `A stunning golden-hour aerial photograph of ${loc} showing iconic landmarks and natural landscape, cinematic lighting, travel magazine style, 8k resolution`,
      `A cozy street-level photo of a local cafe in ${loc} with happy travelers enjoying local cuisine, warm tones, shallow depth of field, lifestyle photography`,
      `A dramatic wide-angle landscape of ${loc} at sunrise with mist rolling over hills or water, vibrant colors, National Geographic style`,
    ],

    videoConcept: `Title: "48 Hours in ${loc} - The REAL Guide"\n\nFormat: 60-90 second vertical video (Reel / TikTok)\n\nStructure:\n1. Cold open with drone shot of ${loc} (2s)\n2. Quick text: "48 Hours. Zero Tourist Traps." (1s)\n3. Morning segment: sunrise spot + local breakfast (10s)\n4. Midday segment: hidden gem activity (10s)\n5. Evening segment: best sunset viewpoint + dinner (10s)\n6. Rapid-fire tips montage with text overlays (10s)\n7. CTA: "Follow + Save for your ${loc} trip" (3s)\n\nMusic: Upbeat lo-fi or trending audio\nPacing: Fast cuts, 1-2 seconds per shot`,
  };
}
