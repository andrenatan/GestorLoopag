# CLAUDE.md — Loopag

> Regras detalhadas por área ficam em `.claude/rules/` e são carregadas sob
> demanda (frontmatter `paths:`) quando arquivos daquela área são lidos/editados.

## Objetivo

Loopag é um SaaS multi-tenant de gestão de assinaturas IPTV para revendedores
no Brasil: clientes/assinantes, vencimentos e renovações, faturamento real,
renovações manuais mês a mês, créditos de painel por sistema, catálogo de
aplicativos, financeiro (entradas/saídas, relatórios), funcionários com
permissões granulares, dashboard com mapa do Brasil e CRM de WhatsApp (API
Oficial da Meta) com templates e automações. Cada revendedor (tenant) enxerga
apenas os próprios dados.

Sempre entregar funcionalidade completa e código de produção — nunca stubs,
placeholders ou TODOs sem implementação.

## Regras inegociáveis (valem para todo o código)

- Nunca expor tokens, secrets ou API keys no frontend ou em logs.
- Multi-tenant: **toda** query em tabela de negócio filtra pelo tenant efetivo
  (`auth_user_id`). Nunca retornar dados de outro tenant.
- Nunca engolir erros: todo `catch` loga e retorna erro claro. Falha explícita >
  fallback silencioso.
- Fuso do negócio: `America/Sao_Paulo`. Usar os helpers de timezone
  (`server/utils/timezone.ts` / `client/src/lib/timezone.ts`): "hoje" =
  `getBrasiliaDateString()`; data calculada a partir de `parseDateString` =
  `formatLocalDateString()`. Nunca `toISOString().split('T')[0]` (é UTC e vira
  o dia seguinte após as 21h).
- Interface em português brasileiro; código em inglês.
- **Não** editar `package.json` à mão (usar o gerenciador), nem `vite.config.ts`,
  `server/vite.ts`, `drizzle.config.ts`. Front e back rodam na mesma porta — não
  adicionar proxy.

## Stack

React 18 + TS + Vite · Tailwind + shadcn/ui · Wouter · TanStack Query v5 ·
React Hook Form + Zod · Recharts · react-simple-maps · Express (tsx) ·
PostgreSQL (Supabase) · Drizzle ORM + drizzle-zod · Supabase Auth (JWT) ·
Stripe (assinatura do SaaS) · WhatsApp Cloud API (Graph v21.0).

## Comandos

```bash
npm run dev       # Express + Vite na mesma porta (cross-env + tsx)
npm run build     # vite build + esbuild do server
npm run start     # produção (node dist/index.js)
npm run check     # typecheck (tsc)
npm run db:push   # aplica o schema Drizzle no banco
```

## Estrutura

```
client/src/pages      dashboard, clients, client-plans, systems, apps,
                      manual-renewals, financial-overview, financial-reports,
                      rankings, employees, users, plans, sales, success,
                      crm, crm-connection, crm-templates, crm-template-new,
                      crm-automations, landing, not-found
client/src/components ui (shadcn), auth, clients, dashboard, layout (sidebar)
client/src/hooks      use-auth (permissões), use-theme, use-toast, use-mobile
client/src/lib        api, queryClient, supabase, timezone, utils
server/index.ts       bootstrap + migrações idempotentes no boot
server/routes.ts      rotas Express + middlewares de auth/permissão
server/storage.ts     IStorage — acesso a dados tenant-scoped
server/scheduler.ts   jobs 00:00/09:30/10:00/19:30 (GMT-3)
server/automation-engine.ts  motor de automações do CRM
server/utils          timezone, whatsapp (cliente da Graph API)
shared/schema.ts      tabelas Drizzle + insert schemas + tipos (fonte única)
shared/ddd-map.ts     DDD -> estado (mapa do Brasil)
scripts/              seed + migrações idempotentes
migrations/           SQL gerado pelo drizzle-kit
.claude/skills/loopag-design  design system visual (skill)
```

## Git

- `main` = produção. Features em `feat/nome`, correções em `fix/descricao`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `style:`).
