// src/wishlist/wishlist.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // ============================================================
  // GET USER WISHLIST
  // ============================================================
  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWishlist(
    @Request() req: { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.wishlistService.getUserWishlist(req.user.id, pageNum, limitNum);
  }

  // ============================================================
  // ADD TO WISHLIST
  // ============================================================
  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  async addToWishlist(
    @Request() req: { user: { id: number } },
    @Body('productId') productId: number,
  ) {
    return this.wishlistService.addToWishlist(req.user.id, productId);
  }

  // ============================================================
  // REMOVE FROM WISHLIST
  // ============================================================
  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist' })
  @ApiResponse({ status: 404, description: 'Product not in wishlist' })
  async removeFromWishlist(
    @Request() req: { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.wishlistService.removeFromWishlist(req.user.id, productId);
    return { message: 'Product removed from wishlist' };
  }

  // ============================================================
  // CHECK IF IN WISHLIST
  // ============================================================
  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @ApiResponse({ status: 200, description: 'Check result' })
  async isInWishlist(
    @Request() req: { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.id, productId);
    return { isInWishlist };
  }

  // ============================================================
  // GET WISHLIST COUNT
  // ============================================================
  @Get('count')
  @ApiOperation({ summary: 'Get wishlist count' })
  @ApiResponse({ status: 200, description: 'Wishlist count retrieved' })
  async getWishlistCount(@Request() req: { user: { id: number } }) {
    const count = await this.wishlistService.getWishlistCount(req.user.id);
    return { count };
  }

  // ============================================================
  // CLEAR WISHLIST
  // ============================================================
  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared' })
  @HttpCode(HttpStatus.OK)
  async clearWishlist(@Request() req: { user: { id: number } }) {
    await this.wishlistService.clearWishlist(req.user.id);
    return { message: 'Wishlist cleared successfully' };
  }
}