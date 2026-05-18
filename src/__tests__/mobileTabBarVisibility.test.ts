import { describe, expect, it } from 'vitest';
import { getMobileTabBarVisibility } from '@/utils/mobileTabBarVisibility';

describe('getMobileTabBarVisibility', () => {
  it('keeps the mobile tab bar visible near the top of the scroll container', () => {
    expect(
      getMobileTabBarVisibility({
        currentScrollTop: 12,
        previousScrollTop: 0,
        scrollHeight: 1600,
        clientHeight: 720,
        isDrawerOpen: false,
      }),
    ).toBe(true);
  });

  it('hides the mobile tab bar after a meaningful downward scroll', () => {
    expect(
      getMobileTabBarVisibility({
        currentScrollTop: 160,
        previousScrollTop: 120,
        scrollHeight: 1600,
        clientHeight: 720,
        isDrawerOpen: false,
      }),
    ).toBe(false);
  });

  it('shows the mobile tab bar immediately when scrolling upward', () => {
    expect(
      getMobileTabBarVisibility({
        currentScrollTop: 100,
        previousScrollTop: 160,
        scrollHeight: 1600,
        clientHeight: 720,
        isDrawerOpen: false,
      }),
    ).toBe(true);
  });

  it('keeps the mobile tab bar visible near the bottom and while the drawer is open', () => {
    expect(
      getMobileTabBarVisibility({
        currentScrollTop: 860,
        previousScrollTop: 820,
        scrollHeight: 1600,
        clientHeight: 720,
        isDrawerOpen: false,
      }),
    ).toBe(true);

    expect(
      getMobileTabBarVisibility({
        currentScrollTop: 280,
        previousScrollTop: 240,
        scrollHeight: 1600,
        clientHeight: 720,
        isDrawerOpen: true,
      }),
    ).toBe(true);
  });
});
