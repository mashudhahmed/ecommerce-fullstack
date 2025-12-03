import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private svc: CartService) {}

  // Add item to cart
  @Post()
  add(@Request() req, @Body() body: { productId: number; quantity: number }) {
    return this.svc.addToCart(req.user.sub || req.user.id, body.productId, body.quantity);
  }

  // Get user's cart
  @Get()
  get(@Request() req) {
    return this.svc.getCart(req.user.sub || req.user.id);
  }

  // Update item quantity by product ID
  @Patch()
  update(@Request() req, @Body() body: { productId: number; quantity: number }) {
    return this.svc.updateQuantity(req.user.sub || req.user.id, body.productId, body.quantity);
  }

  // Remove specific item from cart by product ID
  @Delete('item/:productId')
  removeItem(@Request() req, @Param('productId') productId: number) {
    return this.svc.removeItem(req.user.sub || req.user.id, productId);
  }

  // Clear entire cart
  @Delete()
  clearCart(@Request() req) {
    return this.svc.clearCart(req.user.sub || req.user.id);
  }
}