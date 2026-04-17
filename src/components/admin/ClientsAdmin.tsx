import { useEffect, useMemo, useState } from "react";
import { Search, User as UserIcon, Phone, Calendar, DollarSign, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, whatsAppLink } from "@/lib/constants";

type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  total_visits: number;
  total_spent: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
};

export function ClientsAdmin({ isAdmin }: { isAdmin: boolean }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("last_visit_at", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error("Erro ao carregar clientes.");
    } else {
      setCustomers((data ?? []) as Customer[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q.replace(/\D/g, "")) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  const stats = useMemo(() => {
    const total = customers.length;
    const visits = customers.reduce((s, c) => s + c.total_visits, 0);
    const spent = customers.reduce((s, c) => s + Number(c.total_spent), 0);
    return { total, visits, spent };
  }, [customers]);

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase
      .from("customers")
      .update({
        name: editing.name,
        email: editing.email?.trim() || null,
        notes: editing.notes?.trim() || null,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Cliente atualizado.");
      setEditing(null);
      void load();
    }
  }

  async function remove(c: Customer) {
    if (!confirm(`Remover o cliente ${c.name}? O histórico de agendamentos será mantido.`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Cliente removido.");
      void load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<UserIcon className="h-4 w-4" />} label="Clientes" value={stats.total.toString()} />
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Total de visitas" value={stats.visits.toString()} />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita acumulada"
          value={`R$ ${stats.spent.toFixed(2).replace(".", ",")}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {customers.length === 0
              ? "Nenhum cliente ainda. Eles serão criados automaticamente quando houver agendamentos."
              : "Nenhum cliente encontrado para a busca."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3 text-center">Visitas</th>
                <th className="px-4 py-3 text-right">Gasto</th>
                <th className="px-4 py-3">Última visita</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border/40 hover:bg-surface/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.name}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={whatsAppLink(c.phone, "Olá!")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-gold hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {formatPhoneBR(c.phone) || c.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">{c.total_visits}</td>
                  <td className="px-4 py-3 text-right">
                    R$ {Number(c.total_spent).toFixed(2).replace(".", ",")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => void remove(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input value={formatPhoneBR(editing.phone) || editing.phone} disabled />
                <p className="text-[10px] text-muted-foreground">
                  O telefone identifica o cliente — não pode ser alterado.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email (opcional)</Label>
                <Input
                  type="email"
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Preferências, alergias, anotações internas..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface/40 p-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Visitas</div>
                  <div className="font-semibold">{editing.total_visits}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total gasto</div>
                  <div className="font-semibold">
                    R$ {Number(editing.total_spent).toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => void saveEdit()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
