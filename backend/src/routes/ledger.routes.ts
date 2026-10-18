import { Router } from 'express';
import { getLedger, verifyLedger } from '../controllers/ledger.controller';
import { verifyJWT } from '../middleware/auth';

export const ledgerRoutes = Router();
ledgerRoutes.use(verifyJWT);
ledgerRoutes.get('/', getLedger);
ledgerRoutes.get('/verify', verifyLedger);
