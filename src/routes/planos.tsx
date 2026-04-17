import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { SHOP, whatsAppLink } from "@/lib/constants";
import { fetchPlans, type PlanRow } from "@/lib/queries";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos mensais — Recanto do Guerreiro" },
      { name: "description", content: "Assine um plano mensal e tenha prioridade na agenda, economia e praticidade." },
      { property: "og:title", content: "Planos mensais — Recanto do Guerreiro" },
      { property: "og:description", content: "Barba, corte e combo Guerreiro com vantagens exclusivas." },
    ],
  }),
  component: PlanosPage,
});

function PlanosPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Assinaturas</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Planos mensais
          </h1>
          <p className="mt-4 text-muted-foreground">
            Esteja sempre alinhado com prioridade na agenda, economia real e atendimento exclusivo.
          </p>
        </div>

        {loading ? (
          <p className="mt-14 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((p) => {
              const message = `Olá, gostaria de assinar o plano *${p.name}* — R$ ${Number(p.price).toFixed(2).replace(".", ",")}.`;
              const href = p.checkout_url?.trim() ? p.checkout_url : whatsAppLink("75 9301-7859", message);
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border p-7 shadow-card transition ${
                    p.featured
                      ? "border-gold bg-gradient-to-b from-surface-elevated to-surface shadow-gold lg:-translate-y-2"
                      : "border-border/60 bg-surface/60 hover:border-gold/40"
                  }`}
                >
                  {p.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-gold">
                        <Crown className="h-3 w-3" /> Mais escolhido
                      </span>
                    </div>
                  )}
                  <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-semibold text-gradient-gold">
                      R$ {Number(p.price).toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    {p.items.map((i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <span className="text-foreground/90">{i}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-7 block rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                      p.featured
                        ? "bg-gradient-gold text-primary-foreground shadow-gold hover:scale-[1.02]"
                        : "border border-gold/60 text-gold hover:bg-gold/10"
                    }`}
                  >
                    Quero esse plano
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          * Para assinar, fale com {SHOP.name} pelo WhatsApp.
        </p>
      </section>
    </SiteLayout>
  );
}
