import mongoose from 'mongoose';
import { Departure, Order, Package } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';

export async function createBooking({ input, user }) {
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    if (String(existing.user) !== String(user._id)) throw new HttpError(409, 'Idempotency key already used.');
    return { order: existing, duplicate: true };
  }

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const trip = await Package.findOne({ _id: input.packageId, status: 'active' }).session(session);
      const departure = await Departure.findOne({
          _id: input.departureId,
          package: input.packageId,
          status: 'scheduled',
          startDate: { $gt: new Date() },
          availableSeats: { $gte: input.travellerCount },
      }).session(session);

      if (!trip) throw new HttpError(404, 'Package not found or unavailable.');
      if (!departure) throw new HttpError(409, 'Departure is unavailable or has insufficient capacity.');
      if (departure.currency !== trip.currency) {
        throw new HttpError(409, 'Departure and package currencies do not match.');
      }

      const unitPriceMinor = departure.pricePerPersonMinor;
      const subtotalMinor = unitPriceMinor * input.travellerCount;
      if (!Number.isSafeInteger(subtotalMinor)) throw new HttpError(400, 'Booking price exceeds the supported range.');
      const feesMinor = 0;
      const totalMinor = subtotalMinor + feesMinor;

      const inventory = await Departure.updateOne(
        { _id: departure._id, status: 'scheduled', availableSeats: { $gte: input.travellerCount } },
        {
          $inc: { bookedSeats: input.travellerCount, availableSeats: -input.travellerCount },
        },
        { session },
      );
      if (inventory.modifiedCount !== 1) throw new HttpError(409, 'Departure capacity changed. Please try again.');

      const order = new Order({
        user: user._id,
        package: trip._id,
        departure: departure._id,
        bookingReference: `ROA-${new mongoose.Types.ObjectId().toString().slice(-10).toUpperCase()}`,
        idempotencyKey: input.idempotencyKey,
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMode: 'demo',
        currency: departure.currency,
        travellerCount: input.travellerCount,
        travellers: input.travellers,
        contact: input.contact,
        unitPriceMinor,
        subtotalMinor,
        feesMinor,
        totalMinor,
        amountPaidMinor: 0,
        refundedMinor: 0,
        packageSnapshot: {
          title: trip.title,
          destination: trip.destination,
          country: trip.country,
          durationDays: trip.durationDays,
          accommodation: trip.accommodation,
          cancellationPolicy: trip.cancellationPolicy,
        },
        startDate: departure.startDate,
        endDate: departure.endDate,
        emailStatus: 'pending',
        emailAttemptedAt: new Date(),
        isDemo: trip.isDemo,
      });
      await order.save({ session });
      created = order;
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await Order.findOne({ idempotencyKey: input.idempotencyKey });
      if (duplicate && String(duplicate.user) === String(user._id)) return { order: duplicate, duplicate: true };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return { order: created, duplicate: false };
}

export async function cancelBooking({ order, user }) {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const current = await Order.findOne({ _id: order._id, user: user._id }).session(session);
      if (!current) throw new HttpError(404, 'Booking not found.');
      if (current.status === 'cancelled') {
        updated = current;
        return;
      }
      if (current.status !== 'confirmed' && current.status !== 'pending') {
        throw new HttpError(409, 'This booking can no longer be cancelled.');
      }

      const departure = await Departure.findById(current.departure).session(session);
      if (!departure) throw new HttpError(409, 'The departure record is unavailable.');

      const daysBefore = Math.floor((current.startDate.getTime() - Date.now()) / 86400000);
      const policy = current.packageSnapshot.cancellationPolicy;
      const refundPercent = daysBefore >= (policy?.freeCancellationDaysBefore ?? 0)
        ? (policy?.refundPercent ?? 0)
        : 0;
      const refundedMinor = current.paymentStatus === 'paid'
        ? Math.floor(current.amountPaidMinor * refundPercent / 100)
        : 0;

      if (current.startDate > new Date() && departure.status === 'scheduled') {
        const inventory = await Departure.updateOne(
          { _id: departure._id, bookedSeats: { $gte: current.travellerCount } },
          { $inc: { bookedSeats: -current.travellerCount, availableSeats: current.travellerCount } },
          { session },
        );
        if (inventory.modifiedCount !== 1) {
          throw new HttpError(409, 'Departure capacity is inconsistent; cancellation was not applied.');
        }
      }

      current.status = 'cancelled';
      current.cancelledAt = new Date();
      current.refundedMinor = refundedMinor;
      if (refundedMinor === current.amountPaidMinor && refundedMinor > 0) current.paymentStatus = 'refunded';
      else if (refundedMinor > 0) current.paymentStatus = 'partially_refunded';
      updated = await current.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return updated;
}
