import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlans, type PlanRow } from "@/lib/queries";
import { getCurrentTenantId } from "@/lib/tenant-context";

export function PlansAdmin() {
  const [items, setItems] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const tenantId = await getCurrentTenantId();
      setItems(await fetchPlans(tenantId, true));
    } catch {
      toast.error("Erro ao carregar planos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(p: PlanRow) {
    const { error } = await supabase
      .from("plans")
      .update({
        name: p.name,
        price: p.price,
        items: p.items,
        featured: p.featured,
        display_order: p.display_order,
        active: p.active,
      })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
  }

  async function add() {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase
      .from("plans")
      .insert({ tenant_id, slug: `novo-${Date.now()}`, name: "Novo plano", price: 0, items: [], display_order: items.length + 1 });
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void add()}>
          <Plus className="h-4 w-4" /> Novo plano
        </Button>
      </div>
      {items.map((p) => (
        <PlanEditor key={p.id} plan={p} onSave={save} onRemove={remove} onChange={(u) => setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
      ))}
    </div>
  );
}

function PlanEditor({
  plan,
  onSave,
  onRemove,
  onChange,
}: {
  plan: PlanRow;
  onSave: (p: PlanRow) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onChange: (p: PlanRow) => void;
}) {
  const [newItem, setNewItem] = useState("");

  const benefits = Array.isArray(plan.items) ? plan.items : [];

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px]">
        <div>
          <Label className="text-xs">Nome do plano</Label>
          <Input value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Preço (R$)</Label>
          <Input type="number" step="0.01" value={plan.price} onChange={(e) => onChange({ ...plan, price: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-xs">Ordem</Label>
          <Input type="number" value={plan.display_order} onChange={(e) => onChange({ ...plan, display_order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Benefícios</Label>
        <ul className="mt-2 space-y-1.5">
          {benefits.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Input value={it} onChange={(e) => onChange({ ...plan, items: benefits.map((x, i) => (i === idx ? e.target.value : x)) })} />
              <button type="button" onClick={() => onChange({ ...plan, items: benefits.filter((_, i) => i !== idx) })} className="rounded p-1 hover:bg-destructive/15">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input placeholder="Novo benefício" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => {
              if (!newItem.trim()) return;
              onChange({ ...plan, items: [...benefits, newItem.trim()] });
              setNewItem("");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={plan.featured} onChange={(e) => onChange({ ...plan, featured: e.target.checked })} />
          Destaque (Mais escolhido)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={plan.active} onChange={(e) => onChange({ ...plan, active: e.target.checked })} />
          Ativo
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => void onSave({ ...plan, items: benefits })}>Salvar</Button>
        <Button size="sm" variant="destructive" onClick={() => void onRemove(plan.id)}>
          <Trash2 className="h-3 w-3" /> Excluir
        </Button>
      </div>
    </div>
  );
}
