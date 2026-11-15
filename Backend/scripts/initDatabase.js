import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { sql } from '../src/db/neon.js';

const schema = await readFile(new URL('../src/db/schema.sql', import.meta.url), 'utf8');
const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

console.log('Neon database schema is ready.');
