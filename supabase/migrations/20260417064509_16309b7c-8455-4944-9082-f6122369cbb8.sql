-- ============ SERVICES ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active services" ON public.services
  FOR SELECT TO anon, authenticated USING (active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_services_touch BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PLANS ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  items text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active plans" ON public.plans
  FOR SELECT TO anon, authenticated USING (active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage plans" ON public.plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_plans_touch BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TEAM MEMBERS (vitrine pública) ============
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  bio text NOT NULL DEFAULT '',
  image_url text,
  icon text NOT NULL DEFAULT 'star',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active team" ON public.team_members
  FOR SELECT TO anon, authenticated USING (active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage team" ON public.team_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_team_touch BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ BARBERS: avatar + email ============
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS email text;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read site-images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'site-images');

CREATE POLICY "Admins upload site-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'));

-- ============ SEED dos dados atuais ============
INSERT INTO public.services (slug, name, description, price, duration, display_order) VALUES
  ('cabelo', 'Cabelo', 'Corte preciso, finalização impecável.', 25, 30, 1),
  ('barba', 'Barba', 'Toalha quente, acabamento na navalha.', 15, 30, 2),
  ('cabelo-barba', 'Cabelo e Barba', 'Combo completo do guerreiro.', 35, 60, 3),
  ('barba-pezinho', 'Barba e Pezinho', 'Visual sempre alinhado.', 15, 30, 4),
  ('pezinho-sobrancelhas', 'Pezinho e Sobrancelhas', 'Detalhes que fazem diferença.', 10, 30, 5),
  ('barba-sobrancelhas', 'Barba e Sobrancelhas', 'Acabamento refinado.', 15, 30, 6);

INSERT INTO public.plans (slug, name, price, items, featured, display_order) VALUES
  ('essencial', 'Barba Essencial', 54.90,
    ARRAY['4 barbas no mês','Toalha quente em todas','Atendimento prioritário'], false, 1),
  ('corte', 'Corte Mensal', 69.90,
    ARRAY['3 cortes no mês','Lavagem incluída','Atendimento prioritário'], false, 2),
  ('guerreiro', 'Completo Guerreiro', 94.90,
    ARRAY['3 cortes + 3 barbas no mês','Toalha quente e lavagem','Prioridade máxima na agenda','Economia mensal real'], true, 3);

INSERT INTO public.team_members (name, role, bio, icon, display_order) VALUES
  ('Bruno', 'Dono & Master Barber',
    'Fundador do Recanto do Guerreiro. Mais de uma década aperfeiçoando cortes clássicos e modernos com precisão cirúrgica.',
    'crown', 1),
  ('Pedrinho', 'Barbeiro Sênior',
    'Segundo mais experiente da casa. Especialista em barba, navalha e acabamentos refinados.',
    'star', 2);