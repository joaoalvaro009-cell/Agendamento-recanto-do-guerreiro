import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { TenantProvider, refreshTenant } from "@/hooks/use-tenant";

export const Route = createFileRoute("/b/$slug")({
  component: TenantLayout,
});

function TenantLayout() {
  const { slug } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, active")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !data.active) {
        setStatus("missing");
        return;
      }
      try {
        await refreshTenant(slug);
        if (!cancelled) setStatus("ok");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-semibold">Barbearia não encontrada</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            O endereço <span className="font-mono text-gold">/b/{slug}</span> não corresponde a nenhuma barbearia ativa.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-gradient-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-gold"
          >
            Voltar para a plataforma
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider slug={slug}>
      <SiteLayout>
        <Outlet />
      </SiteLayout>
    </TenantProvider>
  );
}
