# Client / Advertiser Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `clientName` field in Proposal Builder with a structured Supabase-backed client entity, with sales-client binding flow and a token-based confirmation page.

**Architecture:** New `clients` and `sales_client_bindings` tables in Supabase. A `src/lib/api/clientApi.ts` helper wraps all Supabase queries. The Proposal Builder's client name input becomes a dropdown filtered to active bindings for the current sales user. A public `/confirm-client` page handles token-based binding confirmation. All pages are `'use client'` (static export constraint).

**Tech Stack:** Next.js App Router (static export), Supabase JS client (`src/lib/supabase.ts`), TailwindCSS, TypeScript, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260517_clients.sql` | Create | DB tables: clients, sales_client_bindings |
| `src/types/client.ts` | Create | TypeScript interfaces for Client and SalesClientBinding |
| `src/lib/api/clientApi.ts` | Create | Supabase query helpers for client/binding CRUD |
| `src/components/shell/navConfig.ts` | Modify | Add 客戶管理 nav item for sales role |
| `src/app/(shell)/clients/page.tsx` | Create | Sales: client list with status + binding request modal |
| `src/app/(shell)/clients/new/page.tsx` | Create | Sales: create client form |
| `src/app/confirm-client/page.tsx` | Create | Public: token confirmation page |
| `src/components/clients/ClientSelect.tsx` | Create | Dropdown filtered to active-bound clients |
| `src/components/proposal/ProposalBuilderPage.tsx` | Modify | Replace clientName input with ClientSelect |
| `src/__tests__/navConfig.test.ts` | Modify | Add assertion for clients nav item |
| `src/__tests__/clientApi.test.ts` | Create | Unit tests for clientApi helpers |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260517_clients.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260517_clients.sql
-- ============================================================
-- Clients and Sales-Client Bindings
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  contact_email     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending_confirmation'
                    CHECK (status IN ('pending_confirmation', 'active', 'suspended')),
  created_by_email  TEXT,                          -- sales user email who created, null = self-registered
  owner_email       TEXT,                          -- client's own email once confirmed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN clients.status IS
  'pending_confirmation | active | suspended';

CREATE TABLE IF NOT EXISTS sales_client_bindings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_email       TEXT NOT NULL,                 -- sales user email
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'rejected')),
  confirm_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  invited_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at      TIMESTAMPTZ,
  UNIQUE(sales_email, client_id)
);

COMMENT ON COLUMN sales_client_bindings.status IS
  'pending | active | rejected';

CREATE INDEX IF NOT EXISTS idx_scb_sales_email
  ON sales_client_bindings(sales_email);

CREATE INDEX IF NOT EXISTS idx_scb_client_id
  ON sales_client_bindings(client_id);

CREATE INDEX IF NOT EXISTS idx_scb_confirm_token
  ON sales_client_bindings(confirm_token);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL above. Name: `20260517_clients`.

- [ ] **Step 3: Verify tables exist**

Use `mcp__supabase__list_tables` and confirm `clients` and `sales_client_bindings` appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260517_clients.sql
git commit -m "feat: add clients and sales_client_bindings DB migration"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/client.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/types/client.ts

export type ClientStatus = 'pending_confirmation' | 'active' | 'suspended';
export type BindingStatus = 'pending' | 'active' | 'rejected';

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  status: ClientStatus;
  createdByEmail: string | null;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesClientBinding {
  id: string;
  salesEmail: string;
  clientId: string;
  status: BindingStatus;
  confirmToken: string;
  tokenExpiresAt: string;
  invitedAt: string;
  confirmedAt: string | null;
}

export interface ClientWithBinding extends Client {
  binding: SalesClientBinding;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/client.ts
git commit -m "feat: add Client and SalesClientBinding TypeScript types"
```

---

## Task 3: Client API Helpers

