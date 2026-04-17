import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-context";

export const Route = createFileRoute("/meu-agendamento")({
  beforeLoad: () => {
    throw redirect({ to: "/b/$slug/meu-agendamento", params: { slug: DEFAULT_TENANT_SLUG } });
  },
});
