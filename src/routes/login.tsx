import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/constants";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso barbeiros — Recanto do Guerreiro" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

/** Convert phone (with mask) to a deterministic email used for auth. */
function phoneToEmail(phone: string): string {
  return `${onlyDigits(phone)}@recantodoguerreiro.local`;
}

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const trimmed = identifier.trim();
    // Aceita telefone (qualquer coisa que não seja email) OU email
    const email = trimmed.includes("@") ? trimmed : phoneToEmail(trimmed);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("Telefone/email ou senha inválidos.");
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/painel" });
  }

  return (
    <SiteLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-2xl border border-border/60 bg-surface/60 p-7 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold">Área dos barbeiros</h1>
              <p className="text-xs text-muted-foreground">Acesso restrito</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="identifier">Telefone ou email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="75 9999-9999 ou seu@email.com"
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use seu WhatsApp (só números) ou email cadastrado.
              </p>
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-gold py-5 text-primary-foreground hover:bg-gradient-gold hover:scale-[1.01]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            Esqueceu a senha? Fale com o administrador.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
