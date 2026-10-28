---
paths:
  - "**/shared/schema.ts"
  - "**/server/storage.ts"
  - "**/migrations/**"
  - "**/scripts/**"
  - "**/db/**"
---

# Modelo de dados (resumo — schema real em `shared/schema.ts`)

`plans` é global; todas as demais tabelas de negócio têm `auth_user_id`
(FK `users.auth_user_id`) e são tenant-scoped.

```
plans (global)       name unique, price, billing_period, stripe_price_id,
                     features jsonb, is_popular, is_active
users                auth_user_id uuid unique, owner_auth_user_id (null = dono),
                     username unique, plan_id, stripe_*, subscription_status,
                     role (legado), is_active
employees            employee_number, dados pessoais, position, salary,
                     access_auth_user_id, access_email, permissions jsonb string[]
systems              system_number, name, description, is_active
clients              client_number, name, phone, username, password, system,
                     subscription_status(Ativa|Inativa|Aguardando|Teste),
                     payment_method, activation_date (IMUTÁVEL), expiry_date,
                     payment_status(Pago|Vencido|A Pagar), plan, app (espelho),
                     value, renewal_mode(automatic|manual), referral_source,
                     referred_by_id, notes
payment_history      client_id, amount, payment_date,
                     type(new_client|renewal|addon), previous/new_expiry_date
client_plans         name, value, duration_type(months|days), duration_quantity
system_credit_rules  system_id + client_plan_id (unique por tenant), credits_consumed
manual_renewal_plans client_id, system_id, client_plan_id,
                     plan_period(trimestral|semestral|anual), activation_date,
                     renew_day, final_date, total_installments, status(active|closed)
manual_renewal_installments  plan_id + month_number unique, due_date, completed
credit_consumption_history   system_id, client_plan_id, credits,
                     manual_renewal_installment_id XOR source_payment_history_id
manual_financial_entries     type(entrada|saida), description, value, date
apps                 name, activation_value, description, is_active
client_apps          client_id, app_id, is_primary, expiry_date
crm_contacts         client_id (unique por tenant), phone, display_name, last_message_at
crm_messages         contact_id, direction(inbound|outbound), content, status, wa_message_id
whatsapp_connections auth_user_id unique, connection_type(embedded_signup|manual),
                     waba_id, phone_number_id, access_token, display_phone_number,
                     verify_token, status(connected|disconnected|error), connected_at
crm_templates        meta_template_id, name (unique por tenant),
                     category(utility|marketing|authentication), language,
                     status(pending|approved|rejected|disabled), header/body/footer,
                     variables_count, buttons jsonb, rejection_reason
crm_automations      name, trigger_type(before_expiry|after_expiry|client_created|manual),
                     trigger_days, template_id, template_variable_mapping jsonb string[],
                     target_filter jsonb {systems?, statuses?}, is_active
crm_automation_runs  automation_id, contact_id, status(sent|failed|skipped),
                     wa_message_id, error_message, executed_at
```
