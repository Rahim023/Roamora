import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const heroSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 180 },
    revealText: { type: String, trim: true, maxlength: 180 },
    subtitle: { type: String, trim: true, maxlength: 500 },
    ctaLabel: { type: String, trim: true, maxlength: 100 },
    ctaHref: { type: String, trim: true, maxlength: 500 },
    images: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false, strict: 'throw' },
);

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    package: { type: ObjectId, ref: 'Package' },
  },
  { _id: false, strict: 'throw' },
);

const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, default: 'home', unique: true },
    hero: { type: heroSchema, required: true },
    destinations: { type: [destinationSchema], default: [] },
    trendingPackages: { type: [{ type: ObjectId, ref: 'Package' }], default: [] },
    featuredPackages: { type: [{ type: ObjectId, ref: 'Package' }], default: [] },
    travelCategories: [{ type: String, trim: true, maxlength: 100 }],
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

export default mongoose.model('SiteContent', siteContentSchema, 'sitecontents');
