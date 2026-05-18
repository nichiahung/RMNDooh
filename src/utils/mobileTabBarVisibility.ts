const TOP_VISIBLE_THRESHOLD_PX = 24;
const BOTTOM_VISIBLE_THRESHOLD_PX = 48;
const DOWN_SCROLL_THRESHOLD_PX = 16;

interface MobileTabBarVisibilityInput {
  currentScrollTop: number;
  previousScrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isDrawerOpen: boolean;
  previousVisible?: boolean;
}

export function getMobileTabBarVisibility({
  currentScrollTop,
  previousScrollTop,
  scrollHeight,
  clientHeight,
  isDrawerOpen,
  previousVisible = true,
}: MobileTabBarVisibilityInput): boolean {
  if (isDrawerOpen) return true;
  if (currentScrollTop <= TOP_VISIBLE_THRESHOLD_PX) return true;

  const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight;
  if (distanceFromBottom <= BOTTOM_VISIBLE_THRESHOLD_PX) return true;

  const scrollDelta = currentScrollTop - previousScrollTop;
  if (scrollDelta <= 0) return true;
  if (scrollDelta < DOWN_SCROLL_THRESHOLD_PX) return previousVisible;

  return false;
}
