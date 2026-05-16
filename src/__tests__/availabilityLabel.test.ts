import { describe, it, expect } from 'vitest';
import { availabilityLabel } from '@/utils/availabilityLabel';

describe('availabilityLabel', () => {
  it('returns green badge for high availability', () => {
    const result = availabilityLabel(0.8);
    expect(result.text).toBe('80% 可用');
    expect(result.colorClass).toBe('bg-emerald-500');
  });

  it('returns amber badge for limited availability', () => {
    const result = availabilityLabel(0.5);
    expect(result.text).toBe('50% 可用');
    expect(result.colorClass).toBe('bg-amber-500');
  });

  it('returns slate badge for low availability', () => {
    const result = availabilityLabel(0.2);
    expect(result.text).toBe('20% 可用');
    expect(result.colorClass).toBe('bg-slate-400');
  });

  it('treats exactly 0.7 as high', () => {
    expect(availabilityLabel(0.7).colorClass).toBe('bg-emerald-500');
  });

  it('treats exactly 0.3 as limited', () => {
    expect(availabilityLabel(0.3).colorClass).toBe('bg-amber-500');
  });
});
