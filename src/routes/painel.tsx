import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, LogOut, Phone, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDatePretty, formatDateISO } from "@/lib/booking";
import { formatPhoneBR, whatsAppLink } from "@/lib/constants";
import { ServicesAdmin } from "@/components/admin/ServicesAdmin";
import { PlansAdmin } from "@/components/admin/PlansAdmin";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { SiteSettingsAdmin } from "@/components/admin/SiteSettingsAdmin";
import { MyAccount } from "@/components/admin/MyAccount";

type Appointment = {
  id: string;
  confirmation_code: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  service_price: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  barber_id: string;
};

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Painel — Recanto do Guerreiro" }, { name: "robots", content: "noindex" }] }),
  component: PainelPage,
});

type Filter = "today" | "upcoming" | "all";

function PainelPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [user, setUser] = useState<{ id: string; email: string; name: string; isAdmin: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });
    if (error) {
      toast.error("Não foi possível carregar agendamentos.");
      setLoading(false);
      return;
    }
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate({ to: "/login" });
        return;
      }
      const userId = session.session.user.id;
      const email = session.session.user.email ?? "";
      const [barberRes, rolesRes] = await Promise.all([
        supabase.from("barbers").select("name").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (cancelled) return;
      const isAdmin = (rolesRes.data ?? []).some((r) => r.role === "admin");
      setUser({ id: userId, email, name: barberRes.data?.name ?? "Barbeiro", isAdmin });
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, load]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function cancelAppt(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar.");
      return;
    }
    toast.success("Cancelado.");
    void load();
  }

  async function complete(id: string) {
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    if (error) {
      toast.error("Erro.");
      return;
    }
    toast.success("Marcado como concluído.");
    void load();
  }

  const today = formatDateISO(new Date());
  const filtered = appointments.filter((a) => {
    if (filter === "today") return a.appointment_date === today;
    if (filter === "upcoming") return a.appointment_date >= today && a.status === "confirmed";
    return true;
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              {user?.isAdmin ? "Painel admin" : "Painel barbeiro"}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Olá, {user?.name}</h1>
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

        <Tabs defaultValue="agenda" className="mt-6">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {user?.isAdmin && <TabsTrigger value="services">Serviços</TabsTrigger>}
            {user?.isAdmin && <TabsTrigger value="plans">Planos</TabsTrigger>}
            {user?.isAdmin && <TabsTrigger value="users">Membros / Acessos</TabsTrigger>}
            {user?.isAdmin && <TabsTrigger value="site">Site</TabsTrigger>}
            <TabsTrigger value="account">Minha conta</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-6">
            <div className="inline-flex rounded-full border border-border/60 bg-surface/60 p-1">
              {(["today", "upcoming", "all"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    filter === f ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
                  }`}
                >
                  {f === "today" ? "Hoje" : f === "upcoming" ? "Próximos" : "Todos"}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {!loading && filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Nenhum agendamento.
                </div>
              )}
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.customer_name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          a.status === "confirmed"
                            ? "bg-gold/15 text-gold"
                            : a.status === "cancelled"
                            ? "bg-destructive/15 text-destructive"
                            : a.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDatePretty(new Date(a.appointment_date + "T12:00:00"))}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.appointment_time.slice(0, 5)}</span>
                      <span>{a.service_name} · R$ {Number(a.service_price).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  {a.status === "confirmed" && (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={whatsAppLink(a.customer_phone, `Olá ${a.customer_name}, aqui é da Recanto do Guerreiro.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs hover:bg-surface"
                      >
                        <Phone className="h-3 w-3" /> {formatPhoneBR(a.customer_phone)}
                      </a>
                      <Button size="sm" variant="outline" onClick={() => void complete(a.id)}>
                        Concluir
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void cancelAppt(a.id)}>
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {user?.isAdmin && (
            <>
              <TabsContent value="services" className="mt-6">
                <ServicesAdmin />
              </TabsContent>
              <TabsContent value="plans" className="mt-6">
                <PlansAdmin />
              </TabsContent>
              <TabsContent value="users" className="mt-6">
                <div className="mb-4 rounded-xl border border-gold/30 bg-surface/40 p-4 text-sm text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Membros / Acessos</span> — cadastre cada membro da equipe com <strong>foto, cargo, bio, WhatsApp, email e senha</strong> de uma só vez. Eles aparecem na vitrine pública e entram no painel para receber agendamentos.</p>
                </div>
                <UsersAdmin currentUserId={user.id} />
              </TabsContent>
              <TabsContent value="site" className="mt-6">
                <div className="mb-4 rounded-xl border border-gold/30 bg-surface/40 p-4 text-sm text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Site</span> — configurações públicas do site, como o link e @arroba do Instagram que aparece no rodapé.</p>
                </div>
                <SiteSettingsAdmin />
              </TabsContent>
            </>
          )}

          <TabsContent value="account" className="mt-6">
            {user && <MyAccount currentEmail={user.email} />}
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}
