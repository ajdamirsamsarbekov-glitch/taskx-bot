import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisHost = this.configService.get('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get('REDIS_PORT') || 6379;
    this.redis = new Redis({ host: redisHost, port: redisPort });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    const identifier = user?.id || req.ip;

    const rateLimits: Record<string, { requests: number; window: number }> = {
      '/tasks': { requests: 50, window: 60 },
      '/wallet/deposit': { requests: 5, window: 60 },
      '/wallet/withdraw': { requests: 5, window: 60 },
      '/disputes': { requests: 10, window: 60 },
      '/auth/telegram': { requests: 10, window: 60 },
    };

    const matchedRoute = Object.keys(rateLimits).find((route) =>
      req.path.startsWith(route),
    );

    if (!matchedRoute) {
      return next();
    }

    const limit = rateLimits[matchedRoute];
    const key = `ratelimit:${identifier}:${matchedRoute}`;

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, limit.window);
      }

      if (current > limit.requests) {
        return res.status(429).json({
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          retryAfter: limit.window,
        });
      }

      res.setHeader('X-RateLimit-Limit', limit.requests.toString());
      res.setHeader('X-RateLimit-Remaining', (limit.requests - current).toString());

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  }
}
