// src/common/middleware/logging.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, body, headers, ip } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log request (debug level)
    this.logger.debug(`📤 ${method} ${originalUrl}`, {
      query,
      body,
      ip,
      userAgent,
    });

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function(data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
      if (statusCode >= 400) {
        this.logger.error(`❌ ${logMessage}`, {
          statusCode,
          response: responseBody,
          ip,
          userAgent,
        });
      } else {
        this.logger.log(`✅ ${logMessage}`, {
          statusCode,
          ip,
          userAgent,
        });
      }
    });

    next();
  }
}