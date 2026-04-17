import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Prefs = {
  channel_email: boolean;
  channel_whatsapp: boolean;
  reminder_24h: boolean;
  reminder_1h: boolean;
  reminder_10m: boolean;
  notify_new_booking: boolean;
  notify_cancellation: boolean;
  contact_email: string;
  contact_whatsapp: string;
};

const DEFAULTS: Prefs = {
  channel_email: true,
  channel_whatsapp: true,
  reminder_24h: false,
  reminder_1h: true,
  reminder_10m: true,
  notify_new_booking: true,
  notify_cancellation: true,
  contact_email: "",
  contact_whatsapp: "",
};

export function NotificationPreferences({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Erro ao carregar preferências.");
      } else if (data) {
        setPrefs({
          channel_email: data.channel_email,
          channel_whatsapp: data.channel_whatsapp,
          reminder_24h: data.reminder_24h,
          reminder_1h: data.reminder_1h,
          reminder_10m: data.reminder_10m,
          notify_new_booking: data.notify_new_booking,
          notify_cancellation: data.notify_cancellation,
          contact_email: data.contact_email ?? "",
          contact_whatsapp: data.contact_whatsapp ?? "",
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...prefs,
          contact_email: prefs.contact_email.trim() || null,
          contact_whatsapp: prefs.contact_whatsapp.trim() || null,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Preferências salvas.");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando preferências...</p>;
  }

  return (
    <div className="max-w-md space-y-5">
      <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Notificações</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Escolha como e quando você quer ser avisado.
        </p>

        <div className="mt-5 space-y-5">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais</h4>
            <div className="mt-3 space-y-3">
              <ToggleRow
                label="Email"
                checked={prefs.channel_email}
                onChange={(v) => update("channel_email", v)}
              />
              <ToggleRow
                label="WhatsApp"
                checked={prefs.channel_whatsapp}
                onChange={(v) => update("channel_whatsapp", v)}
              />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lembretes antes do horário</h4>
            <div className="mt-3 space-y-3">
              <ToggleRow label="24 horas antes" checked={prefs.reminder_24h} onChange={(v) => update("reminder_24h", v)} />
              <ToggleRow label="1 hora antes" checked={prefs.reminder_1h} onChange={(v) => update("reminder_1h", v)} />
              <ToggleRow label="10 minutos antes" checked={prefs.reminder_10m} onChange={(v) => update("reminder_10m", v)} />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avisos da agenda</h4>
            <div className="mt-3 space-y-3">
              <ToggleRow label="Novo agendamento criado" checked={prefs.notify_new_booking} onChange={(v) => update("notify_new_booking", v)} />
              <ToggleRow label="Cancelamento de agendamento" checked={prefs.notify_cancellation} onChange={(v) => update("notify_cancellation", v)} />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contatos para receber</h4>
            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={prefs.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">WhatsApp (com DDD)</Label>
              <Input
                type="tel"
                value={prefs.contact_whatsapp}
                onChange={(e) => update("contact_whatsapp", e.target.value)}
                placeholder="75999998888"
              />
            </div>
          </section>

          <Button size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar preferências"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
