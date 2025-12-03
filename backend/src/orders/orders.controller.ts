import { Body, Controller, Get, Patch, Post, Request, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guards';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() dto: CreateOrderDto) {
    return this.svc.create(req.user.sub || req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  myOrders(@Request() req) {
    return this.svc.findByUser(req.user.sub || req.user.id);
  }

  // admin route to see all orders
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get()
  allOrders() {
    return this.svc.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.svc.updateStatus(id, status);
  }
}
