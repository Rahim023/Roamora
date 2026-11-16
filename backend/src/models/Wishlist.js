import mongoose from 'mongoose';
import { uniqueObjectIds } from './modelHelpers.js';

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packages: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],
      default: [],
      validate: { validator: uniqueObjectIds, message: 'A package can only appear once in a wishlist.' },
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

wishlistSchema.index({ user: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema, 'wishlist');
