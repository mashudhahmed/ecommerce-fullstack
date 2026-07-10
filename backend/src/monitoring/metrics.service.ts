// src/common/monitoring/metrics.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: client.Registry;

  // Initialize with default values
  private httpRequestDuration!: client.Histogram<string>;
  private httpRequestTotal!: client.Counter<string>;
  private httpRequestErrors!: client.Counter<string>;
  private activeConnections!: client.Gauge<string>;
  private dbQueryDuration!: client.Histogram<string>;
  private dbQueryTotal!: client.Counter<string>;
  private cacheHitRate!: client.Counter<string>;
  private cacheMissRate!: client.Counter<string>;
  private orderCreatedTotal!: client.Counter<string>;
  private orderRevenueTotal!: client.Counter<string>;
  private userRegistrationTotal!: client.Counter<string>;
  private vendorRegistrationTotal!: client.Counter<string>;
  private productCreationTotal!: client.Counter<string>;
  private emailSentTotal!: client.Counter<string>;

  constructor() {
    this.registry = new client.Registry();
  }

  async onModuleInit() {
    this.registerDefaultMetrics();
    this.initializeCustomMetrics();
    this.logger.log('Metrics service initialized');
  }

  private registerDefaultMetrics(): void {
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'ecommerce_',
    });
  }

  private initializeCustomMetrics(): void {
    // HTTP metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'ecommerce_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'ecommerce_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestErrors = new client.Counter({
      name: 'ecommerce_http_errors_total',
      help: 'Total HTTP errors',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.activeConnections = new client.Gauge({
      name: 'ecommerce_active_connections',
      help: 'Active HTTP connections',
    });

    // Database metrics
    this.dbQueryDuration = new client.Histogram({
      name: 'ecommerce_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.dbQueryTotal = new client.Counter({
      name: 'ecommerce_db_queries_total',
      help: 'Total database queries',
      labelNames: ['operation', 'entity'],
    });

    // Cache metrics
    this.cacheHitRate = new client.Counter({
      name: 'ecommerce_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_key'],
    });

    this.cacheMissRate = new client.Counter({
      name: 'ecommerce_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_key'],
    });

    // Business metrics
    this.orderCreatedTotal = new client.Counter({
      name: 'ecommerce_orders_created_total',
      help: 'Total orders created',
      labelNames: ['status'],
    });

    this.orderRevenueTotal = new client.Counter({
      name: 'ecommerce_order_revenue_total',
      help: 'Total order revenue in cents',
    });

    this.userRegistrationTotal = new client.Counter({
      name: 'ecommerce_users_registered_total',
      help: 'Total user registrations',
      labelNames: ['role'],
    });

    this.vendorRegistrationTotal = new client.Counter({
      name: 'ecommerce_vendors_registered_total',
      help: 'Total vendor registrations',
    });

    this.productCreationTotal = new client.Counter({
      name: 'ecommerce_products_created_total',
      help: 'Total products created',
      labelNames: ['vendor_id'],
    });

    this.emailSentTotal = new client.Counter({
      name: 'ecommerce_emails_sent_total',
      help: 'Total emails sent',
      labelNames: ['type', 'status'],
    });

    // Register all metrics
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.httpRequestTotal);
    this.registry.registerMetric(this.httpRequestErrors);
    this.registry.registerMetric(this.activeConnections);
    this.registry.registerMetric(this.dbQueryDuration);
    this.registry.registerMetric(this.dbQueryTotal);
    this.registry.registerMetric(this.cacheHitRate);
    this.registry.registerMetric(this.cacheMissRate);
    this.registry.registerMetric(this.orderCreatedTotal);
    this.registry.registerMetric(this.orderRevenueTotal);
    this.registry.registerMetric(this.userRegistrationTotal);
    this.registry.registerMetric(this.vendorRegistrationTotal);
    this.registry.registerMetric(this.productCreationTotal);
    this.registry.registerMetric(this.emailSentTotal);
  }

  // HTTP metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    if (!this.httpRequestDuration) return;
    const status = String(statusCode);
    this.httpRequestDuration.observe({ method, route, status_code: status }, duration);
    this.httpRequestTotal.inc({ method, route, status_code: status });
    if (statusCode >= 400) {
      this.httpRequestErrors.inc({ method, route, status_code: status });
    }
  }

  recordActiveConnection(increment: boolean): void {
    if (!this.activeConnections) return;
    if (increment) {
      this.activeConnections.inc();
    } else {
      this.activeConnections.dec();
    }
  }

  // Database metrics
  recordDbQuery(operation: string, entity: string, duration: number): void {
    if (!this.dbQueryDuration) return;
    this.dbQueryDuration.observe({ operation, entity }, duration);
    this.dbQueryTotal.inc({ operation, entity });
  }

  // Cache metrics
  recordCacheHit(key: string): void {
    if (!this.cacheHitRate) return;
    this.cacheHitRate.inc({ cache_key: key });
  }

  recordCacheMiss(key: string): void {
    if (!this.cacheMissRate) return;
    this.cacheMissRate.inc({ cache_key: key });
  }

  // Business metrics
  recordOrderCreated(status: string): void {
    if (!this.orderCreatedTotal) return;
    this.orderCreatedTotal.inc({ status });
  }

  recordOrderRevenue(amount: number): void {
    if (!this.orderRevenueTotal) return;
    this.orderRevenueTotal.inc(amount * 100);
  }

  recordUserRegistration(role: string): void {
    if (!this.userRegistrationTotal) return;
    this.userRegistrationTotal.inc({ role });
  }

  recordVendorRegistration(): void {
    if (!this.vendorRegistrationTotal) return;
    this.vendorRegistrationTotal.inc();
  }

  recordProductCreation(vendorId: number): void {
    if (!this.productCreationTotal) return;
    this.productCreationTotal.inc({ vendor_id: String(vendorId) });
  }

  recordEmailSent(type: string, status: string): void {
    if (!this.emailSentTotal) return;
    this.emailSentTotal.inc({ type, status });
  }

  // Get metrics for Prometheus
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get metrics in JSON format
  async getMetricsJSON(): Promise<client.MetricObject[]> {
    return this.registry.getMetricsAsJSON();
  }
}