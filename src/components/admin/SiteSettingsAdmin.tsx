import { useEffect, useState } from "react";
import { Image as ImageIcon, Instagram, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { uploadSiteImage } from "@/lib/queries";

type Settings = {
  id: string;
  instagram_handle: string;
  instagram_url: string;
  logo_url: string | null;
};

export function SiteSettingsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, instagram_handle, instagram_url, logo_url")
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

  async function handleUploadLogo(file: File) {
    if (!settings) return;
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, "logo");
      setSettings({ ...settings, logo_url: url });
      toast.success("Logo enviada. Clique em Salvar para aplicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        instagram_handle: settings.instagram_handle,
        instagram_url: settings.instagram_url,
        logo_url: settings.logo_url,
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
      {/* Logo */}
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Logo da barbearia</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Aparece no <strong>topo</strong> e no <strong>rodapé</strong> do site público, substituindo o nome em texto. Use PNG transparente para melhor resultado.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-background/40 p-2">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">sem logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm hover:bg-surface">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : settings.logo_url ? "Trocar logo" : "Enviar logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])}
              />
            </label>
            {settings.logo_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettings({ ...settings, logo_url: null })}
              >
                <Trash2 className="h-3 w-3" /> Remover logo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Instagram */}
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
      </div>

      <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar tudo"}
      </Button>
    </div>
  );
}
