// backend/src/config/configuration.ts
export default () => ({
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5434', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'ecommerce_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || 'E-Commerce Store',
    adminEmails: process.env.ADMIN_NOTIFICATION_EMAILS,
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  },
  // ✅ Add Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'snapcart/products',
  },
  // ✅ Add upload configuration
  upload: {
    directory: process.env.UPLOAD_DIRECTORY || './uploads',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10),
  },
});