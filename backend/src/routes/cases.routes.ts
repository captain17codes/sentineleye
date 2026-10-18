import { Router } from 'express';
import { createCase, getCase, getCasePdf } from '../controllers/cases.controller';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { caseCreateSchema } from '../schemas/alert.schema';

export const caseRoutes = Router();
caseRoutes.use(verifyJWT);
caseRoutes.post('/', validate(caseCreateSchema), createCase);
caseRoutes.get('/:id', getCase);
caseRoutes.get('/:id/pdf', getCasePdf);
