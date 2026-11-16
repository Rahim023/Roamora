import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent }; } }));

import app from '../app.js';
import { Activity, Departure, Package, SiteContent } from '../models/index.js';

const query = (value) => {
  const chain = { select: () => chain, limit: () => chain, lean: async () => value };
  return chain;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  generateContent.mockReset();
});

describe('Travo', () => {
  it('sends public catalogue and conversation to Gemini, and returns its response', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const id = new mongoose.Types.ObjectId();
    const packages = vi.spyOn(Package, 'find').mockReturnValue(query([{ _id: id, title: 'Kyoto', currency: 'CAD', pricePerPersonMinor: 125000 }]));
    vi.spyOn(Activity, 'find').mockReturnValue(query([]));
    vi.spyOn(Departure, 'find').mockReturnValue(query([]));
    vi.spyOn(SiteContent, 'findOne').mockReturnValue(query({ travelCategories: ['Culture'] }));
    generateContent.mockResolvedValue({ text: 'What dates work for you?' });
    const messages = [{ role: 'user', text: 'My budget is CAD 2000.' }];
    const response = await request(app).post('/api/travo').send({ messages });
    expect(response.status).toBe(200);
    expect(response.body.reply).toBe('What dates work for you?');
    expect(packages).toHaveBeenCalledWith({ status: 'active' });
    expect(generateContent.mock.calls[0][0].config.systemInstruction).toContain('Kyoto');
    expect(generateContent.mock.calls[0][0].contents).toEqual([{ role: 'user', parts: [{ text: messages[0].text }] }]);
  });

  it('rejects invalid conversations and reports missing configuration', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    expect((await request(app).post('/api/travo').send({ messages: [] })).status).toBe(400);
    expect((await request(app).post('/api/travo').send({ messages: [{ role: 'model', text: 'Hi' }] })).status).toBe(400);
    expect((await request(app).post('/api/travo').send({ messages: [{ role: 'user', text: 'Hi' }] })).status).toBe(503);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('reports provider failures instead of returning a canned answer', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.spyOn(Package, 'find').mockReturnValue(query([]));
    vi.spyOn(Activity, 'find').mockReturnValue(query([]));
    vi.spyOn(Departure, 'find').mockReturnValue(query([]));
    vi.spyOn(SiteContent, 'findOne').mockReturnValue(query(null));
    generateContent.mockRejectedValue({ status: 429 });
    const response = await request(app).post('/api/travo').send({ messages: [{ role: 'user', text: 'Hi' }] });
    expect(response.status).toBe(429);
  });
});
