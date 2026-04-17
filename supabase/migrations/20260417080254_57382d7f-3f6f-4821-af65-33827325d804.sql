ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS logo_size TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE public.site_settings
DROP CONSTRAINT IF EXISTS site_settings_logo_size_check;

ALTER TABLE public.site_settings
ADD CONSTRAINT site_settings_logo_size_check
CHECK (logo_size IN ('small', 'medium', 'large'));