// src/products/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  Request,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ============================================================
  // PUBLIC ENDPOINTS
  // ============================================================

  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    // If search is provided, use search endpoint logic
    if (search && search.length > 0) {
      return this.productsService.searchProducts(search, limitNum);
    }

    // If categoryId is provided, filter by category
    if (categoryId) {
      return this.productsService.findByCategory(parseInt(categoryId, 10));
    }

    // Use paginated version for better performance
    return this.productsService.findAllPaginated(pageNum, limitNum);
  }

  @ApiOperation({ summary: 'Get products in stock' })
  @ApiResponse({ status: 200, description: 'Products in stock retrieved successfully' })
  @Get('in-stock')
  findInStock() {
    return this.productsService.findInStock();
  }

  @ApiOperation({ summary: 'Get products out of stock' })
  @ApiResponse({ status: 200, description: 'Products out of stock retrieved successfully' })
  @Get('out-of-stock')
  findOutOfStock() {
    return this.productsService.findOutOfStock();
  }

  @ApiOperation({ summary: 'Get low stock products' })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved successfully' })
  @Get('low-stock')
  findLowStock(@Query('threshold') threshold?: string) {
    return this.productsService.findLowStock(
      threshold ? parseInt(threshold, 10) : 10,
    );
  }

  // ============================================================
  // GET SINGLE PRODUCT – WITH CACHE BYPASS SUPPORT
  // ============================================================

  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiQuery({ 
    name: 'fresh', 
    required: false, 
    type: Boolean,
    description: 'Bypass cache and fetch fresh data from database'
  })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('fresh') fresh?: string,
  ) {
    // ✅ If fresh=true, bypass cache and get fresh data
    if (fresh === 'true') {
      return this.productsService.findOneFresh(id);
    }
    return this.productsService.findOne(id);
  }

  // ============================================================
  // VENDOR ENDPOINTS
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor products' })
  @ApiResponse({ status: 200, description: 'Vendor products retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendor/my')
  async getMyProducts(@Request() req: { user: { id: number; role: UserRole } }) {
    if (req.user.role === UserRole.VENDOR) {
      return this.productsService.findByVendor(req.user.id);
    }
    return this.productsService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor product stats' })
  @ApiResponse({ status: 200, description: 'Vendor product stats retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendor/stats')
  async getVendorStats(@Request() req: { user: { id: number; role: UserRole } }) {
    if (req.user.role === UserRole.VENDOR) {
      return this.productsService.getVendorStats(req.user.id);
    }
    const allProducts = await this.productsService.findAll();
    return {
      totalProducts: allProducts.length,
      totalStock: allProducts.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: allProducts.filter((p) => p.stock > 0 && p.stock <= 10).length,
      outOfStockCount: allProducts.filter((p) => p.stock === 0).length,
    };
  }

  // ============================================================
  // CREATE PRODUCT
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Vendor/Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @Body(new ValidationPipe()) createProductDto: CreateProductDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.productsService.create(createProductDto, req.user.id);
  }

  // ============================================================
  // UPDATE PRODUCT
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) updateProductDto: UpdateProductDto,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    return this.productsService.update(id, updateProductDto, req.user.id, req.user.role);
  }

  // ============================================================
  // BULK STOCK UPDATE
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update product stock (Vendor)' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Patch('vendor/bulk-stock')
  async bulkUpdateStock(
    @Body(new ValidationPipe()) updates: { productId: number; stock: number }[],
    @Request() req: { user: { id: number } },
  ) {
    return this.productsService.bulkUpdateStock(req.user.id, updates);
  }

  // ============================================================
  // DELETE PRODUCT
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Soft delete)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    return this.productsService.remove(id, req.user.id, req.user.role);
  }

  // ============================================================
  // PERMANENTLY DELETE PRODUCT
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete a product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product permanently deleted' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id/permanent')
  async permanentlyDelete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { role: UserRole } },
  ) {
    await this.productsService.permanentlyDelete(id, req.user.role);
    return { message: 'Product permanently deleted successfully' };
  }
}