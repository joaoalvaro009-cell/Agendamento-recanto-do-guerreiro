import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Check, ChevronRight, Clock, MapPin, Scissors, Sparkles, Star } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { PLANS, SERVICES, SHOP } from "@/lib/constants";
import hero from "@/assets/hero-barbershop.jpg";
import bruno from "@/assets/barber-bruno.jpg";
import pedrinho from "@/assets/barber-pedrinho.jpg";
import tools from "@/assets/tools.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recanto do Guerreiro — Barbearia Premium em Serrinha, BA" },
      {
        name: "description",
        content: "Cortes precisos, barba na navalha e ambiente premium. Agende online em segundos no Recanto do Guerreiro.",
      },
      { property: "og:title", content: "Recanto do Guerreiro — Barbearia Premium" },
      { property: "og:description", content: "Tradição, técnica e estilo em Serrinha — Bahia." },
      { property: "og:image", content: hero },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: hero },
    ],
  }),
  component: Home,
});

const testimonials = [
  { name: "Lucas M.", text: "Melhor barbearia da região. Atendimento impecável e ambiente top.", rating: 5 },
  { name: "Felipe R.", text: "Bruno é mestre na tesoura. Saio sempre satisfeito e elogiado.", rating: 5 },
  { name: "André S.", text: "Pedrinho manda muito na barba. Recomendo de olhos fechados.", rating: 5 },
];

function Home() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="Interior premium da barbearia Recanto do Guerreiro" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
        </div>

        <div className="mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              <Sparkles className="h-3 w-3" /> Barbearia premium · {SHOP.city}
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Recanto do <span className="text-gradient-gold">Guerreiro</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-foreground/80">
              Onde tradição encontra precisão. Cortes impecáveis, barba na navalha e a experiência que todo guerreiro merece.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/agendar"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-gold transition hover:scale-[1.02]"
              >
                <Calendar className="h-4 w-4" /> Agendar horário
              </Link>
              <Link
                to="/planos"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-7 py-3.5 text-sm font-semibold backdrop-blur transition hover:border-gold hover:text-gold"
              >
                Ver planos <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> Ter–Sáb · 08:00–19:00</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {SHOP.address}</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Nossos serviços</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Cuidado em cada detalhe</h2>
          </div>
          <Link to="/servicos" className="hidden text-sm text-gold hover:underline sm:inline">
            Ver todos →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className="group rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card transition hover:border-gold/60 hover:shadow-gold"
            >
              <div className="flex items-center justify-between">
                <Scissors className="h-5 w-5 text-gold" />
                <span className="font-display text-2xl font-semibold text-gold">
                  R${s.price}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section className="relative bg-surface/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Os guerreiros</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Nossa equipe</h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-2">
            {[
              { name: "Bruno", role: "Dono & Master Barber", img: bruno },
              { name: "Pedrinho", role: "Barbeiro Sênior", img: pedrinho },
            ].map((m) => (
              <div key={m.name} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface/60 shadow-card transition hover:shadow-gold">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img src={m.img} alt={`Barbeiro ${m.name}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-2xl font-semibold">{m.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-gold">{m.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Assinaturas</p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Planos mensais</h2>
          <p className="mt-3 text-muted-foreground">Prioridade na agenda, economia real e praticidade.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-7 shadow-card transition ${
                p.featured ? "border-gold bg-surface-elevated shadow-gold lg:-translate-y-2" : "border-border/60 bg-surface/60"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-gold">
                  Mais escolhido
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="mt-3 font-display text-4xl font-semibold text-gradient-gold">
                R$ {p.price.toFixed(2).replace(".", ",")}
                <span className="text-sm text-muted-foreground"> /mês</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/planos" className="inline-flex rounded-full border border-gold/60 px-7 py-3 text-sm font-semibold text-gold hover:bg-gold/10">
            Conhecer detalhes
          </Link>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 shadow-elegant">
            <img src={tools} alt="Ferramentas de barbeiro premium" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">A experiência</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Mais que um corte. Um ritual.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ambiente acolhedor, atendimento individual, toalha quente, ferramentas profissionais. Tudo pensado para que você saia com mais do que uma boa aparência — saia com confiança.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" /> Pontualidade respeitada</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" /> Higiene impecável</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" /> Atendimento exclusivo</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-surface/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Depoimentos</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">O que dizem nossos clientes</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-card">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</blockquote>
                <figcaption className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  — {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-surface-elevated to-surface p-10 text-center shadow-gold sm:p-14">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Pronto para o seu próximo corte?</h2>
          <p className="mt-3 text-muted-foreground">Reserve seu horário online em menos de 1 minuto.</p>
          <Link
            to="/agendar"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-gold transition hover:scale-[1.03]"
          >
            <Calendar className="h-4 w-4" /> Agendar agora
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
