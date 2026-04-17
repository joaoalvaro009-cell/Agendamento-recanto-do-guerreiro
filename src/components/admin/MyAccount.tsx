import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits, formatPhoneBR } from "@/lib/constants";

function phoneToEmail(phone: string): string {
  return `${onlyDigits(phone)}@recantodoguerreiro.local`;
}

const INTERNAL_DOMAIN = "@recantodoguerreiro.local";

function prettyCurrentLogin(email: string): string {
  if (email.endsWith(INTERNAL_DOMAIN)) {
    const digits = email.replace(INTERNAL_DOMAIN, "");
    return formatPhoneBR(digits) || digits;
  }
  return email;
}

export function MyAccount({ currentEmail }: { currentEmail: string }) {
  const [loginType, setLoginType] = useState<"phone" | "email">(
    currentEmail.endsWith(INTERNAL_DOMAIN) ? "phone" : "email",
  );
  const [newLogin, setNewLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function changeLogin() {
    const raw = newLogin.trim();
    if (!raw) return toast.error("Informe o novo login.");

    let nextEmail: string;
    if (loginType === "phone") {
      const digits = onlyDigits(raw);
      if (digits.length < 10) return toast.error("Número de WhatsApp inválido (mín. DDD + número).");
      nextEmail = phoneToEmail(digits);
    } else {
      if (!raw.includes("@") || raw.length < 5) return toast.error("Email inválido.");
      nextEmail = raw;
    }

    if (nextEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return toast.error("O novo login é igual ao atual.");
    }

    setSavingLogin(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setSavingLogin(false);
    if (error) return toast.error(error.message);
    setNewLogin("");
    toast.success(
      loginType === "phone"
        ? "Login (WhatsApp) atualizado. Use o novo número no próximo acesso."
        : "Email atualizado. Verifique sua caixa de entrada se for solicitado.",
    );
  }

  async function changePassword() {
    if (password.length < 4) return toast.error("Senha precisa ter ao menos 4 caracteres.");
    if (password !== confirmPassword) return toast.error("As senhas não coincidem.");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirmPassword("");
    toast.success("Senha alterada.");
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Mudar usuário (login)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Login atual: <span className="font-semibold text-foreground">{prettyCurrentLogin(currentEmail)}</span>
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Tipo de login</Label>
            <div className="mt-2 flex gap-2">
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${loginType === "phone" ? "border-gold bg-gold/10" : "border-border"}`}>
                <input
                  type="radio"
                  name="myaccount-login-type"
                  checked={loginType === "phone"}
                  onChange={() => setLoginType("phone")}
                />
                WhatsApp
              </label>
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${loginType === "email" ? "border-gold bg-gold/10" : "border-border"}`}>
                <input
                  type="radio"
                  name="myaccount-login-type"
                  checked={loginType === "email"}
                  onChange={() => setLoginType("email")}
                />
                Email
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              {loginType === "phone" ? "Novo número de WhatsApp (só dígitos)" : "Novo email"}
            </Label>
            <Input
              type={loginType === "phone" ? "tel" : "email"}
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              placeholder={loginType === "phone" ? "75999998888" : "voce@exemplo.com"}
            />
          </div>

          <Button size="sm" onClick={() => void changeLogin()} disabled={savingLogin}>
            {savingLogin ? "Salvando..." : "Atualizar login"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Mudar senha</h3>
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Nova senha (mín. 4 caracteres)</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Confirmar nova senha</Label>
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => void changePassword()} disabled={savingPwd}>
            {savingPwd ? "Salvando..." : "Atualizar senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}
