import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const plannedActivitySchema = new mongoose.Schema(
  {
    activity: { type: ObjectId, ref: 'Activity', required: true },
    sequence: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { _id: false, strict: 'throw' },
);

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    activities: { type: [plannedActivitySchema], default: [] },
  },
  { _id: false, strict: 'throw' },
);

const itinerarySchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    destination: { type: String, trim: true, maxlength: 120 },
    currency: { type: String, uppercase: true, match: /^[A-Z]{3}$/, default: 'CAD' },
    travellerCount: { type: Number, min: 1, default: 1, validate: Number.isSafeInteger },
    days: { type: [itineraryDaySchema], default: [] },
    estimatedActivitiesTotalMinor: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },
    estimateIncludes: [{ type: String, trim: true, maxlength: 300 }],
    estimateExcludes: [{ type: String, trim: true, maxlength: 300 }],
    source: { type: String, enum: ['manual', 'ai', 'package'], default: 'manual' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

itinerarySchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('Itinerary', itinerarySchema, 'iteneraries');
