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
  updatedAt: string;
}

export interface ClientWithBinding extends Client {
  binding: SalesClientBinding;
}
