import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Instagram, MapPin, Phone, Lock } from "lucide-react";
import { SHOP } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

export function Footer() {
  const [instagram, setInstagram] = useState({
    handle: SHOP.instagram,
    url: "https://instagram.com/recantodoguerreiro",
  });

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("instagram_handle, instagram_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInstagram({ handle: data.instagram_handle, url: data.instagram_url });
        }
      });
  }, []);

  return (
    <footer className="relative border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="font-display text-2xl font-semibold tracking-tight">{SHOP.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gold">{SHOP.tagline}</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Tradição, precisão e estilo. Uma experiência completa para o homem moderno em {SHOP.city}.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Navegar
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/servicos" className="hover:text-gold">Serviços</Link></li>
            <li><Link to="/equipe" className="hover:text-gold">Equipe</Link></li>
            <li><Link to="/planos" className="hover:text-gold">Planos</Link></li>
            <li><Link to="/agendar" className="hover:text-gold">Agendar</Link></li>
            <li><Link to="/meu-agendamento" className="hover:text-gold">Meu agendamento</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Contato
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {SHOP.address}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> 75 9301-7859</li>
            <li>
              <a
                href={instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-gold"
              >
                <Instagram className="h-4 w-4 text-gold" /> {instagram.handle}
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Ter — Sáb · 08:00–19:00<br />
            Seg e Dom · Fechado
          </p>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {SHOP.name}. Todos os direitos reservados.</p>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-muted-foreground/70 hover:text-gold">
            <Lock className="h-3 w-3" /> Área dos barbeiros
          </Link>
        </div>
      </div>
    </footer>
  );
}
