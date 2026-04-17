import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatDateISO, formatDatePretty, getAvailableDates, getSlotsForDate } from "@/lib/booking";
import { TOLERANCE_NOTICE, formatPhoneBR } from "@/lib/constants";
import { useTenant } from "@/hooks/use-tenant";

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

export const Route = createFileRoute("/b/$slug/meu-agendamento")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "",
  }),
  head: () => ({
    meta: [
      { title: "Meu agendamento" },
      { name: "description", content: "Consulte, remarque ou cancele seu agendamento usando o código de confirmação." },
    ],
  }),
  component: MeuAgendamentoPage,
});

function MeuAgendamentoPage() {
  const { code: initialCode } = Route.useSearch();
  const tenant = useTenant();
  const slug = tenant.slug;
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableDates = getAvailableDates();

  useEffect(() => {
    if (initialCode) void search(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  useEffect(() => {
    if (!appt || !newDate) return;
    void supabase
      .rpc("taken_slots", { _barber_id: appt.barber_id, _date: formatDateISO(newDate) })
      .then(({ data }) => {
        setTakenTimes((data ?? []).map((r: { appointment_time: string }) => r.appointment_time));
      });
  }, [appt, newDate]);

  async function search(c: string) {
    const trimmed = c.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_appointment_by_code", { _code: trimmed });
    setLoading(false);
    if (error || !data || data.length === 0) {
      toast.error("Agendamento não encontrado.");
      setAppt(null);
      return;
    }
    setAppt(data[0] as Appointment);
  }

  async function cancel() {
    if (!appt) return;
    if (!confirm("Tem certeza que deseja cancelar?")) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("cancel_appointment_by_code", { _code: appt.confirmation_code });
    setSubmitting(false);
    if (error || !data) { toast.error("Não foi possível cancelar."); return; }
    toast.success("Agendamento cancelado.");
    setAppt({ ...appt, status: "cancelled" });
  }

  async function reschedule() {
    if (!appt || !newDate || !newTime) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("reschedule_appointment_by_code", {
      _code: appt.confirmation_code,
      _new_date: formatDateISO(newDate),
      _new_time: newTime,
    });
    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message?.includes("duplicate") ? "Esse horário já está ocupado." : "Não foi possível remarcar.");
      return;
    }
    toast.success("Remarcado com sucesso!");
    setAppt(data as Appointment);
    setReschedOpen(false);
    setNewDate(null);
    setNewTime(null);
  }

  const slots = newDate ? getSlotsForDate(newDate, takenTimes) : [];

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Gerenciar</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Meu agendamento</h1>
        <p className="mt-3 text-sm text-muted-foreground">Informe o código que você recebeu ao agendar.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-7">
        <Label htmlFor="code">Código de confirmação</Label>
        <div className="mt-2 flex gap-2">
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cole seu código aqui" className="font-mono" />
          <Button onClick={() => void search(code)} disabled={loading || !code.trim()}
            className="bg-gradient-gold text-primary-foreground hover:bg-gradient-gold hover:scale-[1.02]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {appt && (
          <div className="mt-7 rounded-xl border border-border/60 bg-background/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</p>
                <p className="font-semibold">{appt.customer_name}</p>
                <p className="text-xs text-muted-foreground">{formatPhoneBR(appt.customer_phone)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                appt.status === "confirmed" ? "bg-gold/15 text-gold"
                  : appt.status === "cancelled" ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}>
                {appt.status === "confirmed" ? "Confirmado" : appt.status === "cancelled" ? "Cancelado" : appt.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/40 p-3 text-sm">
                <CalendarDays className="h-4 w-4 text-gold" />
                {formatDatePretty(new Date(appt.appointment_date + "T12:00:00"))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 p-3 text-sm">
                <Clock className="h-4 w-4 text-gold" />
                {appt.appointment_time.slice(0, 5)}
              </div>
            </div>

            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Serviço:</span>{" "}
              <span className="font-semibold">{appt.service_name}</span> —{" "}
              <span className="text-gold">R$ {Number(appt.service_price).toFixed(2).replace(".", ",")}</span>
            </p>

            {appt.status === "confirmed" && (
              <>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setReschedOpen((v) => !v)} variant="outline" className="flex-1">Remarcar</Button>
                  <Button onClick={() => void cancel()} disabled={submitting} variant="destructive" className="flex-1">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>

                {reschedOpen && (
                  <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
                    <p className="text-sm font-semibold">Nova data</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {availableDates.map((d) => {
                        const iso = formatDateISO(d);
                        const selected = newDate && formatDateISO(newDate) === iso;
                        return (
                          <button key={iso} onClick={() => { setNewDate(d); setNewTime(null); }}
                            className={`rounded-lg border p-2.5 text-xs ${selected ? "border-gold bg-gold/10 text-gold" : "border-border/60"}`}>
                            {formatDatePretty(d)}
                          </button>
                        );
                      })}
                    </div>

                    {newDate && (
                      <>
                        <p className="mt-4 text-sm font-semibold">Novo horário</p>
                        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                          {slots.map((s) => (
                            <button key={s.time} disabled={s.taken} onClick={() => setNewTime(s.time)}
                              className={`rounded-md border py-1.5 text-xs ${
                                newTime === s.time ? "border-gold bg-gold/10 text-gold"
                                  : s.taken ? "cursor-not-allowed border-border/40 text-muted-foreground/50 line-through"
                                  : "border-border/60"
                              }`}>{s.time}</button>
                          ))}
                        </div>
                      </>
                    )}

                    <Button onClick={() => void reschedule()} disabled={!newDate || !newTime || submitting}
                      className="mt-4 w-full bg-gradient-gold text-primary-foreground hover:bg-gradient-gold">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar remarcação"}
                    </Button>
                  </div>
                )}

                <p className="mt-5 text-xs text-muted-foreground">{TOLERANCE_NOTICE}</p>
              </>
            )}

            {appt.status === "cancelled" && (
              <div className="mt-5 text-center">
                <Link to="/b/$slug/agendar" params={{ slug }} className="inline-flex rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold">
                  Fazer novo agendamento
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