**Files:**
- Create: `src/lib/api/clientApi.ts`
- Create: `src/__tests__/clientApi.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/clientApi.test.ts
import { mapClientRow, mapBindingRow } from '@/lib/api/clientApi';

describe('mapClientRow', () => {
  it('maps snake_case DB row to camelCase Client', () => {
    const row = {
      id: 'abc',
      name: 'Test Co',
      contact_email: 'test@co.com',
      status: 'active',
      created_by_email: 'sales@demo.com',
      owner_email: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(mapClientRow(row)).toEqual({
      id: 'abc',
      name: 'Test Co',
      contactEmail: 'test@co.com',
      status: 'active',
      createdByEmail: 'sales@demo.com',
      ownerEmail: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });
});

describe('mapBindingRow', () => {
  it('maps snake_case DB row to camelCase SalesClientBinding', () => {
    const row = {
      id: 'bind-1',
      sales_email: 'sales@demo.com',
      client_id: 'abc',
      status: 'pending',
      confirm_token: 'tok-123',
      token_expires_at: '2026-01-08T00:00:00Z',
      invited_at: '2026-01-01T00:00:00Z',
      confirmed_at: null,
    };
    expect(mapBindingRow(row)).toEqual({
      id: 'bind-1',
      salesEmail: 'sales@demo.com',
      clientId: 'abc',
      status: 'pending',
      confirmToken: 'tok-123',
      tokenExpiresAt: '2026-01-08T00:00:00Z',
      invitedAt: '2026-01-01T00:00:00Z',
      confirmedAt: null,
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/clientApi.test.ts
```
Expected: FAIL — `mapClientRow` and `mapBindingRow` not defined.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/api/clientApi.ts
import { supabase } from '@/lib/supabase';
import type { Client, SalesClientBinding, ClientWithBinding } from '@/types/client';

// ── Row mappers (exported for testing) ──────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapClientRow(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contact_email,
    status: row.status,
    createdByEmail: row.created_by_email,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBindingRow(row: any): SalesClientBinding {
  return {
    id: row.id,
    salesEmail: row.sales_email,
    clientId: row.client_id,
    status: row.status,
    confirmToken: row.confirm_token,
    tokenExpiresAt: row.token_expires_at,
    invitedAt: row.invited_at,
    confirmedAt: row.confirmed_at,
  };
}

// ── Queries ─────────────────────────────────────────────────

/** Returns all clients bound (any status) to the given sales email. */
export async function getMyClients(salesEmail: string): Promise<ClientWithBinding[]> {
  const { data, error } = await supabase
    .from('sales_client_bindings')
    .select('*, clients(*)')
    .eq('sales_email', salesEmail)
    .order('invited_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...mapClientRow(row.clients),
    binding: mapBindingRow(row),
  }));
}

/** Returns clients with active binding for the given sales email (for dropdown). */
export async function getActiveClients(salesEmail: string): Promise<ClientWithBinding[]> {
  const all = await getMyClients(salesEmail);
  return all.filter(c => c.binding.status === 'active');
}

/** Creates a client and a pending binding for the sales user. */
export async function createClientWithBinding(input: {
  name: string;
  contactEmail: string;
  salesEmail: string;
}): Promise<ClientWithBinding> {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      contact_email: input.contactEmail,
      status: 'pending_confirmation',
      created_by_email: input.salesEmail,
    })
    .select()
    .single();

  if (clientError) throw new Error(clientError.message);

  const { data: binding, error: bindingError } = await supabase
    .from('sales_client_bindings')
    .insert({
      sales_email: input.salesEmail,
      client_id: client.id,
      status: 'pending',
    })
    .select()
    .single();

  if (bindingError) throw new Error(bindingError.message);

  return { ...mapClientRow(client), binding: mapBindingRow(binding) };
}

