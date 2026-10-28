---
paths:
  - "**/server/**"
  - "**/shared/**"
  - "**/scripts/**"
  - "**/db/**"
  - "**/.env*"
---

# Backend (Express + Drizzle)

## Autenticação e tenant

- Auth primária: JWT do Supabase (Bearer) → middleware popula `req.user` antes
  da rota. Há fallback legado por sessão (`req.session.userId`); código novo usa
  sempre o fluxo JWT.
- Tenant efetivo (`req.effectiveAuthUserId`): o `auth_user_id` do dono ou, para
  funcionário com login, o `owner_auth_user_id` do gestor. Usar SEMPRE o tenant
  efetivo nas queries de negócio.

## Permissões granulares

- Dono = `users.owner_auth_user_id IS NULL` → acesso total.
- Funcionário com login: só passa se a chave estiver em `employees.permissions`
  (carregado em `req.employeePermissions`).
- Proteger rotas com `requirePermission(key)` ou `requireAnyPermission(...keys)`
  (`server/routes.ts`). O tipo `PermissionKey` espelha 1:1 o `PERMISSION_KEYS`
  de `client/src/components/layout/sidebar.tsx` — **manter os dois em sincronia**
  ao criar módulo/página nova.
- `users.role` (admin/operator/viewer) é legado; o controle de acesso real é o
  sistema de permissões acima.

## Camadas e validação

- `server/storage.ts` (interface `IStorage`) concentra o acesso a dados; rotas
  ficam finas e delegam ao storage.
- Validar body de CRUD com os insert schemas Zod de `@shared/schema` antes do
  storage. Auth (login/registro) e utilitários usam validação manual — código
  novo usa Zod.
- Campos server-managed (ex.: `clients.app`, `activationDate` em update) são
  omitidos dos insert schemas e nunca aceitos do payload.

## Numeração sequencial

- `client_number`, `employee_number`, `system_number` são gerados por tenant via
  `MAX(...) + 1`. Criação externa (n8n) DEVE usar `POST /api/n8n/clients`
  (header `X-API-Key`, tenant em `N8N_AUTH_USER_ID`) para não duplicar numeração.
  Esse endpoint não define app principal (`clients.app` fica NULL).

## Boot, scheduler e migrações

- `server/index.ts` roda scripts idempotentes de `scripts/` no boot
  (unificação de sistemas, normalização de sistemas dos clientes).
- `server/scheduler.ts` roda em 00:00, 09:30, 10:00 e 19:30 (GMT-3): marca
  clientes vencidos como `Inativa` e processa as automações do CRM.
- Mudou `shared/schema.ts`? Rodar `npm run db:push`.
- Uploads usam `REPLIT_OBJECT_STORAGE_BUCKET` (dependência do Replit).

## Variáveis de ambiente (server)

```env
DATABASE_URL / SUPABASE_DATABASE_URL   # conexão PostgreSQL
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
NODE_ENV, PORT, SESSION_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
N8N_API_KEY, N8N_AUTH_USER_ID
WHATSAPP_APP_ID, WHATSAPP_APP_SECRET    # app Meta (Embedded Signup)
WHATSAPP_VERIFY_TOKEN                   # verify token padrão do Embedded Signup
REPLIT_OBJECT_STORAGE_BUCKET
```

- Legado removido (jul/2026): WhatsApp/Baileys, templates antigos, cobranças.
  Tabelas `whatsapp_instances`, `message_templates`, `billing_history`,
  `automation_configs` continuam no banco mas não são referenciadas — não usar.
