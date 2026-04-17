import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function MyAccount({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function changeEmail() {
    if (!email.includes("@")) return toast.error("Email inválido.");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Email alterado. Verifique sua caixa de entrada se necessário.");
  }

  async function changePassword() {
    if (password.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres.");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Senha alterada.");
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Mudar email</h3>
        <div className="mt-3 space-y-2">
          <Label className="text-xs">Novo email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button size="sm" onClick={() => void changeEmail()} disabled={savingEmail}>
            {savingEmail ? "Salvando..." : "Atualizar email"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Mudar senha</h3>
        <div className="mt-3 space-y-2">
          <Label className="text-xs">Nova senha (mín 8 caracteres)</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button size="sm" onClick={() => void changePassword()} disabled={savingPwd}>
            {savingPwd ? "Salvando..." : "Atualizar senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}
