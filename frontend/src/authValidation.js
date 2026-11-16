import { z } from 'zod';

export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(128)
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^a-zA-Z0-9\s]/, 'Include a special character.')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password must be at most 72 UTF-8 bytes.');
