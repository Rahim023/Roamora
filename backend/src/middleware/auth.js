import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export async function requireAuth(request, response, next) {
  const authorization = request.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new Error('JWT_SECRET is not configured.'));
    return;
  }

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      response.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    const user = await User.findById(payload.sub).select('_id name email role isActive tokenVersion');
    if (!user || !user.isActive) {
      response.status(401).json({ error: 'Account is unavailable.' });
      return;
    }
    if ((payload.ver ?? 0) !== (user.tokenVersion ?? 0)) {
      response.status(401).json({ error: 'Authentication token is invalid or expired.' });
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      response.status(401).json({ error: 'Authentication token is invalid or expired.' });
      return;
    }
    next(error);
  }
}

export function requireAdmin(request, response, next) {
  if (!request.user || request.user.role !== 'admin') {
    response.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  next();
}

export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}
