import { useEffect, useState } from "react";
import { KeyRound, Mail, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBarberUser,
  deleteBarberUser,
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

  async function load() {
    setLoading(true);
    try {
      const res = await listBarberUsers();
      setRows(res.barbers as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar usuários.");
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
      toast.success("Usuário criado.");
      setForm({ name: "", phone: "", email: "", password: "", isAdmin: false });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setCreating(false);
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/40 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Novo barbeiro / admin</h3>
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
          <Plus className="h-4 w-4" /> {creating ? "Criando..." : "Criar usuário"}
        </Button>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {rows.map((r) => (
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
              {r.user_id && (
                <>
                  <Button size="sm" variant="outline" onClick={() => void handleChangeEmail(r.user_id!, r.email)}>
                    <Mail className="h-3 w-3" /> Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleResetPassword(r.user_id!)}>
                    <KeyRound className="h-3 w-3" /> Senha
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => void handleToggleActive(r.id, r.active)}>
                <Power className="h-3 w-3" /> {r.active ? "Desativar" : "Ativar"}
              </Button>
              {r.user_id && r.user_id !== currentUserId && (
                <Button size="sm" variant="destructive" onClick={() => void handleDelete(r.user_id!, r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
