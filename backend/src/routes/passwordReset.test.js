import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('express-rate-limit', () => ({ default: () => (_request, _response, next) => next() }));

import app from '../app.js';
import { User } from '../models/index.js';

const email = 'traveler@example.com';
const secret = 'a-test-secret-for-password-reset-only';
const digest = (purpose, value) => createHmac('sha256', secret).update(`${purpose}\0${email}\0${value}`).digest('hex');
const valueAt = (object, path) => path.split('.').reduce((value, part) => value?.[part], object);
const setAt = (object, path, value) => {
  const parts = path.split('.');
  let target = object;
  for (const part of parts.slice(0, -1)) target = target[part] ||= {};
  target[parts.at(-1)] = value;
};
const unsetAt = (object, path) => {
  const parts = path.split('.');
  const target = parts.slice(0, -1).reduce((value, part) => value?.[part], object);
  if (target) delete target[parts.at(-1)];
};
const matches = (object, filter) => Object.entries(filter).every(([key, condition]) => {
  if (key === '$or') return condition.some((item) => matches(object, item));
  const value = valueAt(object, key);
  if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
    return Object.entries(condition).every(([op, expected]) => {
      if (op === '$exists') return (value !== undefined) === expected;
      if (op === '$ne') return value !== expected;
      if (op === '$type') return typeof value === expected;
      if (op === '$gt') return value > expected;
      if (op === '$lt') return value < expected;
      if (op === '$lte') return value <= expected;
      throw new Error(`Unsupported test operator ${op}`);
    });
  }
  return value === condition;
});
const applyUpdate = (object, update) => {
  for (const [path, value] of Object.entries(update.$set || {})) setAt(object, path, value);
  for (const path of Object.keys(update.$unset || {})) unsetAt(object, path);
  for (const [path, value] of Object.entries(update.$inc || {})) setAt(object, path, (valueAt(object, path) || 0) + value);
};
const query = (value) => ({ select: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });

describe('password recovery', () => {
  let user;
  let sendMail;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', secret);
    vi.stubEnv('SMTP_HOST', 'smtp.test');
    vi.stubEnv('SMTP_USER', 'smtp-user');
    vi.stubEnv('SMTP_PASS', 'smtp-password');
    user = { _id: '507f1f77bcf86cd799439011', email, isActive: true, authProvider: 'local', passwordHash: 'old-hash', tokenVersion: 0 };
    sendMail = vi.fn().mockResolvedValue({});
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
    vi.spyOn(User, 'findOneAndUpdate').mockImplementation((filter, update) => {
      if (!user || !matches(user, filter)) return query(null);
      applyUpdate(user, update);
      return query({ ...user, passwordReset: { ...user.passwordReset } });
    });
    vi.spyOn(User, 'updateOne').mockImplementation(async (filter, update) => {
      if (!user || !matches(user, filter)) return { modifiedCount: 0 };
      applyUpdate(user, update);
      return { modifiedCount: 1 };
    });
    vi.spyOn(User, 'findById').mockImplementation(() => query(user));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  const requestCode = (address = email) => request(app).post('/api/auth/password-reset/request').send({ email: address });
  const verify = (code) => request(app).post('/api/auth/password-reset/verify').send({ email, code });
  const complete = (token, password = 'newpass1!') => request(app).post('/api/auth/password-reset/complete').send({ email, token, password });
  const mailedCode = () => sendMail.mock.calls[0][0].text.match(/\b\d{6}\b/)[0];

  it('responds without waiting for SMTP delivery', async () => {
    let finish;
    sendMail.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    try {
      const response = await requestCode().timeout({ response: 3000 });
      expect(response.status).toBe(202);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      expect(user.passwordReset.codeHash).toBe(digest('code', mailedCode()));
    } finally {
      if (finish) finish({ accepted: [email] });
    }
  });

  it('uses the same response for eligible, missing, throttled and Google-only accounts', async () => {
    const first = await requestCode(' TRAVELER@example.com ');
    expect(first.status).toBe(202);
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const code = mailedCode();
    expect(user.passwordReset.codeHash).toBe(digest('code', code));
    expect(JSON.stringify(user.passwordReset)).not.toContain(code);
    expect((await requestCode()).body).toEqual(first.body);
    user = null;
    expect((await requestCode()).body).toEqual(first.body);
    user = { email, authProvider: 'google', isActive: true, passwordHash: null };
    expect((await requestCode()).body).toEqual(first.body);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('does not expose delivery failures and clearly reports missing SMTP configuration', async () => {
    sendMail.mockRejectedValue(new Error('delivery failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await requestCode()).status).toBe(202);
    await vi.waitFor(() => {
      expect(user.passwordReset).toBeUndefined();
      expect(log).toHaveBeenCalled();
    });
    vi.stubEnv('SMTP_HOST', '');
    expect((await requestCode()).status).toBe(503);
  });

  it('enforces expiry and five attempts', async () => {
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const code = mailedCode();
    user.passwordReset.expiresAt = new Date(Date.now() - 1);
    expect((await verify(code)).status).toBe(400);
    user.passwordReset.expiresAt = new Date(Date.now() + 60000);
    const wrong = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) expect((await verify(wrong)).status).toBe(400);
    expect((await verify(code)).status).toBe(400);
    expect(user.passwordReset.attempts).toBe(5);
  });

  it('consumes codes and authorizations once, applies password rules, and revokes older tokens', async () => {
    const oldToken = jwt.sign({ sub: user._id, role: 'user' }, secret);
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const code = mailedCode();
    const attempts = await Promise.all([verify(code), verify(code)]);
    expect(attempts.map((result) => result.status).sort()).toEqual([200, 400]);
    const token = attempts.find((result) => result.status === 200).body.token;
    expect(user.passwordReset.tokenHash).toBe(digest('token', token));
    expect((await complete(token, 'weak')).status).toBe(400);
    const completions = await Promise.all([complete(token), complete(token)]);
    expect(completions.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(await bcrypt.compare('newpass1!', user.passwordHash)).toBe(true);
    expect(user.passwordReset).toBeUndefined();
    expect(user.tokenVersion).toBe(1);
    expect((await complete(token)).status).toBe(400);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`)).status).toBe(401);
    const newToken = jwt.sign({ sub: user._id, role: 'user', ver: 1 }, secret);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${newToken}`)).status).toBe(200);
  });

  it('rejects expired reset authorizations without changing the password', async () => {
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const response = await verify(mailedCode());
    user.passwordReset.expiresAt = new Date(Date.now() - 1);
    expect((await complete(response.body.token)).status).toBe(400);
    expect(user.passwordHash).toBe('old-hash');
  });

  it('invalidates an earlier reset authorization when a new code is requested', async () => {
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const response = await verify(mailedCode());
    user.passwordReset.requestedAt = new Date(Date.now() - 61000);
    expect((await requestCode()).status).toBe(202);
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
    expect((await complete(response.body.token)).status).toBe(400);
    expect(user.passwordHash).toBe('old-hash');
  });

  it('does not clear a newer reset when an earlier email fails', async () => {
    let failFirst;
    sendMail.mockImplementationOnce(() => new Promise((_resolve, reject) => { failFirst = reject; }))
      .mockResolvedValueOnce({ accepted: [email] });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const firstHash = user.passwordReset.codeHash;
    user.passwordReset.requestedAt = new Date(Date.now() - 61000);
    await requestCode();
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
    user.passwordReset.codeHash = firstHash;
    failFirst(new Error('delivery failure'));
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
    await vi.waitFor(() => expect(User.updateOne).toHaveBeenCalled());
    expect(user.passwordReset.codeHash).toBe(firstHash);
  });
});
