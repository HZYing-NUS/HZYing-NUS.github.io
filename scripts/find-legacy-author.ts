import { config } from 'dotenv';
import { and, eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { user } from '../src/config/db/schema.postgres';

const envFile = process.argv.find((arg) => arg.startsWith('--env='))?.replace('--env=', '');
if (!envFile) throw new Error('Missing --env=<file>.');
config({ path: envFile, override: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function main() {
  try {
    const users = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(or(eq(user.name, '黄梓颖'), eq(user.name, 'Ziying Huang')));

    console.log(`matched-admin-users=${users.length}`);
    for (const item of users) console.log(`user=${item.name} id=${item.id}`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
