import { useEffect, useState } from "react";
import { Image as ImageIcon, Instagram, Loader2, Save, Store, Palette, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadSiteImage } from "@/lib/queries";
import { refreshTenant } from "@/hooks/use-tenant";

type Settings = {
  id: string;
  shop_name: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours_text: string;
  instagram_handle: string;
  instagram_url: string;
  logo_url: string | null;
  logo_size: "small" | "medium" | "large";
  color_accent: string;
  color_background: string;
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
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Erro ao carregar configurações.");
    } else if (data) {
      const d = data as Record<string, unknown>;
      setSettings({
        id: data.id,
        shop_name: (d.shop_name as string) ?? "",
        tagline: (d.tagline as string) ?? "",
        city: (d.city as string) ?? "",
        address: (d.address as string) ?? "",
        phone: (d.phone as string) ?? "",
        whatsapp: (d.whatsapp as string) ?? "",
        hours_text: (d.hours_text as string) ?? "",
        instagram_handle: data.instagram_handle,
        instagram_url: data.instagram_url,
        logo_url: data.logo_url,
        logo_size: ((d.logo_size as Settings["logo_size"]) ?? "medium"),
        color_accent: (d.color_accent as string) ?? "oklch(0.78 0.14 78)",
        color_background: (d.color_background as string) ?? "oklch(0.14 0.012 60)",
      });
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

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
        shop_name: settings.shop_name,
        tagline: settings.tagline,
        city: settings.city,
        address: settings.address,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        hours_text: settings.hours_text,
        instagram_handle: settings.instagram_handle,
        instagram_url: settings.instagram_url,
        logo_url: settings.logo_url,
        logo_size: settings.logo_size,
        color_accent: settings.color_accent,
        color_background: settings.color_background,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshTenant();
    toast.success("Configurações salvas.");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!settings) return <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada.</p>;

  return (
    <div className="space-y-6">
      {/* Identidade */}
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Identidade da barbearia</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Aparece em todo o site, rodapé e títulos.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><Label className="text-xs">Nome</Label><Input value={settings.shop_name} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} /></div>
          <div><Label className="text-xs">Slogan / Tagline</Label><Input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></div>
          <div><Label className="text-xs">Cidade</Label><Input value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} /></div>
          <div><Label className="text-xs">Endereço</Label><Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></div>
          <div><Label className="text-xs">Telefone (exibido)</Label><Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="75 9301-7859" /></div>
          <div><Label className="text-xs">WhatsApp (links)</Label><Input value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="75993017859" /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Horário de funcionamento</Label><Input value={settings.hours_text} onChange={(e) => setSettings({ ...settings, hours_text: e.target.value })} placeholder="Ter–Sáb · 08:00–19:00" /></div>
        </div>
      </div>

      {/* Cores */}
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Cores da marca</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Use o formato <code>oklch(...)</code>, <code>#hex</code> ou <code>hsl(...)</code>. A cor de destaque substitui o dourado em todo o site.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Cor de destaque (botões/títulos)</Label>
            <Input value={settings.color_accent} onChange={(e) => setSettings({ ...settings, color_accent: e.target.value })} placeholder="oklch(0.78 0.14 78)" />
          </div>
          <div>
            <Label className="text-xs">Cor de fundo</Label>
            <Input value={settings.color_background} onChange={(e) => setSettings({ ...settings, color_background: e.target.value })} placeholder="oklch(0.14 0.012 60)" />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gold" />
          <h3 className="font-display text-lg font-semibold">Logo</h3>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-background/40 p-2">
            {settings.logo_url ? <img src={settings.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">sem logo</span>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm hover:bg-surface">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : settings.logo_url ? "Trocar logo" : "Enviar logo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])} />
            </label>
            {settings.logo_url && (
              <Button size="sm" variant="outline" onClick={() => setSettings({ ...settings, logo_url: null })}>
                <Trash2 className="h-3 w-3" /> Remover logo
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-border/40 pt-4">
          <Label className="text-xs">Tamanho da logo</Label>
          <div className="mt-3 inline-flex rounded-full border border-border/60 bg-background/40 p-1">
            {(["small", "medium", "large"] as const).map((size) => (
              <button key={size} type="button" onClick={() => setSettings({ ...settings, logo_size: size })}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${settings.logo_size === size ? "bg-gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground hover:text-foreground"}`}>
                {size === "small" ? "Pequena" : size === "medium" ? "Média" : "Grande"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instagram */}
      <div className="rounded-2xl border border-gold/30 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center gap-2"><Instagram className="h-5 w-5 text-gold" /><h3 className="font-display text-lg font-semibold">Instagram</h3></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><Label className="text-xs">@arroba</Label><Input value={settings.instagram_handle} onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })} /></div>
          <div><Label className="text-xs">Link completo</Label><Input type="url" value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} /></div>
        </div>
      </div>

      <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar tudo"}
      </Button>
    </div>
  );
}
