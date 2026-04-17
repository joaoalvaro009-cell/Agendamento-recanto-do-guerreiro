
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  first_visit_at timestamp with time zone,
  last_visit_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_customers_tenant_phone ON public.customers(tenant_id, phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages all customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant team views customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant admin manages customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tg_customers_touch
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger: ao criar/concluir agendamento, faz upsert do cliente
CREATE OR REPLACE FUNCTION public.upsert_customer_from_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _appt_ts timestamp with time zone;
  _is_new_visit boolean := false;
  _add_spent numeric := 0;
BEGIN
  _appt_ts := (NEW.appointment_date::timestamp + NEW.appointment_time)::timestamp with time zone;

  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    _is_new_visit := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    _add_spent := COALESCE(NEW.service_price, 0);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.customers (
    tenant_id, name, phone, total_visits, total_spent,
    first_visit_at, last_visit_at
  )
  VALUES (
    NEW.tenant_id,
    NEW.customer_name,
    NEW.customer_phone,
    CASE WHEN _is_new_visit THEN 1 ELSE 0 END,
    _add_spent,
    _appt_ts,
    _appt_ts
  )
  ON CONFLICT (tenant_id, phone) DO UPDATE
  SET
    name = EXCLUDED.name,
    total_visits = public.customers.total_visits + CASE WHEN _is_new_visit THEN 1 ELSE 0 END,
    total_spent = public.customers.total_spent + _add_spent,
    last_visit_at = GREATEST(public.customers.last_visit_at, EXCLUDED.last_visit_at),
    first_visit_at = LEAST(COALESCE(public.customers.first_visit_at, EXCLUDED.first_visit_at), EXCLUDED.first_visit_at);

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_appointments_upsert_customer
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.upsert_customer_from_appointment();
