import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/schema/staff-member.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
