// Shim que re-exporta de use-tenant.tsx.
// Existe porque o Vite SSR runner cacheou o id resolvido com extensão .ts em
// algum reload anterior. Re-exportar daqui mantém todos os imports
// `@/hooks/use-tenant` funcionando independente da resolução.
export * from "./use-tenant.tsx";
