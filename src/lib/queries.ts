import { supabase } from "@/integrations/supabase/client";

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  image_url: string | null;
  display_order: number;
  active: boolean;
};

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  items: string[];
  featured: boolean;
  display_order: number;
  active: boolean;
};

export type TeamRow = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string | null;
  icon: string;
  display_order: number;
  active: boolean;
};

export async function fetchServices(includeInactive = false): Promise<ServiceRow[]> {
  let q = supabase.from("services").select("*").order("display_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ServiceRow[];
}

export async function fetchPlans(includeInactive = false): Promise<PlanRow[]> {
  let q = supabase.from("plans").select("*").order("display_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlanRow[];
}

export async function fetchTeam(includeInactive = false): Promise<TeamRow[]> {
  let q = supabase.from("team_members").select("*").order("display_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

export async function uploadSiteImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return data.publicUrl;
}
