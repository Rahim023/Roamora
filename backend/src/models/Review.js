import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isSafeInteger },
    title: { type: String, trim: true, maxlength: 160 },
    comment: { type: String, required: true, trim: true, minlength: 5, maxlength: 4000 },
    isPublished: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

reviewSchema.index({ user: 1, package: 1 }, { unique: true });
reviewSchema.index({ package: 1, isPublished: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema, 'reviews');
