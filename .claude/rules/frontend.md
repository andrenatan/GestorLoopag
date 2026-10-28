---
paths:
  - "**/client/**"
---

# Frontend (React + Vite)

- Roteamento com **Wouter** (não React Router). Páginas em `client/src/pages`,
  registradas em `client/src/App.tsx`; item de menu em
  `client/src/components/layout/sidebar.tsx`.
- Página/módulo novo exige chave em `PERMISSION_KEYS` (sidebar) e no
  `PermissionKey` do server — manter sincronizados. No client, checar acesso com
  `hasPermission(key)` de `use-auth` (o dono sempre passa).
- Dados do servidor sempre via **TanStack Query**; mutações via `apiRequest` de
  `@/lib/queryClient`, invalidando a `queryKey` após cada mutação. `fetch`
  manual precisa enviar o header de auth (Bearer do Supabase) — senão a rota
  devolve vazio/401.
- Formulários com `useForm` + `Form` do shadcn + `zodResolver`, usando o insert
  schema de `@shared/schema`.
- Env do frontend: prefixo `VITE_`, lidas via `import.meta.env.VITE_*` (nunca
  `process.env`). Hoje: `VITE_WHATSAPP_APP_ID`, `VITE_WHATSAPP_CONFIG_ID`.
- `<SelectItem>` do shadcn exige `value` não-vazio.
- Não importar React explicitamente (JSX transform do Vite).

## Design

- Para qualquer tela/estilo, seguir a skill `frontend-design`
  (`.claude/skills/frontend-design/SKILL.md`). Fonte da verdade das cores: CSS Variables em
  `client/src/index.css` (`:root` e `.dark`, HSL do shadcn).
- Tema claro/escuro via theme provider. Nunca hardcodar cores fora do design
  system — usar as variáveis ou variantes `dark:` do Tailwind.
- Ícones: lucide-react; logos de marcas: react-icons/si.