/** Searches for an existing active client by email (for binding request). */
export async function findClientByEmail(email: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('contact_email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapClientRow(data) : null;
}

/** Creates a pending binding from a sales user to an existing client. */
export async function requestBinding(input: {
  salesEmail: string;
  clientId: string;
}): Promise<SalesClientBinding> {
  const { data, error } = await supabase
    .from('sales_client_bindings')
    .insert({
      sales_email: input.salesEmail,
      client_id: input.clientId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapBindingRow(data);
}

/** Confirms a binding by token. Sets binding + client to active. */
export async function confirmBinding(token: string): Promise<{ clientName: string; salesEmail: string } | null> {
  const { data: binding, error } = await supabase
    .from('sales_client_bindings')
    .select('*, clients(name)')
    .eq('confirm_token', token)
    .eq('status', 'pending')
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !binding) return null;

  await supabase
    .from('sales_client_bindings')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('id', binding.id);

  await supabase
    .from('clients')
    .update({ status: 'active' })
    .eq('id', binding.client_id);

  return { clientName: binding.clients.name, salesEmail: binding.sales_email };
}

/** Rejects a binding by token. */
export async function rejectBinding(token: string): Promise<void> {
  await supabase
    .from('sales_client_bindings')
    .update({ status: 'rejected' })
    .eq('confirm_token', token)
    .eq('status', 'pending');
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/clientApi.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/clientApi.ts src/__tests__/clientApi.test.ts
git commit -m "feat: add clientApi helpers with row mappers"
```

---

## Task 4: Nav Item for Sales

**Files:**
- Modify: `src/components/shell/navConfig.ts`
- Modify: `src/__tests__/navConfig.test.ts`

- [ ] **Step 1: Add failing test**

Open `src/__tests__/navConfig.test.ts` and add at the end of the `sales` describe block:

```typescript
  it('sales has 客戶管理 linking to /clients', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const clientsItem = items.find(i => i.id === 'clients');
    expect(clientsItem).toBeDefined();
    expect(clientsItem?.href).toBe('/clients');
    expect(clientsItem?.label).toBe('客戶管理');
  });
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/__tests__/navConfig.test.ts
```
Expected: FAIL — no `clients` item found.

- [ ] **Step 3: Add nav item**

In `src/components/shell/navConfig.ts`, add `Users` to the lucide import:

```typescript
import {
  Home,
  Megaphone,
  FileText,
  Image as ImageIcon,
  BarChart2,
  ClipboardList,
  Users,
} from 'lucide-react';
```

In the `sales` section, add to the `提案管理` section items (after `新增提案`):

```typescript
{ id: 'clients', label: '客戶管理', icon: Users, href: '/clients' },
```

The full sales `提案管理` section becomes:

```typescript
{
  label: '提案管理',
  items: [
    { id: 'proposals-pending', label: '提案跟進', icon: FileText, href: '/proposal-review', badge: 'proposals_pending' },
    { id: 'proposals-all', label: '新增提案', icon: ClipboardList, href: '/proposal-builder' },
    { id: 'clients', label: '客戶管理', icon: Users, href: '/clients' },
  ],
},
```

- [ ] **Step 4: Update the existing sales label test** (it currently asserts exact order)

In `navConfig.test.ts`, find the test `'sales has 首頁, 提案跟進, 新增提案, 業績報告'` and update:

```typescript
  it('sales has 首頁, 提案跟進, 新增提案, 客戶管理, 業績報告', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const labels = items.map(i => i.label);
    const hrefs = items.map(i => i.href);
    expect(labels).toEqual(['首頁', '提案跟進', '新增提案', '客戶管理', '業績報告']);
    expect(hrefs).toContain('/clients');
  });
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/navConfig.test.ts
```
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/navConfig.ts src/__tests__/navConfig.test.ts
git commit -m "feat: add 客戶管理 nav item to sales role"
```

---

## Task 5: Client List Page

**Files:**
- Create: `src/app/(shell)/clients/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(shell)/clients/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Copy, Check, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyClients, findClientByEmail, requestBinding } from '@/lib/api/clientApi';
import type { ClientWithBinding } from '@/types/client';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: '已綁定', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: '待確認', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: '已拒絕', className: 'bg-red-100 text-red-600' },
};

export default function ClientsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Bind-existing-client modal state
  const [showBindModal, setShowBindModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; name: string } | null | 'not_found'>(null);
  const [searching, setSearching] = useState(false);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;
    getMyClients(currentUser.email)
      .then(setClients)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  function confirmUrl(token: string): string {
    return `${window.location.origin}${BASE_PATH}/confirm-client?token=${token}`;
  }

  async function handleCopyLink(token: string) {
    await navigator.clipboard.writeText(confirmUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = await findClientByEmail(searchEmail.trim());
      setSearchResult(found ? { id: found.id, name: found.name } : 'not_found');
    } finally {
      setSearching(false);
    }
  }

  async function handleRequestBinding() {
    if (!currentUser?.email || !searchResult || searchResult === 'not_found') return;
    setBinding(true);
    try {
      await requestBinding({ salesEmail: currentUser.email, clientId: searchResult.id });
      const updated = await getMyClients(currentUser.email);
      setClients(updated);
      setShowBindModal(false);
      setSearchEmail('');
      setSearchResult(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '綁定失敗');
    } finally {
      setBinding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-800">客戶管理</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBindModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Search className="w-4 h-4" /> 搜尋已有帳號
          </button>
          <Link
            href="/clients/new"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新增客戶
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {clients.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">尚無客戶。點「新增客戶」開始建立合作關係。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">客戶名稱</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">聯絡 Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">狀態</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">確認連結</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const badge = STATUS_BADGE[client.binding.status] ?? STATUS_BADGE.pending;
                const isPending = client.binding.status === 'pending';
                return (
                  <tr key={client.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{client.name}</td>
                    <td className="px-4 py-3 text-slate-500">{client.contactEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending && client.binding.confirmToken && (
                        <button
                          onClick={() => handleCopyLink(client.binding.confirmToken)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {copiedToken === client.binding.confirmToken
                            ? <><Check className="w-3.5 h-3.5" /> 已複製</>
                            : <><Copy className="w-3.5 h-3.5" /> 複製確認連結</>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {client.binding.status === 'active' && (
                        <button
                          onClick={() => router.push('/proposal-builder')}
                          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                        >
                          建立提案 →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bind existing client modal */}
      {showBindModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">搜尋已有帳號並申請綁定</h2>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={e => { setSearchEmail(e.target.value); setSearchResult(null); }}
                placeholder="輸入客戶 Email"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchEmail.trim()}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                搜尋
              </button>
            </div>
            {searchResult === 'not_found' && (
              <p className="text-sm text-red-600">找不到該 Email 的客戶帳號。請確認 Email 是否正確，或改用「新增客戶」。</p>
            )}
            {searchResult && searchResult !== 'not_found' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800 font-medium">找到：{searchResult.name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">送出申請後，客戶需確認才能建立提案。</p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setShowBindModal(false); setSearchEmail(''); setSearchResult(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleRequestBinding}
                disabled={!searchResult || searchResult === 'not_found' || binding}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {binding ? '送出中…' : '送出綁定申請'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `clients/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(shell\)/clients/page.tsx
git commit -m "feat: add clients list page for sales"
```

---

## Task 6: New Client Form Page

**Files:**
- Create: `src/app/(shell)/clients/new/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(shell)/clients/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClientWithBinding } from '@/lib/api/clientApi';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function NewClientPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser?.email || !name.trim() || !contactEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createClientWithBinding({
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        salesEmail: currentUser.email,
      });
      const url = `${window.location.origin}${BASE_PATH}/confirm-client?token=${result.binding.confirmToken}`;
      setConfirmUrl(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!confirmUrl) return;
    await navigator.clipboard.writeText(confirmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (confirmUrl) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">客戶已建立！</h2>
          <p className="text-sm text-slate-500">
            請將以下確認連結傳送給客戶（Email、LINE 均可）。<br />
            客戶點擊確認後，即可為其建立提案。
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 break-all font-mono text-left">
            {confirmUrl}
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {copied ? <><Check className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 複製確認連結</>}
          </button>
          <button
            onClick={() => router.push('/clients')}
            className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700"
          >
            回到客戶清單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <button
        onClick={() => router.push('/clients')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 回到客戶清單
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-lg font-bold text-slate-800 mb-6">新增客戶</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">公司名稱</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：台灣大哥大"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">聯絡 Email</label>
            <input
              required
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="contact@company.com"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !contactEmail.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? '建立中…' : '建立客戶並取得確認連結'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(shell\)/clients/new/page.tsx
git commit -m "feat: add new client form page"
```

---

## Task 7: Confirm-Client Public Page

**Files:**
- Create: `src/app/confirm-client/page.tsx`

This page is public (no AuthGuard) and reads `?token` from the URL.

- [ ] **Step 1: Create the page**

```tsx
// src/app/confirm-client/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmBinding, rejectBinding } from '@/lib/api/clientApi';

type PageState = 'loading' | 'confirm_prompt' | 'confirmed' | 'rejected' | 'invalid';

function ConfirmClientContent() {
  const params = useSearchParams();
  const token = params.get('token');

  const [state, setState] = useState<PageState>('loading');
  const [details, setDetails] = useState<{ clientName: string; salesEmail: string } | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    // Pre-check: try to fetch binding info without confirming yet
    // We call confirmBinding only on user action; here just check token validity
    // by attempting a lightweight query via the same helper but without mutating.
    // For MVP simplicity, show confirm prompt directly — token is validated on action.
    setState('confirm_prompt');
  }, [token]);

  async function handleConfirm() {
    if (!token) return;
    setActing(true);
    const result = await confirmBinding(token);
    if (result) {
      setDetails(result);
      setState('confirmed');
    } else {
      setState('invalid');
    }
    setActing(false);
  }

  async function handleReject() {
    if (!token) return;
    setActing(true);
    await rejectBinding(token);
    setState('rejected');
    setActing(false);
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8 text-center space-y-5">
        {state === 'confirm_prompt' && (
          <>
            <div className="text-4xl">🔗</div>
            <h1 className="text-lg font-bold text-slate-800">確認與業務的合作關係</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              業務邀請您建立廣告合作關係。<br />
              確認後，業務即可為您的公司建立廣告提案。
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleConfirm}
                disabled={acting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {acting ? '處理中…' : '確認合作'}
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                拒絕
              </button>
            </div>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800">合作關係已確認！</h1>
            <p className="text-sm text-slate-500">
              {details?.salesEmail} 現在可以為您建立廣告提案。
            </p>
          </>
        )}

        {state === 'rejected' && (
          <>
            <div className="text-4xl">👋</div>
            <h1 className="text-lg font-bold text-slate-800">已拒絕合作申請</h1>
            <p className="text-sm text-slate-500">您已拒絕此次綁定申請。如有疑問請聯絡業務。</p>
          </>
        )}

        {state === 'invalid' && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-lg font-bold text-slate-800">連結無效或已過期</h1>
            <p className="text-sm text-slate-500">此確認連結可能已使用過或已超過 7 天有效期。請聯絡您的業務重新發送。</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmClientPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmClientContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/confirm-client/page.tsx
git commit -m "feat: add public confirm-client token confirmation page"
```

---

## Task 8: ClientSelect + ProposalBuilderPage Integration

**Files:**
- Create: `src/components/clients/ClientSelect.tsx`
- Modify: `src/components/proposal/ProposalBuilderPage.tsx`

- [ ] **Step 1: Create ClientSelect component**

```tsx
// src/components/clients/ClientSelect.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getActiveClients } from '@/lib/api/clientApi';
import type { ClientWithBinding } from '@/types/client';

interface Props {
  value: string;              // selected client id
  onChange: (clientId: string, clientName: string) => void;
  className?: string;
}

export function ClientSelect({ value, onChange, className = '' }: Props) {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<ClientWithBinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.email) return;
    getActiveClients(currentUser.email)
      .then(setClients)
      .finally(() => setLoading(false));
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-400 bg-slate-50 ${className}`}>
        載入客戶清單中…
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className={`w-full px-4 py-2.5 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700 ${className}`}>
        尚無已綁定客戶。請先至{' '}
        <a href="/clients" className="underline font-medium">客戶管理</a>{' '}
        建立合作關係。
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        const selected = clients.find(c => c.id === e.target.value);
        onChange(e.target.value, selected?.name ?? '');
      }}
      className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none ${className}`}
    >
      <option value="">選擇客戶</option>
      {clients.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Update ProposalBuilderPage**

In `src/components/proposal/ProposalBuilderPage.tsx`, make these changes:

**a) Add import at top (after existing imports):**
```typescript
import { ClientSelect } from '@/components/clients/ClientSelect';
```

**b) Add `selectedClientId` state alongside `clientName`:**
```typescript
const [clientName, setClientName] = useState('');
const [selectedClientId, setSelectedClientId] = useState('');
```

**c) Update `canProceed` to require a selected client:**
```typescript
const canProceed = proposalName.trim() !== '' && selectedClientId !== '' && isDateValid;
```

