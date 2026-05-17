# Client / Advertiser Binding — Design Spec
**Date:** 2026-05-17  
**Status:** Approved

## Overview

Replace the free-text `clientName` field in the Proposal Builder with a structured client entity backed by Supabase. Clients (advertisers) have their own accounts; Sales users bind to clients before creating proposals on their behalf.

---

## 1. Data Model

### `clients` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Company name |
| `contact_email` | text | |
| `status` | enum | `pending_confirmation` \| `active` \| `suspended` |
| `created_by` | uuid FK → auth.users | Sales user who created, or null for self-registered |
| `owner_user_id` | uuid FK → auth.users | nullable; filled after client confirms account |
| `created_at` | timestamptz | |

### `sales_client_bindings` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `sales_user_id` | uuid FK → auth.users | |
| `client_id` | uuid FK → clients | |
| `status` | enum | `pending` \| `active` \| `rejected` |
| `confirm_token` | uuid | One-time token for confirmation link |
| `token_expires_at` | timestamptz | 7 days from creation |
| `invited_at` | timestamptz | |
| `confirmed_at` | timestamptz | nullable |

### `proposals` table change
- Add `client_id uuid FK → clients` column
- Deprecate free-text `client_name` string (keep for display fallback during migration)

**Core constraint:** A proposal can only be created when `sales_client_bindings.status = 'active'` exists between the sales user and the target client.

---

## 2. UI Flows

### Flow A: Sales creates client on behalf of customer
1. Sales opens **客戶管理** → clicks **新增客戶**
2. Fills company name + contact email → submits
3. System writes `clients` row (`status: pending_confirmation`) + `sales_client_bindings` row (`status: pending`) with a `confirm_token`
4. **MVP: No email sent.** A copyable confirmation link `/confirm-client?token=xxx` is displayed in the UI for the Sales user to share manually (e.g. via Line/email)
5. Client clicks the link → `/confirm-client` page → client confirms → `clients.status = active`, `binding.status = active`

### Flow B: Client self-registers → Sales requests binding
1. Client registers via Supabase Auth independently → `clients` row created (`status: active`, `owner_user_id` set)
2. Sales searches by email in **客戶管理** → clicks **申請綁定**
3. System writes `sales_client_bindings` row (`status: pending`) with `confirm_token`
4. **MVP:** Copyable confirmation link displayed to Sales user to forward to client
5. Client confirms at `/confirm-client?token=xxx` → `binding.status = active`

### Flow C: Creating a Proposal
- `clientName` free-text field replaced by `<ClientSelect>` dropdown
- Dropdown only shows clients where an `active` binding exists for the current sales user
- If list is empty: inline prompt "先到客戶管理頁綁定客戶"

---

## 3. Pages & Components

### New pages
```
src/app/clients/page.tsx            — Sales: client list with status badges
src/app/clients/new/page.tsx        — Sales: create client form
src/app/confirm-client/page.tsx     — Public (no auth): token confirmation page
```

### New components
```
src/components/clients/
  ClientList.tsx       — Table with name, email, binding status, proposal count, actions
  ClientForm.tsx       — Create client form (name + email)
  BindingRequest.tsx   — Search existing client by email + send binding request
  ClientSelect.tsx     — Dropdown for Proposal Builder; filters to active bindings only
```

### Modified files
```
src/components/proposal/ProposalBuilderPage.tsx
  — Replace clientName input with <ClientSelect>
  — Save client_id instead of clientName string

src/utils/clients.ts  (new)
  — getMyClients()         Query active + pending bindings for current sales user
  — createClient()         Insert clients + binding row + generate confirm_token
  — requestBinding()       Insert binding row for existing client
  — confirmBinding(token)  Validate token, update statuses, set confirmed_at
```

### Navigation
Add **客戶管理** link in the Sales header/sidebar, visible only to `sales` role.

---

## 4. Confirmation Token Mechanism

- Token: UUID stored in `sales_client_bindings.confirm_token`
- Expiry: 7 days (`token_expires_at`)
- One-time use: token cleared after successful confirmation
- **MVP:** No email service. Sales copies link from UI and shares manually.
- **Future:** Replace manual sharing with Resend API or Supabase Edge Function.

### `/confirm-client` page behaviour
- Read `?token` from URL
- Query `sales_client_bindings` where `confirm_token = token` and `token_expires_at > now()`
- Show: sales user name, client company name, Confirm / Reject buttons
- On confirm: `binding.status = active`, `clients.status = active`, `confirmed_at = now()`, token cleared
- On reject: `binding.status = rejected`, token cleared
- On expired/invalid token: show error with contact message

---

## 5. Out of Scope (MVP)

- Email delivery (Resend / Supabase Edge Function)
- Multiple sales users bound to the same client
- Client-side dashboard (clients viewing their own proposals)
- Admin approval layer
- Binding transfer between sales users
