import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Writable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { Departure, Order, Package, Review, User } from '../models/index.js';

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
      ['get', '/users'], ['patch', `/users/${targetId}/promote`], ['get', '/reviews'], ['delete', `/reviews/${targetId}`],
      ['get', '/activities'], ['post', '/activities'], ['patch', `/activities/${targetId}`], ['delete', `/activities/${targetId}`],
      ['patch', '/site-content'], ['get', '/future-route'],
    ];
    for (const [method, suffix] of paths) {
      const path = `/api/admin${suffix}`;
      expect((await request(app)[method](path)).status).toBe(401);
      expect((await request(app)[method](path).set('Authorization', `Bearer ${forgedRoleToken}`)).status).toBe(403);
    }
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

  it('excludes demo payments and separates external totals by currency', async () => {
    authenticate();
    const countUsers = vi.spyOn(User, 'countDocuments').mockResolvedValue(1);
    const countPackages = vi.spyOn(Package, 'countDocuments').mockResolvedValue(2);
    const orderAggregate = vi.spyOn(Order, 'aggregate')
      .mockResolvedValueOnce([{ total: 3 }])
      .mockResolvedValueOnce([{ paid: [{ _id: 'CAD', amount: 10000 }, { _id: 'USD', amount: 5000 }], refunded: [{ _id: 'CAD', amount: 2000 }] }])
      .mockResolvedValueOnce([{ paid: [], refunded: [] }])
      .mockResolvedValueOnce([]);
    vi.spyOn(User, 'aggregate').mockResolvedValue([]);
    vi.spyOn(Order, 'find').mockReturnValue({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) });
    vi.spyOn(Departure, 'find').mockReturnValue({ sort: () => ({ limit: () => ({ populate: () => ({ lean: async () => [] }) }) }) });
    const response = await request(app).get('/api/admin/analytics').set('Authorization', authorization());
    expect(response.status).toBe(200);
    expect(response.body.metrics).toMatchObject({ confirmedBookings: 3, netExternalPayments: [{ currency: 'CAD', netMinor: 8000 }, { currency: 'USD', netMinor: 5000 }] });
    expect(countUsers).toHaveBeenCalledWith({ role: 'user' });
    expect(countPackages).toHaveBeenCalledWith({ status: 'active' });
    expect(orderAggregate.mock.calls[0][0]).toEqual([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $count: 'total' },
    ]);
    expect(orderAggregate.mock.calls[1][0][0].$facet.paid[0].$match.paymentMode).toBe('external');
    expect(orderAggregate.mock.calls[1][0][0].$facet.refunded[0].$match.paymentMode).toBe('external');
  });
});
