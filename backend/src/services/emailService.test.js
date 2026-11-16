import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { sendBookingConfirmation, sendReviewRequestEmail } from './emailService.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('booking confirmation email', () => {
  it.each([
    ['demo', true],
    ['external', false],
  ])('describes payment correctly for %s bookings', async (paymentMode, showNotice) => {
    vi.stubEnv('SMTP_HOST', 'localhost');
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('SMTP_PASS', 'test');
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
    expect(order.updateOne).toHaveBeenCalledWith({ $set: { emailStatus: 'sent' } });
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
      vi.stubEnv('SMTP_HOST', '');
      const missing = order();
      expect(await sendReviewRequestEmail(missing)).toBe('not_configured');
      expect(sendMail).not.toHaveBeenCalled();
      vi.stubEnv('SMTP_HOST', 'localhost');
      vi.stubEnv('SMTP_USER', 'sender@example.com');
      vi.stubEnv('SMTP_PASS', 'test');
      sendMail.mockRejectedValue(new Error('unavailable'));
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failed = order();
      expect(await sendReviewRequestEmail(failed)).toBe('failed');
      expect(failed.updateOne).toHaveBeenCalledWith({ $set: { reviewEmailStatus: 'failed' } });
      log.mockRestore();
    });
  });
});
