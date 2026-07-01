# CLAUDE.md — Loopag

---

## 1. Objetivo do Projeto

Loopag é um sistema completo de gestão de assinaturas IPTV para revendedores e
pequenas operações. Ele permite cadastrar e gerenciar clientes/assinantes,
controlar vencimentos e renovações, acompanhar o faturamento real (dia/mês),
gerenciar funcionários e sistemas (painéis IPTV), e visualizar métricas em um
dashboard com mapa do Brasil. É um SaaS multi-tenant: cada usuário (revendedor)
enxerga apenas os seus próprios dados.

O produto está evoluindo para incluir um **CRM de atendimento via WhatsApp**
(API Oficial da Meta) — ver seção 6.

O Claude deve sempre priorizar funcionalidade completa e código de produção.
Nunca gerar stubs, placeholders ou TODOs sem implementação real.

---

## 2. Regras Inegociáveis

- Nunca expor tokens, secrets ou API keys no frontend ou em logs.
- Todo dado é multi-tenant: **toda** query em tabelas de negócio DEVE filtrar por
  `auth_user_id`. Nunca retornar dados de outro tenant.
- Autenticação primária é o JWT do Supabase (Bearer token), que popula `req.user`
  no middleware antes da lógica de rota. Existe ainda um fallback legado por sessão
  (`req.session.userId`). Preferir sempre o fluxo JWT em código novo.
- `activationDate` do cliente é **imutável** após a criação. Nunca aceitar/gravar
  `activationDate` em updates — o backend deve removê-lo do payload.
- Faturamento é calculado a partir de `payment_history.payment_date`, nunca de
  `clients.activation_date`. Renovação SEMPRE cria um NOVO registro em
  `payment_history` (nunca atualiza um existente), preservando o histórico.
- Nunca ignorar erros silenciosamente. Todo `catch` deve logar e retornar resposta
  de erro clara. Preferir falha explícita a fallback silencioso.
- Validar o corpo dos requests de CRUD com os schemas Zod de `@shared/schema`
  (drizzle-zod) antes de chamar a camada de storage. Endpoints de auth
  (login/registro) e utilitários usam validação manual — em código novo, prefira
  sempre os schemas Zod.
- Fuso horário do negócio: `America/Sao_Paulo` (Brasília). Datas de pagamento e
  vencimento seguem esse fuso — usar os helpers de `server/utils/timezone.ts` no
  backend e `client/src/lib/timezone.ts` no frontend (alguns handlers antigos em
  `server/routes.ts` ainda têm cálculo de data inline).
- Idioma da interface: português brasileiro. Idioma do código: inglês.

---

## 3. Contexto de Negócio e Público-Alvo

- Clientes: revendedores e operações de assinatura IPTV no Brasil.
- Cada tenant gerencia: seus assinantes (clients), funcionários (employees),
  sistemas/painéis (systems), planos de cliente (client_plans) e histórico de
  pagamentos (payment_history).
- Monetização do próprio SaaS: assinatura via **Stripe** (planos globais em `plans`,
  status em `users.subscription_status`).
- Autenticação: **Supabase Auth** (e-mail/senha, JWT). Metadados do usuário ficam na
  tabela `users`, ligados pelo `auth_user_id` (UUID).
- Canal futuro: **CRM WhatsApp** via API Oficial da Meta (Cloud API). Ver seção 6.
- Deploy: Replit (dev/preview e Deployments). Há também `railway.json` e
  `nixpacks.toml` para deploy alternativo self-hosted.

---

## 4. Stack e Decisões Arquiteturais

### Tecnologias

```
Frontend:  React 18 + TypeScript + Vite
Styling:   Tailwind CSS + shadcn/ui (Radix UI) + CSS Variables (tema claro/escuro)
Routing:   Wouter (client-side)
State:     TanStack Query (React Query v5) para estado do servidor
Forms:     React Hook Form + Zod (@hookform/resolvers)
Charts:    Recharts
Maps:      react-simple-maps + d3-scale (mapa do Brasil)
Anim:      framer-motion
Icons:     lucide-react (ícones), react-icons/si (logos de marcas)
Backend:   Node.js + Express (TypeScript, executado com tsx em dev)
Database:  PostgreSQL (Supabase / Neon serverless)
ORM:       Drizzle ORM + drizzle-zod
Auth:      Supabase Auth (JWT verificado no servidor)
Payments:  Stripe (assinatura do SaaS)
```

### Decisões fixas

- Frontend e backend rodam na MESMA porta via Vite/Express (config já pronta em
  `server/vite.ts` e `vite.config.ts`). **Não** modificar essa configuração nem
  adicionar proxy.
- Roteamento no frontend com **Wouter** (não React Router). Páginas em
  `client/src/pages`, registradas em `client/src/App.tsx`.
- Dados do servidor sempre via **TanStack Query**; mutações via `apiRequest` de
  `@/lib/queryClient`, invalidando o cache pela `queryKey` após cada mutação.
