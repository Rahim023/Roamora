import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.hoisted(() => vi.fn());
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { sendBookingConfirmation, sendReviewRequestEmail } from './emailService.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('booking confirmation email', () => {
  it.each([
    ['smtp.gmail.com', 'abcd efgh ijkl mnop', 'abcdefghijklmnop'],
    ['SMTP.GMAIL.COM', 'abcd efgh ijkl mnop', 'abcdefghijklmnop'],
    ['smtp.example.com', 'abcd efgh ijkl mnop', 'abcd efgh ijkl mnop'],
    ['smtp.gmail.com', 'a different password', 'a different password'],
  ])('handles SMTP credentials for %s without changing unrelated passwords', async (host, password, expected) => {
    vi.stubEnv('SMTP_HOST', host);
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('SMTP_PASS', password);
    sendMail.mockResolvedValue({ accepted: ['traveller@example.com'] });
    const order = {
      _id: 'booking-id', bookingReference: 'ROA-123', currency: 'USD', totalMinor: 12000,
      packageSnapshot: { title: 'Mountain escape' }, startDate: new Date('2027-01-01T00:00:00Z'),
      travellerCount: 1, status: 'confirmed', paymentMode: 'demo',
      contact: { email: 'traveller@example.com' }, updateOne: vi.fn().mockResolvedValue({}),
    };
    await sendBookingConfirmation(order);
    expect(order.emailStatus).toBe('sent');
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: { user: 'sender@example.com', pass: expected } }));
  });

  it.each([
    ['demo', true],
    ['external', false],
  ])('describes payment correctly for %s bookings', async (paymentMode, showNotice) => {
    vi.stubEnv('SMTP_HOST', 'localhost');
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('SMTP_PASS', 'test');
    vi.stubEnv('CLIENT_ORIGIN', 'https://example.test');
    sendMail.mockResolvedValue({});
    const order = {
      _id: 'booking-id',
      bookingReference: 'ROA-123',
      currency: 'USD',
      totalMinor: 12000,
      packageSnapshot: { title: 'Mountain escape' },
      startDate: new Date('2027-01-01T00:00:00Z'),
      travellerCount: 1,
      status: 'confirmed',
      paymentMode,
      contact: { email: 'traveller@example.com' },
      updateOne: vi.fn().mockResolvedValue({}),
    };

    await sendBookingConfirmation(order);

    const message = sendMail.mock.calls[0][0];
    expect(message.text).not.toMatch(/demo/i);
    expect(message.html).not.toMatch(/demo/i);
    expect(message.text.includes('No payment was collected')).toBe(showNotice);
    expect(message.html.includes('No payment was collected')).toBe(showNotice);
    expect(message.text).toContain('https://example.test/booking/confirmation/booking-id');
    expect(message.html).toContain('https://example.test/booking/confirmation/booking-id');
    expect(order.updateOne).toHaveBeenCalledWith({ $set: { emailStatus: 'sent' } });
  });

  it('records an SMTP rejection as failed rather than sent', async () => {
    vi.stubEnv('SMTP_HOST', 'localhost');
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('SMTP_PASS', 'test');
    sendMail.mockResolvedValue({ accepted: [], rejected: ['traveller@example.com'] });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const order = {
      _id: 'booking-id', bookingReference: 'ROA-123', currency: 'USD', totalMinor: 12000,
      packageSnapshot: { title: 'Mountain escape' }, startDate: new Date('2027-01-01T00:00:00Z'),
      travellerCount: 1, status: 'confirmed', paymentMode: 'demo',
      contact: { email: 'traveller@example.com' }, updateOne: vi.fn().mockResolvedValue({}),
    };
    await sendBookingConfirmation(order);
    expect(order.emailStatus).toBe('failed');
    expect(order.updateOne).toHaveBeenCalledWith({ $set: { emailStatus: 'failed' } });
    log.mockRestore();
  });

  describe('review request email', () => {
    const order = () => ({
      _id: 'booking-id',
      contact: { email: 'traveller@example.com' },
      packageSnapshot: { title: 'Mountain escape' },
      updateOne: vi.fn().mockResolvedValue({}),
    });
    it('sends a sign-in review link and records delivery', async () => {
      vi.stubEnv('SMTP_HOST', 'localhost');
      vi.stubEnv('SMTP_USER', 'sender@example.com');
      vi.stubEnv('SMTP_PASS', 'test');
      vi.stubEnv('CLIENT_ORIGIN', 'https://example.test');
      sendMail.mockResolvedValue({});
      const booking = order();
      expect(await sendReviewRequestEmail(booking)).toBe('sent');
      expect(sendMail.mock.calls[0][0]).toMatchObject({ to: 'traveller@example.com', text: expect.stringContaining('https://example.test/review/booking-id') });
      expect(booking.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'sent' } });
    });
    it('records missing configuration and SMTP failures without claiming delivery', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubEnv('SMTP_HOST', '');
      const missing = order();
      expect(await sendReviewRequestEmail(missing)).toBe('not_configured');
      expect(sendMail).not.toHaveBeenCalled();
      vi.stubEnv('SMTP_HOST', 'localhost');
      vi.stubEnv('SMTP_USER', 'sender@example.com');
      vi.stubEnv('SMTP_PASS', 'test');
      sendMail.mockRejectedValue(new Error('unavailable'));
      const failed = order();
      expect(await sendReviewRequestEmail(failed)).toBe('failed');
      expect(failed.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'failed' } });
      log.mockRestore();
    });
    it('records an SMTP rejection as failed', async () => {
      vi.stubEnv('SMTP_HOST', 'localhost');
      vi.stubEnv('SMTP_USER', 'sender@example.com');
      vi.stubEnv('SMTP_PASS', 'test');
      sendMail.mockResolvedValue({ accepted: [] });
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const booking = order();
      expect(await sendReviewRequestEmail(booking)).toBe('failed');
      expect(booking.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'failed' } });
      log.mockRestore();
    });
  });
});
