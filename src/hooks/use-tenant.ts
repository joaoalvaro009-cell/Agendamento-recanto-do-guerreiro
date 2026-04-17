import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LogoSize = "small" | "medium" | "large";

export type TenantConfig = {
  // identidade
  shop_name: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours_text: string;
  // social
  instagram_handle: string;
  instagram_url: string;
  // visual
  logo_url: string | null;
  logo_size: LogoSize;
  color_primary: string;
  color_accent: string;
  color_background: string;
  // textos
  texts: Record<string, string>;
};

const DEFAULT_TENANT: TenantConfig = {
  shop_name: "Recanto do Guerreiro",
  tagline: "Barbearia Premium",
  city: "Serrinha — Bahia",
  address: "Serrinha, Bahia",
  phone: "",
  whatsapp: "",
  hours_text: "Ter–Sáb · 08:00–19:00",
  instagram_handle: "@recantodoguerreiro",
  instagram_url: "https://instagram.com/recantodoguerreiro",
  logo_url: null,
  logo_size: "medium",
  color_primary: "oklch(0.78 0.14 78)",
  color_accent: "oklch(0.78 0.14 78)",
  color_background: "oklch(0.14 0.012 60)",
  texts: {},
};

let cached: TenantConfig | null = null;
let inflight: Promise<TenantConfig> | null = null;
const subscribers = new Set<(t: TenantConfig) => void>();

export function getTenantText(t: TenantConfig, key: string, fallback = ""): string {
  return t.texts[key] ?? fallback;
}

async function loadTenant(): Promise<TenantConfig> {
  const [settingsRes, textsRes] = await Promise.all([
    supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle(),
    supabase.from("site_texts").select("key, value"),
  ]);

  const s = settingsRes.data as Record<string, unknown> | null;
  const texts: Record<string, string> = {};
  for (const row of textsRes.data ?? []) {
    texts[row.key] = row.value;
  }

  return {
    shop_name: (s?.shop_name as string) ?? DEFAULT_TENANT.shop_name,
    tagline: (s?.tagline as string) ?? DEFAULT_TENANT.tagline,
    city: (s?.city as string) ?? DEFAULT_TENANT.city,
    address: (s?.address as string) ?? DEFAULT_TENANT.address,
    phone: (s?.phone as string) ?? DEFAULT_TENANT.phone,
    whatsapp: (s?.whatsapp as string) ?? DEFAULT_TENANT.whatsapp,
    hours_text: (s?.hours_text as string) ?? DEFAULT_TENANT.hours_text,
    instagram_handle: (s?.instagram_handle as string) ?? DEFAULT_TENANT.instagram_handle,
    instagram_url: (s?.instagram_url as string) ?? DEFAULT_TENANT.instagram_url,
    logo_url: (s?.logo_url as string | null) ?? null,
    logo_size: ((s?.logo_size as LogoSize) ?? "medium"),
    color_primary: (s?.color_primary as string) ?? DEFAULT_TENANT.color_primary,
    color_accent: (s?.color_accent as string) ?? DEFAULT_TENANT.color_accent,
    color_background: (s?.color_background as string) ?? DEFAULT_TENANT.color_background,
    texts,
  };
}

export function refreshTenant(): Promise<TenantConfig> {
  inflight = loadTenant().then((t) => {
    cached = t;
    subscribers.forEach((cb) => cb(t));
    return t;
  });
  return inflight;
}

/** Hook to read tenant config. Returns defaults until loaded. */
export function useTenant(): TenantConfig {
  const [tenant, setTenant] = useState<TenantConfig>(cached ?? DEFAULT_TENANT);

  useEffect(() => {
    const cb = (t: TenantConfig) => setTenant(t);
    subscribers.add(cb);
    if (cached) {
      setTenant(cached);
    } else if (!inflight) {
      void refreshTenant();
    }
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return tenant;
}
