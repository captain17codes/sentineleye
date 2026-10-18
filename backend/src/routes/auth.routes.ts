import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, getMe } from '../controllers/auth.controller';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRoutes = Router();
authRoutes.post('/register', validate(registerSchema), register);
authRoutes.post('/login', loginLimiter, validate(loginSchema), login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', verifyJWT, getMe);
