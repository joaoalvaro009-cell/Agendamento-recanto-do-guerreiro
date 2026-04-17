
-- Função que clona o conteúdo de um tenant modelo para um novo tenant.
-- Copia: site_settings, services, plans, site_texts, team_members.
-- NÃO copia: appointments, barbers, blocked_slots, testimonials.
CREATE OR REPLACE FUNCTION public.clone_tenant_from_template(
  _template_slug text,
  _new_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _template_id uuid;
  _new_name text;
BEGIN
  -- Apenas super_admin pode executar
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas super admins podem clonar tenants.';
  END IF;

  SELECT id INTO _template_id FROM public.tenants WHERE slug = _template_slug LIMIT 1;
  IF _template_id IS NULL THEN
    RAISE EXCEPTION 'Tenant modelo "%" não encontrado.', _template_slug;
  END IF;

  SELECT name INTO _new_name FROM public.tenants WHERE id = _new_tenant_id LIMIT 1;
  IF _new_name IS NULL THEN
    RAISE EXCEPTION 'Tenant destino não encontrado.';
  END IF;

  -- site_settings (1 linha por tenant)
  INSERT INTO public.site_settings (
    tenant_id, shop_name, tagline, city, address, phone, whatsapp,
    hours_text, instagram_handle, instagram_url, logo_url, logo_size,
    color_primary, color_accent, color_background
  )
  SELECT
    _new_tenant_id, _new_name, tagline, city, address, '', '',
    hours_text, '@suabarbearia', 'https://instagram.com/suabarbearia',
    NULL, logo_size, color_primary, color_accent, color_background
  FROM public.site_settings WHERE tenant_id = _template_id
  ON CONFLICT (tenant_id) DO NOTHING;

  -- services
  INSERT INTO public.services (tenant_id, slug, name, description, price, duration, image_url, display_order, active)
  SELECT _new_tenant_id, slug, name, description, price, duration, image_url, display_order, active
  FROM public.services WHERE tenant_id = _template_id;

  -- plans
  INSERT INTO public.plans (tenant_id, slug, name, price, items, featured, display_order, active)
  SELECT _new_tenant_id, slug, name, price, items, featured, display_order, active
  FROM public.plans WHERE tenant_id = _template_id;

  -- site_texts
  INSERT INTO public.site_texts (tenant_id, key, value, description)
  SELECT _new_tenant_id, key, value, description
  FROM public.site_texts WHERE tenant_id = _template_id;

  -- team_members
  INSERT INTO public.team_members (tenant_id, name, role, bio, image_url, icon, display_order, active)
  SELECT _new_tenant_id, name, role, bio, image_url, icon, display_order, active
  FROM public.team_members WHERE tenant_id = _template_id;
END;
$$;

-- Garante unique em site_settings.tenant_id (necessário pro ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'site_settings_tenant_id_unique'
  ) THEN
    CREATE UNIQUE INDEX site_settings_tenant_id_unique ON public.site_settings(tenant_id);
  END IF;
END$$;
