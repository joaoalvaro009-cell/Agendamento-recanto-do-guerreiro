import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, onlyDigits, whatsAppLink } from "@/lib/constants";
import { formatDateISO, formatDatePretty, getAvailableDates, getSlotsForDate } from "@/lib/booking";
import { fetchServices, fetchTeam, type ServiceRow } from "@/lib/queries";
import { getTenantText, useTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/b/$slug/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário" },
      { name: "description", content: "Agende seu corte ou barba online em poucos passos." },
    ],
  }),
  component: AgendarPage,
});

type Barber = { id: string; name: string; phone: string; image_url?: string | null };

const STEPS = ["Serviço", "Barbeiro", "Data", "Horário", "Confirmar"] as const;

function AgendarPage() {
  const tenant = useTenant();
  const slug = tenant.slug;
  const toleranceNotice = getTenantText(tenant, "tolerance_notice", "");
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reminder1h, setReminder1h] = useState(true);
  const [reminder10m, setReminder10m] = useState(true);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    code: string;
    barberPhone: string;
    barberName: string;
    waUrl: string;
  } | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);
  const availableDates = useMemo(() => getAvailableDates(), []);

  useEffect(() => {
    if (!tenant.tenant_id) return;
    fetchServices(tenant.tenant_id).then(setServices).catch(() => toast.error("Não foi possível carregar serviços."));
  }, [tenant.tenant_id]);

  useEffect(() => {
    if (!tenant.tenant_id) return;
    const tid = tenant.tenant_id;
    void (async () => {
      const [barbersRes, team] = await Promise.all([
        supabase.from("barbers").select("id, name, phone").eq("tenant_id", tid).eq("active", true).order("display_order"),
        fetchTeam(tid).catch(() => []),
      ]);
      if (barbersRes.error) {
        toast.error("Não foi possível carregar os barbeiros.");
        return;
      }
      const photoByName = new Map(team.map((t) => [t.name.trim().toLowerCase(), t.image_url] as const));
      setBarbers(
        (barbersRes.data ?? []).map((b) => ({
          ...b,
          image_url: photoByName.get(b.name.trim().toLowerCase()) ?? null,
        })),
      );
    })();
  }, [tenant.tenant_id]);

  useEffect(() => {
    if (!barberId || !date) return;
    setLoadingSlots(true);
    void supabase
      .rpc("taken_slots", { _barber_id: barberId, _date: formatDateISO(date) })
      .then(({ data, error }) => {
        setLoadingSlots(false);
        if (error) {
          toast.error("Não foi possível carregar horários.");
          return;
        }
        setTakenTimes((data ?? []).map((r: { appointment_time: string }) => r.appointment_time));
      });
  }, [barberId, date]);

  const slots = date ? getSlotsForDate(date, takenTimes) : [];

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function handleConfirm() {
    if (!service || !barber || !date || !time || !tenant.tenant_id) return;
    const digits = onlyDigits(phone);
    if (name.trim().length < 2) { toast.error("Informe seu nome."); return; }
    if (digits.length < 10 || digits.length > 13) { toast.error("Informe um WhatsApp válido."); return; }

    setSubmitting(true);
    const confirmationCode = crypto.randomUUID();
    const { error } = await supabase.from("appointments").insert({
      tenant_id: tenant.tenant_id,
      barber_id: barber.id,
      customer_name: name.trim(),
      customer_phone: digits,
      service_name: service.name,
      service_price: service.price,
      appointment_date: formatDateISO(date),
      appointment_time: time,
      reminder_1h: reminder1h,
      reminder_10m: reminder10m,
      confirmation_code: confirmationCode,
    });
    setSubmitting(false);

    if (error) {
      const msg = error.message?.includes("duplicate")
        ? "Esse horário acabou de ser preenchido. Escolha outro."
        : error.message ?? "Não foi possível concluir o agendamento.";
      toast.error(msg);
      return;
    }

    const waMessage =
      `🔔 *Novo agendamento — ${tenant.shop_name}*\n\n` +
      `Cliente: ${name}\n` +
      `WhatsApp: ${formatPhoneBR(digits)}\n` +
      `Serviço: ${service.name} — R$ ${service.price.toFixed(2).replace(".", ",")}\n` +
      `Data: ${formatDatePretty(date)} às ${time}\n` +
      `Barbeiro: ${barber.name}\n` +
      `Código: ${confirmationCode.slice(0, 8).toUpperCase()}`;
    const url = whatsAppLink(barber.phone, waMessage);
    setConfirmed({ code: confirmationCode, barberPhone: barber.phone, barberName: barber.name, waUrl: url });
    setTimeout(() => { window.open(url, "_blank", "noopener,noreferrer"); }, 600);
  }

  if (confirmed) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="rounded-2xl border border-gold/40 bg-surface/60 p-8 text-center shadow-gold">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold">Agendamento confirmado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {date ? formatDatePretty(date) : ""} às <strong className="text-foreground">{time}</strong> com {confirmed.barberName}.
          </p>
          <p className="mt-2 text-xs text-gold">Abrindo o WhatsApp do barbeiro para você avisar o agendamento...</p>

          <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Código de gerenciamento</p>
            <p className="mt-1 font-mono text-sm break-all text-gold">{confirmed.code}</p>
            <p className="mt-2 text-xs text-muted-foreground">Guarde esse código — você vai precisar dele para remarcar ou cancelar.</p>
          </div>

          {toleranceNotice && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left text-xs text-foreground/80">
              {toleranceNotice}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <a href={confirmed.waUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:scale-[1.02] transition">
              Avisar barbeiro pelo WhatsApp
            </a>
            <Link to="/b/$slug/meu-agendamento" params={{ slug }} search={{ code: confirmed.code }} className="rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-surface">
              Ver meu agendamento
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Reserva online</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Agende seu horário</h1>
      </div>

      <ol className="mt-8 flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
              i <= step ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-surface text-muted-foreground"
            }`}>{i + 1}</div>
            <span className={`hidden text-xs sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-7">
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Escolha o serviço</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setServiceId(s.id); next(); }}
                  className={`group flex items-center justify-between rounded-xl border p-4 text-left transition ${
                    serviceId === s.id ? "border-gold bg-gold/5" : "border-border/60 bg-background/30 hover:border-gold/50"
                  }`}>
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {s.duration} min
                    </div>
                  </div>
                  <span className="font-display text-lg font-semibold text-gold">R${Number(s.price).toFixed(0)}</span>
                </button>
              ))}
              {services.length === 0 && <p className="text-sm text-muted-foreground">Carregando...</p>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Escolha o barbeiro</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {barbers.map((b) => (
                <button key={b.id} onClick={() => { setBarberId(b.id); next(); }}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    barberId === b.id ? "border-gold bg-gold/5" : "border-border/60 bg-background/30 hover:border-gold/50"
                  }`}>
                  {b.image_url ? (
                    <img src={b.image_url} alt={`Foto do barbeiro ${b.name}`} className="h-12 w-12 rounded-full object-cover ring-2 ring-gold/60 shadow-gold" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold font-display text-lg font-semibold text-primary-foreground shadow-gold">{b.name[0]}</div>
                  )}
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{tenant.shop_name}</div>
                  </div>
                </button>
              ))}
              {barbers.length === 0 && <p className="text-sm text-muted-foreground">Carregando...</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Escolha a data</h2>
            <p className="mt-1 text-xs text-muted-foreground">Agendamentos disponíveis até 2 dias à frente.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {availableDates.map((d) => {
                const iso = formatDateISO(d);
                const selected = date && formatDateISO(date) === iso;
                return (
                  <button key={iso} onClick={() => { setDate(d); setTime(null); next(); }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected ? "border-gold bg-gold/5" : "border-border/60 bg-background/30 hover:border-gold/50"
                    }`}>
                    <div className="font-semibold">{formatDatePretty(d)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{d.toLocaleDateString("pt-BR")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Escolha o horário</h2>
            {loadingSlots ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando horários...
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((s) => (
                  <button key={s.time} disabled={s.taken} onClick={() => { setTime(s.time); next(); }}
                    className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                      time === s.time ? "border-gold bg-gold/10 text-gold"
                        : s.taken ? "cursor-not-allowed border-border/40 bg-surface/40 text-muted-foreground/50 line-through"
                        : "border-border/60 bg-background/30 hover:border-gold/50"
                    }`}>{s.time}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-xl font-semibold">Seus dados</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className="pl-9" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">WhatsApp</Label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" inputMode="tel" value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    placeholder="(00) 00000-0000" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-border/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Lembretes</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={reminder1h} onChange={(e) => setReminder1h(e.target.checked)} /> 1 hora antes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={reminder10m} onChange={(e) => setReminder10m(e.target.checked)} /> 10 minutos antes
                </label>
              </div>

              <Button onClick={() => void handleConfirm()} disabled={submitting}
                className="w-full bg-gradient-gold text-primary-foreground hover:bg-gradient-gold hover:scale-[1.02]">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar agendamento"}
              </Button>
            </div>
          </div>
        )}

        {step > 0 && (
          <button onClick={back} className="mt-5 text-xs text-muted-foreground hover:text-foreground">← Voltar</button>
        )}
      </div>
    </section>
  );
}
