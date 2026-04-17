-- 1. Backfill: para cada team_member sem barbeiro correspondente, criar barbeiro
INSERT INTO public.barbers (name, phone, bio, avatar_url, active, display_order, is_admin)
SELECT t.name,
       '00000000000', -- placeholder; admin deve atualizar
       COALESCE(t.bio, ''),
       t.image_url,
       t.active,
       t.display_order,
       false
FROM public.team_members t
LEFT JOIN public.barbers b ON b.name = t.name
WHERE b.id IS NULL;

-- 2. Trigger: ao inserir em team_members, garantir barbers correspondente
CREATE OR REPLACE FUNCTION public.sync_team_to_barber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.barbers WHERE name = NEW.name) THEN
    INSERT INTO public.barbers (name, phone, bio, avatar_url, active, display_order, is_admin)
    VALUES (NEW.name, '00000000000', COALESCE(NEW.bio, ''), NEW.image_url, NEW.active, NEW.display_order, false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_sync_barber ON public.team_members;
CREATE TRIGGER team_members_sync_barber
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_to_barber();