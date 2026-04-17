-- 1) Expandir site_settings com campos de branding e contato
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS shop_name text NOT NULL DEFAULT 'Recanto do Guerreiro',
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT 'Barbearia Premium',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Serrinha — Bahia',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT 'Serrinha, Bahia',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hours_text text NOT NULL DEFAULT 'Ter–Sáb · 08:00–19:00',
  ADD COLUMN IF NOT EXISTS color_primary text NOT NULL DEFAULT '0 0% 8%',
  ADD COLUMN IF NOT EXISTS color_accent text NOT NULL DEFAULT '42 55% 52%',
  ADD COLUMN IF NOT EXISTS color_background text NOT NULL DEFAULT '0 0% 6%';

-- 2) Tabela de textos do site (chave/valor)
CREATE TABLE IF NOT EXISTS public.site_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site texts"
  ON public.site_texts FOR SELECT
  USING (true);

CREATE POLICY "Admins manage site texts"
  ON public.site_texts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_site_texts_updated_at
  BEFORE UPDATE ON public.site_texts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed de textos padrão
INSERT INTO public.site_texts (key, value, description) VALUES
  ('hero_title', 'Recanto do Guerreiro', 'Título principal do hero (a parte em dourado é o último item)'),
  ('hero_highlight', 'Guerreiro', 'Palavra do título que ganha destaque dourado'),
  ('hero_subtitle', 'Onde tradição encontra precisão. Cortes impecáveis, barba na navalha e a experiência que todo guerreiro merece.', 'Subtítulo do hero'),
  ('hero_badge', 'Barbearia premium', 'Pequena tag acima do título do hero'),
  ('experience_title', 'Mais que um corte. Um ritual.', 'Título da seção experiência'),
  ('experience_text', 'Ambiente acolhedor, atendimento individual, toalha quente, ferramentas profissionais. Tudo pensado para que você saia com mais do que uma boa aparência — saia com confiança.', 'Texto da seção experiência'),
  ('experience_bullet_1', 'Pontualidade respeitada', 'Bullet 1 da experiência'),
  ('experience_bullet_2', 'Higiene impecável', 'Bullet 2 da experiência'),
  ('experience_bullet_3', 'Atendimento exclusivo', 'Bullet 3 da experiência'),
  ('cta_title', 'Pronto para o seu próximo corte?', 'Título do CTA final'),
  ('cta_subtitle', 'Reserve seu horário online em menos de 1 minuto.', 'Subtítulo do CTA final'),
  ('tolerance_notice', 'O cliente tem no máximo 5 minutos de tolerância em caso de atraso. Após esse limite, o próximo cliente será adiantado. Não aceitamos reclamações posteriores.', 'Aviso de tolerância exibido no agendamento'),
  ('confirmation_message', 'Agendamento confirmado! Guarde o código para gerenciar seu horário.', 'Mensagem após confirmar agendamento')
ON CONFLICT (key) DO NOTHING;

-- 3) Tabela de depoimentos
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  text text NOT NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active testimonials"
  ON public.testimonials FOR SELECT
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage testimonials"
  ON public.testimonials FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed de depoimentos
INSERT INTO public.testimonials (customer_name, text, rating, display_order) VALUES
  ('Lucas M.', 'Melhor barbearia da região. Atendimento impecável e ambiente top.', 5, 1),
  ('Felipe R.', 'Bruno é mestre na tesoura. Saio sempre satisfeito e elogiado.', 5, 2),
  ('André S.', 'Pedrinho manda muito na barba. Recomendo de olhos fechados.', 5, 3)
ON CONFLICT DO NOTHING;