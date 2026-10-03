// src/database/data-source.ts
//
// Used by the TypeORM CLI for migrations (generate/run/revert), which runs
// outside of Nest's dependency injection and therefore can't use
// ConfigService or the app's TypeOrmModule.forRootAsync factory. This reads
// the same env vars as src/config/configuration.ts — keep them in sync if
// you add or rename any DATABASE_* variables.
import 'dotenv/config';
import { DataSource } from 'typeorm';

const isSsl =
  process.env.DATABASE_SSL === 'true' ||
  Boolean(
    process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.DATABASE_URL.includes('neon.tech')),
  );

export default new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: isSsl ? { rejectUnauthorized: false } : false,
        entities: ['src/**/*.entity.ts'],
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
        logging: true,
      }
    : {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5434', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'ecommerce_db',
        ssl: isSsl ? { rejectUnauthorized: false } : false,
        entities: ['src/**/*.entity.ts'],
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
        logging: true,
      },
);
