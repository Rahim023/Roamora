import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema({
  codeHash: String,
  tokenHash: String,
  expiresAt: Date,
  requestedAt: Date,
  attempts: Number,
}, { _id: false, strict: 'throw' });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    country: { type: String, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String },
    passwordHash: { type: String, default: null, select: false },
    tokenVersion: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    passwordReset: { type: passwordResetSchema, select: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, strict: 'throw' },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, country: 1 });

export default mongoose.model('User', userSchema, 'users');
