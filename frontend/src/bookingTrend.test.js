import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { bookingTrend } from './bookingTrend.js';

test('fills missing months across years and keeps currencies separate', () => {
  const result = bookingTrend([
    { period: '2025-12', currency: 'CAD', amountMinor: 12550 },
    { period: '2025-12', currency: 'USD', amountMinor: 90000 },
    { period: '2026-02', currency: 'CAD', amountMinor: 3000 },
  ], 'CAD', 3, new Date('2026-02-20T12:00:00Z'));
  assert.deepEqual(result.map(({ period, value }) => [period, value]), [
    ['2025-12', 125.5], ['2026-01', 0], ['2026-02', 30],
  ]);
});

test('shows zero values for months without bookings', () => {
  const result = bookingTrend([], 'CAD', 2, new Date('2026-01-15T12:00:00Z'));
  assert.deepEqual(result.map(({ period, value }) => [period, value]), [['2025-12', 0], ['2026-01', 0]]);
});
