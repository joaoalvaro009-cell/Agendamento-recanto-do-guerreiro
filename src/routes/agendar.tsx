import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Clock, Loader2, Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SERVICES, TOLERANCE_NOTICE, formatPhoneBR, onlyDigits, whatsAppLink } from "@/lib/constants";
import { formatDateISO, formatDatePretty, getAvailableDates, getSlotsForDate } from "@/lib/booking";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário — Recanto do Guerreiro" },
      { name: "description", content: "Agende seu corte ou barba online em poucos passos. Confirmação imediata." },
      { property: "og:title", content: "Agendar — Recanto do Guerreiro" },
      { property: "og:description", content: "Agende seu horário online em poucos passos." },
    ],
  }),
  component: AgendarPage,
});

type Barber = { id: string; name: string; phone: string };

const STEPS = ["Serviço", "Barbeiro", "Data", "Horário", "Confirmar"] as const;

function AgendarPage() {
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
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    code: string;
    barberPhone: string;
    barberName: string;
  } | null>(null);

  const service = SERVICES.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);
  const availableDates = useMemo(() => getAvailableDates(), []);

  // Load barbers
  useEffect(() => {
    void supabase
      .from("barbers")
      .select("id, name, phone")
      .eq("active", true)
      .order("display_order")
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar os barbeiros.");
          return;
        }
        setBarbers(data ?? []);
      });
  }, []);

  // Load taken slots when date+barber selected
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

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleConfirm() {
    if (!service || !barber || !date || !time) return;
    const digits = onlyDigits(phone);
    if (name.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (digits.length < 10 || digits.length > 13) {
      toast.error("Informe um WhatsApp válido.");
      return;
    }

    setSubmitting(true);
    const confirmationCode = crypto.randomUUID();
    const { error } = await supabase.from("appointments").insert({
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

    setConfirmed({
      code: confirmationCode,
      barberPhone: barber.phone,
      barberName: barber.name,
    });
  }

  if (confirmed) {
    const message =
      `🔔 *Novo agendamento — Recanto do Guerreiro*\n\n` +
      `Cliente: ${name}\n` +
      `WhatsApp: ${formatPhoneBR(onlyDigits(phone))}\n` +
      `Serviço: ${service?.name} — R$ ${service?.price.toFixed(2).replace(".", ",")}\n` +
      `Data: ${date ? formatDatePretty(date) : ""} às ${time}\n` +
      `Barbeiro: ${confirmed.barberName}\n` +
      `Código: ${confirmed.code.slice(0, 8).toUpperCase()}`;

    return (
      <SiteLayout>
        <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl border border-gold/40 bg-surface/60 p-8 text-center shadow-gold">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold">Agendamento confirmado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {date ? formatDatePretty(date) : ""} às <strong className="text-foreground">{time}</strong> com {confirmed.barberName}.
            </p>

            <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-4 text-left">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Código de gerenciamento</p>
              <p className="mt-1 font-mono text-sm break-all text-gold">{confirmed.code}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Guarde esse código — você vai precisar dele para remarcar ou cancelar.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left text-xs text-foreground/80">
              {TOLERANCE_NOTICE}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <a
                href={whatsAppLink(confirmed.barberPhone, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-gradient-gold px-5 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:scale-[1.02] transition"
              >
                Avisar barbeiro pelo WhatsApp
              </a>
              <Link
                to="/meu-agendamento"
                search={{ code: confirmed.code }}
                className="rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-surface"
              >
                Ver meu agendamento
              </Link>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Reserva online</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Agende seu horário
          </h1>
        </div>

        {/* Stepper */}
        <ol className="mt-8 flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  i <= step ? "bg-gradient-gold text-primary-foreground shadow-gold" : "bg-surface text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`hidden text-xs sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card sm:p-7">
          {/* Step 0: Service */}
          {step === 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold">Escolha o serviço</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      next();
                    }}
                    className={`group flex items-center justify-between rounded-xl border p-4 text-left transition ${
                      serviceId === s.id
                        ? "border-gold bg-gold/5"
                        : "border-border/60 bg-background/30 hover:border-gold/50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {s.duration} min
                      </div>
                    </div>
                    <span className="font-display text-lg font-semibold text-gold">
                      R${s.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Barber */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-semibold">Escolha o barbeiro</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {barbers.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBarberId(b.id);
                      next();
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      barberId === b.id
                        ? "border-gold bg-gold/5"
                        : "border-border/60 bg-background/30 hover:border-gold/50"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold font-display text-lg font-semibold text-primary-foreground shadow-gold">
                      {b.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">Recanto do Guerreiro</div>
                    </div>
                  </button>
                ))}
                {barbers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Date */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-semibold">Escolha a data</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Agendamentos disponíveis até 2 dias à frente.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {availableDates.map((d) => {
                  const iso = formatDateISO(d);
                  const selected = date && formatDateISO(date) === iso;
                  return (
                    <button
                      key={iso}
                      onClick={() => {
                        setDate(d);
                        setTime(null);
                        next();
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-gold bg-gold/5"
                          : "border-border/60 bg-background/30 hover:border-gold/50"
                      }`}
                    >
                      <div className="font-semibold">{formatDatePretty(d)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {d.toLocaleDateString("pt-BR")}
                      </div>
                    </button>
                  );
                })}
                {availableDates.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem datas disponíveis no momento.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Time */}
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
                    <button
                      key={s.time}
                      disabled={s.taken}
                      onClick={() => {
                        setTime(s.time);
                        next();
                      }}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                        time === s.time
                          ? "border-gold bg-gold/10 text-gold"
                          : s.taken
                          ? "cursor-not-allowed border-border/40 bg-surface/40 text-muted-foreground/50 line-through"
                          : "border-border/60 bg-background/30 hover:border-gold/50"
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-xl font-semibold">Seus dados</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative mt-1.5">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">WhatsApp</Label>
                  <div className="relative mt-1.5">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => setPhone(formatPhoneBR(onlyDigits(phone)))}
                      placeholder="75 9999-9999"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lembretes
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reminder1h}
                      onChange={(e) => setReminder1h(e.target.checked)}
                      className="h-4 w-4 accent-[var(--gold)]"
                    />
                    Avisar 1 hora antes
                  </label>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reminder10m}
                      onChange={(e) => setReminder10m(e.target.checked)}
                      className="h-4 w-4 accent-[var(--gold)]"
                    />
                    Avisar 10 minutos antes
                  </label>
                </div>

                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
                  <p className="font-semibold">Resumo</p>
                  <ul className="mt-2 space-y-1 text-foreground/90">
                    <li>{service?.name} — R$ {service?.price.toFixed(2).replace(".", ",")}</li>
                    <li>{barber?.name}</li>
                    <li>{date ? formatDatePretty(date) : ""} às {time}</li>
                  </ul>
                </div>

                <p className="text-xs text-muted-foreground">{TOLERANCE_NOTICE}</p>

                <Button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full rounded-full bg-gradient-gold py-6 text-base font-semibold text-primary-foreground shadow-gold hover:scale-[1.01] hover:bg-gradient-gold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar agendamento"}
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              Voltar
            </Button>
            {step < STEPS.length - 1 && (
              <Button
                variant="outline"
                onClick={next}
                disabled={
                  (step === 0 && !serviceId) ||
                  (step === 1 && !barberId) ||
                  (step === 2 && !date) ||
                  (step === 3 && !time)
                }
              >
                Avançar <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
