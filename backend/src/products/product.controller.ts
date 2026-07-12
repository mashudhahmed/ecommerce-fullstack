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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { FilesService } from '../files/files.service';
import { MulterFile } from '../common/types/multer-file.type';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly filesService: FilesService,
  ) {}

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

    if (search && search.length > 0) {
      return this.productsService.searchProducts(search, limitNum);
    }

    if (categoryId) {
      return this.productsService.findByCategory(parseInt(categoryId, 10));
    }

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

  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiQuery({
    name: 'fresh',
    required: false,
    type: Boolean,
    description: 'Bypass cache and fetch fresh data from database',
  })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('fresh') fresh?: string,
  ) {
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
  // CREATE PRODUCT WITH IMAGE UPLOAD
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Vendor/Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Smartphone X' },
        price: { type: 'number', example: 599.99 },
        description: { type: 'string', example: 'Latest smartphone with amazing features' },
        stock: { type: 'number', example: 50 },
        categoryId: { type: 'number', example: 1 },
        compareAtPrice: { type: 'number', example: 799.99 },
        sku: { type: 'string', example: 'SKU-12345' },
        isTrending: { type: 'boolean', example: false },
        isNew: { type: 'boolean', example: false },
        image: { type: 'string', format: 'binary', description: 'Product image file' },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @UploadedFile() file: MulterFile,
    @Body(new ValidationPipe()) createProductDto: CreateProductDto,
    @Request() req: { user: { id: number } },
  ) {
    let imageUrl: string | undefined;

    if (file) {
      try {
        const upload = await this.filesService.uploadFile(file, { folder: 'products' });
        imageUrl = upload.url;
      } catch (error: any) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    return this.productsService.create(
      {
        ...createProductDto,
        imageUrl,
      },
      req.user.id,
    );
  }

  // ============================================================
  // UPDATE PRODUCT WITH IMAGE UPLOAD
  // ============================================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        price: { type: 'number' },
        description: { type: 'string' },
        stock: { type: 'number' },
        categoryId: { type: 'number' },
        compareAtPrice: { type: 'number' },
        sku: { type: 'string' },
        isActive: { type: 'boolean' },
        isTrending: { type: 'boolean' },
        isNew: { type: 'boolean' },
        image: { type: 'string', format: 'binary', description: 'Product image file' },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: MulterFile,
    @Body(new ValidationPipe()) updateProductDto: UpdateProductDto,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    let imageUrl: string | undefined = updateProductDto.imageUrl;

    if (file) {
      try {
        const upload = await this.filesService.uploadFile(file, { folder: 'products' });
        imageUrl = upload.url;
      } catch (error: any) {
        throw new BadRequestException(`Image upload failed: ${error.message}`);
      }
    }

    return this.productsService.update(
      id,
      {
        ...updateProductDto,
        imageUrl,
      },
      req.user.id,
      req.user.role,
    );
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