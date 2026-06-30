import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  addToCart(
    @Request() req,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.cartService.addToCart(req.user.id, productId, quantity);
  }

  @Get()
  getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Get('summary')
  getCartSummary(@Request() req) {
    return this.cartService.getCartSummary(req.user.id);
  }

  @Get('total')
  getCartTotal(@Request() req) {
    return this.cartService.getCartTotal(req.user.id);
  }

  @Get('count')
  getCartItemCount(@Request() req) {
    return this.cartService.getCartItemCount(req.user.id);
  }

  @Patch()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  updateQuantity(
    @Request() req,
    @Body('productId', ParseIntPipe) productId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.cartService.updateQuantity(req.user.id, productId, quantity);
  }

  @Delete('item/:productId')
  removeItem(
    @Request() req,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(req.user.id, productId);
  }

  @Delete()
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}