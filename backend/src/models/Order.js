import mongoose from 'mongoose';
import { currencyField, moneyMinorValidator } from './modelHelpers.js';

const { ObjectId } = mongoose.Schema.Types;

const travellerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['adult', 'child', 'infant'], default: 'adult' },
  },
  { _id: false, strict: 'throw' },
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  },
  { _id: false, strict: 'throw' },
);

const packageSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    durationDays: { type: Number, min: 1, validate: Number.isSafeInteger },
    accommodation: { type: String, trim: true },
    cancellationPolicy: {
      freeCancellationDaysBefore: { type: Number, min: 0, validate: Number.isSafeInteger },
      refundPercent: { type: Number, min: 0, max: 100, validate: Number.isSafeInteger },
    },
  },
  { _id: false, strict: 'throw' },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    package: { type: ObjectId, ref: 'Package', required: true },
    departure: { type: ObjectId, ref: 'Departure', required: true },
    bookingReference: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    idempotencyKey: { type: String, trim: true, maxlength: 128 },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], required: true, default: 'pending' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially_refunded', 'refunded', 'failed'],
      required: true,
      default: 'pending',
    },
    paymentMode: { type: String, enum: ['demo', 'external'], required: true, default: 'demo' },
    currency: currencyField,
    travellerCount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    travellers: { type: [travellerSchema], required: true, validate: (value) => value.length > 0 },
    contact: { type: contactSchema, required: true },
    unitPriceMinor: { type: Number, required: true, min: 0, validate: moneyMinorValidator },
    subtotalMinor: { type: Number, required: true, min: 0, validate: moneyMinorValidator },
    feesMinor: { type: Number, required: true, min: 0, default: 0, validate: moneyMinorValidator },
    totalMinor: { type: Number, required: true, min: 0, validate: moneyMinorValidator },
    amountPaidMinor: { type: Number, required: true, min: 0, default: 0, validate: moneyMinorValidator },
    refundedMinor: { type: Number, required: true, min: 0, default: 0, validate: moneyMinorValidator },
    paidAt: Date,
    cancelledAt: Date,
    hiddenFromTrips: { type: Boolean, default: false },
    packageSnapshot: { type: packageSnapshotSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    emailStatus: { type: String, required: true, enum: ['not_sent_demo', 'pending', 'sent', 'failed'] },
    reviewEmailStatus: { type: String, enum: ['pending', 'sent', 'failed', 'not_configured', 'not_needed'] },
    reviewEmailAttemptedAt: Date,
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

orderSchema.path('travellerCount').validate(function validateTravellerCount(value) {
  return !this.travellers || value === this.travellers.length;
}, 'travellerCount must match the travellers array length.');

orderSchema.path('totalMinor').validate(function validateTotal(value) {
  return value === this.subtotalMinor + this.feesMinor;
}, 'totalMinor must equal subtotalMinor plus feesMinor.');

orderSchema.path('refundedMinor').validate(function validateRefund(value) {
  return value <= this.amountPaidMinor;
}, 'refundedMinor cannot exceed amountPaidMinor.');

orderSchema.path('endDate').validate(function validateEndDate(value) {
  return !this.startDate || value >= this.startDate;
}, 'endDate must be on or after startDate.');

orderSchema.index({ bookingReference: 1 }, { unique: true });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ user: 1, status: 1, departureDate: 1 });
orderSchema.index({ package: 1, status: 1, paymentStatus: 1 });

export default mongoose.model('Order', orderSchema, 'orders');
