import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { adminBookingReference, adminPersonName } from './adminDisplay.js';

test('uses the booking ID for marked records with a sample label', () => {
  assert.equal(adminBookingReference({ _id: 'abc123', isDemo: true, bookingReference: 'DEMO-123' }), 'Booking ID abc123');
  assert.equal(adminBookingReference({ isDemo: true, bookingReference: 'DEMO-123' }), 'Booking reference unavailable');
  assert.equal(adminBookingReference({ _id: 'abc123', isDemo: false, bookingReference: 'DEMO-123' }), 'DEMO-123');
  assert.equal(adminBookingReference({ _id: 'abc123', isDemo: true, bookingReference: 'ROA-123' }), 'ROA-123');
  assert.equal(adminBookingReference({ _id: 'abc123' }), 'Booking ID abc123');
});

test('uses a neutral name only for marked records with a sample label', () => {
  assert.equal(adminPersonName({ isDemo: true }, 'Demo traveller'), 'Traveller');
  assert.equal(adminPersonName({ isDemo: false }, 'Demo traveller'), 'Demo traveller');
  assert.equal(adminPersonName({ isDemo: true }, 'Alex'), 'Alex');
});
