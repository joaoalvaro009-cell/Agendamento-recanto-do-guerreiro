ALTER TABLE public.appointments
  ADD CONSTRAINT chk_customer_name_len CHECK (char_length(customer_name) BETWEEN 2 AND 80),
  ADD CONSTRAINT chk_customer_phone_fmt CHECK (customer_phone ~ '^[0-9]{10,13}$'),
  ADD CONSTRAINT chk_service_name_len CHECK (char_length(service_name) BETWEEN 2 AND 60),
  ADD CONSTRAINT chk_notes_len CHECK (notes IS NULL OR char_length(notes) <= 500),
  ADD CONSTRAINT chk_price_positive CHECK (service_price > 0 AND service_price < 1000);