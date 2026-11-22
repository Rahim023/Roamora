import nodemailer from 'nodemailer';

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const password = process.env.SMTP_PASS;
  const compactPassword = password.replace(/\s/g, '');
  const smtpPassword = process.env.SMTP_HOST.toLowerCase() === 'smtp.gmail.com' && /^[a-z]{16}$/i.test(compactPassword)
    ? compactPassword
    : password;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: smtpPassword },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

function requireAcceptedRecipient(result) {
  if (Array.isArray(result?.accepted) && result.accepted.length === 0) {
    throw new Error('SMTP server did not accept the recipient.');
  }
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
  const result = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your Roamora password reset code',
    text: `Your Roamora password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email. Never share this code.`,
  });
  requireAcceptedRecipient(result);
}

export async function sendReviewRequestEmail(order) {
  const transport = getTransport();
  let status = 'not_configured';
  if (transport) {
    try {
      const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
      const reviewUrl = new URL(`/review/${encodeURIComponent(String(order._id))}`, clientOrigin).toString();
      const result = await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: order.contact.email,
        subject: 'Your Roamora journey is complete',
        text: `Your journey ${order.packageSnapshot.title} is complete. We hope it was memorable!\n\nShare your experience with fellow travellers: ${reviewUrl}\n\nSign in to your Roamora account to leave your review.`,
      });
      requireAcceptedRecipient(result);
      status = 'sent';
    } catch (error) {
      status = 'failed';
      console.error(`Review request email failed for order ${order._id}.`, { errorType: error.name, errorCode: error.code });
    }
  } else {
    console.error(`Review request email not sent for order ${order._id}: SMTP is not configured.`);
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
    console.error(`Booking email not sent for order ${order._id}: SMTP is not configured.`);
    return;
  }

  let status = 'sent';
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
    const bookingUrl = new URL(`/booking/confirmation/${encodeURIComponent(String(order._id))}`, clientOrigin).toString();
    const tripTitle = escapeHtml(order.packageSnapshot.title);
    const safeReference = escapeHtml(order.bookingReference);
    const paymentNotice = order.paymentMode === 'demo' ? 'No payment was collected through the website.' : '';
    const result = await transport.sendMail({
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
    requireAcceptedRecipient(result);
  } catch (error) {
    status = 'failed';
    console.error(`Booking email failed for order ${order._id}.`, {
      errorType: error.name,
      errorCode: error.code,
    });
  }
  await order.updateOne({ $set: { emailStatus: status } });
  order.emailStatus = status;
}
