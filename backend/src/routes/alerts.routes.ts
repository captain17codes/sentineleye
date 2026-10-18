import { Router } from 'express';
import { getAlerts, patchAlertStatus } from '../controllers/alerts.controller';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { alertStatusSchema } from '../schemas/alert.schema';

export const alertRoutes = Router();
alertRoutes.use(verifyJWT);
alertRoutes.get('/', getAlerts);
alertRoutes.patch('/:id/status', validate(alertStatusSchema), patchAlertStatus);
