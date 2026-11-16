import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Departure, Order, Package } from '../models/index.js';
import { cancelBooking, createBooking } from './bookingService.js';

const future = new Date(Date.now() + 30 * 86400000);
const objectId = () => new mongoose.Types.ObjectId();

function mockSession() {
  vi.spyOn(mongoose, 'startSession').mockResolvedValue({
    withTransaction: async (callback) => callback(),
    endSession: vi.fn(),
  });
}

function mockBookingReads({ availableSeats = 8 } = {}) {
  const tripId = objectId();
  const departureId = objectId();
  const userId = objectId();
  const trip = {
    _id: tripId,
    title: 'Sample Trip',
    destination: 'Bali',
    country: 'Indonesia',
    durationDays: 3,
    accommodation: 'Resort',
    cancellationPolicy: { freeCancellationDaysBefore: 14, refundPercent: 100 },
    currency: 'CAD',
    isDemo: true,
  };
  const departure = {
    _id: departureId,
    package: tripId,
    startDate: future,
    endDate: new Date(future.getTime() + 2 * 86400000),
    availableSeats,
    pricePerPersonMinor: 125000,
    currency: 'CAD',
    status: 'scheduled',
  };
  vi.spyOn(Order, 'findOne').mockResolvedValue(null);
  vi.spyOn(Package, 'findOne').mockReturnValue({ session: async () => trip });
  vi.spyOn(Departure, 'findOne').mockReturnValue({ session: async () => departure });
  return { tripId, departureId, userId };
}

function inputFor({ packageId, departureId, idempotencyKey = 'request-key-0001', count = 2 }) {
  return {
    packageId: String(packageId),
    departureId: String(departureId),
    travellerCount: count,
    travellers: Array.from({ length: count }, (_value, index) => ({ name: `Traveller ${index + 1}`, type: 'adult' })),
    contact: { name: 'Test Traveller', email: 'test@example.com' },
    idempotencyKey,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('booking service', () => {
  it('calculates booking totals from the stored departure price', async () => {
    mockSession();
    const ids = mockBookingReads();
    const inventoryUpdate = vi.spyOn(Departure, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const savedOrders = [];
    vi.spyOn(Order.prototype, 'save').mockImplementation(async function save() {
      this._id = objectId();
      savedOrders.push(this);
      return this;
    });

    const result = await createBooking({ input: inputFor(ids), user: { _id: ids.userId } });

    expect(result.duplicate).toBe(false);
    expect(savedOrders[0]).toMatchObject({
      unitPriceMinor: 125000,
      subtotalMinor: 250000,
      feesMinor: 0,
      totalMinor: 250000,
      amountPaidMinor: 250000,
      paymentMode: 'demo',
    });
    expect(inventoryUpdate).toHaveBeenCalledOnce();
  });

  it('does not consume capacity twice for concurrent booking attempts', async () => {
    mockSession();
    const ids = mockBookingReads({ availableSeats: 2 });
    let remainingSeats = 2;
    vi.spyOn(Departure, 'updateOne').mockImplementation(async (_filter, update) => {
      const requestedSeats = -update.$inc.availableSeats;
      if (remainingSeats < requestedSeats) return { modifiedCount: 0 };
      remainingSeats -= requestedSeats;
      return { modifiedCount: 1 };
    });
    vi.spyOn(Order.prototype, 'save').mockImplementation(async function save() {
      this._id = objectId();
      return this;
    });

    const results = await Promise.allSettled([
      createBooking({ input: inputFor({ ...ids, idempotencyKey: 'request-key-0001' }), user: { _id: ids.userId } }),
      createBooking({ input: inputFor({ ...ids, idempotencyKey: 'request-key-0002' }), user: { _id: ids.userId } }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')[0].reason.statusCode).toBe(409);
    expect(remainingSeats).toBe(0);
  });

  it('restores future departure capacity once and makes repeated cancellation idempotent', async () => {
    mockSession();
    const userId = objectId();
    const departureId = objectId();
    const current = {
      _id: objectId(),
      user: userId,
      departure: departureId,
      startDate: future,
      status: 'confirmed',
      paymentStatus: 'paid',
      amountPaidMinor: 250000,
      refundedMinor: 0,
      travellerCount: 2,
      packageSnapshot: { cancellationPolicy: { freeCancellationDaysBefore: 14, refundPercent: 100 } },
      save: vi.fn(async function save() { return this; }),
    };
    vi.spyOn(Order, 'findOne').mockReturnValue({ session: async () => current });
    vi.spyOn(Departure, 'findById').mockReturnValue({
      session: async () => ({ _id: departureId, status: 'scheduled' }),
    });
    const inventoryUpdate = vi.spyOn(Departure, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

    await cancelBooking({ order: current, user: { _id: userId } });
    await cancelBooking({ order: current, user: { _id: userId } });

    expect(current.status).toBe('cancelled');
    expect(current.refundedMinor).toBe(250000);
    expect(inventoryUpdate).toHaveBeenCalledOnce();
  });
});
