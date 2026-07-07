// src/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search products' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('minRating') minRating?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('vendorId') vendorId?: string,
  ) {
    return this.searchService.search(query || '', {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === 'true',
      minRating: minRating ? parseFloat(minRating) : undefined,
      sortBy,
      sortOrder,
      vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
    });
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete suggestions' })
  @ApiResponse({ status: 200, description: 'Autocomplete suggestions' })
  async autocomplete(@Query('q') query: string) {
    return this.searchService.autocomplete(query || '');
  }

  @Get('popular')
  @ApiOperation({ summary: 'Popular search terms' })
  @ApiResponse({ status: 200, description: 'Popular search terms' })
  async getPopularTerms() {
    return this.searchService.getPopularTerms();
  }

  @Get('reindex')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reindex all products (Admin only)' })
  @ApiResponse({ status: 200, description: 'Reindex started' })
  async reindex() {
    await this.searchService.reindexAll();
    return { message: 'Reindex completed successfully' };
  }
}