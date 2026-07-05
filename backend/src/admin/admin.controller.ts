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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { UserService } from '../user/user.service';
import { OrderStatus } from '../orders/order.entity';
import { UserRole } from '../user/user.entity';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';

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
  ) {}

  // ============================================================
  // DASHBOARD STATS
  // ============================================================
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  @Get('stats')
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
  // PRODUCTS
  // ============================================================
  @ApiOperation({ summary: 'Get all products (Admin)' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @Get('products')
  async getProducts(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    
    return this.productsService.findAllPaginated({
      page: pageNum,
      limit: limitNum,
    });
  }

  // ============================================================
  // ORDERS - ✅ FIXED
  // ============================================================
  @ApiOperation({ summary: 'Get all orders (Admin)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @Get('orders')
  async getOrders() {
    return this.ordersService.findAll();
  }

  @ApiOperation({ summary: 'Update order status (Admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @Patch('order/:id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) dto: UpdateOrderStatusDto,
    @Request() req: { user: { id: number } },
  ) {
    // ✅ Fixed: Passing actual admin user ID
    return this.ordersService.updateStatus(id, dto.status, req.user.id);
  }

  // ============================================================
  // USERS
  // ============================================================
  @ApiOperation({ summary: 'Get all users (Admin)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @Get('users')
  async getUsers() {
    return this.userService.findAll();
  }

  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @Get('users/:id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findByIdOrFail(id);
    return this.userService.getPublicProfile(user);
  }

  @ApiOperation({ summary: 'Delete user (Admin)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @Delete('users/:id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    // Prevent self-deletion
    if (id === req.user.id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    return this.userService.delete(id);
  }

  // ============================================================
  // VENDORS
  // ============================================================
  @ApiOperation({ summary: 'Get all vendors' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  @Get('vendors')
  async getVendors() {
    return this.userService.findByRole(UserRole.VENDOR);
  }

  @ApiOperation({ summary: 'Get pending vendors' })
  @ApiResponse({ status: 200, description: 'Pending vendors retrieved successfully' })
  @Get('vendors/pending')
  async getPendingVendors() {
    return this.userService.findPendingVendors();
  }
}