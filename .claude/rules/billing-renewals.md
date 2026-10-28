---
paths:
  - "**/server/routes.ts"
  - "**/server/storage.ts"
  - "**/server/scheduler.ts"
  - "**/shared/schema.ts"
  - "**/client/src/pages/clients.tsx"
  - "**/client/src/pages/manual-renewals.tsx"
  - "**/client/src/pages/financial-*.tsx"
  - "**/client/src/pages/dashboard.tsx"
  - "**/client/src/pages/systems.tsx"
  - "**/client/src/components/clients/**"
  - "**/client/src/components/dashboard/**"
---

# Faturamento, renovações e créditos

- `clients.activation_date` é **imutável** após a criação. O PUT
  `/api/clients/:id` remove `activationDate` do payload de propósito; o
  formulário de edição também não deve enviá-lo.
- Faturamento vem de `payment_history.payment_date`, nunca de
  `clients.activation_date`.
- Renovação: quando `expiryDate` muda, INSERIR um novo `payment_history`
  (`type='renewal'`, com `previous_expiry_date`/`new_expiry_date`). Nunca
  atualizar pagamentos existentes. Add-ons usam `type='addon'`.
- `clients.renewal_mode`:
  - `automatic` → cada `payment_history` (new_client/renewal) gera junto um
    `credit_consumption_history` com `source_payment_history_id`.
  - `manual` → plano em `manual_renewal_plans` (trimestral/semestral/anual) com
    uma linha por mês em `manual_renewal_installments`; marcar uma parcela gera
    o consumo com `manual_renewal_installment_id`. Voltar para `automatic`
    encerra o plano (`status='closed'`) sem apagar histórico.
- Créditos consumidos por renovação vêm de `system_credit_rules`
  (sistema + plano de cliente). Consumo de créditos é ledger interno, separado
  de receita.
- Lançamentos financeiros avulsos (entradas/saídas) ficam em
  `manual_financial_entries`.
- Apps do cliente ficam em `clients.apps` (jsonb, principal primeiro, com
  vencimento por app), escrito só por `storage.setClientApps`, que valida os
  appIds no catálogo do tenant. O `name` é desnormalizado para o n8n ler direto
  do Supabase; `updateApp`/`deleteApp` mantêm ele em sincronia.
