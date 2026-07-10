// src/vendor/vendor.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
  Query,
  BadRequestException,
  ForbiddenException,
  Res,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { VendorService } from './vendor.service';
import { BulkProductUploadDto } from './dto/bulk-product-upload.dto';
import { BulkProductDeleteDto } from './dto/bulk-product-delete.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';

@ApiTags('Vendor')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  // ============================================================
  // PUBLIC VENDOR ENDPOINTS (No Auth Required)
  // ============================================================

  @Get('public')
  @ApiOperation({ summary: 'Get all approved vendors (public)' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getPublicVendors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    // Service already handles pagination-in-memory for this endpoint.
    // For production-scale, consider moving pagination to service.
    const vendors = await this.vendorService.getPublicVendors({
      search,
      sortBy,
      sortOrder,
    });

    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginated = vendors.slice(start, end);

    return {
      data: paginated,
      meta: {
        total: vendors.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(vendors.length / limitNum),
      },
    };
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get public vendor details' })
  @ApiResponse({ status: 200, description: 'Vendor details retrieved successfully' })
  async getPublicVendor(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.getPublicVendorDetails(id);
  }

  // ============================================================
  // VENDOR DASHBOARD (Authenticated Vendor)
  // ============================================================

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboard(@Request() req: { user: { id: number } }) {
    return this.vendorService.getDashboardStats(req.user.id);
  }

  // ============================================================
  // VENDOR ANALYTICS
  // ============================================================

  @Get('performance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  async getPerformance(
    @Request() req: { user: { id: number } },
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.vendorService.getPerformanceMetrics(req.user.id, period);
  }

  @Get('revenue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getRevenue(
    @Request() req: { user: { id: number } },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.vendorService.getRevenueAnalytics(req.user.id, start, end);
  }

  @Get('order-analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor order analytics' })
  @ApiResponse({ status: 200, description: 'Order analytics retrieved successfully' })
  async getOrderAnalytics(@Request() req: { user: { id: number } }) {
    return this.vendorService.getOrderAnalytics(req.user.id);
  }

  // ============================================================
  // VENDOR PROFILE MANAGEMENT
  // ============================================================

  @Get('profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile retrieved successfully' })
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.vendorService.getVendorProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile updated successfully' })
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe()) dto: UpdateVendorProfileDto,
  ) {
    return this.vendorService.updateVendorProfile(req.user.id, dto);
  }

  // ============================================================
  // VENDOR PRODUCT MANAGEMENT
  // ============================================================

  @Get('products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  async getVendorProducts(
    @Request() req: { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('inStock') inStock?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const inStockBool = inStock !== undefined ? inStock === 'true' : undefined;

    return this.vendorService.getVendorProducts(
      req.user.id,
      pageNum,
      limitNum,
      inStockBool,
    );
  }

  @Get('products/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor product statistics' })
  @ApiResponse({ status: 200, description: 'Product statistics retrieved successfully' })
  async getProductStats(@Request() req: { user: { id: number } }) {
    return this.vendorService.getProductStats(req.user.id);
  }

  @Post('products/bulk-upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Bulk upload products' })
  @ApiResponse({ status: 201, description: 'Products uploaded successfully' })
  async bulkUploadProducts(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe()) dto: BulkProductUploadDto,
  ) {
    return this.vendorService.bulkUploadProducts(req.user.id, dto.products);
  }

  @Delete('products/bulk-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Bulk delete products' })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  async bulkDeleteProducts(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe()) dto: BulkProductDeleteDto,
  ) {
    return this.vendorService.bulkDeleteProducts(req.user.id, dto.productIds);
  }

  // ============================================================
  // VENDOR ORDER MANAGEMENT
  // ============================================================

  @Get('orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendorOrders(
    @Request() req: { user: { id: number } },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.vendorService.getVendorOrders(req.user.id, status, pageNum, limitNum);
  }

  @Get('orders/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor order summary' })
  @ApiResponse({ status: 200, description: 'Order summary retrieved successfully' })
  async getOrderSummary(@Request() req: { user: { id: number } }) {
    return this.vendorService.getVendorOrderSummary(req.user.id);
  }

  // ============================================================
  // EXPORT ORDERS – FIXED: @Res({ passthrough: true })
  // ============================================================

  @Get('orders/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Export vendor orders' })
  @ApiResponse({ status: 200, description: 'Orders exported successfully' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel'], required: false })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async exportOrders(
    @Res({ passthrough: true }) res: Response,   // ✅ passthrough enabled
    @Request() req: { user: { id: number } },
    @Query('format') format: 'csv' | 'excel' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.vendorService.exportOrders(
      req.user.id,
      format,
      startDate,
      endDate,
      status,
    );

    // Set download headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}.json"`);

    // ✅ Return data – interceptor will handle formatting
    return result;
  }

  // ============================================================
  // VENDOR REVIEWS (will be connected to ReviewsModule)
  // ============================================================

  @Get('reviews')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get vendor reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async getReviews(
    @Request() req: { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const ratingNum = rating ? parseInt(rating, 10) : undefined;

    return this.vendorService.getVendorReviews(req.user.id, pageNum, limitNum, ratingNum);
  }
}