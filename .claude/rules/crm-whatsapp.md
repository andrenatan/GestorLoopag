---
paths:
  - "**/client/src/pages/crm*.tsx"
  - "**/server/automation-engine.ts"
  - "**/server/utils/whatsapp.ts"
  - "**/server/scheduler.ts"
  - "**/server/routes.ts"
  - "**/server/storage.ts"
---

# CRM WhatsApp (API Oficial da Meta — implantado)

Páginas: `/crm` (inbox 2 colunas, polling 5s), `/crm/connection`,
`/crm/templates`, `/crm/templates/new`, `/crm/automations`.

## Endpoints

```
GET/POST /api/whatsapp/webhook              verificação (hub.challenge) / eventos
GET      /api/whatsapp/connection           status (sem token)
POST     /api/whatsapp/connect/embedded-signup
POST     /api/whatsapp/connect/manual       phoneNumberId, accessToken, verifyToken
DELETE   /api/whatsapp/connection
GET      /api/crm/conversations
GET      /api/crm/conversations/:phone/messages
POST     /api/crm/send                      texto livre (janela de 24h)
GET/POST /api/crm/templates   DELETE /api/crm/templates/:id
POST     /api/crm/templates/:id/sync        atualiza status na Meta
GET/POST /api/crm/automations   PUT/DELETE /api/crm/automations/:id
POST     /api/crm/automations/:id/run-now   disparo manual
GET      /api/crm/automations/:id/runs      log de execuções
```

## Regras

- Contatos: `crm_contacts` é sincronizado no próprio `server/storage.ts` ao
  criar/editar cliente (nome, telefone, sistema, username, status) — não é job
  separado e não é editável pelo usuário. Nome:
  `"#{client_number} - {name} ({system}) - {username}"`. Telefone mudou →
  atualiza `crm_contacts.phone`; histórico fica ligado ao `contact_id`.
- Conexão: uma linha por tenant em `whatsapp_connections` (Embedded Signup ou
  manual). Envio usa `phone_number_id` + `access_token` do tenant, nunca env
  global. `access_token` nunca volta ao frontend — só status e número mascarado.
- Webhook: o GET aceita o verify_token de qualquer conexão salva; o POST
  responde 200 rápido, diferencia `messages` de `statuses`, faz upsert do
  contato e insert da mensagem.
- Guardar `messages[0].id` em `wa_message_id` (em `crm_messages` e em
  `crm_automation_runs`).
- Automações enviam **templates aprovados da Meta** (`crm_templates`), não texto
  livre. Variáveis posicionais vêm de `template_variable_mapping`, resolvidas em
  `automation-engine.ts` pelos campos: `name`, `system`, `username`, `value`,
  `expiry_date` (dd/mm/aaaa). `target_filter` filtra por `systems` e `statuses`.
  `manual` nunca é varrido pelo scheduler (só `run-now`).
- Escopo atual: só texto/templates; mídia e múltiplos números por tenant ficam
  para depois.
