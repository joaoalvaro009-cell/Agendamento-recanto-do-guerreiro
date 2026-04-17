ALTER TABLE public.site_settings
  ALTER COLUMN color_primary SET DEFAULT 'oklch(0.78 0.14 78)',
  ALTER COLUMN color_accent SET DEFAULT 'oklch(0.78 0.14 78)',
  ALTER COLUMN color_background SET DEFAULT 'oklch(0.14 0.012 60)';

UPDATE public.site_settings
   SET color_primary = 'oklch(0.78 0.14 78)',
       color_accent = 'oklch(0.78 0.14 78)',
       color_background = 'oklch(0.14 0.012 60)'
 WHERE color_primary = '0 0% 8%' OR color_primary IS NULL;