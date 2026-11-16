import mongoose from 'mongoose';
import { coordinateValidator, currencyField, longitudeValidator, uniqueObjectIds } from './modelHelpers.js';

const { ObjectId } = mongoose.Schema.Types;

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000 },
    activities: [{ type: ObjectId, ref: 'Activity' }],
  },
  { _id: false, strict: 'throw' },
);

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    latitude: { type: Number, required: true, validate: coordinateValidator },
    longitude: { type: Number, required: true, validate: longitudeValidator },
    day: { type: Number, min: 1, validate: Number.isSafeInteger },
    sequence: { type: Number, min: 1, validate: Number.isSafeInteger },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: false, strict: 'throw' },
);

const cancellationPolicySchema = new mongoose.Schema(
  {
    freeCancellationDaysBefore: { type: Number, min: 0, validate: Number.isSafeInteger },
    refundPercent: { type: Number, min: 0, max: 100, validate: Number.isSafeInteger },
  },
  { _id: false, strict: 'throw' },
);

const packageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, required: true, trim: true, maxlength: 120 },
    travelType: { type: String, required: true, trim: true, maxlength: 80 },
    summary: { type: String, trim: true, maxlength: 500 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    durationDays: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    nights: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    pricePerPersonMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    currency: currencyField,
    accommodation: { type: String, trim: true, maxlength: 200 },
    cancellationPolicy: { type: cancellationPolicySchema, required: true },
    included: [{ type: String, trim: true, maxlength: 300 }],
    excluded: [{ type: String, trim: true, maxlength: 300 }],
    images: { type: [mongoose.Schema.Types.Mixed], default: [] },
    imageAlt: { type: String, trim: true, maxlength: 300 },
    itinerary: { type: [itineraryDaySchema], default: [] },
    stops: { type: [stopSchema], default: [] },
    activityIds: {
      type: [{ type: ObjectId, ref: 'Activity' }],
      default: [],
      validate: { validator: uniqueObjectIds, message: 'activityIds must not contain duplicates.' },
    },
    averageRating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, min: 0, validate: Number.isSafeInteger },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', required: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

packageSchema.index({ slug: 1 }, { unique: true });
packageSchema.index({ destination: 1, travelType: 1, status: 1, pricePerPersonMinor: 1 });
packageSchema.index({ title: 'text', destination: 'text', summary: 'text', description: 'text' });

export default mongoose.model('Package', packageSchema, 'package');
