import { Link } from "@tanstack/react-router";
import { Instagram, MapPin, Phone, Lock } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { formatPhoneBR } from "@/lib/constants";

const FOOTER_LOGO_SIZE: Record<"small" | "medium" | "large", string> = {
  small: "h-10 w-auto max-w-[160px] object-contain",
  medium: "h-14 w-auto max-w-[220px] object-contain",
  large: "h-20 w-auto max-w-[300px] object-contain",
};

export function Footer() {
  const t = useTenant();
  const phoneDigits = t.phone.replace(/\D/g, "");

  return (
    <footer className="relative border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          {t.logo_url ? (
            <img
              src={t.logo_url}
              alt={`Logo ${t.shop_name}`}
              className={FOOTER_LOGO_SIZE[t.logo_size]}
            />
          ) : (
            <>
              <h3 className="font-display text-2xl font-semibold tracking-tight">{t.shop_name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-gold">{t.tagline}</p>
            </>
          )}
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Tradição, precisão e estilo. Uma experiência completa para o homem moderno em {t.city}.
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
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> {t.address}</li>
            {phoneDigits && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {formatPhoneBR(phoneDigits)}</li>
            )}
            {t.instagram_handle && (
              <li>
                <a
                  href={t.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-gold"
                >
                  <Instagram className="h-4 w-4 text-gold" /> {t.instagram_handle}
                </a>
              </li>
            )}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground whitespace-pre-line">
            {t.hours_text}
          </p>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {t.shop_name}. Todos os direitos reservados.</p>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-muted-foreground/70 hover:text-gold">
            <Lock className="h-3 w-3" /> Área dos barbeiros
          </Link>
        </div>
      </div>
    </footer>
  );
}
