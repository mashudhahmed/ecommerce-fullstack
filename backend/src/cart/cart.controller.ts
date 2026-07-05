// src/cart/cart.controller.ts
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
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ============================================================
  // ADD TO CART
  // ============================================================
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: AddToCartDto })
  async addToCart(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe()) dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(req.user.id, dto.productId, dto.quantity);
  }

  // ============================================================
  // GET CART
  // ============================================================
  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@Request() req: { user: { id: number } }) {
    return this.cartService.getCart(req.user.id);
  }

  // ============================================================
  // GET CART SUMMARY
  // ============================================================
  @Get('summary')
  @ApiOperation({ summary: 'Get cart summary with total and items' })
  @ApiResponse({ status: 200, description: 'Cart summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartSummary(@Request() req: { user: { id: number } }) {
    return this.cartService.getCartSummary(req.user.id);
  }

  // ============================================================
  // GET CART TOTAL
  // ============================================================
  @Get('total')
  @ApiOperation({ summary: 'Get cart total amount' })
  @ApiResponse({ status: 200, description: 'Cart total retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartTotal(@Request() req: { user: { id: number } }) {
    return this.cartService.getCartTotal(req.user.id);
  }

  // ============================================================
  // GET CART ITEM COUNT
  // ============================================================
  @Get('count')
  @ApiOperation({ summary: 'Get number of items in cart' })
  @ApiResponse({ status: 200, description: 'Cart item count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCartItemCount(@Request() req: { user: { id: number } }) {
    return this.cartService.getCartItemCount(req.user.id);
  }

  // ============================================================
  // UPDATE QUANTITY
  // ============================================================
  @Patch()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiOperation({ summary: 'Update item quantity in cart' })
  @ApiResponse({ status: 200, description: 'Quantity updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiBody({ type: UpdateCartDto })
  async updateQuantity(
    @Request() req: { user: { id: number } },
    @Body(new ValidationPipe()) dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(req.user.id, dto.productId, dto.quantity);
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================
  @Delete('item/:productId')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @Request() req: { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.cartService.removeItem(req.user.id, productId);
    return { message: 'Item removed from cart successfully' };
  }

  // ============================================================
  // CLEAR CART
  // ============================================================
  @Delete()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@Request() req: { user: { id: number } }) {
    await this.cartService.clearCart(req.user.id);
    return { message: 'Cart cleared successfully' };
  }

  // ============================================================
  // CHECKOUT (Convert cart to order)
  // ============================================================
  @Post('checkout')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Checkout cart and create order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkout(@Request() req: { user: { id: number } }) {
    return this.cartService.checkout(req.user.id);
  }

  // ============================================================
  // MERGE CART (For guest to logged-in user)
  // ============================================================
  @Post('merge')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiOperation({ summary: 'Merge guest cart with user cart' })
  @ApiResponse({ status: 200, description: 'Carts merged successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async mergeCart(
    @Request() req: { user: { id: number } },
    @Body('guestCartItems') guestCartItems: { productId: number; quantity: number }[],
  ) {
    return this.cartService.mergeCart(req.user.id, guestCartItems);
  }
}