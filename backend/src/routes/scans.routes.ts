import { Router } from 'express';
import { createScan, getScans } from '../controllers/scans.controller';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scanResultSchema } from '../schemas/scan.schema';

export const scanRoutes = Router();
scanRoutes.use(verifyJWT);
scanRoutes.post('/', validate(scanResultSchema), createScan);
scanRoutes.get('/', getScans);
