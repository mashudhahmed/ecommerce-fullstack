import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guards';
import { ProductsService } from 'src/products/products.service';
import { OrdersService } from 'src/orders/orders.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class AdminController {
  constructor(private products: ProductsService, private orders: OrdersService) {}
  // admin-only operational wrappers

  @Get('products')
  getProducts() { return this.products.findAll(); }

  @Get('orders')
  getOrders() { return this.orders.findAll(); }

  @Patch('order/:id/status')
  updateOrderStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.orders.updateStatus(id, status);
  }
}
