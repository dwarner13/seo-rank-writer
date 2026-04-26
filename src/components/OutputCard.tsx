import { useState } from "react";

interface OutputCardProps {
  title: string;
  content: string;
  accent: string;
  isHtml?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export default function OutputCard({ title, content, accent, isHtml, onRegenerate, regenerating }: OutputCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="output-card" style={{ borderTopColor: accent }}>
      <div className="card-header">
        <h3>{title}</h3>
        <div className="card-actions">
          {onRegenerate && (
            <button className="regen-btn" onClick={onRegenerate} disabled={regenerating}>
              {regenerating ? "..." : "Regenerate"}
            </button>
          )}
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {isHtml ? (
        <div
          className="card-content card-html"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <pre className="card-content">{content}</pre>
      )}
    </div>
  );
}
