// src/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Headers,                              // ✅ Added
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,                            // ✅ Added
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus } from './order.entity';
import { UserRole } from '../user/user.entity';
import { UserRateLimitGuard } from '../common/guards/user-rate-limit.guard';   // ✅ Added

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================================
  // CREATE ORDER – WITH IDEMPOTENCY KEY & PER-USER RATE LIMITING
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate order creation. Use UUID v4.',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @UseGuards(JwtAuthGuard, UserRateLimitGuard)   // ✅ Rate limiting added
  @Post()
  async create(
    @Request() req: { user: { id: number } },
    @Body() createOrderDto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,   // ✅ Added
  ) {
    if (idempotencyKey) {
      return this.ordersService.createWithIdempotency(
        req.user.id,
        createOrderDto,
        idempotencyKey,
      );
    }
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  // ============================================================
  // GET MY ORDERS (Authenticated User)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyOrders(@Request() req: { user: { id: number } }) {
    return this.ordersService.findByUser(req.user.id);
  }

  // ============================================================
  // GET MY ORDER SUMMARY (Authenticated User)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user order summary' })
  @ApiResponse({ status: 200, description: 'Order summary retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @Get('my/summary')
  async getMyOrderSummary(@Request() req: { user: { id: number } }) {
    return this.ordersService.getOrderSummary(req.user.id);
  }

  // ============================================================
  // GET VENDOR ORDERS (Vendor)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor orders' })
  @ApiResponse({ status: 200, description: 'Vendor orders retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendor')
  async getVendorOrders(@Request() req: { user: { id: number; role: UserRole } }) {
    // Only vendors can see their orders, admins can see all vendor orders
    if (req.user.role === UserRole.VENDOR) {
      return this.ordersService.findByVendor(req.user.id);
    }
    // For admins, they might want to see all orders
    return this.ordersService.findAll();
  }

  // ============================================================
  // GET VENDOR ORDER SUMMARY (Vendor)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor order summary' })
  @ApiResponse({ status: 200, description: 'Vendor order summary retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendor/summary')
  async getVendorOrderSummary(@Request() req: { user: { id: number; role: UserRole } }) {
    if (req.user.role === UserRole.VENDOR) {
      return this.ordersService.getVendorOrderSummary(req.user.id);
    }
    return this.ordersService.getAdminStats();
  }

  // ============================================================
  // GET ALL ORDERS (Admin/SuperAdmin)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  async getAllOrders() {
    return this.ordersService.findAll();
  }

  // ============================================================
  // GET ADMIN STATS (Admin/SuperAdmin)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin order statistics' })
  @ApiResponse({ status: 200, description: 'Admin stats retrieved successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/stats')
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  // ============================================================
  // GET SINGLE ORDER (Authenticated User)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    const order = await this.ordersService.findOne(id);

    // Check if user can view this order
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role);
    const isOwner = order.user.id === req.user.id;

    // Check if user is vendor and order contains their products
    let isVendorWithProducts = false;
    if (req.user.role === UserRole.VENDOR) {
      isVendorWithProducts = order.items.some(
        (item) => item.product.owner?.id === req.user.id,
      );
    }

    if (!isAdmin && !isOwner && !isVendorWithProducts) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    // If vendor, filter items to only show their products
    if (req.user.role === UserRole.VENDOR && !isAdmin && !isOwner) {
      order.items = order.items.filter(
        (item) => item.product.owner?.id === req.user.id,
      );
    }

    return order;
  }

  // ============================================================
  // UPDATE ORDER STATUS (Admin/SuperAdmin)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
    @Request() req: { user: { id: number } },
  ) {
    return this.ordersService.updateStatus(id, status, req.user.id);
  }

  // ============================================================
  // CANCEL ORDER (Authenticated User - Owner or Admin)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot cancel this order' })
  @ApiResponse({ status: 400, description: 'Bad request - Order cannot be cancelled' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    return this.ordersService.cancelOrder(id, req.user.id, req.user.role);
  }

  // ============================================================
  // UPDATE ORDER STATUS (Vendor - Can update status of orders with their products)
  // ============================================================
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status for vendor products' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/vendor-status')
  async updateVendorOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    // Check if vendor can update this order
    const order = await this.ordersService.findOne(id);
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role);

    if (!isAdmin) {
      const hasVendorProducts = order.items.some(
        (item) => item.product.owner?.id === req.user.id,
      );
      if (!hasVendorProducts) {
        throw new ForbiddenException('This order does not contain your products');
      }
    }

    // Vendors can only update to PROCESSING, SHIPPED, DELIVERED
    if (req.user.role === UserRole.VENDOR && !isAdmin) {
      const allowedStatuses = [
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];
      if (!allowedStatuses.includes(status)) {
        throw new ForbiddenException(
          'Vendors can only update status to PROCESSING, SHIPPED, or DELIVERED',
        );
      }
    }

    return this.ordersService.updateStatus(id, status, req.user.id);
  }
}