import { supabase } from "@/integrations/supabase/client";

/**
 * Tenant ativo (slug). Por enquanto fixo na Recanto do Guerreiro,
 * já que as URLs públicas continuam em /, /agendar, /painel.
 * Quando movermos para /b/$slug, esta função passa a ler do path.
 */
export const DEFAULT_TENANT_SLUG = "recanto-do-guerreiro";

let cachedTenantId: string | null = null;
let inflightId: Promise<string> | null = null;

/**
 * Resolve o tenant_id do tenant atual. Cacheado em memória.
 * Lança erro se a barbearia não estiver cadastrada/ativa.
 */
export async function getCurrentTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  if (inflightId) return inflightId;

  inflightId = (async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", DEFAULT_TENANT_SLUG)
      .eq("active", true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar barbearia: ${error.message}`);
    if (!data) throw new Error(`Barbearia "${DEFAULT_TENANT_SLUG}" não encontrada ou inativa.`);

    cachedTenantId = data.id;
    return data.id;
  })();

  try {
    return await inflightId;
  } finally {
    inflightId = null;
  }
}
