import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/order.entity';
import { Roles } from '../common/decorator/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guards';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('products')
  getProducts() {
    return this.productsService.findAll();
  }

  @Get('orders')
  getOrders() {
    return this.ordersService.findAll();
  }

  @Patch('order/:id/status')
  updateOrderStatus(
    @Param('id') id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  @Get('stats')
  getStats() {
    return {
      totalOrders: 0,
      totalProducts: 0,
      totalUsers: 0,
    };
  }
}