- Formulários sempre com `useForm` + `Form` do shadcn e `zodResolver`, usando o
  insert schema apropriado de `@shared/schema`.
- ORM único: **Drizzle**. Tipos e schemas de validação vêm de `shared/schema.ts`
  (fonte única da verdade compartilhada entre front e back).
- Camada de acesso a dados centralizada em `server/storage.ts` (interface
  `IStorage`). Rotas (`server/routes.ts`) ficam finas e delegam ao storage.
- Multi-tenant por `auth_user_id` em todas as tabelas de negócio.
- Papéis de usuário: `admin`, `operator`, `viewer` (campo `users.role`).
- **Não** editar `package.json`, `vite.config.ts`, `server/vite.ts` nem
  `drizzle.config.ts` sem necessidade. Instalar pacotes pelo gerenciador, não
  editando o `package.json` na mão.

### Design System

Tema duplo (claro/escuro) com efeito glassmorphism. Cores definidas como CSS
Variables em `client/src/index.css` (`:root` e `.dark`), no formato HSL do shadcn.

```
Acentos:  azul neon (#6366f1) e roxo (#8b5cf6)
Tema:     claro e escuro (persistido em localStorage via theme provider)
UI:       componentes shadcn/ui + Tailwind; ícones lucide-react
Charts:   Recharts
```

Ao criar estilos, sempre usar as variantes `dark:` explícitas do Tailwind ou as CSS
Variables existentes — não hardcodar cores fora do design system.

---

## 5. Comandos e Informações de Suporte

### Comandos do projeto

```bash
npm install
npm run dev       # Express + Vite na mesma porta (dev, via tsx)
npm run build     # vite build + esbuild do server
npm run start     # produção (node dist/index.js)
npm run check     # typecheck (tsc)
npm run db:push   # aplica o schema Drizzle no banco (drizzle-kit push)
```

### Variáveis de ambiente obrigatórias

```env
DATABASE_URL=            # string de conexão PostgreSQL (Supabase/Neon)
SUPABASE_URL=            # URL do projeto Supabase
SUPABASE_ANON_KEY=       # chave anônima do Supabase (auth no frontend)
SUPABASE_SERVICE_ROLE_KEY=  # chave service role (operações de servidor)
NODE_ENV=                # development | production
PORT=                    # porta do servidor

# Stripe (assinatura do SaaS)
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLIC_KEY=  # exposta no frontend (prefixo VITE_)

# Integração N8N (criação de clientes via automação)
N8N_API_KEY=             # autentica requests em POST /api/n8n/clients (header X-API-Key)
N8N_AUTH_USER_ID=        # define o tenant dos clientes criados via n8n

# CRM WhatsApp (a implantar — ver seção 6)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
```

Variáveis de frontend DEVEM ter o prefixo `VITE_` e são lidas via
`import.meta.env.VITE_*` (nunca `process.env` no frontend).

### Convenções de branch e commit

- `main` — produção. Features em `feat/nome`, correções em `fix/descricao`.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`).

### Armadilhas conhecidas

- **Não** editar a config de Vite/Express (mesma porta já configurada). Adicionar
  proxy quebra o preview.
- `activationDate` é imutável: o PUT `/api/clients/:id` remove `activationDate` do
  payload de propósito. O formulário de edição também não deve enviá-lo.
- Renovação: quando `expiryDate` muda, o sistema INSERE um novo `payment_history`
  com `type='renewal'`, guardando `previous_expiry_date` e `new_expiry_date`. Nunca
  atualizar registros de pagamento existentes.
- Faturamento vem de `payment_history`, não de `clients`. Não confundir data de
  ativação com data de pagamento.
- Números sequenciais (`client_number`, `employee_number`, `system_number`) são
  gerados por tenant via `MAX(...) + 1`. Criação externa (ex.: n8n) DEVE usar o
  endpoint `POST /api/n8n/clients` para não duplicar numeração.
- `<SelectItem>` do shadcn precisa de `value` não-vazio.
- Não importar React explicitamente (o JSX transform do Vite já cuida disso).
- Scripts de migração/normalização em `scripts/` rodam no boot do servidor
  (`server/index.ts`) e são idempotentes.
- O WhatsApp/Baileys legado, os Templates e a página de Cobranças/Automações foram
  REMOVIDOS (julho/2026). As tabelas antigas (`whatsapp_instances`,
  `message_templates`, `billing_history`, `automation_configs`) foram deixadas no
  banco de propósito, mas não são mais referenciadas. O CRM novo (seção 6) é uma
  reconstrução do zero com a API Oficial da Meta.

### Estrutura de pastas

```
/client/src
  /pages        (dashboard, clients, client-plans, plans, sales, success,
                 systems, employees, users, rankings, landing, not-found)
  /components
    /ui         (shadcn: Button, Input, Select, Dialog, Form, etc.)
    /auth
    /clients    (client-form, addon-dialog, ...)
    /dashboard
    /layout     (sidebar, ...)
  /hooks        (use-toast, use-theme, use-auth, ...)
  /lib          (api, queryClient, timezone, ...)

