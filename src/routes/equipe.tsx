import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Star, Scissors } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { fetchTeam, type TeamRow } from "@/lib/queries";
import brunoFallback from "@/assets/barber-bruno.jpg";
import pedrinhoFallback from "@/assets/barber-pedrinho.jpg";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Recanto do Guerreiro" },
      { name: "description", content: "Conheça os barbeiros do Recanto do Guerreiro em Serrinha — Bahia." },
      { property: "og:title", content: "Equipe — Recanto do Guerreiro" },
      { property: "og:description", content: "Profissionais com técnica, estilo e respeito pelo cliente." },
    ],
  }),
  component: EquipePage,
});

const ICONS = { crown: Crown, star: Star, scissors: Scissors } as const;

function fallbackImage(name: string): string {
  if (name.toLowerCase().includes("bruno")) return brunoFallback;
  if (name.toLowerCase().includes("pedrinho")) return pedrinhoFallback;
  return brunoFallback;
}

function EquipePage() {
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam()
      .then(setTeam)
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Os guerreiros</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Profissionais à sua altura
          </h1>
          <p className="mt-4 text-muted-foreground">
            Mãos experientes, olho clínico e respeito total pelo cliente.
          </p>
        </div>

        {loading ? (
          <p className="mt-14 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-2">
            {team.map((m) => {
              const Icon = ICONS[m.icon as keyof typeof ICONS] ?? Star;
              const img = m.image_url ?? fallbackImage(m.name);
              return (
                <article
                  key={m.id}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-surface/60 shadow-card transition hover:border-gold/60 hover:shadow-gold"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={img}
                      alt={`Retrato profissional do barbeiro ${m.name}`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-primary-foreground">
                        <Icon className="h-3.5 w-3.5" /> {m.role}
                      </div>
                      <h3 className="mt-3 font-display text-3xl font-semibold">{m.name}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-muted-foreground">{m.bio}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
