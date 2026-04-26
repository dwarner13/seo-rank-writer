import { usePlan } from "../lib/PlanContext";

interface UpgradeGateProps {
  feature: "generate" | "wordpress" | "media" | "gsc" | "report_full" | "backlinks_full" | "links_unlimited";
  children: React.ReactNode;
  /** Custom message for the upgrade prompt */
  message?: string;
}

export default function UpgradeGate({ feature, children, message }: UpgradeGateProps) {
  const { canUse, plan } = usePlan();

  if (canUse(feature)) {
    return <>{children}</>;
  }

  const featureLabels: Record<string, string> = {
    generate: "Content generation",
    wordpress: "WordPress publishing",
    media: "Media Engine",
    gsc: "Full GSC insights",
    report_full: "Full SEO report",
    backlinks_full: "Full backlink analysis",
    links_unlimited: "Unlimited internal links",
  };

  return (
    <div className="upgrade-gate">
      <div className="upgrade-gate__overlay">
        <div className="upgrade-gate__lock">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="upgrade-gate__title">Pro Feature</h3>
        <p className="upgrade-gate__desc">
          {message || `${featureLabels[feature] || "This feature"} requires a Pro plan.`}
        </p>
        <p className="upgrade-gate__plan">Current plan: <strong>{plan}</strong></p>
        <a href="/plugins" className="upgrade-gate__btn">Upgrade to Pro</a>
      </div>
      <div className="upgrade-gate__blur">
        {children}
      </div>
    </div>
  );
}
