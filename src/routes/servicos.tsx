import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Clock } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { fetchServices, type ServiceRow } from "@/lib/queries";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Recanto do Guerreiro" },
      { name: "description", content: "Cortes, barba e cuidados premium em Serrinha — Bahia. Confira preços e agende online." },
      { property: "og:title", content: "Serviços — Recanto do Guerreiro" },
      { property: "og:description", content: "Cortes, barba e cuidados premium em Serrinha — Bahia." },
    ],
  }),
  component: ServicosPage,
});

function ServicosPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices()
      .then((s) => setServices(s))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Tabela</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Serviços & valores
          </h1>
          <p className="mt-4 text-muted-foreground">
            Cada detalhe pensado para entregar uma experiência impecável.
          </p>
        </div>

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface/60 shadow-card transition hover:border-gold/60 hover:shadow-gold"
              >
                {s.image_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <span className="font-display text-2xl font-semibold text-gold">
                      R$ {Number(s.price).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{s.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {s.duration} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <Link
            to="/agendar"
            className="inline-flex rounded-full bg-gradient-gold px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-gold transition hover:scale-[1.02]"
          >
            Agendar horário
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
