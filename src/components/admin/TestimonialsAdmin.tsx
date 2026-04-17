import { useEffect, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchTestimonials, type TestimonialRow } from "@/lib/queries-content";
import { getCurrentTenantId } from "@/lib/tenant-context";

export function TestimonialsAdmin() {
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setItems(await fetchTestimonials(true)); }
    catch { toast.error("Erro ao carregar depoimentos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(t: TestimonialRow) {
    const { error } = await supabase
      .from("testimonials")
      .update({ customer_name: t.customer_name, text: t.text, rating: t.rating, display_order: t.display_order, active: t.active })
      .eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo.");
  }

  async function add() {
    const tenant_id = await getCurrentTenantId();
    const { error } = await supabase
      .from("testimonials")
      .insert({ tenant_id, customer_name: "Novo cliente", text: "Texto do depoimento", rating: 5, display_order: items.length + 1 });
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir depoimento?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void add()}><Plus className="h-4 w-4" /> Novo depoimento</Button>
      </div>
      {items.map((t, idx) => (
        <div key={t.id} className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px]">
            <div><Label className="text-xs">Nome</Label><Input value={t.customer_name} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, customer_name: e.target.value } : x))} /></div>
            <div><Label className="text-xs">Nota (1-5)</Label><Input type="number" min={1} max={5} value={t.rating} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, rating: Math.max(1, Math.min(5, parseInt(e.target.value) || 5)) } : x))} /></div>
            <div><Label className="text-xs">Ordem</Label><Input type="number" value={t.display_order} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, display_order: parseInt(e.target.value) || 0 } : x))} /></div>
          </div>
          <div><Label className="text-xs">Texto</Label><Textarea rows={3} value={t.text} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={t.active} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, active: e.target.checked } : x))} />
            Ativo
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save(t)}>Salvar</Button>
            <Button size="sm" variant="destructive" onClick={() => void remove(t.id)}><Trash2 className="h-3 w-3" /> Excluir</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
