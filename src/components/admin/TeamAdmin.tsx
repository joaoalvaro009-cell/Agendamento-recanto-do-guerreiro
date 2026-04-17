import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeam, uploadSiteImage, type TeamRow } from "@/lib/queries";

export function TeamAdmin() {
  const [items, setItems] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchTeam(true));
    } catch {
      toast.error("Erro ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(m: TeamRow) {
    const { error } = await supabase
      .from("team_members")
      .update({
        name: m.name,
        role: m.role,
        bio: m.bio,
        image_url: m.image_url,
        icon: m.icon,
        display_order: m.display_order,
        active: m.active,
      })
      .eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
  }

  async function add() {
    const { error } = await supabase
      .from("team_members")
      .insert({ name: "Novo barbeiro", role: "Barbeiro", bio: "", icon: "star", display_order: items.length + 1 });
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir membro da equipe?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void add()}>
          <Plus className="h-4 w-4" /> Adicionar membro
        </Button>
      </div>
      {items.map((m) => (
        <MemberEditor key={m.id} member={m} onSave={save} onRemove={remove} onChange={(u) => setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
      ))}
    </div>
  );
}

function MemberEditor({
  member,
  onSave,
  onRemove,
  onChange,
}: {
  member: TeamRow;
  onSave: (m: TeamRow) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onChange: (m: TeamRow) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, "team");
      onChange({ ...member, image_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card grid gap-3 sm:grid-cols-[140px_1fr]">
      <div>
        <div className="aspect-[4/5] overflow-hidden rounded-xl border border-border bg-background/40">
          {member.image_url ? (
            <img src={member.image_url} alt={member.name} className="h-full w-full object-cover" />
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
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={member.name} onChange={(e) => onChange({ ...member, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Função</Label>
            <Input value={member.role} onChange={(e) => onChange({ ...member, role: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Bio</Label>
          <Textarea rows={3} value={member.bio} onChange={(e) => onChange({ ...member, bio: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Ícone</Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={member.icon} onChange={(e) => onChange({ ...member, icon: e.target.value })}>
              <option value="crown">Coroa</option>
              <option value="star">Estrela</option>
              <option value="scissors">Tesoura</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Ordem</Label>
            <Input type="number" value={member.display_order} onChange={(e) => onChange({ ...member, display_order: parseInt(e.target.value) || 0 })} />
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={member.active} onChange={(e) => onChange({ ...member, active: e.target.checked })} />
            Ativo
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => void onSave(member)}>Salvar</Button>
          <Button size="sm" variant="destructive" onClick={() => void onRemove(member.id)}>
            <Trash2 className="h-3 w-3" /> Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
