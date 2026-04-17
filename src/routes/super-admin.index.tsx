import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, LogOut, Plus, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createTenantWithOwner } from "@/server/admin-tenants";

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

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("id, slug, name, plan, active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar barbearias.");
      setLoading(false);
      return;
    }
    setTenants(data as Tenant[]);

    // Estatísticas (contagem) por tenant — feita em paralelo
    const ids = (data ?? []).map((t) => t.id);
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
    setLoading(false);
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
    const finalSlug = slug.trim() || slugify(name);
    if (finalSlug.length < 2) {
      toast.error("Slug inválido.");
      return;
    }
    setCreating(true);
    const { error } = await supabase
      .from("tenants")
      .insert({ name: name.trim(), slug: finalSlug, plan, active: true });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Barbearia criada.");
    setName("");
    setSlug("");
    setPlan("starter");
    setShowNew(false);
    void load();
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
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />} Criar
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
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <Badge variant={t.active ? "default" : "outline"} className={t.active ? "bg-gold/15 text-gold border-gold/40" : ""}>
                      {t.active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{t.plan}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /b/{t.slug} · {s ? `${s.barbers} barbeiros · ${s.appointments} agendamentos` : "..."}
                  </p>
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
                    variant={t.active ? "destructive" : "default"}
                    onClick={() => void toggleActive(t)}
                  >
                    <Power className="h-3 w-3" />
                    {t.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
