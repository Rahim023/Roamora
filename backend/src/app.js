import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import api from './routes/api.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api/auth/password-reset',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts. Please try again later.' },
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
app.use(
  '/api/travo',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Travo is receiving too many requests. Please try again later.' },
  }),
);
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

app.use('/api', api);

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found.' });
});

app.use((error, _request, response, _next) => {
  if (error?.name === 'ZodError') {
    response.status(400).json({
      error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      error: Object.values(error.errors).map((item) => item.message).join('; '),
    });
    return;
  }
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: `Invalid ${error.path}.` });
    return;
  }
  if (error?.code === 11000) {
    response.status(409).json({ error: 'A record with the same unique value already exists.' });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }
  const status = error.statusCode || (error.message === 'Origin is not allowed by CORS.' ? 403 : 500);
  if (status === 500) console.error(`Unhandled API error: ${error.message}`);
  response.status(status).json({
    error: status === 500 ? 'Internal server error.' : error.message,
  });
});

export default app;
