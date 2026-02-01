import { describe, it, expect } from 'vitest';
import {
  centsToDollars,
  dollarsToCents,
  parsePriceToCents,
  formatCurrency,
  calculateTotalCents,
  validatePrice,
  validateName,
} from '@/lib/currency';

describe('Currency Utils', () => {
  describe('centsToDollars', () => {
    it('converts cents to dollars correctly', () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(1999)).toBe(19.99);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(1)).toBe(0.01);
    });
  });

  describe('dollarsToCents', () => {
    it('converts dollars to cents correctly', () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(19.99)).toBe(1999);
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(0.01)).toBe(1);
    });

    it('handles floating point correctly', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    });
  });

  describe('parsePriceToCents', () => {
    it('parses valid price strings', () => {
      expect(parsePriceToCents('19.99')).toBe(1999);
      expect(parsePriceToCents('19,99')).toBe(1999);
      expect(parsePriceToCents('$19.99')).toBe(1999);
      expect(parsePriceToCents('₹19.99')).toBe(1999);
      expect(parsePriceToCents('100')).toBe(10000);
      expect(parsePriceToCents('0.01')).toBe(1);
    });

    it('returns null for invalid inputs', () => {
      expect(parsePriceToCents('')).toBe(null);
      expect(parsePriceToCents('abc')).toBe(null);
      expect(parsePriceToCents('-10')).toBe(null);
    });
  });

  describe('calculateTotalCents', () => {
    it('calculates total from array of items', () => {
      const items = [
        { price_cents: 1999 },
        { price_cents: 500 },
        { price_cents: 1 },
      ];
      expect(calculateTotalCents(items)).toBe(2500);
    });

    it('returns 0 for empty array', () => {
      expect(calculateTotalCents([])).toBe(0);
    });

    it('handles large totals without overflow', () => {
      const items = [
        { price_cents: 99999999 },
        { price_cents: 99999999 },
      ];
      expect(calculateTotalCents(items)).toBe(199999998);
    });
  });

  describe('formatCurrency', () => {
    it('formats cents as Indian Rupee currency string', () => {
      const result = formatCurrency(1999);
      // Should be formatted as Indian Rupee
      expect(result).toBe('₹19.99');
    });

    it('handles zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toBe('₹0.00');
    });
  });

  describe('validatePrice', () => {
    it('validates correct prices', () => {
      expect(validatePrice('19.99')).toEqual({ valid: true });
      expect(validatePrice('0.01')).toEqual({ valid: true });
      expect(validatePrice('100')).toEqual({ valid: true });
    });

    it('rejects invalid prices', () => {
      expect(validatePrice('')).toEqual({ valid: false, error: 'Price is required' });
      expect(validatePrice('abc')).toEqual({ valid: false, error: 'Invalid price format' });
    });
  });

  describe('validateName', () => {
    it('validates correct names', () => {
      expect(validateName('Test Item')).toEqual({ valid: true });
      expect(validateName('A')).toEqual({ valid: true });
    });

    it('rejects invalid names', () => {
      expect(validateName('')).toEqual({ valid: false, error: 'Item name is required' });
      expect(validateName('   ')).toEqual({ valid: false, error: 'Item name is required' });
      expect(validateName('a'.repeat(256))).toEqual({ 
        valid: false, 
        error: 'Item name is too long (max 255 characters)' 
      });
    });
  });
});
