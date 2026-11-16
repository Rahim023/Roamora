import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { Activity, Departure, Order, Package, Review, User } from '../models/index.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('activity discovery', () => {
  it('filters exact destinations and currency before applying the catalogue limit', async () => {
    const chain = { sort: () => chain, limit: () => chain, lean: async () => [] };
    const find = vi.spyOn(Activity, 'find').mockReturnValue(chain);
    const response = await request(app).get('/api/activities').query({ destination: ' York. ', match: 'exact', currency: 'cad' });
    expect(response.status).toBe(200);
    const filter = find.mock.calls[0][0];
    expect(filter).toMatchObject({ isActive: true, currency: 'CAD' });
    expect(filter.destination.test('york.')).toBe(true);
    expect(filter.destination.test('New York.')).toBe(false);
    expect(filter.destination.test('YorkX')).toBe(false);
  });

  it('preserves partial destination search and rejects invalid currencies', async () => {
    const chain = { sort: () => chain, limit: () => chain, lean: async () => [] };
    const find = vi.spyOn(Activity, 'find').mockReturnValue(chain);
    expect((await request(app).get('/api/activities').query({ destination: 'York' })).status).toBe(200);
    expect(find.mock.calls[0][0].destination.test('New York')).toBe(true);
    expect((await request(app).get('/api/activities').query({ currency: 'invalid' })).status).toBe(400);
  });
});

describe('review eligibility', () => {
  it('requires authentication and returns one unreviewed completed booking per journey', async () => {
    const userId = new mongoose.Types.ObjectId();
    const reviewedPackage = new mongoose.Types.ObjectId();
    const pendingPackage = new mongoose.Types.ObjectId();
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: userId, role: 'user', isActive: true }) });
    const orders = [
      { _id: 'newest', package: pendingPackage, packageSnapshot: { title: 'Pending' } },
      { _id: 'older', package: pendingPackage },
      { _id: 'reviewed', package: reviewedPackage },
    ];
    const findOrders = vi.spyOn(Order, 'find').mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => orders }) }) });
    const findReviews = vi.spyOn(Review, 'find').mockReturnValue({ select: () => ({ lean: async () => [{ package: reviewedPackage }] }) });
    const url = '/api/reviews/pending';
    expect((await request(app).get(url)).status).toBe(401);
    const response = await request(app).get(url).set('Authorization', `Bearer ${jwt.sign({ sub: String(userId) }, 'test-secret')}`);
    expect(response.status).toBe(200);
    expect(response.body.items.map((item) => item._id)).toEqual(['newest']);
    expect(findOrders).toHaveBeenCalledWith({ user: userId, status: 'completed' });
    expect(findReviews).toHaveBeenCalledWith({ user: userId });
  });

  it('only accepts a review for the authenticated traveller’s completed booking', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const packageId = new mongoose.Types.ObjectId();
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: userId, role: 'user', isActive: true }) });
    const exists = vi.spyOn(Order, 'exists').mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: bookingId });
    const create = vi.spyOn(Review, 'create').mockImplementation(async (input) => input);
    const auth = `Bearer ${jwt.sign({ sub: String(userId) }, 'test-secret')}`;
    const body = { bookingId: String(bookingId), packageId: String(packageId), rating: 4, comment: 'A lovely journey.' };
    expect((await request(app).post('/api/reviews').set('Authorization', auth).send(body)).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect((await request(app).post('/api/reviews').set('Authorization', auth).send(body)).status).toBe(201);
    expect(exists).toHaveBeenCalledWith({ _id: String(bookingId), user: userId, package: String(packageId), status: 'completed' });
  });
});

describe('credentials', () => {
  it('normalizes email addresses before validating registration and login', () => {
    expect(registerSchema.parse({ name: ' Traveller ', email: ' TEST@example.com ', password: 'pass123!' }))
      .toMatchObject({ name: 'Traveller', email: 'test@example.com' });
    expect(loginSchema.parse({ email: ' TEST@example.com ', password: 'password' }).email)
      .toBe('test@example.com');
  });

  describe('package currency filters', () => {
    it('filters budget amounts by the requested currency', async () => {
      const chain = { sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => [] };
      const find = vi.spyOn(Package, 'find').mockReturnValue(chain);
      vi.spyOn(Package, 'countDocuments').mockResolvedValue(0);
      const response = await request(app).get('/api/packages?currency=CAD&maxPrice=200050');
      expect(response.status).toBe(200);
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ currency: 'CAD', pricePerPersonMinor: { $lte: 200050 } }));
    });

    it('rejects unsupported currencies', async () => {
      expect((await request(app).get('/api/packages?currency=EUR')).status).toBe(400);
    });
  });

  it('enforces registration password requirements without changing login rules', () => {
    const input = { name: 'Traveller', email: 'test@example.com' };
    for (const password of ['abc1!', 'ABCDEFG1!', 'abcdefgh!', 'abcdefg1', 'é'.repeat(36) + 'a1!']) {
      expect(registerSchema.safeParse({ ...input, password }).success).toBe(false);
    }
    expect(registerSchema.safeParse({ ...input, password: 'abcdef1!' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: input.email, password: 'old' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...input, email: 'bad@', password: 'abcdef1!' }).success).toBe(false);
  });
});

