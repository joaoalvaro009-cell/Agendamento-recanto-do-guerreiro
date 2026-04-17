import { useEffect, useState } from "react";
import { Instagram, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Settings = {
  id: string;
  instagram_handle: string;
  instagram_url: string;
};

export function SiteSettingsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, instagram_handle, instagram_url")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Erro ao carregar configurações.");
    } else if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        instagram_handle: settings.instagram_handle,
        instagram_url: settings.instagram_url,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configurações salvas.");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!settings) return <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Instagram</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Aparece no rodapé do site público. O <strong>@arroba</strong> é só o que o cliente vê — o <strong>link</strong> é pra onde o ícone leva ao clicar.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">@arroba (exibido)</Label>
            <Input
              value={settings.instagram_handle}
              onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
              placeholder="@recantodoguerreiro"
            />
          </div>
          <div>
            <Label className="text-xs">Link completo</Label>
            <Input
              type="url"
              value={settings.instagram_url}
              onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
              placeholder="https://instagram.com/seu_perfil"
            />
          </div>
        </div>

        <Button className="mt-4" size="sm" onClick={() => void handleSave()} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
