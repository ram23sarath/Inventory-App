import type { CurrencyOptions } from '@/types';

/**
 * Detect user's currency based on browser locale
 */
export function detectCurrency(): CurrencyOptions {
  const locale = navigator.language || 'en-US';
  
  // Map common locales to currencies
  const currencyMap: Record<string, { currency: string; symbol: string }> = {
    'en-IN': { currency: 'INR', symbol: '₹' },
    'hi-IN': { currency: 'INR', symbol: '₹' },
    'en-US': { currency: 'USD', symbol: '$' },
    'en-GB': { currency: 'GBP', symbol: '£' },
    'de-DE': { currency: 'EUR', symbol: '€' },
    'fr-FR': { currency: 'EUR', symbol: '€' },
    'ja-JP': { currency: 'JPY', symbol: '¥' },
    'zh-CN': { currency: 'CNY', symbol: '¥' },
  };

  // Check if locale has a direct match
  if (currencyMap[locale]) {
    return { locale, ...currencyMap[locale] };
  }

  // Check language prefix
  const langPrefix = locale.split('-')[0];
  const prefixMatch = Object.entries(currencyMap).find(([key]) => 
    key.startsWith(langPrefix + '-')
  );

  if (prefixMatch) {
    return { locale, ...prefixMatch[1] };
  }

  // Default to USD
  return { locale, currency: 'USD', symbol: '$' };
}

/**
 * Convert cents to decimal for display
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert decimal dollars to cents (integer)
 */
export function dollarsToCents(dollars: number): number {
  // Round to avoid floating point errors
  return Math.round(dollars * 100);
}

/**
 * Parse price string to cents
 * Handles various input formats like "19.99", "19,99", "$19.99"
 */
export function parsePriceToCents(priceString: string): number | null {
  if (!priceString || priceString.trim() === '') {
    return null;
  }

  // Remove currency symbols and whitespace
  let cleaned = priceString.replace(/[₹$€£¥\s]/g, '');
  
  // Replace comma with dot for European formats
  cleaned = cleaned.replace(',', '.');
  
  // Parse as float
  const value = parseFloat(cleaned);
  
  if (isNaN(value) || value < 0) {
    return null;
  }

  return dollarsToCents(value);
}

/**
 * Format cents as currency string
 */
export function formatCurrency(cents: number, options?: Partial<CurrencyOptions>): string {
  const { locale, currency } = { ...detectCurrency(), ...options };
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(centsToDollars(cents));
  } catch {
    // Fallback formatting
    const symbol = options?.symbol || '$';
    return `${symbol}${centsToDollars(cents).toFixed(2)}`;
  }
}

/**
 * Format cents as decimal string for input (without currency symbol)
 */
export function formatDecimal(cents: number): string {
  return centsToDollars(cents).toFixed(2);
}

/**
 * Calculate total from array of items (all math in cents)
 */
export function calculateTotalCents(items: { price_cents: number }[]): number {
  return items.reduce((sum, item) => sum + item.price_cents, 0);
}

/**
 * Validate price input
 */
export function validatePrice(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Price is required' };
  }

  const cents = parsePriceToCents(value);
  
  if (cents === null) {
    return { valid: false, error: 'Invalid price format' };
  }
  
  if (cents < 0) {
    return { valid: false, error: 'Price cannot be negative' };
  }
  
  if (cents > 99999999) { // Max ~$999,999.99
    return { valid: false, error: 'Price is too large' };
  }

  return { valid: true };
}

/**
 * Validate item name
 */
export function validateName(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Item name is required' };
  }
  
  if (value.length > 255) {
    return { valid: false, error: 'Item name is too long (max 255 characters)' };
  }

  return { valid: true };
}
