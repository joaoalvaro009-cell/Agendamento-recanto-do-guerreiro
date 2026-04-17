-- ============================================================
-- 1) TABELA tenants
-- ============================================================
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  active BOOLEAN NOT NULL DEFAULT true,
  owner_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_owner ON public.tenants(owner_user_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tenants_touch_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.tenant_id_by_slug(_slug TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE slug = _slug AND active = true LIMIT 1
$$;

-- ============================================================
-- 2) Tenant inicial: Recanto do Guerreiro
-- ============================================================
INSERT INTO public.tenants (slug, name, plan, active)
VALUES ('recanto-do-guerreiro', 'Recanto do Guerreiro', 'pro', true);

-- ============================================================
-- 3) tenant_id em todas as tabelas (com backfill)
-- ============================================================
DO $$
DECLARE
  recanto_id UUID;
BEGIN
  SELECT id INTO recanto_id FROM public.tenants WHERE slug = 'recanto-do-guerreiro';

  ALTER TABLE public.appointments ADD COLUMN tenant_id UUID;
  UPDATE public.appointments SET tenant_id = recanto_id;
  ALTER TABLE public.appointments ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);

  ALTER TABLE public.barbers ADD COLUMN tenant_id UUID;
  UPDATE public.barbers SET tenant_id = recanto_id;
  ALTER TABLE public.barbers ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.barbers ADD CONSTRAINT barbers_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_barbers_tenant ON public.barbers(tenant_id);

  ALTER TABLE public.blocked_slots ADD COLUMN tenant_id UUID;
  UPDATE public.blocked_slots SET tenant_id = recanto_id;
  ALTER TABLE public.blocked_slots ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.blocked_slots ADD CONSTRAINT blocked_slots_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_blocked_slots_tenant ON public.blocked_slots(tenant_id);

  ALTER TABLE public.plans ADD COLUMN tenant_id UUID;
  UPDATE public.plans SET tenant_id = recanto_id;
  ALTER TABLE public.plans ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.plans ADD CONSTRAINT plans_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_plans_tenant ON public.plans(tenant_id);
  ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_slug_key;
  ALTER TABLE public.plans ADD CONSTRAINT plans_tenant_slug_unique UNIQUE (tenant_id, slug);

  ALTER TABLE public.services ADD COLUMN tenant_id UUID;
  UPDATE public.services SET tenant_id = recanto_id;
  ALTER TABLE public.services ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.services ADD CONSTRAINT services_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_services_tenant ON public.services(tenant_id);
  ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_slug_key;
  ALTER TABLE public.services ADD CONSTRAINT services_tenant_slug_unique UNIQUE (tenant_id, slug);

  ALTER TABLE public.site_settings ADD COLUMN tenant_id UUID;
  UPDATE public.site_settings SET tenant_id = recanto_id;
  ALTER TABLE public.site_settings ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_tenant_unique UNIQUE (tenant_id);

  ALTER TABLE public.site_texts ADD COLUMN tenant_id UUID;
  UPDATE public.site_texts SET tenant_id = recanto_id;
  ALTER TABLE public.site_texts ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.site_texts ADD CONSTRAINT site_texts_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_site_texts_tenant ON public.site_texts(tenant_id);
  ALTER TABLE public.site_texts ADD CONSTRAINT site_texts_tenant_key_unique UNIQUE (tenant_id, key);

  ALTER TABLE public.team_members ADD COLUMN tenant_id UUID;
  UPDATE public.team_members SET tenant_id = recanto_id;
  ALTER TABLE public.team_members ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.team_members ADD CONSTRAINT team_members_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_team_members_tenant ON public.team_members(tenant_id);

  ALTER TABLE public.testimonials ADD COLUMN tenant_id UUID;
  UPDATE public.testimonials SET tenant_id = recanto_id;
  ALTER TABLE public.testimonials ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.testimonials ADD CONSTRAINT testimonials_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_testimonials_tenant ON public.testimonials(tenant_id);
END $$;

-- ============================================================
-- 4) current_tenant_id()
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1),
    (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid() LIMIT 1)
  )
$$;

-- ============================================================
-- 5) RLS POLICIES
-- ============================================================

-- tenants
CREATE POLICY "Public can view active tenants" ON public.tenants
  FOR SELECT TO anon, authenticated
  USING (active = true OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Owner can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR id = current_tenant_id());

CREATE POLICY "Super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin updates own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- appointments
DROP POLICY IF EXISTS "Admin deletes" ON public.appointments;
DROP POLICY IF EXISTS "Barbers see own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barbers update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointment" ON public.appointments;

CREATE POLICY "Super admin sees all appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant members see appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id() AND (
      barber_id = current_barber_id() OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Tenant members update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_tenant_id() AND (
      barber_id = current_barber_id() OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id() AND (
      barber_id = current_barber_id() OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Tenant admin deletes appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can create appointment" ON public.appointments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(customer_name) BETWEEN 2 AND 120
    AND length(customer_phone) BETWEEN 10 AND 20
    AND length(service_name) BETWEEN 1 AND 80
    AND service_price >= 0
    AND status = 'confirmed'
    AND tenant_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND active = true)
  );

-- barbers
DROP POLICY IF EXISTS "Admins manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can view their own row" ON public.barbers;

CREATE POLICY "Super admin manages all barbers" ON public.barbers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public views active barbers" ON public.barbers
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "Tenant admin manages barbers" ON public.barbers
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Barber views own row" ON public.barbers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- blocked_slots
DROP POLICY IF EXISTS "Barber/admin manage blocked" ON public.blocked_slots;
DROP POLICY IF EXISTS "Public read blocked slots" ON public.blocked_slots;

CREATE POLICY "Public reads blocked slots" ON public.blocked_slots
  FOR SELECT USING (true);

CREATE POLICY "Tenant manages blocked slots" ON public.blocked_slots
  FOR ALL TO authenticated
  USING (
    tenant_id = current_tenant_id() AND (
      barber_id = current_barber_id() OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id() AND (
      barber_id = current_barber_id() OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- plans
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone views active plans" ON public.plans;

CREATE POLICY "Public views active plans" ON public.plans
  FOR SELECT TO anon, authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin manages plans" ON public.plans
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- services
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone views active services" ON public.services;

CREATE POLICY "Public views active services" ON public.services
  FOR SELECT TO anon, authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin manages services" ON public.services
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- site_settings
DROP POLICY IF EXISTS "Admins manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Public views site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Tenant admin manages site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- site_texts
DROP POLICY IF EXISTS "Admins manage site texts" ON public.site_texts;
DROP POLICY IF EXISTS "Anyone can view site texts" ON public.site_texts;

CREATE POLICY "Public views site texts" ON public.site_texts
  FOR SELECT USING (true);

CREATE POLICY "Tenant admin manages site texts" ON public.site_texts
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- team_members
DROP POLICY IF EXISTS "Admins manage team" ON public.team_members;
DROP POLICY IF EXISTS "Anyone views active team" ON public.team_members;

CREATE POLICY "Public views active team" ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin manages team" ON public.team_members
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- testimonials
DROP POLICY IF EXISTS "Admins manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Anyone views active testimonials" ON public.testimonials;

CREATE POLICY "Public views active testimonials" ON public.testimonials
  FOR SELECT
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin manages testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Super admin manages all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));