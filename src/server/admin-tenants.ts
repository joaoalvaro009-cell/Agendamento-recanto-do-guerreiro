import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TEMPLATE_SLUG = "recanto-do-guerreiro";

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ok = (data ?? []).some((r) => r.role === "super_admin");
  if (!ok) throw new Error("Acesso negado: apenas super admins.");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * Cria uma nova barbearia já provisionada:
 * - Cria o tenant
 * - Cria o usuário dono no auth (ou reutiliza se já existir)
 * - Atribui role 'admin' ao dono
 * - Define owner_user_id no tenant
 * - Clona conteúdo padrão (services, plans, site_texts, team_members, site_settings) da Recanto
 */
export const createTenantWithOwner = createServerFn({ method: "POST" })
  .inputValidator((d: {
    name: string;
    slug?: string;
    plan: string;
    ownerEmail: string;
    ownerPassword: string;
  }) => {
    if (d.name.trim().length < 2) throw new Error("Informe o nome da barbearia.");
    if (!d.ownerEmail.includes("@")) throw new Error("Email do dono inválido.");
    if (d.ownerPassword.length < 6) throw new Error("Senha temporária precisa de ao menos 6 caracteres.");
    if (!["starter", "pro", "enterprise"].includes(d.plan)) throw new Error("Plano inválido.");
    return d;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const finalSlug = (data.slug?.trim() ? slugify(data.slug) : slugify(data.name));
    if (finalSlug.length < 2) throw new Error("Slug inválido.");
    if (finalSlug === TEMPLATE_SLUG) throw new Error("Esse slug é reservado.");

    // 1. slug disponível?
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (existing) throw new Error(`Já existe uma barbearia com o slug "${finalSlug}".`);

    // 2. Cria ou recupera o usuário dono
    let ownerUserId: string;
    const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.ownerEmail,
      password: data.ownerPassword,
      email_confirm: true,
    });

    if (createUserErr) {
      // já existe? buscar pelo email
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const found = list?.users.find((u) => u.email?.toLowerCase() === data.ownerEmail.toLowerCase());
      if (!found) throw new Error(createUserErr.message);
      ownerUserId = found.id;
    } else {
      if (!createdUser.user) throw new Error("Falha ao criar usuário dono.");
      ownerUserId = createdUser.user.id;
    }

    // 3. Cria o tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name.trim(),
        slug: finalSlug,
        plan: data.plan,
        active: true,
        owner_user_id: ownerUserId,
      })
      .select("id")
      .single();
    if (tErr || !tenant) throw new Error(tErr?.message ?? "Falha ao criar barbearia.");

    const tenantId = tenant.id;

    // 4. Atribui role admin (idempotente)
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: ownerUserId, role: "admin" })
      .then((res) => {
        // ignora conflito, mas propaga outros erros
        if (res.error && !res.error.message.toLowerCase().includes("duplicate")) {
          throw new Error(res.error.message);
        }
      });

    // 5. Cria registro do dono em barbers (vincula user_id ao tenant)
    await supabaseAdmin.from("barbers").insert({
      tenant_id: tenantId,
      user_id: ownerUserId,
      name: data.name.trim(),
      phone: "00000000000",
      email: data.ownerEmail,
      is_admin: true,
      active: true,
      bio: "",
    });

    // 6. Clona conteúdo da Recanto. Como a função SQL exige super_admin via auth.uid(),
    // executamos via supabaseAdmin emulando o usuário super admin atual.
    // O service_role bypass RLS não passa auth.uid(), então fazemos a clonagem em SQL direto.
    await cloneTemplateForNewTenant(tenantId, data.name.trim());

    return { tenantId, slug: finalSlug, ownerUserId };
  });

/**
 * Clona conteúdo do tenant template para o novo tenant usando service_role.
 * Replica o que a função SQL clone_tenant_from_template faz, mas sem depender de auth.uid().
 */
async function cloneTemplateForNewTenant(newTenantId: string, newName: string) {
  const { data: template, error: tErr } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", TEMPLATE_SLUG)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!template) {
    // template ausente — segue sem clonar (cria pelo menos site_settings vazio)
    await supabaseAdmin.from("site_settings").insert({
      tenant_id: newTenantId,
      shop_name: newName,
      tagline: "Barbearia",
      city: "",
      address: "",
    });
    return;
  }

  const templateId = template.id;

  const [settingsRes, servicesRes, plansRes, textsRes, teamRes] = await Promise.all([
    supabaseAdmin.from("site_settings").select("*").eq("tenant_id", templateId).maybeSingle(),
    supabaseAdmin.from("services").select("*").eq("tenant_id", templateId),
    supabaseAdmin.from("plans").select("*").eq("tenant_id", templateId),
    supabaseAdmin.from("site_texts").select("*").eq("tenant_id", templateId),
    supabaseAdmin.from("team_members").select("*").eq("tenant_id", templateId),
  ]);

  // site_settings
  if (settingsRes.data) {
    const s = settingsRes.data;
    await supabaseAdmin.from("site_settings").insert({
      tenant_id: newTenantId,
      shop_name: newName,
      tagline: s.tagline,
      city: s.city,
      address: s.address,
      phone: "",
      whatsapp: "",
      hours_text: s.hours_text,
      instagram_handle: "@suabarbearia",
      instagram_url: "https://instagram.com/suabarbearia",
      logo_url: null,
      logo_size: s.logo_size,
      color_primary: s.color_primary,
      color_accent: s.color_accent,
      color_background: s.color_background,
    });
  }

  // services
  if (servicesRes.data?.length) {
    await supabaseAdmin.from("services").insert(
      servicesRes.data.map((r) => ({
        tenant_id: newTenantId,
        slug: r.slug,
        name: r.name,
        description: r.description,
        price: r.price,
        duration: r.duration,
        image_url: r.image_url,
        display_order: r.display_order,
        active: r.active,
      })),
    );
  }

  // plans
  if (plansRes.data?.length) {
    await supabaseAdmin.from("plans").insert(
      plansRes.data.map((r) => ({
        tenant_id: newTenantId,
        slug: r.slug,
        name: r.name,
        price: r.price,
        items: r.items,
        featured: r.featured,
        display_order: r.display_order,
        active: r.active,
      })),
    );
  }

  // site_texts
  if (textsRes.data?.length) {
    await supabaseAdmin.from("site_texts").insert(
      textsRes.data.map((r) => ({
        tenant_id: newTenantId,
        key: r.key,
        value: r.value,
        description: r.description,
      })),
    );
  }

  // team_members
  if (teamRes.data?.length) {
    await supabaseAdmin.from("team_members").insert(
      teamRes.data.map((r) => ({
        tenant_id: newTenantId,
        name: r.name,
        role: r.role,
        bio: r.bio,
        image_url: r.image_url,
        icon: r.icon,
        display_order: r.display_order,
        active: r.active,
      })),
    );
  }
}
