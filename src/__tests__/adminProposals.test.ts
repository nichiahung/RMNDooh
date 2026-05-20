import { describe, it, expect, beforeEach } from 'vitest';
import { resetTradingIterationState, markProposalRevised, adminSendProposalToAdvertiser } from '@/lib/tradingIterationActions';
import { tradingSeedProposals } from '@/data/tradingIterationMockData';

beforeEach(async () => {
  await resetTradingIterationState();
});

describe('markProposalRevised', () => {
  it('sets proposal status to revised', () => {
    const seedProposal = tradingSeedProposals[0];
    const result = markProposalRevised(seedProposal.id);
    const updated = result.proposals.find(p => p.id === seedProposal.id);
    expect(updated?.status).toBe('revised');
  });

  it('throws when proposal id does not exist', () => {
    expect(() => markProposalRevised('nonexistent-id-xyz')).toThrow('Proposal nonexistent-id-xyz not found');
  });
});

describe('adminSendProposalToAdvertiser', () => {
  it('sets proposal status to sent_to_advertiser', () => {
    const seedProposal = tradingSeedProposals[0];
    const result = adminSendProposalToAdvertiser(seedProposal.id);
    const updated = result.proposals.find(p => p.id === seedProposal.id);
    expect(updated?.status).toBe('sent_to_advertiser');
  });

  it('throws when proposal id does not exist', () => {
    expect(() => adminSendProposalToAdvertiser('nonexistent-id-abc')).toThrow('Proposal nonexistent-id-abc not found');
  });
});
