import { useEffect, useState } from "react";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchServices, uploadSiteImage, type ServiceRow } from "@/lib/queries";
import { getCurrentTenantId } from "@/lib/tenant-context";

export function ServicesAdmin() {
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchServices(true));
    } catch {
      toast.error("Erro ao carregar serviços.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(s: ServiceRow) {
    const { error } = await supabase
      .from("services")
      .update({
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration,
        image_url: s.image_url,
        display_order: s.display_order,
        active: s.active,
      })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
  }

  async function add() {
    const slug = `novo-${Date.now()}`;
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase
      .from("services")
      .insert({ tenant_id, slug, name: "Novo serviço", price: 0, duration: 30, display_order: items.length + 1 });
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void add()}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>
      {items.map((s) => (
        <ServiceEditor key={s.id} service={s} onSave={save} onRemove={remove} onChange={(updated) => setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))} />
      ))}
    </div>
  );
}

function ServiceEditor({
  service,
  onSave,
  onRemove,
  onChange,
}: {
  service: ServiceRow;
  onSave: (s: ServiceRow) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onChange: (s: ServiceRow) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, "services");
      onChange({ ...service, image_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-background/40">
            {service.image_url ? (
              <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
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
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={service.name} onChange={(e) => onChange({ ...service, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={service.description} onChange={(e) => onChange({ ...service, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Preço (R$)</Label>
              <Input type="number" step="0.01" value={service.price} onChange={(e) => onChange({ ...service, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Duração (min)</Label>
              <Input type="number" value={service.duration} onChange={(e) => onChange({ ...service, duration: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={service.display_order} onChange={(e) => onChange({ ...service, display_order: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={service.active} onChange={(e) => onChange({ ...service, active: e.target.checked })} />
            Ativo (visível no site)
          </label>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => void onSave(service)}>Salvar</Button>
            <Button size="sm" variant="destructive" onClick={() => void onRemove(service.id)}>
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
