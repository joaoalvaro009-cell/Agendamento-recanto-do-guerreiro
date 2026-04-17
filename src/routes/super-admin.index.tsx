import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Building2, ExternalLink, KeyRound, Loader2, LogOut, Mail, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { createTenantWithOwner, deleteTenant, listTenantsWithOwners, resetTenantOwnerPassword } from "@/server/admin-tenants";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({
    meta: [
      { title: "Plataforma — Super Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminPage,
});

type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  active: boolean;
  created_at: string;
  owner_user_id: string | null;
  owner_email: string | null;
};

type Stats = {
  appointments: number;
  barbers: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function SuperAdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("starter");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [resetTarget, setResetTarget] = useState<Tenant | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await listTenantsWithOwners();
      const list: Tenant[] = Array.isArray(raw)
        ? (raw as Tenant[])
        : Array.isArray((raw as { result?: unknown })?.result)
          ? ((raw as { result: Tenant[] }).result)
          : [];
      setTenants(list);

      const ids = list.map((t) => t.id);
      if (ids.length) {
        const [apptCounts, barbCounts] = await Promise.all([
          Promise.all(
            ids.map((id) =>
              supabase
                .from("appointments")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", id),
            ),
          ),
          Promise.all(
            ids.map((id) =>
              supabase
                .from("barbers")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", id),
            ),
          ),
        ]);
        const next: Record<string, Stats> = {};
        ids.forEach((id, i) => {
          next[id] = {
            appointments: apptCounts[i].count ?? 0,
            barbers: barbCounts[i].count ?? 0,
          };
        });
        setStats(next);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar barbearias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate({ to: "/super-admin/login" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.session.user.id);
      if (!(roles ?? []).some((r) => r.role === "super_admin")) {
        toast.error("Acesso negado.");
        await supabase.auth.signOut();
        navigate({ to: "/super-admin/login" });
        return;
      }
      setAuthChecked(true);
      await load();
    })();
  }, [navigate, load]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/super-admin/login" });
  }

  async function toggleActive(t: Tenant) {
    const { error } = await supabase
      .from("tenants")
      .update({ active: !t.active })
      .eq("id", t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.active ? "Barbearia desativada." : "Barbearia ativada.");
    void load();
  }

  async function changePlan(t: Tenant, newPlan: string) {
    const { error } = await supabase.from("tenants").update({ plan: newPlan }).eq("id", t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Plano atualizado.");
    void load();
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Informe o nome da barbearia.");
      return;
    }
    if (!ownerEmail.includes("@")) {
      toast.error("Informe um email válido para o dono.");
      return;
    }
    if (ownerPassword.length < 6) {
      toast.error("A senha temporária precisa ter ao menos 6 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const result = await createTenantWithOwner({
        data: {
          name: name.trim(),
          slug: slug.trim() || undefined,
          plan,
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
        },
      });
      toast.success(`Barbearia "${name.trim()}" criada com conteúdo padrão. Slug: ${result.slug}`);
      setName("");
      setSlug("");
      setPlan("starter");
      setOwnerEmail("");
      setOwnerPassword("");
      setShowNew(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar barbearia.");
    } finally {
      setCreating(false);
    }
  }

  function openReset(t: Tenant) {
    if (!t.owner_user_id) {
      toast.error("Esta barbearia não tem dono cadastrado.");
      return;
    }
    setResetTarget(t);
    setResetPassword(Math.random().toString(36).slice(-10));
  }

  async function confirmReset() {
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      toast.error("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setResetting(true);
    try {
      const res = await resetTenantOwnerPassword({
        data: { tenantId: resetTarget.id, newPassword: resetPassword },
      });
      toast.success(`Senha redefinida para ${res.email ?? "o dono"}.`);
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete(t: Tenant) {
    const confirmation = window.prompt(
      `Apagar definitivamente "${t.name}" e TODOS os dados (serviços, planos, agendamentos, equipe)?\n\nDigite o slug "${t.slug}" para confirmar:`,
    );
    if (confirmation !== t.slug) {
      if (confirmation !== null) toast.error("Confirmação não confere. Nada foi apagado.");
      return;
    }
    try {
      await deleteTenant({ data: { tenantId: t.id } });
      toast.success(`Barbearia "${t.name}" apagada.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao apagar.");
    }
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">Plataforma</p>
              <h1 className="font-display text-lg font-semibold">Super Admin</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Barbearias</h2>
            <p className="text-sm text-muted-foreground">
              {tenants.length} {tenants.length === 1 ? "barbearia" : "barbearias"} cadastradas.
            </p>
          </div>
          <Button onClick={() => setShowNew((v) => !v)}>
            <Plus className="h-4 w-4" /> Nova barbearia
          </Button>
        </div>

        {showNew && (
          <form
            onSubmit={createTenant}
            className="mb-6 rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="t-name">Nome</Label>
                <Input
                  id="t-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Ex: Barbearia do João"
                />
              </div>
              <div>
                <Label htmlFor="t-slug">Slug (URL)</Label>
                <Input
                  id="t-slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="barbearia-do-joao"
                />
              </div>
              <div>
                <Label htmlFor="t-plan">Plano</Label>
                <select
                  id="t-plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="t-owner-email">Email do dono</Label>
                <Input
                  id="t-owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="dono@barbearia.com"
                />
              </div>
              <div>
                <Label htmlFor="t-owner-pass">Senha temporária</Label>
                <Input
                  id="t-owner-pass"
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="mín. 6 caracteres"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              O dono recebe acesso de admin. Conteúdo padrão (serviços, planos, equipe, textos) é copiado da Recanto do Guerreiro.
            </p>
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />} Criar barbearia
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && tenants.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma barbearia cadastrada ainda.
            </div>
          )}
          {tenants.map((t) => {
            const s = stats[t.id];
            const publicUrl = `/b/${t.slug}`;
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <Badge variant={t.active ? "default" : "outline"} className={t.active ? "bg-gold/15 text-gold border-gold/40" : ""}>
                      {t.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{t.plan}</Badge>
                    {!t.owner_user_id && (
                      <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px]">
                        Sem dono
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-gold hover:underline"
                    >
                      {publicUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                    {t.owner_email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {t.owner_email}
                      </span>
                    ) : (
                      <span className="italic">sem email do dono</span>
                    )}
                    <span>{s ? `${s.barbers} barbeiros · ${s.appointments} agendamentos` : "..."}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={t.plan}
                    onChange={(e) => void changePlan(t, e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!t.owner_user_id}
                    onClick={() => openReset(t)}
                    title={t.owner_user_id ? "Definir nova senha do dono" : "Sem dono cadastrado"}
                  >
                    <KeyRound className="h-3 w-3" /> Redefinir senha
                  </Button>
                  <Button
                    size="sm"
                    variant={t.active ? "destructive" : "default"}
                    onClick={() => void toggleActive(t)}
                  >
                    <Power className="h-3 w-3" />
                    {t.active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => void handleDelete(t)}
                    title="Apagar barbearia e todos os dados"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha do dono</DialogTitle>
            <DialogDescription>
              {resetTarget?.owner_email ? (
                <>Nova senha para <span className="font-mono text-foreground">{resetTarget.owner_email}</span> ({resetTarget?.name}).</>
              ) : (
                <>Nova senha para o dono de {resetTarget?.name}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-pass">Nova senha temporária</Label>
            <Input
              id="reset-pass"
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="mín. 6 caracteres"
            />
            <p className="text-xs text-muted-foreground">
              Copie e envie ao dono. Ele poderá entrar em <span className="font-mono">/login</span> e trocar depois.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button onClick={() => void confirmReset()} disabled={resetting}>
              {resetting && <Loader2 className="h-4 w-4 animate-spin" />} Redefinir senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

