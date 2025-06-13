import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle(process.env.DATABASE_URL!);
export type TransactionType = Parameters<Parameters<typeof db.transaction>[0]>[0];
