import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  instagram_handle: string;
  instagram_url: string;
  logo_url: string | null;
};

const defaults: SiteSettings = {
  instagram_handle: "@recantodoguerreiro",
  instagram_url: "https://instagram.com/recantodoguerreiro",
  logo_url: null,
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaults);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("instagram_handle, instagram_url, logo_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            instagram_handle: data.instagram_handle,
            instagram_url: data.instagram_url,
            logo_url: data.logo_url ?? null,
          });
        }
      });
  }, []);

  return settings;
}
