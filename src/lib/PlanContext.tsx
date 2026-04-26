import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getProfile, getUsage } from "./database";
import type { Profile, UsageLimits } from "./database";

type Plan = "free" | "pro" | "agency";
type Feature = "generate" | "wordpress" | "media" | "gsc" | "report_full" | "backlinks_full" | "links_unlimited";

const PLAN_LIMITS: Record<Plan, { generations: number; links: number }> = {
  free: { generations: 3, links: 5 },
  pro: { generations: 100, links: Infinity },
  agency: { generations: 500, links: Infinity },
};

interface PlanState {
  plan: Plan;
  loading: boolean;
  usage: UsageLimits | null;
  profile: Profile | null;
  canUse: (feature: Feature) => boolean;
  remainingGenerations: number;
  generationsUsed: number;
  generationLimit: number;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanState>({
  plan: "free",
  loading: true,
  usage: null,
  profile: null,
  canUse: () => true,
  remainingGenerations: 3,
  generationsUsed: 0,
  generationLimit: 3,
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

  const limits = PLAN_LIMITS[plan];
  const generationsUsed = usage?.generations ?? 0;
  const generationLimit = limits.generations;
  const remainingGenerations = Math.max(0, generationLimit - generationsUsed);

  const canUse = useCallback((feature: Feature): boolean => {
    // If Supabase not configured, allow everything (local dev mode)
    if (!enabled) return true;

    switch (feature) {
      case "generate":
        return generationsUsed < PLAN_LIMITS[plan].generations;
      case "wordpress":
      case "media":
      case "gsc":
      case "report_full":
      case "backlinks_full":
      case "links_unlimited":
        return plan === "pro" || plan === "agency";
      default:
        return true;
    }
  }, [enabled, plan, generationsUsed]);

  return (
    <PlanContext.Provider value={{ plan, loading, usage, profile, canUse, remainingGenerations, generationsUsed, generationLimit, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
