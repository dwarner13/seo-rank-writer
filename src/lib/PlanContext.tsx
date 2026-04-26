import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getProfile, getUsage } from "./database";
import type { Profile, UsageLimits } from "./database";

type Plan = "free" | "pro" | "agency";
type Feature = "generate" | "wordpress" | "media" | "gsc" | "report_full" | "backlinks_full" | "links_unlimited";

const FREE_LIMITS = {
  generations: 3,
  links: 5,
};

interface PlanState {
  plan: Plan;
  loading: boolean;
  usage: UsageLimits | null;
  profile: Profile | null;
  canUse: (feature: Feature) => boolean;
  remainingGenerations: number;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanState>({
  plan: "free",
  loading: true,
  usage: null,
  profile: null,
  canUse: () => true,
  remainingGenerations: 3,
  refreshPlan: async () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, enabled } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPlan = useCallback(async () => {
    if (!enabled || !user) {
      setPlan("free");
      setProfile(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      const [p, u] = await Promise.all([
        getProfile(user.id),
        getUsage(user.id),
      ]);
      if (p) {
        setProfile(p);
        setPlan(p.plan as Plan);
      }
      setUsage(u);
    } catch (err) {
      console.error("refreshPlan error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, enabled]);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const generationsUsed = usage?.generations ?? 0;
  const remainingGenerations = plan === "free"
    ? Math.max(0, FREE_LIMITS.generations - generationsUsed)
    : Infinity;

  const canUse = useCallback((feature: Feature): boolean => {
    // If Supabase not configured, allow everything (local dev mode)
    if (!enabled) return true;
    // Pro/Agency: everything unlocked
    if (plan === "pro" || plan === "agency") return true;

    // Free plan gates
    switch (feature) {
      case "generate":
        return generationsUsed < FREE_LIMITS.generations;
      case "wordpress":
      case "media":
      case "gsc":
      case "report_full":
      case "backlinks_full":
        return false;
      case "links_unlimited":
        return false;
      default:
        return true;
    }
  }, [enabled, plan, generationsUsed]);

  return (
    <PlanContext.Provider value={{ plan, loading, usage, profile, canUse, remainingGenerations, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
