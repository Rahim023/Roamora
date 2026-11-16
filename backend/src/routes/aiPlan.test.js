import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import app from '../app.js';
import { Activity, User } from '../models/index.js';

const activityId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const input = { destination: 'Kyoto', durationDays: 1, budgetMinor: 10000, currency: 'CAD', travellerCount: 2, interests: [] };

function setup() {
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', '');
  vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: userId, isActive: true }) });
  vi.spyOn(Activity, 'find').mockReturnValue({
    limit: () => ({ lean: async () => [{ _id: activityId, name: 'Walk', currency: 'CAD', pricePerPersonMinor: 1000 }] }),
  });
  return jwt.sign({ sub: String(userId) }, 'test-secret');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  generateContent.mockReset();
});

describe('AI itinerary planning', () => {
  it('returns a validated plan and calculates its cost', async () => {
    const token = setup();
    generateContent.mockResolvedValue({
      text: JSON.stringify({ title: 'Kyoto', days: [{ day: 1, activities: [{ activity: String(activityId), sequence: 0 }] }] }),
    });
    const response = await request(app).post('/api/itineraries/plan').auth(token, { type: 'bearer' }).send(input);
    expect(response.status).toBe(200);
    expect(response.body.plan).toMatchObject({ title: 'Kyoto', estimatedActivitiesTotalMinor: 2000, currency: 'CAD' });
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.1-flash-lite' }));
  });

  it('rejects invented activity IDs', async () => {
    const token = setup();
    generateContent.mockResolvedValue({
      text: JSON.stringify({ days: [{ day: 1, activities: [{ activity: String(new mongoose.Types.ObjectId()), sequence: 0 }] }] }),
    });
    const response = await request(app).post('/api/itineraries/plan').auth(token, { type: 'bearer' }).send(input);
    expect(response.status).toBe(502);
    expect(response.body.error).toMatch(/unavailable activity/);
  });

  it('reports provider rate limiting', async () => {
    const token = setup();
    generateContent.mockRejectedValue({ status: 429 });
    const response = await request(app).post('/api/itineraries/plan').auth(token, { type: 'bearer' }).send(input);
    expect(response.status).toBe(429);
  });
});
