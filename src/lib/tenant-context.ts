import { supabase } from "@/integrations/supabase/client";

/**
 * Tenant padrão. Usado quando o contexto ainda não tem slug (ex.: telas admin
 * legadas, ou rotas antigas redirecionando).
 */
export const DEFAULT_TENANT_SLUG = "recanto-do-guerreiro";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/**
 * Resolve o tenant_id de um slug. Cacheado por slug.
 * Se nenhum slug for passado, usa o tenant padrão (compat).
 */
export async function getCurrentTenantId(slug: string = DEFAULT_TENANT_SLUG): Promise<string> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const pending = inflight.get(slug);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar barbearia: ${error.message}`);
    if (!data) throw new Error(`Barbearia "${slug}" não encontrada ou inativa.`);

    cache.set(slug, data.id);
    return data.id;
  })();

  inflight.set(slug, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(slug);
  }
}

/** Limpa o cache de um slug (útil ao mudar de tenant). */
export function clearTenantCache(slug?: string) {
  if (slug) cache.delete(slug);
  else cache.clear();
}
