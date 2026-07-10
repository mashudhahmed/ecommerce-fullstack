// src/search/search.service.ts
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/products.entity';

@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name);
  private client: Client;
  private indexingInProgress = false;

  /** Exposed for health checks (e.g. HealthController readiness endpoint) */
  public isHealthy = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {
    const node = this.configService.get('elasticsearch.node') || 'http://localhost:9200';
    this.client = new Client({
      node,
      requestTimeout: 3000, // fail fast instead of hanging on driver default timeout
      maxRetries: 1,
      pingTimeout: 2000,
    });
  }

  /**
   * Runs after the full app graph is ready. Intentionally NOT awaited from
   * here so app.listen() is not blocked by search indexing.
   */
  onApplicationBootstrap() {
    this.initializeSearchIndex().catch((err) => {
      this.logger.error('Search initialization failed permanently', err);
    });
  }

  /**
   * Orchestrates index creation + product indexing in the background.
   * Retries on failure with a fixed backoff instead of blocking startup
   * or retrying per-item synchronously.
   */
  private async initializeSearchIndex(): Promise<void> {
    if (this.indexingInProgress) return;
    this.indexingInProgress = true;

    try {
      await this.createIndex();
      await this.indexAllProducts();
      this.isHealthy = true;
      this.indexingInProgress = false;
      this.logger.log('✅ Search index ready');
    } catch (err) {
      this.isHealthy = false;
      this.indexingInProgress = false;
      this.logger.error('❌ Search indexing failed, retrying in 30s', err);
      setTimeout(() => this.initializeSearchIndex(), 30_000);
    }
  }

  /**
   * Create ElasticSearch index with mappings
   */
  async createIndex(): Promise<void> {
    const index = this.configService.get('elasticsearch.index') || 'products';

    try {
      const exists = await this.client.indices.exists({ index });
      if (exists) {
        this.logger.log('Index already exists');
        return;
      }

      await this.client.indices.create({
        index,
        body: {
          settings: {
            analysis: {
              analyzer: {
                custom_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: {
                type: 'text',
                analyzer: 'custom_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  autocomplete: { type: 'text', analyzer: 'custom_analyzer' },
                },
              },
              description: {
                type: 'text',
                analyzer: 'custom_analyzer',
              },
              price: { type: 'float' },
              stock: { type: 'integer' },
              category: {
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'text', analyzer: 'custom_analyzer' },
                },
              },
              vendor: {
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'text', analyzer: 'custom_analyzer' },
                },
              },
              isActive: { type: 'boolean' },
              averageRating: { type: 'float' },
              totalReviews: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });

      this.logger.log('Index created successfully');
    } catch (error) {
      this.logger.error('Failed to create index', error);
      throw error; // propagate so initializeSearchIndex() can retry
    }
  }

  /**
   * Index all active products in batches, running items within each
   * batch concurrently instead of sequentially awaiting one at a time.
   */
  async indexAllProducts(): Promise<void> {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['category', 'owner'],
    });

    this.logger.log(`Indexing ${products.length} products`);

    const CONCURRENCY = 5;
    let failedCount = 0;

    for (let i = 0; i < products.length; i += CONCURRENCY) {
      const batch = products.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((p) => this.indexProduct(p)));
      failedCount += results.filter((r) => r.status === 'rejected').length;
    }

    if (failedCount > 0) {
      throw new Error(`${failedCount}/${products.length} products failed to index`);
    }

    this.logger.log('All products indexed successfully');
  }

  /**
   * Index a single product
   */
  async indexProduct(product: Product): Promise<void> {
    const index = this.configService.get('elasticsearch.index') || 'products';

    try {
      await this.client.index({
        index,
        id: product.id.toString(),
        body: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          stock: product.stock,
          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
              }
            : null,
          vendor: product.owner
            ? {
                id: product.owner.id,
                name: product.owner.name,
              }
            : null,
          isActive: product.isActive,
          averageRating: product.averageRating || 0,
          totalReviews: product.totalReviews || 0,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      });

      this.logger.debug(`Product ${product.id} indexed`);
    } catch (error) {
      this.logger.error(`Failed to index product ${product.id}`, error);
      throw error; // rethrow so batch caller can count failures
    }
  }

  /**
   * Remove a product from index
   */
  async deleteProduct(productId: number): Promise<void> {
    const index = this.configService.get('elasticsearch.index') || 'products';

    try {
      await this.client.delete({
        index,
        id: productId.toString(),
      });
      this.logger.log(`Product ${productId} deleted from search index`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${productId} from search index`, error);
    }
  }

  /**
   * Search products with filters
   */
  async search(query: string, filters: any = {}): Promise<any> {
    const index = this.configService.get('elasticsearch.index') || 'products';

    const must: any[] = [];

    // Full-text search
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['title^3', 'description', 'category.name^2', 'vendor.name'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Filters
    if (filters.categoryId) {
      must.push({
        term: { 'category.id': filters.categoryId },
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const range: any = {};
      if (filters.minPrice !== undefined) range.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) range.lte = filters.maxPrice;
      must.push({ range: { price: range } });
    }

    if (filters.inStock) {
      must.push({ range: { stock: { gt: 0 } } });
    }

    if (filters.minRating) {
      must.push({ range: { averageRating: { gte: filters.minRating } } });
    }

    if (filters.vendorId) {
      must.push({ term: { 'vendor.id': filters.vendorId } });
    }

    const body: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: [{ term: { isActive: true } }],
        },
      },
      from: ((filters.page || 1) - 1) * (filters.limit || 20),
      size: filters.limit || 20,
    };

    // Add sorting
    if (filters.sortBy) {
      body.sort = this.buildSort(filters.sortBy, filters.sortOrder);
    } else {
      body.sort = [{ _score: 'desc' }];
    }

    // Add aggregations for facets
    body.aggs = {
      categories: {
        terms: { field: 'category.id', size: 100 },
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 10 },
            { from: 10, to: 50 },
            { from: 50, to: 100 },
            { from: 100, to: 500 },
            { from: 500 },
          ],
        },
      },
    };

    try {
      const response = await this.client.search({
        index,
        body,
      });

      return {
        data: response.hits.hits.map((hit: any) => ({
          id: parseInt(hit._id),
          ...hit._source,
          score: hit._score,
        })),
        total:
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value || 0,
        page: filters.page || 1,
        limit: filters.limit || 20,
        aggs: {
          categories:
            (response.aggregations?.categories as any)?.buckets?.map((b: any) => ({
              id: parseInt(b.key),
              count: b.doc_count,
            })) || [],
          priceRanges:
            (response.aggregations?.price_ranges as any)?.buckets?.map((b: any) => ({
              from: b.from,
              to: b.to,
              count: b.doc_count,
            })) || [],
        },
      };
    } catch (error) {
      this.logger.error('Search failed', error);
      return {
        data: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 20,
        aggs: { categories: [], priceRanges: [] },
      };
    }
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query: string): Promise<string[]> {
    const index = this.configService.get('elasticsearch.index') || 'products';

    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await this.client.search({
        index,
        body: {
          query: {
            match_phrase_prefix: {
              'title.autocomplete': query,
            },
          },
          size: 10,
          _source: ['title'],
        },
      });

      return response.hits.hits.map((hit: any) => hit._source.title);
    } catch (error) {
      this.logger.error('Autocomplete failed', error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularTerms(): Promise<string[]> {
    // This would require storing search analytics
    // For now, return some default terms
    return ['electronics', 'phone', 'laptop', 'accessories', 'gaming'];
  }

  /**
   * Build sort configuration
   */
  private buildSort(sortBy?: string, sortOrder?: string): any[] {
    const order: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    const sortMapping: Record<string, any> = {
      price: { price: order },
      rating: { averageRating: order },
      newest: { createdAt: order },
      relevance: '_score',
      name: { 'title.keyword': order },
      stock: { stock: order },
    };

    if (sortBy && sortMapping[sortBy]) {
      return [sortMapping[sortBy]];
    }

    return [{ _score: 'desc' }];
  }

  /**
   * Reindex all products (call when schema changes)
   */
  async reindexAll(): Promise<void> {
    this.logger.log('Starting reindex...');

    // Delete existing index
    const index = this.configService.get('elasticsearch.index') || 'products';
    try {
      await this.client.indices.delete({ index });
      this.logger.log('Old index deleted');
    } catch (error) {
      this.logger.warn('Index might not exist', error);
    }

    // Create new index
    await this.createIndex();

    // Index all products
    await this.indexAllProducts();

    this.logger.log('Reindex completed successfully');
  }
}