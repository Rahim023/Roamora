import mongoose from 'mongoose';

const departureSchema = new mongoose.Schema(
  {
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    bookedSeats: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    availableSeats: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    pricePerPersonMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    currency: { type: String, required: true, uppercase: true, match: /^[A-Z]{3}$/ },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

departureSchema.path('endDate').validate(function validateEndDate(value) {
  return !this.startDate || value >= this.startDate;
}, 'endDate must be on or after startDate.');

departureSchema.path('bookedSeats').validate(function validateBookedSeats(value) {
  return value <= this.capacity;
}, 'bookedSeats cannot exceed capacity.');

departureSchema.path('availableSeats').validate(function validateAvailableSeats(value) {
  return value === this.capacity - this.bookedSeats;
}, 'availableSeats must equal capacity minus bookedSeats.');

departureSchema.index({ package: 1, startDate: 1 }, { unique: true });
departureSchema.index({ startDate: 1, status: 1, availableSeats: 1 });

export default mongoose.model('Departure', departureSchema, 'departures');
