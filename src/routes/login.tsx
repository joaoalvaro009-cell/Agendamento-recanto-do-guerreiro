import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const trimmed = identifier.trim();
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupSubmitting(true);
    const email = signupEmail.trim();
    if (!email.includes("@")) {
      setSignupSubmitting(false);
      toast.error("Informe um email válido.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupSubmitting(false);
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    });
    setSignupSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Conta criada! Entrando…");
      navigate({ to: "/painel" });
    } else {
      toast.success("Conta criada! Confirme seu email para entrar.");
    }
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
              <h1 className="font-display text-xl font-semibold">Acesso da plataforma</h1>
              <p className="text-xs text-muted-foreground">Entre ou crie sua conta</p>
            </div>
          </div>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-4 space-y-4">
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
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-gold py-5 text-primary-foreground hover:bg-gradient-gold hover:scale-[1.01]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Esqueceu a senha? Fale com o administrador.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Senha (mín. 6 caracteres)</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="signup-password"
                      type={signupShowPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSignupShowPassword((v) => !v)}
                      aria-label={signupShowPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                      tabIndex={-1}
                    >
                      {signupShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={signupSubmitting}
                  className="w-full bg-gradient-gold py-5 text-primary-foreground hover:bg-gradient-gold hover:scale-[1.01]"
                >
                  {signupSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="mr-1 h-4 w-4" /> Criar conta
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground">
                  Após criar a conta, você poderá ser promovido a admin/super-admin pelo responsável da plataforma.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}
