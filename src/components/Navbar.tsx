import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { SHOP } from "@/lib/constants";
import { useSiteSettings } from "@/hooks/use-site-settings";

const links = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/equipe", label: "Equipe" },
  { to: "/planos", label: "Planos" },
  { to: "/meu-agendamento", label: "Meu agendamento" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { logo_url } = useSiteSettings();
  const logoSrc = logo_url || logo;
  const hasCustomLogo = Boolean(logo_url);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img
            src={logoSrc}
            alt={`Logo ${SHOP.name}`}
            className={hasCustomLogo ? "h-11 w-auto max-w-[180px] object-contain" : "h-9 w-9"}
            width={hasCustomLogo ? undefined : 36}
            height={hasCustomLogo ? undefined : 36}
          />
          {!hasCustomLogo && (
            <div className="leading-tight">
              <div className="font-display text-base font-semibold tracking-wide">{SHOP.name}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{SHOP.tagline}</div>
            </div>
          )}
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition hover:text-gold"
              activeProps={{ className: "text-gold" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/agendar"
            className="rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary-foreground shadow-gold transition hover:scale-[1.02]"
          >
            Agendar
          </Link>
        </nav>

        <button
          className="md:hidden text-foreground p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
                activeProps={{ className: "text-gold" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/agendar"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-gradient-gold px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-gold"
            >
              Agendar horário
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
