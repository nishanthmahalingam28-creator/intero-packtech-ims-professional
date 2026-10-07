import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import User from '../../users/models/User.js';
import { AppError } from '../../../utils/AppError.js';
import { email as validEmail, reqString } from '../../../utils/validate.js';

// Used when the email does not exist, so a wrong email and a wrong password take the same time to answer
// (stops attackers from discovering which emails are registered).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function login(body) {
  const email = validEmail(body?.email);
  const password = reqString(body?.password, 'Password', { max: 200 });

  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  if (user.status !== 'active') {
    throw new AppError('Your account is deactivated. Please contact the administrator.', 403, 'ACCOUNT_INACTIVE');
  }

  // The token only says WHO the user is (sub = user id). The role is always re-read from the database.
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });
  return { token, user };
}
