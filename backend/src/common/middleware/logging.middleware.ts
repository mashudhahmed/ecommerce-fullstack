import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, body, headers, ip } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `📤 ${method} ${originalUrl}`,
    );

    // Capture response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function(data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      if (statusCode >= 400) {
        this.logger.error(
          `❌ ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        );
      } else {
        this.logger.log(
          `✅ ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        );
      }
    });

    next();
  }
}