## Setup

### Backend

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Set `DATABASE_URL` to the PostgreSQL/Neon connection string.
3. Set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` for the first system administrator.
4. Install dependencies and initialize the database:

```powershell
cd Backend
npm install
npm run db:init
npm start
```

The backend listens on `http://127.0.0.1:3001` by default.

### Frontend

In another terminal:

```powershell
npm install
npm run dev
```

The frontend is available at `http://localhost:5173` by default.