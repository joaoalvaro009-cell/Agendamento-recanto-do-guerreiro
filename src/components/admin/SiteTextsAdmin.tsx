import { useEffect, useState } from "react";
import { Save, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchSiteTexts, type SiteTextRow } from "@/lib/queries-content";
import { refreshTenant } from "@/hooks/use-tenant";

export function SiteTextsAdmin() {
  const [items, setItems] = useState<SiteTextRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems(await fetchSiteTexts()); }
    catch { toast.error("Erro ao carregar textos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveAll() {
    setSaving(true);
    try {
      for (const it of items) {
        const { error } = await supabase
          .from("site_texts")
          .update({ value: it.value })
          .eq("id", it.id);
        if (error) throw error;
      }
      await refreshTenant();
      toast.success("Textos salvos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Textos do site</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Edite os textos exibidos nas páginas públicas.</p>
      </div>

      {items.map((it, idx) => (
        <div key={it.id} className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card">
          <Label className="text-xs">{it.description || it.key}</Label>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">chave: {it.key}</p>
          {it.value.length > 80 || it.value.includes("\n") ? (
            <Textarea
              className="mt-2"
              rows={3}
              value={it.value}
              onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, value: e.target.value } : x))}
            />
          ) : (
            <Input
              className="mt-2"
              value={it.value}
              onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, value: e.target.value } : x))}
            />
          )}
        </div>
      ))}

      <Button size="sm" onClick={() => void saveAll()} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar todos"}
      </Button>
    </div>
  );
}
