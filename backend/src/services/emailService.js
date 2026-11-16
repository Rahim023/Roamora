import nodemailer from 'nodemailer';

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export function requireResetEmailTransport() {
  const transport = getTransport();
  if (!transport) {
    const error = new Error('Password reset email is not configured.');
    error.statusCode = 503;
    throw error;
  }
  return transport;
}

export async function sendPasswordResetCode(transport, email, code) {
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Roamora password reset code',
    text: `Your Roamora password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email. Never share this code.`,
  });
}

export async function sendReviewRequestEmail(order) {
  const transport = getTransport();
  let status = 'not_configured';
  if (transport) {
    try {
      const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
      const reviewUrl = new URL(`/review/${encodeURIComponent(String(order._id))}`, clientOrigin).toString();
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: order.contact.email,
        subject: 'Your Roamora journey is complete',
        text: `Your journey ${order.packageSnapshot.title} is complete. We hope it was memorable!\n\nShare your experience with fellow travellers: ${reviewUrl}\n\nSign in to your Roamora account to leave your review.`,
      });
      status = 'sent';
    } catch (error) {
      status = 'failed';
      console.error(`Review request email failed for order ${order._id}.`, { errorType: error.name, errorCode: error.code });
    }
  }
  await order.updateOne({ $set: { reviewEmailStatus: status } });
  order.reviewEmailStatus = status;
  return status;
}

export async function sendBookingConfirmation(order) {
  const transport = getTransport();
  if (!transport) {
    await order.updateOne({ $set: { emailStatus: 'not_sent_demo' } });
    order.emailStatus = 'not_sent_demo';
    return;
  }

  try {
    const formattedTotal = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: order.currency,
    }).format(order.totalMinor / 100);
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]);
    const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
    const bookingUrl = new URL(`/dashboard/bookings/${order._id}`, clientOrigin).toString();
    const tripTitle = escapeHtml(order.packageSnapshot.title);
    const safeReference = escapeHtml(order.bookingReference);
    const paymentNotice = order.paymentMode === 'demo' ? 'No payment was collected through the website.' : '';
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: order.contact.email,
      subject: `Roamora booking confirmed: ${order.bookingReference}`,
      text: [
        `Your booking ${order.bookingReference} is confirmed.`,
        `Trip: ${order.packageSnapshot.title}`,
        `Departure: ${order.startDate.toISOString().slice(0, 10)}`,
        `Travellers: ${order.travellerCount}`,
        `Total: ${formattedTotal}`,
        ...(paymentNotice ? [paymentNotice] : []),
        `Status: ${order.status}`,
        `View booking: ${bookingUrl}`,
      ].join('\n'),
      html: `<div style="font-family:Arial,sans-serif;color:#0b1628;max-width:600px;margin:auto;padding:32px"><p style="color:#087f8c;font-weight:bold;letter-spacing:2px">ROAMORA</p><h1 style="font-size:24px">Your next adventure is confirmed.</h1><p>Booking <strong>${safeReference}</strong></p><p><strong>${tripTitle}</strong></p><p>Departure: ${order.startDate.toISOString().slice(0, 10)}<br>Travellers: ${order.travellerCount}<br>Total: ${escapeHtml(formattedTotal)}<br>Status: ${escapeHtml(order.status)}</p>${paymentNotice ? `<p>${escapeHtml(paymentNotice)}</p>` : ''}<p><a href="${escapeHtml(bookingUrl)}" style="display:inline-block;background:#087f8c;color:white;text-decoration:none;padding:12px 20px;border-radius:8px">View booking</a></p></div>`,
    });
    await order.updateOne({ $set: { emailStatus: 'sent' } });
    order.emailStatus = 'sent';
  } catch (error) {
    await order.updateOne({ $set: { emailStatus: 'failed' } });
    order.emailStatus = 'failed';
    console.error(`Booking email failed for order ${order._id}.`, {
      errorType: error.name,
      errorCode: error.code,
    });
  }
}
