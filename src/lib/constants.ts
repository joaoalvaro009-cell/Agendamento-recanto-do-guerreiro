export const SHOP = {
  name: "Recanto do Guerreiro",
  tagline: "Barbearia Premium",
  city: "Serrinha — Bahia",
  address: "Serrinha, Bahia",
  instagram: "@recantodoguerreiro",
};

export const SERVICES = [
  { id: "cabelo", name: "Cabelo", price: 25, duration: 30, description: "Corte preciso, finalização impecável." },
  { id: "barba", name: "Barba", price: 15, duration: 30, description: "Toalha quente, acabamento na navalha." },
  { id: "cabelo-barba", name: "Cabelo e Barba", price: 35, duration: 60, description: "Combo completo do guerreiro." },
  { id: "barba-pezinho", name: "Barba e Pezinho", price: 15, duration: 30, description: "Visual sempre alinhado." },
  { id: "pezinho-sobrancelhas", name: "Pezinho e Sobrancelhas", price: 10, duration: 30, description: "Detalhes que fazem diferença." },
  { id: "barba-sobrancelhas", name: "Barba e Sobrancelhas", price: 15, duration: 30, description: "Acabamento refinado." },
] as const;

export const PLANS = [
  {
    id: "essencial",
    name: "Barba Essencial",
    price: 54.9,
    items: ["4 barbas no mês", "Toalha quente em todas", "Atendimento prioritário"],
    featured: false,
  },
  {
    id: "corte",
    name: "Corte Mensal",
    price: 69.9,
    items: ["3 cortes no mês", "Lavagem incluída", "Atendimento prioritário"],
    featured: false,
  },
  {
    id: "guerreiro",
    name: "Completo Guerreiro",
    price: 94.9,
    items: ["3 cortes + 3 barbas no mês", "Toalha quente e lavagem", "Prioridade máxima na agenda", "Economia mensal real"],
    featured: true,
  },
] as const;

export const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00",
];

export const MAX_DAYS_AHEAD = 2;

export const TOLERANCE_NOTICE =
  "O cliente tem no máximo 5 minutos de tolerância em caso de atraso. Após esse limite, o próximo cliente será adiantado. Não aceitamos reclamações posteriores.";

/** Format BR phone: 75 9301-7859 */
export function formatPhoneBR(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function whatsAppLink(phone: string, message: string): string {
  const digits = onlyDigits(phone);
  // assume Brazilian numbers — prefix 55 if missing
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}
