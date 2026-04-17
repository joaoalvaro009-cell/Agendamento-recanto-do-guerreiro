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
  .inputValidator((d: { email: string; password: string; name: string; phone: string; isAdmin: boolean }) => {
    if (!d.email.includes("@")) throw new Error("Email inválido.");
    if (d.password.length < 8) throw new Error("Senha precisa ter ao menos 8 caracteres.");
    if (d.name.trim().length < 2) throw new Error("Nome inválido.");
    if (d.phone.replace(/\D/g, "").length < 10) throw new Error("Telefone inválido.");
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
    const { error: bErr } = await supabaseAdmin.from("barbers").insert({
      user_id: userId,
      name: data.name,
      phone: data.phone.replace(/\D/g, ""),
      email: data.email,
      is_admin: data.isAdmin,
      active: true,
    });
    if (bErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(bErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.isAdmin ? "admin" : "barber",
    });

    // Também cria automaticamente na "Vitrine do site" para aparecer publicamente
    await supabaseAdmin.from("team_members").insert({
      name: data.name,
      role: data.isAdmin ? "Administrador" : "Barbeiro",
      bio: "",
      icon: "star",
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
    const { error } = await supabaseAdmin
      .from("barbers")
      .update({ active: data.active })
      .eq("id", data.barberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBarberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; barberId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (context.userId === data.targetUserId) {
      throw new Error("Você não pode excluir a própria conta por aqui.");
    }
    // Pega nome do barbeiro pra remover também da vitrine
    const { data: barber } = await supabaseAdmin
      .from("barbers")
      .select("name")
      .eq("id", data.barberId)
      .maybeSingle();
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);
    await supabaseAdmin.from("barbers").delete().eq("id", data.barberId);
    if (barber?.name) {
      await supabaseAdmin.from("team_members").delete().eq("name", barber.name);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBarberUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: barbers, error } = await supabaseAdmin
      .from("barbers")
      .select("id, user_id, name, phone, email, is_admin, active, display_order, avatar_url, bio")
      .order("display_order");
    if (error) throw new Error(error.message);
    return { barbers: barbers ?? [] };
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
