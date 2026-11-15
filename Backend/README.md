# Backend

The API uses Express and Neon PostgreSQL. Backend code is grouped by feature to keep related behavior together:

- `src/authApi.js` defines authentication routes and request handling.
- `src/authRules.js` validates authentication and password-reset input.
- `src/authService.js` contains account/session/reset logic, email delivery, and related SQL.
- `src/bookingApi.js` defines booking and review routes.
- `src/bookingRules.js` validates bookings/reviews and calculates estimates.
- `src/bookingService.js` contains booking/review SQL.
- `src/middleware.js` handles authentication guards and API errors.
- `src/db/` contains the Neon client and database schema.

## Local setup

1. Rotate the Neon database password/role that was shared in the chat. Do not reuse the exposed connection string.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to the new Neon connection string.
3. Configure `APP_ORIGIN` and the SMTP host, port, TLS mode, username, password, and sender address in `.env`. For Gmail, use an App Password rather than your account password.
4. From this folder, run `npm install`.
5. Create or update the tables with `npm run db:init`.
6. Start the API with `npm run dev`.
7. In a second terminal at the repository root, run `npm.cmd run dev`.

The Vite development server proxies `/api` requests to `http://127.0.0.1:3001`.

## API

- `GET /api/health` checks the database connection.
- `POST /api/auth/register` creates a customer account and starts a session.
- `POST /api/auth/login` verifies credentials and starts a session.
- `POST /api/auth/password/forgot` sends a single-use, 30-minute reset link when the SMTP settings are configured.
- `POST /api/auth/password/reset` changes the password and revokes existing sessions.
- `GET /api/auth/me` returns the signed-in customer.
- `POST /api/auth/logout` ends the current session.
- `GET /api/bookings` lists bookings and their reviews.
- `POST /api/bookings` creates a booking.
- `POST /api/bookings/:jobId/reviews` saves a review for a completed booking.

Customer accounts use hashed passwords and server-side sessions stored in Neon. Technician onboarding and administrative status management are not implemented yet. Run locally while building those features, and deploy only after reviewing production security settings.
