import { supabase } from "@/integrations/supabase/client";

export type TestimonialRow = {
  id: string;
  customer_name: string;
  text: string;
  rating: number;
  display_order: number;
  active: boolean;
};

export type SiteTextRow = {
  id: string;
  key: string;
  value: string;
  description: string;
};

export async function fetchTestimonials(includeInactive = false): Promise<TestimonialRow[]> {
  let q = supabase.from("testimonials").select("*").order("display_order");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TestimonialRow[];
}

export async function fetchSiteTexts(): Promise<SiteTextRow[]> {
  const { data, error } = await supabase
    .from("site_texts")
    .select("*")
    .order("key");
  if (error) throw error;
  return (data ?? []) as SiteTextRow[];
}
