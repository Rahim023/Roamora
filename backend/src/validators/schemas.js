import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.');
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const currencyCode = z.string().trim().length(3).transform((value) => value.toUpperCase());
const traveller = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['adult', 'child', 'infant']).default('adult'),
});

export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(128)
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^a-zA-Z0-9\s]/, 'Include a special character.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password: passwordSchema,
  country: z.string().trim().max(100).optional(),
});

export const resetRequestSchema = z.object({ email });
export const resetVerifySchema = z.object({ email, code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.') });
export const resetCompleteSchema = z.object({ email, token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema });

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const orderSchema = z.object({
  packageId: objectId,
  departureId: objectId,
  travellerCount: z.number().int().min(1).max(20),
  travellers: z.array(traveller).min(1).max(20),
  contact: z.object({ name: z.string().trim().min(1).max(120), email }),
  idempotencyKey: z.string().trim().min(8).max(128),
}).refine((value) => value.travellerCount === value.travellers.length, {
  path: ['travellerCount'],
  message: 'Traveller count must match the traveller details.',
});

export const reviewSchema = z.object({
  packageId: objectId,
  bookingId: objectId,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional(),
  comment: z.string().trim().min(5).max(4000),
});

export const itinerarySchema = z.object({
  title: z.string().trim().min(1).max(180),
  destination: z.string().trim().max(120).optional(),
  currency: currencyCode.default('CAD'),
  travellerCount: z.number().int().min(1).max(20).default(1),
  source: z.enum(['manual', 'ai', 'package']).default('manual'),
  days: z.array(z.object({
    day: z.number().int().min(1),
    activities: z.array(z.object({
      activity: objectId,
      sequence: z.number().int().min(0),
    })).max(50),
  })).min(1).max(60),
});

export const packageSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  destination: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  travelType: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().min(1).max(10000),
  durationDays: z.number().int().min(1).max(365),
  nights: z.number().int().min(0).max(365),
  pricePerPersonMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  currency: currencyCode.default('CAD'),
  accommodation: z.string().max(200).optional(),
  cancellationPolicy: z.object({
    freeCancellationDaysBefore: z.number().int().min(0),
    refundPercent: z.number().int().min(0).max(100),
  }),
  included: z.array(z.string().max(300)).default([]),
  excluded: z.array(z.string().max(300)).default([]),
  images: z.array(z.unknown()).default([]),
  imageAlt: z.string().max(300).optional(),
  itinerary: z.array(z.object({
    day: z.number().int().min(1),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(4000).optional(),
    activities: z.array(objectId).default([]),
  })).default([]),
  stops: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    day: z.number().int().min(1).optional(),
    sequence: z.number().int().min(1).optional(),
    description: z.string().max(2000).optional(),
  })).default([]),
  activityIds: z.array(objectId).default([]),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const departureSchema = z.object({
  package: objectId,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  capacity: z.number().int().min(0),
  pricePerPersonMinor: z.number().int().min(0),
  currency: currencyCode.default('CAD'),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
});

export const aiPlanSchema = z.object({
  destination: z.string().trim().min(2).max(120),
  durationDays: z.number().int().min(1).max(30),
  budgetMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  currency: currencyCode.default('CAD'),
  travellerCount: z.number().int().min(1).max(20).default(1),
  interests: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
});
