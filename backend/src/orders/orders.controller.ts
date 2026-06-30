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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guards';
import { Roles } from '../common/decorator/roles.decorator';
import { OrderStatus } from './order.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyOrders(@Request() req) {
    return this.ordersService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/summary')
  getMyOrderSummary(@Request() req) {
    return this.ordersService.getOrderSummary(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get()
  getAllOrders() {
    return this.ordersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelOrder(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.cancelOrder(id);
  }
}