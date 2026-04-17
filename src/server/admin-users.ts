import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const isAdmin = (data ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Acesso negado: apenas administradores.");
}

export const createBarberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    email: string;
    password: string;
    name: string;
    phone: string;
    isAdmin: boolean;
    role?: string;
    bio?: string;
    imageUrl?: string | null;
  }) => {
    if (!d.email.includes("@")) throw new Error("Email inválido.");
    if (d.password.length < 8) throw new Error("Senha precisa ter ao menos 8 caracteres.");
    if (d.name.trim().length < 2) throw new Error("Nome inválido.");
    if (d.phone.replace(/\D/g, "").length < 10) throw new Error("WhatsApp inválido.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Falha ao criar usuário.");

    const userId = created.user.id;
    const publicRole = data.role?.trim() || (data.isAdmin ? "Administrador" : "Barbeiro");
    const bio = data.bio?.trim() ?? "";

    const { error: bErr } = await supabaseAdmin.from("barbers").insert({
      user_id: userId,
      name: data.name,
      phone: data.phone.replace(/\D/g, ""),
      email: data.email,
      is_admin: data.isAdmin,
      active: true,
      bio,
      avatar_url: data.imageUrl ?? null,
    });
    if (bErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(bErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.isAdmin ? "admin" : "barber",
    });

    // Cria também na vitrine pública (Membros)
    await supabaseAdmin.from("team_members").insert({
      name: data.name,
      role: publicRole,
      bio,
      icon: "star",
      image_url: data.imageUrl ?? null,
      active: true,
    });

    return { userId };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; newEmail: string }) => {
    if (!d.newEmail.includes("@")) throw new Error("Email inválido.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      email: data.newEmail,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("barbers").update({ email: data.newEmail }).eq("user_id", data.targetUserId);
    return { ok: true };
  });

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; newPassword: string }) => {
    if (d.newPassword.length < 8) throw new Error("Senha precisa ter ao menos 8 caracteres.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBarberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { barberId: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: barber } = await supabaseAdmin
      .from("barbers")
      .select("name")
      .eq("id", data.barberId)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("barbers")
      .update({ active: data.active })
      .eq("id", data.barberId);
    if (error) throw new Error(error.message);
    if (barber?.name) {
      await supabaseAdmin.from("team_members").update({ active: data.active }).eq("name", barber.name);
    }
    return { ok: true };
  });

export const deleteBarberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string | null; barberId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.targetUserId && context.userId === data.targetUserId) {
      throw new Error("Você não pode excluir a própria conta por aqui.");
    }
    const { data: barber } = await supabaseAdmin
      .from("barbers")
      .select("name")
      .eq("id", data.barberId)
      .maybeSingle();
    if (data.targetUserId) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    }
    await supabaseAdmin.from("barbers").delete().eq("id", data.barberId);
    if (barber?.name) {
      await supabaseAdmin.from("team_members").delete().eq("name", barber.name);
    }
    if (data.targetUserId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listBarberUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [barbersRes, teamRes] = await Promise.all([
      supabaseAdmin
        .from("barbers")
        .select("id, user_id, name, phone, email, is_admin, active, display_order, avatar_url, bio")
        .order("display_order"),
      supabaseAdmin
        .from("team_members")
        .select("id, name, role, bio, image_url, icon, display_order, active"),
    ]);
    if (barbersRes.error) throw new Error(barbersRes.error.message);
    if (teamRes.error) throw new Error(teamRes.error.message);

    const teamByName = new Map<string, typeof teamRes.data[number]>();
    for (const t of teamRes.data ?? []) teamByName.set(t.name, t);

    const merged = (barbersRes.data ?? []).map((b) => {
      const tm = teamByName.get(b.name);
      return {
        ...b,
        team_member_id: tm?.id ?? null,
        public_role: tm?.role ?? (b.is_admin ? "Administrador" : "Barbeiro"),
        public_bio: tm?.bio ?? b.bio ?? "",
        public_image_url: tm?.image_url ?? b.avatar_url ?? null,
        public_icon: tm?.icon ?? "star",
      };
    });
    return { barbers: merged };
  });

export const updateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    barberId: string;
    name: string;
    phone: string;
    role: string;
    bio: string;
    imageUrl: string | null;
    icon: string;
  }) => {
    if (d.name.trim().length < 2) throw new Error("Nome inválido.");
    if (d.phone.replace(/\D/g, "").length < 10) throw new Error("WhatsApp inválido.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Pega nome anterior para localizar o team_member (vínculo é por nome)
    const { data: prev, error: pErr } = await supabaseAdmin
      .from("barbers")
      .select("name")
      .eq("id", data.barberId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prev) throw new Error("Barbeiro não encontrado.");

    const { error: bErr } = await supabaseAdmin
      .from("barbers")
      .update({
        name: data.name,
        phone: data.phone.replace(/\D/g, ""),
        bio: data.bio,
        avatar_url: data.imageUrl,
      })
      .eq("id", data.barberId);
    if (bErr) throw new Error(bErr.message);

    // Atualiza/cria team_member correspondente
    const { data: tm } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("name", prev.name)
      .maybeSingle();

    if (tm) {
      const { error: tErr } = await supabaseAdmin
        .from("team_members")
        .update({
          name: data.name,
          role: data.role,
          bio: data.bio,
          image_url: data.imageUrl,
          icon: data.icon,
        })
        .eq("id", tm.id);
      if (tErr) throw new Error(tErr.message);
    } else {
      await supabaseAdmin.from("team_members").insert({
        name: data.name,
        role: data.role,
        bio: data.bio,
        image_url: data.imageUrl,
        icon: data.icon,
        active: true,
      });
    }

    return { ok: true };
  });

export const linkLoginToBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { barberId: string; email: string; password: string; isAdmin: boolean }) => {
    if (!d.email.includes("@")) throw new Error("Email inválido.");
    if (d.password.length < 8) throw new Error("Senha precisa ter ao menos 8 caracteres.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: barber, error: bErr } = await supabaseAdmin
      .from("barbers")
      .select("id, user_id, name")
      .eq("id", data.barberId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!barber) throw new Error("Barbeiro não encontrado.");
    if (barber.user_id) throw new Error("Esse barbeiro já tem login conectado.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Falha ao criar usuário.");

    const userId = created.user.id;
    const { error: uErr } = await supabaseAdmin
      .from("barbers")
      .update({ user_id: userId, email: data.email, is_admin: data.isAdmin })
      .eq("id", data.barberId);
    if (uErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(uErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.isAdmin ? "admin" : "barber",
    });

    return { userId };
  });
