import { Router } from 'express';
import { getNotifications } from '../controllers/notifications.controller';
import { verifyJWT } from '../middleware/auth';

export const notificationRoutes = Router();
notificationRoutes.use(verifyJWT);
notificationRoutes.get('/', getNotifications);
