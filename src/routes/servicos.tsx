import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-context";

export const Route = createFileRoute("/servicos")({
  beforeLoad: () => {
    throw redirect({ to: "/b/$slug/servicos", params: { slug: DEFAULT_TENANT_SLUG } });
  },
});
