/**
 * Format a number as a currency string in TWD
 * Example: 15000 -> "NT$15,000"
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'NT$0';
  
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0, // Typical for TWD, no decimals needed usually
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with comma separators
 * Example: 1500000 -> "1,500,000"
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a CPM value to always show two decimal places
 * Example: 15.5 -> "15.50"
 */
export function formatCPM(value: number): string {
  if (isNaN(value)) return '0.00';
  
  return value.toFixed(2);
}

/**
 * Format a date range cleanly
 * Example: ("2024-05-01", "2024-05-15") -> "May 1, 2024 - May 15, 2024"
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
