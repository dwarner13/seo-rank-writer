import { useState } from "react";
import type { VideoPromptSet } from "../types";
import { generateVideoPromptsAI, generateImagePromptsAI } from "../services/media";
import type { ImagePromptSet } from "../services/media";
import OutputCard from "./OutputCard";

interface MediaGeneratorProps {
  businessName: string;
  mainKeyword: string;
  location: string;
  pageType: string;
  tone: string;
  metaTitle?: string;
  metaDescription?: string;
  cta?: string;
  // Saved media data from localStorage
  savedVideoPrompts: VideoPromptSet | null;
  savedImagePrompts: ImagePromptSet | null;
  onVideoPromptsGenerated: (data: VideoPromptSet) => void;
  onImagePromptsGenerated: (data: ImagePromptSet) => void;
}

export default function MediaGenerator({
  businessName,
  mainKeyword,
  location,
  pageType,
  tone,
  metaTitle,
  metaDescription,
  cta,
  savedVideoPrompts,
  savedImagePrompts,
  onVideoPromptsGenerated,
  onImagePromptsGenerated,
}: MediaGeneratorProps) {
  const [videoPrompts, setVideoPrompts] = useState<VideoPromptSet | null>(savedVideoPrompts);
  const [imagePrompts, setImagePrompts] = useState<ImagePromptSet | null>(savedImagePrompts);
  const [videoLoading, setVideoLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMediaTab, setActiveMediaTab] = useState<"images" | "video">("images");

  const canGenerate = !!mainKeyword.trim();

  const handleGenerateImagePrompts = async () => {
    setImageLoading(true);
    setError("");
    try {
      const data = await generateImagePromptsAI({
        businessName,
        mainKeyword,
        location,
        pageType: pageType as any,
        tone,
      });
      setImagePrompts(data);
      onImagePromptsGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image prompts.");
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateVideoPrompts = async () => {
    setVideoLoading(true);
    setError("");
    try {
      const data = await generateVideoPromptsAI({
        businessName,
        mainKeyword,
        location,
        pageType: pageType as any,
        tone,
        metaTitle,
        metaDescription,
        cta,
      });
      setVideoPrompts(data);
      onVideoPromptsGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video prompts.");
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="mg-panel">
      {/* Header */}
      <div className="mg-header">
        <div className="mg-header-left">
          <h3 className="mg-title">Media Generator</h3>
          <span className="mg-subtitle">AI-powered image &amp; video prompts</span>
        </div>
        <div className="mg-header-right">
          <button
            className="mg-gen-btn mg-gen-img"
            onClick={handleGenerateImagePrompts}
            disabled={!canGenerate || imageLoading}
          >
            {imageLoading ? "Generating..." : "Generate Image Prompts"}
          </button>
          <button
            className="mg-gen-btn mg-gen-vid"
            onClick={handleGenerateVideoPrompts}
            disabled={!canGenerate || videoLoading}
          >
            {videoLoading ? "Generating..." : "Generate Video Prompts"}
          </button>
        </div>
      </div>

      {!canGenerate && (
        <div className="mg-notice">Enter a main keyword in the left panel to generate media prompts.</div>
      )}

      {error && <div className="mg-error">{error}</div>}

      {/* Tabs */}
      <div className="mg-tabs">
        <button
          className={`mg-tab ${activeMediaTab === "images" ? "active" : ""}`}
          onClick={() => setActiveMediaTab("images")}
        >
          Image Prompts {imagePrompts ? "\u2713" : ""}
        </button>
        <button
          className={`mg-tab ${activeMediaTab === "video" ? "active" : ""}`}
          onClick={() => setActiveMediaTab("video")}
        >
          Video Prompts {videoPrompts ? "\u2713" : ""}
        </button>
      </div>

      {/* Images tab */}
      {activeMediaTab === "images" && (
        <div className="mg-section">
          {!imagePrompts ? (
            <div className="mg-empty">
              <div className="mg-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <p>Click <strong>Generate Image Prompts</strong> to create AI-powered marketing image prompts.</p>
            </div>
          ) : (
            <div className="mg-results">
              <div className="cards-grid">
                <OutputCard
                  title="Featured Image (16:9)"
                  content={imagePrompts.featuredImage}
                  accent="#FF9800"
                />
                <OutputCard
                  title="Social Media (1:1)"
                  content={imagePrompts.socialSquare}
                  accent="#E91E63"
                />
              </div>
              <div className="cards-grid" style={{ marginTop: "0.75rem" }}>
                <OutputCard
                  title="Story / Reel Cover (9:16)"
                  content={imagePrompts.socialStory}
                  accent="#7c3aed"
                />
                <OutputCard
                  title="Google Business Profile"
                  content={imagePrompts.gbpImage}
                  accent="#4285F4"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video tab */}
      {activeMediaTab === "video" && (
        <div className="mg-section">
          {!videoPrompts ? (
            <div className="mg-empty">
              <div className="mg-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m10 9 5 3-5 3V9Z" fill="#94a3b8" />
                </svg>
              </div>
              <p>Click <strong>Generate Video Prompts</strong> to create a storyboard, script, and Sora-ready prompts.</p>
            </div>
          ) : (
            <div className="mg-results">
              {/* Script */}
              <OutputCard title="Video Script" content={videoPrompts.script} accent="#2563eb" />

              {/* Storyboard */}
              <h4 className="mg-section-title">3-Scene Storyboard</h4>
              <div className="mg-storyboard">
                {videoPrompts.storyboard.map((scene) => (
                  <div key={scene.sceneNumber} className="mg-scene-card">
                    <div className="mg-scene-header">
                      <span className="mg-scene-num">Scene {scene.sceneNumber}</span>
                      <span className="mg-scene-dur">{scene.duration}</span>
                    </div>
                    <div className="mg-scene-body">
                      <div className="mg-scene-field">
                        <strong>Description</strong>
                        <p>{scene.description}</p>
                      </div>
                      <div className="mg-scene-field">
                        <strong>Visual Prompt</strong>
                        <p className="mg-prompt-text">{scene.visualPrompt}</p>
                      </div>
                      <div className="mg-scene-field">
                        <strong>Text Overlay</strong>
                        <p className="mg-overlay-text">{scene.textOverlay}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Video prompts */}
              <h4 className="mg-section-title">Sora-Ready Video Prompts</h4>
              <div className="cards-grid">
                <OutputCard
                  title="Vertical Video (9:16)"
                  content={videoPrompts.verticalPrompt}
                  accent="#7c3aed"
                />
                <OutputCard
                  title="Horizontal Video (16:9)"
                  content={videoPrompts.horizontalPrompt}
                  accent="#059669"
                />
              </div>

              {/* Text overlays */}
              <h4 className="mg-section-title">Suggested Text Overlays</h4>
              <div className="mg-overlays">
                {videoPrompts.textOverlays.map((text, i) => (
                  <div key={i} className="mg-overlay-chip">{text}</div>
                ))}
              </div>

              {/* CTA */}
              <OutputCard
                title="CTA Ending"
                content={videoPrompts.ctaEnding}
                accent="#dc2626"
              />

              {/* Sora generation (future) */}
              <div className="mg-sora-section">
                <h4 className="mg-section-title">Generate Video with Sora</h4>
                <p className="mg-sora-notice">
                  Video generation via OpenAI Sora API coming soon. Add <code>OPENAI_API_KEY</code> to your <code>.env</code> to enable.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
