import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Writable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { Departure, Order, Package, Review, SiteContent, User } from '../models/index.js';

const adminId = new mongoose.Types.ObjectId();
const targetId = new mongoose.Types.ObjectId();
const token = () => jwt.sign({ sub: String(adminId) }, 'test-secret');
const authorization = () => `Bearer ${token()}`;

function authenticate(role = 'admin') {
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: adminId, role, isActive: true }) });
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('admin management', () => {
  it('rejects anonymous and non-admin access to all admin API areas, even with an admin role in the token', async () => {
    authenticate('user');
    const forgedRoleToken = jwt.sign({ sub: String(adminId), role: 'admin' }, 'test-secret');
    const paths = [
      ['get', '/analytics'], ['get', '/packages'], ['post', '/packages'], ['patch', `/packages/${targetId}`], ['delete', `/packages/${targetId}`],
      ['post', '/uploads/package-image'], ['get', '/departures'], ['post', '/departures'], ['patch', `/departures/${targetId}`],
      ['get', '/orders'], ['patch', `/orders/${targetId}/complete`], ['post', `/orders/${targetId}/email/retry`], ['post', `/orders/${targetId}/review-email/retry`],
      ['get', '/users'], ['patch', `/users/${targetId}/promote`], ['patch', `/users/${targetId}`], ['get', '/reviews'], ['delete', `/reviews/${targetId}`],
      ['get', '/activities'], ['post', '/activities'], ['patch', `/activities/${targetId}`], ['delete', `/activities/${targetId}`],
      ['patch', '/site-content'], ['patch', '/site-content/destinations'], ['get', '/future-route'],
    ];
    for (const [method, suffix] of paths) {
      const path = `/api/admin${suffix}`;
      expect((await request(app)[method](path)).status).toBe(401);
      expect((await request(app)[method](path).set('Authorization', `Bearer ${forgedRoleToken}`)).status).toBe(403);
    }
  });

  it('updates homepage destinations only when the loaded revision is current', async () => {
    authenticate();
    const existing = { _id: targetId, __v: 2, hero: { heading: 'Keep me' }, destinations: [] };
    vi.spyOn(SiteContent, 'findOne').mockReturnValue({ lean: async () => existing });
    const update = vi.spyOn(SiteContent, 'findOneAndUpdate').mockResolvedValueOnce({ ...existing, __v: 3 }).mockResolvedValueOnce(null);
    const body = { destinations: [{ name: 'Kyoto', country: 'Japan' }], version: { id: String(targetId), revision: 2 } };
    const url = '/api/admin/site-content/destinations';
    expect((await request(app).patch(url).set('Authorization', authorization()).send(body)).status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      { _id: targetId, __v: 2 }, { $set: { destinations: body.destinations }, $inc: { __v: 1 } }, { new: true, runValidators: true },
    );
    expect((await request(app).patch(url).set('Authorization', authorization()).send(body)).status).toBe(409);
  });

  it('creates homepage content with a hero when none exists', async () => {
    authenticate();
    vi.spyOn(SiteContent, 'findOne').mockReturnValue({ lean: async () => null });
    const create = vi.spyOn(SiteContent, 'create').mockImplementation(async (input) => input);
    const response = await request(app).patch('/api/admin/site-content/destinations').set('Authorization', authorization())
      .send({ destinations: [{ name: 'Banff' }], version: null });
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith({ key: 'homepage', hero: {}, destinations: [{ name: 'Banff' }] });
  });

  it('rejects a stale homepage identity and accepts an unversioned legacy record once', async () => {
    authenticate();
    vi.spyOn(SiteContent, 'findOne').mockReturnValue({ lean: async () => ({ _id: targetId }) });
    const update = vi.spyOn(SiteContent, 'findOneAndUpdate').mockResolvedValue({ _id: targetId, __v: 1 });
    const url = '/api/admin/site-content/destinations';
    const destinations = [{ name: 'Banff', country: null, package: null }];
    expect((await request(app).patch(url).set('Authorization', authorization()).send({ destinations, version: null })).status).toBe(409);
    expect(update).not.toHaveBeenCalled();
    expect((await request(app).patch(url).set('Authorization', authorization()).send({ destinations, version: { id: String(targetId), revision: null } })).status).toBe(200);
    expect(update.mock.calls[0][0]).toEqual({ _id: targetId, __v: { $exists: false } });
  });

  it('promotes only an active user and rejects an unavailable target', async () => {
    authenticate();
    const update = vi.spyOn(User, 'findOneAndUpdate').mockResolvedValueOnce({ _id: targetId, name: 'Test', email: 'test@example.com', role: 'admin' }).mockResolvedValueOnce(null);
    vi.spyOn(User, 'exists').mockResolvedValue({ _id: targetId });
    const url = `/api/admin/users/${targetId}/promote`;
    expect((await request(app).patch(url).set('Authorization', authorization())).body.user.role).toBe('admin');
    expect(update).toHaveBeenCalledWith(
      { _id: String(targetId), role: 'user', isActive: { $ne: false } },
      { $set: { role: 'admin' } }, { new: true, runValidators: true },
    );
    expect((await request(app).patch(url).set('Authorization', authorization())).status).toBe(409);
  });

  it('updates account details and invalidates sessions on security changes', async () => {
    authenticate();
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const target = { _id: targetId, name: 'Before', email: 'old@example.com', role: 'user', isActive: true, tokenVersion: 2, updatedAt,
      set: vi.fn(function (key, value) { if (typeof key === 'string') this[key] = value; else Object.assign(this, key); }),
      save: vi.fn().mockResolvedValue(undefined) };
    User.findById.mockImplementation((id) => String(id) === String(adminId)
      ? { select: async () => ({ _id: adminId, role: 'admin', isActive: true }) }
      : { session: async () => target });
    const session = { withTransaction: async (callback) => callback(), endSession: vi.fn() };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    const lock = vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ _id: adminId });
    const response = await request(app).patch(`/api/admin/users/${targetId}`).set('Authorization', authorization()).send({
      name: 'After', email: 'NEW@example.com', role: 'admin', isActive: true, updatedAt: updatedAt.toISOString(),
    });
    expect(response.status).toBe(200);
    expect(target).toMatchObject({ name: 'After', email: 'new@example.com', role: 'admin', tokenVersion: 3 });
    expect(target.set).toHaveBeenCalledWith('passwordReset', undefined);
    expect(lock).toHaveBeenCalledWith({ _id: adminId, role: 'admin', isActive: true }, { $inc: { __v: 1 } }, { new: true, session, timestamps: false });
    expect(session.endSession).toHaveBeenCalled();
  });

  it('rejects self-demotion and stale account edits', async () => {
    authenticate();
    const body = { name: 'Admin', email: 'admin@example.com', role: 'user', isActive: true, updatedAt: '2026-01-01T00:00:00.000Z' };
    expect((await request(app).patch(`/api/admin/users/${String(adminId).toUpperCase()}`).set('Authorization', authorization()).send(body)).status).toBe(409);
    const target = { updatedAt: new Date('2026-01-02T00:00:00.000Z') };
    User.findById.mockImplementation((id) => String(id) === String(adminId)
      ? { select: async () => ({ _id: adminId, role: 'admin', isActive: true }) }
      : { session: async () => target });
    const session = { withTransaction: async (callback) => callback(), endSession: vi.fn() };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    vi.spyOn(User, 'findOneAndUpdate').mockResolvedValue({ _id: adminId });
    expect((await request(app).patch(`/api/admin/users/${targetId}`).set('Authorization', authorization()).send(body)).status).toBe(409);
    expect(session.endSession).toHaveBeenCalled();
  });

  it('rejects a token when the administrator account is inactive', async () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.spyOn(User, 'findById').mockReturnValue({ select: async () => ({ _id: adminId, role: 'admin', isActive: false }) });
    expect((await request(app).get('/api/admin/users').set('Authorization', authorization())).status).toBe(401);
  });

  it('atomically completes only confirmed bookings and rejects other statuses', async () => {
    authenticate();
    vi.stubEnv('SMTP_HOST', '');
    const order = { _id: targetId, user: adminId, package: targetId, status: 'completed', updateOne: vi.fn().mockResolvedValue({}) };
    const update = vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValueOnce(order).mockResolvedValueOnce(null);
    vi.spyOn(Review, 'exists').mockResolvedValue(null);
    vi.spyOn(Order, 'exists').mockResolvedValue({ _id: targetId });
    const url = `/api/admin/orders/${targetId}/complete`;
    const response = await request(app).patch(url).set('Authorization', authorization());
    expect(response.body.order).toMatchObject({ status: 'completed', reviewEmailStatus: 'not_configured' });
    expect(order.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'not_configured' } });
    expect(update).toHaveBeenCalledWith({ _id: String(targetId), status: 'confirmed' }, { $set: { status: 'completed', reviewEmailStatus: 'pending', reviewEmailAttemptedAt: expect.any(Date) } }, { new: true, runValidators: true });
    expect((await request(app).patch(url).set('Authorization', authorization())).status).toBe(409);
  });

  it('does not request another review when the journey was already reviewed', async () => {
    authenticate();
    const order = { _id: targetId, user: adminId, package: targetId, status: 'completed', updateOne: vi.fn().mockResolvedValue({}) };
    vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(order);
    vi.spyOn(Review, 'exists').mockResolvedValue({ _id: targetId });
    const response = await request(app).patch(`/api/admin/orders/${targetId}/complete`).set('Authorization', authorization());
    expect(response.body.order.reviewEmailStatus).toBe('not_needed');
    expect(order.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'not_needed' } });
  });

  it('claims a failed review email before retrying and rejects an unclaimable attempt', async () => {
    authenticate();
    vi.stubEnv('SMTP_HOST', '');
    const order = { _id: targetId, user: adminId, package: targetId, status: 'completed', updateOne: vi.fn().mockResolvedValue({}) };
    const claim = vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValueOnce(order).mockResolvedValueOnce(null);
    vi.spyOn(Review, 'exists').mockResolvedValue(null);
    const url = `/api/admin/orders/${targetId}/review-email/retry`;
    const response = await request(app).post(url).set('Authorization', authorization());
    expect(response.body.order.reviewEmailStatus).toBe('not_configured');
    expect(claim.mock.calls[0][0]).toMatchObject({ _id: String(targetId), status: 'completed', $or: expect.any(Array) });
    expect((await request(app).post(url).set('Authorization', authorization())).status).toBe(409);
  });
  it('atomically claims an unsent confirmation and rejects an unclaimable attempt', async () => {
    authenticate();
    vi.stubEnv('SMTP_HOST', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const order = { _id: targetId, status: 'confirmed', updateOne: vi.fn().mockResolvedValue({}) };
    const claim = vi.spyOn(Order, 'findOneAndUpdate').mockResolvedValueOnce(order).mockResolvedValueOnce(null);
    const url = `/api/admin/orders/${targetId}/email/retry`;
    const response = await request(app).post(url).set('Authorization', authorization());
    expect(response.status).toBe(200);
    expect(response.body.order.emailStatus).toBe('not_sent_demo');
    expect(claim).toHaveBeenCalledWith(
      { _id: String(targetId), status: 'confirmed', $or: [
        { emailStatus: { $in: ['failed', 'not_sent_demo'] } },
        { emailStatus: 'pending', emailAttemptedAt: { $lt: expect.any(Date) } },
        { emailStatus: 'pending', emailAttemptedAt: { $exists: false }, createdAt: { $lt: expect.any(Date) } },
      ] },
      { $set: { emailStatus: 'pending', emailAttemptedAt: expect.any(Date) } },
      { new: true, runValidators: true },
    );
    expect((await request(app).post(url).set('Authorization', authorization())).status).toBe(409);
    log.mockRestore();
  });
  it('validates uploads and returns the secure Cloudinary URL', async () => {
    authenticate();
    const url = '/api/admin/uploads/package-image';
    const bad = await request(app).post(url).set('Authorization', authorization()).attach('image', Buffer.from('not an image'), { filename: 'fake.png', contentType: 'image/png' });
    expect(bad.status).toBe(400);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    expect((await request(app).post(url).set('Authorization', authorization()).attach('image', png, { filename: 'test.png', contentType: 'image/png' })).status).toBe(503);
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test');
    vi.stubEnv('CLOUDINARY_API_KEY', 'test');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'test');
    vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((_options, callback) => new Writable({
      write(_chunk, _encoding, done) { done(); },
      final(done) { callback(null, { secure_url: 'https://res.cloudinary.com/test/image/upload/trip.png' }); done(); },
    }));
    const uploaded = await request(app).post(url).set('Authorization', authorization()).attach('image', png, { filename: 'test.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.url).toBe('https://res.cloudinary.com/test/image/upload/trip.png');
  });

  it('persists the uploaded image URL with a journey', async () => {
    authenticate();
    const create = vi.spyOn(Package, 'create').mockImplementation(async (input) => input);
    const image = 'https://res.cloudinary.com/test/image/upload/trip.png';
    const response = await request(app).post('/api/admin/packages').set('Authorization', authorization()).send({
      title: 'Journey', slug: 'journey', destination: 'Test', country: 'Canada', travelType: 'Nature',
      description: 'A trip', durationDays: 2, nights: 1, pricePerPersonMinor: 12000, currency: 'CAD',
      cancellationPolicy: { freeCancellationDaysBefore: 1, refundPercent: 0 }, images: [image],
    });
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ images: [image] }));
  });

  it('reports booking values by currency and booking month without treating them as payments', async () => {
    authenticate();
    const countUsers = vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
    const countPackages = vi.spyOn(Package, 'countDocuments').mockResolvedValue(2);
    const orderAggregate = vi.spyOn(Order, 'aggregate')
      .mockResolvedValueOnce([{ total: 3 }])
      .mockResolvedValueOnce([{ paid: [{ _id: 'CAD', amount: 10000 }, { _id: 'USD', amount: 5000 }], refunded: [{ _id: 'CAD', amount: 2000 }] }])
      .mockResolvedValueOnce([{ paid: [], refunded: [] }])
      .mockResolvedValueOnce([{ _id: 'CAD', amount: 12000 }, { _id: 'USD', amount: 8000 }])
      .mockResolvedValueOnce([{ _id: { period: '2026-03', currency: 'CAD' }, amount: 12000 }, { _id: { period: '2026-03', currency: 'USD' }, amount: 8000 }])
      .mockResolvedValueOnce([{ _id: 'CAD', amount: 12000 }])
      .mockResolvedValueOnce([]);
    vi.spyOn(User, 'aggregate').mockResolvedValue([]);
    vi.spyOn(Order, 'find').mockReturnValue({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) });
    const findDepartures = vi.spyOn(Departure, 'find').mockReturnValue({ sort: () => ({ limit: () => ({ populate: () => ({ lean: async () => [] }) }) }) });
    const response = await request(app).get('/api/admin/analytics').set('Authorization', authorization());
    expect(response.status).toBe(200);
    expect(response.body.metrics).toMatchObject({ confirmedBookings: 3, netExternalPayments: [{ currency: 'CAD', netMinor: 8000 }, { currency: 'USD', netMinor: 5000 }] });
    expect(response.body.metrics.expectedThisMonth).toEqual([{ currency: 'CAD', amountMinor: 12000 }]);
    expect(response.body.metrics.bookingValue).toEqual([{ currency: 'CAD', amountMinor: 12000 }, { currency: 'USD', amountMinor: 8000 }]);
    expect(response.body.bookingValueByPeriod).toEqual([{ period: '2026-03', currency: 'CAD', amountMinor: 12000 }, { period: '2026-03', currency: 'USD', amountMinor: 8000 }]);
    expect(countUsers).toHaveBeenCalledWith({ role: 'user' });
    expect(countPackages).toHaveBeenCalledWith({ status: 'active' });
    expect(findDepartures).toHaveBeenCalledWith({ status: 'scheduled', startDate: { $gte: expect.any(Date) } });
    expect(orderAggregate.mock.calls[0][0]).toEqual([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $count: 'total' },
    ]);
    for (const index of [3, 4, 5]) {
      expect(orderAggregate.mock.calls[index][0][0].$match.status.$in).toEqual(['confirmed', 'completed']);
      expect(orderAggregate.mock.calls[index][0][1].$group.amount).toEqual({ $sum: '$totalMinor' });
    }
    expect(orderAggregate.mock.calls[4][0][1].$group._id).toEqual({ period: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, currency: '$currency' });
    const monthRange = orderAggregate.mock.calls[5][0][0].$match.createdAt;
    expect(monthRange.$gte.getUTCDate()).toBe(1);
    expect(monthRange.$lt.getUTCDate()).toBe(1);
    expect(monthRange.$lt.getTime()).toBeGreaterThan(monthRange.$gte.getTime());
  });
});
