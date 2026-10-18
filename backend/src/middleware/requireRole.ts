import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: ('operator' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden — requires role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}
