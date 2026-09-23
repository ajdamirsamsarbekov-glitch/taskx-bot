import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '@taskx/database';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditRepository: Repository<AuditLogEntity>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    const sensitiveRoutes = [
      '/wallet/deposit',
      '/wallet/withdraw',
      '/tasks',
      '/disputes',
    ];

    const shouldLog = sensitiveRoutes.some((route) =>
      req.path.includes(route),
    );

    if (shouldLog && req.method !== 'GET') {
      try {
        await this.auditRepository.save({
          userId: user?.id,
          action: `${req.method} ${req.path}`,
          entity: req.path.split('/')[1],
          metadata: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      } catch (error) {
        console.error('Audit log error:', error);
      }
    }

    next();
  }
}
