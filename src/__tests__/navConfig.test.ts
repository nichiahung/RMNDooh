import { NAV_CONFIG } from '@/components/shell/navConfig';

describe('NAV_CONFIG', () => {
  it('advertiser has 首頁, 活動管理, 提案確認, 素材庫, 成效報告', () => {
    const items = NAV_CONFIG.advertiser.flatMap(s => s.items);
    const labels = items.map(i => i.label);
    const hrefs = items.map(i => i.href);
    expect(labels).toEqual(['首頁', '活動管理', '提案確認', '素材庫', '成效報告']);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/campaign-planner');
    expect(hrefs).toContain('/proposal-review');
    expect(hrefs).toContain('/assets');
    expect(hrefs).toContain('/reports');
  });

  it('advertiser does not have any sales-only items', () => {
    const items = NAV_CONFIG.advertiser.flatMap(s => s.items);
    const ids = items.map(i => i.id);
    expect(ids).not.toContain('proposals-pending');
  });

  it('advertiser 素材庫 has creative attention badge', () => {
    const items = NAV_CONFIG.advertiser.flatMap(s => s.items);
    const assets = items.find(i => i.id === 'assets');
    expect(assets?.badge).toBe('creative_attention');
  });

  it('sales has 首頁, 提案跟進, 新增提案, 客戶管理, 業績報告', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const labels = items.map(i => i.label);
    const hrefs = items.map(i => i.href);
    expect(labels).toEqual(['首頁', '提案跟進', '新增提案', '客戶管理', '業績報告']);
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/proposal-review');
    expect(hrefs).toContain('/proposal-builder');
    expect(hrefs).toContain('/clients');
    expect(hrefs).toContain('/reports');
  });

  it('sales 提案跟進 has proposals_pending badge', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const pending = items.find(i => i.id === 'proposals-pending');
    expect(pending?.badge).toBe('proposals_pending');
  });

  it('sales has 客戶管理 linking to /clients', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const clientsItem = items.find(i => i.id === 'clients');
    expect(clientsItem).toBeDefined();
    expect(clientsItem?.href).toBe('/clients');
    expect(clientsItem?.label).toBe('客戶管理');
  });

  it('sales does not have campaign-planner', () => {
    const items = NAV_CONFIG.sales.flatMap(s => s.items);
    const hrefs = items.map(i => i.href);
    expect(hrefs).not.toContain('/campaign-planner');
  });

  it('admin maps to empty array (admin uses AdminSidebar at /admin)', () => {
    expect(NAV_CONFIG.admin).toEqual([]);
  });

  it('all items have id, label, and href starting with /', () => {
    (['advertiser', 'sales'] as const).forEach(role => {
      NAV_CONFIG[role].flatMap(s => s.items).forEach(item => {
        expect(typeof item.id).toBe('string');
        expect(typeof item.label).toBe('string');
        expect(item.href.startsWith('/')).toBe(true);
      });
    });
  });
});
