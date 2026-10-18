import { Router } from 'express';
import { getRiskStats } from '../controllers/stats.controller';
import { verifyJWT } from '../middleware/auth';

export const statsRoutes = Router();
statsRoutes.use(verifyJWT);
statsRoutes.get('/risk', getRiskStats);
