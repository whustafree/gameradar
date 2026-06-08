import { describe, it, expect, vi } from 'vitest';
import { parsePrice, formatCurrency, getTimeInfo, getRelativeTime } from '../format';

describe('parsePrice', () => {
  it('parses numeric price string', () => {
    expect(parsePrice('59.99')).toBe(59.99);
  });

  it('returns 0 for N/A', () => {
    expect(parsePrice('N/A')).toBe(0);
  });

  it('returns 0 for Pago', () => {
    expect(parsePrice('Pago')).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parsePrice(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parsePrice(null)).toBe(0);
  });

  it('parses price with $ prefix', () => {
    expect(parsePrice('$29.99')).toBe(29.99);
  });

  it('parses integer price', () => {
    expect(parsePrice('10')).toBe(10);
  });
});

describe('formatCurrency', () => {
  it('formats small amounts', () => {
    expect(formatCurrency(50)).toBe('$50');
  });

  it('formats amounts in thousands', () => {
    expect(formatCurrency(1500)).toBe('$1.5k');
  });

  it('formats exact thousand', () => {
    expect(formatCurrency(2000)).toBe('$2.0k');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});

describe('getTimeInfo', () => {
  it('returns empty text for games without endDate', () => {
    const result = getTimeInfo(undefined, 'game');
    expect(result.text).toBe('');
    expect(result.className).toBe('normal');
  });

  it('returns flash offer for App type without endDate', () => {
    const result = getTimeInfo(undefined, 'App');
    expect(result.text).toContain('Oferta Flash');
    expect(result.className).toBe('urgent');
  });

  it('returns expired for past dates', () => {
    const past = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const result = getTimeInfo(past);
    expect(result.text).toContain('Expirado');
    expect(result.className).toBe('expired');
  });

  it('returns urgent for dates within 2 days', () => {
    const soon = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
    const result = getTimeInfo(soon);
    expect(result.className).toBe('urgent');
  });

  it('returns normal for dates far in future', () => {
    const far = new Date(Date.now() + 86400000 * 10).toISOString(); // 10 days
    const result = getTimeInfo(far);
    expect(result.className).toBe('normal');
  });
});

describe('getRelativeTime', () => {
  it('returns -- for null timestamp', () => {
    expect(getRelativeTime(null)).toBe('--');
  });

  it('returns hace un momento for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(getRelativeTime(now)).toBe('Hace un momento');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(getRelativeTime(fiveMinAgo)).toBe('Hace 5 min');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(getRelativeTime(twoHoursAgo)).toBe('Hace 2 h');
  });
});
