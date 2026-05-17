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
    updatedAt: row.updated_at,
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
