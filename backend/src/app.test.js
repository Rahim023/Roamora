import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './app.js';

describe('API entry points', () => {
  it('exposes an API health check without database writes', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      database: expect.any(String),
    });
  });

  it('rejects unauthenticated wishlist requests', async () => {
    const response = await request(app).get('/api/wishlist');
    expect(response.status).toBe(401);
  });

  it('rejects unvalidated booking requests without a token', async () => {
    const response = await request(app).post('/api/orders').send({});
    expect(response.status).toBe(401);
  });

  it('returns a client error for invalid registration input', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('password');
  });
});
