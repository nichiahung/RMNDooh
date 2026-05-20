import { describe, it, expect, beforeEach } from 'vitest';
import { resetTradingIterationState, markProposalRevised, adminSendProposalToAdvertiser } from '@/lib/tradingIterationActions';
import { tradingSeedProposals } from '@/data/tradingIterationMockData';

beforeEach(async () => {
  await resetTradingIterationState();
});

describe('markProposalRevised', () => {
  it('sets proposal status to revised', async () => {
    const seedProposal = tradingSeedProposals.find(p => p.status === 'change_requested')!;
    const result = await markProposalRevised(seedProposal.id);
    const updated = result.proposals.find(p => p.id === seedProposal.id);
    expect(updated?.status).toBe('revised');
  });

  it('throws when proposal id does not exist', async () => {
    await expect(markProposalRevised('nonexistent-id-xyz')).rejects.toThrow('Proposal nonexistent-id-xyz not found');
  });
});

describe('adminSendProposalToAdvertiser', () => {
  it('sets proposal status to sent_to_advertiser', async () => {
    const seedProposal = tradingSeedProposals.find(p => p.status === 'draft')!;
    const result = await adminSendProposalToAdvertiser(seedProposal.id);
    const updated = result.proposals.find(p => p.id === seedProposal.id);
    expect(updated?.status).toBe('sent_to_advertiser');
  });

  it('throws when proposal id does not exist', async () => {
    await expect(adminSendProposalToAdvertiser('nonexistent-id-abc')).rejects.toThrow('Proposal nonexistent-id-abc not found');
  });
});
