import { Router } from 'express';
import { getZones, getZoneById, createZone, updateZone, deleteZone } from '../controllers/zones.controller';
import { verifyJWT } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { zoneCreateSchema, zoneUpdateSchema } from '../schemas/zone.schema';

export const zoneRoutes = Router();
zoneRoutes.get('/', verifyJWT, getZones);
zoneRoutes.get('/:id', verifyJWT, getZoneById);
zoneRoutes.post('/', verifyJWT, requireRole('admin'), validate(zoneCreateSchema), createZone);
zoneRoutes.put('/:id', verifyJWT, requireRole('admin'), validate(zoneUpdateSchema), updateZone);
zoneRoutes.delete('/:id', verifyJWT, requireRole('admin'), deleteZone);
