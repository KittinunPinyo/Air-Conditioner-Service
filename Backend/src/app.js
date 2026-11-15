import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { sql } from './db/neon.js';
import authRoutes from './authApi.js';
import bookingRoutes from './bookingApi.js';
import { errorHandler, notFoundHandler, requireAuth } from './middleware.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

app.get('/api/health', async (request, response) => {
  await sql`SELECT 1`;
  response.json({ status: 'ok', database: 'connected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', requireAuth, bookingRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
