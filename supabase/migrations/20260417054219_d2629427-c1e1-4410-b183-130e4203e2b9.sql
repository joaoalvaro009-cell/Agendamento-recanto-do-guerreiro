-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'barber');
CREATE TYPE public.appointment_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');

-- ============ BARBERS ============
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  bio TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_barber_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.barbers WHERE user_id = auth.uid() LIMIT 1
$$;

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_price NUMERIC(10,2) NOT NULL,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  reminder_1h BOOLEAN NOT NULL DEFAULT false,
  reminder_10m BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_appointments_barber_date ON public.appointments(barber_id, appointment_date);
CREATE INDEX idx_appointments_phone ON public.appointments(customer_phone);
CREATE UNIQUE INDEX idx_appointments_unique_slot
  ON public.appointments(barber_id, appointment_date, appointment_time)
  WHERE status = 'confirmed';

-- ============ BLOCKED SLOTS ============
CREATE TABLE public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  blocked_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_barbers_updated BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ APPOINTMENT VALIDATION ============
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  dow INT;
  allowed_times TIME[] := ARRAY[
    '08:00','08:30','09:00','09:30','10:00','10:30',
    '11:00','11:30',
    '14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30',
    '18:00','18:30','19:00'
  ]::TIME[];
BEGIN
  IF NEW.status = 'confirmed' THEN
    dow := EXTRACT(DOW FROM NEW.appointment_date);
    -- 0 = domingo, 1 = segunda
    IF dow = 0 OR dow = 1 THEN
      RAISE EXCEPTION 'A barbearia não funciona nesse dia (segunda e domingo).';
    END IF;

    IF NOT (NEW.appointment_time = ANY(allowed_times)) THEN
      RAISE EXCEPTION 'Horário não disponível.';
    END IF;

    IF NEW.appointment_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Não é possível agendar em datas passadas.';
    END IF;

    IF NEW.appointment_date > (CURRENT_DATE + INTERVAL '2 days') THEN
      RAISE EXCEPTION 'Agendamento permitido apenas com até 2 dias de antecedência.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_appointment
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment();

-- ============ RLS POLICIES ============

-- BARBERS: leitura pública (vitrine), admin gerencia
CREATE POLICY "Anyone can view active barbers"
  ON public.barbers FOR SELECT USING (active = true);
CREATE POLICY "Admins manage barbers"
  ON public.barbers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Barbers can view their own row"
  ON public.barbers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- USER_ROLES: só admin gerencia, usuário vê o próprio
CREATE POLICY "Users see own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- APPOINTMENTS:
-- Insert público (cliente sem login)
CREATE POLICY "Anyone can create appointment"
  ON public.appointments FOR INSERT WITH CHECK (true);
-- Barbeiro vê os seus
CREATE POLICY "Barbers see own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (barber_id = public.current_barber_id() OR public.has_role(auth.uid(), 'admin'));
-- Barbeiro atualiza os seus
CREATE POLICY "Barbers update own appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (barber_id = public.current_barber_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (barber_id = public.current_barber_id() OR public.has_role(auth.uid(), 'admin'));
-- Admin deleta
CREATE POLICY "Admin deletes"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Função pública para consultar/atualizar agendamento por código (cliente sem login)
CREATE OR REPLACE FUNCTION public.get_appointment_by_code(_code UUID)
RETURNS SETOF public.appointments
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.appointments WHERE confirmation_code = _code LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.cancel_appointment_by_code(_code UUID)
RETURNS public.appointments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.appointments;
BEGIN
  UPDATE public.appointments SET status = 'cancelled'
   WHERE confirmation_code = _code AND status = 'confirmed'
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_code(
  _code UUID, _new_date DATE, _new_time TIME
)
RETURNS public.appointments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result public.appointments;
BEGIN
  UPDATE public.appointments
     SET appointment_date = _new_date, appointment_time = _new_time
   WHERE confirmation_code = _code AND status = 'confirmed'
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Função pública: horários ocupados de um barbeiro em uma data
CREATE OR REPLACE FUNCTION public.taken_slots(_barber_id UUID, _date DATE)
RETURNS TABLE (appointment_time TIME)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.appointment_time FROM public.appointments a
   WHERE a.barber_id = _barber_id
     AND a.appointment_date = _date
     AND a.status = 'confirmed'
  UNION
  SELECT b.blocked_time FROM public.blocked_slots b
   WHERE b.barber_id = _barber_id
     AND b.blocked_date = _date
     AND b.blocked_time IS NOT NULL;
$$;

-- BLOCKED SLOTS
CREATE POLICY "Public read blocked slots"
  ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "Barber/admin manage blocked"
  ON public.blocked_slots FOR ALL TO authenticated
  USING (barber_id = public.current_barber_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (barber_id = public.current_barber_id() OR public.has_role(auth.uid(), 'admin'));

-- ============ SEED INICIAL ============
INSERT INTO public.barbers (name, phone, bio, is_admin, display_order) VALUES
  ('Bruno', '7593017859', 'Dono e administrador. Mais de uma década entregando cortes precisos e barbas impecáveis.', true, 1),
  ('Pedrinho', '7591793513', 'Segundo mais experiente da casa. Especialista em estilos modernos e degradês.', false, 2);