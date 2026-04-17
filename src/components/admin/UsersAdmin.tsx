import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Mail, Plus, Power, Trash2, Upload, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "@/lib/constants";
import { uploadSiteImage } from "@/lib/queries";
import {
  createBarberUser,
  deleteBarberUser,
  linkLoginToBarber,
  listBarberUsers,
  setBarberActive,
  updateMemberProfile,
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
  team_member_id: string | null;
  public_role: string;
  public_bio: string;
  public_image_url: string | null;
  public_icon: string;
};

const emptyForm = {
  name: "",
  phone: "",
  role: "Barbeiro",
  bio: "",
  imageUrl: null as string | null,
  password: "",
  isAdmin: false,
  withLogin: true,
};

function phoneToEmail(phone: string): string {
  return `${onlyDigits(phone)}@recantodoguerreiro.local`;
}

export function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const createBarberUserFn = useServerFn(createBarberUser);
  const listBarberUsersFn = useServerFn(listBarberUsers);
  const updateUserEmailFn = useServerFn(updateUserEmail);
  const updateUserPasswordFn = useServerFn(updateUserPassword);
  const setBarberActiveFn = useServerFn(setBarberActive);
  const deleteBarberUserFn = useServerFn(deleteBarberUser);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    return { authorization: `Bearer ${token}` };
  }

  async function load() {
    setLoading(true);
    try {
      const result = await listBarberUsersFn({ headers: await getAuthHeaders() });
      setRows((result.barbers ?? []) as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function handleNewUpload(file: File) {
    setUploadingNew(true);
    try {
      const url = await uploadSiteImage(file, "team");
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Preencha pelo menos nome e WhatsApp.");
      return;
    }
    if (form.withLogin && form.password.trim().length < 4) {
      toast.error("Senha precisa ter ao menos 4 caracteres (ou desmarque 'Criar login agora').");
      return;
    }
    setCreating(true);
    try {
      const phoneDigits = onlyDigits(form.phone);
      if (form.withLogin) {
        await createBarberUserFn({
          headers: await getAuthHeaders(),
          data: {
            name: form.name,
            phone: form.phone,
            role: form.role,
            bio: form.bio,
            imageUrl: form.imageUrl,
            email: phoneToEmail(phoneDigits),
            password: form.password,
            isAdmin: form.isAdmin,
          },
        });
        toast.success("Membro criado com login (WhatsApp como usuário).");
      } else {
        // Cria só o perfil público + barbeiro, sem login
        const { error: bErr } = await supabase.from("barbers").insert({
          name: form.name.trim(),
          phone: phoneDigits,
          email: null,
          is_admin: false,
          active: true,
          bio: form.bio,
          avatar_url: form.imageUrl,
        });
        if (bErr) throw bErr;
        await supabase.from("team_members").insert({
          name: form.name.trim(),
          role: form.role || "Barbeiro",
          bio: form.bio,
          icon: "star",
          image_url: form.imageUrl,
          active: true,
        });
        toast.success("Membro criado (sem login). Crie depois em 'Criar login'.");
      }
      setForm(emptyForm);
      setShowNew(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword(userId: string) {
    const newPassword = prompt("Nova senha (mín 4 caracteres):");
    if (!newPassword || newPassword.length < 4) {
      if (newPassword) toast.error("Senha precisa ter ao menos 4 caracteres.");
      return;
    }
    try {
      await updateUserPasswordFn({ headers: await getAuthHeaders(), data: { targetUserId: userId, newPassword } });
      toast.success("Senha atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleChangeEmail(userId: string, current: string | null) {
    const newEmail = prompt("Novo email:", current ?? "");
    if (!newEmail) return;
    try {
      await updateUserEmailFn({ headers: await getAuthHeaders(), data: { targetUserId: userId, newEmail } });
      toast.success("Email atualizado.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleToggleActive(barberId: string, active: boolean, teamMemberId: string | null) {
    try {
      await setBarberActiveFn({ headers: await getAuthHeaders(), data: { barberId, teamMemberId, active: !active } });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  async function handleDelete(userId: string | null, barberId: string) {
    if (!confirm("Excluir membro (login + perfil público)? Ação irreversível.")) return;
    try {
      await deleteBarberUserFn({ headers: await getAuthHeaders(), data: { targetUserId: userId, barberId } });
      toast.success("Excluído.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Membros / Acessos</h3>
          <p className="text-xs text-muted-foreground">
            Cada membro aparece na vitrine pública e (se tiver email/senha) entra no painel para gerenciar agendamentos.
          </p>
        </div>
        {!showNew && (
          <Button size="sm" onClick={() => setShowNew(true)}>
            <UserPlus className="h-4 w-4" /> Novo membro
          </Button>
        )}
      </div>

      {showNew && (
        <div className="rounded-2xl border border-gold/40 bg-surface/60 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-semibold text-gold">Novo membro</h4>
            <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setForm(emptyForm); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cria <strong>perfil público</strong> (vitrine + página de agendamento) e <strong>login</strong> de uma vez só.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <div className="aspect-[4/5] overflow-hidden rounded-xl border border-border bg-background/40">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">sem foto</div>
                )}
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs hover:bg-surface">
                {uploadingNew ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {uploadingNew ? "Enviando..." : "Foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleNewUpload(e.target.files[0])} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Cargo / função pública</Label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp (só números)</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                {form.withLogin && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Senha inicial (mín 4 caracteres)</Label>
                    <PasswordInput
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="O usuário entra com o WhatsApp + esta senha"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      O login será feito com <strong>WhatsApp</strong> (mesmo da vitrine) e esta senha.
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label className="text-xs">Bio (vitrine pública)</Label>
                  <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.withLogin}
                    onChange={(e) => setForm({ ...form, withLogin: e.target.checked })}
                  />
                  Criar login agora
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isAdmin}
                    onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                    disabled={!form.withLogin}
                  />
                  É administrador
                </label>
              </div>
              <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
                <Plus className="h-4 w-4" /> {creating ? "Criando..." : form.withLogin ? "Criar membro + login" : "Criar membro"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!loading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum membro cadastrado.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r) => (
          <MemberCard
            key={r.id}
            row={r}
            isSelf={r.user_id === currentUserId}
            onReload={load}
            onLink={() => void load()}
            onChangeEmail={() => void handleChangeEmail(r.user_id!, r.email)}
            onResetPassword={() => void handleResetPassword(r.user_id!)}
            onToggleActive={() => void handleToggleActive(r.id, r.active, r.team_member_id)}
            onDelete={() => void handleDelete(r.user_id, r.id)}
            getAuthHeaders={getAuthHeaders}
          />
        ))}
      </div>
    </div>
  );
}

function MemberCard({
  row,
  isSelf,
  onReload,
  onChangeEmail,
  onResetPassword,
  onToggleActive,
  onDelete,
  getAuthHeaders,
}: {
  row: Row;
  isSelf: boolean;
  onReload: () => Promise<void>;
  onLink: () => void;
  onChangeEmail: () => void;
  onResetPassword: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  getAuthHeaders: () => Promise<{ authorization: string }>;
}) {
  const updateMemberProfileFn = useServerFn(updateMemberProfile);
  const linkLoginToBarberFn = useServerFn(linkLoginToBarber);
  const [name, setName] = useState(row.name);
  const [phone, setPhone] = useState(row.phone);
  const [role, setRole] = useState(row.public_role);
  const [bio, setBio] = useState(row.public_bio);
  const [icon, setIcon] = useState(row.public_icon || "star");
  const [imageUrl, setImageUrl] = useState<string | null>(row.public_image_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkForm, setLinkForm] = useState({ email: row.email ?? onlyDigits(row.phone), password: "", isAdmin: row.is_admin });

  // Só recarrega o form quando muda de barbeiro (id diferente).
  // Não pode depender do objeto `row` inteiro, senão sobrescreve o que o usuário digita
  // toda vez que o pai recria o array em re-renders.
  useEffect(() => {
    setName(row.name);
    setPhone(row.phone);
    setRole(row.public_role);
    setBio(row.public_bio);
    setIcon(row.public_icon || "star");
    setImageUrl(row.public_image_url);
    setLinkForm({ email: row.email ?? onlyDigits(row.phone), password: "", isAdmin: row.is_admin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, "team");
      setImageUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateMemberProfileFn({
        headers: await getAuthHeaders(),
        data: { barberId: row.id, name, phone, role, bio, imageUrl, icon },
      });
      toast.success("Perfil salvo.");
      void onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLink() {
    const raw = linkForm.email.trim();
    // Aceita telefone OU email. Se não tiver "@", converte número em email interno.
    const email = raw
      ? (raw.includes("@") ? raw : phoneToEmail(raw))
      : phoneToEmail(phone);
    if (!linkForm.password || linkForm.password.length < 4) {
      toast.error("Senha precisa ter ao menos 4 caracteres.");
      return;
    }
    try {
      await linkLoginToBarberFn({
        headers: await getAuthHeaders(),
        data: { barberId: row.id, email, password: linkForm.password, isAdmin: linkForm.isAdmin },
      });
      toast.success("Login conectado.");
      setLinking(false);
      void onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-xl border border-border bg-background/40">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">sem foto</div>
            )}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs hover:bg-surface">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? "Enviando..." : "Trocar foto"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{row.name}</p>
            {row.is_admin && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">admin</span>}
            {!row.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">inativo</span>}
            {!row.user_id && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] uppercase text-destructive">sem login</span>}
            <span className="ml-auto text-xs text-muted-foreground">{row.email ?? "—"}</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Cargo público</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ícone</Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={icon} onChange={(e) => setIcon(e.target.value)}>
                <option value="crown">Coroa</option>
                <option value="star">Estrela</option>
                <option value="scissors">Tesoura</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Bio (vitrine)</Label>
              <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar perfil"}
            </Button>

            {row.user_id ? (
              <>
                <Button size="sm" variant="outline" onClick={onChangeEmail}>
                  <Mail className="h-3 w-3" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={onResetPassword}>
                  <KeyRound className="h-3 w-3" /> Senha
                </Button>
              </>
            ) : (
              !linking && (
                <Button size="sm" variant="outline" onClick={() => setLinking(true)}>
                  <KeyRound className="h-3 w-3" /> Criar login
                </Button>
              )
            )}

            <Button size="sm" variant="outline" onClick={onToggleActive}>
              <Power className="h-3 w-3" /> {row.active ? "Desativar" : "Ativar"}
            </Button>

            {!isSelf && (
              <Button size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {linking && !row.user_id && (
            <div className="mt-2 grid gap-2 rounded-xl border border-gold/30 bg-background/40 p-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Telefone ou email (login)</Label>
                <Input
                  value={linkForm.email}
                  onChange={(e) => setLinkForm({ ...linkForm, email: e.target.value })}
                  placeholder={`${onlyDigits(phone) || "número do WhatsApp"} ou email`}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pode ser só o número do WhatsApp (recomendado) ou um email.
                </p>
              </div>
              <div>
                <Label className="text-xs">Senha (mín 4)</Label>
                <PasswordInput value={linkForm.password} onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={linkForm.isAdmin} onChange={(e) => setLinkForm({ ...linkForm, isAdmin: e.target.checked })} />
                É administrador
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button size="sm" onClick={() => void handleLink()}>Conectar</Button>
                <Button size="sm" variant="ghost" onClick={() => setLinking(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
