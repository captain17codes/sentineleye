import { z } from 'zod';

export const alertStatusSchema = z.object({
  status: z.enum(['New', 'Verified', 'Notice Issued']),
  notes: z.string().optional().default(''),
});

export const caseCreateSchema = z.object({
  alert_id: z.number().int().positive(),
  notes: z.string().optional().default(''),
});
