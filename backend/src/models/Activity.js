import mongoose from 'mongoose';
import { coordinateValidator, currencyField, moneyMinorValidator, longitudeValidator } from './modelHelpers.js';

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000 },
    destination: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 },
    latitude: { type: Number, validate: coordinateValidator },
    longitude: { type: Number, validate: longitudeValidator },
    durationMinutes: { type: Number, min: 0, validate: Number.isSafeInteger },
    pricePerPersonMinor: { type: Number, required: true, min: 0, validate: moneyMinorValidator },
    currency: currencyField,
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

activitySchema.index({ destination: 1, country: 1, isActive: 1 });

export default mongoose.model('Activity', activitySchema, 'activities');
