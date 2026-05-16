import { validateCredentials } from '@/utils/mockAuth';

describe('validateCredentials', () => {
  it('returns advertiser user for valid advertiser credentials', () => {
    const result = validateCredentials('advertiser@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'advertiser@demo.com', role: 'advertiser' });
  });

  it('returns sales user for valid sales credentials', () => {
    const result = validateCredentials('sales@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'sales@demo.com', role: 'sales' });
  });

  it('returns admin user for valid admin credentials', () => {
    const result = validateCredentials('admin@demo.com', 'demo1234');
    expect(result).toEqual({ email: 'admin@demo.com', role: 'admin' });
  });

  it('returns null for wrong password', () => {
    expect(validateCredentials('advertiser@demo.com', 'wrong')).toBeNull();
  });

  it('returns null for unknown email', () => {
    expect(validateCredentials('unknown@demo.com', 'demo1234')).toBeNull();
  });

  it('returns null for empty credentials', () => {
    expect(validateCredentials('', '')).toBeNull();
  });
});