describe('Google authentication', () => {
  const payload = { sub: 'google-subject', email: 'Traveler@example.com', email_verified: true, name: 'Traveler' };

  it('verifies the audience and creates a user from a verified Google identity', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client');
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const verify = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload });
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const create = vi.spyOn(User, 'create').mockImplementation(async (input) => ({ ...input, _id: new mongoose.Types.ObjectId() }));
    const response = await request(app).post('/api/auth/google').send({ credential: 'token' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ token: expect.any(String), user: { email: 'traveler@example.com', role: 'user' } });
    expect(verify).toHaveBeenCalledWith({ idToken: 'token', audience: 'test-client' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ googleId: payload.sub, authProvider: 'google', role: 'user' }));
  });

  it('rejects invalid tokens and unverified emails without querying accounts', async () => {
    const find = vi.spyOn(User, 'findOne');
    const verify = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(new Error('invalid token'))
      .mockResolvedValueOnce({ getPayload: () => ({ ...payload, email_verified: false }) });
    expect((await request(app).post('/api/auth/google').send({ credential: 'bad' })).status).toBe(401);
    expect((await request(app).post('/api/auth/google').send({ credential: 'unverified' })).status).toBe(401);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(find).not.toHaveBeenCalled();
  });

  it('does not link a Google identity to an existing account by email', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload });
    vi.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce({ email: payload.email });
    const create = vi.spyOn(User, 'create');
    const response = await request(app).post('/api/auth/google').send({ credential: 'token' });
    expect(response.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it('signs in a linked subject but rejects inactive accounts', async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => payload });
    const user = { _id: new mongoose.Types.ObjectId(), email: 'traveler@example.com', name: 'Traveler', role: 'user', isActive: true };
    const find = vi.spyOn(User, 'findOne').mockResolvedValue(user);
    expect((await request(app).post('/api/auth/google').send({ credential: 'token' })).status).toBe(200);
    expect(find).toHaveBeenCalledWith({ googleId: payload.sub });
    user.isActive = false;
    expect((await request(app).post('/api/auth/google').send({ credential: 'token' })).status).toBe(403);
  });
});

describe('public reviews', () => {
  it('uses the same visibility rule for review listing and summary', async () => {
    const id = new mongoose.Types.ObjectId();
    const listing = { populate: () => listing, sort: () => listing, skip: () => listing, limit: () => listing, lean: async () => [] };
    const findReviews = vi.spyOn(Review, 'find').mockReturnValue(listing);
    const countReviews = vi.spyOn(Review, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Package, 'findOne').mockReturnValue({ lean: async () => ({ _id: id, averageRating: 4, reviewCount: 2 }) });
    vi.spyOn(Departure, 'find').mockReturnValue({ sort: () => ({ lean: async () => [] }) });
    const aggregate = vi.spyOn(Review, 'aggregate').mockResolvedValue([]);

    const listResponse = await request(app).get(`/api/packages/${id}/reviews`);
    const detailResponse = await request(app).get(`/api/packages/${id}`);

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(findReviews).toHaveBeenCalledWith({ package: String(id), isPublished: { $ne: false } });
    expect(countReviews).toHaveBeenCalledWith({ package: String(id), isPublished: { $ne: false } });
    expect(aggregate.mock.calls[0][0][0]).toEqual({ $match: { package: id, isPublished: { $ne: false } } });
    expect(detailResponse.body).toMatchObject({ averageRating: 0, reviewCount: 0 });
  });

  describe('removing cancelled trips', () => {
    const userId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const token = () => jwt.sign({ sub: String(userId) }, 'test-secret');
    const authenticate = () => {
      vi.stubEnv('JWT_SECRET', 'test-secret');
      vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: userId, role: 'user', isActive: true }) });
    };

    it('hides an owned cancelled booking without deleting its record', async () => {
      authenticate();
      const update = vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValue({ _id: orderId });
      const remove = vi.spyOn(Order, 'deleteOne');
      const response = await request(app).patch(`/api/orders/${orderId}/hide`).set('Authorization', `Bearer ${token()}`);
      expect(response.status).toBe(200);
      expect(update).toHaveBeenCalledWith(
        { _id: String(orderId), user: userId, status: 'cancelled' },
        { $set: { hiddenFromTrips: true } },
        { new: true },
      );
      expect(remove).not.toHaveBeenCalled();
    });

    it('rejects active and other users’ bookings and requires authentication', async () => {
      authenticate();
      vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null);
      const exists = vi.spyOn(Order, 'exists').mockResolvedValueOnce({ _id: orderId }).mockResolvedValueOnce(null);
      const url = `/api/orders/${orderId}/hide`;
      expect((await request(app).patch(url)).status).toBe(401);
      expect((await request(app).patch(url).set('Authorization', `Bearer ${token()}`)).status).toBe(409);
      expect((await request(app).patch(url).set('Authorization', `Bearer ${token()}`)).status).toBe(404);
      expect(exists).toHaveBeenCalledWith({ _id: String(orderId), user: userId });
    });

    it('excludes hidden bookings, including when filtering by status', async () => {
      authenticate();
      const find = vi.spyOn(Order, 'find').mockReturnValue({ sort: () => ({ lean: async () => [] }) });
      const response = await request(app).get('/api/orders/mine?status=cancelled').set('Authorization', `Bearer ${token()}`);
      expect(response.status).toBe(200);
      expect(find).toHaveBeenCalledWith({ user: userId, hiddenFromTrips: { $ne: true }, status: 'cancelled' });
    });
  });
});
