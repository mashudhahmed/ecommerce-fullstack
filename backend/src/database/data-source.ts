// src/database/data-source.ts
//
// Used by the TypeORM CLI for migrations (generate/run/revert), which runs
// outside of Nest's dependency injection and therefore can't use
// ConfigService or the app's TypeOrmModule.forRootAsync factory. This reads
// the same env vars as src/config/configuration.ts — keep them in sync if
// you add or rename any DATABASE_* variables.
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5434', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'ecommerce_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // never true for the CLI datasource — migrations are the point
  logging: true,
});