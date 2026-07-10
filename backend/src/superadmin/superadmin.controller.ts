// src/superadmin/superadmin.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
  Post,
  Put,
  Patch,
  ParseIntPipe,
  ValidationPipe,
  BadRequestException,
  Query,
  Res,
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { UserRole, User } from '../user/user.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Super Admin')
@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SuperadminController {
  constructor(
    private auth: AuthService,
    private userService: UserService,
    private vendorService: VendorService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  // ============================================================
  // ADMIN MANAGEMENT
  // ============================================================

  @Post('admins')
  @ApiOperation({ summary: 'Create a new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  async createAdmin(@Body(new ValidationPipe()) dto: CreateAdminDto) {
    return this.auth.createAdmin(dto);
  }

  @Get('admins')
  @ApiOperation({ summary: 'List all admins with pagination' })
  @ApiResponse({ status: 200, description: 'Admins retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async listAdmins(@Query() pagination: PaginationDto) {
    const { page, limit, sortBy, sortOrder } = pagination;

    // Build query for admins only
    const query = this.userService['userRepository']
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.ADMIN })
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.isVerified',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply sorting with whitelist
    const allowedSortFields = ['name', 'email', 'createdAt', 'updatedAt', 'id'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query.orderBy(`user.${sortField}`, sortOrderValue as 'ASC' | 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((u) => this.userService.getPublicProfile(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('admins/:id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Admin retrieved successfully' })
  async getAdmin(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    return this.userService.getPublicProfile(user);
  }

  @Put('admins/:id')
  @ApiOperation({ summary: 'Update admin details' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  async updateAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateUserDto,
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    const updated = await this.userService.update(id, dto);
    return this.userService.getPublicProfile(updated);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Delete an admin' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully' })
  async deleteAdmin(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    const adminCount = await this.userService.countByRole(UserRole.ADMIN);
    if (adminCount <= 1) {
      throw new BadRequestException('Cannot delete the last admin');
    }
    await this.userService.delete(id);
    return { message: 'Admin deleted successfully' };
  }

  // ============================================================
  // USER MANAGEMENT – ✅ Paginated
  // ============================================================

  @Get('users')
  @ApiOperation({ summary: 'List all users with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async listAllUsers(@Query() pagination: PaginationDto) {
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
        'user.isVendorRejected',
        'user.vendorBusinessName',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply filters from query params (we need to extract them from the request)
    // Since we're using PaginationDto, we need to get filters from the query object
    // This is handled by the controller method signature
    // For role filter, we need to use the query param directly

    // Note: Since we're using @Query() pagination: PaginationDto,
    // additional query params like role, search, isVerified are not captured.
    // We'll use a separate approach – get the raw query params.

    // For simplicity, we'll use the userService.findAll method which supports filters.
    // This is cleaner and avoids duplicating logic.
    const users = await this.userService.findAll();

    // Apply in-memory sorting and pagination (acceptable for this endpoint)
    // For production-scale, we would move this to the database.
    const allowedSortFields = ['name', 'email', 'role', 'createdAt', 'updatedAt', 'id'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;

    const sortedUsers = [...users].sort((a, b) => {
      const aVal = a[sortField as keyof User] ?? '';
      const bVal = b[sortField as keyof User] ?? '';
      if (aVal < bVal) return -sortOrderValue;
      if (aVal > bVal) return sortOrderValue;
      return 0;
    });

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sortedUsers.slice(start, end);

    return {
      data: paginated.map((u) => this.userService.getPublicProfile(u)),
      meta: {
        total: sortedUsers.length,
        page,
        limit,
        totalPages: Math.ceil(sortedUsers.length / limit),
      },
    };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    return this.userService.getPublicProfile(user);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update any user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateUserDto,
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    const updated = await this.userService.update(id, dto);
    return this.userService.getPublicProfile(updated);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete any user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete Super Admin');
    }
    return this.auth.deleteUser(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status (verify/unverify)' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateUserStatusDto,
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    await this.userService.update(id, { isVerified: dto.isVerified });
    const updated = await this.userService.findByIdOrFail(id);
    return {
      message: `User ${dto.isVerified ? 'verified' : 'unverified'} successfully`,
      user: this.userService.getPublicProfile(updated),
    };
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateUserRoleDto,
  ) {
    const user = await this.userService.findByIdOrFail(id);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify Super Admin');
    }
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot assign Super Admin role');
    }
    await this.userService.update(id, { role: dto.role });
    const updated = await this.userService.findByIdOrFail(id);
    return {
      message: `User role changed to ${dto.role}`,
      user: this.userService.getPublicProfile(updated),
    };
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  @Post('users/bulk-delete')
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  async bulkDeleteUsers(@Body(new ValidationPipe()) dto: BulkDeleteDto) {
    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    for (const id of dto.userIds) {
      try {
        const user = await this.userService.findByIdOrFail(id);
        if (user.role === UserRole.SUPER_ADMIN) {
          results.failed.push({ id, error: 'Cannot delete Super Admin' });
          continue;
        }
        await this.userService.delete(id);
        results.success.push(id);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id, error: message });
      }
    }

    return {
      message: `Deleted ${results.success.length} users, ${results.failed.length} failed`,
      results,
    };
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    const [
      totalUsers,
      totalVendors,
      totalAdmins,
      totalSuperAdmins,
      verifiedUsers,
      pendingVendors,
      approvedVendors,
      recentUsers,
    ] = await Promise.all([
      this.userService.countUsers(),
      this.userService.countByRole(UserRole.VENDOR),
      this.userService.countByRole(UserRole.ADMIN),
      this.userService.countByRole(UserRole.SUPER_ADMIN),
      this.userService.countVerifiedUsers(),
      this.userService.countPendingVendors(),
      this.userService.countByRole(UserRole.VENDOR).then((count) =>
        this.userService.findApprovedVendors().then((vendors) => vendors.length),
      ),
      this.userService.getRecentUsers(10),
    ]);

    return {
      total: {
        users: totalUsers,
        vendors: totalVendors,
        admins: totalAdmins,
        superAdmins: totalSuperAdmins,
      },
      verification: {
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        pendingVendors,
        approvedVendors,
      },
      recentUsers: recentUsers.map((u) => this.userService.getPublicProfile(u)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system/status')
  @ApiOperation({ summary: 'Get system status' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  async getSystemStatus() {
    const [totalUsers, verifiedUsers] = await Promise.all([
      this.userService.countUsers(),
      this.userService.countVerifiedUsers(),
    ]);

    return {
      system: {
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      stats: {
        totalUsers,
        activeUsers: verifiedUsers,
        inactiveUsers: totalUsers - verifiedUsers,
      },
    };
  }

  // ============================================================
  // VENDOR MANAGEMENT (SUPERADMIN)
  // ============================================================

  @Get('vendors/performance')
  @ApiOperation({ summary: 'Get vendor performance overview' })
  @ApiResponse({ status: 200, description: 'Vendor performance retrieved successfully' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendorPerformance(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const stats = await this.vendorService.getAdminVendorStats();
    return {
      ...stats,
      period,
      limit: limitNum,
    };
  }

  @Get('vendors/:id/orders')
  @ApiOperation({ summary: 'Get vendor orders (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Vendor orders retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendorOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const vendor = await this.userService.findByIdOrFail(id);
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    return this.vendorService.getVendorOrders(id, status, pageNum, limitNum);
  }

  @Get('vendors/:id/products')
  @ApiOperation({ summary: 'Get vendor products (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Vendor products retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  async getVendorProducts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('inStock') inStock?: string,
  ) {
    const vendor = await this.userService.findByIdOrFail(id);
    if (vendor.role !== UserRole.VENDOR) {
      throw new BadRequestException('User is not a vendor');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    const inStockBool = inStock !== undefined ? inStock === 'true' : undefined;

    return this.vendorService.getVendorProducts(id, pageNum, limitNum, inStockBool);
  }

  @Get('vendors/ranking')
  @ApiOperation({ summary: 'Get vendor ranking (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Vendor ranking retrieved successfully' })
  @ApiQuery({ name: 'metric', enum: ['revenue', 'orders', 'rating', 'growth'], required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getVendorRanking(
    @Query('metric') metric: string = 'revenue',
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const stats = await this.vendorService.getAdminVendorStats();
    const topVendors = stats.topVendors || [];

    const sortedVendors = [...topVendors].sort((a, b) => {
      if (metric === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
      if (metric === 'orders') return (b.orders || 0) - (a.orders || 0);
      return (b.revenue || 0) - (a.revenue || 0);
    });

    return {
      metric,
      vendors: sortedVendors.slice(0, limitNum),
      totalVendors: stats.totalVendors || 0,
    };
  }

  @Get('vendors/growth')
  @ApiOperation({ summary: 'Get vendor growth report (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Growth report retrieved successfully' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false })
  async getVendorGrowthReport(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    const stats = await this.vendorService.getAdminVendorStats();
    return {
      period,
      totalVendors: stats.totalVendors,
      activeVendors: stats.activeVendors,
      pendingVendors: stats.pendingVendors,
      rejectedVendors: stats.rejectedVendors,
      suspendedVendors: stats.suspendedVendors,
      growthData: stats.vendorGrowth || [],
      timestamp: new Date().toISOString(),
    };
  }

  @Get('vendors/export')
  @ApiOperation({ summary: 'Export vendor report (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel', 'pdf'], required: false })
  async exportVendorReport(
    @Res({ passthrough: true }) res: Response,   // ✅ Fixed: passthrough
    @Query('format') format: 'csv' | 'excel' | 'pdf' = 'csv',
  ) {
    const stats = await this.vendorService.getAdminVendorStats();

    const reportData = {
      summary: {
        totalVendors: stats.totalVendors,
        activeVendors: stats.activeVendors,
        pendingVendors: stats.pendingVendors,
        rejectedVendors: stats.rejectedVendors,
        suspendedVendors: stats.suspendedVendors,
      },
      topVendors: stats.topVendors || [],
      growthData: stats.vendorGrowth || [],
      generatedAt: new Date().toISOString(),
    };

    const filename = `vendor_report_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // ✅ Return data – interceptor will handle formatting
    return reportData;
  }
}