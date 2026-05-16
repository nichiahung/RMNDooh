export type Role = 'advertiser' | 'sales' | 'admin';

export interface AuthUser {
  email: string;
  role: Role;
}

const MOCK_ACCOUNTS: Array<AuthUser & { password: string }> = [
  { email: 'advertiser@demo.com', password: 'demo1234', role: 'advertiser' },
  { email: 'sales@demo.com',      password: 'demo1234', role: 'sales' },
  { email: 'admin@demo.com',      password: 'demo1234', role: 'admin' },
];

export function validateCredentials(email: string, password: string): AuthUser | null {
  const account = MOCK_ACCOUNTS.find(
    a => a.email === email && a.password === password,
  );
  if (!account) return null;
  return { email: account.email, role: account.role };
}
