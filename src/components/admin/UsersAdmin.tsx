import { useEffect, useState } from "react";
import { KeyRound, Link2, Mail, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBarberUser,
  deleteBarberUser,
  linkLoginToBarber,
  listBarberUsers,
  setBarberActive,
  updateUserEmail,
  updateUserPassword,
} from "@/server/admin-users";

type Row = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  is_admin: boolean;
  active: boolean;
};

export function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", isAdmin: false });
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ email: "", password: "", isAdmin: false });

  async function load() {
    setLoading(true);
    try {
      const res = await listBarberUsers();
      const list = Array.isArray(res?.barbers) ? (res.barbers as Row[]) : [];
      setRows(list);
    } catch (e) {
      console.error("listBarberUsers failed:", e);
      toast.error(e instanceof Error ? e.message : "Erro ao listar usuários.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleCreate() {
    if (!form.name || !form.phone || !form.email || !form.password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setCreating(true);
    try {
      await createBarberUser({ data: form });
      toast.success("Barbeiro + login criados.");
      setForm({ name: "", phone: "", email: "", password: "", isAdmin: false });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLink(barberId: string) {
    if (!linkForm.email || !linkForm.password) {
      toast.error("Informe email e senha.");
      return;
    }
    try {
      await linkLoginToBarber({ data: { barberId, ...linkForm } });
      toast.success("Login conectado ao barbeiro.");
      setLinkingId(null);
      setLinkForm({ email: "", password: "", isAdmin: false });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conectar.");
    }
  }

  async function handleResetPassword(userId: string) {
    const newPassword = prompt("Nova senha (mín 8 caracteres):");
    if (!newPassword) return;
    try {
      await updateUserPassword({ data: { targetUserId: userId, newPassword } });
      toast.success("Senha atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleChangeEmail(userId: string, current: string | null) {
    const newEmail = prompt("Novo email:", current ?? "");
    if (!newEmail) return;
    try {
      await updateUserEmail({ data: { targetUserId: userId, newEmail } });
      toast.success("Email atualizado.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleToggleActive(barberId: string, active: boolean) {
    try {
      await setBarberActive({ data: { barberId, active: !active } });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleDelete(userId: string, barberId: string) {
    if (!confirm("Excluir esse usuário e o cadastro? Ação irreversível.")) return;
    try {
      await deleteBarberUser({ data: { targetUserId: userId, barberId } });
      toast.success("Excluído.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  const withLogin = rows.filter((r) => r.user_id);
  const withoutLogin = rows.filter((r) => !r.user_id);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/40 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Novo barbeiro com login</h3>
        <p className="mt-1 text-xs text-muted-foreground">Cria o cadastro do barbeiro + login (email/senha) em uma só etapa.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">WhatsApp (só números)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Email (login)</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Senha inicial</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
          É administrador
        </label>
        <Button className="mt-3" size="sm" onClick={() => void handleCreate()} disabled={creating}>
          <Plus className="h-4 w-4" /> {creating ? "Criando..." : "Criar barbeiro + login"}
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!loading && withoutLogin.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold text-gold">
            Barbeiros sem login ({withoutLogin.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Estes barbeiros estão cadastrados mas ainda não conseguem entrar no painel. Crie um login para conectar.
          </p>
          {withoutLogin.map((r) => (
            <div key={r.id} className="rounded-2xl border border-amber-400/30 bg-surface/60 p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.phone} {r.email && `· ${r.email}`}</p>
                </div>
                {linkingId !== r.id && (
                  <Button size="sm" onClick={() => { setLinkingId(r.id); setLinkForm({ email: r.email ?? "", password: "", isAdmin: r.is_admin }); }}>
                    <Link2 className="h-3 w-3" /> Criar login
                  </Button>
                )}
              </div>
              {linkingId === r.id && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Email (login)</Label>
                    <Input type="email" value={linkForm.email} onChange={(e) => setLinkForm({ ...linkForm, email: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Senha (mín 8)</Label>
                    <Input type="password" value={linkForm.password} onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={linkForm.isAdmin} onChange={(e) => setLinkForm({ ...linkForm, isAdmin: e.target.checked })} />
                    É administrador
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button size="sm" onClick={() => void handleLink(r.id)}>Conectar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setLinkingId(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && withLogin.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold">Com login ({withLogin.length})</h3>
          {withLogin.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  {r.is_admin && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">admin</span>}
                  {!r.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">inativo</span>}
                </div>
                <p className="text-xs text-muted-foreground">{r.email ?? "—"} · {r.phone}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void handleChangeEmail(r.user_id!, r.email)}>
                  <Mail className="h-3 w-3" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleResetPassword(r.user_id!)}>
                  <KeyRound className="h-3 w-3" /> Senha
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleToggleActive(r.id, r.active)}>
                  <Power className="h-3 w-3" /> {r.active ? "Desativar" : "Ativar"}
                </Button>
                {r.user_id !== currentUserId && (
                  <Button size="sm" variant="destructive" onClick={() => void handleDelete(r.user_id!, r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
