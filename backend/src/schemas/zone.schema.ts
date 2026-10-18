import { z } from 'zod';

export const zoneCreateSchema = z.object({
  name: z.string().min(2, 'Name required'),
  geojson: z.string().min(1, 'GeoJSON required'),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
});

export const zoneUpdateSchema = zoneCreateSchema.partial();