/server
  index.ts      (bootstrap; roda scripts de migração idempotentes no boot)
  routes.ts     (rotas Express, finas — delegam ao storage)
  storage.ts    (IStorage — acesso a dados, tenant-scoped)
  scheduler.ts  (agenda: marca clientes vencidos como 'Inativa')
  vite.ts       (NÃO editar)
  /utils

/shared
  schema.ts     (tabelas Drizzle + insert schemas + tipos — fonte única)
  ddd-map.ts    (mapeamento de DDD -> estado, para o mapa do Brasil)

/scripts        (seed + migrações idempotentes)
/migrations     (SQL de migração)
```

### Modelo de dados (Drizzle — schema real em `shared/schema.ts`)

Multi-tenant: `plans` é global (compartilhado); as demais tabelas de negócio são
escopadas por `auth_user_id` (FK para `users.auth_user_id`).

```
plans (global)
  id, name (unique), price, billing_period(monthly|semiannual|yearly|lifetime),
  stripe_price_id, features(jsonb string[]), is_popular, is_active, created_at

users
  id, auth_user_id (uuid unique), owner_auth_user_id (uuid), name, username (unique),
  password, email, phone, plan_id -> plans.id,
  stripe_customer_id, stripe_subscription_id,
  subscription_status(active|inactive|trialing|past_due|canceled),
  subscription_expires_at, role(admin|operator|viewer), is_active, created_at

employees  (tenant)
  id, auth_user_id, employee_number, name, phone, email (unique), birth_date,
  address, position, salary, hire_date, photo, is_active,
  access_auth_user_id, access_email, created_at

systems  (tenant)
  id, auth_user_id, system_number, name, description, is_active, created_at

clients  (tenant)
  id, auth_user_id, client_number, name, phone, username, password, system,
  subscription_status(Ativa|Inativa|Aguardando|Teste), payment_method,
  activation_date (IMUTÁVEL), expiry_date,
  payment_status(Pago|Vencido|A Pagar), plan, value,
  referral_source, referred_by_id, notes, created_at, updated_at

payment_history  (tenant)
  id, auth_user_id, client_id -> clients.id, amount, payment_date,
  type(new_client|renewal|addon), previous_expiry_date, new_expiry_date,
  description, created_at

client_plans  (tenant)
  id, auth_user_id, name, value, duration_type(months|days),
  duration_quantity, description, created_at
```

Observação: o tenant efetivo (`req.effectiveAuthUserId`) é o `auth_user_id` do
próprio dono ou, no caso de funcionários com login, o `owner_auth_user_id` do
gestor. Sempre usar o tenant efetivo nas queries de negócio.

---

## 6. CRM de WhatsApp (a implantar)

Módulo novo, reconstruído do zero com a **API Oficial da Meta (WhatsApp Cloud
API)** — substitui o antigo WhatsApp/Baileys removido. Objetivo: gerenciar
conversas com leads/clientes direto no painel.

### Escopo inicial

- Nova página `/crm` no sidebar (ícone de chat), layout de inbox de 2 colunas:
  lista de conversas à esquerda, histórico + campo de resposta à direita.
- Mensagens recebidas aparecem por polling (~5s). Envio de mensagens de texto.
- Multi-tenant por `auth_user_id`, como o resto do app.

### Tabelas novas (Drizzle, em `shared/schema.ts`)

```
crm_contacts
  id, auth_user_id, phone, name, last_message_at, created_at

crm_messages
  id, auth_user_id, contact_id -> crm_contacts.id,
  direction(inbound|outbound), content, status, wa_message_id, created_at
```

### Endpoints (backend)

```
GET  /api/whatsapp/webhook                       # verificação (hub.challenge) da Meta
POST /api/whatsapp/webhook                        # recebe mensagens/eventos da Meta
GET  /api/crm/conversations                       # lista conversas do tenant
GET  /api/crm/conversations/:phone/messages       # histórico de uma conversa
POST /api/crm/send                                # envia texto via Cloud API
```

### Regras específicas do CRM

- Validar o `WHATSAPP_VERIFY_TOKEN` no GET do webhook (challenge da Meta).
- Responder o webhook rápido (HTTP 200) e processar o restante de forma leve;
  fazer upsert do contato e insert da mensagem ao receber.
- Diferenciar `messages` (mensagens novas) de `statuses` (delivered/read) no payload
  do webhook.
- Guardar o `id` da mensagem enviada (`messages[0].id`) em `wa_message_id` para
  rastrear status.
- Enviar via Cloud API usando `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`.
- Escopo inicial: apenas texto (mídia, chatbot e múltiplos números ficam para depois).

### Arquivos de referência para implementar

- `shared/schema.ts` (tabelas + schemas + tipos)
- `server/routes.ts`, `server/storage.ts`
- `client/src/pages/` (nova `crm.tsx`), `client/src/App.tsx`,
  `client/src/components/layout/sidebar.tsx`
