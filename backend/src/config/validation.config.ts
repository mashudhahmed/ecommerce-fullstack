// backend/src/config/validation.config.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5434),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  SUPERADMIN_EMAIL: Joi.string().email().required(),
  SUPERADMIN_PASSWORD: Joi.string().min(8).required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM_NAME: Joi.string().default('E-Commerce Store'),
  ADMIN_NOTIFICATION_EMAILS: Joi.string().optional(),

  CORS_ORIGIN: Joi.string().optional(),

  // ✅ Add Cloudinary validation (optional)
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  CLOUDINARY_FOLDER: Joi.string().default('snapcart/products'),

  // ✅ Add upload validation
  UPLOAD_DIRECTORY: Joi.string().default('./uploads'),
  UPLOAD_MAX_SIZE: Joi.number().default(5242880),
});
