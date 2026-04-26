/**
 * Supabase database helpers for SEO Rank Writer.
 * All functions return null/empty gracefully if Supabase is not configured.
 */
import { supabase } from "./supabase";

// ── Types ──

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "agency";
  stripe_customer_id: string | null;
  subscription_status: "none" | "active" | "past_due" | "canceled";
  current_period_end: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  default_keyword: string | null;
  brand_tone: string;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  project_id: string;
  user_id: string;
  title: string | null;
  slug: string | null;
  main_keyword: string | null;
  location: string | null;
  page_type: string | null;
  article_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  schema_json: string | null;
  url_slug: string | null;
  word_count: number | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  tiktok_script: string | null;
  hashtags: string[] | null;
  keyword_suggestions: string[] | null;
  internal_links: string | null;
  status: "draft" | "published" | "archived";
  wp_post_id: number | null;
  wp_published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLimits {
  id: string;
  user_id: string;
  month: string;
  generations: number;
  wp_publishes: number;
  media_generations: number;
  report_generations: number;
}

// ── Profile ──

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("getProfile error:", error.message); return null; }
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, "full_name" | "avatar_url">>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) { console.error("updateProfile error:", error.message); return false; }
  return true;
}

// ── Projects ──

export async function getProjects(userId: string): Promise<Project[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getProjects error:", error.message); return []; }
  return data || [];
}

export async function createProject(userId: string, project: Partial<Omit<Project, "id" | "user_id" | "created_at" | "updated_at">>): Promise<Project | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...project, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createProject error:", error.message); return null; }
  return data;
}

export async function updateProject(projectId: string, updates: Partial<Omit<Project, "id" | "user_id" | "created_at" | "updated_at">>): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId);
  if (error) { console.error("updateProject error:", error.message); return false; }
  return true;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) { console.error("deleteProject error:", error.message); return false; }
  return true;
}

// ── Articles ──

export async function getArticles(projectId: string): Promise<Article[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getArticles error:", error.message); return []; }
  return data || [];
}

export async function saveArticle(article: Omit<Article, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<Article | null> {
  if (!supabase) return null;
  if (article.id) {
    const { id, ...rest } = article;
    const { data, error } = await supabase
      .from("articles")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) { console.error("updateArticle error:", error.message); return null; }
    return data;
  }
  const { data, error } = await supabase
    .from("articles")
    .insert(article)
    .select()
    .single();
  if (error) { console.error("insertArticle error:", error.message); return null; }
  return data;
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId);
  if (error) { console.error("deleteArticle error:", error.message); return false; }
  return true;
}

// ── SEO Scores ──

export async function saveSeoScore(articleId: string, score: {
  total_score: number;
  content_earned: number; content_max: number;
  meta_earned: number; meta_max: number;
  schema_earned: number; schema_max: number;
  links_earned: number; links_max: number;
  gsc_earned: number; gsc_max: number;
  wp_earned: number; wp_max: number;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("seo_scores")
    .insert({ article_id: articleId, ...score });
  if (error) { console.error("saveSeoScore error:", error.message); return false; }
  return true;
}

// ── Usage Limits ──

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUsage(userId: string): Promise<UsageLimits | null> {
  if (!supabase) return null;
  const month = getCurrentMonth();
  const { data, error } = await supabase
    .from("usage_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .single();
  if (error && error.code !== "PGRST116") { // PGRST116 = no rows
    console.error("getUsage error:", error.message);
  }
  return data || null;
}

export async function incrementUsage(userId: string, field: "generations" | "wp_publishes" | "media_generations" | "report_generations"): Promise<boolean> {
  if (!supabase) return false;
  const month = getCurrentMonth();

  // Upsert: create row if missing, increment if exists
  const { data: existing } = await supabase
    .from("usage_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  if (existing) {
    const row = existing as Record<string, unknown>;
    const { error } = await supabase
      .from("usage_limits")
      .update({ [field]: ((row[field] as number) || 0) + 1 })
      .eq("id", row.id as string);
    if (error) { console.error("incrementUsage error:", error.message); return false; }
  } else {
    const { error } = await supabase
      .from("usage_limits")
      .insert({ user_id: userId, month, [field]: 1 });
    if (error) { console.error("incrementUsage insert error:", error.message); return false; }
  }
  return true;
}

// ── WordPress Connections ──

export async function getWordPressConnection(projectId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("project_id", projectId)
    .single();
  if (error && error.code !== "PGRST116") console.error("getWPConn error:", error.message);
  return data || null;
}

export async function saveWordPressConnection(projectId: string, userId: string, conn: {
  site_url: string;
  auth_mode: "plugin" | "basic";
  api_key_encrypted?: string;
  username?: string;
  app_password_encrypted?: string;
  is_connected: boolean;
}) {
  if (!supabase) return false;
  // Upsert by project_id
  const { data: existing } = await supabase
    .from("wordpress_connections")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("wordpress_connections")
      .update({ ...conn, last_tested_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) { console.error("updateWPConn error:", error.message); return false; }
  } else {
    const { error } = await supabase
      .from("wordpress_connections")
      .insert({ project_id: projectId, user_id: userId, ...conn });
    if (error) { console.error("insertWPConn error:", error.message); return false; }
  }
  return true;
}
