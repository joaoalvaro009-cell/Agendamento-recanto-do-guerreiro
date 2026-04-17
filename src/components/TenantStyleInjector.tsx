import { useTenant } from "@/hooks/use-tenant";

/**
 * Reads the tenant's accent color and injects it as a CSS variable override.
 * Defaults are kept in styles.css; this only overrides when a custom value is set.
 */
export function TenantStyleInjector() {
  const tenant = useTenant();

  // We expect oklch() strings in the DB, e.g. "oklch(0.78 0.14 78)".
  // For backward-compat, also accept "h s% l%" (CSS hsl-style) by wrapping in oklch fallback.
  const accent = sanitizeColor(tenant.color_accent);
  const background = sanitizeColor(tenant.color_background);

  if (!accent && !background) return null;

  const css = `:root {
${accent ? `  --gold: ${accent};\n  --primary: ${accent};\n  --accent: ${accent};\n  --ring: ${accent};` : ""}
${background ? `  --background: ${background};` : ""}
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

function sanitizeColor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  // Accept full color expressions: oklch(...), hsl(...), #..., rgb(...)
  if (/^(oklch|hsl|rgb|rgba|hsla)\(/i.test(v) || v.startsWith("#")) return v;
  // Default form stored as raw oklch numbers e.g. "0.78 0.14 78"
  if (/^[\d.]+\s+[\d.]+\s+[\d.]+/.test(v)) return `oklch(${v})`;
  return null;
}
