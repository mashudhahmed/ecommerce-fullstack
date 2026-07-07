// src/analytics/export.controller.ts
import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import express from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../user/user.entity';
import { ExportService } from './export.service';
import { UserService } from '../user/user.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

@ApiTags('Export')
@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly userService: UserService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
  ) {}

  // ============================================================
  // EXPORT USERS
  // ============================================================

  @Get('users')
  @ApiOperation({ summary: 'Export users data' })
  @ApiResponse({ status: 200, description: 'Users exported successfully' })
  @ApiQuery({ name: 'format', enum: ['excel', 'pdf', 'csv', 'json'], required: false })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'isVerified', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async exportUsers(
    @Query('format') format: 'excel' | 'pdf' | 'csv' | 'json' = 'excel',
    @Query('role') role?: UserRole,
    @Query('isVerified') isVerified?: string,
    @Query('search') search?: string,
    @Res() res?: express.Response,
  ) {
    try {
      if (!res) {
        throw new BadRequestException('Response object is required');
      }

      let users: any[];

      if (search && search.length >= 2) {
        users = await this.userService.searchUsers(search);
      } else {
        const filters: any = {};
        if (role) filters.role = role;
        if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
        users = await this.userService.findAll(filters);
      }

      const exportData = users.map((u) => ({
        ID: u.id,
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Verified: u.isVerified ? 'Yes' : 'No',
        'Vendor Approved': u.isVendorApproved ? 'Yes' : 'No',
        'Business Name': u.vendorBusinessName || 'N/A',
        'Joined Date': u.createdAt
          ? new Date(u.createdAt).toISOString().split('T')[0]
          : 'N/A',
      }));

      const result = await this.exportService.exportData(exportData, format, {
        title: 'User Export Report',
        subtitle: `Generated on ${new Date().toLocaleString()}`,
        columns: [
          { header: 'ID', key: 'ID', width: 10 },
          { header: 'Name', key: 'Name', width: 30 },
          { header: 'Email', key: 'Email', width: 40 },
          { header: 'Role', key: 'Role', width: 15 },
          { header: 'Verified', key: 'Verified', width: 15 },
          { header: 'Vendor Approved', key: 'Vendor Approved', width: 20 },
          { header: 'Business Name', key: 'Business Name', width: 30 },
          { header: 'Joined Date', key: 'Joined Date', width: 15 },
        ],
      });

      await this.exportService.downloadFile(result, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to export users: ${message}`);
    }
  }

  // ============================================================
  // EXPORT ORDERS
  // ============================================================

  @Get('orders')
  @ApiOperation({ summary: 'Export orders data' })
  @ApiResponse({ status: 200, description: 'Orders exported successfully' })
  @ApiQuery({ name: 'format', enum: ['excel', 'pdf', 'csv', 'json'], required: false })
  @ApiQuery({ name: 'status', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  async exportOrders(
    @Query('format') format: 'excel' | 'pdf' | 'csv' | 'json' = 'excel',
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: express.Response,
  ) {
    try {
      if (!res) {
        throw new BadRequestException('Response object is required');
      }

      let orders = await this.ordersService.findAll();

      // Apply filters
      if (status) {
        orders = orders.filter((o) => o.status === status);
      }

      if (startDate) {
        const start = new Date(startDate);
        orders = orders.filter((o) => new Date(o.createdAt) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        orders = orders.filter((o) => new Date(o.createdAt) <= end);
      }

      const exportData = orders.map((o) => ({
        'Order ID': o.id,
        Customer: o.user?.name || 'N/A',
        Email: o.user?.email || 'N/A',
        Total: `$${Number(o.total).toFixed(2)}`,
        Status: o.status,
        Items: o.items?.length || 0,
        'Order Date': new Date(o.createdAt).toISOString().split('T')[0],
      }));

      const result = await this.exportService.exportData(exportData, format, {
        title: 'Order Export Report',
        subtitle: `Generated on ${new Date().toLocaleString()}`,
        columns: [
          { header: 'Order ID', key: 'Order ID', width: 15 },
          { header: 'Customer', key: 'Customer', width: 30 },
          { header: 'Email', key: 'Email', width: 35 },
          { header: 'Total', key: 'Total', width: 15 },
          { header: 'Status', key: 'Status', width: 20 },
          { header: 'Items', key: 'Items', width: 10 },
          { header: 'Order Date', key: 'Order Date', width: 15 },
        ],
      });

      await this.exportService.downloadFile(result, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to export orders: ${message}`);
    }
  }

  // ============================================================
  // EXPORT PRODUCTS
  // ============================================================

  @Get('products')
  @ApiOperation({ summary: 'Export products data' })
  @ApiResponse({ status: 200, description: 'Products exported successfully' })
  @ApiQuery({ name: 'format', enum: ['excel', 'pdf', 'csv', 'json'], required: false })
  @ApiQuery({ name: 'categoryId', type: Number, required: false })
  @ApiQuery({ name: 'inStock', type: Boolean, required: false })
  async exportProducts(
    @Query('format') format: 'excel' | 'pdf' | 'csv' | 'json' = 'excel',
    @Query('categoryId') categoryId?: string,
    @Query('inStock') inStock?: string,
    @Res() res?: express.Response,
  ) {
    try {
      if (!res) {
        throw new BadRequestException('Response object is required');
      }

      let products = await this.productsService.findAll();

      // Apply filters
      if (categoryId) {
        products = products.filter(
          (p) => p.category?.id === parseInt(categoryId, 10),
        );
      }

      if (inStock !== undefined) {
        const inStockBool = inStock === 'true';
        products = products.filter((p) =>
          inStockBool ? p.stock > 0 : p.stock === 0,
        );
      }

      const exportData = products.map((p) => ({
        ID: p.id,
        Title: p.title,
        Price: `$${Number(p.price).toFixed(2)}`,
        Stock: p.stock,
        'Stock Status': p.stock > 0 ? 'In Stock' : 'Out of Stock',
        Category: p.category?.name || 'Uncategorized',
        Owner: p.owner?.name || 'N/A',
        Active: p.isActive ? 'Yes' : 'No',
        'Created Date': new Date(p.createdAt).toISOString().split('T')[0],
      }));

      const result = await this.exportService.exportData(exportData, format, {
        title: 'Product Export Report',
        subtitle: `Generated on ${new Date().toLocaleString()}`,
        columns: [
          { header: 'ID', key: 'ID', width: 10 },
          { header: 'Title', key: 'Title', width: 40 },
          { header: 'Price', key: 'Price', width: 15 },
          { header: 'Stock', key: 'Stock', width: 10 },
          { header: 'Stock Status', key: 'Stock Status', width: 15 },
          { header: 'Category', key: 'Category', width: 25 },
          { header: 'Owner', key: 'Owner', width: 25 },
          { header: 'Active', key: 'Active', width: 10 },
          { header: 'Created Date', key: 'Created Date', width: 15 },
        ],
      });

      await this.exportService.downloadFile(result, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to export products: ${message}`);
    }
  }

  // ============================================================
  // EXPORT ANALYTICS REPORT
  // ============================================================

  @Get('analytics')
  @ApiOperation({ summary: 'Export analytics report' })
  @ApiResponse({ status: 200, description: 'Analytics exported successfully' })
  @ApiQuery({ name: 'format', enum: ['excel', 'pdf', 'csv', 'json'], required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  async exportAnalytics(
    @Query('format') format: 'excel' | 'pdf' | 'csv' | 'json' = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: express.Response,
  ) {
    try {
      if (!res) {
        throw new BadRequestException('Response object is required');
      }

      // Get all orders
      let orders = await this.ordersService.findAll();

      // Apply date filters
      if (startDate) {
        const start = new Date(startDate);
        orders = orders.filter((o) => new Date(o.createdAt) >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        orders = orders.filter((o) => new Date(o.createdAt) <= end);
      }

      // Calculate analytics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const statusDistribution = orders.reduce(
        (acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Prepare export data
      const exportData = [
        { Metric: 'Total Orders', Value: totalOrders },
        { Metric: 'Total Revenue', Value: `$${totalRevenue.toFixed(2)}` },
        { Metric: 'Average Order Value', Value: `$${averageOrderValue.toFixed(2)}` },
        ...Object.entries(statusDistribution).map(([status, count]) => ({
          Metric: `Orders - ${status}`,
          Value: count,
        })),
      ];

      const result = await this.exportService.exportData(exportData, format, {
        title: 'Analytics Report',
        subtitle: `Generated on ${new Date().toLocaleString()}`,
        columns: [
          { header: 'Metric', key: 'Metric', width: 40 },
          { header: 'Value', key: 'Value', width: 30 },
        ],
      });

      await this.exportService.downloadFile(result, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to export analytics: ${message}`,
      );
    }
  }
}