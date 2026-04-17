-- Fix WARN 2: bucket public mas sem listing geral.
-- O Storage permite leitura pública por arquivo via signed/public URL mesmo sem policy de SELECT
-- quando bucket.public = true. Removendo a policy SELECT global do bucket evita listagem.
DROP POLICY IF EXISTS "Public read site-images" ON storage.objects;

-- Fix WARN 1: tornar a policy de INSERT em appointments mais explícita (continua permitindo
-- agendamento anônimo intencional, mas com check baseado em formato mínimo).
DROP POLICY IF EXISTS "Anyone can create appointment" ON public.appointments;
CREATE POLICY "Public can create appointment"
  ON public.appointments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(customer_name) BETWEEN 2 AND 120
    AND length(customer_phone) BETWEEN 10 AND 20
    AND length(service_name) BETWEEN 1 AND 80
    AND service_price >= 0
    AND status = 'confirmed'
  );