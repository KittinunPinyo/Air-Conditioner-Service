import 'dotenv/config';
import app from './src/app.js';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Add it to Backend/.env.');
  process.exit(1);
}

app.listen(port, host, () => {
  console.log(`Backend API listening at http://${host}:${port}`);
});
