import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-context";

export const Route = createFileRoute("/equipe")({
  beforeLoad: () => {
    throw redirect({ to: "/b/$slug/equipe", params: { slug: DEFAULT_TENANT_SLUG } });
  },
});
