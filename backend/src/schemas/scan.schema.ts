import { z } from 'zod';

export const scanResultSchema = z.object({
  zone_id: z.number().int().positive(),
  scene_type: z.enum(['optical', 'sar', 'fused']),
  cloud_coverage: z.number().min(0).max(100),
  raw_classes: z.array(z.object({
    class: z.string(),
    confidence: z.number(),
    patch: z.number(),
  })),
  validated_classes: z.array(z.object({
    class: z.string(),
    confidence: z.number(),
    patch: z.number(),
  })),
  change_score: z.number().min(0).max(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
