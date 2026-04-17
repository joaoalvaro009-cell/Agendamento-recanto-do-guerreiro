-- Recriar policy de INSERT com roles explícitos para garantir que funcione tanto para anon quanto authenticated
DROP POLICY IF EXISTS "Anyone can create appointment" ON public.appointments;

CREATE POLICY "Anyone can create appointment"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);