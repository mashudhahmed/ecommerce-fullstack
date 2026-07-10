// src/admin/admin.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseIntPipe,
  Query,
  Request,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { OrderStatus } from '../orders/order.entity';
import { UserRole } from '../user/user.entity';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { VendorBulkActionDto } from '../vendor/dto/vendor-bulk-action.dto';
import { VendorSuspendDto } from '../vendor/dto/vendor-suspend.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
  ) {}

  // ============================================================
  // DASHBOARD STATS
  // ============================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats() {
    const [totalUsers, totalProducts, orderStats, userStats] = await Promise.all([
      this.userService.countUsers(),
      this.productsService.findAll(),
      this.ordersService.getAdminStats(),
      this.userService.getUserStats(),
    ]);

    return {
      totalUsers,
      totalProducts: totalProducts.length,
      ...orderStats,
      userStats,
    };
  }

  // ============================================================
  // PRODUCTS – Already paginated ✅
  // ============================================================

  @Get('products')
  @ApiOperation({ summary: 'Get all products (Admin) with pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getProducts(@Query() pagination: PaginationDto) {
    // ProductsService already has findAllPaginated with skip/take
    return this.productsService.findAllPaginated(
      pagination.page,
      pagination.limit,
    );
  }

  // ============================================================
  // ORDERS – ✅ Added pagination
  // ============================================================

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (Admin) with pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'total', 'status'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getOrders(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    // Use the existing OrdersService method with pagination
    const { page, limit, sortBy, sortOrder } = pagination;

    // Build query
    const query = this.ordersService['orderRepository']
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    // Apply sorting
    const allowedSortFields = ['createdAt', 'total', 'status'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query.orderBy(`order.${sortField}`, sortOrderValue as 'ASC' | 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Patch('order/:id/status')
  @ApiOperation({ summary: 'Update order status (Admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateOrderStatusDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.ordersService.updateStatus(id, dto.status, req.user.id);
  }

  // ============================================================
  // USERS – ✅ Added pagination
  // ============================================================

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin) with pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getUsers(@Query() pagination: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = pagination;

    // Build query
    const query = this.userService['userRepository']
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.isVerified',
        'user.isVendorApproved',
        'user.vendorBusinessName',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply sorting with whitelist
    const allowedSortFields = ['name', 'email', 'role', 'createdAt', 'updatedAt', 'id'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query.orderBy(`user.${sortField}`, sortOrderValue as 'ASC' | 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    return this.userService.getPublicProfile(user);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user (Admin)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    if (id === req.user.id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    return this.userService.delete(id);
  }

  // ============================================================
  // VENDORS – ✅ Added pagination
  // ============================================================

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendors with pagination' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getVendors(@Query() pagination: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = pagination;

    // Build query
    const query = this.userService['userRepository']
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.VENDOR })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.isVerified',
        'user.isVendorApproved',
        'user.isVendorRejected',
        'user.vendorBusinessName',
        'user.vendorBusinessDescription',
        'user.vendorPhoneNumber',
        'user.vendorAddress',
        'user.createdAt',
      ]);

    // Apply sorting with whitelist
    const allowedSortFields = ['name', 'email', 'createdAt', 'vendorBusinessName', 'id'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query.orderBy(`user.${sortField}`, sortOrderValue as 'ASC' | 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('vendors/pending')
  @ApiOperation({ summary: 'Get pending vendors' })
  @ApiResponse({ status: 200, description: 'Pending vendors retrieved successfully' })
  async getPendingVendors() {
    return this.userService.findPendingVendors();
  }

  @Get('vendors/stats')
  @ApiOperation({ summary: 'Get vendor statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor stats retrieved successfully' })
  async getVendorStats() {
    return this.vendorService.getAdminVendorStats();
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Get vendor by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor retrieved successfully' })
  async getVendor(@Param('id', ParseIntPipe) id: number) {
    const vendor = await this.userService.findByIdOrFail(id);

    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    const stats = await this.vendorService.getVendorStats(id);
    return {
      ...this.userService.getPublicProfile(vendor),
      stats,
    };
  }

  @Post('vendors/bulk-action')
  @ApiOperation({ summary: 'Bulk action on vendors (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  async bulkVendorAction(
    @Body(new ValidationPipe()) dto: VendorBulkActionDto,
  ) {
    return this.vendorService.bulkVendorAction(
      dto.action,
      dto.vendorIds,
      dto.reason,
    );
  }

  @Patch('vendors/:id/suspend')
  @ApiOperation({ summary: 'Suspend or activate vendor (Admin)' })
  @ApiResponse({ status: 200, description: 'Vendor suspension updated successfully' })
  async suspendVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: VendorSuspendDto,
  ) {
    const vendor = await this.vendorService.suspendVendor(
      id,
      dto.suspended,
      dto.reason,
    );

    return {
      message: `Vendor ${dto.suspended ? 'suspended' : 'activated'} successfully`,
      vendor: this.userService.getPublicProfile(vendor),
    };
  }

  // ============================================================
  // ORDERS – ENHANCED STATS with date filters
  // ============================================================

  @Get('orders/stats')
  @ApiOperation({ summary: 'Get order statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Order stats retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getOrderStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const orders = await this.ordersService.findAll();

    let filteredOrders = orders;
    if (start) {
      filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt) >= start);
    }
    if (end) {
      filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt) <= end);
    }

    const totalRevenue = filteredOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0);

    const statusDistribution = filteredOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      averageOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
      statusDistribution,
      period: {
        start: start || 'all',
        end: end || 'all',
      },
    };
  }
}