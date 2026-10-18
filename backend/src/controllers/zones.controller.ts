import { Request, Response } from 'express';
import { getDB } from '../db';

export function getZones(_req: Request, res: Response): void {
  const db = getDB();
  const zones = db.prepare('SELECT * FROM zones ORDER BY created_at DESC').all() as Array<{
    id: number; name: string; geojson: string; risk_level: string; created_at: string;
  }>;

  const features = zones.map(z => ({
    ...JSON.parse(z.geojson),
    properties: { id: z.id, name: z.name, risk_level: z.risk_level, created_at: z.created_at },
  }));

  res.json({ type: 'FeatureCollection', features });
}

export function getZoneById(req: Request, res: Response): void {
  const db = getDB();
  const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id) as
    { id: number; name: string; geojson: string; risk_level: string; created_at: string } | undefined;

  if (!zone) { res.status(404).json({ error: 'Zone not found' }); return; }
  res.json({ ...JSON.parse(zone.geojson), properties: { id: zone.id, name: zone.name, risk_level: zone.risk_level } });
}

export function createZone(req: Request, res: Response): void {
  const { name, geojson, risk_level } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO zones (name, geojson, risk_level) VALUES (?, ?, ?)')
    .run(name, geojson, risk_level);
  const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(zone);
}

export function updateZone(req: Request, res: Response): void {
  const { name, geojson, risk_level } = req.body;
  const db = getDB();
  db.prepare('UPDATE zones SET name=?, geojson=?, risk_level=? WHERE id=?')
    .run(name, geojson, risk_level, req.params.id);
  const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
  if (!zone) { res.status(404).json({ error: 'Zone not found' }); return; }
  res.json(zone);
}

export function deleteZone(req: Request, res: Response): void {
  const db = getDB();
  const result = db.prepare('DELETE FROM zones WHERE id = ?').run(req.params.id);
  if (result.changes === 0) { res.status(404).json({ error: 'Zone not found' }); return; }
  res.json({ message: 'Zone deleted' });
}
