// Reads environment variables ONCE and checks they are safe to use.
// If something important is missing the server refuses to start (fail fast).
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value.trim();
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < (isProduction ? 32 : 16)) {
  throw new Error('JWT_SECRET is too short. Use a long random string (32+ characters).');
}

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongoUri: required('MONGODB_URI'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || '',
  },
};