**d) Replace the `客戶名稱` input block (currently lines ~244–251) with:**
```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1.5">客戶名稱</label>
  <ClientSelect
    value={selectedClientId}
    onChange={(id, name) => { setSelectedClientId(id); setClientName(name); }}
  />
</div>
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/clients/ClientSelect.tsx src/components/proposal/ProposalBuilderPage.tsx
git commit -m "feat: replace clientName free-text with ClientSelect dropdown in Proposal Builder"
```

---

## Final Verification

- [ ] **Manual flow A (代建客戶):**
  1. Log in as `sales@demo.com` / `demo1234`
  2. Navigate to 客戶管理 → 新增客戶
  3. Fill name + email → submit
  4. Confirm success screen shows confirm link
  5. Open confirm link in a new tab → see confirm prompt → click 確認合作
  6. Refresh 客戶管理 → client shows 已綁定

- [ ] **Manual flow B (搜尋現有帳號):**
  1. On 客戶管理, click 搜尋已有帳號
  2. Enter email of an existing active client → find → request binding
  3. Copy link → open in new tab → confirm
  4. Verify client shows 已綁定

- [ ] **Proposal Builder:**
  1. Navigate to 新增提案
  2. Confirm 客戶名稱 shows dropdown (not free text)
  3. Select a bound client → confirm `canProceed` works

- [ ] **Tag final commit**

```bash
git tag feature/client-binding-v1
```
