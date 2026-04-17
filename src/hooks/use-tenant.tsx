import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-context";

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
  // identificação
  slug: string;
  tenant_id: string | null;
};

const DEFAULT_TENANT: TenantConfig = {
  shop_name: "Carregando...",
  tagline: "",
  city: "",
  address: "",
  phone: "",
  whatsapp: "",
  hours_text: "",
  instagram_handle: "",
  instagram_url: "",
  logo_url: null,
  logo_size: "medium",
  color_primary: "oklch(0.78 0.14 78)",
  color_accent: "oklch(0.78 0.14 78)",
  color_background: "oklch(0.14 0.012 60)",
  texts: {},
  slug: DEFAULT_TENANT_SLUG,
  tenant_id: null,
};

const cacheBySlug = new Map<string, TenantConfig>();
const inflightBySlug = new Map<string, Promise<TenantConfig>>();
const subscribersBySlug = new Map<string, Set<(t: TenantConfig) => void>>();

export function getTenantText(t: TenantConfig, key: string, fallback = ""): string {
  return t.texts[key] ?? fallback;
}

async function loadTenant(slug: string): Promise<TenantConfig> {
  // 1. resolve tenant_id por slug
  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (tenantErr) throw new Error(tenantErr.message);
  if (!tenantRow) throw new Error(`Barbearia "${slug}" não encontrada.`);

  const tenantId = tenantRow.id;

  const [settingsRes, textsRes] = await Promise.all([
    supabase.from("site_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("site_texts").select("key, value").eq("tenant_id", tenantId),
  ]);

  const s = settingsRes.data as Record<string, unknown> | null;
  const texts: Record<string, string> = {};
  for (const row of textsRes.data ?? []) {
    texts[row.key] = row.value;
  }

  return {
    shop_name: (s?.shop_name as string) ?? tenantRow.name,
    tagline: (s?.tagline as string) ?? "",
    city: (s?.city as string) ?? "",
    address: (s?.address as string) ?? "",
    phone: (s?.phone as string) ?? "",
    whatsapp: (s?.whatsapp as string) ?? "",
    hours_text: (s?.hours_text as string) ?? "",
    instagram_handle: (s?.instagram_handle as string) ?? "",
    instagram_url: (s?.instagram_url as string) ?? "",
    logo_url: (s?.logo_url as string | null) ?? null,
    logo_size: ((s?.logo_size as LogoSize) ?? "medium"),
    color_primary: (s?.color_primary as string) ?? DEFAULT_TENANT.color_primary,
    color_accent: (s?.color_accent as string) ?? DEFAULT_TENANT.color_accent,
    color_background: (s?.color_background as string) ?? DEFAULT_TENANT.color_background,
    texts,
    slug,
    tenant_id: tenantId,
  };
}

export function refreshTenant(slug: string = DEFAULT_TENANT_SLUG): Promise<TenantConfig> {
  const promise = loadTenant(slug).then((t) => {
    cacheBySlug.set(slug, t);
    const subs = subscribersBySlug.get(slug);
    subs?.forEach((cb) => cb(t));
    return t;
  });
  inflightBySlug.set(slug, promise);
  promise.finally(() => inflightBySlug.delete(slug));
  return promise;
}

// Context para o slug atual (rotas /b/$slug/*)
const TenantSlugContext = createContext<string>(DEFAULT_TENANT_SLUG);

export function TenantProvider({ slug, children }: { slug: string; children: ReactNode }) {
  return <TenantSlugContext.Provider value={slug}>{children}</TenantSlugContext.Provider>;
}

export function useTenantSlug(): string {
  return useContext(TenantSlugContext);
}

/** Hook para ler config do tenant atual (resolvido pelo TenantProvider). */
export function useTenant(): TenantConfig {
  const slug = useTenantSlug();
  const [tenant, setTenant] = useState<TenantConfig>(() => cacheBySlug.get(slug) ?? { ...DEFAULT_TENANT, slug });

  useEffect(() => {
    const cb = (t: TenantConfig) => setTenant(t);
    let subs = subscribersBySlug.get(slug);
    if (!subs) {
      subs = new Set();
      subscribersBySlug.set(slug, subs);
    }
    subs.add(cb);

    const cached = cacheBySlug.get(slug);
    if (cached) {
      setTenant(cached);
    } else if (!inflightBySlug.has(slug)) {
      void refreshTenant(slug);
    }
    return () => {
      subs?.delete(cb);
    };
  }, [slug]);

  return tenant;
}
